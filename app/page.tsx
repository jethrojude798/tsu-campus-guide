import { CampusExplorer } from "@/components/campus-explorer";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicCampusData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getPublicCampusData();
  return (
    <main className="site-shell">
      <header className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="TSU Campus Guide home">
          <div className="brand-mark-glow">
            <span className="brand-mark">TS</span>
          </div>
          <div className="brand-text">
            <strong>TSU CAMPUS GUIDE</strong>
            <span>Taraba State University</span>
          </div>
        </a>

        <div className="topbar-actions">
          <nav className="nav-links">
            <a href="#explore" className="nav-item">Explore map</a>
            <a href="#guide" className="nav-item">Student guide</a>
            <a href="/admin" className="nav-admin-badge">Admin</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <CampusExplorer data={data} />
    </main>
  );
}
