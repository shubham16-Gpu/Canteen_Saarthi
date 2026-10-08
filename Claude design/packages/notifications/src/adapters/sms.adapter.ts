import { NotificationChannel } from "../types";
import type { NotificationAdapter, NotificationResult } from "../types";

export class SmsAdapter implements NotificationAdapter {
  channel = NotificationChannel.SMS;

  constructor(
    private config: {
      apiKey: string;
      senderId: string;
      baseUrl?: string;
    },
  ) {}

  async send(
    to: string,
    _subject: string,
    body: string,
    _metadata?: Record<string, unknown>,
  ): Promise<NotificationResult> {
    try {
      // Skeleton: integrate with Twilio, MSG91, or any SMS gateway
      // const response = await fetch(`${this.config.baseUrl}/send`, {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${this.config.apiKey}` },
      //   body: JSON.stringify({ to, message: body, senderId: this.config.senderId }),
      // });

      console.log(`[SmsAdapter] Sending SMS to ${to}: ${body.slice(0, 50)}...`);

      return {
        success: true,
        channel: this.channel,
        messageId: `sms-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : "SMS send failed",
      };
    }
  }
}
