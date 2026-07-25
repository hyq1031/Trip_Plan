import { useEffect, useRef, useState } from "react";
import { type GeocodeResult, searchDestinations } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function DestinationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchDestinations(value)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  function pick(name: string) {
    onChange(name);
    setResults([]);
    setOpen(false);
  }

  return (
    <label className="relative block text-sm text-ink-soft">
      {t("home.destination")}
      <input
        className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={t("home.destinationPlaceholder")}
        autoComplete="off"
        required
      />
      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 z-[1000] mt-1 max-h-56 overflow-auto rounded border border-ink/20 bg-white text-ink shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.name)}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-cream"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}
