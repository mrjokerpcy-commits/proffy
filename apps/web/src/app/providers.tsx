"use client";
import { SessionProvider } from "next-auth/react";
import CursorGlow from "@/components/ui/CursorGlow";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CursorGlow />
      {children}
    </SessionProvider>
  );
}
