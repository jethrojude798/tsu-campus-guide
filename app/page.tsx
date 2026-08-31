import { CampusExplorer } from "@/components/campus-explorer";
import { getPublicCampusData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicCampusData();
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="TSU Campus Guide home"><span className="brand-mark">TS</span><span>TSU Campus Guide</span></a>
        <div className="nav-links"><a href="#explore">Explore map</a><a href="#guide">New student guide</a><a className="nav-admin" href="/admin">Admin</a></div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">A calmer first week starts here</p>
          <h1>Find your place at TSU.</h1>
          <p className="hero-text">A simple campus companion for discovering important places, planning your first routes, and getting oriented at Taraba State University.</p>
          <div className="hero-actions"><a className="button button-primary" href="#explore">Explore the map <span aria-hidden="true">↗</span></a><a className="text-link" href="#guide">I&apos;m new here <span aria-hidden="true">↓</span></a></div>
          <p className="data-note"><span className="status-dot" /> Prototype using clearly labelled demo data. Verify every location before launch.</p>
        </div>
        <div className="hero-aside" aria-label="Guide summary">
          <div className="aside-topline"><span>Start with the essentials</span><span>01 — 04</span></div>
          <div className="route-preview"><div className="route-line"><span className="route-node active">01</span><span className="route-node">02</span><span className="route-node">03</span><span className="route-node">04</span></div><div className="route-labels"><span>Arrive</span><span>Find help</span><span>Learn</span><span>Settle in</span></div></div>
          <p>Use the guide as a checklist, then switch to the map whenever you need a location.</p>
        </div>
      </section>
      <CampusExplorer data={data} />
    </main>
  );
}
