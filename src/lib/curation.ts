import type { SupabaseClient } from '@supabase/supabase-js'
import type { Game } from '@/lib/types'

// ══════════════════════════════════════════
// 기준값 — settings 테이블에 값이 있으면 그 값을, 없으면 기본값을 쓴다
// ══════════════════════════════════════════

export const CURATION_DEFAULTS = {
  minCriticReviews: 3, // 컬렉션·평론가 vs 유저에 포함될 최소 전문가 리뷰 수
  minUserReviews: 5,   // 평론가 vs 유저에 포함될 최소 유저 리뷰 수
}

export const SETTING_KEYS = {
  minCriticReviews: 'curation_min_critic_reviews',
  minUserReviews: 'curation_min_user_reviews',
  hidden: 'collections_hidden',  // JSON 배열 (slug)
  pinned: 'collections_pinned',  // JSON 배열 (slug, 순서대로 메인 노출)
} as const

export interface CurationSettings {
  minCriticReviews: number
  minUserReviews: number
  hidden: string[]
  pinned: string[]
}

function parseList(v: string | undefined): string[] {
  try {
    const arr = JSON.parse(v ?? '[]')
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch { return [] }
}

function parseCount(v: string | undefined, fallback: number): number {
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : fallback
}

export function parseCurationSettings(rows: { key: string; value: string }[] | null): CurationSettings {
  const get = (k: string) => rows?.find((r) => r.key === k)?.value
  return {
    minCriticReviews: parseCount(get(SETTING_KEYS.minCriticReviews), CURATION_DEFAULTS.minCriticReviews),
    minUserReviews: parseCount(get(SETTING_KEYS.minUserReviews), CURATION_DEFAULTS.minUserReviews),
    hidden: parseList(get(SETTING_KEYS.hidden)),
    pinned: parseList(get(SETTING_KEYS.pinned)),
  }
}

// ══════════════════════════════════════════
// 게임별 통계
// ══════════════════════════════════════════

export type GameStats = Game & {
  critic_count: number
  user_count: number
  user_score: number | null // 유저 별점 평균 × 20 (100점 환산, 반올림)
}

/** 공개 + 점수 있는 게임과 리뷰 통계, 큐레이션 설정을 한 번에 불러온다 */
export async function loadGameStats(supabase: SupabaseClient) {
  const [gamesRes, settingsRes] = await Promise.all([
    supabase
      .from('games')
      .select('*, critic_reviews(count), user_reviews(stars)')
      .eq('status', 'published')
      .not('critic_score', 'is', null),
    supabase.from('settings').select('key, value'),
  ])

  const games: GameStats[] = (gamesRes.data ?? []).map(({ critic_reviews, user_reviews, ...g }) => {
    const stars = ((user_reviews ?? []) as { stars: number }[]).map((r) => r.stars)
    return {
      ...(g as Game),
      critic_count: (critic_reviews as { count: number }[] | null)?.[0]?.count ?? 0,
      user_count: stars.length,
      user_score: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 20) : null,
    }
  })

  return { games, settings: parseCurationSettings(settingsRes.data) }
}

/** 점수 높은 순, 같으면 전문가 리뷰 많은 순 */
export function byScore(a: GameStats, b: GameStats) {
  return b.critic_score! - a.critic_score! || b.critic_count - a.critic_count
}

// ══════════════════════════════════════════
// 평론가 vs 유저
// ══════════════════════════════════════════

export type VsRow = GameStats & { diff: number } // 전문가 - 유저

export function criticVsUser(games: GameStats[], settings: CurationSettings) {
  const rows: VsRow[] = games
    .filter((g) => g.critic_count >= settings.minCriticReviews && g.user_count >= settings.minUserReviews)
    .map((g) => ({ ...g, diff: g.critic_score! - g.user_score! }))
  return {
    criticHigher: rows.filter((r) => r.diff > 0).sort((a, b) => b.diff - a.diff),
    userHigher: rows.filter((r) => r.diff < 0).sort((a, b) => a.diff - b.diff),
  }
}

// ══════════════════════════════════════════
// 자동 큐레이션 컬렉션
// ══════════════════════════════════════════

/** 비슷한 장르 묶음 — key는 주소용, noun은 제목용 */
const GENRE_GROUPS = [
  { key: 'rpg',       noun: 'RPG',                genres: ['RPG', '액션 RPG'] },
  { key: 'action',    noun: '액션 게임',          genres: ['액션', '액션 어드벤처'] },
  { key: 'adventure', noun: '어드벤처 게임',      genres: ['어드벤처'] },
  { key: 'shooter',   noun: '슈팅 게임',          genres: ['슈팅', 'FPS'] },
  { key: 'strategy',  noun: '전략·시뮬레이션 게임', genres: ['전략', '시뮬레이션'] },
  { key: 'sports',    noun: '스포츠 게임',        genres: ['스포츠', '레이싱'] },
  { key: 'indie',     noun: '인디 게임',          genres: ['인디'] },
]
const ALL_GENRES = { key: 'all', noun: '게임' }

function genreGroup(genre: string) {
  return GENRE_GROUPS.find((g) => g.genres.includes(genre)) ?? null
}

type Period = 'h1' | 'h2' | 'year'
const PERIOD_LABEL: Record<Period, string> = { h1: ' 상반기', h2: ' 하반기', year: '' }

export interface Collection {
  slug: string          // 예: 2026-h1-rpg
  title: string         // 예: 2026년 상반기 최고의 RPG
  year: number
  period: Period
  genreKey: string
  games: GameStats[]    // 점수 순 전체 (카드는 3개, 상세는 10개만 사용)
  size: number          // 포함된 게임 수
  hidden: boolean
  pinned: boolean
}

export const COLLECTION_MIN_GAMES = 3

/** 게임 → 속하는 기간 목록 (출시일이 없으면 연간만) */
function periodsOf(g: Game): Period[] {
  if (!g.release_date) return ['year']
  const month = Number(g.release_date.slice(5, 7))
  return [month <= 6 ? 'h1' : 'h2', 'year']
}

function periodYear(g: Game): number {
  return g.release_date ? Number(g.release_date.slice(0, 4)) : g.year
}

/** 기간이 끝나는 시점 — 최신 컬렉션 정렬용 (같은 끝이면 반기 > 연간) */
function recencyKey(c: Collection): number {
  const endMonth = c.period === 'h1' ? 6 : 12
  return c.year * 100 + endMonth + (c.period === 'year' ? 0 : 0.5)
}

export function buildCollections(games: GameStats[], settings: CurationSettings): Collection[] {
  const buckets = new Map<string, { year: number; period: Period; genre: typeof ALL_GENRES; games: GameStats[] }>()

  for (const g of games) {
    if (g.critic_count < settings.minCriticReviews) continue
    const year = periodYear(g)
    const group = genreGroup(g.genre)
    for (const period of periodsOf(g)) {
      for (const genre of group ? [ALL_GENRES, group] : [ALL_GENRES]) {
        const slug = `${year}-${period}-${genre.key}`
        const b = buckets.get(slug) ?? { year, period, genre, games: [] }
        b.games.push(g)
        buckets.set(slug, b)
      }
    }
  }

  const list: Collection[] = []
  for (const [slug, b] of buckets) {
    if (b.games.length < COLLECTION_MIN_GAMES) continue
    list.push({
      slug,
      title: `${b.year}년${PERIOD_LABEL[b.period]} 최고의 ${b.genre.noun}`,
      year: b.year,
      period: b.period,
      genreKey: b.genre.key,
      games: b.games.sort(byScore),
      size: b.games.length,
      hidden: settings.hidden.includes(slug),
      pinned: settings.pinned.includes(slug),
    })
  }

  // 최신 기간 → 전체 장르 먼저 → 1위 점수 높은 순
  return list.sort((a, b) =>
    recencyKey(b) - recencyKey(a) ||
    Number(b.genreKey === 'all') - Number(a.genreKey === 'all') ||
    b.games[0].critic_score! - a.games[0].critic_score!)
}

/** 메인 노출용 — 고정된 컬렉션 먼저(고정 순서대로), 나머지는 최신순 */
export function featuredCollections(all: Collection[], settings: CurationSettings, limit = 4): Collection[] {
  const visible = all.filter((c) => !c.hidden)
  const pinned = settings.pinned
    .map((slug) => visible.find((c) => c.slug === slug))
    .filter((c): c is Collection => !!c)
  const rest = visible.filter((c) => !c.pinned)
  return [...pinned, ...rest].slice(0, limit)
}
