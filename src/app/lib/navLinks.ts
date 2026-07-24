import { isLikelyInChina, wgs84ToGcj02 } from "./gcj02";

export interface NavLink {
  label: string;
  emoji: string;
  url: string;
}

/**
 * Phone-nav deep-links for a place, no API key needed (all official free
 * URI schemes). Coordinates are WGS84 (from Nominatim/OSM) except the AMap
 * link, which needs the GCJ-02 correction applied first.
 */
export function buildNavLinks(lat: number, lng: number, name: string): NavLink[] {
  const encodedName = encodeURIComponent(name);
  const links: NavLink[] = [
    { label: "Apple Maps", emoji: "🍎", url: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}` },
    {
      label: "Android",
      emoji: "🤖",
      url: `geo:${lat},${lng}?q=${lat},${lng}(${encodedName})`,
    },
    {
      label: "Google Maps",
      emoji: "🗺️",
      url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    },
  ];

  if (isLikelyInChina(lat, lng)) {
    const gcj = wgs84ToGcj02(lat, lng);
    links.push({
      label: "高德地图",
      emoji: "🧭",
      url: `https://uri.amap.com/marker?position=${gcj.lng},${gcj.lat}&name=${encodedName}`,
    });
  }

  return links;
}
