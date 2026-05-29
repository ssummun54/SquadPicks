import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const { secret, paths } = await req.json()

    if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const targets: string[] = Array.isArray(paths) ? paths : ['/leaderboard']
    targets.forEach(p => revalidatePath(p))

    return NextResponse.json({ revalidated: targets, ts: Date.now() })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
