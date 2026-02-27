import { createClient } from '@/lib/supabase-server'
import RankingClient from './RankingClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .not('critic_score', 'is', null)
    .order('critic_score', { ascending: false })

  return <RankingClient games={games ?? []} />
}
