import type { Metadata } from "next";
import "./globals.css";
import "./osm-overrides.css";

export const metadata: Metadata = { title: "TSU Campus Guide", description: "A campus companion for new students at Taraba State University." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
