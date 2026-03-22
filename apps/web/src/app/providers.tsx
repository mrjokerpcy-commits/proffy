"use client";
import { SessionProvider } from "next-auth/react";
import CursorGlow from "@/components/ui/CursorGlow";
import UploadModal from "@/components/layout/UploadModal";
import TourOverlay from "@/components/ui/TourOverlay";
import TimerWidget from "@/components/ui/TimerWidget";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CursorGlow />
      <UploadModal />
      <TourOverlay />
      <TimerWidget />
      {children}
    </SessionProvider>
  );
}
