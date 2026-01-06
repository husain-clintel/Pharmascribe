import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/reports', '/settings']

// Routes that should redirect to /reports if already authenticated
const authRoutes = ['/login', '/signup']

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Check for Cognito auth tokens in cookies
  // Amplify stores tokens in cookies with keys like:
  // CognitoIdentityServiceProvider.<clientId>.<username>.accessToken
  const cookies = request.cookies
  const hasCognitoToken = Array.from(cookies.getAll()).some(cookie =>
    cookie.name.includes('CognitoIdentityServiceProvider') &&
    cookie.name.includes('accessToken')
  )

  // Allow demo mode access without authentication
  const isDemoMode = searchParams.get('demo') === 'true'
  const isDemoNewReport = pathname === '/reports/new' && isDemoMode
  const isDemoReportPage = pathname.startsWith('/reports/') && pathname !== '/reports' && isDemoMode

  if (isDemoNewReport || isDemoReportPage) {
    return NextResponse.next()
  }

  // Check if user is on a protected route without auth
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if user is on auth route with existing auth
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  )

  // If on protected route without auth, redirect to login
  if (isProtectedRoute && !hasCognitoToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If on auth route with auth, redirect to reports
  if (isAuthRoute && hasCognitoToken) {
    return NextResponse.redirect(new URL('/reports', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)'
  ]
}
