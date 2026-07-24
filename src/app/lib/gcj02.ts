/**
 * WGS84 -> GCJ-02 ("Mars coordinates") conversion. Chinese map providers
 * (AutoNavi/高德, Baidu) require GCJ-02, not raw WGS84 — our place
 * coordinates come from Nominatim/OSM in WGS84, so a direct pass-through
 * would be offset by 100-700m inside mainland China. This is the standard
 * public algorithm (widely published as open source, e.g. eviltransform /
 * coordtransform) — not a proprietary or reverse-engineered secret.
 */

const A = 6378245.0;
const EE = 0.00669342162296594323;

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

/**
 * Rough bounding box used to skip the correction outside mainland China.
 * The commonly-used rectangle (lat 0.8-55.8, lng 72-137.8) overlaps Japan and
 * Korea's longitude range at China's easternmost edge — verified via browser
 * test (Osaka incorrectly triggered this). A true border-accurate check needs
 * real polygon/GeoJSON data, which is out of scope here; instead we carve out
 * Japan's main islands and the Korean peninsula explicitly, since those are
 * the most likely false positives for this app's Asia-Pacific trip use case.
 */
export function isLikelyInChina(lat: number, lng: number): boolean {
  const inRoughBox = lat > 0.8293 && lat < 55.8271 && lng > 72.004 && lng < 137.8347;
  if (!inRoughBox) return false;
  const inJapan = lat > 24 && lat < 46 && lng > 128 && lng < 146;
  const inKorea = lat > 33 && lat < 43 && lng > 124 && lng < 131;
  return !inJapan && !inKorea;
}

export function wgs84ToGcj02(lat: number, lng: number): { lat: number; lng: number } {
  if (!isLikelyInChina(lat, lng)) return { lat, lng };
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const correctedDLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI);
  const correctedDLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lat: lat + correctedDLat, lng: lng + correctedDLng };
}
