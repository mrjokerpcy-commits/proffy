import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

import { chatRouter } from "./routes/chat";
import { uploadRouter } from "./routes/upload";
import { coursesRouter } from "./routes/courses";
import { paymentRouter } from "./routes/payment";
import { adminRouter } from "./routes/admin";
import { authMiddleware } from "./middleware/auth";
import { rateLimiter } from "./middleware/rate-limit";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.NEXTAUTH_URL || "http://localhost:3000" }));
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ─── Public routes ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/payment/webhook", paymentRouter); // Stripe/Payplus need raw body

// ─── Protected routes ───────────────────────────────────────────────────────
app.use(authMiddleware);
app.use(rateLimiter);

app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
