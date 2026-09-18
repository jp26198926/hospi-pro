export function formatUserDisplay(
  firstname: string | null | undefined,
  lastname: string | null | undefined
): string {
  if (!firstname && !lastname) return "-";
  const last = (lastname || "").trim();
  const first = (firstname || "").trim();
  const initial = first ? `${first[0].toUpperCase()}.` : "";
  if (last && initial) return `${last}, ${initial}`;
  return last || initial || "-";
}
