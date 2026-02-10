import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

// POST - Create initial superadmin user (only works when no users exist)
export async function POST(request: NextRequest) {
  try {
    // Security check: only allow when no users exist in the database
    const userCount = await db.user.count();
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Users already exist in the database." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Validate inputs
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (!email.endsWith("@position2.com")) {
      return NextResponse.json(
        { error: "Email must be from @position2.com domain" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "superadmin",
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Superadmin user created: ${user.email}`,
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Failed to create initial user" },
      { status: 500 }
    );
  }
}

// GET - Check if setup is needed
export async function GET() {
  try {
    const userCount = await db.user.count();
    return NextResponse.json({
      setupRequired: userCount === 0,
      message: userCount === 0 
        ? "No users found. Setup is required." 
        : "Setup already completed.",
    });
  } catch (error) {
    console.error("Setup check error:", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

