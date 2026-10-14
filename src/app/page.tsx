import { createClient } from '@/lib/supabase-server'
import type { Game, CriticReview, NewsWithGame } from '@/lib/types'
import { NEWS_PUBLIC_SELECT } from '@/lib/news'
import { buildCollections, featuredCollections, loadGameStats } from '@/lib/curation'
import { ddayLabel, isNotYetReleased, todayKst } from '@/lib/dday'
import HomeClient from './HomeClient'

// 요청마다 서버에서 새로 그림 (로그인 쿠키를 읽어 원래도 캐시되지 않음) — 출시 D-day가 날짜가 바뀌어도 그대로 남지 않게.
// 나중에 정적 캐시로 바꾸더라도 1시간보다 오래 묵지 않도록 revalidate 상한을 둠.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function HomePage() {
  const supabase = await createClient()

  // 병렬 데이터 fetch
  const [gamesRes, reviewsRes, settingsRes, stats, newsRes] = await Promise.all([
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase
      .from('critic_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(24), // 게임 정보가 없는 리뷰를 걸러낸 뒤 8개만 씀
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
  //   출시일이 지난 게임은 상태가 아직 '출시 예정'이어도 제외 (한국 시간 기준)
  const today = todayKst()
  const upcoming  = games
    .filter((g) => g.status === 'upcoming' && isNotYetReleased(g, today))
    .sort((a, b) =>
      a.release_date && b.release_date ? a.release_date.localeCompare(b.release_date)
      : a.release_date ? -1
      : b.release_date ? 1
      : a.year - b.year || a.title.localeCompare(b.title)
    )
    .map((g) => ({ ...g, dday: ddayLabel(g.release_date, today) }))
  // KRITIK 최고 평점 — 전문가 점수가 있는 게임만 (5개 미만이면 있는 만큼)
  const top5      = published
    .filter((g) => g.critic_score !== null)
    .sort((a, b) => b.critic_score! - a.critic_score!)
    .slice(0, 5)

  // 전문가 최신 한줄평 — 공개(또는 출시 예정) 게임에 연결된 리뷰만
  const visibleGames = new Map(
    games.filter((g) => g.status === 'published' || g.status === 'upcoming').map((g) => [g.id, g]))
  const latestReviews = reviews
    .filter((r) => visibleGames.has(r.game_id))
    .slice(0, 8)
    .map((r) => {
      const g = visibleGames.get(r.game_id)!
      return { ...r, game: { id: g.id, title: g.title, cover_url: g.cover_url } }
    })
  const featured  = games.find((g) => g.id === featuredId && (g.status === 'published' || g.status === 'upcoming')) ?? published[0]

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
      reviews={latestReviews}
      upcoming={upcoming}
      collections={collections}
      allGames={published}
      news={(newsRes.data ?? []) as NewsWithGame[]}
    />
  )
}
