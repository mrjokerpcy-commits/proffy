"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import BetaGate from "@/components/ui/BetaGate";
import CookieBanner from "@/components/ui/CookieBanner";
import SubdomainTheme from "@/components/ui/SubdomainTheme";
import UploadModal from "@/components/layout/UploadModal";
import TourOverlay from "@/components/ui/TourOverlay";
import ExamFingerprintModal from "@/components/ui/ExamFingerprintModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <SessionProvider>
        <SubdomainTheme />
        <UploadModal />
        <ExamFingerprintModal />
        <TourOverlay />
        <BetaGate>
          {children}
        </BetaGate>
        <CookieBanner />
      </SessionProvider>
    </ThemeProvider>
  );
}
