import type {
  AgeGroup,
  GroupPackingItem,
  HotelSuggestion,
  Member,
  NewPlaceInput,
  PersonalPackingItem,
  Place,
  PlacePatch,
  TicketPriceResult,
  TripState,
  TripType,
} from "../../shared/types";

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `request failed (${res.status})`);
  return body;
}

export async function createTrip(input: {
  title: string;
  destination?: string;
  startDate: string;
  endDate: string;
  tripType?: TripType;
}): Promise<{ tripId: string; token: string }> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

/**
 * Triggers AI-generated place + hotel suggestions for the trip's destination
 * (OpenRouter deepseek-v4-flash + web search, geocoded via Nominatim). Takes
 * ~10-20s since each suggested place is geocoded sequentially. Best-effort —
 * callers should let trip creation proceed even if this fails or times out.
 */
export async function generateItinerary(
  tripId: string,
  token: string,
): Promise<{ places: Place[]; hotelSuggestions: HotelSuggestion[] }> {
  const res = await fetch(`/api/trip/${tripId}/generate?k=${encodeURIComponent(token)}`, {
    method: "POST",
  });
  return parseJson(res);
}

export async function fetchTripState(tripId: string, token: string): Promise<TripState> {
  const res = await fetch(`/api/trip/${tripId}/state?k=${encodeURIComponent(token)}`);
  return parseJson(res);
}

export async function joinTrip(
  tripId: string,
  token: string,
  memberId: string,
  name: string,
  lang: "en" | "zh" = "en",
  ageGroup: AgeGroup = "adult",
  notes = "",
): Promise<Member> {
  const res = await fetch(`/api/trip/${tripId}/join?k=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ memberId, name, lang, ageGroup, notes }),
  });
  return parseJson(res);
}

export async function updateTripSettings(
  tripId: string,
  token: string,
  patch: { votingEnabled?: boolean },
): Promise<void> {
  const res = await fetch(`/api/trip/${tripId}/settings?k=${encodeURIComponent(token)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  await parseJson(res);
}

export function tripSocketUrl(tripId: string, token: string, memberId: string): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/api/trip/${tripId}/ws?k=${encodeURIComponent(token)}&memberId=${encodeURIComponent(memberId)}`;
}

export async function createPlace(
  tripId: string,
  token: string,
  input: NewPlaceInput,
): Promise<Place> {
  const res = await fetch(`/api/trip/${tripId}/places?k=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function updatePlace(
  tripId: string,
  token: string,
  placeId: string,
  patch: PlacePatch,
): Promise<Place> {
  const res = await fetch(
    `/api/trip/${tripId}/places/${placeId}?k=${encodeURIComponent(token)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return parseJson(res);
}

export async function deletePlace(tripId: string, token: string, placeId: string): Promise<void> {
  const res = await fetch(
    `/api/trip/${tripId}/places/${placeId}?k=${encodeURIComponent(token)}`,
    { method: "DELETE" },
  );
  await parseJson(res);
}

export async function reorderPlaces(
  tripId: string,
  token: string,
  dayIndex: number,
  orderedIds: string[],
): Promise<Place[]> {
  const res = await fetch(
    `/api/trip/${tripId}/places/reorder?k=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dayIndex, orderedIds }),
    },
  );
  return parseJson(res);
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const body = await parseJson<{ results: GeocodeResult[] }>(res);
  return body.results;
}

export async function castVote(
  tripId: string,
  token: string,
  placeId: string,
  memberId: string,
  value: 1 | -1 | 0,
): Promise<Place> {
  const res = await fetch(
    `/api/trip/${tripId}/places/${placeId}/vote?k=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ memberId, value }),
    },
  );
  return parseJson(res);
}

export async function addGroupItem(
  tripId: string,
  token: string,
  name: string,
  qty = 1,
): Promise<GroupPackingItem> {
  const res = await fetch(`/api/trip/${tripId}/packing/group?k=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, qty }),
  });
  return parseJson(res);
}

export async function updateGroupItem(
  tripId: string,
  token: string,
  itemId: string,
  patch: { claimedBy?: string | null; checked?: boolean },
): Promise<GroupPackingItem> {
  const res = await fetch(
    `/api/trip/${tripId}/packing/group/${itemId}?k=${encodeURIComponent(token)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return parseJson(res);
}

export async function deleteGroupItem(tripId: string, token: string, itemId: string): Promise<void> {
  const res = await fetch(
    `/api/trip/${tripId}/packing/group/${itemId}?k=${encodeURIComponent(token)}`,
    { method: "DELETE" },
  );
  await parseJson(res);
}

export async function togglePersonalItem(
  tripId: string,
  token: string,
  itemId: string,
  checked: boolean,
): Promise<PersonalPackingItem> {
  const res = await fetch(
    `/api/trip/${tripId}/packing/personal/${itemId}?k=${encodeURIComponent(token)}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checked }),
    },
  );
  return parseJson(res);
}

export interface WeatherResult {
  tempMaxC: number;
  tempMinC: number;
  weatherCode: number;
}

export async function fetchWeather(lat: number, lng: number, date: string): Promise<WeatherResult | null> {
  const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}&date=${date}`);
  if (!res.ok) return null;
  return res.json();
}

export async function lookupTicketPrice(
  tripId: string,
  token: string,
  placeId: string,
  name: string,
): Promise<TicketPriceResult> {
  const res = await fetch(
    `/api/trip/${tripId}/places/${placeId}/lookup-price?k=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return parseJson(res);
}

/**
 * Deep-link to Google Hotels search, prefilled with the place name. No API
 * key, no cost. Google Travel's `checkin`/`checkout` URL params are
 * undocumented and were verified (via browser test) to be silently ignored —
 * rather than imply dates carried through when they don't, we put the trip
 * dates in the free-text query instead (interpreted by Google's own date
 * parser) and leave exact date selection to the user in Google's UI.
 */
export function hotelSearchUrl(placeName: string, startDate: string, endDate: string): string {
  const params = new URLSearchParams({
    q: `hotels near ${placeName} ${startDate} to ${endDate}`,
  });
  return `https://www.google.com/travel/search?${params.toString()}`;
}

export async function setCurrentPlace(
  tripId: string,
  token: string,
  memberId: string,
  placeId: string | null,
): Promise<void> {
  const res = await fetch(`/api/trip/${tripId}/current-place?k=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ memberId, placeId }),
  });
  await parseJson(res);
}
