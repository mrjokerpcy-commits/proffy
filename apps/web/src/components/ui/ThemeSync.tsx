"use client";
import { useTheme } from "next-themes";
import { useEffect } from "react";

const KEY = "proffy_theme";

function getCookieTheme(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(^| )${KEY}=([^;]+)`));
  return m ? m[2] : null;
}

function setCookieTheme(theme: string) {
  const isLocal = window.location.hostname === "localhost" || window.location.hostname.startsWith("127.");
  const domain = isLocal ? "" : "; domain=.proffy.study";
  document.cookie = `${KEY}=${theme}${domain}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
}

export default function ThemeSync() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // On mount: apply cookie theme if it differs from current
  useEffect(() => {
    const cookie = getCookieTheme();
    if (cookie && cookie !== theme) setTheme(cookie);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On every theme change: write cookie so all subdomains pick it up
  useEffect(() => {
    if (resolvedTheme) setCookieTheme(resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
