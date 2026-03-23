import { Router } from "express";
import { updateClientStats } from "../controllers/client.controller.js";

const router = Router();

// ── Internal service-to-service middleware ────────────────────────────────────
// These routes are NOT exposed through Nginx — internal Docker network only
// We use a shared internal secret instead of JWT for service-to-service calls
const internalOnly = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, message: "Internal access only" });
  }
  next();
};

// Invoice Service calls this when invoice stats change
router.post("/clients/:clientId/update-stats", internalOnly, updateClientStats);

export default router;