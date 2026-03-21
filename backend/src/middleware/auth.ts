import { Request, Response, NextFunction } from "express";

// Validates the session token from NextAuth
// The web app passes the session JWT in the Authorization header
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // TODO: verify JWT using NEXTAUTH_SECRET
    // For now, attach a mock user for development
    (req as any).user = { id: "dev-user", email: "dev@studyai.com", plan: "pro" };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
