import { z } from "zod";

export const WalletTopUpSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(10000, "Maximum top-up amount is 10,000"),
  paymentMethod: z.enum(["UPI", "CARD"]),
});
export type WalletTopUp = z.infer<typeof WalletTopUpSchema>;

export const WalletTransactionSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  amount: z.number(),
  type: z.enum(["CREDIT", "DEBIT"]),
  description: z.string().nullable(),
  createdAt: z.string().or(z.date()),
});
export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;
