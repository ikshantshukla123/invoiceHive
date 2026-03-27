import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

app.use(helmet());
app.use(express.json());

if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// ── Health check ──────────────────────────────────────────────────────────────
// Used by Docker and Nginx to verify the service is alive
app.get("/health", (_req, res) => {
  res.json({
    status:    "ok",
    service:   "notification-service",
    timestamp: new Date().toISOString(),
  });
});

// ── Status endpoint — shows which consumers are active ────────────────────────
app.get("/status", (_req, res) => {
  res.json({
    status:    "ok",
    consumers: [
      "user.registered",
      "user.password_reset",
      "invoice.sent",
      "invoice.paid",
      "invoice.overdue",
      "invoice.cancelled",
    ],
    uptime: process.uptime(),
  });
});

export default app;