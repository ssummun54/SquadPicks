'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function OtpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const LENGTH = 8
  const [digits, setDigits] = useState(Array(LENGTH).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const update = (index: number, value: string) => {
    const char = value.replace(/\s/g, '').slice(-1).toUpperCase()
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < LENGTH - 1) refs.current[index + 1]?.focus()
    if (next.every(d => d !== '')) onComplete(next.join(''))
  }

  const onKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\s/g, '').slice(0, LENGTH).toUpperCase()
    if (!pasted) return
    e.preventDefault()
    const next = Array(LENGTH).fill('')
    pasted.split('').forEach((d, i) => { next[i] = d })
    setDigits(next)
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
    if (pasted.length === LENGTH) onComplete(pasted)
  }

  return (
    <div className="flex gap-1.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={d}
          onChange={e => update(i, e.target.value)}
          onKeyDown={e => onKeyDown(i, e)}
          onPaste={onPaste}
          className="w-10 h-12 text-center text-lg font-bold bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        />
      ))}
    </div>
  )
}

function VerifyOtpContent() {
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail]         = useState('')
  const [status, setStatus]       = useState<'idle' | 'verifying' | 'resending' | 'resent' | 'error'>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [editing, setEditing]     = useState(false)
  const [draftEmail, setDraftEmail] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('otp_email') ?? ''
    setEmail(stored)
    setDraftEmail(stored)
  }, [])

  const verify = async (code: string) => {
    setStatus('verifying')
    setErrorMsg('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' })
    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      sessionStorage.removeItem('otp_email')
      window.location.href = redirectTo
    }
  }

  const resend = async () => {
    setStatus('resending')
    setErrorMsg('')
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('resent')
    }
  }

  const applyNewEmail = () => {
    const trimmed = draftEmail.trim()
    if (!trimmed || trimmed === email) { setEditing(false); return }
    sessionStorage.setItem('otp_email', trimmed)
    window.location.href = `/register?email=${encodeURIComponent(trimmed)}`
  }

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
        <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      </div>

      <div className="w-full">
        <h1 className="text-xl font-bold text-slate-100 mb-1">Check your email</h1>

        {editing ? (
          <div className="mt-3 flex flex-col gap-2">
            <Input
              id="edit-email"
              type="email"
              value={draftEmail}
              onChange={e => setDraftEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyNewEmail() }}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              You&apos;ll be taken back to register with this email pre-filled.
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={applyNewEmail} className="flex-1">
                Update email
              </Button>
              <button
                type="button"
                onClick={() => { setEditing(false); setDraftEmail(email) }}
                className="flex-1 text-sm text-slate-400 hover:text-slate-200 border border-slate-600 rounded-lg px-3 py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mt-1">
              Enter the 8-character code sent to{' '}
              <span className="text-slate-200 font-medium">{email || 'your email'}</span>
              {email && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-accent hover:text-accent/80 text-xs underline underline-offset-2"
                  >
                    Wrong email?
                  </button>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">Can&apos;t find it? Check your spam folder.</p>
          </>
        )}
      </div>

      {!editing && <OtpInput onComplete={verify} />}

      {status === 'verifying' && (
        <p className="text-sm text-slate-400">Verifying…</p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 w-full">
          {errorMsg}
        </p>
      )}

      {status === 'resent' && (
        <p className="text-sm text-green-400 bg-green-950/40 border border-green-800 rounded-lg px-3 py-2 w-full">
          New code sent — check your inbox.
        </p>
      )}

      {!editing && (
        <p className="text-sm text-slate-400">
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={resend}
            disabled={status === 'resending'}
            className="text-accent hover:text-accent/80 font-medium disabled:opacity-50"
          >
            {status === 'resending' ? 'Sending…' : 'Resend code'}
          </button>
        </p>
      )}
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-slate-700 rounded-lg" />}>
      <VerifyOtpContent />
    </Suspense>
  )
}
