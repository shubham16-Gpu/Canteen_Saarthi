export interface OtpEmailParams {
  to: string;
  otp: string;
  appName?: string;
  brandColor?: string;
}

export function renderOtpEmail({
  to,
  otp,
  appName = 'Canteen Secure Gateway',
  brandColor = '#0056b3',
}: OtpEmailParams): { subject: string; html: string; text: string } {
  const subject = `Your secure access code: ${otp}`;
  const text = `Your ${appName} access code is ${otp}. Valid for 5 minutes. If you did not request this, ignore this email.`;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#001b3d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,0.04);">
            <tr>
              <td style="padding:40px 40px 24px;">
                <div style="font-weight:900;font-size:18px;letter-spacing:-0.02em;color:${brandColor};">CANTEEN</div>
                <div style="margin-top:24px;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Access Challenge</div>
                <h1 style="margin:8px 0 0;font-size:24px;font-weight:900;line-height:1.2;color:#001b3d;">Verify your identity</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 8px;">
                <div style="background:#f1f5f9;border-radius:16px;padding:28px;text-align:center;font-size:36px;font-weight:900;letter-spacing:14px;color:#001b3d;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">
                  ${otp}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  This code is valid for <strong style="color:#001b3d;">5 minutes</strong> and can be used <strong style="color:#001b3d;">once</strong>.
                </p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Requested for ${to}. If you did not request this code, ignore this email — your account remains secure.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;letter-spacing:0.5px;">
            ${appName} · Automated message — do not reply
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}

export function renderOtpSms(otp: string): string {
  return `Your Canteen secure access code is ${otp}. Valid for 5 minutes. Do not share this code.`;
}
