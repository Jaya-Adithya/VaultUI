import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/auth', '/api/auth', '/preview', '/api/setup', '/api/auth-check'];
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // For protected routes, check authentication
    if (!isPublicRoute) {
        // Determine if we're on HTTPS (Vercel production)
        const secureCookie = request.url.startsWith('https://');
        
        // Explicitly set the cookie name to match what NextAuth v5 beta uses
        // NextAuth v5 uses "authjs" prefix (not "next-auth" from v4)
        const cookieName = secureCookie
            ? '__Secure-authjs.session-token'
            : 'authjs.session-token';
        
        let token = null;
        try {
            token = await getToken({ 
                req: request, 
                secret: process.env.AUTH_SECRET,
                cookieName,
                // The salt MUST match what NextAuth v5 uses for JWT encryption
                // In NextAuth v5, the salt is the cookie name
                salt: cookieName,
                secureCookie,
            });
        } catch (err) {
            console.error('[Middleware] Error reading token:', err);
        }

        // Debug logging (visible in Vercel Function Logs)
        if (!token) {
            console.log('[Middleware] No token found for:', pathname, '- redirecting to sign-in');
            console.log('[Middleware] Cookie name checked:', cookieName);
            console.log('[Middleware] Available cookies:', request.cookies.getAll().map(c => c.name).join(', '));
            
            const signInUrl = new URL('/auth/signin', request.url);
            signInUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(signInUrl);
        }
    }

    const response = NextResponse.next();

    // Paths that require Cross-Origin Isolation (for SharedArrayBuffer/WebContainer)
    if (pathname.startsWith('/component/') || pathname.startsWith('/tools/')) {
        response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        response.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // Paths that MUST NOT be isolated (Previews)
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
