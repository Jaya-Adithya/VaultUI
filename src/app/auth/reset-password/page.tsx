"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const validateEmail = () => {
    if (!email) {
      setFieldError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError("Please enter a valid email address");
      return false;
    }
    if (!email.endsWith("@position2.com")) {
      setFieldError("Email must be from @position2.com domain");
      return false;
    }
    setFieldError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Reset Password
          </CardTitle>
          <CardDescription className="text-base">
            {success
              ? "Check your email for a reset link"
              : "Enter your email and we’ll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-4">
              <div
                className="flex items-center gap-2 rounded-lg bg-green-500/15 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400"
                role="alert"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  If an account exists for {email}, you’ll receive a link to reset your password.
                </span>
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className="flex items-center gap-2 rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@position2.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldError(undefined);
                      setError("");
                    }}
                    className={`pl-9 ${fieldError ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                    aria-invalid={!!fieldError}
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {fieldError && (
                  <p className="text-xs text-destructive flex items-center gap-1" role="alert">
                    <AlertCircle className="h-3 w-3" />
                    {fieldError}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>

              <Button type="button" variant="ghost" className="w-full" asChild>
                <Link href="/auth/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
