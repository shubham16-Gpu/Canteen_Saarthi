import { NotificationChannel } from "../types";
import type { NotificationAdapter, NotificationResult } from "../types";

export class PushAdapter implements NotificationAdapter {
  channel = NotificationChannel.PUSH;

  constructor(
    private config: {
      projectId: string;
      serviceAccountKey?: string;
    },
  ) {}

  async send(
    to: string,
    subject: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<NotificationResult> {
    try {
      // Skeleton: integrate with Firebase Cloud Messaging (FCM)
      // const message = {
      //   token: to,
      //   notification: { title: subject, body },
      //   data: metadata,
      // };
      // await admin.messaging().send(message);

      console.log(`[PushAdapter] Sending push to device ${to}: ${subject}`);

      return {
        success: true,
        channel: this.channel,
        messageId: `push-${Date.now()}`,
      };
    } catch (error) {
      return {
        success: false,
        channel: this.channel,
        error: error instanceof Error ? error.message : "Push send failed",
      };
    }
  }
}
