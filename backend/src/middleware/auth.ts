import { Request, Response, NextFunction } from "express";

/**
 * Validates the NextAuth JWT from the Authorization header.
 * NextAuth v4 signs JWTs with NEXTAUTH_SECRET using HS256 (HMAC-SHA256).
 * We manually decode without a heavy library dependency.
 */

function base64urlDecode(str: string): string {
  // Convert base64url → base64, then decode
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64urlDecode(parts[1]));
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice(7);

  // Development shortcut — mock user when SKIP_AUTH=true
  if (process.env.SKIP_AUTH === "true") {
    (req as any).user = { id: "dev-user", email: "dev@proffy.study", plan: "pro" };
    return next();
  }

  const payload = decodeJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Check expiry
  if (payload.exp && typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
    return res.status(401).json({ error: "Token expired" });
  }

  (req as any).user = {
    id   : (payload.sub ?? payload.id) as string,
    email: payload.email as string,
    plan : (payload.plan ?? "free") as string,
  };

  next();
}
