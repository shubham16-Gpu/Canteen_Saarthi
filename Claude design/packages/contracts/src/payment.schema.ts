import { z } from "zod";

export const PaymentMethodEnum = z.enum(["WALLET", "UPI", "CARD", "CASH", "COUPON"]);
export const PaymentStatusEnum = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);

export const PaymentInitiateSchema = z.object({
  orderId: z.string().uuid(),
  method: PaymentMethodEnum,
  amount: z.number().positive("Amount must be positive"),
});
export type PaymentInitiate = z.infer<typeof PaymentInitiateSchema>;

export const PaymentWebhookSchema = z.object({
  transactionId: z.string().min(1),
  orderId: z.string().uuid(),
  status: PaymentStatusEnum,
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  gatewayResponse: z.record(z.unknown()).optional(),
});
export type PaymentWebhook = z.infer<typeof PaymentWebhookSchema>;
