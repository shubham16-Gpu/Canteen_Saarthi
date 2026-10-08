import { NotificationChannel } from "../types";
import type { NotificationAdapter, NotificationResult } from "../types";

export class EmailAdapter implements NotificationAdapter {
  channel = NotificationChannel.EMAIL;

  constructor(
    private config: {
      host: string;
      port: number;
      auth: { user: string; pass: string };
      from: string;
    },
  ) {}

  async send(
    to: string,
    subject: string,
    body: string,
    _metadata?: Record<string, unknown>,
  ): Promise<NotificationResult> {
    try {
      // Skeleton: integrate with nodemailer or any SMTP service
      // const transporter = nodemailer.createTransport(this.config);
      // await transporter.sendMail({ from: this.config.from, to, subject, html: body });

      console.log(`[EmailAdapter] Sending email to ${to}: ${subject}`);

      return {
        success: true,
        channel: this.channel,
        messageId: `email-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : "Email send failed",
      };
    }
  }
}
