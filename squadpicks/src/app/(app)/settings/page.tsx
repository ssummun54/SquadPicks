'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!confirm('Permanently delete your account and all your predictions? This cannot be undone.')) return
    setDeleting(true)
    setError('')

    const supabase = getSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong. Please contact hello@squadpicks.co.')
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/?deleted=1')
  }

  return (
    <div className="max-w-lg flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account.</p>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-200">Legal</h2>
          <p className="text-sm text-slate-400 mt-1">Review our policies.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/privacy" className="text-accent hover:text-accent/80 transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="text-accent hover:text-accent/80 transition-colors">Terms of Service</Link>
        </div>
      </section>

      <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
          <p className="text-sm text-slate-400 mt-1">
            Permanently delete your account and all associated data — predictions, group memberships, and profile. This cannot be undone.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-fit px-4 py-2 rounded-lg border border-red-700 text-red-400 text-sm font-medium hover:bg-red-950/40 disabled:opacity-40 transition-colors"
        >
          {deleting ? 'Deleting account…' : 'Delete my account'}
        </button>
      </section>
    </div>
  )
}
