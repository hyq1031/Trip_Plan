import type { HotelSuggestion } from "../../shared/types";
import { hotelSearchUrl } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function HotelSuggestions({
  suggestions,
  tripStartDate,
  tripEndDate,
}: {
  suggestions: HotelSuggestion[];
  tripStartDate: string;
  tripEndDate: string;
}) {
  const { t } = useI18n();
  if (suggestions.length === 0) return null;

  return (
    <div className="border-b border-rule px-4 py-2">
      <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
        {t("hotels.title")}
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((hotel, i) => (
          <div
            key={i}
            className="flex w-56 shrink-0 flex-col gap-0.5 rounded border border-rule bg-white/60 p-2.5 text-sm"
          >
            <span className="font-medium text-ink">{hotel.name}</span>
            <span className="text-xs text-ink-soft">
              {hotel.area}
              {hotel.priceTier ? ` · ${hotel.priceTier}` : ""}
            </span>
            {hotel.note && <span className="text-xs text-ink/60">{hotel.note}</span>}
            <a
              href={hotelSearchUrl(hotel.name, tripStartDate, tripEndDate)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 self-start rounded-full border border-ink/20 px-2 py-0.5 text-xs text-ink/70 hover:bg-cream"
            >
              🔎 {t("hotels.search")}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
