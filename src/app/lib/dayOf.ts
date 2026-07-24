/** Today's date as YYYY-MM-DD in the browser's local timezone (deliberately NOT UTC — "day of" is about the traveler's local day). */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Index into `days` for today, or null if today isn't within the trip range. */
export function todayDayIndex(days: string[]): number | null {
  const today = todayIso();
  const index = days.indexOf(today);
  return index === -1 ? null : index;
}

export function currentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
