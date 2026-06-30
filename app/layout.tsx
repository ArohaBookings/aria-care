import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import StructuredData from "@/components/seo/StructuredData";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.ariacare.app"),
  title: {
    default: "Aria Care — AI Progress Notes for Support Workers and Providers",
    template: "%s | Aria Care",
  },
  description: "Turn voice notes and bullet points into structured, review-ready support note drafts workers can copy into ShiftCare, Lumary, Brevity or provider systems.",
  icons: { icon: "/favicon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Aria Care", statusBarStyle: "default" },
  keywords: [
    "AI progress notes",
    "support worker notes",
    "NDIS progress notes",
    "ShiftCare progress notes",
    "disability support documentation",
    "copy-ready progress notes",
    "incident note draft",
    "handover notes",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Aria Care — AI Progress Notes for Support Workers and Providers",
    description: "Voice and bullet points to copy-ready support note drafts. Built in New Zealand for support workers and providers across Australia & NZ.",
    url: "https://www.ariacare.app",
    siteName: "Aria Care",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aria Care — AI Progress Notes for Support Workers and Providers",
    description: "Create review-ready support notes, then copy into ShiftCare, Lumary, Brevity or your workplace platform.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <StructuredData />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
