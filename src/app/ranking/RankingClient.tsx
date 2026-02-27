'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Game } from '@/lib/types'
import s from './ranking.module.css'

interface Props {
  games: Game[]
}

export default function RankingClient({ games }: Props) {
  const [genre, setGenre]       = useState('all')
  const [platform, setPlatform] = useState('all')

  const genres = useMemo(
    () => ['all', ...Array.from(new Set(games.map((g) => g.genre))).sort()],
    [games]
  )
  const platforms = useMemo(
    () => ['all', ...Array.from(new Set(games.flatMap((g) => g.platforms))).sort()],
    [games]
  )

  const filtered = useMemo(() => {
    let list = games
    if (genre !== 'all')    list = list.filter((g) => g.genre === genre)
    if (platform !== 'all') list = list.filter((g) => g.platforms.includes(platform))
    return list
  }, [games, genre, platform])

  return (
    <div className={s.root}>

      {/* HEADER */}
      <header className={s.header}>
        <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
        <nav>
          <Link href="/games">게임</Link>
          <Link href="/ranking" className={s.navActive}>랭킹</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </header>

      {/* PAGE HERO */}
      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>RANKING</div>
          <h1 className={s.pageHeroTitle}>전체 랭킹</h1>
          <p className={s.pageHeroSub}>전문가 점수 기준 국내 게임 순위</p>
        </div>
      </div>

      <div className={s.container}>

        {/* 필터 */}
        <div className={s.filterBar}>
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
        </div>

        {/* 결과 수 */}
        <div className={s.resultMeta}>
          <span className={s.resultCount}>{filtered.length}</span>개 게임
          {(genre !== 'all' || platform !== 'all') && (
            <button
              className={s.resetBtn}
              onClick={() => { setGenre('all'); setPlatform('all') }}
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 랭킹 리스트 */}
        <div className={s.list}>
          {filtered.map((game, i) => (
            <Link href={`/games/${game.id}`} key={game.id} className={s.row}>

              {/* 순위 번호 */}
              <div className={`${s.rank} ${i < 3 ? s.rankTop : ''}`}>
                {i < 3 ? (
                  <span className={s.rankCrown}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                ) : (
                  <span className={s.rankNum}>{i + 1}</span>
                )}
              </div>

              {/* 커버 이미지 */}
              {game.cover_url ? (
                <img src={game.cover_url} alt={game.title} className={s.cover} />
              ) : (
                <div className={s.coverFallback}>{game.title[0]}</div>
              )}

              {/* 게임 정보 */}
              <div className={s.info}>
                <div className={s.title}>{game.title}</div>
                <div className={s.meta}>{game.developer} · {game.year}</div>
                <div className={s.tags}>
                  <span className={s.tagGenre}>{game.genre}</span>
                  {game.platforms.slice(0, 3).map((p) => (
                    <span key={p} className={s.tagPlatform}>{p}</span>
                  ))}
                  {game.platforms.length > 3 && (
                    <span className={s.tagMore}>+{game.platforms.length - 3}</span>
                  )}
                </div>
              </div>

              {/* 점수 */}
              <div className={`${s.score} ${
                game.critic_score! >= 90 ? s.scoreGreat :
                game.critic_score! >= 75 ? s.scoreGood  : s.scoreBad
              }`}>
                {game.critic_score}
              </div>

            </Link>
          ))}

          {filtered.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}>⊘</div>
              <div>해당 조건의 게임이 없습니다</div>
            </div>
          )}
        </div>
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
