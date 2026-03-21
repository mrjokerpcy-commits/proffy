import { Router, Request, Response } from "express";

const router = Router();

// Trigger manual Drive sync
router.post("/sync-drive", async (_req: Request, res: Response) => {
  // TODO: trigger drive-watcher
  res.json({ status: "triggered" });
});

// Crawler status
router.get("/crawler-status", async (_req: Request, res: Response) => {
  // TODO: return last run times, counts
  res.json({ lastRun: null, itemsIndexed: 0 });
});

// User stats
router.get("/stats", async (_req: Request, res: Response) => {
  // TODO: fetch from DB
  res.json({ totalUsers: 0, activeSubscriptions: 0, totalChunks: 0 });
});

export { router as adminRouter };
