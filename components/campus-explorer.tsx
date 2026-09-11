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
type RouteSummary = { minutes: number; distanceKm: string };

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
  const [showEmergency, setShowEmergency] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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

  async function requestWalkingRoute() {
    if (!selected) return;
    setRouteMessage(null);
    setRouteSummary(null);
    setRouteGeometry([]);
    if (selected.latitude == null || selected.longitude == null) {
      setRouteMessage("This destination needs verified coordinates before walking directions can be calculated.");
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
          const response = await fetch(
            `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
          );
          if (!response.ok) throw new Error("Routing service unavailable");
          const result = (await response.json()) as {
            routes?: Array<{ distance: number; duration: number; geometry?: { coordinates: Array<[number, number]> } }>;
          };
          const route = result.routes?.[0];
          if (!route) throw new Error("No walking route found");
          setRouteGeometry(
            route.geometry?.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]) ?? []
          );
          setRouteSummary({
            minutes: Math.max(1, Math.round(route.duration / 60)),
            distanceKm: (route.distance / 1000).toFixed(2),
          });
        } catch {
          setRouteMessage("We could not calculate a walking route right now. Please try again.");
        } finally {
          setIsRouting(false);
        }
      },
      () => {
        setRouteMessage("Location permission was not granted. Allow location access to get walking directions.");
        setIsRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  return (
    <>
      <div id="explore" className="trail-app">
      <section className="map-stage" aria-label="Campus trail map">
        {/* Floating Map Controls Header Overlay */}
        <div className="map-controls-overlay">
          <div className="map-controls-row">
            <div className="map-brand">
              <div className="brand-logo-container map-brand-logo">
                <img
                  src="/tsu-logo.png"
                  alt="Taraba State University Crest"
                  className="brand-logo-img"
                  width={34}
                  height={34}
                />
              </div>
              <div className="map-brand-text">
                <strong>Campus trail</strong>
                <span className="live-status-pill">
                  <span className="live-dot" /> Live Map
                </span>
              </div>
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
            </div>
          </div>

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
              {/* Floating Instant Search Autocomplete Dropdown */}
              {(isSearchFocused || query) && query.trim().length > 0 ? (
                <div className="search-dropdown-menu" role="listbox">
                  <div className="search-dropdown-header">
                    <span>Locations matching &ldquo;{query}&rdquo; ({filteredPlaces.length})</span>
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
                      filteredPlaces.slice(0, 7).map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          className={`search-dropdown-item ${selected?.slug === place.slug ? "is-selected" : ""}`}
                          onMouseDown={() => {
                            setSelectedSlug(place.slug);
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
                        <span>No campus locations found matching &ldquo;{query}&rdquo;</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
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

        {/* Walking Badge */}
        {routeSummary ? (
          <div className="walk-badge">
            <span className="walk-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>
            </span>
            Walking route <strong>{routeSummary.minutes} min</strong>
            <span>({routeSummary.distanceKm} km)</span>
          </div>
        ) : null}

        {/* Map Legend */}
        <div className="map-legend">
          <span><i className="legend-dot orange" /> Campus marker</span>
          <span><i className="legend-dot teal" /> Selected location</span>
        </div>

        {/* Place Sheet Card */}
        {selected ? (
          <article className="place-sheet">
            <div className="sheet-handle" />
            <div className="place-category-badge" style={{ borderColor: selected.categoryAccent }}>
              <span className="badge-glow-dot" style={{ backgroundColor: selected.categoryAccent }} />
              {selected.categoryName}
            </div>
            <h2>{selected.name}</h2>
            <p className="place-description">{selected.shortDescription}</p>

            <div className="place-actions">
              <button type="button" className="direction-button" onClick={requestWalkingRoute} disabled={isRouting}>
                {isRouting ? (
                  <>
                    <span className="button-spinner" /> Finding route...
                  </>
                ) : (
                  <>
                    <span>Get walking route</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>

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
                <span>{copiedLink ? "Link copied!" : "Share location"}</span>
              </button>
            </div>

            {routeMessage ? <p className="route-message" role="status">{routeMessage}</p> : null}

            <details className="place-more">
              <summary>
                <span>View location notes & details</span>
                <svg className="details-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </summary>
              <div className="place-more-content">
                <p>{selected.longDescription}</p>
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
            </details>
          </article>
        ) : null}
      </section>

      {/* Side Drawer: Campus Places Directory */}
      <aside className="trail-drawer" aria-label="Campus places directory">
        <div className="drawer-header">
          <div>
            <span className="drawer-eyebrow">Campus Directory</span>
            <h2>Places to explore</h2>
          </div>
          <span className="place-count-badge">{places.length} locations</span>
        </div>

        {/* Category Filter Chips in Drawer */}
        <div className="category-scroll" aria-label="Filter by category">
          <button
            type="button"
            className={`category-chip ${category === "all" ? "active" : ""}`}
            onClick={() => setCategory("all")}
          >
            All
          </button>
          {data.categories.map((item) => (
            <button
              type="button"
              className={`category-chip ${category === item.slug ? "active" : ""}`}
              key={item.id}
              onClick={() => setCategory(item.slug)}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Place List */}
        <div className="place-list" aria-live="polite">
          {places.map((place) => (
            <button
              type="button"
              key={place.id}
              className={`place-row ${selected?.slug === place.slug ? "selected" : ""}`}
              onClick={() => setSelectedSlug(place.slug)}
            >
              <span className="place-pin" style={{ background: place.categoryAccent }}>
                {place.name.slice(0, 1)}
              </span>
              <span className="place-row-copy">
                <strong>{place.name}</strong>
                <small>{place.categoryName} • {place.shortDescription}</small>
              </span>
              <span className="row-arrow" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </button>
          ))}
        </div>

        {/* Campus Emergency Assistance Quick Card */}
        <button
          type="button"
          className="drawer-emergency-card"
          onClick={() => setShowEmergency(true)}
          title="Campus Emergency Contacts"
          aria-label="Campus Emergency Help & Support"
        >
          <div className="drawer-emergency-badge">
            <span className="sos-pulse-ring" />
            <span className="sos-dot-solid" />
            <span className="sos-badge-text">24/7 HELPLINE</span>
          </div>
          <div className="drawer-emergency-main">
            <div className="drawer-emergency-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
            <div className="drawer-emergency-copy">
              <div className="drawer-emergency-title">Emergency & Medical SOS</div>
              <div className="drawer-emergency-sub">Clinic, Security & Student Support</div>
            </div>
            <div className="drawer-emergency-action">
              <span>Dial</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </button>

        {/* New Student Guide Anchor Card */}
        <a className="new-here-link" href="#guide">
          <div className="guide-dot">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="new-here-copy">
            <strong>New on Campus?</strong>
            <small>Follow the four-step orientation guide below</small>
          </div>
          <span className="guide-arrow" aria-hidden="true">↓</span>
        </a>
      </aside>
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
              {(data as any).emergencyContacts && (data as any).emergencyContacts.length > 0 ? (
                (data as any).emergencyContacts.map((contact: any) => (
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
