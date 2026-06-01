import { getSupabaseServer } from '@/lib/supabase/server'
import { Navbar } from '@/components/nav/Navbar'

export default async function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
