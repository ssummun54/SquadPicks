'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export function Navbar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen]           = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const signOut = async () => {
    setOpen(false)
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="text-lg font-black tracking-tight shrink-0 logo-gradient">
          SquadPicks
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          <NavLink href="/dashboard"   label="Home"         active={pathname === '/dashboard'} />
          <NavLink href="/seasons"     label="Events"       active={pathname.startsWith('/seasons')} />
          <NavLink href="/leaderboard" label="Leaderboard"  active={pathname.startsWith('/leaderboard')} />
          <NavLink href="/groups"      label="My Groups"    active={pathname.startsWith('/groups')} />
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden flex flex-col justify-center gap-1.5 w-8 h-8 text-slate-400 hover:text-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 bg-current transition-transform origin-center ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 bg-current transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-current transition-transform origin-center ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>

          {profile ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors"
              >
                <span className="hidden sm:block">@{profile.username}</span>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-xl py-1 text-sm">
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="text-sm text-accent hover:text-accent/80 font-medium transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="sm:hidden border-t border-slate-700 bg-slate-900 px-4 py-3 flex flex-col gap-1 text-sm">
          <MobileNavLink href="/dashboard"   label="Home"        active={pathname === '/dashboard'}            onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/seasons"     label="Events"      active={pathname.startsWith('/seasons')}      onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/leaderboard" label="Leaderboard" active={pathname.startsWith('/leaderboard')}  onClick={() => setMobileOpen(false)} />
          <MobileNavLink href="/groups"      label="My Groups"   active={pathname.startsWith('/groups')}       onClick={() => setMobileOpen(false)} />
        </nav>
      )}
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

function MobileNavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-3 py-3 rounded-lg transition-colors text-base ${
        active
          ? 'bg-brand/10 text-brand font-medium'
          : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
      }`}
    >
      {label}
    </Link>
  )
}
