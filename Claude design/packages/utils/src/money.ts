const DEFAULT_CURRENCY = "INR";
const DEFAULT_LOCALE = "en-IN";

/**
 * Format a number as currency (e.g., 120 -> "₹120.00")
 */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  amount: number,
  discountType: "PERCENTAGE" | "FLAT",
  discountValue: number,
): number {
  if (discountType === "PERCENTAGE") {
    return Math.round(amount * (discountValue / 100) * 100) / 100;
  }
  return Math.min(discountValue, amount);
}

/**
 * Convert amount to smallest unit (e.g., rupees to paise)
 */
export function toSmallestUnit(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert from smallest unit back to standard (e.g., paise to rupees)
 */
export function fromSmallestUnit(amount: number): number {
  return amount / 100;
}
