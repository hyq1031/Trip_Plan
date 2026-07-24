import { DurableObject } from "cloudflare:workers";
import { nanoid } from "nanoid";
import type { Env } from "./env";
import type {
  AgeGroup,
  GroupPackingItem,
  HotelSuggestion,
  Member,
  NewPlaceInput,
  PersonalPackingItem,
  Place,
  PlacePatch,
  ServerEvent,
  TicketPriceResult,
  Trip,
  TripState,
  TripType,
} from "../shared/types";
import { pickAvatar } from "../shared/avatar";
import { PACKING_TEMPLATES } from "../shared/packingTemplate";

type TripRow = Record<string, SqlStorageValue> & {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  token: string;
  version: number;
  trip_type: string;
  voting_enabled: number;
  hotel_suggestions: string;
};

type MemberRow = Record<string, SqlStorageValue> & {
  id: string;
  name: string;
  color: string;
  emoji: string;
  current_place_id: string | null;
  age_group: string;
  notes: string;
};

type PlaceRow = Record<string, SqlStorageValue> & {
  id: string;
  day_index: number;
  sort_order: number;
  name: string;
  lat: number;
  lng: number;
  time: string | null;
  est_cost: number | null;
  category: string;
  notes: string;
  status: string;
  votes: string;
};

type GroupPackingRow = Record<string, SqlStorageValue> & {
  id: string;
  name: string;
  qty: number;
  claimed_by: string | null;
  checked: number;
};

type PersonalPackingRow = Record<string, SqlStorageValue> & {
  id: string;
  member_id: string;
  name: string;
  checked: number;
};

type TicketCacheRow = Record<string, SqlStorageValue> & {
  place_id: string;
  price: number | null;
  currency: string | null;
  source_url: string | null;
  note: string | null;
  checked_at: string;
};

const TICKET_CACHE_HOURS = 12;
const NOMINATIM_HEADERS = { "User-Agent": "FriendTrip/1.0 (friend-trip planner; contact: n/a)" };
// Nominatim's usage policy asks for max ~1 request/sec from a single client.
const GEOCODE_DELAY_MS = 1100;
const MAX_GENERATED_PLACES = 12;
const MAX_GENERATED_HOTELS = 3;

interface WsAttachment {
  memberId: string;
}

function placeFromRow(row: PlaceRow): Place {
  return {
    id: row.id,
    dayIndex: row.day_index,
    sortOrder: row.sort_order,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    time: row.time,
    estCost: row.est_cost,
    category: row.category,
    notes: row.notes,
    status: row.status as Place["status"],
    votes: JSON.parse(row.votes) as Place["votes"],
  };
}

function groupPackingFromRow(row: GroupPackingRow): GroupPackingItem {
  return {
    id: row.id,
    name: row.name,
    qty: row.qty,
    claimedBy: row.claimed_by,
    checked: row.checked === 1,
  };
}

function personalPackingFromRow(row: PersonalPackingRow): PersonalPackingItem {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    checked: row.checked === 1,
  };
}

export class TripRoom extends DurableObject<Env> {
  sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS trip (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        destination TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        token TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        trip_type TEXT NOT NULL DEFAULT 'friends',
        voting_enabled INTEGER NOT NULL DEFAULT 1,
        hotel_suggestions TEXT NOT NULL DEFAULT '[]'
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        emoji TEXT NOT NULL,
        current_place_id TEXT,
        age_group TEXT NOT NULL DEFAULT 'adult',
        notes TEXT NOT NULL DEFAULT ''
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        day_index INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        time TEXT,
        est_cost REAL,
        category TEXT NOT NULL DEFAULT '📍',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'planned',
        votes TEXT NOT NULL DEFAULT '{}'
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS group_packing (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        claimed_by TEXT,
        checked INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS personal_packing (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        name TEXT NOT NULL,
        checked INTEGER NOT NULL DEFAULT 0
      )
    `);
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS ticket_cache (
        place_id TEXT PRIMARY KEY,
        price REAL,
        currency TEXT,
        source_url TEXT,
        note TEXT,
        checked_at TEXT NOT NULL
      )
    `);
  }

  private getTripRow(): TripRow | null {
    const row = this.sql
      .exec<TripRow>("SELECT * FROM trip LIMIT 1")
      .toArray()[0];
    return row ?? null;
  }

  private checkToken(token: string): boolean {
    const row = this.getTripRow();
    return row !== null && row.token === token;
  }

  // `excludeWs` covers a Cloudflare hibernation quirk: inside webSocketClose /
  // webSocketError, the closing socket can still appear in getWebSockets()
  // for that same tick, so it must be excluded explicitly rather than relying
  // on it having already been removed.
  private onlineMemberIds(excludeWs?: WebSocket): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excludeWs) continue;
      const attachment = ws.deserializeAttachment() as WsAttachment | null;
      if (attachment) ids.add(attachment.memberId);
    }
    return ids;
  }

  private listMembers(excludeWs?: WebSocket): Member[] {
    const online = this.onlineMemberIds(excludeWs);
    return this.sql
      .exec<MemberRow>("SELECT * FROM members ORDER BY rowid ASC")
      .toArray()
      .map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        emoji: row.emoji,
        online: online.has(row.id),
        currentPlaceId: row.current_place_id,
        ageGroup: row.age_group as AgeGroup,
        notes: row.notes,
      }));
  }

  private listPlacesInternal(): Place[] {
    return this.sql
      .exec<PlaceRow>("SELECT * FROM places ORDER BY day_index ASC, sort_order ASC")
      .toArray()
      .map(placeFromRow);
  }

  private listGroupPackingInternal(): GroupPackingItem[] {
    return this.sql
      .exec<GroupPackingRow>("SELECT * FROM group_packing ORDER BY rowid ASC")
      .toArray()
      .map(groupPackingFromRow);
  }

  private listPersonalPackingInternal(): PersonalPackingItem[] {
    return this.sql
      .exec<PersonalPackingRow>("SELECT * FROM personal_packing ORDER BY rowid ASC")
      .toArray()
      .map(personalPackingFromRow);
  }

  private broadcastPresence(excludeWs?: WebSocket) {
    const event: ServerEvent = { type: "presence", members: this.listMembers(excludeWs) };
    const payload = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excludeWs) continue;
      ws.send(payload);
    }
  }

  private bumpVersion() {
    this.sql.exec("UPDATE trip SET version = version + 1");
  }

  private placesEvent(): ServerEvent {
    const row = this.getTripRow();
    return { type: "places", places: this.listPlacesInternal(), version: row?.version ?? 0 };
  }

  private broadcastPlaces() {
    const payload = JSON.stringify(this.placesEvent());
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(payload);
    }
  }

  private packingEvent(): ServerEvent {
    return {
      type: "packing",
      groupPacking: this.listGroupPackingInternal(),
      personalPacking: this.listPersonalPackingInternal(),
    };
  }

  private broadcastPacking() {
    const payload = JSON.stringify(this.packingEvent());
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(payload);
    }
  }

  private broadcastTrip() {
    const row = this.getTripRow();
    const event: ServerEvent = { type: "trip", votingEnabled: row?.voting_enabled === 1 };
    const payload = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(payload);
    }
  }

  private hotelSuggestionsFromRow(row: TripRow | null): HotelSuggestion[] {
    if (!row) return [];
    try {
      return JSON.parse(row.hotel_suggestions) as HotelSuggestion[];
    } catch {
      return [];
    }
  }

  private hotelsEvent(): ServerEvent {
    return { type: "hotels", hotelSuggestions: this.hotelSuggestionsFromRow(this.getTripRow()) };
  }

  private broadcastHotels() {
    const payload = JSON.stringify(this.hotelsEvent());
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(payload);
    }
  }

  // --- RPC methods (called directly on the stub from the Worker) ---

  async createTrip(input: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    token: string;
    tripType?: TripType;
  }): Promise<void> {
    const tripType: TripType = input.tripType ?? "friends";
    // Family trips default to a top-down (no-voting) mode; friend trips default to voting on.
    const votingEnabled = tripType === "friends";
    this.sql.exec(
      `INSERT OR IGNORE INTO trip (id, title, destination, start_date, end_date, token, version, trip_type, voting_enabled)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      input.id,
      input.title,
      input.destination,
      input.startDate,
      input.endDate,
      input.token,
      tripType,
      votingEnabled ? 1 : 0,
    );
  }

  async getState(token: string): Promise<TripState | { error: string }> {
    const row = this.getTripRow();
    if (!row || row.token !== token) return { error: "not_found" };
    const trip: Trip = {
      id: row.id,
      title: row.title,
      destination: row.destination,
      startDate: row.start_date,
      endDate: row.end_date,
      version: row.version,
      tripType: row.trip_type as TripType,
      votingEnabled: row.voting_enabled === 1,
    };
    return {
      trip,
      members: this.listMembers(),
      places: this.listPlacesInternal(),
      groupPacking: this.listGroupPackingInternal(),
      personalPacking: this.listPersonalPackingInternal(),
      hotelSuggestions: this.hotelSuggestionsFromRow(row),
    };
  }

  async updateTripSettings(
    token: string,
    patch: { votingEnabled?: boolean },
  ): Promise<{ ok: true } | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    if ("votingEnabled" in patch) {
      this.sql.exec(
        "UPDATE trip SET voting_enabled = ? WHERE id = (SELECT id FROM trip LIMIT 1)",
        patch.votingEnabled ? 1 : 0,
      );
    }
    this.broadcastTrip();
    return { ok: true };
  }

  async join(
    token: string,
    memberId: string,
    name: string,
    lang: "en" | "zh" = "en",
    ageGroup: AgeGroup = "adult",
    notes = "",
  ): Promise<Member | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const existing = this.sql
      .exec<MemberRow>("SELECT * FROM members WHERE id = ?", memberId)
      .toArray()[0];
    if (existing) {
      this.sql.exec(
        "UPDATE members SET name = ?, age_group = ?, notes = ? WHERE id = ?",
        name,
        ageGroup,
        notes,
        memberId,
      );
      this.broadcastPresence();
      return {
        id: memberId,
        name,
        color: existing.color,
        emoji: existing.emoji,
        online: false,
        currentPlaceId: existing.current_place_id,
        ageGroup,
        notes,
      };
    }
    const count = this.sql.exec("SELECT COUNT(*) as n FROM members").toArray()[0] as
      | { n: number }
      | undefined;
    const avatar = pickAvatar(count?.n ?? 0);
    this.sql.exec(
      "INSERT INTO members (id, name, color, emoji, age_group, notes) VALUES (?, ?, ?, ?, ?, ?)",
      memberId,
      name,
      avatar.color,
      avatar.emoji,
      ageGroup,
      notes,
    );
    for (const itemName of PACKING_TEMPLATES[lang][ageGroup]) {
      this.sql.exec(
        "INSERT INTO personal_packing (id, member_id, name, checked) VALUES (?, ?, ?, 0)",
        nanoid(10),
        memberId,
        itemName,
      );
    }
    this.broadcastPacking();
    return { id: memberId, name, ...avatar, online: false, currentPlaceId: null, ageGroup, notes };
  }

  async setCurrentPlace(
    token: string,
    memberId: string,
    placeId: string | null,
  ): Promise<{ ok: true } | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    this.sql.exec("UPDATE members SET current_place_id = ? WHERE id = ?", placeId, memberId);
    this.broadcastPresence();
    return { ok: true };
  }

  // --- Places ---

  async createPlace(token: string, input: NewPlaceInput): Promise<Place | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const maxOrder = this.sql
      .exec("SELECT COALESCE(MAX(sort_order), -1) as n FROM places WHERE day_index = ?", input.dayIndex)
      .toArray()[0] as { n: number } | undefined;
    const sortOrder = (maxOrder?.n ?? -1) + 1;
    const id = nanoid(10);
    this.sql.exec(
      `INSERT INTO places (id, day_index, sort_order, name, lat, lng, time, est_cost, category, notes, status, votes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
      id,
      input.dayIndex,
      sortOrder,
      input.name,
      input.lat,
      input.lng,
      input.time ?? null,
      input.estCost ?? null,
      input.category ?? "📍",
      input.notes ?? "",
      input.status ?? "planned",
    );
    this.bumpVersion();
    this.broadcastPlaces();
    const row = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", id).toArray()[0];
    return placeFromRow(row);
  }

  async updatePlace(
    token: string,
    id: string,
    patch: PlacePatch,
  ): Promise<Place | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const existing = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", id).toArray()[0];
    if (!existing) return { error: "not_found" };

    const columnMap: Record<string, string> = {
      dayIndex: "day_index",
      name: "name",
      lat: "lat",
      lng: "lng",
      time: "time",
      estCost: "est_cost",
      category: "category",
      notes: "notes",
      status: "status",
    };
    const sets: string[] = [];
    const values: SqlStorageValue[] = [];
    for (const [key, column] of Object.entries(columnMap)) {
      if (key in patch) {
        sets.push(`${column} = ?`);
        values.push((patch as Record<string, SqlStorageValue>)[key]);
      }
    }
    if (sets.length > 0) {
      this.sql.exec(`UPDATE places SET ${sets.join(", ")} WHERE id = ?`, ...values, id);
    }
    this.bumpVersion();
    this.broadcastPlaces();
    const row = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", id).toArray()[0];
    return placeFromRow(row);
  }

  async deletePlace(token: string, id: string): Promise<{ ok: true } | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    this.sql.exec("DELETE FROM places WHERE id = ?", id);
    this.bumpVersion();
    this.broadcastPlaces();
    return { ok: true };
  }

  async reorderPlaces(
    token: string,
    dayIndex: number,
    orderedIds: string[],
  ): Promise<Place[] | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    orderedIds.forEach((id, index) => {
      this.sql.exec(
        "UPDATE places SET day_index = ?, sort_order = ? WHERE id = ?",
        dayIndex,
        index,
        id,
      );
    });
    this.bumpVersion();
    this.broadcastPlaces();
    return this.listPlacesInternal();
  }

  async castVote(
    token: string,
    placeId: string,
    memberId: string,
    value: 1 | -1 | 0,
  ): Promise<Place | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const row = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", placeId).toArray()[0];
    if (!row) return { error: "not_found" };
    const votes = JSON.parse(row.votes) as Record<string, 1 | -1>;
    if (value === 0) delete votes[memberId];
    else votes[memberId] = value;
    this.sql.exec("UPDATE places SET votes = ? WHERE id = ?", JSON.stringify(votes), placeId);
    this.broadcastPlaces();
    const updated = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", placeId).toArray()[0];
    return placeFromRow(updated);
  }

  // --- AI itinerary generation (OpenRouter: deepseek/deepseek-v4-flash + web plugin) ---

  private async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    return { lat: Number.parseFloat(first.lat), lng: Number.parseFloat(first.lon) };
  }

  async generateItinerary(
    token: string,
  ): Promise<{ places: Place[]; hotelSuggestions: HotelSuggestion[] } | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const row = this.getTripRow();
    if (!row) return { error: "not_found" };
    if (!row.destination.trim()) return { error: "trip has no destination set" };
    if (!this.env.OPENROUTER_API_KEY) {
      return { error: "OPENROUTER_API_KEY is not configured (wrangler secret put OPENROUTER_API_KEY)" };
    }

    const start = new Date(`${row.start_date}T00:00:00Z`);
    const end = new Date(`${row.end_date}T00:00:00Z`);
    const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const placesToRequest = Math.min(dayCount * 2, MAX_GENERATED_PLACES);

    const suggestions = await this.callOpenRouterForItinerary(
      row.destination,
      dayCount,
      placesToRequest,
      row.trip_type as TripType,
    );

    const places: Place[] = [];
    const nextSortOrder = new Map<number, number>();
    for (const suggestion of suggestions.places) {
      const geo = await this.geocode(`${suggestion.name}, ${row.destination}`);
      if (!geo) continue; // skip anything Nominatim can't confidently resolve rather than guess coordinates
      await new Promise((resolve) => setTimeout(resolve, GEOCODE_DELAY_MS));

      const dayIndex = Math.min(Math.max(0, suggestion.dayIndex), dayCount - 1);
      const sortOrder = nextSortOrder.get(dayIndex) ?? 0;
      nextSortOrder.set(dayIndex, sortOrder + 1);

      const id = nanoid(10);
      this.sql.exec(
        `INSERT INTO places (id, day_index, sort_order, name, lat, lng, est_cost, category, notes, status, votes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', '{}')`,
        id,
        dayIndex,
        sortOrder,
        suggestion.name,
        geo.lat,
        geo.lng,
        suggestion.estCost,
        suggestion.category || "📍",
        suggestion.notes ?? "",
      );
      const placeRow = this.sql.exec<PlaceRow>("SELECT * FROM places WHERE id = ?", id).toArray()[0];
      places.push(placeFromRow(placeRow));
    }

    this.sql.exec(
      "UPDATE trip SET hotel_suggestions = ? WHERE id = ?",
      JSON.stringify(suggestions.hotels),
      row.id,
    );

    if (places.length > 0) {
      this.bumpVersion();
      this.broadcastPlaces();
    }
    this.broadcastHotels();

    return { places, hotelSuggestions: suggestions.hotels };
  }

  private async callOpenRouterForItinerary(
    destination: string,
    dayCount: number,
    placesToRequest: number,
    tripType: TripType,
  ): Promise<{
    places: Array<{ name: string; dayIndex: number; category: string; notes: string; estCost: number | null }>;
    hotels: HotelSuggestion[];
  }> {
    const groupDescription = tripType === "family" ? "a family with a child" : "a group of friends";
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        plugins: [{ id: "web", engine: "parallel", max_results: 6 }],
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a travel expert who recommends real, specific, well-known points of interest and " +
              "good-value hotels for a destination. Respond with ONLY a raw JSON object — no markdown fences, no prose.",
          },
          {
            role: "user",
            content:
              `Destination: ${destination}. Trip length: ${dayCount} day(s). Travelers: ${groupDescription}. ` +
              `Recommend up to ${placesToRequest} real, specific points of interest (a mix of famous landmarks and ` +
              `interesting lesser-known spots) suited to this destination and these travelers, distributed across ` +
              `the ${dayCount} day(s) (0-indexed) in a sensible geographic/logical order, roughly grouping nearby ` +
              `sights on the same day. Also recommend up to ${MAX_GENERATED_HOTELS} specific real hotels known for ` +
              `good price/value (not luxury, not the cheapest hostel) in or near ${destination}, each with a one-line reason. ` +
              `Respond with exactly this JSON shape: ` +
              `{"places": [{"name": "<specific, searchable place name>", "dayIndex": <0-based integer>, ` +
              `"category": "<single emoji>", "notes": "<short 1-sentence description>", ` +
              `"estCost": <number or null, local currency>}], ` +
              `"hotels": [{"name": "<specific hotel name>", "area": "<neighborhood/area>", ` +
              `"priceTier": "<e.g. budget, mid-range>", "note": "<short reason it's good value>"}]}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        places?: Array<{ name?: string; dayIndex?: number; category?: string; notes?: string; estCost?: number | null }>;
        hotels?: Array<{ name?: string; area?: string; priceTier?: string; note?: string }>;
      };
      return {
        places: (parsed.places ?? [])
          .filter((p) => p.name)
          .map((p) => ({
            name: p.name!,
            dayIndex: typeof p.dayIndex === "number" ? p.dayIndex : 0,
            category: p.category ?? "📍",
            notes: p.notes ?? "",
            estCost: typeof p.estCost === "number" ? p.estCost : null,
          })),
        hotels: (parsed.hotels ?? [])
          .filter((h) => h.name)
          .map((h) => ({
            name: h.name!,
            area: h.area ?? "",
            priceTier: h.priceTier ?? "",
            note: h.note ?? "",
          })),
      };
    } catch {
      return { places: [], hotels: [] };
    }
  }

  // --- Ticket price lookup (OpenRouter: deepseek/deepseek-v4-flash + web plugin) ---

  async getTicketPrice(
    token: string,
    placeId: string,
    placeName: string,
  ): Promise<TicketPriceResult | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };

    const cached = this.sql
      .exec<TicketCacheRow>("SELECT * FROM ticket_cache WHERE place_id = ?", placeId)
      .toArray()[0];
    if (cached) {
      const ageMs = Date.now() - new Date(cached.checked_at).getTime();
      if (ageMs < TICKET_CACHE_HOURS * 3600_000) {
        return {
          price: cached.price,
          currency: cached.currency,
          sourceUrl: cached.source_url,
          note: cached.note ?? "",
          checkedAt: cached.checked_at,
          cached: true,
        };
      }
    }

    if (!this.env.OPENROUTER_API_KEY) {
      return { error: "OPENROUTER_API_KEY is not configured (wrangler secret put OPENROUTER_API_KEY)" };
    }

    const result = await this.callOpenRouterForTicketPrice(placeName);
    const checkedAt = new Date().toISOString();
    this.sql.exec(
      `INSERT INTO ticket_cache (place_id, price, currency, source_url, note, checked_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(place_id) DO UPDATE SET
         price = excluded.price, currency = excluded.currency, source_url = excluded.source_url,
         note = excluded.note, checked_at = excluded.checked_at`,
      placeId,
      result.price,
      result.currency,
      result.sourceUrl,
      result.note,
      checkedAt,
    );
    return { ...result, checkedAt, cached: false };
  }

  private async callOpenRouterForTicketPrice(
    placeName: string,
  ): Promise<Omit<TicketPriceResult, "checkedAt" | "cached">> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        // Parallel is the cheapest web-search engine on OpenRouter for
        // non-native-search models ($0.001/request vs Exa's $0.005 default).
        plugins: [{ id: "web", engine: "parallel", max_results: 3 }],
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You look up current admission/ticket prices for travel destinations. " +
              "Respond with ONLY a raw JSON object — no markdown fences, no prose before or after.",
          },
          {
            role: "user",
            content:
              `Find the current standard adult admission/ticket price for: "${placeName}". ` +
              `Respond with exactly this JSON shape: ` +
              `{"price": <number or null>, "currency": <3-letter ISO code or null>, ` +
              `"sourceUrl": <string or null>, "note": <short string, e.g. "adult standard admission" or "free entry">}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter request failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const parsed = JSON.parse(cleaned) as {
        price?: number | null;
        currency?: string | null;
        sourceUrl?: string | null;
        note?: string;
      };
      return {
        price: typeof parsed.price === "number" ? parsed.price : null,
        currency: parsed.currency ?? null,
        sourceUrl: parsed.sourceUrl ?? null,
        note: parsed.note ?? "",
      };
    } catch {
      // Model didn't return clean JSON — surface the raw text as a note
      // rather than failing the whole lookup.
      return { price: null, currency: null, sourceUrl: null, note: cleaned.slice(0, 300) };
    }
  }

  // --- Packing ---

  async addGroupItem(token: string, name: string, qty: number): Promise<GroupPackingItem | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    const id = nanoid(10);
    this.sql.exec(
      "INSERT INTO group_packing (id, name, qty, claimed_by, checked) VALUES (?, ?, ?, NULL, 0)",
      id,
      name,
      qty,
    );
    this.broadcastPacking();
    const row = this.sql.exec<GroupPackingRow>("SELECT * FROM group_packing WHERE id = ?", id).toArray()[0];
    return groupPackingFromRow(row);
  }

  async updateGroupItem(
    token: string,
    id: string,
    patch: { claimedBy?: string | null; checked?: boolean },
  ): Promise<GroupPackingItem | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    if ("claimedBy" in patch) {
      this.sql.exec("UPDATE group_packing SET claimed_by = ? WHERE id = ?", patch.claimedBy ?? null, id);
    }
    if ("checked" in patch) {
      this.sql.exec("UPDATE group_packing SET checked = ? WHERE id = ?", patch.checked ? 1 : 0, id);
    }
    this.broadcastPacking();
    const row = this.sql.exec<GroupPackingRow>("SELECT * FROM group_packing WHERE id = ?", id).toArray()[0];
    return groupPackingFromRow(row);
  }

  async deleteGroupItem(token: string, id: string): Promise<{ ok: true } | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    this.sql.exec("DELETE FROM group_packing WHERE id = ?", id);
    this.broadcastPacking();
    return { ok: true };
  }

  async togglePersonalItem(
    token: string,
    id: string,
    checked: boolean,
  ): Promise<PersonalPackingItem | { error: string }> {
    if (!this.checkToken(token)) return { error: "forbidden" };
    this.sql.exec("UPDATE personal_packing SET checked = ? WHERE id = ?", checked ? 1 : 0, id);
    this.broadcastPacking();
    const row = this.sql
      .exec<PersonalPackingRow>("SELECT * FROM personal_packing WHERE id = ?", id)
      .toArray()[0];
    return personalPackingFromRow(row);
  }

  // --- WebSocket (must go through fetch() to upgrade) ---

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const token = url.searchParams.get("k") ?? "";
    const memberId = url.searchParams.get("memberId") ?? "";
    if (!this.checkToken(token) || !memberId) {
      return new Response("forbidden", { status: 403 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ memberId } satisfies WsAttachment);
    this.ctx.acceptWebSocket(server, [memberId]);
    // Reconnect snapshot: every new/reconnecting socket gets current state
    // immediately, not just future broadcasts. Without this, a client that
    // was disconnected during a mutation (phone slept, network blip) would
    // stay stale until the *next* mutation happened to fire.
    server.send(JSON.stringify(this.placesEvent()));
    server.send(JSON.stringify(this.packingEvent()));
    const row = this.getTripRow();
    server.send(JSON.stringify({ type: "trip", votingEnabled: row?.voting_enabled === 1 } satisfies ServerEvent));
    server.send(JSON.stringify(this.hotelsEvent()));
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Mutations go through the REST routes below (which write to SQLite then
    // broadcast), not client-authored WS ops — the DO gives us single-writer
    // consistency for free, so a formal op log isn't needed at this scale.
    // This relay is a no-op today; kept as a hook for future client->server
    // messages (typing indicators, cursor presence, etc).
    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws) peer.send(message);
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastPresence(ws);
  }
}
