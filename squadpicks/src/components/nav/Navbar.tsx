'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export function Navbar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router   = useRouter()

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="text-lg font-black tracking-tight shrink-0 logo-gradient">
          SquadPicks
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <NavLink href="/dashboard"  label="Home"          active={pathname === '/dashboard'} />
          <NavLink href="/seasons"    label="Events"        active={pathname.startsWith('/seasons')} />
          <NavLink href="/leaderboard" label="Leaderboard"  active={pathname.startsWith('/leaderboard')} />
          <NavLink href="/groups"     label="My Groups"     active={pathname.startsWith('/groups')} />
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 hidden sm:block">@{profile.username}</span>
          <button
            onClick={signOut}
            className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-brand/10 text-brand font-medium'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
      }`}
    >
      {label}
    </Link>
  )
}
