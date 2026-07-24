import type { MoneyTip } from "../../shared/types";
import { useI18n } from "../lib/i18n";

export default function MoneyTips({ tips }: { tips: MoneyTip[] }) {
  const { t } = useI18n();
  if (tips.length === 0) return null;

  return (
    <div className="border-b border-rule px-4 py-2">
      <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
        {t("moneyTips.title")}
      </h2>
      <ul className="flex flex-col gap-1">
        {tips.map((tip, i) => (
          <li key={i} className="text-sm text-ink/80">
            <span className="font-medium text-ink">💰 {tip.title}</span>
            {tip.note && <span className="text-ink/60"> — {tip.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
