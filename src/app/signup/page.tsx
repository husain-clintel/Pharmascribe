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
import { configureAmplify, cognitoSignUp, cognitoConfirmSignUp, cognitoSignIn, getCognitoSession } from '@/lib/auth/cognito'

type Step = 'signup' | 'confirm'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    configureAmplify()
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const { success, error, result } = await cognitoSignUp(email, password, name)

      if (!success) {
        toast.error(error || 'Failed to sign up')
        setLoading(false)
        return
      }

      // Check if user needs to confirm
      if (result?.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        toast.success('Verification code sent to your email')
        setStep('confirm')
      } else {
        // Auto-confirmed (e.g., admin-created user)
        toast.success('Account created successfully!')
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { success, error } = await cognitoConfirmSignUp(email, confirmationCode)

      if (!success) {
        toast.error(error || 'Failed to verify code')
        setLoading(false)
        return
      }

      toast.success('Email verified! Signing you in...')

      // Auto sign in after confirmation
      const signInResult = await cognitoSignIn(email, password)
      if (signInResult.success) {
        const session = await getCognitoSession()
        if (session.success && session.userId) {
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cognitoId: session.userId,
              email: email,
              name: name
            })
          })
        }
        router.push('/reports')
      } else {
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Confirm error:', error)
      toast.error(error.message || 'Failed to verify')
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
                {step === 'signup' ? 'Create Account' : 'Verify Email'}
              </span>
            </CardTitle>
            <CardDescription>
              {step === 'signup'
                ? 'Sign up to start creating regulatory reports'
                : 'Enter the verification code sent to your email'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'signup' ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (Optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
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
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    required
                    disabled={loading}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
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
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('signup')}
                  disabled={loading}
                >
                  Back to signup
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-[#ff6b6b] hover:text-[#ff5252] font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
