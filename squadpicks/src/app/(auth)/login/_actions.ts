'use server'

import { getSupabaseServer } from '@/lib/supabase/server'

export async function loginAction(email: string, password: string, redirectTo: string = '/dashboard') {
  const supabase = await getSupabaseServer()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  return { success: true }
}

export async function registerAction(email: string, password: string, username: string) {
  const supabase = await getSupabaseServer()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username },
    },
  })

  if (error) return { error: error.message }

  return { success: true }
}
