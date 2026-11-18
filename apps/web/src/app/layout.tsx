import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { PrivacyProvider } from "@/components/privacy";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Trading Bauhaus — Sovereign AI Trade Journal & Performance Analytics",
    template: "%s | Trading Bauhaus",
  },
  description:
    "Sovereign execution journal with physical SQLite isolation, sub-millisecond execution engine, prop firm payout ledger, and real-time AI Playbook Analyst. Zero monthly SaaS fees.",
  keywords: [
    "trading journal",
    "TradeZella alternative",
    "TraderSync alternative",
    "prop firm journal",
    "Topstep journal",
    "Apex Trader Funding journal",
    "FTMO journal",
    "Tradeify journal tool",
    "Take Profit Trader payout tracker",
    "Lucid Trading trade analyzer",
    "futures trading journal",
    "MFE MAE analytics",
  ],
  authors: [{ name: "Trading Bauhaus" }],
  creator: "Trading Bauhaus",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tradingbauhaus.com",
    siteName: "Trading Bauhaus",
    title: "Trading Bauhaus — The Sovereign AI Trading Journal",
    description:
      "Physical SQLite isolation, zero monthly SaaS fees, sub-millisecond analytics, and real-time AI Playbook Analyst for serious futures, forex & prop firm traders.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trading Bauhaus — Sovereign AI Trading Journal",
    description:
      "Physical SQLite tenancy, zero monthly SaaS fees, built-in prop firm tracking, and AI Playbook Analyst.",
    creator: "@tradingbauhaus",
    site: "@tradingbauhaus",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <TooltipProvider delayDuration={350} skipDelayDuration={150}>
          <Suspense>
            <ThemeProvider>
              <PrivacyProvider>
                <Shell>{children}</Shell>
              </PrivacyProvider>
            </ThemeProvider>
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
