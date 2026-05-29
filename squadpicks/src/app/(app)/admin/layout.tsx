import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const adminIds = (process.env.ADMIN_USER_IDS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (!user || !adminIds.includes(user.id)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
