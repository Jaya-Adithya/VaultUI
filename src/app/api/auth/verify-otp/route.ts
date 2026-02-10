import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { nanoid } from "nanoid";

// POST - Verify OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { email, otp } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { error: "OTP is required" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase for consistent lookup
    email = email.trim().toLowerCase();

    // Find the user first (case-insensitive) to get canonical email
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { email: true },
    });

    if (!user || !user.email) {
      // Don't reveal if user exists
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Find verification token using the canonical stored email
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: user.email,
        token: otp,
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // Check if OTP is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await db.verificationToken.delete({
        where: { token: verificationToken.token },
      });
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Generate a session token for password reset (valid for 15 minutes)
    const resetToken = nanoid(32);
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 15);

    // Delete the OTP token
    await db.verificationToken.delete({
      where: { token: verificationToken.token },
    });

    // Create reset session token
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: resetToken,
        expires: resetExpires,
      },
    });

    console.log(`[Reset] ✅ OTP verified for ${user.email}`);

    return NextResponse.json({
      valid: true,
      resetToken,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
