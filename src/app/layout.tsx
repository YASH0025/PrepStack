import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { themeScript } from "@/components/theme";
import { TooltipProvider } from "@/components/ui/misc";
import { env } from "@/lib/env";

import "./globals.css";

/*
 * Data lives in JSON files that change at runtime, so pages must never be
 * frozen at build time.
 */
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "PrepStack: interview tracker and prep for developers",
    template: "%s · PrepStack",
  },
  description:
    "Track every interview, prep specifically for it, and learn from real developer experiences, all in one place.",
  applicationName: "PrepStack",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
