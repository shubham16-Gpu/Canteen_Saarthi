import { NotificationChannel } from "./types";
import type { NotificationTemplate } from "./types";

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  ORDER_PLACED: {
    name: "ORDER_PLACED",
    subject: "Order Placed Successfully",
    body: "Your order #{{orderNumber}} has been placed successfully. Token: {{tokenNumber}}. Estimated time: {{estimatedTime}} minutes.",
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
  },

  ORDER_READY: {
    name: "ORDER_READY",
    subject: "Your Order is Ready!",
    body: "Your order #{{orderNumber}} is ready for pickup! Please collect it from {{outletName}} using token {{tokenNumber}}.",
    channels: [
      NotificationChannel.PUSH,
      NotificationChannel.SMS,
      NotificationChannel.WHATSAPP,
    ],
  },

  PAYMENT_SUCCESS: {
    name: "PAYMENT_SUCCESS",
    subject: "Payment Successful",
    body: "Payment of {{amount}} for order #{{orderNumber}} was successful. Transaction ID: {{transactionId}}.",
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
  },

  LOW_STOCK_ALERT: {
    name: "LOW_STOCK_ALERT",
    subject: "Low Stock Alert",
    body: "{{itemName}} at {{outletName}} is running low. Current stock: {{currentStock}} {{unit}}. Minimum required: {{minStock}} {{unit}}.",
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
  },

  WALLET_CREDITED: {
    name: "WALLET_CREDITED",
    subject: "Wallet Credited",
    body: "Your wallet has been credited with {{amount}}. New balance: {{newBalance}}.",
    channels: [NotificationChannel.PUSH],
  },
};

/**
 * Interpolate template variables like {{key}} with actual values
 */
export function renderTemplate(
  template: string,
  data: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return data[key] !== undefined ? String(data[key]) : `{{${key}}}`;
  });
}
