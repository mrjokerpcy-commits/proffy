import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Call at the top of every admin route handler.
 * Requires BOTH:
 *   1. A valid session whose email matches ADMIN_EMAIL
 *   2. The x-admin-secret header matching ADMIN_SECRET env var
 *
 * Returns null if authorised, or a 403 NextResponse to return immediately.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminEmail || !session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Secondary layer: secret header (required when ADMIN_SECRET is set)
  if (adminSecret) {
    const header = req.headers.get("x-admin-secret");
    if (header !== adminSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return null;
}
