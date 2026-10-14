import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { scoreClass } from '@/lib/utils'
import { PLATFORM_TABS, parsePlatform, platformLabel } from '@/lib/platforms'
import type { Game } from '@/lib/types'
import s from './releases.module.css'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

type SearchParams = Promise<{ month?: string; platform?: string }>

interface Filters {
  year: number
  month: number // 1–12
  platform: string | null
}

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

function parseFilters(sp: Awaited<SearchParams>): Filters {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(sp.month ?? '')
  const [y, mo] = m ? [Number(m[1]), Number(m[2])] : todayKst().split('-').map(Number)
  return { year: y, month: mo, platform: parsePlatform(sp.platform) }
}

const pad = (n: number) => String(n).padStart(2, '0')
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`

function shiftMonth(f: Filters, delta: number) {
  const d = new Date(Date.UTC(f.year, f.month - 1 + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

function hrefWith(f: Filters, patch: Partial<Filters>): string {
  const next = { ...f, ...patch }
  const q = new URLSearchParams()
  if (monthKey(next.year, next.month) !== todayKst().slice(0, 7)) q.set('month', monthKey(next.year, next.month))
  if (next.platform) q.set('platform', next.platform)
  const qs = q.toString()
  return qs ? `/releases?${qs}` : '/releases'
}

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const f = parseFilters(await searchParams)
  return { title: `${f.year}년 ${f.month}월 출시 일정 | KRITIK` }
}

export default async function ReleasesPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams)
  const today = todayKst()
  const prev = shiftMonth(filters, -1)
  const next = shiftMonth(filters, 1)
  const start = `${monthKey(filters.year, filters.month)}-01`
  const end = `${monthKey(next.year, next.month)}-01`

  const supabase = await createClient()
  let monthQ = supabase
    .from('games')
    .select('*')
    .in('status', ['published', 'upcoming'])
    .gte('release_date', start)
    .lt('release_date', end)
    .order('release_date')
    .order('title')
  let tbdQ = supabase
    .from('games')
    .select('*')
    .eq('status', 'upcoming')
    .is('release_date', null)
    .order('year')
    .order('title')
  if (filters.platform) {
    monthQ = monthQ.contains('platforms', [filters.platform])
    tbdQ = tbdQ.contains('platforms', [filters.platform])
  }
  const [monthRes, tbdRes] = await Promise.all([monthQ, tbdQ])
  const monthGames: Game[] = monthRes.data ?? []
  const tbdGames: Game[] = tbdRes.data ?? []

  // 날짜별 묶음
  const byDate = new Map<string, Game[]>()
  for (const g of monthGames) {
    const list = byDate.get(g.release_date!) ?? []
    list.push(g)
    byDate.set(g.release_date!, list)
  }

  return (
    <div className={s.root}>

      {/* HEADER */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <nav>
            <Link href="/games">게임</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/collections">컬렉션</Link>
            <Link href="/releases" className={s.navActive}>출시 일정</Link>
            <Link href="/news">뉴스</Link>
          </nav>
        </div>
      </header>

      {/* PAGE HERO */}
      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>RELEASES</div>
          <h1 className={s.pageHeroTitle}>출시 일정</h1>
          <p className={s.pageHeroSub}>날짜별 게임 출시 캘린더</p>
        </div>
      </div>

      <div className={s.container}>

        {/* 월 이동 */}
        <div className={s.monthNav}>
          <Link href={hrefWith(filters, prev)} className={s.monthBtn}>◀ 이전 달</Link>
          <div className={s.monthTitle}>{filters.year}년 {filters.month}월</div>
          <Link href={hrefWith(filters, next)} className={s.monthBtn}>다음 달 ▶</Link>
        </div>

        {/* 플랫폼 필터 */}
        <div className={s.chips}>
          <Link href={hrefWith(filters, { platform: null })} className={`${s.chip} ${!filters.platform ? s.chipActive : ''}`}>전체</Link>
          {PLATFORM_TABS.map((p) => (
            <Link key={p.value} href={hrefWith(filters, { platform: p.value })} className={`${s.chip} ${filters.platform === p.value ? s.chipActive : ''}`}>
              {p.label}
            </Link>
          ))}
        </div>

        {/* 날짜별 목록 */}
        {byDate.size === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📅</div>
            <div>{filters.month}월에 출시되는 게임이 없어요</div>
          </div>
        ) : (
          <div className={s.days}>
            {[...byDate].map(([date, list]) => (
              <section key={date} className={`${s.day} ${date === today ? s.dayToday : ''}`}>
                <div className={s.dayHead}>
                  <span className={s.dayLabel}>{dayLabel(date)}</span>
                  {date === today && <span className={s.todayBadge}>오늘</span>}
                </div>
                <div className={s.dayGames}>
                  {list.map((g) => (
                    <GameRow key={g.id} game={g} showScore={g.critic_score !== null && date <= today} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 출시일 미정 */}
        {tbdGames.length > 0 && (
          <section className={s.tbd}>
            <div className={s.tbdHead}>
              <span className={s.tbdTitle}>출시일 미정</span>
              <span className={s.tbdCount}>{tbdGames.length}</span>
            </div>
            <div className={s.tbdGrid}>
              {tbdGames.map((g) => (
                <GameRow key={g.id} game={g} showScore={false} note={`${g.year}년 예정`} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.ftLogo}>KRIT<span>IK</span></div>
            <div className={s.ftSub}>국내 게임 전문 평점 서비스</div>
          </div>
          <div>
            <div className={s.ftText}>© 2025 KRITIK. All rights reserved.</div>
            <div className={s.pressLinks}>
              <Link href="/login">기자 로그인</Link>
              {' · '}
              <Link href="/register">기자 가입 신청</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function GameRow({ game: g, showScore, note }: { game: Game; showScore: boolean; note?: string }) {
  return (
    <Link href={`/games/${g.id}`} className={s.game}>
      {g.cover_url ? (
        <img src={g.cover_url} alt={g.title} className={s.cover} />
      ) : (
        <span className={s.coverFallback}>{g.title[0]}</span>
      )}
      <span className={s.info}>
        <span className={s.title}>{g.title}</span>
        <span className={s.meta}>{note ?? g.developer}</span>
        <span className={s.tags}>
          {g.platforms.map((p) => <span key={p} className={s.tag}>{platformLabel(p)}</span>)}
        </span>
      </span>
      {showScore && <span className={`${s.scoreChip} ${scoreClass(g.critic_score)}`}>{g.critic_score}</span>}
    </Link>
  )
}
