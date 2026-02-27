export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) redirect('/login')

  const supabase = createAdminClient()

  const [gamesRes, journalistsRes, reportsRes, settingsRes] = await Promise.all([
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase.from('journalists').select('*').order('joined_at', { ascending: false }),
    supabase.from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('settings').select('*'),
  ])

  const featuredId = Number(
    settingsRes.data?.find((s) => s.key === 'featured_game_id')?.value ?? 1
  )

  return (
    <AdminClient
      initGames={gamesRes.data ?? []}
      initJournalists={journalistsRes.data ?? []}
      initReports={reportsRes.data ?? []}
      featuredGameId={featuredId}
    />
  )
}
