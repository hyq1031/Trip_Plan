// One-off seed script: creates the Melbourne trip in a running Friend Trip
// instance and inserts the curated itinerary as real places (not AI-generated).
// No free day — Days 3 and 4 each had a source alternative (Great Ocean Road /
// Puffing Billy + kangaroos) that isn't seeded here since it wasn't the
// committed plan, just a documented swap-in option.

const BASE = "https://trip-plan.hyq1031.workers.dev";
const GEOCODE_DELAY_MS = 1100; // Nominatim usage policy: max 1 req/sec

const days = [
  {
    dayIndex: 0,
    places: [
      { query: "South Melbourne Market, Australia", label: "South Melbourne Market", category: "🛍", notes: "Route 96 tram from the CBD. Closed Mon/Tue/Thu — this is the day it's open. Breakfast pastries at Agathé Pâtisserie." },
      { query: "National Gallery of Victoria, Melbourne, Australia", label: "NGV International", category: "🎨", notes: "Water wall entrance, stained-glass ceiling, permanent collection free." },
      { query: "St Kilda Beach, Melbourne, Australia", label: "St Kilda Beach & Esplanade", category: "🏖", notes: "Palm-lined Esplanade, Acland Street cake shops, Luna Park gate photo stop." },
      { query: "St Kilda Pier, Melbourne, Australia", label: "St Kilda Pier Breakwater", category: "🐧", notes: "Dusk viewing of the wild little penguin colony — free. Dinner at Hotel Esplanade (The Espy)." },
    ],
  },
  {
    dayIndex: 1,
    places: [
      { query: "Degraves Street, Melbourne VIC 3000, Australia", label: "Degraves Street", category: "☕", notes: "Coffee, then wander Hosier Lane and AC/DC Lane graffiti." },
      { query: "State Library Victoria, Australia", label: "State Library Victoria", category: "📚", notes: "The domed La Trobe Reading Room." },
      { query: "Lygon Street, Carlton, Australia", label: "Lygon Street", category: "🍝", notes: "Free tram north from the CBD. Italian at Brunetti Classico." },
      { query: "Melbourne Museum, Australia", label: "Melbourne Museum", category: "🏛", notes: "Bunjilaka Aboriginal Cultural Centre, Forest Gallery, UNESCO-listed Royal Exhibition Building right outside." },
      { query: "Eureka Tower Skydeck, Melbourne, Australia", label: "Melbourne Skydeck", category: "🌆", notes: "Southbank Promenade along the Yarra first, then sunset 360° views from the Eureka Tower." },
    ],
  },
  {
    dayIndex: 2,
    places: [
      { query: "ACMI Federation Square, Melbourne, Australia", label: "ACMI", category: "🎮", notes: "Interactive film/TV/video game galleries; the centrepiece exhibition is free." },
      { query: "Immigration Museum, Melbourne, Australia", label: "Immigration Museum", category: "🛂", notes: "Stories of the people who shaped modern Melbourne." },
      { query: "Old Melbourne Gaol, Australia", label: "Old Melbourne Gaol", category: "⛓", notes: "The cell Ned Kelly was held in." },
      { query: "Section 8 Melbourne, Australia", label: "Section 8", category: "🍹", notes: "Shipping-container bar. (Or Eau De Vie, hidden behind a bookcase.)" },
    ],
  },
  {
    dayIndex: 3,
    places: [
      { query: "Fitzroy Gardens, Melbourne, Australia", label: "Fitzroy Gardens", category: "🌳", notes: "Cook's Cottage and the Conservatory." },
      { query: "Melbourne Cricket Ground, Australia", label: "MCG & Australian Sports Museum", category: "🏟", notes: "MCG tour, plus the Australian Sports Museum inside the ground." },
      { query: "Brunswick Street, Fitzroy, Australia", label: "Brunswick Street, Fitzroy", category: "🎨", notes: "Bookshops, vintage stores, street art." },
      { query: "Chin Chin Melbourne, Australia", label: "Chin Chin", category: "🍜", notes: "Farewell dinner, Flinders Lane." },
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
      title: "Melbourne Trip",
      destination: "Melbourne, Australia",
      startDate: "2026-08-12",
      endDate: "2026-08-15",
      tripType: "friends",
      freeDays: 0,
    }),
  });
  if (!createRes.ok) throw new Error(`createTrip failed: ${createRes.status} ${await createRes.text()}`);
  const { tripId, token } = await createRes.json();
  console.log(`Created trip ${tripId}`);

  for (const day of days) {
    let sortOrder = 0;
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
          status: "planned",
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
