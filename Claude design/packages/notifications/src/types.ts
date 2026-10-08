export enum NotificationChannel {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
  WHATSAPP = "WHATSAPP",
}

export interface NotificationPayload {
  userId: string;
  channel: NotificationChannel;
  template: NotificationTemplateName;
  data: Record<string, string | number>;
  metadata?: Record<string, unknown>;
}

export type NotificationTemplateName =
  | "ORDER_PLACED"
  | "ORDER_READY"
  | "PAYMENT_SUCCESS"
  | "LOW_STOCK_ALERT"
  | "WALLET_CREDITED";

export interface NotificationTemplate {
  name: NotificationTemplateName;
  subject: string;
  body: string;
  channels: NotificationChannel[];
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

export interface NotificationAdapter {
  channel: NotificationChannel;
  send(
    to: string,
    subject: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<NotificationResult>;
}
