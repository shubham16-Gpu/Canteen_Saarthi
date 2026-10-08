import type { ReactNode } from "react";

// ── Base Props ──

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface TestableProps {
  testId?: string;
}

// ── Layout ──

export interface ContainerProps extends BaseProps {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
}

// ── Button ──

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends BaseProps, TestableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

// ── Input ──

export interface InputProps extends TestableProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  type?: "text" | "email" | "password" | "number" | "tel" | "search";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

// ── Badge ──

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends BaseProps {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

// ── Card ──

export interface CardProps extends BaseProps, TestableProps {
  hoverable?: boolean;
  bordered?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

// ── Modal ──

export interface ModalProps extends BaseProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlay?: boolean;
}

// ── Avatar ──

export interface AvatarProps extends TestableProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

// ── Menu Item Card (domain-specific) ──

export interface MenuItemCardProps extends TestableProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isVeg: boolean;
  isAvailable: boolean;
  preparationTime?: number;
  onAddToCart?: (id: string, quantity: number) => void;
  className?: string;
}

// ── Order Status ──

export type OrderStatusType =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

export interface OrderStatusBadgeProps extends TestableProps {
  status: OrderStatusType;
  className?: string;
}
