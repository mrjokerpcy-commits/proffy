import { Router, Request, Response } from "express";

const router = Router();

// Returns Technion courses from cheesefork (cached) or manually stored courses for other unis
router.get("/", async (req: Request, res: Response) => {
  const user = (req as any).user;
  // TODO: fetch from DB — user's enrolled courses
  res.json({ courses: [] });
});

router.post("/", async (req: Request, res: Response) => {
  // Manually add a course (used by agent for non-Technion students)
  const { university, department, course, professor, examDate, semester } = req.body;
  // TODO: save to DB
  res.json({ success: true });
});

// Get Technion courses from cheesefork scraper cache
router.get("/technion", async (req: Request, res: Response) => {
  const { semester } = req.query;
  // TODO: return cached cheesefork data for the semester
  res.json({ courses: [], source: "cheesefork" });
});

export { router as coursesRouter };
