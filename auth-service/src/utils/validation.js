import { z } from "zod";

// ── Register ──────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name too long")
    .trim(),

  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ── Forgot password ───────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase(),
});

// ── Reset password ────────────────────────────────────────────────────────────
export const resetPasswordSchema = z.object({
  token: z.string({ required_error: "Reset token is required" }),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ── Reusable Zod validation middleware factory ────────────────────────────────
// Usage: router.post('/register', validate(registerSchema), registerController)
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }
  req.body = result.data; // Replace body with parsed + sanitized data
  next();
};