// One-off seed script: creates the Sydney trip in the running local Friend Trip
// dev server and inserts the curated itinerary as real places (not AI-generated).
// Free day is the trailing day (index 5) to match the app's freeDays model
// (trailing days only) — the Northern Beaches drive that was Day 5 in the
// reference doc is folded into that free day as "idea"-status suggestions.

const BASE = "https://trip-plan.hyq1031.workers.dev";
const GEOCODE_DELAY_MS = 1100; // Nominatim usage policy: max 1 req/sec

const days = [
  {
    dayIndex: 0,
    places: [
      { query: "Paddington Reservoir Gardens, Sydney, Australia", label: "Paddington Reservoir Gardens", category: "🌳", notes: "Morning coffee at Ampersand Cafe nearby, then explore the sunken gardens." },
      { query: "Hyde Park, Sydney, Australia", label: "Hyde Park & ANZAC Memorial", category: "🌳", notes: "Art Deco ANZAC War Memorial." },
      { query: "Royal Botanic Garden, Sydney, Australia", label: "Royal Botanic Garden", category: "🌿", notes: "Scenic harbour walk through to the Opera House." },
      { query: "Sydney Opera House, Australia", label: "Sydney Opera House", category: "🎭", notes: "Iconic architecture, photo stop." },
      { query: "Sea Life Sydney Aquarium, Australia", label: "Sea Life Sydney Aquarium", category: "🐟", notes: "Shark tunnels, penguins, dugongs." },
      { query: "The Rocks, Sydney, Australia", label: "The Rocks", category: "🍺", notes: "Cobblestone lanes; drink at The Hero of Waterloo, one of Sydney's oldest pubs." },
      { query: "Sydney Harbour Bridge, Australia", label: "Harbour Bridge Walk → Kirribilli", category: "🌉", notes: "Free pedestrian walk across to Kirribilli for sunset — best panoramic view of the trip." },
    ],
  },
  {
    dayIndex: 1,
    places: [
      { query: "Bondi Beach, Sydney, Australia", label: "Bondi Beach", category: "🏖", notes: "Start of the Bondi to Coogee Coastal Walk (10km)." },
      { query: "Bronte Beach, Sydney, Australia", label: "Bronte Beach", category: "🏊", notes: "Swim in the Bronte Ocean Pool along the coastal walk." },
      { query: "Clovelly Beach, Sydney, Australia", label: "Clovelly / Gordons Bay", category: "🤿", notes: "Snorkelling at Gordons Bay, coastal walk continues." },
      { query: "Coogee Beach, Sydney, Australia", label: "Coogee Beach", category: "🍗", notes: "Lunch at Chargrill Charlie's — roast chicken and salads, local favourite." },
      { query: "Newtown, Sydney, Australia", label: "Newtown", category: "🎨", notes: "Vintage shops, street art, craft beer at Young Henrys or The Grifter Brewing Co. Dinner: Bella Brutta (pizza) or Cairo Takeaway." },
    ],
  },
  {
    dayIndex: 2,
    places: [
      { query: "Manly Wharf, Sydney, Australia", label: "Manly Wharf", category: "⛴", notes: "F1 ferry from Circular Quay. Pastries at Fika Swedish Kitchen on arrival." },
      { query: "Shelly Beach, Manly, Australia", label: "Shelly Beach", category: "🤿", notes: "Manly Beach → Shelly Beach loop, good snorkelling. (Or the longer Spit to Manly Walk, 10km, for harbour beaches + Aboriginal rock art.)" },
      { query: "Manly Beach, Sydney, Australia", label: "Manly Beach", category: "🐧", notes: "Watch for the little penguin colony near the wharf around sunset. Dinner at Hemingway's Manly." },
    ],
  },
  {
    dayIndex: 3,
    places: [
      { query: "Katoomba railway station, Australia", label: "Katoomba", category: "🚆", notes: "Blue Mountains Line from Central, ~2hr." },
      { query: "Echo Point Lookout, Katoomba, Australia", label: "Echo Point — Three Sisters", category: "🏔", notes: "Iconic Three Sisters rock formation." },
      { query: "Scenic World, Katoomba, Australia", label: "Scenic World", category: "🚡", notes: "Steepest passenger railway in the world; Prince Henry Cliff Walk nearby." },
    ],
  },
  {
    dayIndex: 4,
    places: [
      { query: "Taronga Zoo, Sydney, Australia", label: "Taronga Zoo", category: "🦁", notes: "Ferry from Circular Quay. Koalas, kangaroos, platypuses, Opera House/Bridge backdrop." },
      { query: "Watsons Bay, Sydney, Australia", label: "Watsons Bay", category: "🦞", notes: "Seafood lunch at Doyle's on the Beach." },
      { query: "Hornby Lighthouse, Watsons Bay, Australia", label: "Hornby Lighthouse", category: "💡", notes: "4km return walk, candy-striped lighthouse." },
      { query: "Cockatoo Island, Sydney, Australia", label: "Cockatoo Island", category: "🏚", notes: "World Heritage convict precinct and old shipyards. Farewell dinner at Circular Quay or Barangaroo." },
    ],
  },
  {
    dayIndex: 5,
    places: [
      // Free day — trailing day, matches the app's freeDays model. These four are
      // the optional Northern-Beaches-by-rental-car plan, added as low-commitment
      // "idea" status rather than a fixed plan.
      { query: "Balmoral Beach, Sydney, Australia", label: "Balmoral Beach", category: "🥐", notes: "Optional: breakfast at The Boathouse Balmoral. The one day worth renting a car for.", status: "idea" },
      { query: "Avalon Beach, Sydney, Australia", label: "Avalon Beach", category: "🚗", notes: "Optional: drive north via Avalon and Whale Beach.", status: "idea" },
      { query: "Palm Beach, Sydney, Australia", label: "Palm Beach", category: "🚗", notes: "Optional: continue north to Palm Beach.", status: "idea" },
      { query: "Barrenjoey Lighthouse, Palm Beach, Australia", label: "Barrenjoey Lighthouse", category: "💡", notes: "Optional: 3km return walk, Pittwater estuary views. Drop the car in the CBD that evening.", status: "idea" },
    ],
  },
];

async function geocode(query) {
  const res = await fetch(`${BASE}/api/geocode?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  return body.results?.[0] ?? null;
}

async function main() {
  const createRes = await fetch(`${BASE}/api/trips`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Sydney Trip",
      destination: "Sydney, Australia",
      startDate: "2026-08-06",
      endDate: "2026-08-11",
      tripType: "friends",
      freeDays: 1,
      password: process.env.TRIP_CREATE_PASSWORD ?? "123456",
    }),
  });
  if (!createRes.ok) throw new Error(`createTrip failed: ${createRes.status} ${await createRes.text()}`);
  const { tripId, token } = await createRes.json();
  console.log(`Created trip ${tripId}`);

  let sortOrder;
  for (const day of days) {
    sortOrder = 0;
    for (const place of day.places) {
      const geo = await geocode(place.query);
      await new Promise((r) => setTimeout(r, GEOCODE_DELAY_MS));
      if (!geo) {
        console.warn(`  ! geocode failed for "${place.query}", skipping`);
        continue;
      }
      const res = await fetch(`${BASE}/api/trip/${tripId}/places?k=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dayIndex: day.dayIndex,
          sortOrder,
          name: place.label,
          lat: geo.lat,
          lng: geo.lng,
          category: place.category,
          notes: place.notes,
          status: place.status ?? "planned",
        }),
      });
      if (!res.ok) {
        console.warn(`  ! createPlace failed for "${place.label}": ${res.status} ${await res.text()}`);
      } else {
        console.log(`  Day ${day.dayIndex}: ${place.category} ${place.label}`);
      }
      sortOrder += 1;
    }
  }

  console.log("\nDone.");
  console.log(`Magic link: ${BASE}/t/${tripId}?k=${token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
