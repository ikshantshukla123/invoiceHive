import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Send password reset email ─────────────────────────────────────────────────
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: "Reset your InvoiceHive password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4338CA;">Reset your password</h2>
        <p>You requested a password reset for your InvoiceHive account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block; padding: 12px 24px; background: #4338CA;
                  color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #64748B; font-size: 13px;">
          If you didn't request this, ignore this email — your account is safe.
        </p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
        <p style="color: #94A3B8; font-size: 12px;">InvoiceHive — Invoice smarter.</p>
      </div>
    `,
  });
};

// ── Send welcome email ────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (email, name) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: "Welcome to InvoiceHive!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4338CA;">Welcome, ${name}!</h2>
        <p>Your InvoiceHive account is ready. Here's how to get started:</p>
        <ol>
          <li>Add your first client</li>
          <li>Create an invoice with line items</li>
          <li>Send it — your client gets a PDF with a Pay Now button</li>
          <li>Get paid via Stripe</li>
        </ol>
        <a href="${process.env.CLIENT_URL}/dashboard"
           style="display:inline-block; padding: 12px 24px; background: #4338CA;
                  color: white; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Go to Dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
        <p style="color: #94A3B8; font-size: 12px;">InvoiceHive — Invoice smarter.</p>
      </div>
    `,
  });
};