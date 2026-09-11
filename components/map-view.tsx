"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

type Place = {
  id: string;
  slug: string;
  name: string;
  categoryAccent: string;
  latitude: number | null;
  longitude: number | null;
};

function MapFocus({
  places,
  selected,
  route,
  userLocation,
}: {
  places: Place[];
  selected?: Place;
  route: [number, number][];
  userLocation: [number, number] | null;
}) {
  const map = useMap();
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    if (map.attributionControl) {
      map.attributionControl.setPrefix(false);
    }
  }, [map]);

  useEffect(() => {
    if (initialFitDoneRef.current) return;
    if (selected && selected.latitude != null && selected.longitude != null) {
      map.setView([selected.latitude, selected.longitude], 17);
      initialFitDoneRef.current = true;
    } else if (places.length === 1 && places[0].latitude != null && places[0].longitude != null) {
      map.setView([places[0].latitude, places[0].longitude], 17);
      initialFitDoneRef.current = true;
    } else if (places.length > 1) {
      map.fitBounds(
        places.map((place) => [place.latitude!, place.longitude!] as [number, number]),
        { padding: [35, 35] }
      );
      initialFitDoneRef.current = true;
    }
  }, [map, places, selected]);

  useEffect(() => {
    if (selected?.latitude != null && selected.longitude != null) {
      map.flyTo([selected.latitude, selected.longitude], 18, { duration: 0.45 });
    }
  }, [map, selected]);

  useEffect(() => {
    if (userLocation && route.length < 2) {
      map.flyTo(userLocation, 18, { duration: 0.45 });
    }
  }, [map, route.length, userLocation]);

  useEffect(() => {
    if (route.length > 1) {
      map.fitBounds(route, { padding: [45, 45] });
    }
  }, [map, route]);

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
  const html = `<span class="map-marker is-active" style="--marker:${place.categoryAccent}">${initials}</span>`;
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    iconAnchor: [22, 38],
    html,
  });
}

export default function MapView({
  places,
  selectedSlug,
  onSelect,
  route,
  userLocation,
  isSatellite = false,
  isDarkMode = true,
}: {
  places: Place[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  route: [number, number][];
  userLocation: [number, number] | null;
  isSatellite?: boolean;
  isDarkMode?: boolean;
}) {
  const mappedPlaces = useMemo(
    () => places.filter((place) => place.latitude !== null && place.longitude !== null),
    [places]
  );
  const selected = mappedPlaces.find((place) => place.slug === selectedSlug);

  const center: [number, number] = selected && selected.latitude != null && selected.longitude != null
    ? [selected.latitude, selected.longitude]
    : mappedPlaces[0]
    ? [mappedPlaces[0].latitude!, mappedPlaces[0].longitude!]
    : [8.900, 11.315];

  const maptilerApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "hR8LymFQepr7bFVS845V";

  let tileUrl = `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`;
  if (isSatellite) {
    tileUrl = `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${maptilerApiKey}`;
  } else if (isDarkMode) {
    tileUrl = `https://api.maptiler.com/maps/streets-v2-dark/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`;
  }

  const routeColor = isDarkMode ? "#38bdf8" : "#0284c7";

  return (
    <div className="osm-map-wrap">
      <MapContainer className="leaflet-map" center={center} zoom={17} scrollWheelZoom zoomControl>
        <TileLayer
          attribution='<a href="https://www.maptiler.com/" target="_blank">&copy; MapTiler</a>'
          url={tileUrl}
          maxZoom={20}
        />
        <MapFocus places={mappedPlaces} selected={selected} route={route} userLocation={userLocation} />
        {/* Only show the pin for the currently selected location */}
        {selected && selected.latitude != null && selected.longitude != null ? (
          <Marker
            key={selected.id}
            position={[selected.latitude, selected.longitude]}
            icon={markerIcon(selected, true)}
          />
        ) : null}
        {route.length > 1 ? <Polyline positions={route} pathOptions={{ color: routeColor, weight: 6, opacity: 0.95 }} /> : null}
        {userLocation ? (
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#f59e0b", fillOpacity: 1 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
