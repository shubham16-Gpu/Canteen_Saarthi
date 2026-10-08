import { format, formatDistanceToNow, isWithinInterval, parseISO } from "date-fns";

/**
 * Format a date as "DD MMM YYYY" (e.g., "08 May 2026")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy");
}

/**
 * Format a date as time only "hh:mm a" (e.g., "02:30 PM")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "hh:mm a");
}

/**
 * Format a date as "DD MMM YYYY, hh:mm a" (e.g., "08 May 2026, 02:30 PM")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

/**
 * Check if the current time falls within a time slot (HH:mm format)
 */
export function isWithinSlot(startTime: string, endTime: string): boolean {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const start = parseISO(`${today}T${startTime}:00`);
  const end = parseISO(`${today}T${endTime}:00`);

  return isWithinInterval(now, { start, end });
}

/**
 * Get relative time string (e.g., "5 minutes ago", "in 2 hours")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
