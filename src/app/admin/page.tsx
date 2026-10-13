export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase-server'
import { buildCollections, loadGameStats } from '@/lib/curation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()
  if (!user) redirect('/login')

  // 관리자 이메일 검증 (서버 전용 환경변수)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(user.email!)) redirect('/login')

  const supabase = createAdminClient()

  const [gamesRes, journalistsRes, reportsRes, settingsRes, criticRes, stats] = await Promise.all([
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase.from('journalists').select('*').order('joined_at', { ascending: false }),
    supabase.from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('settings').select('*'),
    supabase.from('critic_reviews').select('*').order('published_at', { ascending: false }),
    loadGameStats(supabase),
  ])

  const featuredId = Number(
    settingsRes.data?.find((s) => s.key === 'featured_game_id')?.value ?? 1
  )

  const collections = buildCollections(stats.games, stats.settings).map((c) => ({
    slug: c.slug, title: c.title, size: c.size, top3: c.games.slice(0, 3).map((g) => g.title),
  }))

  return (
    <AdminClient
      initGames={gamesRes.data ?? []}
      initJournalists={journalistsRes.data ?? []}
      initReports={reportsRes.data ?? []}
      initCriticReviews={criticRes.data ?? []}
      collections={collections}
      curationSettings={stats.settings}
      featuredGameId={featuredId}
    />
  )
}
