"use client";
import { SessionProvider } from "next-auth/react";
import CursorGlow from "@/components/ui/CursorGlow";
import UploadModal from "@/components/layout/UploadModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CursorGlow />
      <UploadModal />
      {children}
    </SessionProvider>
  );
}
