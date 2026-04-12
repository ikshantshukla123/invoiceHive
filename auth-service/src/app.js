import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { CLIENT_URL, COOKIE_SECRET } from "./config/env.js";
import { NODE_ENV } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import passport from "./config/passport.js"; // registers strategies as side-effect

const app = express();

// Trust reverse proxy (Nginx) for Rate Limiting
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:      CLIENT_URL || "http://localhost:3000",
    credentials: true, // Required for cookies to work cross-origin
    methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));       // Reject huge payloads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// ── Logging ───────────────────────────────────────────────────────────────────
if (NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Passport init (no sessions — we use JWTs) ────────────────────────────────
app.use(passport.initialize());

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(apiLimiter);

// ── Health check — used by Docker and load balancers ─────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth-service", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);

// ── 404 + global error handler ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;