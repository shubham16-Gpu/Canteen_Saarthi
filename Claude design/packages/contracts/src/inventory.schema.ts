import { z } from "zod";

export const StockMovementTypeEnum = z.enum(["IN", "OUT", "ADJUSTMENT", "WASTAGE"]);

export const InventoryAdjustmentSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().positive("Quantity must be positive"),
  type: StockMovementTypeEnum,
  reason: z.string().max(500).optional(),
});
export type InventoryAdjustment = z.infer<typeof InventoryAdjustmentSchema>;

export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  quantity: z.number(),
  type: StockMovementTypeEnum,
  reason: z.string().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().or(z.date()),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;
