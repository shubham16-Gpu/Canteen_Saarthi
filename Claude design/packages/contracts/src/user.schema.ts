import { z } from "zod";

export const RoleEnum = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "VENDOR",
  "KITCHEN_STAFF",
  "CASHIER",
  "CUSTOMER",
]);

export const UserCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10).max(15).optional(),
  name: z.string().min(1, "Name is required").max(100),
  role: RoleEnum.default("CUSTOMER"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  avatar: z.string().url().optional(),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().optional(),
  role: RoleEnum.optional(),
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export const UserLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type UserLogin = z.infer<typeof UserLoginSchema>;

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().nullable(),
  name: z.string(),
  role: RoleEnum,
  isActive: z.boolean(),
  avatar: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
