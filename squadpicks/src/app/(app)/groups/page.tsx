import { getSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Groups' }

export default async function GroupsPage() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('pick_group_members')
    .select(`
      role,
      pick_groups(
        id, name, invite_code, created_at,
        seasons(id, name),
        pick_group_members(count)
      )
    `)
    .eq('user_id', user!.id)
    .order('joined_at', { ascending: false })

  const groups = (memberships ?? []).map((m: any) => ({ ...m.pick_groups, myRole: m.role })).filter(Boolean)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100">My Groups</h1>
          <p className="text-slate-400 mt-1">Compete with your friends in a private mini-league.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/groups/join"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 text-sm font-medium hover:border-accent transition-colors"
          >
            Join group
          </Link>
          <Link
            href="/groups/new"
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            + Create group
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/50 p-12 text-center flex flex-col items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div className="font-semibold text-slate-200">No groups yet</div>
          <p className="text-slate-400 text-sm max-w-sm">
            Create a group and share the invite code with your friends. Everyone predicts privately until kickoff.
          </p>
          <Link href="/groups/new" className="px-6 py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors">
            Create my first group
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {groups.map((g: any) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="rounded-xl border border-slate-700 bg-slate-800 p-6 flex flex-col gap-3 hover:border-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-100">{g.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{g.seasons?.name}</div>
                </div>
                {g.myRole === 'admin' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600/10 text-yellow-400 border border-yellow-600/20 shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">
                Invite code:{' '}
                <span className="font-mono font-bold text-accent">{g.invite_code}</span>
              </div>
            </Link>
          ))}

          <Link
            href="/groups/new"
            className="rounded-xl border border-dashed border-slate-700 p-6 flex items-center justify-center text-slate-400 hover:text-accent hover:border-accent transition-colors text-sm font-medium"
          >
            + Create another group
          </Link>
        </div>
      )}
    </div>
  )
}
