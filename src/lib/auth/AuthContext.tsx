'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { configureAmplify, getCognitoUser, getCognitoSession, cognitoSignOut } from './cognito'

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshUser: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { success, user: cognitoUser } = await getCognitoUser()
      if (success && cognitoUser) {
        // Get user details from our database
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const userData = await res.json()
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role
          })
        } else {
          // User exists in Cognito but not in our DB yet - create them
          const createRes = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cognitoId: cognitoUser.userId,
              email: cognitoUser.signInDetails?.loginId || cognitoUser.username || '',
              name: undefined
            })
          })
          if (createRes.ok) {
            const userData = await createRes.json()
            setUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role
            })
          }
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = async () => {
    await cognitoSignOut()
    setUser(null)
    window.location.href = '/login'
  }

  useEffect(() => {
    // Configure Amplify on mount
    configureAmplify()
    refreshUser()
  }, [refreshUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
