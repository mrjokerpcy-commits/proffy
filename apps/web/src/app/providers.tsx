"use client";
import { SessionProvider } from "next-auth/react";
import CursorGlow from "@/components/ui/CursorGlow";
import UploadModal from "@/components/layout/UploadModal";
import TourOverlay from "@/components/ui/TourOverlay";
import ExamFingerprintModal from "@/components/ui/ExamFingerprintModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CursorGlow />
      <UploadModal />
      <ExamFingerprintModal />
      <TourOverlay />
      {children}
    </SessionProvider>
  );
}
