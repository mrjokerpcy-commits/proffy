import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";
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
  metadataBase: new URL("https://proffy.study"),
  title: "Proffy – AI Study Tools for Every Student",
  description: "AI-powered prep for university courses, psychometric, bagrut, and yael exams.",
  icons: {
    icon: [
      { url: "/logo-tab.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo-tab.png",
    apple: "/logo-tab.png",
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
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            {/* Google Analytics with consent mode — all storage denied by default until user accepts */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { send_page_view: false });
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
