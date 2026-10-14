import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { scoreClass } from '@/lib/utils'
import { PLATFORM_GROUPS, inPlatformGroup, parsePlatform, platformGroupLabel, platformLabels, type PlatformGroup } from '@/lib/platforms'
import { byScore, criticVsUser, loadGameStats, type VsRow } from '@/lib/curation'
import s from './rankings.module.css'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const MEDALS = ['🥇', '🥈', '🥉']

type Tab = 'score' | 'vs'

type SearchParams = Promise<{ tab?: string; year?: string; platform?: string; page?: string }>

interface Filters {
  tab: Tab
  year: number | null
  platform: PlatformGroup | null
  page: number
}

function parseFilters(sp: Awaited<SearchParams>): Filters {
  const year = Number(sp.year)
  const platform = parsePlatform(sp.platform)
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1)
  const tab: Tab = sp.tab === 'vs' ? 'vs' : 'score'
  return { tab, year: Number.isInteger(year) && year > 0 ? year : null, platform, page }
}

function buildTitle({ tab, year, platform }: Filters): string {
  const parts = [year && `${year}년`, platform && platformGroupLabel(platform)].filter(Boolean)
  if (tab === 'vs') return [...parts, '평론가 vs 유저'].join(' ')
  return parts.length ? `${parts.join(' ')} 최고의 게임` : '역대 최고의 게임'
}

/** 필터 상태를 유지한 채 일부만 바꾼 URL */
function hrefWith(f: Filters, patch: Partial<Filters>): string {
  const next = { ...f, page: 1, ...patch }
  const q = new URLSearchParams()
  if (next.tab === 'vs') q.set('tab', 'vs')
  if (next.year)     q.set('year', String(next.year))
  if (next.platform) q.set('platform', next.platform)
  if (next.page > 1) q.set('page', String(next.page))
  const qs = q.toString()
  return qs ? `/rankings?${qs}` : '/rankings'
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return { title: `${buildTitle(parseFilters(await searchParams))} | KRITIK` }
}

export default async function RankingsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams)
  const supabase = await createClient()

  const { games: all, settings } = await loadGameStats(supabase)

  // 연도 탭: 랭킹 대상 게임의 출시연도 (최신순)
  const years = Array.from(new Set(all.map((g) => g.year).filter(Boolean))).sort((a, b) => b - a)

  const ranked = all
    .filter((g) => !filters.year || g.year === filters.year)
    .filter((g) => !filters.platform || inPlatformGroup(g.platforms, filters.platform))
    .sort(byScore)
  const vs = criticVsUser(ranked, settings)

  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const pageRows = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const rankOffset = 3 + (page - 1) * PAGE_SIZE

  return (
    <div className={s.root}>

      {/* HEADER */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <nav>
            <Link href="/games">게임</Link>
            <Link href="/rankings" className={s.navActive}>랭킹</Link>
            <Link href="/collections">컬렉션</Link>
            <Link href="/releases">출시 일정</Link>
            <Link href="/news">뉴스</Link>
          </nav>
        </div>
      </header>

      {/* PAGE HERO */}
      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>RANKING</div>
          <h1 className={s.pageHeroTitle}>{buildTitle(filters)}</h1>
          <p className={s.pageHeroSub}>
            {filters.tab === 'vs'
              ? `전문가 리뷰 ${settings.minCriticReviews}개·유저 리뷰 ${settings.minUserReviews}개 이상 · 유저 별점 ×20 환산`
              : '전문가 점수 기준 · 점수가 같으면 리뷰 수 순'}
          </p>
        </div>
      </div>

      <div className={s.container}>

        {/* 탭 */}
        <div className={s.tabs}>
          <Link href={hrefWith(filters, { tab: 'score' })} className={`${s.tab} ${filters.tab === 'score' ? s.tabActive : ''}`}>점수 랭킹</Link>
          <Link href={hrefWith(filters, { tab: 'vs' })} className={`${s.tab} ${filters.tab === 'vs' ? s.tabActive : ''}`}>평론가 vs 유저</Link>
        </div>

        {/* 필터 */}
        <div className={s.filterBar}>
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>연도</span>
            <div className={s.chips}>
              <Link href={hrefWith(filters, { year: null })} className={`${s.chip} ${!filters.year ? s.chipActive : ''}`}>전체</Link>
              {years.map((y) => (
                <Link key={y} href={hrefWith(filters, { year: y })} className={`${s.chip} ${filters.year === y ? s.chipActive : ''}`}>
                  {y}
                </Link>
              ))}
            </div>
          </div>
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>플랫폼</span>
            <div className={s.chips}>
              <Link href={hrefWith(filters, { platform: null })} className={`${s.chip} ${!filters.platform ? s.chipActive : ''}`}>전체</Link>
              {PLATFORM_GROUPS.map((p) => (
                <Link key={p.value} href={hrefWith(filters, { platform: p.value })} className={`${s.chip} ${filters.platform === p.value ? s.chipActive : ''}`}>
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {filters.tab === 'vs' ? (
          vs.criticHigher.length + vs.userHigher.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>⊘</div>
              <div>해당 조건의 게임이 없어요</div>
            </div>
          ) : (
            <div className={s.vsGrid}>
              <VsList title="평론가가 더 높게 본 게임" rows={vs.criticHigher} />
              <VsList title="유저가 더 높게 본 게임" rows={vs.userHigher} />
            </div>
          )
        ) : ranked.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>⊘</div>
            <div>해당 조건의 게임이 없어요</div>
          </div>
        ) : (
          <>
            {/* TOP 3 — 첫 페이지에만 */}
            {page === 1 && (
              <div className={s.podium}>
                {top3.map((g, i) => (
                  <Link href={`/games/${g.id}`} key={g.id} className={`${s.podiumCard} ${i === 0 ? s.podiumFirst : ''}`}>
                    <div className={s.podiumCoverWrap}>
                      {g.cover_url ? (
                        <img src={g.cover_url} alt={g.title} className={s.podiumCover} />
                      ) : (
                        <div className={s.podiumCoverFallback}>{g.title[0]}</div>
                      )}
                      <span className={s.podiumMedal}>{MEDALS[i]}</span>
                    </div>
                    <div className={s.podiumBody}>
                      <div className={s.podiumHead}>
                        <div className={s.podiumTitle}>{g.title}</div>
                        <div className={`${s.scoreChip} ${scoreClass(g.critic_score)}`}>{g.critic_score}</div>
                      </div>
                      <div className={s.tags}>
                        <span className={s.tag}>{g.genre}</span>
                        {platformLabels(g.platforms).map((p) => (
                          <span key={p} className={`${s.tag} ${s.tagPlatform}`}>{p}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 4위 이하 */}
            {pageRows.length > 0 && (
              <div className={s.list}>
                <div className={`${s.row} ${s.listHead}`}>
                  <span className={s.rank}>#</span>
                  <span className={s.coverCol} />
                  <span className={s.info}>게임</span>
                  <span className={s.genreCol}>장르</span>
                  <span className={s.platformCol}>플랫폼</span>
                  <span className={s.scoreCol}>점수</span>
                </div>
                {pageRows.map((g, i) => (
                  <Link href={`/games/${g.id}`} key={g.id} className={s.row}>
                    <span className={s.rank}>{rankOffset + i + 1}</span>
                    <span className={s.coverCol}>
                      {g.cover_url ? (
                        <img src={g.cover_url} alt={g.title} className={s.cover} />
                      ) : (
                        <span className={s.coverFallback}>{g.title[0]}</span>
                      )}
                    </span>
                    <span className={s.info}>
                      <span className={s.title}>{g.title}</span>
                      <span className={s.meta}>{g.developer} · {g.year}</span>
                    </span>
                    <span className={s.genreCol}>{g.genre}</span>
                    <span className={s.platformCol}>{platformLabels(g.platforms).join(' · ')}</span>
                    <span className={s.scoreCol}>
                      <span className={`${s.scoreChip} ${scoreClass(g.critic_score)}`}>{g.critic_score}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <nav className={s.pagination} aria-label="페이지">
                {page > 1 && <Link href={hrefWith(filters, { page: page - 1 })} className={s.pageBtn}>‹</Link>}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link key={n} href={hrefWith(filters, { page: n })} className={`${s.pageBtn} ${n === page ? s.pageActive : ''}`}>
                    {n}
                  </Link>
                ))}
                {page < totalPages && <Link href={hrefWith(filters, { page: page + 1 })} className={s.pageBtn}>›</Link>}
              </nav>
            )}
          </>
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

function VsList({ title, rows }: { title: string; rows: VsRow[] }) {
  return (
    <section className={s.vsSection}>
      <h2 className={s.vsTitle}>{title} <span className={s.vsCount}>{rows.length}</span></h2>
      {rows.length === 0 ? (
        <div className={s.vsEmpty}>해당하는 게임이 없어요</div>
      ) : (
        <div className={s.list}>
          <div className={`${s.vsRow} ${s.listHead}`}>
            <span className={s.coverCol} />
            <span className={s.info}>게임</span>
            <span className={s.vsNum}>평론가</span>
            <span className={s.vsNum}>유저</span>
            <span className={s.vsNum}>차이</span>
          </div>
          {rows.map((g) => (
            <Link href={`/games/${g.id}`} key={g.id} className={s.vsRow}>
              <span className={s.coverCol}>
                {g.cover_url ? (
                  <img src={g.cover_url} alt={g.title} className={s.cover} />
                ) : (
                  <span className={s.coverFallback}>{g.title[0]}</span>
                )}
              </span>
              <span className={s.info}>
                <span className={s.title}>{g.title}</span>
                <span className={s.meta}>{g.developer} · {g.year}</span>
              </span>
              <span className={s.vsNum}><span className={`${s.vsChip} ${scoreClass(g.critic_score)}`}>{g.critic_score}</span></span>
              <span className={s.vsNum}><span className={`${s.vsChip} ${scoreClass(g.user_score)}`}>{g.user_score}</span></span>
              <span className={`${s.vsNum} ${s.vsDiff} ${g.diff > 0 ? s.diffCritic : s.diffUser}`}>
                +{Math.abs(g.diff)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
