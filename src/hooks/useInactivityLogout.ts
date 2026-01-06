"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds

export function useInactivityLogout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const logout = useCallback(async () => {
    try {
      // Clear localStorage tokens
      localStorage.removeItem('cognito_access_token')
      localStorage.removeItem('cognito_id_token')
      localStorage.removeItem('cognito_refresh_token')

      // Call logout API to clear httpOnly cookies
      await fetch('/api/auth/logout', { method: 'POST' })

      // Redirect to login with message
      router.push('/login?reason=inactivity')
    } catch (error) {
      console.error('Auto-logout error:', error)
      router.push('/login?reason=inactivity')
    }
  }, [router])

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT)
  }, [logout])

  useEffect(() => {
    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    // Set initial timer
    resetTimer()

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer])
}
