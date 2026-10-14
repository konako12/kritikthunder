import { createClient } from '@/lib/supabase-server'
import type { Game, CriticReview, NewsWithGame } from '@/lib/types'
import { NEWS_PUBLIC_SELECT } from '@/lib/news'
import { buildCollections, featuredCollections, loadGameStats } from '@/lib/curation'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // 60초마다 재생성

export default async function HomePage() {
  const supabase = await createClient()

  // 병렬 데이터 fetch
  const [gamesRes, reviewsRes, settingsRes, stats, newsRes] = await Promise.all([
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase
      .from('critic_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('settings').select('*'),
    loadGameStats(supabase),
    // 최신 게임 뉴스 — 메인 고정 우선(노출 순서), 그다음 최신순 4개
    supabase
      .from('news')
      .select(NEWS_PUBLIC_SELECT)
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('sort_order')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const games: Game[] = gamesRes.data ?? []
  const reviews: CriticReview[] = reviewsRes.data ?? []
  const featuredId = Number(
    settingsRes.data?.find((s) => s.key === 'featured_game_id')?.value ?? 1
  )

  const published = games.filter((g) => g.status === 'published')
  // 출시 예정 기대작 — 출시일이 가까운 순 (날짜 없는 게임은 연도순으로 뒤에)
  const upcoming  = games
    .filter((g) => g.status === 'upcoming')
    .sort((a, b) =>
      a.release_date && b.release_date ? a.release_date.localeCompare(b.release_date)
      : a.release_date ? -1
      : b.release_date ? 1
      : a.year - b.year || a.title.localeCompare(b.title)
    )
  const top5      = [...published].sort((a, b) => (b.critic_score ?? 0) - (a.critic_score ?? 0)).slice(0, 5)
  const featured  = games.find((g) => g.id === featuredId) ?? published[0]

  // 히어로 어콜레이드 — 에디터 픽 게임의 최신 전문가 리뷰 6개
  const heroReviewsRes = featured
    ? await supabase
        .from('critic_reviews')
        .select('*')
        .eq('game_id', featured.id)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)
    : null
  const heroReviews: CriticReview[] = heroReviewsRes?.data ?? []

  // 추천 컬렉션 — 고정 우선, 최근 기간 순 4개 (카드에는 상위 3개만 필요)
  const collections = featuredCollections(buildCollections(stats.games, stats.settings), stats.settings)
    .map((c) => ({ ...c, games: c.games.slice(0, 3) }))

  return (
    <HomeClient
      featured={featured}
      heroReviews={heroReviews}
      top5={top5}
      recent={published}
      reviews={reviews}
      upcoming={upcoming}
      collections={collections}
      allGames={published}
      news={(newsRes.data ?? []) as NewsWithGame[]}
    />
  )
}
