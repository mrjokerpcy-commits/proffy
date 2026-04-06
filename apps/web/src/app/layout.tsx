import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import {
  Inter,
  DM_Serif_Display,
  Noto_Sans_Hebrew,
  Plus_Jakarta_Sans,
} from "next/font/google";

// ─── Fonts ───────────────────────────────────────────────────────────────────
// Inter: base font for proffy.study + app.proffy.study
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// DM Serif Display: headings for psycho.proffy.study
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
  preload: false,
});

// Noto Sans Hebrew: body for yael.proffy.study (full Hebrew support)
const notoHebrew = Noto_Sans_Hebrew({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-hebrew",
  display: "swap",
  preload: false,
});

// Plus Jakarta Sans: body for bagrut.proffy.study
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Proffy Beta – Your AI Study Assistant",
  description: "AI-powered study assistant for Israeli university students",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`min-h-full antialiased ${inter.variable} ${dmSerif.variable} ${notoHebrew.variable} ${plusJakarta.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
