'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Game, CriticReview } from '@/lib/types'
import { scoreClass } from '@/lib/utils'
import s from './page.module.css'

interface Props {
  featured: Game | undefined
  top5: Game[]
  recent: Game[]
  reviews: CriticReview[]
  upcoming: { title: string; developer: string; cover_url: string | null; year: number }[]
  allGames: Game[]
}

export default function HomeClient({ featured, top5, recent, reviews, upcoming, allGames }: Props) {
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
            g.title.toLowerCase().includes(searchQ.toLowerCase()) ||
            g.developer.toLowerCase().includes(searchQ.toLowerCase())
        )
        .slice(0, 5)
    : []

  const pfGames = pf === 'all' ? allGames : allGames.filter((g) => g.platforms.includes(pf))

  return (
    <div className={s.root}>

      {/* ── NAV ── */}
      <nav className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
        <div className={s.navInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <div className={s.navLinks}>
            <Link href="/games">게임</Link>
            <Link href="/ranking">랭킹</Link>
            <Link href="/reviews">리뷰</Link>
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
            <Link href="/admin" className={s.loginBtn}>관리자</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      {featured && (
        <div className={s.hero}>
          {featured.cover_url && (
            <img className={s.heroBg} src={featured.cover_url} alt={featured.title} />
          )}
          <div className={s.heroVignette} />
          {/* 콘텐츠만 1280px 제한 */}
          <div className={s.heroOuter}>
            <div className={s.heroBody}>
              <div className={s.heroBadge}>▶ &nbsp;이번 주 에디터 픽</div>
              <h1 className={s.heroTitle}>{featured.title}</h1>
              <div className={s.heroInfo}>
                {featured.critic_score !== null && (
                  <>
                    <div className={`${s.heroScore} ${scoreClass(featured.critic_score)}`}>
                      {featured.critic_score}
                    </div>
                    <div className={s.heroScoreLabel}>전문가 점수</div>
                    <div className={s.heroDivider} />
                  </>
                )}
                {featured.platforms.map((p) => (
                  <span key={p} className={s.heroTag}>{p}</span>
                ))}
                <span className={s.heroTag}>{featured.genre}</span>
              </div>
              {featured.description && (
                <p className={s.heroDesc}>{featured.description}</p>
              )}
              <div className={s.heroBtns}>
                <Link href={`/games/${featured.id}`} className={s.btnPrimary}>리뷰 보기</Link>
                <button className={s.btnGhost}>+ 위시리스트</button>
              </div>
            </div>
          </div>
          <div className={s.heroScroll}>
            <span>스크롤</span>
            <span className={s.scrollArrow}>↓</span>
          </div>
        </div>
      )}

      {/* ── TOP 5 ── */}
      <section className={s.section} style={{ paddingTop: '2.5rem' }}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <div>
              <span className={s.rowTitle}>
                이번 주 인기 게임 <span className={s.hl}>TOP 5</span>
              </span>
              <span className={s.rowSub}>// 전문가 점수 기준</span>
            </div>
            <Link href="/ranking" className={s.rowMore}>전체 랭킹 →</Link>
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
                    {g.platforms.slice(0, 3).map((p) => <span key={p} className={s.tt}>{p}</span>)}
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

      {/* ── 최근 리뷰된 게임 ── */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <span className={s.rowTitle}>최근 <span className={s.hl}>리뷰된</span> 게임</span>
            <Link href="/games" className={s.rowMore}>전체 보기 →</Link>
          </div>
        </div>
        <div className={s.hsWrap}>
          <div className={s.hscroll}>
            {recent.map((g) => (
              <Link href={`/games/${g.id}`} key={g.id} className={s.poster}>
                <div className={s.posterIw}>
                  {g.cover_url && <img src={g.cover_url} alt={g.title} />}
                  <div className={s.posterOv} />
                  <div className={s.posterHi}>
                    <div className={s.phiT}>{g.title}</div>
                    <div className={s.phiS}>{g.genre} · {g.year}</div>
                  </div>
                  {g.critic_score !== null && (
                    <div className={`${s.posterScore} ${scoreClass(g.critic_score)}`}>
                      {g.critic_score}
                    </div>
                  )}
                </div>
                <div className={s.posterT}>{g.title}</div>
                <div className={s.posterS}>{g.developer}</div>
              </Link>
            ))}
          </div>
          <div className={s.fadeR} />
        </div>
      </section>

      {/* ── 전문가 최신 리뷰 — 4열 고정 그리드 ── */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.rowHead}>
            <span className={s.rowTitle}>전문가 <span className={s.hl}>최신 리뷰</span></span>
            <Link href="/reviews" className={s.rowMore}>전체 리뷰 →</Link>
          </div>
          <div className={s.reviewGrid}>
            {reviews.map((r) => {
              const game = allGames.find((g) => g.id === r.game_id)
              return (
                <div key={r.id} className={s.reviewCard}>
                  <div className={s.rcTop}>
                    {game?.cover_url && (
                      <img src={game.cover_url} alt={game.title} className={s.rcImg} />
                    )}
                    <div>
                      <div className={s.rcGame}>{game?.title ?? '—'}</div>
                      <div className={s.rcMedia}>{r.media}</div>
                    </div>
                    <div className={`${s.rcScore} ${scoreClass(r.score)}`}>{r.score}</div>
                  </div>
                  <div className={s.rcBody}>
                    <div className={s.rcText}>{r.review_text}</div>
                    <div className={s.rcFoot}>
                      <span className={s.rcName}>{r.reviewer_name}</span>
                      <span className={s.rcDate}>{r.published_at}</span>
                    </div>
                  </div>
                </div>
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
              <div>
                <span className={s.rowTitle}>출시 예정 <span className={s.hl}>기대작</span></span>
                <span className={s.rowSub}>// 점수 미정 TBD</span>
              </div>
            </div>
          </div>
          <div className={s.hsWrap}>
            <div className={s.hscroll}>
              {upcoming.map((u, i) => (
                <div key={i} className={s.uc}>
                  <div className={s.ucIw}>
                    {u.cover_url && <img src={u.cover_url} alt={u.title} />}
                    <div className={s.ucOv} />
                    <div className={s.ucBody}>
                      <div className={s.ucT}>{u.title}</div>
                      <div className={s.ucD}>{u.developer}</div>
                      <div className={s.ucTbd}>TBD · {u.year}년 예정</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className={s.fadeR} />
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
            {[
              { key: 'all',    icon: '🎮', label: '전체' },
              { key: 'PS5',    icon: '🟦', label: 'PS5' },
              { key: 'Xbox',   icon: '🟩', label: 'Xbox' },
              { key: 'PC',     icon: '💻', label: 'PC' },
              { key: 'Mobile', icon: '📱', label: '모바일' },
            ].map(({ key, icon, label }) => (
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
          </div>
        </div>
      </footer>

    </div>
  )
}
