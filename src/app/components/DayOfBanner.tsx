import { currentTimeHHMM } from "../lib/dayOf";
import { useI18n } from "../lib/i18n";
import { buildNavLinks } from "../lib/navLinks";
import type { Member, Place } from "../../shared/types";

function pickNextStop(dayPlaces: Place[]): Place | null {
  const now = currentTimeHHMM();
  const upcoming = dayPlaces
    .filter((p) => p.status === "planned" || p.status === "booked")
    .find((p) => p.time === null || p.time >= now);
  if (upcoming) return upcoming;
  const decided = dayPlaces.filter((p) => p.status === "planned" || p.status === "booked");
  return decided[decided.length - 1] ?? null;
}

export default function DayOfBanner({
  dayIndex,
  dayPlaces,
  members,
  memberId,
  onSetCurrentPlace,
}: {
  dayIndex: number;
  dayPlaces: Place[];
  members: Member[];
  memberId: string;
  onSetCurrentPlace: (placeId: string | null) => void;
}) {
  const { t } = useI18n();
  const nextStop = pickNextStop(dayPlaces);
  const me = members.find((m) => m.id === memberId);
  const imHere = me?.currentPlaceId === nextStop?.id;

  const here = nextStop
    ? members.filter((m) => m.currentPlaceId === nextStop.id && m.online)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm">
      <span className="rounded-full bg-terracotta px-2 py-0.5 text-xs font-medium text-cream">
        {t("dayof.today")} · {t("day.label", { n: dayIndex + 1 })}
      </span>
      {nextStop ? (
        <>
          <span className="text-ink/80">
            {t("dayof.next")}: {nextStop.category} {nextStop.name}
            {nextStop.time ? ` ${nextStop.time}` : ""}
          </span>
          {here.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-ink/60">
              {here.map((m) => (
                <span key={m.id} title={m.name}>
                  {m.emoji}
                </span>
              ))}
              {t("dayof.hereNow")}
            </span>
          )}
          <button
            type="button"
            onClick={() => onSetCurrentPlace(imHere ? null : nextStop.id)}
            className={`rounded-full border px-2 py-0.5 text-xs ${imHere ? "border-emerald-600 bg-emerald-50" : "border-ink/20"}`}
          >
            {imHere ? t("dayof.imHereChecked") : t("dayof.imHere")}
          </button>
          {buildNavLinks(nextStop.lat, nextStop.lng, nextStop.name).map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink/20 px-2 py-0.5 text-xs hover:bg-white"
              title={link.label}
            >
              {link.emoji}
            </a>
          ))}
        </>
      ) : (
        <span className="text-ink/60">{t("dayof.noStops")}</span>
      )}
    </div>
  );
}
