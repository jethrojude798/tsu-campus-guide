"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; slug: string; accent: string };
type Place = { id: string; slug: string; name: string; shortDescription: string; longDescription: string; categoryName: string; categorySlug: string; categoryAccent: string; isFeatured: boolean; isPlaceholder: boolean; mapX: number; mapY: number; latitude: number | null; longitude: number | null; openingHours: string | null; accessibilityNotes: string | null; routeHint: string | null; contactNote: string | null; tags: string[] };
type GuideStep = { id: string; title: string; description: string; icon: string; isPlaceholder: boolean };
type CampusData = { categories: Category[]; places: Place[]; guideSteps: GuideStep[]; stats: { placeCount: number; categoryCount: number; guideStepCount: number; placeholderShare: number } };
type RouteSummary = { minutes: number; distanceKm: string };

const MapView = dynamic(() => import("./map-view"), { ssr: false, loading: () => <div className="map-loading">Loading campus map...</div> });

export function CampusExplorer({ data }: { data: CampusData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState(data.places.find((place) => place.isFeatured)?.slug ?? data.places[0]?.slug ?? "");
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredPlaces = useMemo(() => data.places.filter((place) => {
    const matchesCategory = category === "all" || place.categorySlug === category;
    const searchable = [place.name, place.categoryName, place.shortDescription, place.tags.join(" ")].join(" ").toLowerCase();
    return matchesCategory && (!deferredQuery || searchable.includes(deferredQuery));
  }), [category, data.places, deferredQuery]);
  const places = filteredPlaces.length ? filteredPlaces : data.places;
  const selected = places.find((place) => place.slug === selectedSlug) ?? places[0];

  useEffect(() => {
    if (!isLiveLocation || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => setRouteMessage("Live location is unavailable. Check your browser location permission."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isLiveLocation]);

  function showLiveLocation() {
    if (!navigator.geolocation) {
      setRouteMessage("Location services are not available in this browser.");
      return;
    }
    setRouteMessage(null);
    setIsLiveLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => setRouteMessage("Allow location access in your browser to see your live position."),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  async function requestWalkingRoute() {
    if (!selected) return;
    setRouteMessage(null);
    setRouteSummary(null);
    setRouteGeometry([]);
    if (selected.latitude == null || selected.longitude == null) {
      setRouteMessage("This demo destination needs verified coordinates before walking directions can be calculated.");
      return;
    }
    if (!navigator.geolocation) {
      setRouteMessage("Location services are not available in this browser.");
      return;
    }
    setIsRouting(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        const start = `${position.coords.longitude},${position.coords.latitude}`;
        const end = `${selected.longitude},${selected.latitude}`;
        const response = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start};${end}?overview=full&geometries=geojson`);
        if (!response.ok) throw new Error("Routing service unavailable");
        const result = await response.json() as { routes?: Array<{ distance: number; duration: number; geometry?: { coordinates: Array<[number, number]> } }> };
        const route = result.routes?.[0];
        if (!route) throw new Error("No walking route found");
        setRouteGeometry(route.geometry?.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]) ?? []);
        setRouteSummary({ minutes: Math.max(1, Math.round(route.duration / 60)), distanceKm: (route.distance / 1000).toFixed(2) });
      } catch {
        setRouteMessage("We could not calculate a walking route right now. Please try again.");
      } finally {
        setIsRouting(false);
      }
    }, () => {
      setRouteMessage("Location permission was not granted. Allow location access to get walking directions.");
      setIsRouting(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }

  return <div id="explore" className="trail-app">
    <section className="map-stage" aria-label="Campus trail map">
      <div className="map-brand"><span className="brand-mark">TS</span><div><strong>Campus trail</strong><span>Taraba State University</span></div></div>
      <div className="map-search"><label htmlFor="place-search" className="sr-only">Search for a building</label><span aria-hidden="true">/</span><input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a building..." /><button
          type="button"
          className={`satellite-switch ${isSatellite ? "is-active" : ""}`}
          onClick={() => setIsSatellite((prev) => !prev)}
          role="switch"
          aria-checked={isSatellite}
          title={isSatellite ? "Switch to Street view" : "Switch to Satellite view"}
        >
          <span className="satellite-switch-label">Satellite</span>
          <span className="satellite-switch-track">
            <span className="satellite-switch-thumb" />
          </span>
        </button>
        <button type="button" className="location-button" aria-label="Show my live location" onClick={showLiveLocation}>+</button></div>
      <div className="map-canvas"><MapView places={places} selectedSlug={selected?.slug ?? ""} onSelect={setSelectedSlug} route={routeGeometry} userLocation={userLocation} isSatellite={isSatellite} /></div>
      {routeSummary ? <div className="walk-badge"><span className="walk-icon">+</span> Walking route <strong>{routeSummary.minutes} min</strong><span>{routeSummary.distanceKm} km</span></div> : null}
      <div className="map-legend"><span><i className="legend-dot orange" /> campus location</span><span><i className="legend-dot teal" /> selected</span></div>
      {selected ? <article className="place-sheet">
        <div className="sheet-handle" />
        <p className="place-category">{selected.categoryName}</p>
        <h2>{selected.name}</h2>
        <p className="place-description">{selected.shortDescription}</p>
        <div className="place-actions"><button type="button" className="direction-button" onClick={requestWalkingRoute} disabled={isRouting}>{isRouting ? "Finding route..." : "Get direction"} <span aria-hidden="true">-&gt;</span></button></div>
        {routeMessage ? <p className="route-message" role="status">{routeMessage}</p> : null}
        <details className="place-more"><summary>View place notes</summary><p>{selected.longDescription}</p><dl><div><dt>Hours</dt><dd>{selected.openingHours ?? "Not available"}</dd></div><div><dt>Route note</dt><dd>{selected.routeHint ?? "Not available"}</dd></div></dl></details>
      </article> : null}
    </section>

    <aside className="trail-drawer" aria-label="Campus places">
      <div className="drawer-header"><div><p className="eyebrow">Explore campus</p><h2>Where do you need to go?</h2></div><span className="place-count">{places.length} places</span></div>
      <div className="category-scroll" aria-label="Place categories"><button type="button" className={category === "all" ? "category-chip active" : "category-chip"} onClick={() => setCategory("all")}>All places</button>{data.categories.map((item) => <button type="button" className={category === item.slug ? "category-chip active" : "category-chip"} key={item.id} onClick={() => setCategory(item.slug)}>{item.name}</button>)}</div>
      <div className="place-list" aria-live="polite">{places.map((place) => <button type="button" key={place.id} className={selected?.slug === place.slug ? "place-row selected" : "place-row"} onClick={() => setSelectedSlug(place.slug)}><span className="place-pin" style={{ background: place.categoryAccent }}>{place.name.slice(0, 1)}</span><span className="place-row-copy"><strong>{place.name}</strong><small>{place.categoryName} - {place.shortDescription}</small></span><span className="row-arrow" aria-hidden="true">-&gt;</span></button>)}</div>
      <a className="new-here-link" href="#guide"><span className="guide-dot">?</span><span><strong>I'm new here</strong><small>Start with a simple campus orientation</small></span><span aria-hidden="true">-&gt;</span></a>
    </aside>

    <section id="guide" className="guide-section"><div className="guide-heading"><p className="eyebrow">New student guide</p><h2>Four stops to get your bearings.</h2><p>Start small and use this checklist to get familiar with the verified TSU locations.</p></div><div className="guide-steps">{data.guideSteps.map((step, index) => <article className="guide-step" key={step.id}><span className="step-number">{step.icon || String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div></section>
  </div>;
}
