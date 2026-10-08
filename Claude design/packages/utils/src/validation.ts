const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate email format
 */
export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

/**
 * Validate phone number (international format)
 */
export function isPhone(value: string): boolean {
  return PHONE_REGEX.test(value.replace(/[\s-()]/g, ""));
}

/**
 * Validate Indian GST number
 */
export function isGST(value: string): boolean {
  return GST_REGEX.test(value.toUpperCase());
}

/**
 * Validate UUID v4 format
 */
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
