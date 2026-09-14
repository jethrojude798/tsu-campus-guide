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
          <div className="brand-logo-container">
            <img
              src="/tsu-logo.png"
              alt="Taraba State University Crest"
              className="brand-logo-img"
              width={34}
              height={34}
            />
          </div>
          <div className="brand-text">
            <strong>TSU CAMPUS GUIDE</strong>
            <span className="brand-subtitle">Taraba State University</span>
          </div>
        </a>

        <div className="topbar-actions">
          <nav className="nav-links mobile-hide">
            <a href="#explore" className="nav-item">Explore map</a>
            <a href="#guide" className="nav-item">Student guide</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <CampusExplorer data={data} />
    </main>
  );
}
