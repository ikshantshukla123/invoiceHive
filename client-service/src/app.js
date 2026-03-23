import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import clientRoutes   from "./routes/client.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  message:  { success: false, message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "client-service", timestamp: new Date().toISOString() });
});

// ── Public API routes (JWT protected inside the router) ───────────────────────
app.use("/clients", clientRoutes);

// ── Internal routes (service-to-service — not exposed via Nginx) ──────────────
app.use("/internal", internalRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;