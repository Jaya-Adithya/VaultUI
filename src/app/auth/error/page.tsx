"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getErrorMessage(error: string | null) {
  switch (error) {
    case "Configuration":
      return "There is a problem with the server configuration.";
    case "AccessDenied":
      return "You do not have permission to sign in. Only @position2.com emails are allowed.";
    case "Verification":
      return "The verification token has expired or has already been used.";
    case "Callback":
    case "OAuthCallback":
      return "Sign-in failed at the callback step. Check Vercel logs and that DATABASE_URL and AUTH_SECRET are set in production.";
    default:
      return "An error occurred during authentication. If this persists, check deployment logs (Vercel → Logs) and ensure DATABASE_URL and AUTH_SECRET are set.";
  }
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>{getErrorMessage(null)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}




