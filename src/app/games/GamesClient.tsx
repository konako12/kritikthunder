'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Game } from '@/lib/types'
import s from './games.module.css'

interface Props {
  games: Game[]
}

type SortKey = 'score' | 'year_desc' | 'year_asc' | 'title'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'score',     label: '점수 높은순' },
  { key: 'year_desc', label: '최신 출시순' },
  { key: 'year_asc',  label: '오래된 출시순' },
  { key: 'title',     label: '이름순' },
]

export default function GamesClient({ games }: Props) {
  const [searchQ, setSearchQ]       = useState('')
  const [genre, setGenre]           = useState('all')
  const [platform, setPlatform]     = useState('all')
  const [sortKey, setSortKey]       = useState<SortKey>('score')

  // 장르/플랫폼 목록 추출
  const genres = useMemo(
    () => ['all', ...Array.from(new Set(games.map((g) => g.genre))).sort()],
    [games]
  )
  const platforms = useMemo(
    () => ['all', ...Array.from(new Set(games.flatMap((g) => g.platforms))).sort()],
    [games]
  )

  // 필터 + 검색 + 정렬
  const filtered = useMemo(() => {
    let list = games

    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.developer.toLowerCase().includes(q) ||
          (g.publisher ?? '').toLowerCase().includes(q)
      )
    }
    if (genre !== 'all')    list = list.filter((g) => g.genre === genre)
    if (platform !== 'all') list = list.filter((g) => g.platforms.includes(platform))

    return [...list].sort((a, b) => {
      if (sortKey === 'score')     return (b.critic_score ?? -1) - (a.critic_score ?? -1)
      if (sortKey === 'year_desc') return b.year - a.year
      if (sortKey === 'year_asc')  return a.year - b.year
      return a.title.localeCompare(b.title, 'ko')
    })
  }, [games, searchQ, genre, platform, sortKey])

  return (
    <div className={s.root}>
      {/* HEADER */}
      <header className={s.header}>
        <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
        <nav>
          <Link href="/games" className={s.navActive}>게임</Link>
          <Link href="/ranking">랭킹</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </header>

      {/* PAGE HERO */}
      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>GAME DATABASE</div>
          <h1 className={s.pageHeroTitle}>게임 탐색</h1>
          <p className={s.pageHeroSub}>국내 전문가 평점 기반 게임 데이터베이스</p>

          {/* 검색 */}
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>⌕</span>
            <input
              className={s.searchInput}
              type="text"
              placeholder="게임 이름, 개발사 검색..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              autoComplete="off"
            />
            {searchQ && (
              <button className={s.searchClear} onClick={() => setSearchQ('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div className={s.container}>
        {/* 필터 바 */}
        <div className={s.filterBar}>
          {/* 장르 필터 */}
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>장르</span>
            <div className={s.chips}>
              {genres.map((g) => (
                <button
                  key={g}
                  className={`${s.chip} ${genre === g ? s.chipActive : ''}`}
                  onClick={() => setGenre(g)}
                >
                  {g === 'all' ? '전체' : g}
                </button>
              ))}
            </div>
          </div>

          {/* 플랫폼 필터 */}
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>플랫폼</span>
            <div className={s.chips}>
              {platforms.map((p) => (
                <button
                  key={p}
                  className={`${s.chip} ${platform === p ? s.chipActive : ''}`}
                  onClick={() => setPlatform(p)}
                >
                  {p === 'all' ? '전체' : p}
                </button>
              ))}
            </div>
          </div>

          {/* 정렬 */}
          <div className={s.filterGroup}>
            <span className={s.filterLabel}>정렬</span>
            <div className={s.chips}>
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  className={`${s.chip} ${sortKey === o.key ? s.chipActive : ''}`}
                  onClick={() => setSortKey(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 결과 카운트 */}
        <div className={s.resultMeta}>
          <span className={s.resultCount}>{filtered.length}</span>개 게임
          {(genre !== 'all' || platform !== 'all' || searchQ) && (
            <button
              className={s.resetBtn}
              onClick={() => { setGenre('all'); setPlatform('all'); setSearchQ(''); setSortKey('score') }}
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 게임 그리드 */}
        {filtered.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>⊘</div>
            <div>검색 결과가 없습니다</div>
            <div className={s.emptySub}>다른 검색어나 필터를 시도해보세요</div>
          </div>
        ) : (
          <div className={s.grid}>
            {filtered.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} className={s.card}>
                <div className={s.cardImgWrap}>
                  {game.cover_url ? (
                    <img className={s.cardImg} src={game.cover_url} alt={game.title} />
                  ) : (
                    <div className={s.cardImgFallback}>
                      <span>{game.title[0]}</span>
                    </div>
                  )}
                  <div className={s.cardOverlay} />
                  {game.critic_score !== null ? (
                    <div className={`${s.cardScore} ${
                      game.critic_score >= 90 ? s.scoreGreat :
                      game.critic_score >= 75 ? s.scoreGood  : s.scoreBad
                    }`}>
                      {game.critic_score}
                    </div>
                  ) : (
                    <div className={s.cardScoreTbd}>TBD</div>
                  )}
                  {game.status === 'upcoming' && (
                    <div className={s.upcomingBadge}>출시 예정</div>
                  )}
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardTitle}>{game.title}</div>
                  <div className={s.cardDev}>{game.developer} · {game.year}</div>
                  <div className={s.cardTags}>
                    <span className={s.cardGenre}>{game.genre}</span>
                    {game.platforms.slice(0, 2).map((p) => (
                      <span key={p} className={s.cardPlatform}>{p}</span>
                    ))}
                    {game.platforms.length > 2 && (
                      <span className={s.cardMore}>+{game.platforms.length - 2}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div>
          <div className={s.ftLogo}>KRIT<span>IK</span></div>
          <div className={s.ftSub}>국내 게임 전문 평점 서비스</div>
        </div>
        <div className={s.ftText}>© 2025 KRITIK. All rights reserved.</div>
      </footer>
    </div>
  )
}
