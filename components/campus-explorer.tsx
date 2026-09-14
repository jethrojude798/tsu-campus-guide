"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useTransition } from "react";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="map-placeholder">
      <div className="map-placeholder-shimmer" />
      <p>Loading Taraba State University campus map...</p>
    </div>
  ),
});

type Place = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string | null;
  openingHours: string | null;
  accessibilityNotes: string | null;
  routeHint: string | null;
  latitude: number | null;
  longitude: number | null;
  categoryName: string;
  categorySlug: string;
  categoryAccent: string;
  tags: string[];
};

type GuideSection = {
  id: string;
  title: string;
  slug: string;
  content: string;
  order: number;
};

type CampusData = {
  places: Place[];
  categories: any[];
  guideSteps?: any[];
  guideSections?: GuideSection[];
  emergencyContacts?: { id: string; name: string; subtitle: string; phone: string; icon: string }[];
  stats?: any;
};

export function CampusExplorer({ data }: { data: CampusData }) {
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [deferredQuery, setDeferredQuery] = useState<string>("");
  const [, startTransition] = useTransition();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveLocation, setIsLiveLocation] = useState<boolean>(false);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<{ minutes: number; distanceKm: string; travelMode: "foot" | "car" } | null>(null);
  const [routeSteps, setRouteSteps] = useState<{ instruction: string; distanceMeters: number }[]>([]);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [travelMode, setTravelMode] = useState<"foot" | "car">("foot");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showEmergency, setShowEmergency] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSatellite, setIsSatellite] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);
  const [localEmergency, setLocalEmergency] = useState<any[] | null>(null);

  // Sync theme
  useEffect(() => {
    function readTheme() {
      if (typeof document === "undefined") return;
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDarkMode(theme !== "light");
    }
    readTheme();
    const handler = () => readTheme();
    window.addEventListener("tsu-theme-change", handler);
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("tsu-theme-change", handler);
      observer.disconnect();
    };
  }, []);

  // Sync deep link
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("tsu_emergency_contacts");
      if (saved) setLocalEmergency(JSON.parse(saved));
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const placeParam = params.get("place");
    if (placeParam && data.places.some((p) => p.slug === placeParam)) {
      setSelectedSlug(placeParam);
    }
  }, [data.places]);

  useEffect(() => {
    startTransition(() => {
      setDeferredQuery(query.trim().toLowerCase());
    });
  }, [query]);

  const filteredPlaces = useMemo(() => {
    return data.places.filter((place) => {
      const matchesCategory = category === "all" || place.categorySlug === category;
      const searchable = [place.name, place.categoryName, place.shortDescription, place.tags.join(" ")].join(" ").toLowerCase();
      return matchesCategory && (!deferredQuery || searchable.includes(deferredQuery));
    });
  }, [category, data.places, deferredQuery]);

  const places = filteredPlaces.length ? filteredPlaces : data.places;
  const selected = places.find((place) => place.slug === selectedSlug) ?? null;

  // Quick destinations shortcut row (strictly real DB items in horizontal row)
  const quickDestinations = useMemo(() => {
    const prioritySlugs = ["faculty-of-health-sciences", "agric-hostel", "clinic", "senate-building", "ict"];
    const picks = prioritySlugs.map((s) => data.places.find((p) => p.slug === s)).filter(Boolean) as typeof data.places;
    return picks.length > 0 ? picks : data.places.slice(0, 5);
  }, [data.places]);

  // Orientation 4 landmarks (strictly real DB items)
  const orientationPlaces = useMemo(() => {
    const prioritySlugs = ["faculty-of-health-sciences", "senate-building", "clinic", "agric-hostel"];
    const picks = prioritySlugs.map((s) => data.places.find((p) => p.slug === s)).filter(Boolean) as typeof data.places;
    return picks.length === 4 ? picks : data.places.slice(0, 4);
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
      () => setIsLiveLocation(false),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
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

          const res = await fetch(
            `https://routing.openstreetmap.de/${profile}/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`
          );
          if (!res.ok) throw new Error("Navigation service did not respond");
          const json = await res.json();
          if (json.code === "Ok" && json.routes && json.routes.length > 0) {
            const r = json.routes[0];
            const coords: [number, number][] = r.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            setRouteGeometry(coords);
            const distKm = (r.distance / 1000).toFixed(1);
            const mins = Math.max(1, Math.round(r.duration / 60));
            setRouteSummary({ minutes: mins, distanceKm: distKm, travelMode: mode });

            const extractedSteps: { instruction: string; distanceMeters: number }[] = [];
            if (r.legs && r.legs[0] && r.legs[0].steps) {
              for (const step of r.legs[0].steps) {
                if (step.maneuver && step.maneuver.type !== "arrive") {
                  const mType = step.maneuver.type;
                  const mMod = step.maneuver.modifier;
                  const name = step.name ? ` onto ${step.name}` : "";
                  let text = "Continue along the campus path";
                  if (mType === "depart") text = `Head out towards ${selected.name}`;
                  else if (mMod) text = `Turn ${mMod.replace("-", " ")}${name}`;
                  extractedSteps.push({ instruction: text, distanceMeters: Math.round(step.distance) });
                }
              }
            }
            if (extractedSteps.length === 0) {
              extractedSteps.push({ instruction: `Walk straight towards ${selected.name}`, distanceMeters: Math.round(r.distance) });
            }
            setRouteSteps(extractedSteps);
            if (voiceEnabled) {
              speakText(`Route found. Heading to ${selected.name}. ${mins} minutes, ${distKm} kilometers.`);
            }
          } else {
            setRouteMessage("Could not calculate a path between your position and this campus location.");
          }
        } catch {
          setRouteMessage("Unable to connect to campus routing service. Please check your network.");
        } finally {
          setIsRouting(false);
        }
      },
      () => {
        setIsRouting(false);
        setRouteMessage("Please allow location access on your phone so we can calculate walking directions.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  return (
    <>
      <div id="explore" className="trail-app">
        {/* Top Header Eyebrow */}
        <div className="mobile-map-eyebrow">
          <h1>Find your way around TSU</h1>
        </div>

        {/* 2. Top Search Bar */}
        <div className="mobile-search-container">
          <div className="map-search-row">
            <div className="map-search">
              <label htmlFor="place-search" className="sr-only">Search campus buildings</label>
              <span aria-hidden="true" className="search-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                id="place-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search campus buildings, faculties..."
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
            </div>

            {/* Instant Search Suggestions Dropdown - only when searching */}
            {query.trim().length > 0 ? (
              <div className="search-dropdown-menu" role="listbox">
                <div className="search-dropdown-header">
                  <span>MATCHING LOCATIONS ({filteredPlaces.length})</span>
                  <button
                    type="button"
                    className="search-dropdown-close"
                    onClick={() => { setIsSearchFocused(false); setQuery(""); }}
                  >
                    Close
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
                          setQuery("");
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
        </div>

        {/* 3. Horizontal Scrollable Quick Destinations Row */}
        <div className="quick-destinations-bar" aria-label="Quick destination shortcuts">
          <div className="quick-destinations-scroll">
            {quickDestinations.map((place) => (
              <button
                key={place.id}
                type="button"
                className={`quick-chip ${selectedSlug === place.slug ? "is-active" : ""}`}
                onClick={() => focusPlace(place.slug)}
              >
                <span className="chip-indicator" style={{ backgroundColor: place.categoryAccent }} />
                <span>{place.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. MAP: The Main Hero */}
        <section className="map-stage" aria-label="Campus live map">
          {/* Upper-Right: Street / Satellite Toggle */}
          <div className="map-upper-right-controls">
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
          </div>

          {/* Lower-Right: Locate Me Button */}
          <div className="map-lower-right-controls">
            <button
              type="button"
              className={`map-locate-btn ${isLiveLocation ? "is-active" : ""} ${isLocating ? "is-locating" : ""}`}
              aria-label="Show my live location"
              onClick={showLiveLocation}
              title="Locate my position on campus"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
            </button>
          </div>

          {/* Lower-Left: Single Distinct SOS Button */}
          <div className="map-lower-left-controls">
            <button
              type="button"
              className="map-sos-fab"
              onClick={() => setShowEmergency(true)}
              aria-label="Campus emergency help"
              title="Campus Emergency Contacts"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <span>SOS</span>
            </button>
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

          {/* Active Navigation Bottom Dock - Replaces place sheet during directions */}
          {routeSummary ? (
            <div className="route-guidance-card" role="region" aria-label="Active route and navigation">
              <div className="route-nav-top-row">
                <div className="route-nav-target">
                  <span className="route-nav-badge">{routeSummary.travelMode === "car" ? "🚗 Drive" : "🚶 Walk"}</span>
                  <strong className="route-nav-name">{selected?.name ?? "Campus Destination"}</strong>
                </div>
                <button
                  type="button"
                  className="route-nav-exit-btn"
                  onClick={() => {
                    setRouteSummary(null);
                    setRouteGeometry([]);
                    setRouteSteps([]);
                    if (typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  title="Exit navigation"
                  aria-label="Exit navigation"
                >
                  Exit ✕
                </button>
              </div>

              <div className="route-guidance-header">
                <div className="route-mode-pill">
                  <span className="route-eta-time">{routeSummary.minutes} min</span>
                  <span className="route-eta-dist">({routeSummary.distanceKm} km)</span>
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

          {/* Selected Location: Mobile Bottom Sheet / Desktop Panel (only when not routing) */}
          {selected && !routeSummary ? (
            <article className={`place-sheet ${isSheetExpanded ? "is-expanded" : "is-collapsed"}`} aria-label="Selected location details">
              {/* Top Drag / Tap Handle */}
              <div className="sheet-handle-row" onClick={() => setIsSheetExpanded(!isSheetExpanded)}>
                <span className="sheet-drag-pill" />
              </div>

              {/* Sheet Header: Category, Name, Close Button */}
              <div className="sheet-header-bar">
                <div className="place-category-badge" style={{ borderColor: selected.categoryAccent }}>
                  <span className="badge-glow-dot" style={{ backgroundColor: selected.categoryAccent }} />
                  {selected.categoryName}
                </div>
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

              <div className="sheet-title-row">
                <h2 className="sheet-place-name">{selected.name}</h2>
                <p className="sheet-short-desc">{selected.shortDescription}</p>
              </div>

              {/* Mode Switcher: Walk / Drive */}
              <div className="sheet-mode-row">
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
              </div>

              {/* Primary Action: Get Directions */}
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
                    <span>Get {travelMode === "car" ? "driving" : "walking"} directions →</span>
                  </>
                )}
              </button>

              {/* Secondary Actions: Share & Details */}
              <div className="sheet-secondary-actions">
                <button
                  type="button"
                  className="sheet-secondary-btn share-place-button"
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
                  <span>{copiedLink ? "Link copied!" : "Share location"}</span>
                </button>

                <button
                  type="button"
                  className="sheet-secondary-btn sheet-details-btn"
                  onClick={() => setIsSheetExpanded(!isSheetExpanded)}
                  aria-expanded={isSheetExpanded}
                  title={isSheetExpanded ? "Hide details" : "View full details"}
                >
                  {isSheetExpanded ? (
                    <>
                      <span>Hide details</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </>
                  ) : (
                    <>
                      <span>View details</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Content: About, Hours, Navigation Hint, and Accessibility */}
              {isSheetExpanded ? (
                <div className="sheet-expanded-content">
                  <div className="sheet-about-block">
                    <h4 className="sheet-about-title">About</h4>
                    <p className="sheet-long-desc">{selected.longDescription || selected.shortDescription}</p>
                  </div>
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
                </div>
              ) : null}

              {/* Route Guidance Feedback */}
              {routeMessage ? <p className="route-message" role="status">{routeMessage}</p> : null}
            </article>
          ) : null}
        </section>
      </div>

      {/* 5. Compact Student Orientation Section (Below Main Map) */}
      <section id="guide" className="compact-orientation-section" aria-label="Student orientation">
        <div className="orientation-header-compact">
          <div className="orientation-title-group">
            <span className="orientation-pill-tag">ORIENTATION</span>
            <h3>Start with the places you'll use most</h3>
          </div>
          <span className="orientation-scroll-hint">Swipe →</span>
        </div>

        {/* Horizontal scrollable row of compact cards */}
        <div className="orientation-horizontal-scroll" role="region" aria-label="Orientation landmark shortcuts">
          {orientationPlaces.map((place, index) => (
            <button
              key={place.id}
              type="button"
              className="orientation-compact-card"
              onClick={() => focusPlace(place.slug)}
            >
              <div className="orientation-card-top">
                <span className="orientation-step-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="orientation-cat-badge" style={{ color: place.categoryAccent, borderColor: place.categoryAccent }}>
                  {place.categoryName}
                </span>
              </div>
              <strong className="orientation-card-name">{place.name}</strong>
              <div className="orientation-card-bottom">
                <span className="orientation-view-link">View on map →</span>
              </div>
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
