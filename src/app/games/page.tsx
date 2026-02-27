import { createClient } from '@/lib/supabase-server'
import GamesClient from './GamesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function GamesPage() {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .in('status', ['published', 'upcoming'])
    .order('critic_score', { ascending: false, nullsFirst: false })

  return <GamesClient games={games ?? []} />
}
