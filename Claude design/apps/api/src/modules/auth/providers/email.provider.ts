import * as nodemailer from 'nodemailer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Resend } = require('resend');
import { renderOtpEmail } from './templates';

export type EmailProviderName = 'resend' | 'smtp' | 'console';

export interface EmailProviderStatus {
  active: EmailProviderName;
  configured: boolean;
  host?: string;
  from: string;
  details: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: EmailProviderName;
  messageId?: string;
  error?: string;
}

const FROM = () => process.env.SMTP_FROM || 'Canteen Secure Gateway <noreply@canteen.local>';

function pickProvider(): EmailProviderName {
  const forced = (process.env.MAIL_PROVIDER || '').toLowerCase().trim();
  if (forced === 'resend' || forced === 'smtp' || forced === 'console') return forced;
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST) return 'smtp';
  return 'console';
}

let cachedSmtp: nodemailer.Transporter | null = null;
function getSmtp(): nodemailer.Transporter | null {
  if (cachedSmtp) return cachedSmtp;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cachedSmtp = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
    pool: true,
    maxConnections: 3,
  });
  return cachedSmtp;
}

let cachedResend: any | null = null;
function getResend(): any | null {
  if (cachedResend) return cachedResend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cachedResend = new Resend(key);
  return cachedResend;
}

async function sendOnce(
  provider: EmailProviderName,
  to: string,
  otp: string,
): Promise<SendEmailResult> {
  const { subject, html, text } = renderOtpEmail({ to, otp });

  if (provider === 'resend') {
    const client = getResend();
    if (!client) return { success: false, provider, error: 'RESEND_API_KEY missing' };
    try {
      const { data, error } = await client.emails.send({
        from: FROM(),
        to,
        subject,
        html,
        text,
      });
      if (error) return { success: false, provider, error: error.message };
      return { success: true, provider, messageId: data?.id };
    } catch (err: any) {
      return { success: false, provider, error: err?.message || String(err) };
    }
  }

  if (provider === 'smtp') {
    const transport = getSmtp();
    if (!transport) return { success: false, provider, error: 'SMTP_HOST missing' };
    try {
      const info = await transport.sendMail({ from: FROM(), to, subject, html, text });
      return { success: true, provider, messageId: info?.messageId };
    } catch (err: any) {
      return { success: false, provider, error: err?.message || String(err) };
    }
  }

  // console fallback (dev)
  console.warn(`[EMAIL-CONSOLE] OTP for ${to}: ${otp} (no provider configured)`);
  return { success: false, provider: 'console', error: 'no provider configured' };
}

export async function sendOtpEmail(to: string, otp: string): Promise<SendEmailResult> {
  const primary = pickProvider();
  let result = await sendOnce(primary, to, otp);

  // simple retry on transient failure (3 attempts, 500ms backoff)
  if (!result.success && primary !== 'console') {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      result = await sendOnce(primary, to, otp);
      if (result.success) break;
    }
  }

  // last-resort fallback to alternate provider if primary failed
  if (!result.success && primary === 'resend' && process.env.SMTP_HOST) {
    console.warn(`[EMAIL] Resend failed (${result.error}), falling back to SMTP`);
    result = await sendOnce('smtp', to, otp);
  } else if (!result.success && primary === 'smtp' && process.env.RESEND_API_KEY) {
    console.warn(`[EMAIL] SMTP failed (${result.error}), falling back to Resend`);
    result = await sendOnce('resend', to, otp);
  }

  if (result.success) {
    console.log(`[EMAIL] Sent OTP to ${to} via ${result.provider} (${result.messageId})`);
  } else {
    console.error(`[EMAIL] All providers failed for ${to}: ${result.error}. OTP: ${otp}`);
  }
  return result;
}

export function getEmailProviderStatus(): EmailProviderStatus {
  const active = pickProvider();
  if (active === 'resend') {
    return {
      active,
      configured: !!process.env.RESEND_API_KEY,
      from: FROM(),
      details: process.env.RESEND_API_KEY ? 'Resend ready' : 'RESEND_API_KEY missing',
    };
  }
  if (active === 'smtp') {
    return {
      active,
      configured: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST,
      from: FROM(),
      details: process.env.SMTP_HOST
        ? `SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}${process.env.SMTP_USER ? ' (authenticated)' : ' (no auth)'}`
        : 'SMTP_HOST missing',
    };
  }
  return {
    active,
    configured: false,
    from: FROM(),
    details: 'No email provider configured. OTPs will be logged to server console only.',
  };
}
