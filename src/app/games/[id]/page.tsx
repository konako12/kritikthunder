import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import GameDetailClient from './GameDetailClient'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const supabase = await createClient()
  const id = Number(idStr)

  const [gameRes, criticRes, userRes] = await Promise.all([
    supabase.from('games').select('*').eq('id', id).single(),
    supabase.from('critic_reviews').select('*').eq('game_id', id).order('score', { ascending: false }),
    supabase.from('user_reviews').select('*').eq('game_id', id).order('created_at', { ascending: false }),
  ])

  if (gameRes.error || !gameRes.data) notFound()

  const avgStars =
    userRes.data && userRes.data.length > 0
      ? userRes.data.reduce((sum, r) => sum + r.stars, 0) / userRes.data.length
      : 0

  return (
    <GameDetailClient
      game={gameRes.data}
      criticReviews={criticRes.data ?? []}
      userReviews={userRes.data ?? []}
      avgStars={avgStars}
    />
  )
}
