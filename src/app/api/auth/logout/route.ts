import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID

    const response = NextResponse.json({ success: true })

    // Clear all Cognito-related cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0 // Expire immediately
    }

    response.cookies.set(
      `CognitoIdentityServiceProvider.${clientId}.accessToken`,
      '',
      cookieOptions
    )

    response.cookies.set(
      `CognitoIdentityServiceProvider.${clientId}.idToken`,
      '',
      cookieOptions
    )

    response.cookies.set(
      `CognitoIdentityServiceProvider.${clientId}.refreshToken`,
      '',
      cookieOptions
    )

    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 })
  }
}
