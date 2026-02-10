"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getErrorMessage(error: string | null) {
  switch (error) {
    case "Configuration":
      return "There is a problem with the server configuration. Google OAuth credentials may not be set.";
    case "AccessDenied":
      return "You do not have permission to sign in. Your email must be from @position2.com domain.";
    case "Verification":
      return "The verification token has expired or has already been used.";
    case "OAuthSignin":
      return "Failed to initiate Google sign-in. The Google OAuth provider may not be configured on the server.";
    case "OAuthCallback":
      return "Google sign-in callback failed. The redirect URI may not be registered in Google Cloud Console, or the Google OAuth credentials are incorrect.";
    case "OAuthAccountNotLinked":
      return "This Google account is not linked to your existing account. Please sign in with your email and password first, then link your Google account.";
    case "OAuthCreateAccount":
      return "Unable to create account with Google. The database may be unreachable. Please contact support.";
    case "EmailCreateAccount":
      return "Unable to create account. Please contact support.";
    case "Callback":
      return "An error occurred during the authentication callback. Please try again.";
    default:
      return "An unexpected authentication error occurred. Please try again.";
  }
}

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Build sign-in URL that carries the error so the sign-in page can display it
  const signInUrl = error
    ? `/auth/signin?error=${encodeURIComponent(error)}`
    : "/auth/signin";

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-base text-destructive">
            {getErrorMessage(error)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-xs text-center text-muted-foreground font-mono bg-muted/50 rounded p-2">
              Error code: {error}
            </p>
          )}
          <Button asChild className="w-full">
            <Link href={signInUrl}>Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Authentication Error
            </CardTitle>
            <CardDescription className="text-base">
              Loading...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" disabled>
              <Link href="/auth/signin">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

