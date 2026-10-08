import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  slug: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type Category = z.infer<typeof CategorySchema>;

export const MenuItemCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive("Price must be positive"),
  image: z.string().url().optional(),
  categoryId: z.string().uuid(),
  outletId: z.string().uuid(),
  vendorId: z.string().uuid().optional(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  preparationTime: z.number().int().min(1).optional(),
  calories: z.number().int().min(0).optional(),
  allergens: z.array(z.string()).default([]),
});
export type MenuItemCreate = z.infer<typeof MenuItemCreateSchema>;

export const MenuItemUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().positive().optional(),
  image: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().min(1).optional(),
  calories: z.number().int().min(0).optional(),
  allergens: z.array(z.string()).optional(),
});
export type MenuItemUpdate = z.infer<typeof MenuItemUpdateSchema>;
