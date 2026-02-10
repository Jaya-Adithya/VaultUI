import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check auth configuration.
 * Visit https://p2vault-v3.vercel.app/api/auth-check to see the status.
 * 
 * ⚠️ Remove this endpoint in production after debugging is complete.
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    
    // Auth configuration
    AUTH_SECRET: process.env.AUTH_SECRET ? "✅ SET" : "❌ MISSING",
    AUTH_URL: process.env.AUTH_URL ?? "❌ NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "❌ NOT SET",
    
    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID 
      ? `✅ SET (${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...)`
      : "❌ MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✅ SET" : "❌ MISSING",
    
    // Vercel-specific
    VERCEL_URL: process.env.VERCEL_URL ?? "❌ NOT SET",
    VERCEL_ENV: process.env.VERCEL_ENV ?? "❌ NOT SET",
    
    // Database
    DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
    
    // Expected callback URL
    expected_google_callback: getExpectedCallbackUrl(),
    
    // Instructions
    instructions: {
      step1: "Ensure all ❌ MISSING env vars are set in Vercel Project Settings → Environment Variables",
      step2: "Set AUTH_URL to your production URL, e.g. https://p2vault-v3.vercel.app",
      step3: "In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs",
      step4: "Add the 'expected_google_callback' URL above as an Authorized Redirect URI",
      step5: "Also add your production domain to Authorized JavaScript Origins",
      step6: "Redeploy after making changes to env vars",
    },
  };

  return NextResponse.json(checks, { status: 200 });
}

function getExpectedCallbackUrl(): string {
  // NextAuth v5 generates the callback URL based on these env vars (in priority order)
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (authUrl) {
    return `${authUrl}/api/auth/callback/google`;
  }
  
  // Fallback: use VERCEL_URL if available
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}/api/auth/callback/google`;
  }
  
  return "⚠️ Cannot determine — set AUTH_URL env var! (e.g. https://p2vault-v3.vercel.app)";
}

