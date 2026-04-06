import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

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

export const metadata: Metadata = {
  title: "Aria — AI Operating System for NDIS Providers",
  description: "Turn 45-minute progress notes into 90-second voice memos. NDIS-compliant documentation, compliance tracking, and intelligent billing.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Aria — AI for NDIS Providers",
    description: "Voice-to-note in 90 seconds. NDIS compliant. Built for Australia.",
    url: "https://aria.care",
    siteName: "Aria",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
