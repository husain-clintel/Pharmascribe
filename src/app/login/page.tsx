'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Dna, Loader2, ArrowLeft } from 'lucide-react'
import { configureAmplify, cognitoSignIn, getCognitoSession } from '@/lib/auth/cognito'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    configureAmplify()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { success, error, result } = await cognitoSignIn(email, password)

      if (!success) {
        toast.error(error || 'Sign in failed. Please check your credentials.')
        setLoading(false)
        return
      }

      // Get the session to retrieve user info
      const session = await getCognitoSession()

      if (session.success && session.userId) {
        // Sync user to our database
        const syncRes = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cognitoId: session.userId,
            email: email
          })
        })

        if (syncRes.ok) {
          toast.success('Welcome back!')
          // Use full page navigation to ensure middleware sees the new cookies
          window.location.href = '/reports'
        } else {
          toast.error('Failed to sync user data')
        }
      } else {
        toast.success('Signed in successfully!')
        // Use full page navigation to ensure middleware sees the new cookies
        window.location.href = '/reports'
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50/50 via-orange-50/30 to-white flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#ff6b6b]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#ff8e53]/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-lg shadow-red-200/50">
                <Dna className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">
                Welcome Back
              </span>
            </CardTitle>
            <CardDescription>
              Sign in to your PharmaScribe account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] shadow-lg shadow-red-200/50 border-0"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#ff6b6b] hover:text-[#ff5252] font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
