import crypto from "crypto";
import User from "../models/user.model.js";
import { NODE_ENV } from "../config/env.js";
import {
  issueTokens,
  verifyRefreshToken,
  getStoredRefreshToken,
  deleteRefreshToken,
  blacklistAccessToken,
} from "../utils/jwt.utils.js";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../utils/email.utils.js";

// ── POST /auth/register ───────────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists — give a clear message
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // Create user — passwordHash pre-save hook in model will bcrypt it
    const user = await User.create({
      name,
      email,
      passwordHash: password, // hook will hash this before saving
      provider:     "local",
      isVerified:   false,    // they need to verify email (optional for now)
    });

    // Issue JWT pair — access token returned in body, refresh in cookie
    const accessToken = await issueTokens(user._id, res);

    // Send welcome email (fire and forget — don't await so it doesn't slow response)
    sendWelcomeEmail(email, name).catch((err) =>
      console.error("Welcome email failed:", err.message)
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/login ──────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user WITH passwordHash (it's excluded by default via select: false)
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      // Vague message — don't reveal whether email exists
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // OAuth user trying to login with password
    if (user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} login — use the ${user.provider} button`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const accessToken = await issueTokens(user._id, res);

    res.json({
      success: true,
      message: "Logged in successfully",
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/refresh ────────────────────────────────────────────────────────
// Client sends this when access token expires — gets a fresh pair
export const refresh = async (req, res, next) => {
  try {
    // Refresh token comes from httpOnly cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    // Verify JWT signature
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    // Check it matches what we stored in Redis (detects token reuse/theft)
    const stored = await getStoredRefreshToken(decoded.sub);
    if (!stored || stored !== token) {
      // Token reuse detected — someone might have stolen the refresh token
      // Delete ALL tokens for this user as a security measure
      await deleteRefreshToken(decoded.sub);
      return res.status(401).json({
        success: false,
        message: "Refresh token reuse detected — please log in again",
      });
    }

    // Issue fresh token pair (old refresh token deleted automatically in issueTokens)
    const accessToken = await issueTokens(decoded.sub, res);

    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/logout ─────────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    // Blacklist the current access token
    const token = req.token; // set by protect middleware
    if (token) await blacklistAccessToken(token);

    // Delete refresh token from Redis
    await deleteRefreshToken(req.user._id);

    // Clear the cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure:   true,
      sameSite: "none",
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  // req.user already attached by protect middleware
  res.json({ success: true, user: req.user.toSafeObject() });
};

// ── POST /auth/forgot-password ────────────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success — don't reveal whether email exists
    if (!user || user.provider !== "local") {
      return res.json({ success: true, message: "If that email exists, a reset link was sent" });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetToken   = hashedToken;
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(email, resetToken);

    res.json({ success: true, message: "If that email exists, a reset link was sent" });
  } catch (err) {
    next(err);
  }
};

// ── POST /auth/reset-password ─────────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Hash the token from the URL to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken:   hashedToken,
      resetExpires: { $gt: new Date() }, // Not expired
    }).select("+resetToken +resetExpires");

    if (!user) {
      return res.status(400).json({ success: false, message: "Reset token is invalid or expired" });
    }

    // Update password — pre-save hook hashes it
    user.passwordHash = password;
    user.resetToken   = null;
    user.resetExpires = null;
    await user.save();

    // Log them in immediately after reset
    const accessToken = await issueTokens(user._id, res);

    res.json({ success: true, message: "Password reset successfully", accessToken });
  } catch (err) {
    next(err);
  }
};