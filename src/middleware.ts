import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = await getToken({ 
        req: request, 
        secret: process.env.AUTH_SECRET 
    });

    // Public routes that don't require authentication
    const publicRoutes = ['/auth', '/api/auth'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Protected routes - redirect to sign in if not authenticated
    if (!isPublicRoute && !token) {
        const signInUrl = new URL('/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    const response = NextResponse.next();

    // Paths that require Cross-Origin Isolation (for SharedArrayBuffer/WebContainer)
    // This includes /component/ routes and /tools/ routes
    // Best practice: Set headers consistently and ensure they're not overridden
    if (pathname.startsWith('/component/') || pathname.startsWith('/tools/')) {
        // Set headers with proper casing (browsers are case-insensitive but it's good practice)
        // These headers MUST be set for WebContainer to work
        response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        
        // Additional security headers (best practice)
        // Prevent MIME type sniffing which could bypass COEP
        response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // Paths that MUST NOT be isolated (Previews)
    // The preview is embedded in an isolated parent (/component/), so it must be compatible.
    // 'credentialless' allows the iframe to load cross-origin resources (images etc) 
    // without them needing CORP headers, while still satisfying the parent's isolation.
    if (pathname.startsWith('/preview/')) {
        response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
        response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
