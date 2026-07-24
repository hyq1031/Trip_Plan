import { formatDayLabel } from "../lib/days";
import { useI18n } from "../lib/i18n";
import WeatherChip from "./WeatherChip";

export default function DayTabs({
  days,
  selectedDay,
  dayCoords,
  freeDays = 0,
  onSelect,
}: {
  days: string[];
  selectedDay: number;
  dayCoords: Array<{ lat: number; lng: number } | null>;
  freeDays?: number;
  onSelect: (index: number) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-rule bg-cream px-3 py-2">
      {days.map((iso, index) => {
        const coord = dayCoords[index];
        const isFree = freeDays > 0 && index >= days.length - freeDays;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelect(index)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
              index === selectedDay ? "bg-ink text-cream" : "text-ink-soft hover:bg-ink/5"
            }`}
          >
            <span>
              {t("day.label", { n: index + 1 })} · {formatDayLabel(iso, lang)}
              {isFree && ` 🌴 ${t("day.freeBadge")}`}
            </span>
            {coord && <WeatherChip lat={coord.lat} lng={coord.lng} date={iso} />}
          </button>
        );
      })}
    </div>
  );
}
