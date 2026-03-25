import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? "https://proffy.study";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/pricing"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/course/",
          "/upload/",
          "/chat/",
          "/profile/",
          "/onboarding/",
          "/notes/",
          "/flashcards/",
          "/settings/",
        ],
      },
      // Block known AI/scraping bots from all pages
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Google-Extended", "CCBot", "anthropic-ai", "ClaudeBot"],
        disallow: ["/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
