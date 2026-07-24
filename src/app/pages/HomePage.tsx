import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TripType } from "../../shared/types";
import { createTrip } from "../lib/api";
import { useI18n } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("friends");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { tripId, token } = await createTrip({ title, startDate, endDate, tripType });
      navigate(`/t/${tripId}?k=${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <LanguageToggle />
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-rule bg-cream-dim/60 p-7"
        >
          <h1 className="font-serif text-4xl tracking-tight text-ink">{t("home.title")}</h1>
          <div className="h-px bg-rule" />
          <label className="block text-sm text-ink-soft">
            {t("home.tripTitleLabel")}
            <input
              className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("home.tripTitlePlaceholder")}
              required
            />
          </label>
          <div className="flex gap-3">
            <label className="block flex-1 text-sm text-ink-soft">
              {t("home.start")}
              <input
                type="date"
                className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
            <label className="block flex-1 text-sm text-ink-soft">
              {t("home.end")}
              <input
                type="date"
                className="mt-1 w-full rounded border border-rule bg-cream px-3 py-2 text-ink outline-none focus:border-terracotta"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="text-sm text-ink-soft">
            {t("home.tripType")}
            <div className="mt-1 flex rounded-full border border-ink/15 p-0.5">
              <button
                type="button"
                onClick={() => setTripType("friends")}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm ${tripType === "friends" ? "bg-ink text-cream" : "text-ink/60"}`}
              >
                {t("home.tripTypeFriends")}
              </button>
              <button
                type="button"
                onClick={() => setTripType("family")}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm ${tripType === "family" ? "bg-ink text-cream" : "text-ink/60"}`}
              >
                {t("home.tripTypeFamily")}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-ink py-2.5 font-medium text-cream transition-opacity disabled:opacity-50"
          >
            {busy ? t("home.creating") : t("home.createButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
