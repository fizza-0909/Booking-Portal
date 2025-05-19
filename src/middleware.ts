import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of public paths that don't require authentication
const publicPaths = [
    '/',
    '/login',
    '/register',
    '/api/auth',
    '/api/test-setup',
    '/api/test-connection',
    '/favicon.ico',
    '/_next'
];

// List of protected API routes that should return 401 instead of redirecting
const protectedApiRoutes = [
    '/api/bookings',
    '/api/rooms',
    '/api/payment'
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if the path is public
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    try {
        // Verify authentication
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === 'production',
        });

        // If authenticated, proceed
        if (token) {
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-user-id', token.id as string);

            const response = NextResponse.next({
                request: {
                    headers: requestHeaders,
                }
            });

            return response;
        }

        // Handle unauthenticated requests
        if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
            // Return 401 for API routes
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Redirect to login for page routes
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);

    } catch (error) {
        console.error('Middleware error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * 1. _next/static (static files)
         * 2. _next/image (image optimization files)
         * 3. favicon.ico (favicon file)
         * 4. public folder
         */
        '/((?!_next/static|_next/image|public/).*)',
    ],
}; 