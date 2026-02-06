import { NextRequest, NextResponse } from "next/server";

// POST - Request password reset (sends OTP email when configured)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!email.endsWith("@position2.com")) {
      return NextResponse.json(
        { error: "Email must be from @position2.com domain" },
        { status: 400 }
      );
    }

    // TODO: Create OTP in DB, send email, and redirect user to OTP step.
    // For now return a clear message so the UI does not 404.
    return NextResponse.json(
      {
        error:
          "Password reset email is not configured. Please contact your administrator.",
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
