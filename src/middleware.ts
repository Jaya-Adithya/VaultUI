import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const { pathname } = request.nextUrl;

    // Paths that require Cross-Origin Isolation (for SharedArrayBuffer/WebContainer)
    // This includes /component/ routes and /tools/ routes
    if (pathname.startsWith('/component/') || pathname.startsWith('/tools/')) {
        // Set headers with proper casing (browsers are case-insensitive but it's good practice)
        response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    }

    // Paths that MUST NOT be isolated (Previews)
    // Note: If /preview/ is loaded inside an iframe on an isolated page, 
    // the iframe request itself needs to support the isolation (CORP or matching COEP).
    // However, often preview contents (images etc) from other domains break if COEP is strict.
    // For now, let's explicitely set unsafe-none for previews to be sure.
    if (pathname.startsWith('/preview/')) {
        response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
