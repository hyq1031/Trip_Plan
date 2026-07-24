# Session — Friend Trip V1 build

## Goal
Build a real-time collaborative trip planner for friend groups on Cloudflare Workers + Durable Objects, per the plan at the top of this session (map+timeline itinerary, packing, voting, weather, day-of mode, ticket-price lookup, offline export, editorial design + bilingual EN/中文).

## Current State
All 9 planned tasks complete and browser-verified:
1. Scaffold — Hono worker + Vite/React/Tailwind, `TripRoom` Durable Object (SQLite)
2. Trip core — magic link, join flow, live presence over WebSocket
3. Itinerary — day tabs, map+timeline sync, geocoded place search (Nominatim), drag-reorder (dnd-kit), cost totals
4. Real-time hardening — version-bumped mutations, reconnect snapshot pushed to every new socket, optimistic client updates
5. Packing/polls/weather — group + personal packing lists (bilingual seed template), place voting → promote, Open-Meteo weather chip
6. Hotel deep-link (Google Hotels, no key) + ticket-price lookup via **OpenRouter** `deepseek/deepseek-v4-flash` + `web` plugin (Parallel engine, ~$0.001–0.002/lookup) — **not live-tested, no `OPENROUTER_API_KEY` configured** (see Next step)
7. Day-of mode — auto-selects today's day, next-stop banner, phone nav deep-links (Apple/Android/Google/高德 with GCJ-02 correction), live "I'm here" presence pin
8. Offline single-file export — self-contained downloadable HTML, verified with zero external resources
9. Editorial design + i18n — self-hosted Fraunces serif (no CDN), cream/terracotta palette, full EN/中文 dictionary covering every screen including seeded packing content and the export artifact

Git repo initialized locally, **no commits made yet** (user hasn't asked to commit).

## Problem
None currently blocking. Two real bugs were found via live browser testing and fixed in-session:
- `tripDays()`/`formatDayLabel()` originally round-tripped through `toISOString()` after building a local-midnight `Date`, which silently shifted every date back one day in timezones ahead of UTC.
- The "rough China bounding box" used to decide when to show the 高德 (AMap) nav link and apply GCJ-02 correction overlapped Japan/Korea's longitude range (Osaka incorrectly triggered it); narrowed with explicit Japan/Korea carve-outs.
- Also caught: guessed Google Travel `checkin`/`checkout` URL params are silently ignored by Google — replaced with an honest approach (dates in the free-text query, exact date picking left to the user).

## Key Details
- Stack: Cloudflare Workers (Hono) + Durable Objects w/ SQLite storage, Vite + React 19 + Tailwind v4 + zustand, Leaflet/OSM (no map API key), dnd-kit.
- All external data calls are free/no-key except the OpenRouter ticket-price lookup: Nominatim (geocode), Open-Meteo (weather), Google Hotels/Maps/Apple Maps/AMap (deep-links only).
- `.dev.vars` (gitignored) is where `OPENROUTER_API_KEY` goes for local `wrangler dev`; production uses `wrangler secret put OPENROUTER_API_KEY`. See `.dev.vars.example`.
- Local dev loop: `npm run build && npx wrangler dev --port 8787`. `npm run dev` (plain Vite) does **not** serve `/api/*`.

## Next step
- Add a real `OPENROUTER_API_KEY` (`.dev.vars` locally or `wrangler secret put` for prod) and do one live test of the ticket-price lookup end-to-end — the code path is built and its error-handling verified, but the actual OpenRouter call has never been exercised.
- Decide on deploying (`npm run deploy`) vs. continuing local-only.
- No commits yet — review the diff and commit when ready.
