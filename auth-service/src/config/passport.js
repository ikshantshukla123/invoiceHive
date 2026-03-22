import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/user.model.js";
import { GOOGLE_CALLBACK_URL,GOOGLE_CLIENT_SECRET,GOOGLE_CLIENT_ID,GITHUB_CLIENT_ID,GITHUB_CALLBACK_URL,GITHUB_CLIENT_SECRET } from "./env.js";

// ── Google OAuth ─────────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google"), null);

        // Find existing user OR create new one
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            name:        profile.displayName,
            avatar:      profile.photos?.[0]?.value,
            provider:    "google",
            providerId:  profile.id,
            isVerified:  true, // Google accounts are pre-verified
            // No passwordHash — OAuth users can't use password login
          });
        } else if (user.provider === "local") {
          // User registered with email/pass before — link their Google account
          user.provider   = "google";
          user.providerId = profile.id;
          user.isVerified = true;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ── GitHub OAuth ─────────────────────────────────────────────────────────────
passport.use(
  new GitHubStrategy(
    {
      clientID:     GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL:  GITHUB_CALLBACK_URL,
      scope:        ["user:email"], // GitHub doesn't expose email by default so this ask for email from github
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // GitHub can return multiple emails — pick the primary verified one
        const email =
          profile.emails?.find((e) => e.primary && e.verified)?.value ||
          profile.emails?.[0]?.value;

        if (!email) return done(new Error("No email from GitHub — enable email access in your GitHub settings"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            email,
            name:       profile.displayName || profile.username,
            avatar:     profile.photos?.[0]?.value,
            provider:   "github",
            providerId: profile.id.toString(),
            isVerified: true,
          });
        } else if (user.provider === "local") {
          user.provider   = "github";
          user.providerId = profile.id.toString();
          user.isVerified = true;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// These are required by Passport even if we don't use sessions
// We use JWTs instead of sessions — serialize/deserialize are just stubs(minimal)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-passwordHash");
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;