import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Auth' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="text-2xl font-black tracking-tight mb-8 logo-gradient">
        SquadPicks
      </Link>
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl">
        {children}
      </div>
    </div>
  )
}
