import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
      index:    true,
    },
    name: {
      type:    String,
      required: true,
      trim:    true,
    },
    passwordHash: {
      type:   String,
      select: false, // Never returned in queries unless explicitly asked
      // null for OAuth users — they have no password
    },
    avatar: {
      type:    String,
      default: null,
    },

    // ── Auth provider ─────────────────────────────────────
    provider: {
      type:    String,
      enum:    ["local", "google", "github"],
      default: "local",
    },
    providerId: {
      type:    String,
      default: null,
      // Google/GitHub user ID — used to link accounts
    },

    // ── Account status ────────────────────────────────────
    isVerified: {
      type:    Boolean,
      default: false,
      // false for local signup until email verified
      // auto-true for OAuth signups
    },
    verifyToken:   { type: String, default: null, select: false },
    verifyExpires: { type: Date,   default: null, select: false },

    // ── Password reset ────────────────────────────────────
    resetToken:    { type: String, default: null, select: false },
    resetExpires:  { type: Date,   default: null, select: false },

    // ── Plan (for future billing) ─────────────────────────
    plan: {
      type:    String,
      enum:    ["free", "pro"],
      default: "free",
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// ── Instance method: compare password ────────────────────────────────────────
// Usage: const isMatch = await user.comparePassword(plainPassword)
userSchema.methods.comparePassword = async function (plain) {
  if (!this.passwordHash) return false; // OAuth user — no password
  return bcrypt.compare(plain, this.passwordHash);
};

// ── Pre-save hook: hash password before saving ────────────────────────────────
userSchema.pre("save", async function (next) {
  // Only hash if passwordHash was explicitly modified
  if (!this.isModified("passwordHash") || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Safe user object (strip sensitive fields for API responses) ────────────────
userSchema.methods.toSafeObject = function () {
  return {
    id:         this._id,
    email:      this.email,
    name:       this.name,
    avatar:     this.avatar,
    provider:   this.provider,
    isVerified: this.isVerified,
    plan:       this.plan,
    createdAt:  this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;