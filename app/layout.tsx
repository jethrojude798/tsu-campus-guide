import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./osm-overrides.css";

export const metadata: Metadata = {
  title: "TSU Campus Guide — Taraba State University Campus Trail",
  description: "An intuitive, real-time campus navigator and interactive guide for students and visitors at Taraba State University, Jalingo.",
  openGraph: {
    title: "TSU Campus Guide — Taraba State University",
    description: "Explore campus lecture halls, hostels, clinics, and offices with real-time interactive maps and walking navigation.",
    type: "website",
    locale: "en_NG",
    siteName: "TSU Campus Trail",
  },
  twitter: {
    card: "summary_large_image",
    title: "TSU Campus Guide — Taraba State University",
    description: "Explore campus lecture halls, hostels, clinics, and offices with real-time interactive maps.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tsu_theme")||(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
