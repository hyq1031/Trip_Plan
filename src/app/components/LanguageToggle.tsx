import { useI18n } from "../lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex rounded-full border border-ink/15 p-0.5 text-xs">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-full px-2 py-0.5 ${lang === "en" ? "bg-ink text-cream" : "text-ink/50"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("zh")}
        className={`rounded-full px-2 py-0.5 ${lang === "zh" ? "bg-ink text-cream" : "text-ink/50"}`}
      >
        中文
      </button>
    </div>
  );
}
