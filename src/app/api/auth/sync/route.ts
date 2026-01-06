import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// Admin emails should be configured via environment variable
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function POST(request: NextRequest) {
  try {
    const { cognitoId, email, name } = await request.json()

    if (!cognitoId || !email) {
      return NextResponse.json(
        { error: 'cognitoId and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { cognitoId }
    })

    if (user) {
      // Update existing user if needed (but never change role via sync)
      user = await prisma.user.update({
        where: { cognitoId },
        data: {
          email,
          ...(name && { name })
        }
      })
    } else {
      // Check if this is an admin user based on environment config
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase())

      // Create new user
      user = await prisma.user.create({
        data: {
          cognitoId,
          email,
          name,
          role: isAdmin ? 'ADMIN' : 'USER'
        }
      })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })
  } catch (error) {
    console.error('Failed to sync user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
