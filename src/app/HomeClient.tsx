'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import AccountLinks from '@/components/AccountLinks'
import type { Game, CriticReview, NewsWithGame } from '@/lib/types'
import { scoreClass, sourceDomain, gameTitleMatches, formatReleaseDate } from '@/lib/utils'
import { ReviewVerdict, FullReviewLink } from '@/components/review/ReviewVerdict'
import { PLATFORM_GROUPS, inPlatformGroup, platformLabels, type PlatformGroup } from '@/lib/platforms'
import type { Collection } from '@/lib/curation'
import CollectionCard from './collections/CollectionCard'
import HeroAccolades from './HeroAccolades'
import { heroImage, heroObjectPosition } from '@/lib/hero'
import NewsCard from '@/components/news/NewsCard'
import cs from './collections/collections.module.css'
import ns from '@/components/news/news.module.css'
import s from './page.module.css'

interface Props {
  featured: Game | undefined
  heroReviews: CriticReview[]
  top5: Game[]
  reviews: CriticReview[]
  /** dday: 출시 15일 이내면 "D-15" · 당일 "D-DAY" (한국 시간, 서버 계산) */
  upcoming: (Pick<Game, 'id' | 'title' | 'developer' | 'cover_url' | 'year' | 'release_date'> & { dday: string | null })[]
  allGames: Game[]
  collections: Collection[]
  news: NewsWithGame[]
}

export default function HomeClient({ featured, heroReviews, top5, reviews, upcoming, allGames, collections, news }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [pf, setPf] = useState('all')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const searchResults = searchQ.trim()
    ? allGames
        .filter(
          (g) =>
            gameTitleMatches(g, searchQ) ||
            g.developer.toLowerCase().includes(searchQ.toLowerCase())
        )
        .slice(0, 5)
    : []

  const pfGames = pf === 'all' ? allGames : allGames.filter((g) => inPlatformGroup(g.platforms, pf as PlatformGroup))
  // 메인 노출 게임이 출시 예정이면 점수 대신 출시 예정 배지 + 출시일
  const featuredUpcoming = featured?.status === 'upcoming'

  return (
    <div className={s.root}>

      {/* ── NAV ── */}
      <nav className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
        <div className={s.navInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <div className={s.navLinks}>
            <Link href="/games">게임</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/collections">컬렉션</Link>
            <Link href="/releases">출시 일정</Link>
            <Link href="/news">뉴스</Link>
            <div className={s.navSearch} ref={searchRef}>
              <span className={s.searchIcon}>⌕</span>
              <input
                type="text"
                placeholder="게임 검색..."
                value={searchQ}
                onChange={(e) => {
                  setSearchQ(e.target.value)
                  setSearchOpen(e.target.value.trim().length > 0)
                }}
                autoComplete="off"
              />
              {searchOpen && searchResults.length > 0 && (
                <div className={s.searchDrop}>
                  {searchResults.map((g) => (
                    <Link
                      href={`/games/${g.id}`}
                      key={g.id}
                      className={s.sdItem}
                      onClick={() => { setSearchOpen(false); setSearchQ('') }}
                    >
                      {g.cover_url && <img src={g.cover_url} alt={g.title} className={s.sdImg} />}
                      <div>
                        <div className={s.sdTitle}>{g.title}</div>
                        <div className={s.sdSub}>{g.developer} · {g.year}</div>
                      </div>
                      {g.critic_score !== null && (
                        <div className={`${s.sdScore} ${scoreClass(g.critic_score)}`}>{g.critic_score}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      {featured && (
        <div className={s.hero}>
          {heroImage(featured) && (
            <img className={s.heroBg} src={heroImage(featured)!} alt=""
              style={{ objectPosition: heroObjectPosition(featured) }} />
          )}
          <div className={s.heroVignette} />
          {/* 콘텐츠만 1280px 제한 */}
          <div className={`${s.heroOuter} ${s.heroLayout}`}>
            <div className={s.heroBody}>
              <div className={s.heroBadge}>▶ &nbsp;이번 주 에디터 픽</div>
              <h1 className={s.heroTitle}>{featured.title}</h1>
              <div className={s.heroInfo}>
                {/* 점수는 오른쪽 KRITIK 종합 점수 하나만 — 출시 예정이면 배지 + 출시일 */}
                {featuredUpcoming && (
                  <>
                    <div className={s.heroUpcoming}>출시 예정</div>
                    <div className={s.heroReleaseDate}>{formatReleaseDate(featured)}</div>
                    <div className={s.heroDivider} />
                  </>
                )}
                {platformLabels(featured.platforms).map((p) => (
                  <span key={p} className={s.heroTag}>{p}</span>
                ))}
                <span className={s.heroTag}>{featured.genre}</span>
              </div>
              {featured.description && (
                <p className={s.heroDesc}>{featured.description}</p>
              )}
              <div className={s.heroBtns}>
                <Link href={`/games/${featured.id}`} className={s.btnPrimary}>{featuredUpcoming ? '게임 정보 보기' : '리뷰 보기'}</Link>
                <button className={s.btnGhost}>+ 위시리스트</button>
              </div>
            </div>
            {!featuredUpcoming && featured.critic_score !== null && (
              <HeroAccolades total={featured.critic_score} reviews={heroReviews} />
            )}
          </div>
          <div className={s.heroScroll}>
            <span>스크롤</span>
            <span className={s.scrollArrow}>↓</span>
          </div>
        </div>
      )}

      {/* ── TOP 5 ── */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <div>
              <span className={s.rowTitle}>
                이번 주 인기 게임 <span className={s.hl}>TOP 5</span>
              </span>
              <span className={s.rowSub}>// 전문가 점수 기준</span>
            </div>
            <Link href="/rankings" className={s.rowMore}>전체 보기 →</Link>
          </div>
          <div className={s.top5List}>
            {top5.map((g, i) => (
              <Link href={`/games/${g.id}`} key={g.id} className={s.top5Item}>
                <div className={`${s.top5N} ${i < 3 ? s.top5Gold : ''}`}>{i + 1}</div>
                {g.cover_url && (
                  <img src={g.cover_url} alt={g.title} className={s.top5Img} />
                )}
                <div className={s.top5Info}>
                  <div className={s.top5T}>{g.title}</div>
                  <div className={s.top5M}>{g.developer} · {g.year}</div>
                  <div className={s.top5Tags}>
                    {platformLabels(g.platforms).slice(0, 3).map((p) => <span key={p} className={s.tt}>{p}</span>)}
                    <span className={s.tt}>{g.genre}</span>
                  </div>
                </div>
                {g.critic_score !== null ? (
                  <div className={`${s.t5s} ${scoreClass(g.critic_score)}`}>{g.critic_score}</div>
                ) : (
                  <div className={s.t5sTbd}>TBD</div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 전문가 최신 한줄평 — 전체 폭 격자 (PC 4열 · 태블릿 2열 · 모바일 1열) ── */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <span className={s.rowTitle}>전문가 <span className={s.hl}>최신 한줄평</span></span>
          </div>
          <div className={s.reviewGrid}>
            {reviews.map((r) => {
              const game = allGames.find((g) => g.id === r.game_id)
              return (
                <article key={r.id} className={s.reviewCard}>
                  {game && (
                    <Link href={`/games/${game.id}`} className={s.rcGameRow}>
                      {game.cover_url && <img src={game.cover_url} alt="" className={s.rcImg} />}
                      <span className={s.rcGame}>{game.title}</span>
                    </Link>
                  )}
                  <div className={s.rcTop}>
                    <div className={`${s.rcScore} ${scoreClass(r.score)}`}>{r.score}</div>
                    <div className={s.rcWho}>
                      <div className={s.rcMedia}>{r.media}</div>
                      <div className={s.rcName}>{r.reviewer_name}</div>
                    </div>
                  </div>
                  {/* 한줄평 (기자 본인 문장) — 없으면 전문 2줄 */}
                  <div className={s.rcText}><ReviewVerdict review={r} /></div>
                  <div className={s.rcFoot}>
                    <span className={s.rcDate}>{r.published_at.replaceAll('-', '.')}</span>
                    <span title={r.source_url ? sourceDomain(r.source_url) : undefined}>
                      <FullReviewLink review={r} className={s.rcSource} />
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 출시 예정 기대작 ── */}
      {upcoming.length > 0 && (
        <section className={s.section}>
          <div className={s.wrap}>
            <div className={s.rowHead}>
              <span className={s.rowTitle}>출시 예정 <span className={s.hl}>기대작</span></span>
              <Link href="/releases" className={s.rowMore}>전체 보기 →</Link>
            </div>
          </div>
          <div className={s.hsWrap}>
            <div className={s.hscroll}>
              {upcoming.map((u) => (
                <Link href={`/games/${u.id}`} key={u.id} className={s.uc}>
                  <div className={s.ucIw}>
                    {u.cover_url && <img src={u.cover_url} alt={u.title} />}
                    {/* 출시 15일 이내 — 한국 시간 기준 D-day (서버에서 계산) */}
                    {u.dday && <span className={s.dday}>{u.dday}</span>}
                    <div className={s.ucOv} />
                    <div className={s.ucBody}>
                      <div className={s.ucT}>{u.title}</div>
                      <div className={s.ucD}>{u.developer}</div>
                      {/* 정확한 날짜가 있으면 2026.10.15, 연도만 있으면 연도만 */}
                      <div className={s.ucTbd}>
                        {u.release_date ? formatReleaseDate(u) : `TBD · ${u.year}년 예정`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className={s.fadeR} />
          </div>
        </section>
      )}

      {/* ── 최신 게임 뉴스 — 고정 우선, 최근 4개 ── */}
      {news.length > 0 && (
        <section className={s.section}>
          <div className={s.wrap}>
            <div className={s.rowHead}>
              <span className={s.rowTitle}>최신 <span className={s.hl}>게임 뉴스</span></span>
              <Link href="/news" className={s.rowMore}>전체 보기 →</Link>
            </div>
            <div className={ns.grid}>
              {news.map((n) => <NewsCard key={n.id} news={n} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 추천 컬렉션 ── */}
      {collections.length > 0 && (
        <section className={s.section}>
          <div className={s.wrap}>
            <div className={s.rowHead}>
              <div>
                <span className={s.rowTitle}>추천 <span className={s.hl}>컬렉션</span></span>
                <span className={s.rowSub}>// 전문가 점수로 자동 선정</span>
              </div>
              <Link href="/collections" className={s.rowMore}>전체 보기 →</Link>
            </div>
            <div className={cs.grid}>
              {collections.map((c) => <CollectionCard key={c.slug} collection={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── 플랫폼별 탐색 ── */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <span className={s.rowTitle}>플랫폼별 <span className={s.hl}>탐색</span></span>
            <Link href="/games" className={s.rowMore}>전체 보기 →</Link>
          </div>
          <div className={s.pfStrip}>
            {[{ value: 'all', icon: '🎮', label: '전체' }, ...PLATFORM_GROUPS].map(({ value: key, icon, label }) => (
              <button
                key={key}
                className={`${s.pfBtn} ${pf === key ? s.pfBtnActive : ''}`}
                onClick={() => setPf(key)}
              >
                <div className={s.pfIcon}>{icon}</div>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '0.8rem' }} />
        <div className={s.hsWrap}>
          <div className={s.hscroll}>
            {pfGames.map((g) => (
              <Link href={`/games/${g.id}`} key={g.id} className={s.poster}>
                <div className={s.posterIw}>
                  {g.cover_url && <img src={g.cover_url} alt={g.title} />}
                  <div className={s.posterOv} />
                  {g.critic_score !== null && (
                    <div className={`${s.posterScore} ${scoreClass(g.critic_score)}`}>
                      {g.critic_score}
                    </div>
                  )}
                </div>
                <div className={s.posterT}>{g.title}</div>
                <div className={s.posterS}>{g.genre} · {g.year}</div>
              </Link>
            ))}
          </div>
          <div className={s.fadeR} />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.footerInner}>
            <div>
              <div className={s.ftLogo}>KRIT<span>IK</span></div>
              <div className={s.ftTagline}>국내 게임 전문 평점 서비스</div>
            </div>
            <div className={s.ftText}>
              © 2025 KRITIK. All rights reserved.<br />
              국내 게임 전문지 기자와 플레이어가 함께 만드는 신뢰할 수 있는 게임 정보
            </div>
            <div className={s.pressLinks}>
              <AccountLinks />
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
