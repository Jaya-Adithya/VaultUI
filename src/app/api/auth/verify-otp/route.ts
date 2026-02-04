import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { nanoid } from "nanoid";

// POST - Verify OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

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

    // Find verification token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
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
        identifier: email,
        token: resetToken,
        expires: resetExpires,
      },
    });

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

