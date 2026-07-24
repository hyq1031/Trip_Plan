import { useEffect, useRef, useState } from "react";
import { geocode, type GeocodeResult } from "../lib/api";
import { useI18n } from "../lib/i18n";

export default function AddPlaceForm({
  onAdd,
  votingEnabled,
}: {
  onAdd: (result: GeocodeResult, upForVote: boolean) => void;
  votingEnabled: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [upForVote, setUpForVote] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      geocode(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pick(result: GeocodeResult) {
    onAdd(result, votingEnabled && upForVote);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="relative border-t border-rule p-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("addPlace.searchPlaceholder")}
        className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
      />
      {votingEnabled && (
        <label className="mt-2 flex items-center gap-1.5 text-xs text-ink/60">
          <input
            type="checkbox"
            checked={upForVote}
            onChange={(e) => setUpForVote(e.target.checked)}
          />
          {t("addPlace.upForVoteLabel")}
        </label>
      )}
      {loading && <p className="mt-1 text-xs text-ink/40">{t("addPlace.searching")}</p>}
      {results.length > 0 && (
        <ul className="absolute inset-x-3 z-[1000] mt-1 max-h-56 overflow-auto rounded border border-ink/20 bg-white shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-cream"
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
