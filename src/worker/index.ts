import { Hono } from "hono";
import { nanoid } from "nanoid";
import { TripRoom } from "./tripRoom";
import type { Env } from "./env";
import type { AgeGroup, NewPlaceInput, PlacePatch, TripType } from "../shared/types";

export { TripRoom };

const app = new Hono<{ Bindings: Env }>();

function stubFor(env: Env, tripId: string) {
  const id = env.TRIP_ROOM.idFromName(tripId);
  return env.TRIP_ROOM.get(id);
}

function errStatus(error: string): 400 | 403 | 404 {
  if (error === "forbidden") return 403;
  if (error === "not_found") return 404;
  return 400;
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/trips", async (c) => {
  const body = await c.req.json<{
    title: string;
    startDate: string;
    endDate: string;
    tripType?: TripType;
  }>();
  if (!body.title || !body.startDate || !body.endDate) {
    return c.json({ error: "title, startDate, endDate are required" }, 400);
  }
  const tripId = nanoid(8);
  const token = nanoid(21);
  const stub = stubFor(c.env, tripId);
  await stub.createTrip({
    id: tripId,
    title: body.title,
    startDate: body.startDate,
    endDate: body.endDate,
    token,
    tripType: body.tripType,
  });
  return c.json({ tripId, token });
});

app.get("/api/trip/:id/state", async (c) => {
  const token = c.req.query("k") ?? "";
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.getState(token);
  if ("error" in result) return c.json(result, 404);
  return c.json(result);
});

app.post("/api/trip/:id/join", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{
    memberId: string;
    name: string;
    lang?: "en" | "zh";
    ageGroup?: AgeGroup;
    notes?: string;
  }>();
  if (!body.memberId || !body.name) {
    return c.json({ error: "memberId and name are required" }, 400);
  }
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.join(
    token,
    body.memberId,
    body.name,
    body.lang ?? "en",
    body.ageGroup ?? "adult",
    body.notes ?? "",
  );
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.patch("/api/trip/:id/settings", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ votingEnabled?: boolean }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.updateTripSettings(token, body);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.get("/api/trip/:id/ws", async (c) => {
  const stub = stubFor(c.env, c.req.param("id"));
  return stub.fetch(c.req.raw);
});

app.post("/api/trip/:id/current-place", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ memberId: string; placeId: string | null }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.setCurrentPlace(token, body.memberId, body.placeId);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.post("/api/trip/:id/places", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<NewPlaceInput>();
  if (!body.name || typeof body.lat !== "number" || typeof body.lng !== "number") {
    return c.json({ error: "name, lat, lng are required" }, 400);
  }
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.createPlace(token, body);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.patch("/api/trip/:id/places/:placeId", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<PlacePatch>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.updatePlace(token, c.req.param("placeId"), body);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.delete("/api/trip/:id/places/:placeId", async (c) => {
  const token = c.req.query("k") ?? "";
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.deletePlace(token, c.req.param("placeId"));
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.post("/api/trip/:id/places/reorder", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ dayIndex: number; orderedIds: string[] }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.reorderPlaces(token, body.dayIndex, body.orderedIds);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.post("/api/trip/:id/places/:placeId/vote", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ memberId: string; value: 1 | -1 | 0 }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.castVote(token, c.req.param("placeId"), body.memberId, body.value);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.post("/api/trip/:id/places/:placeId/lookup-price", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ name: string }>();
  if (!body.name) return c.json({ error: "name is required" }, 400);
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.getTicketPrice(token, c.req.param("placeId"), body.name);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.post("/api/trip/:id/packing/group", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ name: string; qty?: number }>();
  if (!body.name) return c.json({ error: "name is required" }, 400);
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.addGroupItem(token, body.name, body.qty ?? 1);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.patch("/api/trip/:id/packing/group/:itemId", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ claimedBy?: string | null; checked?: boolean }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.updateGroupItem(token, c.req.param("itemId"), body);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.delete("/api/trip/:id/packing/group/:itemId", async (c) => {
  const token = c.req.query("k") ?? "";
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.deleteGroupItem(token, c.req.param("itemId"));
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

app.patch("/api/trip/:id/packing/personal/:itemId", async (c) => {
  const token = c.req.query("k") ?? "";
  const body = await c.req.json<{ checked: boolean }>();
  const stub = stubFor(c.env, c.req.param("id"));
  const result = await stub.togglePersonalItem(token, c.req.param("itemId"), body.checked);
  if ("error" in result) return c.json(result, errStatus(result.error));
  return c.json(result);
});

interface OpenMeteoDaily {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
}

app.get("/api/weather", async (c) => {
  const lat = c.req.query("lat");
  const lng = c.req.query("lng");
  const date = c.req.query("date");
  if (!lat || !lng || !date) return c.json({ error: "lat, lng, date are required" }, 400);

  const cache = caches.default;
  const cacheKey = new Request(
    `https://friend-trip.internal/weather?lat=${lat}&lng=${lng}&date=${date}`,
  );
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto` +
    `&start_date=${date}&end_date=${date}`;
  const res = await fetch(url);
  if (!res.ok) return c.json({ error: "forecast unavailable" }, 502);
  const data = (await res.json()) as { daily?: OpenMeteoDaily };
  if (!data.daily || data.daily.time.length === 0) {
    return c.json({ error: "no forecast for this date" }, 404);
  }
  const result = {
    tempMaxC: data.daily.temperature_2m_max[0],
    tempMinC: data.daily.temperature_2m_min[0],
    weatherCode: data.daily.weather_code[0],
  };

  const response = c.json(result);
  const toCache = response.clone();
  toCache.headers.set("Cache-Control", "public, max-age=21600");
  c.executionCtx.waitUntil(cache.put(cacheKey, toCache));
  return response;
});

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

app.get("/api/geocode", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return c.json({ results: [] });

  const cache = caches.default;
  const cacheKey = new Request(`https://friend-trip.internal/geocode?q=${encodeURIComponent(q)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FriendTrip/1.0 (friend-trip planner; contact: n/a)" },
  });
  if (!res.ok) return c.json({ results: [] }, 502);
  const data = (await res.json()) as NominatimResult[];
  const results = data.map((r) => ({
    name: r.display_name,
    lat: Number.parseFloat(r.lat),
    lng: Number.parseFloat(r.lon),
  }));

  const response = c.json({ results });
  const toCache = response.clone();
  toCache.headers.set("Cache-Control", "public, max-age=86400");
  c.executionCtx.waitUntil(cache.put(cacheKey, toCache));
  return response;
});

export default app;
