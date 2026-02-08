import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('session')
    const { pathname } = request.nextUrl

    // Ignore public paths
    if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/static')) {
        return NextResponse.next()
    }

    // Protect all other routes
    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // TODO: Add Org Context injection via headers here in future
    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
