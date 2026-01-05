import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js'

// Get user pool instance
function getUserPool() {
  const poolData = {
    UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
    ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || ''
  }
  return new CognitoUserPool(poolData)
}

// Configure (no-op for compatibility)
export function configureAmplify() {
  console.log('Cognito config:', {
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  })
}

// Parse JWT token to get payload
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}

// Sign in with email and password using server-side API route
export async function cognitoSignIn(email: string, password: string): Promise<{
  success: boolean
  error?: string
  result?: any
  challenge?: string
  session?: string
}> {
  try {
    console.log('Attempting sign in for:', email)
    console.log('Password length:', password.length, 'chars')

    // Call server-side API route to avoid browser/CORS issues
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()
    console.log('Auth response:', data)

    if (data.error) {
      return { success: false, error: data.error }
    }

    if (data.challenge) {
      return {
        success: false,
        error: `Authentication challenge: ${data.challenge}`,
        challenge: data.challenge,
        session: data.session
      }
    }

    if (data.success && data.idToken) {
      // Store tokens in localStorage
      localStorage.setItem('cognito_access_token', data.accessToken)
      localStorage.setItem('cognito_id_token', data.idToken)
      if (data.refreshToken) {
        localStorage.setItem('cognito_refresh_token', data.refreshToken)
      }

      console.log('Sign in succeeded!')
      return { success: true, result: data }
    }

    return { success: false, error: 'Unknown response from server' }
  } catch (error: any) {
    console.error('Sign in error:', error)
    return { success: false, error: error.message || 'Failed to sign in' }
  }
}

// Sign up with email and password
export async function cognitoSignUp(email: string, password: string, name?: string): Promise<{
  success: boolean
  error?: string
  result?: any
}> {
  return new Promise((resolve) => {
    const userPool = getUserPool()

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: email })
    ]

    if (name) {
      attributeList.push(new CognitoUserAttribute({ Name: 'name', Value: name }))
    }

    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        console.error('Sign up error:', err)
        resolve({ success: false, error: err.message || 'Failed to sign up' })
        return
      }
      resolve({ success: true, result })
    })
  })
}

// Confirm sign up with verification code
export async function cognitoConfirmSignUp(email: string, code: string): Promise<{
  success: boolean
  error?: string
  result?: any
}> {
  return new Promise((resolve) => {
    const userPool = getUserPool()
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool
    })

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        console.error('Confirm sign up error:', err)
        resolve({ success: false, error: err.message || 'Failed to confirm sign up' })
        return
      }
      resolve({ success: true, result })
    })
  })
}

// Sign out
export async function cognitoSignOut(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Clear localStorage tokens
    localStorage.removeItem('cognito_access_token')
    localStorage.removeItem('cognito_id_token')
    localStorage.removeItem('cognito_refresh_token')

    // Clear cookies via logout API
    await fetch('/api/auth/logout', { method: 'POST' })

    // Also sign out from Cognito user pool
    const userPool = getUserPool()
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) {
      cognitoUser.signOut()
    }

    return { success: true }
  } catch (error: any) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message || 'Failed to sign out' }
  }
}

// Get current authenticated user
export async function getCognitoUser(): Promise<{
  success: boolean
  user: any
}> {
  try {
    // First check localStorage
    const idToken = localStorage.getItem('cognito_id_token')
    if (idToken) {
      const payload = parseJwt(idToken)
      if (payload) {
        return {
          success: true,
          user: {
            userId: payload.sub,
            username: payload.email || payload['cognito:username'],
            signInDetails: { loginId: payload.email }
          }
        }
      }
    }

    // Fallback to user pool
    const userPool = getUserPool()
    const cognitoUser = userPool.getCurrentUser()
    if (cognitoUser) {
      return {
        success: true,
        user: {
          userId: cognitoUser.getUsername(),
          username: cognitoUser.getUsername(),
          signInDetails: { loginId: cognitoUser.getUsername() }
        }
      }
    }

    return { success: false, user: null }
  } catch (error) {
    return { success: false, user: null }
  }
}

// Get auth session with tokens
export async function getCognitoSession(): Promise<{
  success: boolean
  session?: any
  accessToken?: string
  idToken?: string
  userId?: string
}> {
  try {
    // First check localStorage for tokens
    const accessToken = localStorage.getItem('cognito_access_token')
    const idToken = localStorage.getItem('cognito_id_token')

    if (idToken) {
      const payload = parseJwt(idToken)
      return {
        success: true,
        session: { tokens: { accessToken, idToken } },
        accessToken: accessToken || undefined,
        idToken,
        userId: payload?.sub
      }
    }

    return { success: false, session: null }
  } catch (error) {
    return { success: false, session: null }
  }
}

// Get user ID (sub) from current session
export async function getCognitoUserId(): Promise<string | null> {
  try {
    // First check localStorage
    const idToken = localStorage.getItem('cognito_id_token')
    if (idToken) {
      const payload = parseJwt(idToken)
      return payload?.sub || null
    }

    return null
  } catch (error) {
    return null
  }
}
