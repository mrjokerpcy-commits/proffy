import { Router, Request, Response } from "express";

const router = Router();

// Stripe webhook — raw body needed (handled before JSON middleware in index.ts)
router.post("/webhook", async (req: Request, res: Response) => {
  // TODO: verify Stripe signature and update subscription in DB
  res.json({ received: true });
});

// Create Stripe checkout session
router.post("/checkout", async (req: Request, res: Response) => {
  const { plan } = req.body; // "pro" | "max" | "whatsapp"
  // TODO: create Stripe session and return URL
  res.json({ url: null, plan });
});

// Get current subscription
router.get("/subscription", async (req: Request, res: Response) => {
  const user = (req as any).user;
  // TODO: fetch from DB
  res.json({ plan: "free", expiresAt: null });
});

export { router as paymentRouter };
