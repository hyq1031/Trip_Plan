import type { GroupPackingItem, Member, PersonalPackingItem, Place, Trip } from "../../shared/types";
import { type Lang, dictionaries } from "../../shared/i18n";
import { formatDayLabel, tripDays } from "./days";
import { buildNavLinks } from "./navLinks";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
  return out;
}

const STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 64px;
    background: #faf6ef; color: #2a2621;
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  main { max-width: 640px; margin: 0 auto; }
  h1 { font-family: Georgia, "Noto Serif SC", serif; font-size: 2rem; margin: 0 0 4px; }
  .dates { color: #6b6459; margin-bottom: 28px; }
  h2 { font-family: Georgia, "Noto Serif SC", serif; font-size: 1.3rem; border-bottom: 1px solid #d8d2c4; padding-bottom: 6px; margin: 32px 0 12px; }
  .place { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #ece7da; }
  .num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #c65d3b; color: #faf6ef; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
  .time { flex-shrink: 0; width: 48px; color: #948c7c; font-size: 0.8rem; }
  .name { flex: 1; }
  .cost { flex-shrink: 0; color: #6b6459; font-size: 0.9rem; }
  .notes { color: #6b6459; font-size: 0.85rem; margin-top: 2px; }
  .nav-links a { margin-right: 8px; text-decoration: none; font-size: 0.85rem; }
  .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 0.7rem; border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
  .empty { color: #948c7c; font-style: italic; }
  .footer { margin-top: 40px; color: #948c7c; font-size: 0.8rem; text-align: center; }
  ul { list-style: none; padding: 0; margin: 0; }
  li.pack { padding: 3px 0; }
  .checked { text-decoration: line-through; color: #948c7c; }
`;

export function buildOfflineHtml(
  trip: Trip,
  places: Place[],
  groupPacking: GroupPackingItem[],
  personalPacking: PersonalPackingItem[],
  members: Member[],
  lang: Lang = "en",
): string {
  const t = dictionaries[lang];
  const days = tripDays(trip.startDate, trip.endDate);

  const dayBlocks = days
    .map((iso, dayIndex) => {
      const dayPlaces = places
        .filter((p) => p.dayIndex === dayIndex)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const rows =
        dayPlaces.length === 0
          ? `<p class="empty">${esc(t["export.noPlacesPlanned"])}</p>`
          : dayPlaces
              .map((p, i) => {
                const links = buildNavLinks(p.lat, p.lng, p.name)
                  .map((l) => `<a href="${esc(l.url)}">${l.emoji} ${esc(l.label)}</a>`)
                  .join("");
                const badge =
                  p.status === "undecided"
                    ? `<span class="badge">${esc(t["timeline.upForVote"])}</span>`
                    : "";
                return `
                <div class="place">
                  <span class="num">${i + 1}</span>
                  <span class="time">${esc(p.time ?? "")}</span>
                  <div class="name">
                    ${esc(p.category)} ${esc(p.name)}${badge}
                    ${p.notes ? `<div class="notes">${esc(p.notes)}</div>` : ""}
                    <div class="nav-links">${links}</div>
                  </div>
                  <span class="cost">${p.estCost != null ? `¥${p.estCost.toLocaleString()}` : ""}</span>
                </div>`;
              })
              .join("");
      return `<h2>${esc(fmt(t["day.label"], { n: dayIndex + 1 }))} — ${esc(formatDayLabel(iso, lang))}</h2>${rows}`;
    })
    .join("");

  const memberById = new Map(members.map((m) => [m.id, m]));
  const groupRows =
    groupPacking.length === 0
      ? `<p class="empty">${esc(t["export.noSharedItems"])}</p>`
      : `<ul>${groupPacking
          .map((item) => {
            const claimant = item.claimedBy ? memberById.get(item.claimedBy) : null;
            return `<li class="pack"><span class="${item.checked ? "checked" : ""}">${esc(item.name)}${item.qty > 1 ? ` ×${item.qty}` : ""}</span>${claimant ? ` — ${esc(claimant.emoji)} ${esc(claimant.name)}` : ""}</li>`;
          })
          .join("")}</ul>`;

  const personalByMember = members
    .map((m) => {
      const items = personalPacking.filter((i) => i.memberId === m.id);
      if (items.length === 0) return "";
      const heading = fmt(t["export.checklistOf"], { emoji: m.emoji, name: m.name });
      return `<h2>${esc(heading)}</h2><ul>${items
        .map((i) => `<li class="pack"><span class="${i.checked ? "checked" : ""}">${esc(i.name)}</span></li>`)
        .join("")}</ul>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(trip.title)} — offline itinerary</title>
<style>${STYLE}</style>
</head>
<body>
<main>
  <h1>${esc(trip.title)}</h1>
  <p class="dates">${esc(trip.startDate)} → ${esc(trip.endDate)}</p>
  ${dayBlocks}
  <h2>${esc(t["packing.groupGear"])}</h2>
  ${groupRows}
  ${personalByMember}
  <p class="footer">${esc(t["export.footer"])}</p>
</main>
</body>
</html>`;
}

export function downloadOfflineHtml(
  trip: Trip,
  places: Place[],
  groupPacking: GroupPackingItem[],
  personalPacking: PersonalPackingItem[],
  members: Member[],
  lang: Lang = "en",
): void {
  const html = buildOfflineHtml(trip, places, groupPacking, personalPacking, members, lang);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${trip.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
