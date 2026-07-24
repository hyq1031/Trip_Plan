/**
 * Everything here parses/formats as UTC and never round-trips through a
 * local-midnight Date + toISOString() — that combination silently shifts the
 * date by a day in any timezone ahead of UTC (verified via browser testing).
 */

/** Inclusive list of ISO dates (YYYY-MM-DD) from a trip's start to end date. */
export function tripDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days.length > 0 ? days : [startDate];
}

export function formatDayLabel(iso: string, locale: "en" | "zh" = "en"): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
