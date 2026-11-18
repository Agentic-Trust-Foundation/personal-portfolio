import type { Metadata, Viewport } from "next";
import { profile } from "@/content/profile";
import "./globals.css";
import "./portfolio.css";

export const viewport: Viewport = { themeColor: "#0b1016", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: `${profile.name} — DevOps & Platform Engineer`,
  description: "DevOps, API Management, platform engineering and current AI Systems projects. Explore work experience and skills through an interactive CV terminal.",
  applicationName: "Hossein — Interactive CV",
  authors: [{ name: profile.name }],
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "profile",
    title: `${profile.name} | DevOps & Platform Engineer`,
    description: "API platforms, infrastructure, DevOps, and AI Systems Engineering.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
