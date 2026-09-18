/** Project-wide date display format: YYYY-MM-DD (calendar day in the given timezone). */

export function formatDateOnly(date: Date | string | number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/** @deprecated Use formatDateOnly. Outputs YYYY-MM-DD. */
export function formatDateTime(date: Date | string | number, timeZone: string): string {
  return formatDateOnly(date, timeZone);
}

/** @deprecated Use formatDateOnly. Outputs YYYY-MM-DD. */
export function formatDateTimeLong(date: Date | string | number, timeZone: string): string {
  return formatDateOnly(date, timeZone);
}
