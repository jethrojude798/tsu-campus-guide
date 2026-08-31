"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

type Place = { id: string; slug: string; name: string; categoryAccent: string; latitude: number | null; longitude: number | null };

function MapFocus({ places, selected, route, userLocation }: { places: Place[]; selected?: Place; route: [number, number][]; userLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (places.length === 1) map.setView([places[0].latitude!, places[0].longitude!], 17);
    if (places.length > 1) map.fitBounds(places.map((place) => [place.latitude!, place.longitude!] as [number, number]), { padding: [35, 35] });
  }, [map, places]);
  useEffect(() => { if (selected?.latitude != null && selected.longitude != null) map.flyTo([selected.latitude, selected.longitude], 18, { duration: 0.45 }); }, [map, selected]);
  useEffect(() => { if (userLocation && route.length < 2) map.flyTo(userLocation, 18, { duration: 0.45 }); }, [map, route.length, userLocation]);
  useEffect(() => { if (route.length > 1) map.fitBounds(route, { padding: [45, 45] }); }, [map, route]);
  return null;
}

function markerIcon(place: Place, active: boolean) {
  const initials = place.name
    .split(" ")
    .filter((part) => !["of", "the", "and"].includes(part.toLowerCase()))
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const html = '<span class="map-marker ' + (active ? 'is-active' : '') + '" style="--marker:' + place.categoryAccent + '">' + initials + '</span>';
  return L.divIcon({ className: "", iconSize: active ? [44, 44] : [34, 34], iconAnchor: active ? [22, 38] : [17, 30], html });
}

export default function MapView({ places, selectedSlug, onSelect, route, userLocation }: { places: Place[]; selectedSlug: string; onSelect: (slug: string) => void; route: [number, number][]; userLocation: [number, number] | null }) {
  const mappedPlaces = places.filter((place) => place.latitude !== null && place.longitude !== null);
  const selected = mappedPlaces.find((place) => place.slug === selectedSlug);
  const markers = useMemo(() => mappedPlaces.map((place) => ({ ...place, icon: markerIcon(place, place.slug === selectedSlug) })), [mappedPlaces, selectedSlug]);
  const center: [number, number] = selected ? [selected.latitude!, selected.longitude!] : mappedPlaces[0] ? [mappedPlaces[0].latitude!, mappedPlaces[0].longitude!] : [0, 0];
  return <div className="osm-map-wrap">
    <MapContainer className="leaflet-map" center={center} zoom={mappedPlaces.length ? 16 : 2} scrollWheelZoom zoomControl>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapFocus places={mappedPlaces} selected={selected} route={route} userLocation={userLocation} />
      {markers.map((place) => <Marker key={place.id} position={[place.latitude!, place.longitude!]} icon={place.icon} eventHandlers={{ click: () => onSelect(place.slug) }} />)}
      {route.length > 1 ? <Polyline positions={route} pathOptions={{ color: "#168f83", weight: 6, opacity: 0.9 }} /> : null}
      {userLocation ? <CircleMarker center={userLocation} radius={8} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#f2a93b", fillOpacity: 1 }} /> : null}
    </MapContainer>
  </div>;
}
