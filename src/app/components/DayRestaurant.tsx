import type { RestaurantSuggestion } from "../../shared/types";
import { useI18n } from "../lib/i18n";

export default function DayRestaurant({ suggestion }: { suggestion: RestaurantSuggestion | undefined }) {
  const { t } = useI18n();
  if (!suggestion) return null;

  return (
    <div className="px-4 py-1.5 text-xs text-ink/70">
      🍽️ {t("restaurant.suggestionPrefix")} <span className="font-medium text-ink">{suggestion.name}</span>
      {suggestion.area && ` · ${suggestion.area}`}
      {suggestion.note && ` — ${suggestion.note}`}
    </div>
  );
}
