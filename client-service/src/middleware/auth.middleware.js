import jwt from "jsonwebtoken";

// ── protect ───────────────────────────────────────────────────────────────────
// Each microservice verifies JWTs independently using the shared secret
// This is faster than calling the auth service on every request (no network hop)
// Trade-off: revoked tokens (blacklist) aren't checked here — only auth service knows
// For most endpoints this is fine — access tokens expire in 15 min anyway

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach userId to req — controllers use req.userId to scope queries
    req.userId = decoded.sub;
    req.token  = token;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired — please refresh" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    next(err);
  }
};