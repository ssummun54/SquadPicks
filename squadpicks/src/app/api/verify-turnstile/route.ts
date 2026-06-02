import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  const data = await res.json()
  console.log('[turnstile]', JSON.stringify(data))

  if (!data.success) {
    return NextResponse.json({ error: 'Bot check failed', codes: data['error-codes'] }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
