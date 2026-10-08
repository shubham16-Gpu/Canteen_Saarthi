/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Truncate a string to a given length with ellipsis
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Generate a unique order number (e.g., "ORD-20260508-A1B2C3")
 */
export function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

/**
 * Generate a token number for order pickup (e.g., "T-042")
 */
export function generateTokenNumber(counter: number = 0): string {
  const num = (counter % 999) + 1;
  return `T-${num.toString().padStart(3, "0")}`;
}

/**
 * Mask an email address (e.g., "sh***@example.com")
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Mask a phone number (e.g., "+91****9999")
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  const visibleStart = phone.slice(0, 3);
  const visibleEnd = phone.slice(-4);
  const masked = "*".repeat(phone.length - 7);
  return `${visibleStart}${masked}${visibleEnd}`;
}
