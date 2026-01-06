import { NextRequest, NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import prisma from '@/lib/db/prisma'

// Cache the JWKS for performance
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!jwks) {
    const region = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.split('_')[0] || 'us-east-1'
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    jwks = createRemoteJWKSet(new URL(jwksUrl))
  }
  return jwks
}

// Verify JWT token and extract payload
async function verifyToken(token: string): Promise<{ sub: string; email?: string } | null> {
  try {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
    const region = userPoolId?.split('_')[0] || 'us-east-1'
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`

    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer,
      audience: clientId, // For ID tokens
    })

    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined
    }
  } catch (error) {
    // Try without audience check (for access tokens)
    try {
      const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
      const region = userPoolId?.split('_')[0] || 'us-east-1'
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`

      const { payload } = await jwtVerify(token, getJWKS(), {
        issuer,
      })

      return {
        sub: payload.sub as string,
        email: payload.email as string | undefined
      }
    } catch (retryError) {
      console.error('JWT verification failed:', retryError)
      return null
    }
  }
}

// Helper to extract and verify Cognito user ID from request
export async function getCognitoIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get authorization header (Bearer token)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const verified = await verifyToken(token)
      if (verified) {
        return verified.sub
      }
    }

    // Check cookies for Cognito tokens
    // Amplify stores tokens with pattern: CognitoIdentityServiceProvider.<clientId>.<username>.idToken
    const allCookies = request.cookies.getAll()
    for (const cookie of allCookies) {
      if (cookie.name.includes('CognitoIdentityServiceProvider') && cookie.name.endsWith('idToken')) {
        const verified = await verifyToken(cookie.value)
        if (verified) {
          return verified.sub
        }
      }
    }

    return null
  } catch (error) {
    console.error('Failed to get Cognito ID from request:', error)
    return null
  }
}

// Get database user from request
export async function getUserFromRequest(request: NextRequest) {
  const cognitoId = await getCognitoIdFromRequest(request)

  if (!cognitoId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { cognitoId }
  })

  return user
}

// Middleware-style auth check for API routes
export async function requireAuth(request: NextRequest): Promise<{
  user: { id: string; email: string; role: string } | null
  error: NextResponse | null
}> {
  const user = await getUserFromRequest(request)

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    error: null
  }
}

// Optional auth - returns user if authenticated, null if not (no error)
// Useful for demo mode where auth is optional
export async function optionalAuth(request: NextRequest): Promise<{
  user: { id: string; email: string; role: string } | null
  isDemo: boolean
}> {
  // Check if this is a demo request
  const isDemo = request.headers.get('x-demo-mode') === 'true'

  const user = await getUserFromRequest(request)

  if (user) {
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      isDemo: false
    }
  }

  return { user: null, isDemo }
}

// Check if user is admin
export async function requireAdmin(request: NextRequest): Promise<{
  user: { id: string; email: string; role: string } | null
  error: NextResponse | null
}> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, error }
  }

  if (user?.role !== 'ADMIN') {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
  }

  return { user, error: null }
}

// Helper to check report ownership
export async function requireReportOwnership(
  request: NextRequest,
  reportId: string
): Promise<{
  user: { id: string; email: string; role: string } | null
  report: any | null
  error: NextResponse | null
}> {
  const { user, error } = await requireAuth(request)

  if (error) {
    return { user: null, report: null, error }
  }

  // Admins can access any report
  if (user?.role === 'ADMIN') {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    })

    if (!report) {
      return {
        user,
        report: null,
        error: NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
    }

    return { user, report, error: null }
  }

  // Regular users can only access their own reports
  const report = await prisma.report.findFirst({
    where: {
      id: reportId,
      userId: user?.id
    }
  })

  if (!report) {
    return {
      user,
      report: null,
      error: NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
  }

  return { user, report, error: null }
}

// Optional report ownership check - allows demo mode access
// For demo reports (no userId), allows access if x-demo-mode header is set
export async function optionalReportOwnership(
  request: NextRequest,
  reportId: string
): Promise<{
  user: { id: string; email: string; role: string } | null
  report: any | null
  isDemo: boolean
  error: NextResponse | null
}> {
  const isDemo = request.headers.get('x-demo-mode') === 'true'
  const user = await getUserFromRequest(request)

  // If user is authenticated, use normal ownership check
  if (user) {
    // Admins can access any report
    if (user.role === 'ADMIN') {
      const report = await prisma.report.findUnique({
        where: { id: reportId }
      })

      if (!report) {
        return {
          user: { id: user.id, email: user.email, role: user.role },
          report: null,
          isDemo: false,
          error: NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }
      }

      return { user: { id: user.id, email: user.email, role: user.role }, report, isDemo: false, error: null }
    }

    // Regular users can only access their own reports
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: user.id
      }
    })

    if (!report) {
      return {
        user: { id: user.id, email: user.email, role: user.role },
        report: null,
        isDemo: false,
        error: NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
      }
    }

    return { user: { id: user.id, email: user.email, role: user.role }, report, isDemo: false, error: null }
  }

  // Not authenticated - check if demo mode and report is a demo report (no userId)
  if (isDemo) {
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId: null // Demo reports have no userId
      }
    })

    if (report) {
      return { user: null, report, isDemo: true, error: null }
    }
  }

  // No auth and not a valid demo scenario
  return {
    user: null,
    report: null,
    isDemo,
    error: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}
