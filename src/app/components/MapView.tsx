import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { Place } from "../../shared/types";
import { numberedIcon } from "../lib/mapIcons";

const DAY_COLOR = "#c65d3b";

function FitToPlaces({ places }: { places: Place[] }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 0) return;
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 14);
      return;
    }
    const bounds = places.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.map((p) => p.id).join(",")]);
  return null;
}

function PanToSelected({ place }: { place: Place | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.panTo([place.lat, place.lng]);
  }, [map, place]);
  return null;
}

export default function MapView({
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  places: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
}) {
  const selected = places.find((p) => p.id === selectedPlaceId);
  const polyline = places.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPlaces places={places} />
      <PanToSelected place={selected} />
      {polyline.length > 1 && (
        <Polyline
          positions={polyline}
          pathOptions={{ color: DAY_COLOR, weight: 2, dashArray: "6 8", opacity: 0.8 }}
        />
      )}
      {places.map((place, index) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={numberedIcon(index, DAY_COLOR, place.id === selectedPlaceId)}
          eventHandlers={{ click: () => onSelectPlace(place.id) }}
        />
      ))}
    </MapContainer>
  );
}
