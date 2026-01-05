import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID
    const region = userPoolId?.split('_')[0] || 'us-east-1'

    // Make direct API call to Cognito from server side
    const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      })
    })

    const data = await response.json()

    if (data.__type) {
      // Error response
      return NextResponse.json({ error: data.message || data.__type }, { status: 400 })
    }

    if (data.AuthenticationResult) {
      const response = NextResponse.json({
        success: true,
        accessToken: data.AuthenticationResult.AccessToken,
        idToken: data.AuthenticationResult.IdToken,
        refreshToken: data.AuthenticationResult.RefreshToken
      })

      // Set cookies for middleware to detect authenticated state
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      }

      // Set access token cookie (used by middleware for auth check)
      response.cookies.set(
        `CognitoIdentityServiceProvider.${clientId}.accessToken`,
        data.AuthenticationResult.AccessToken,
        cookieOptions
      )

      // Set ID token cookie
      response.cookies.set(
        `CognitoIdentityServiceProvider.${clientId}.idToken`,
        data.AuthenticationResult.IdToken,
        cookieOptions
      )

      // Set refresh token if available
      if (data.AuthenticationResult.RefreshToken) {
        response.cookies.set(
          `CognitoIdentityServiceProvider.${clientId}.refreshToken`,
          data.AuthenticationResult.RefreshToken,
          cookieOptions
        )
      }

      return response
    }

    if (data.ChallengeName) {
      return NextResponse.json({
        success: false,
        challenge: data.ChallengeName,
        session: data.Session
      })
    }

    return NextResponse.json({ error: 'Unknown response from Cognito' }, { status: 500 })
  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 })
  }
}
