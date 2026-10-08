import { z } from "zod";

export const OrderStatusEnum = z.enum([
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
]);

export const OrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  notes: z.string().max(200).optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderCreateSchema = z.object({
  outletId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(["WALLET", "UPI", "CARD", "CASH", "COUPON"]),
  couponCode: z.string().optional(),
});
export type OrderCreate = z.infer<typeof OrderCreateSchema>;

export const OrderStatusUpdateSchema = z.object({
  status: OrderStatusEnum,
  notes: z.string().max(500).optional(),
});
export type OrderStatusUpdate = z.infer<typeof OrderStatusUpdateSchema>;

export const OrderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().uuid(),
  outletId: z.string().uuid(),
  status: OrderStatusEnum,
  totalAmount: z.number(),
  notes: z.string().nullable(),
  tokenNumber: z.string().nullable(),
  placedAt: z.string().or(z.date()),
  completedAt: z.string().or(z.date()).nullable(),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        menuItemId: z.string().uuid(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        notes: z.string().nullable(),
      }),
    )
    .optional(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
