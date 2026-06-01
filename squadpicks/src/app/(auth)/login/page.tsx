'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function GoogleButton() {
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-900 text-slate-200 text-sm font-medium hover:border-slate-400 disabled:opacity-50 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.583c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.583 9 3.583z" fill="#EA4335"/>
      </svg>
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}

const schema = z.object({
  email:    z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type Fields = z.infer<typeof schema>

function LoginForm() {
  const searchParams = useSearchParams()
  const [serverErr, setServerErr] = useState('')
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Fields) => {
    setServerErr('')
    setUnconfirmedEmail('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(data.email)
      } else {
        setServerErr(error.message)
      }
      return
    }
    window.location.href = searchParams.get('redirect') ?? '/dashboard'
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Email"
        id="email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        id="password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {serverErr && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
          {serverErr}
        </p>
      )}

      {unconfirmedEmail && (
        <div className="text-sm bg-amber-950/40 border border-amber-700 rounded-lg px-3 py-2">
          <p className="text-amber-300 font-medium mb-1">Email not verified</p>
          <p className="text-amber-400/80 mb-2">
            Check your inbox for the confirmation link.
          </p>
          <a
            href={`/verify-otp?email=${encodeURIComponent(unconfirmedEmail)}`}
            className="text-accent hover:text-accent/80 font-medium underline underline-offset-2"
          >
            Resend confirmation email
          </a>
        </div>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full mt-1">
        Sign in
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100 mb-1">Welcome back</h1>
      <p className="text-sm text-slate-400 mb-6">Sign in to your SquadPicks account</p>

      <GoogleButton />

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse bg-slate-700 rounded-lg" />}>
        <LoginForm />
      </Suspense>

      <p className="text-sm text-slate-400 text-center mt-6">
        No account?{' '}
        <Link href="/register" className="text-accent hover:text-accent/80 font-medium">
          Register free
        </Link>
      </p>
    </>
  )
}
