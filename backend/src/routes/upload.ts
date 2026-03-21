import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

const PROCESSOR_URL = process.env.PROCESSOR_URL || "http://localhost:8001";

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { university, department, course, professor, year } = req.body;

  try {
    // Forward to Python processor
    const formData = new FormData();
    formData.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    if (university) formData.append("university", university);
    if (department) formData.append("department", department);
    if (course) formData.append("course", course);
    if (professor) formData.append("professor", professor);
    if (year) formData.append("year", year);
    formData.append("source", "upload");

    const response = await fetch(`${PROCESSOR_URL}/process/file`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Processor error: ${response.statusText}`);
    }

    const result = await response.json();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process file" });
  }
});

export { router as uploadRouter };
