import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { themeScript } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Wize — Flex avec moi", template: "%s · Wize" },
  description:
    "L'IA qui t'aide à aller plus loin dans ta réflexion, à explorer de nouveaux domaines et à transformer ta curiosité en véritable connaissance.",
  applicationName: "Wize",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
