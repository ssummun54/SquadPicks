'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

export function LandingClient() {
  const [scrollY, setScrollY] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const vh = mounted ? window.innerHeight : 800
  // 0 → 1 as user scrolls through the first 60% of the hero
  const progress = Math.min(scrollY / (vh * 0.6), 1)

  const heroOpacity  = Math.max(0, 1 - progress * 1.4)
  const heroScale    = 1 - progress * 0.15
  const heroTranslateY = progress * -30

  const navOpacity   = Math.min(1, Math.max(0, (progress - 0.4) * 3))
  const navBlur      = navOpacity > 0.05

  return (
    <>
      {/* ── Fixed nav ──────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 transition-colors duration-300 ${
          navBlur ? 'border-b border-slate-700 bg-slate-900/90 backdrop-blur' : ''
        }`}
        style={{ opacity: navOpacity }}
      >
        <span className="text-lg font-black tracking-tight logo-gradient">SquadPicks</span>
        <div className="flex items-center gap-3">
          <Link href="/login"    className="text-sm text-slate-400 hover:text-slate-100 transition-colors">Sign in</Link>
          <Link href="/register" className="px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors">
            Get started
          </Link>
        </div>
      </header>

      {/* ── Hero — full viewport ────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div
          style={{
            opacity:    heroOpacity,
            transform:  `scale(${heroScale}) translateY(${heroTranslateY}px)`,
            willChange: 'transform, opacity',
          }}
        >
          <span className="animate-dramatic text-7xl sm:text-9xl font-black logo-gradient font-heading">
            SquadPicks
          </span>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-10 flex flex-col items-center gap-2"
          style={{ opacity: Math.max(0, 1 - progress * 4) }}
        >
          <span className="text-xs text-slate-500 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-slate-500 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── Main content ────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-12 pb-24 gap-8">
        <ScrollReveal>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-slate-100 max-w-3xl">
            Predict.<br />
            <span className="logo-gradient">Compete.</span><br />
            Win.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <p className="text-lg text-slate-400 max-w-xl">
            Get your squad together. Pick every result, call the bracket, and see how you stack up — across every tournament that matters.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="px-8 py-3 rounded-lg font-semibold bg-brand text-white hover:bg-brand-dark transition-colors"
            >
              Start predicting — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 rounded-lg font-semibold border border-slate-600 text-slate-300 hover:border-accent hover:text-accent hover:bg-accent/10 transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/leaderboard"
              className="px-8 py-3 rounded-lg font-semibold border border-slate-600 text-slate-300 hover:border-accent hover:text-accent hover:bg-accent/10 transition-all duration-200"
            >
              View leaderboard
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 text-center">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 120}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-accent">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-100">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-slate-700 px-6 py-8 text-center text-slate-400 text-sm">
        <p>SquadPicks is a free prediction game — no real money or prizes involved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/login"       className="hover:text-slate-100 transition-colors">Login</Link>
          <Link href="/register"    className="hover:text-slate-100 transition-colors">Register</Link>
          <Link href="/leaderboard" className="hover:text-slate-100 transition-colors">Leaderboard</Link>
          <Link href="/privacy"     className="hover:text-slate-100 transition-colors">Privacy</Link>
          <Link href="/terms"       className="hover:text-slate-100 transition-colors">Terms</Link>
        </div>
      </footer>
    </>
  )
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <rect width="14" height="10" x="5" y="11" rx="2" />
      </svg>
    ),
    title: 'Sealed until kickoff',
    desc: 'No one sees your picks until the first ball is kicked. No copying, no gaming the system.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Private groups',
    desc: 'Create a mini-league with a shareable invite code and compete against your crew.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    title: 'Global leaderboard',
    desc: 'See how you rank against every player on the platform, updated live after each match.',
  },
]
