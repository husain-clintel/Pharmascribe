import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { fetchAuthSession } from 'aws-amplify/auth'

// Helper to get Cognito user ID from request
async function getCognitoIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      // Parse the JWT token to get the sub claim
      const token = authHeader.substring(7)
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
        return payload.sub || null
      }
    }

    // Fallback: Get from cookie-based session
    const cognitoId = request.cookies.get('cognitoId')?.value
    return cognitoId || null
  } catch (error) {
    console.error('Failed to get Cognito ID:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const cognitoId = await getCognitoIdFromRequest(request)

    if (!cognitoId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { cognitoId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to get user:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}
