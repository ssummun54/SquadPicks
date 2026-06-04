'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Reset your password</h1>
      <p className="text-sm text-slate-400 mb-6">
        Enter your email and we'll send you a link to set a new password.
      </p>

      {sent ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-green-700/40 bg-green-950/20 px-4 py-3 text-sm text-green-400">
            Check your inbox — a reset link is on its way. Check your spam folder if you don't see it.
          </div>
          <Link href="/login" className="text-sm text-accent hover:text-accent/80 text-center transition-colors">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button type="submit" loading={loading} disabled={!email.trim()} className="w-full">
            Send reset link
          </Button>
          <p className="text-sm text-slate-400 text-center">
            <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </>
  )
}
