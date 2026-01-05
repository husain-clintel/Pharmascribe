'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export function UserMenu() {
  const { user, isAuthenticated, loading, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="h-4 w-4 animate-pulse bg-gray-200 rounded-full" />
      </Button>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm" className="bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] border-0">
            Sign Up
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] text-white">
          <User className="h-3 w-3" />
        </div>
        <span className="hidden sm:inline-block max-w-[100px] truncate">
          {user?.name || user?.email?.split('@')[0]}
        </span>
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg border z-50">
          <div className="py-1">
            {/* User info */}
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
              {user?.role === 'ADMIN' && (
                <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-[#ff6b6b]/10 text-[#ff6b6b]">
                  Admin
                </span>
              )}
            </div>

            {/* Menu items */}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
