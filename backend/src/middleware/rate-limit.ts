import rateLimit from "express-rate-limit";

// Free tier: 10 questions/day
// Pro/Max: unlimited (bypass via plan check)
export const rateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: (req) => {
    const user = (req as any).user;
    if (user?.plan === "free") return 10;
    return 0; // 0 = unlimited for paid plans
  },
  keyGenerator: (req) => (req as any).user?.id || req.ip || "unknown",
  message: { error: "Daily question limit reached. Upgrade to Pro for unlimited access." },
  skip: (req) => req.path.startsWith("/api/payment"), // never rate-limit webhooks
});
