// eslint-disable-next-line @typescript-eslint/no-require-imports
const Twilio = require('twilio');
import { renderOtpSms } from './templates';

export type SmsProviderName = 'msg91' | 'twilio' | 'console';

export interface SmsProviderStatus {
  active: SmsProviderName;
  configured: boolean;
  from?: string;
  details: string;
}

export interface SendSmsResult {
  success: boolean;
  provider: SmsProviderName;
  messageId?: string;
  error?: string;
}

function pickProvider(): SmsProviderName {
  const forced = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
  if (forced === 'msg91' || forced === 'twilio' || forced === 'console') return forced;
  if (process.env.MSG91_AUTH_KEY) return 'msg91';
  if (process.env.TWILIO_ACCOUNT_SID) return 'twilio';
  return 'console';
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`; // default India
  return `+${cleaned}`;
}

let cachedTwilio: { client: any; from: string } | null = null;
function getTwilio() {
  if (cachedTwilio) return cachedTwilio;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return null;
  cachedTwilio = { client: Twilio(sid, token), from };
  return cachedTwilio;
}

async function sendViaMsg91(to: string, otp: string): Promise<SendSmsResult> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || 'CANTEN';
  if (!authKey) return { success: false, provider: 'msg91', error: 'MSG91_AUTH_KEY missing' };
  if (!templateId) return { success: false, provider: 'msg91', error: 'MSG91_TEMPLATE_ID missing' };

  const phone = normalizePhone(to).replace('+', '');
  // MSG91 OTP API — uses approved DLT template
  const url = `https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${phone}&authkey=${authKey}&otp=${otp}&sender=${senderId}`;
  try {
    const res = await fetch(url, { method: 'POST' });
    const json = (await res.json()) as { type?: string; request_id?: string; message?: string };
    if (json.type === 'success') {
      return { success: true, provider: 'msg91', messageId: json.request_id };
    }
    return { success: false, provider: 'msg91', error: json.message || 'MSG91 send failed' };
  } catch (err: any) {
    return { success: false, provider: 'msg91', error: err?.message || String(err) };
  }
}

async function sendViaTwilio(to: string, otp: string): Promise<SendSmsResult> {
  const tw = getTwilio();
  if (!tw) return { success: false, provider: 'twilio', error: 'Twilio credentials missing' };
  try {
    const message = await tw.client.messages.create({
      from: tw.from,
      to: normalizePhone(to),
      body: renderOtpSms(otp),
    });
    return { success: true, provider: 'twilio', messageId: message.sid };
  } catch (err: any) {
    return { success: false, provider: 'twilio', error: err?.message || String(err) };
  }
}

export async function sendOtpSms(to: string, otp: string): Promise<SendSmsResult> {
  const primary = pickProvider();

  if (primary === 'console') {
    console.warn(`[SMS-CONSOLE] OTP for ${to}: ${otp} (no SMS provider configured)`);
    return { success: false, provider: 'console', error: 'no provider configured' };
  }

  let result =
    primary === 'msg91' ? await sendViaMsg91(to, otp) : await sendViaTwilio(to, otp);

  // retry once on transient failure
  if (!result.success) {
    await new Promise((r) => setTimeout(r, 500));
    result =
      primary === 'msg91' ? await sendViaMsg91(to, otp) : await sendViaTwilio(to, otp);
  }

  // fallback to alternate provider
  if (!result.success && primary === 'msg91' && process.env.TWILIO_ACCOUNT_SID) {
    console.warn(`[SMS] MSG91 failed (${result.error}), falling back to Twilio`);
    result = await sendViaTwilio(to, otp);
  } else if (!result.success && primary === 'twilio' && process.env.MSG91_AUTH_KEY) {
    console.warn(`[SMS] Twilio failed (${result.error}), falling back to MSG91`);
    result = await sendViaMsg91(to, otp);
  }

  if (result.success) {
    console.log(`[SMS] Sent OTP to ${to} via ${result.provider} (${result.messageId})`);
  } else {
    console.error(`[SMS] All providers failed for ${to}: ${result.error}. OTP: ${otp}`);
  }
  return result;
}

export function getSmsProviderStatus(): SmsProviderStatus {
  const active = pickProvider();
  if (active === 'msg91') {
    return {
      active,
      configured: !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID),
      from: process.env.MSG91_SENDER_ID || 'CANTEN',
      details: process.env.MSG91_AUTH_KEY
        ? process.env.MSG91_TEMPLATE_ID
          ? 'MSG91 ready'
          : 'MSG91_TEMPLATE_ID missing (DLT template required for India)'
        : 'MSG91_AUTH_KEY missing',
    };
  }
  if (active === 'twilio') {
    return {
      active,
      configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      from: process.env.TWILIO_FROM_NUMBER,
      details: process.env.TWILIO_ACCOUNT_SID
        ? 'Twilio ready'
        : 'TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER missing',
    };
  }
  return {
    active,
    configured: false,
    details: 'No SMS provider configured. OTPs will be logged to server console only.',
  };
}
