"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; slug: string; accent: string };
type Place = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  categoryName: string;
  categorySlug: string;
  categoryAccent: string;
  isFeatured: boolean;
  isPlaceholder: boolean;
  mapX: number;
  mapY: number;
  latitude: number | null;
  longitude: number | null;
  openingHours: string | null;
  accessibilityNotes: string | null;
  routeHint: string | null;
  contactNote: string | null;
  tags: string[];
};
type GuideStep = { id: string; title: string; description: string; icon: string; isPlaceholder: boolean };
type CampusData = {
  categories: Category[];
  places: Place[];
  guideSteps: GuideStep[];
  stats: { placeCount: number; categoryCount: number; guideStepCount: number; placeholderShare: number };
};
type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  type: string;
  modifier?: string;
};
type RouteSummary = { minutes: number; distanceKm: string; travelMode: "foot" | "car" };

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="loader-spinner" /> Loading campus map...</div>,
});

export function CampusExplorer({ data }: { data: CampusData }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState(data.places.find((place) => place.isFeatured)?.slug ?? data.places[0]?.slug ?? "");
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [travelMode, setTravelMode] = useState<"foot" | "car">("foot");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [localEmergency, setLocalEmergency] = useState<any[] | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  // Load admin emergency contacts if saved in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("tsu_emergency_contacts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalEmergency(parsed);
        }
      }
    } catch {}
  }, []);

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech error:", e);
      setIsSpeaking(false);
    }
  }

  function formatManeuver(type: string, modifier: string | undefined, name: string, distance: number): string {
    const road = name && name.trim().length > 0 ? ` onto ${name}` : "";
    const distText = distance > 0 ? ` in ${Math.round(distance)} meters` : "";
    if (type === "depart") return `Head out${road}`;
    if (type === "arrive") return "You have reached your destination";
    if (type === "turn") {
      if (modifier === "left") return `Turn left${road}${distText}`;
      if (modifier === "right") return `Turn right${road}${distText}`;
      if (modifier === "sharp left") return `Make a sharp left${road}${distText}`;
      if (modifier === "sharp right") return `Make a sharp right${road}${distText}`;
      if (modifier === "slight left") return `Keep slight left${road}${distText}`;
      if (modifier === "slight right") return `Keep slight right${road}${distText}`;
      return `Turn ${modifier ?? ""}${road}${distText}`;
    }
    if (type === "fork") return `Take the fork ${modifier ?? "ahead"}${road}`;
    if (type === "continue" || type === "new name") return `Continue straight${road}${distText}`;
    if (modifier) return `Turn ${modifier}${road}${distText}`;
    return `Proceed ahead${road}${distText}`;
  }

  // Check URL on initial mount for direct place link (e.g. ?place=health-sciences)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const placeParam = params.get("place");
    if (placeParam) {
      const match = data.places.find(
        (p) => p.slug.toLowerCase() === placeParam.toLowerCase() || p.id.toLowerCase() === placeParam.toLowerCase()
      );
      if (match) {
        setSelectedSlug(match.slug);
      }
    }
  }, [data.places]);

  // Sync selected place into browser address bar without page reload
  useEffect(() => {
    if (typeof window === "undefined" || !selectedSlug) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("place") !== selectedSlug) {
      url.searchParams.set("place", selectedSlug);
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedSlug]);

  // Listen for theme changes to dynamically sync dark/light street maps
  useEffect(() => {
    function checkTheme() {
      const current = document.documentElement.getAttribute("data-theme");
      setIsDarkMode(current !== "light");
    }
    checkTheme();

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ theme: string }>;
      if (custom?.detail?.theme) {
        setIsDarkMode(custom.detail.theme !== "light");
      } else {
        checkTheme();
      }
    };

    window.addEventListener("tsu-theme-change", handler);
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("tsu-theme-change", handler);
      observer.disconnect();
    };
  }, []);

  const filteredPlaces = useMemo(() => {
    return data.places.filter((place) => {
      const matchesCategory = category === "all" || place.categorySlug === category;
      const searchable = [place.name, place.categoryName, place.shortDescription, place.tags.join(" ")].join(" ").toLowerCase();
      return matchesCategory && (!deferredQuery || searchable.includes(deferredQuery));
    });
  }, [category, data.places, deferredQuery]);

  const places = filteredPlaces.length ? filteredPlaces : data.places;
  const selected = places.find((place) => place.slug === selectedSlug) ?? places[0];

  // Quick destinations and orientation picks are drawn ONLY from existing places data
  const quickDestinations = useMemo(() => {
    const preferredOrder = ["academic", "hostel", "health", "admin", "support", "transport"];
    const picks: typeof data.places = [];
    for (const slug of preferredOrder) {
      const match = data.places.find((place) => place.categorySlug === slug);
      if (match && !picks.some((p) => p.id === match.id)) picks.push(match);
    }
    return picks.slice(0, 5);
  }, [data.places]);

  const orientationPlaces = useMemo(() => {
    const preferredOrder = ["academic", "hostel", "support", "health"];
    const picks: typeof data.places = [];
    for (const slug of preferredOrder) {
      const match = data.places.find((place) => place.categorySlug === slug);
      if (match && !picks.some((p) => p.id === match.id)) picks.push(match);
    }
    return picks.slice(0, 4);
  }, [data.places]);

  function focusPlace(slug: string) {
    setSelectedSlug(slug);
    setIsSheetExpanded(false);
    if (typeof document !== "undefined") {
      document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  useEffect(() => {
    if (!isLiveLocation || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => setRouteMessage("Live location unavailable. Check browser location permissions."),
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
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setIsLiveLocation(true);
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setIsLocating(false);
        setRouteMessage("Allow location access in your browser to show your campus position.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  function handleSharePlace() {
    if (!selected) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?place=${selected.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2400);
      });
    }
  }

  async function requestRoute(mode: "foot" | "car" = travelMode) {
    if (!selected) return;
    setRouteMessage(null);
    setRouteSummary(null);
    setRouteGeometry([]);
    setRouteSteps([]);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (selected.latitude == null || selected.longitude == null) {
      setRouteMessage("This destination needs verified coordinates before directions can be calculated.");
      return;
    }
    if (!navigator.geolocation) {
      setRouteMessage("Location services are not available in this browser.");
      return;
    }
    setIsRouting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          const start = `${position.coords.longitude},${position.coords.latitude}`;
          const end = `${selected.longitude},${selected.latitude}`;
          const profile = mode === "car" ? "routed-car" : "routed-foot";
          const response = await fetch(
            `https://routing.openstreetmap.de/${profile}/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`
          );
          if (!response.ok) throw new Error("Routing service unavailable");
          const result = (await response.json()) as {
            routes?: Array<{
              distance: number;
              duration: number;
              geometry?: { coordinates: Array<[number, number]> };
              legs?: Array<{
                steps?: Array<{
                  name?: string;
                  distance: number;
                  duration: number;
                  maneuver: { type: string; modifier?: string };
                }>;
              }>;
            }>;
          };
          const route = result.routes?.[0];
          if (!route) throw new Error("No route found");
          setRouteGeometry(
            route.geometry?.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]) ?? []
          );
          const steps: RouteStep[] = [];
          const legSteps = route.legs?.[0]?.steps ?? [];
          for (const s of legSteps) {
            const instr = formatManeuver(s.maneuver?.type, s.maneuver?.modifier, s.name ?? "", s.distance);
            steps.push({
              instruction: instr,
              distanceMeters: Math.round(s.distance),
              durationSeconds: Math.round(s.duration),
              type: s.maneuver?.type ?? "turn",
              modifier: s.maneuver?.modifier,
            });
          }
          setRouteSteps(steps);
          const minutes = Math.max(1, Math.round(route.duration / 60));
          const distanceKm = (route.distance / 1000).toFixed(2);
          setRouteSummary({
            minutes,
            distanceKm,
            travelMode: mode,
          });

          if (voiceEnabled && steps.length > 0) {
            const modeWord = mode === "car" ? "Driving" : "Walking";
            const firstStep = steps[0].instruction;
            speakText(`${modeWord} directions to ${selected.name} are ready. Total distance is ${distanceKm} kilometers, about ${minutes} minutes. ${firstStep}.`);
          }
        } catch {
          setRouteMessage(`Could not calculate ${mode === "car" ? "driving" : "walking"} route. If you are far from campus, try switching to Vehicle (Driving) mode.`);
        } finally {
          setIsRouting(false);
        }
      },
      () => {
        setIsRouting(false);
        setRouteMessage("Location permission was not granted. Please allow GPS access in your browser to get directions from your current location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  return (
    <>
      <div id="explore" className="trail-app">
      <section className="map-intro" aria-label="Introduction">
        <h1>Find your way around TSU</h1>
        <p>Search for faculties, halls, hostels and important campus locations.</p>
      </section>
      <section className="map-stage" aria-label="Campus live map">
        {/* Floating Map Controls Header Overlay */}
        <div className="map-controls-overlay">
          <div className="map-controls-row">
            <div className="map-search-row">
              <div className="map-search">
                <label htmlFor="place-search" className="sr-only">Search campus buildings</label>
                <span aria-hidden="true" className="search-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  id="place-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search campus buildings, faculties, halls..."
                  autoComplete="off"
                />
                {query ? (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`location-button ${isLiveLocation ? "is-active" : ""} ${isLocating ? "is-locating" : ""}`}
                  aria-label="Show my live location"
                  onClick={showLiveLocation}
                  title="Locate my position on campus"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Instant Search Dropdown */}
              {(isSearchFocused || query.trim().length > 0) ? (
                <div className="search-dropdown-menu" role="listbox">
                  <div className="search-dropdown-header">
                    <span>{query.trim() ? `Locations matching "${query}" (${filteredPlaces.length})` : `All campus locations (${filteredPlaces.length})`}</span>
                    <button
                      type="button"
                      className="search-dropdown-close"
                      onClick={() => { setIsSearchFocused(false); setQuery(""); }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="search-dropdown-list">
                    {filteredPlaces.length > 0 ? (
                      filteredPlaces.slice(0, 8).map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          className={`search-dropdown-item ${selected?.slug === place.slug ? "is-selected" : ""}`}
                          onMouseDown={() => {
                            setSelectedSlug(place.slug);
                            setIsSheetExpanded(false);
                            setIsSearchFocused(false);
                          }}
                        >
                          <span className="search-item-pin" style={{ background: place.categoryAccent }}>
                            {place.name.slice(0, 1)}
                          </span>
                          <div className="search-item-info">
                            <strong>{place.name}</strong>
                            <small>{place.categoryName}</small>
                          </div>
                          <span className="search-item-arrow">→</span>
                        </button>
                      ))
                    ) : (
                      <div className="search-no-results">
                        <span>No campus locations found matching "{query}"</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="map-top-actions">
              <div className="map-layer-dock" role="group" aria-label="Map style selector">
                <button
                  type="button"
                  className={`map-layer-tab ${!isSatellite ? "is-active" : ""}`}
                  onClick={() => setIsSatellite(false)}
                  aria-pressed={!isSatellite}
                  title="Switch to Street view"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                  </svg>
                  <span>Street</span>
                </button>
                <button
                  type="button"
                  className={`map-layer-tab ${isSatellite ? "is-active" : ""}`}
                  onClick={() => setIsSatellite(true)}
                  aria-pressed={isSatellite}
                  title="Switch to Satellite view"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 7 9 3 5 7l4 4" />
                    <path d="m17 11 4 4-4 4-4-4" />
                    <path d="m8 12 4 4" />
                    <path d="m16 8-4-4" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <span>Satellite</span>
                </button>
              </div>

              <button
                type="button"
                className="map-sos-button"
                onClick={() => setShowEmergency(true)}
                aria-label="Campus emergency help"
                title="Campus Emergency Contacts"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Destinations (existing campus locations only) */}
        <div className="quick-destinations" aria-label="Quick destinations">
          {quickDestinations.map((place) => (
            <button
              key={place.id}
              type="button"
              className={`quick-destination-chip ${selectedSlug === place.slug ? "is-selected" : ""}`}
              onClick={() => focusPlace(place.slug)}
            >
              {place.name}
            </button>
          ))}
        </div>

        {/* Map Canvas */}
        <div className="map-canvas">
          <MapView
            places={places}
            selectedSlug={selected?.slug ?? ""}
            onSelect={setSelectedSlug}
            route={routeGeometry}
            userLocation={userLocation}
            isSatellite={isSatellite}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Route Status & Audio Guidance Dock */}
        {routeSummary ? (
          <div className="route-guidance-card" role="region" aria-label="Route and voice directions">
            <div className="route-guidance-header">
              <div className="route-mode-pill">
                {routeSummary.travelMode === "car" ? "🚗 Driving" : "🚶 Walking"} route
                <strong>{routeSummary.minutes} min</strong>
                <span>({routeSummary.distanceKm} km)</span>
              </div>
              <div className="route-voice-actions">
                <button
                  type="button"
                  className={`voice-toggle-btn ${voiceEnabled ? "is-active" : ""}`}
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    } else if (next && routeSteps.length > 0) {
                      speakText(`Navigating to ${selected?.name}. ${routeSteps[0]?.instruction}`);
                    }
                  }}
                  title={voiceEnabled ? "Voice guidance active (click to mute)" : "Voice guidance muted (click to unmute)"}
                  aria-label="Toggle voice guidance"
                >
                  {voiceEnabled ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      <span>{isSpeaking ? "Speaking..." : "Voice On"}</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      <span>Voice Muted</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="route-clear-btn"
                  onClick={() => {
                    setRouteSummary(null);
                    setRouteGeometry([]);
                    setRouteSteps([]);
                    if (typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  title="Close route"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Turn by turn step preview list */}
            {routeSteps.length > 0 ? (
              <details className="route-steps-details">
                <summary className="route-steps-summary">
                  <span>View {routeSteps.length} turn-by-turn directions</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </summary>
                <div className="route-steps-list">
                  {routeSteps.map((step, idx) => (
                    <div key={idx} className="route-step-item">
                      <span className="step-num">{idx + 1}</span>
                      <div className="step-info">
                        <strong>{step.instruction}</strong>
                        {step.distanceMeters > 0 ? <small>{step.distanceMeters} m</small> : null}
                      </div>
                      <button
                        type="button"
                        className="step-speak-btn"
                        onClick={() => speakText(step.instruction)}
                        title="Read step out loud"
                        aria-label={`Read step ${idx + 1}`}
                      >
                        🔊
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {/* Map Legend */}
        <div className="map-legend">
          <span><i className="legend-dot orange" /> Campus marker</span>
          <span><i className="legend-dot teal" /> Selected location</span>
        </div>

        {/* Place Sheet Card */}
        {selected ? (
          <article className={`place-sheet ${isSheetExpanded ? "is-expanded" : "is-collapsed"}`}>
            {/* Sheet Drag / Tap Handle */}
            <div className="sheet-header-bar">
              <button
                type="button"
                className="sheet-expand-pill"
                onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                aria-expanded={isSheetExpanded}
                title={isSheetExpanded ? "Collapse card" : "Expand details"}
              >
                <span className="sheet-handle-bar" />
              </button>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => { setSelectedSlug(""); setIsSheetExpanded(false); }}
                aria-label="Close building card"
                title="Dismiss"
              >
                ×
              </button>
            </div>

            {/* Collapsed State Header: Category & Name */}
            <div className="sheet-title-row">
              <div className="place-category-badge" style={{ borderColor: selected.categoryAccent }}>
                <span className="badge-glow-dot" style={{ backgroundColor: selected.categoryAccent }} />
                {selected.categoryName}
              </div>
              <h2 className="sheet-place-name">{selected.name}</h2>
              <p className="sheet-short-desc">{selected.shortDescription}</p>
            </div>

            {/* Walk / Drive & Get Directions Controls */}
            <div className="sheet-actions-row">
              <div className="travel-mode-switcher" role="radiogroup" aria-label="Travel mode">
                <button
                  type="button"
                  className={`mode-btn ${travelMode === "foot" ? "is-selected" : ""}`}
                  onClick={() => {
                    setTravelMode("foot");
                    if (routeSummary) requestRoute("foot");
                  }}
                  title="Walking navigation"
                >
                  🚶 Walk
                </button>
                <button
                  type="button"
                  className={`mode-btn ${travelMode === "car" ? "is-selected" : ""}`}
                  onClick={() => {
                    setTravelMode("car");
                    if (routeSummary) requestRoute("car");
                  }}
                  title="Driving navigation"
                >
                  🚗 Drive
                </button>
              </div>

              <button
                type="button"
                className="direction-button"
                onClick={() => requestRoute(travelMode)}
                disabled={isRouting}
              >
                {isRouting ? (
                  <>
                    <span className="button-spinner" /> Finding route...
                  </>
                ) : (
                  <>
                    <span>Get {travelMode === "car" ? "driving" : "walking"} directions</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className="sheet-details-toggle"
                onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                aria-expanded={isSheetExpanded}
                title={isSheetExpanded ? "Hide details" : "View full details"}
              >
                {isSheetExpanded ? "Less ▴" : "More ▾"}
              </button>
            </div>

            {/* Route Guidance Feedback */}
            {routeMessage ? <p className="route-message" role="status">{routeMessage}</p> : null}

            {/* Expanded State Details */}
            {isSheetExpanded ? (
              <div className="sheet-expanded-content">
                <p className="sheet-long-desc">{selected.longDescription}</p>
                <dl className="place-meta-list">
                  <div>
                    <dt>Operating Hours</dt>
                    <dd>{selected.openingHours ?? "Standard university hours"}</dd>
                  </div>
                  <div>
                    <dt>Navigation Guide</dt>
                    <dd>{selected.routeHint ?? "Paved walkway access"}</dd>
                  </div>
                  <div>
                    <dt>Accessibility</dt>
                    <dd>{selected.accessibilityNotes ?? "Accessible ground entrance"}</dd>
                  </div>
                </dl>
                <div className="sheet-expanded-actions">
                  <button
                    type="button"
                    className="share-place-button"
                    onClick={handleSharePlace}
                    title="Share link to this location"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>{copiedLink ? "Link copied!" : "Share location link"}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        ) : null}
      </section>

      </div>

      {/* Guide Section */}
      <section id="guide" className="guide-section">
        <div className="guide-heading">
          <span className="guide-eyebrow">Student Orientation Checklist</span>
          <h2>Four stops to get your bearings.</h2>
          <p>Start small and use this checklist to get familiar with key Taraba State University landmarks.</p>
        </div>
        <div className="guide-steps">
          {data.guideSteps.map((step, index) => (
            <article className="guide-step-card" key={step.id}>
              <div className="step-badge">
                {step.icon || String(index + 1).padStart(2, "0")}
              </div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Orientation picks: real campus locations, tap to open on the map */}
        <div className="orientation-places" aria-label="Key campus locations">
          {orientationPlaces.map((place, index) => (
            <button
              key={place.id}
              type="button"
              className="orientation-place-card"
              onClick={() => focusPlace(place.slug)}
            >
              <span className="orientation-step-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="orientation-place-info">
                <strong>{place.name}</strong>
                <small>{place.categoryName}</small>
              </span>
              <span className="orientation-place-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* Emergency Assistance Modal */}
      {showEmergency ? (
        <div className="emergency-modal-backdrop" onClick={() => setShowEmergency(false)}>
          <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emergency-modal-header">
              <div className="emergency-title-group">
                <span className="emergency-icon-glow">🚨</span>
                <div>
                  <h3>Campus Emergency & Support</h3>
                  <p>Taraba State University Help Lines</p>
                </div>
              </div>
              <button
                type="button"
                className="emergency-close-btn"
                onClick={() => setShowEmergency(false)}
                aria-label="Close emergency modal"
              >
                ×
              </button>
            </div>

            <div className="emergency-contacts-list">
              {((localEmergency && localEmergency.length > 0) ? localEmergency : (data as any).emergencyContacts) && (((localEmergency && localEmergency.length > 0) ? localEmergency : (data as any).emergencyContacts).length > 0) ? (
                ((localEmergency && localEmergency.length > 0) ? localEmergency : (data as any).emergencyContacts).map((contact: any) => (
                  <a
                    key={contact.id}
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                    className="emergency-contact-card"
                  >
                    <div className="contact-icon clinic-bg">{contact.icon || "🚨"}</div>
                    <div className="contact-info">
                      <strong>{contact.name}</strong>
                      <span>{contact.subtitle} — {contact.phone}</span>
                    </div>
                    <span className="contact-action">Call Now</span>
                  </a>
                ))
              ) : (
                <>
                  <a href="tel:08008782267" className="emergency-contact-card">
                    <div className="contact-icon clinic-bg">🏥</div>
                    <div className="contact-info">
                      <strong>TSU Campus Clinic</strong>
                      <span>Emergency health response & ambulance</span>
                    </div>
                    <span className="contact-action">Call Now</span>
                  </a>
                  <a href="tel:08008787328" className="emergency-contact-card">
                    <div className="contact-icon security-bg">🛡️</div>
                    <div className="contact-info">
                      <strong>Campus Security Unit</strong>
                      <span>24/7 Security patrol & Gate officers</span>
                    </div>
                    <span className="contact-action">Call Now</span>
                  </a>
                  <a href="tel:08008783326" className="emergency-contact-card">
                    <div className="contact-icon affairs-bg">🎓</div>
                    <div className="contact-info">
                      <strong>Student Affairs Helpdesk</strong>
                      <span>Hostel welfare & emergency counseling</span>
                    </div>
                    <span className="contact-action">Call Now</span>
                  </a>
                </>
              )}
            </div>

            <p className="emergency-note">
              For on-campus medical emergencies, visit the TSU Clinic located near the Senate Building.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
