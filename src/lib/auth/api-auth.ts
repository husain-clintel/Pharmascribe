import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// Helper to extract Cognito user ID from request
export async function getCognitoIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get authorization header (Bearer token)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        return payload.sub || null
      }
    }

    // Check cookies for Cognito tokens
    // Amplify stores tokens with pattern: CognitoIdentityServiceProvider.<clientId>.<username>.idToken
    const allCookies = request.cookies.getAll()
    for (const cookie of allCookies) {
      if (cookie.name.includes('CognitoIdentityServiceProvider') && cookie.name.endsWith('idToken')) {
        const parts = cookie.value.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          return payload.sub || null
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
