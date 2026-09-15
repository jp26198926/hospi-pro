function formatParts(
  date: Date,
  timeZone: string,
  monthStyle: "short" | "long",
  withSeconds: boolean
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: monthStyle,
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = get("month");
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  return withSeconds
    ? `${month} ${day}, ${year} ${hour}:${minute}:${second}`
    : `${month} ${day}, ${year} ${hour}:${minute}`;
}

/** Format: "Jan 15, 2025 14:30" — matches date-fns "MMM dd, yyyy HH:mm" */
export function formatDateTime(date: Date | string | number, timeZone: string): string {
  return formatParts(new Date(date), timeZone, "short", false);
}

/** Format: "January 15, 2025 14:30:45" — matches date-fns "MMMM dd, yyyy HH:mm:ss" */
export function formatDateTimeLong(date: Date | string | number, timeZone: string): string {
  return formatParts(new Date(date), timeZone, "long", true);
}
