import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetOTPEmail } from "@/lib/email";

// ─── Simple in-memory rate limiter ────────────────────────────────────
// Tracks reset attempts per email to prevent abuse.
// In production, consider using Redis or a database-backed store.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5; // max 5 attempts per 15 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

// Clean up stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt instead of Math.random for security.
 */
function generateSecureOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// POST - Request password reset (send OTP email)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase to avoid case-sensitivity mismatches
    email = email.trim().toLowerCase();

    // Validate email format and domain
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!email.endsWith("@position2.com")) {
      return NextResponse.json(
        { error: "Email must be from @position2.com domain" },
        { status: 400 }
      );
    }

    // Rate limiting — prevent brute-force / spam
    if (isRateLimited(email)) {
      console.warn(`[Reset] Rate limited: ${email}`);
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user exists (case-insensitive via normalized email)
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true, name: true, email: true },
    });

    // Don't reveal if user exists or not (security best practice)
    // Always return success message, but only send email if user exists
    if (user) {
      // Generate cryptographically secure 6-digit OTP
      const otp = generateSecureOTP();
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10); // OTP valid for 10 minutes

      // Delete any existing tokens for this email (case-insensitive)
      await db.verificationToken.deleteMany({
        where: {
          identifier: user.email!, // use the stored email (canonical)
        },
      });

      // Create new OTP token
      await db.verificationToken.create({
        data: {
          identifier: user.email!, // use the stored email
          token: otp,
          expires,
        },
      });

      // Send OTP email
      const emailResult = await sendPasswordResetOTPEmail({
        email: user.email!,
        name: user.name,
        otp,
      });

      if (!emailResult.success) {
        console.error(
          `[Reset] ❌ Failed to send OTP email to ${user.email}:`,
          emailResult.error
        );
        // Return an error so the user knows the email wasn't sent
        // (instead of silently pretending it worked)
        return NextResponse.json(
          {
            error:
              "Failed to send the verification email. Please try again or contact support.",
          },
          { status: 500 }
        );
      }

      console.log(`[Reset] ✅ OTP sent successfully to ${user.email}`);
    } else {
      console.log(`[Reset] No user found for email: ${email} (not revealing to client)`);
    }

    // Always return success (don't reveal if user exists)
    return NextResponse.json({
      message:
        "If an account with that email exists, a password reset OTP has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// PUT - Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await db.verificationToken.delete({
        where: { token },
      });
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find user by email (case-insensitive via identifier)
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: verificationToken.identifier,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the reset token (one-time use)
    await db.verificationToken.delete({
      where: { token },
    });

    // Also delete ALL tokens for this user to invalidate any other pending resets
    await db.verificationToken.deleteMany({
      where: { identifier: verificationToken.identifier },
    });

    console.log(`[Reset] ✅ Password reset successfully for ${user.email}`);

    return NextResponse.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
