import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: {
    default: 'SquadPicks — Predict. Compete. Win.',
    template: '%s | SquadPicks',
  },
  description:
    'Predict match scores and group standings for the 2026 FIFA World Cup. Compete in private groups or on the global leaderboard.',
  keywords: ['world cup 2026', 'prediction game', 'score predictor', 'football picks', 'squad picks'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SquadPicks',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    title: 'SquadPicks — Predict. Compete. Win.',
    description: 'Predict 2026 World Cup scores, group standings, and the full knockout bracket.',
    siteName: 'SquadPicks',
    images: [{ url: '/icons/icon-512.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SquadPicks — Predict. Compete. Win.',
    description: 'Predict 2026 World Cup scores, group standings, and the full knockout bracket.',
    images: ['/icons/icon-512.png'],
  },
  robots: { index: true, follow: true },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
