# Production Readiness & Best Practices

This document summarizes production-oriented checks, fixes applied, and recommendations for VaultUI.

---

## Critical Fixes Applied

### 1. **tRPC mutation authorization (security)**
- **Issue:** Component, collection, and version mutations used `publicProcedure`, allowing unauthenticated users to create, update, and delete data.
- **Fix:** All write operations now use `protectedProcedure`:
  - **component:** create, update, softDelete, restore
  - **collection:** create, update, delete, addComponent, removeComponent
  - **version:** add, delete
- Read operations (list, getById, getBySlug, etc.) remain public for unauthenticated browsing if desired.

### 2. **Auth configuration**
- **AUTH_SECRET:** Validated at module load when `NODE_ENV === "production"`; build/start fails if missing.
- **Session role:** `session.user.role` now falls back to `"user"` when missing to avoid undefined on the client.
- **Sign-in logging:** Removed PII (email) from production logs; only a generic dev warning is logged when sign-in is denied.

### 3. **TypeScript / build**
- **component-documentation.tsx:** Removed regex `/s` flag (ES2018-only) so the project builds with `target: "ES2017"`. Fixed `CodeEditor` `onChange` type (explicit `(value: string) => void`).
- **Auth adapter:** Already fixed earlier with `PrismaAdapter(db) as Adapter` and `@auth/core` override for Vercel build.

### 4. **Logging**
- **version delete:** Verbose debug logs removed from production; only a single error log in development on failure.
- **Auth:** No user-identifying data in production logs.

### 5. **Environment and secrets**
- **.env.example** added with placeholder variables. Never commit `.env` or `.env.local` (already in `.gitignore`).

---

## Security Checklist

| Area | Status | Notes |
|------|--------|--------|
| Auth required for mutations | Done | tRPC writes use `protectedProcedure`. |
| AUTH_SECRET in production | Done | Validated at startup. |
| No secrets in repo | Your responsibility | Ensure `.env` is never committed; use platform env (e.g. Vercel). |
| Passwords | OK | bcrypt with cost 10; min 8 chars on reset. |
| Password reset token | OK | Single-use, expiry checked; token in body for reset (GET only for validate). |
| Role-based access | OK | User router enforces `superadmin` for admin actions. |
| Domain restriction | OK | @position2.com enforced for sign-in and user creation. |

---

## Recommendations (not yet implemented)

### High priority
1. **Rate limiting**  
   Add rate limiting for auth and sensitive APIs (e.g. sign-in, forgot-password, reset-password, tRPC) to reduce brute-force and DoS risk. Use Vercel rate limits, Upstash, or similar.

2. **Validate reset token via POST**  
   `validate-reset-token` currently uses GET with token in query string; query strings can appear in logs and Referer. Prefer POST with token in body for validation in production.

3. **Security headers**  
   Consider adding in `next.config.ts` or middleware:
   - `Strict-Transport-Security` (HSTS)
   - `X-Frame-Options`
   - `Content-Security-Policy` (tune for your app)
   - `Referrer-Policy`

### Medium priority
4. **Structured logging**  
   Replace ad-hoc `console.error` with a logger (e.g. Pino) and avoid logging full error objects in production (log message and code, not stack, unless in dev).

5. **Error boundaries**  
   Ensure React error boundaries cover main app and key routes so production errors don’t white-screen.

6. **Health/readiness endpoint**  
   Add e.g. `/api/health` for load balancers and monitoring (DB connectivity optional).

### Lower priority
7. **Dependency audits**  
   Run `npm audit` (or equivalent) regularly and address high/critical issues.

8. **CSP and COEP/COOP**  
   You already set COEP/COOP for WebContainer; if you add CSP, ensure it allows required scripts and frames.

---

## Environment Variables (production)

- **Required:** `AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Required for Google sign-in in production:** `NEXTAUTH_URL` — set to your app’s public URL (e.g. `https://your-app.vercel.app`) so the OAuth redirect URI matches. If missing, you may see **Error 400: redirect_uri_mismatch**.
- Set these in your hosting platform (e.g. Vercel) and never commit real values.

### Fixing Google OAuth "redirect_uri_mismatch" (Error 400)

1. **Set NEXTAUTH_URL on Vercel**  
   In the project → Settings → Environment Variables, add:
   - `NEXTAUTH_URL` = `https://<your-vercel-domain>` (e.g. `https://vault-ui-xxx.vercel.app`)  
   No trailing slash. Redeploy after adding.

2. **Add the redirect URI in Google Cloud Console**  
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
   - Open your **OAuth 2.0 Client ID** (Web application).
   - Under **Authorized redirect URIs**, add exactly:
     - `https://<your-vercel-domain>/api/auth/callback/google`
   - Save. The URI must match exactly (protocol, host, path, no trailing slash).

---

## TypeScript / build notes

- **tsconfig:** `target: "ES2017"` is sufficient after regex fix; no need to change to ES2018 for this.
- **Strict mode:** `strict: true` is enabled; keep it for production code quality.
- **User management forms:** If you still see resolver/SubmitHandler type errors in `user-management-dialog.tsx` or `user-management.tsx`, ensure the form default value for `role` is set (e.g. `role: "user"`) so the inferred type has `role` required.

---

## Summary

Critical production issues addressed: unauthenticated tRPC mutations are now protected, auth config and session role are validated/safe, build and types are fixed, and logging avoids PII/verbose output in production. Apply the high-priority recommendations (rate limiting, token-in-body validation, security headers) for a stronger production setup.
