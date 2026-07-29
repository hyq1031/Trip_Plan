# Friend Trip

Real-time collaborative trip planner. Cloudflare Workers + Durable Objects (SQLite storage) + Hono API, Vite + React 19 + TypeScript + Tailwind v4 frontend. One `TripRoom` Durable Object per trip = websocket hub + authoritative SQLite state.

## Commands

- `npm run dev` — Vite only. **Does not serve `/api/*`** — frontend will 404 on any API call. Use this only for pure UI/CSS work.
- `npm run worker:dev` — `wrangler dev`, full stack (API + DO + static assets) at `http://localhost:8787`. Use this for anything that touches data.
- `npm run build` — `tsc -b && vite build`
- `npm run deploy` — build + `wrangler deploy`
- `npm run lint` — oxlint

## Deployment

Production Worker (`trip-plan`) is connected to GitHub (`hyq1031/Trip_Plan`, branch `master`) via Cloudflare's Workers Builds Git integration — **pushing to `master` auto-deploys to production**, no manual `wrangler deploy` or GitHub Actions step needed. There's no CI config in this repo (`.github/` doesn't exist) — the build is entirely dashboard-managed on Cloudflare's side.

- `OPENROUTER_API_KEY` is a Worker secret (set in the Cloudflare dashboard), not in the repo. Local dev reads it from `.dev.vars` (gitignored; `.dev.vars.example` has the placeholder).
- `TRIP_CREATE_PASSWORD` is a Worker secret gating `POST /api/trips` (see `src/worker/index.ts`) so randoms can't spin up trips on the public Worker. Same pattern as `OPENROUTER_API_KEY` — set via `wrangler secret put TRIP_CREATE_PASSWORD` in prod, `.dev.vars` locally. This only guards trip *creation*; existing trips are still reached via the per-trip `?k=` token in the URL, unchanged.
- Enabling the public URL for a Git-connected Worker is a separate manual step in the dashboard (Domains tab) — it isn't automatic on first deploy.

## Gotchas

- **Schema changes need a fresh local DO store.** `CREATE TABLE IF NOT EXISTS` doesn't retrofit new columns onto an existing table. After changing the `trip`/`members`/`places` schema in `tripRoom.ts`, stop `worker:dev` and `rm -rf .wrangler` before restarting, or old local dev data will cause silent column-mismatch failures.
- **`createPlace` always appends** — it ignores any `sortOrder` passed in `NewPlaceInput` and inserts at `max(sort_order)+1` for that day (see `tripRoom.ts` `createPlace`). If a script needs a specific day order (e.g. seeding a curated itinerary), insert in order and use `POST /api/trip/:id/places/reorder` afterward to fix any place that had to be inserted out of order (e.g. a geocode retry).
- **Nominatim (`/api/geocode`) does fuzzy full-text matching, not prefix matching.** Partial input like "Sydn" won't resolve to Sydney — that's what `/api/destination-search` (Photon) is for instead, used only by the destination autocomplete field. Don't repoint other place-search UI at Photon; Nominatim is correct for specific POI queries.
- **Nominatim same-name ambiguity is real, not theoretical.** Seeding Melbourne, a bare `"Degraves Street, Melbourne, Australia"` query resolved to a same-named street in Mickleham (~30km from the CBD) instead of the actual laneway. Always sanity-check bulk-geocoded lat/lng against the destination's bounding box before trusting it, and disambiguate ambiguous street names with a postcode or suburb.
- **`freeDays` only supports trailing days.** `Trip.freeDays` marks the last N days as unplanned/free — there's no way to mark a free day in the middle of a trip. If a curated itinerary wants a free day mid-trip, either reorder days so it lands at the end, or extend the data model (not done yet).

## Seed scripts

`scripts/seed-*.mjs` replay a hand-curated itinerary against a running instance via the public REST API (create trip → geocode each place with a 1100ms delay per Nominatim's usage policy → insert with day/order/status). Edit the `BASE` constant at the top to point at `http://localhost:8787` or the deployed Worker URL before running. Reusable pattern for any destination — copy one and edit the `days` array. They send `TRIP_CREATE_PASSWORD` (env var, falls back to `123456`) to satisfy the create-trip password gate — set it in your shell if the target's secret isn't the default.
