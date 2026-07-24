import L from "leaflet";

/**
 * Numbered "map-book plate" pin — matches the editorial design direction
 * (thin ring, serif-adjacent numeral) instead of Leaflet's default marker.
 */
export function numberedIcon(index: number, color: string, selected: boolean): L.DivIcon {
  const size = selected ? 30 : 26;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:#faf6ef;
      display:flex;align-items:center;justify-content:center;
      font-size:${selected ? 14 : 12}px;font-weight:600;
      border:2px solid #faf6ef;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    ">${index + 1}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
