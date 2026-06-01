import Link from 'next/link'

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="text-lg font-black tracking-tight logo-gradient">
          SquadPicks
        </Link>
      </header>
      {children}
    </div>
  )
}
