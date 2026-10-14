import Link from 'next/link'
import type { NewsWithGame } from '@/lib/types'
import { formatNewsDate } from '@/lib/news'
import NewsImage from './NewsImage'
import s from './news.module.css'

export type NewsCardData = Pick<
  NewsWithGame,
  'title' | 'media' | 'source_url' | 'summary' | 'published_at' | 'image_url' | 'image_source' | 'is_pinned' | 'game'
>

interface Props {
  news: NewsCardData
  /** feature: 메인 고정 뉴스용 큰 카드 */
  variant?: 'card' | 'feature'
  /** 게임 상세 페이지처럼 이미 그 게임 안에 있을 때는 게임 링크 숨김 */
  hideGameLink?: boolean
}

/** 화면에 쓸 이미지 주소 — 게임 커버를 고른 경우 현재 게임 커버를 우선 사용 */
function displayImage(n: NewsCardData): string | null {
  if (n.image_source === 'game_cover') return n.game?.cover_url ?? n.image_url
  return n.image_url
}

export default function NewsCard({ news: n, variant = 'card', hideGameLink = false }: Props) {
  const date = formatNewsDate(n.published_at)
  return (
    <article className={`${s.card} ${variant === 'feature' ? s.feature : ''}`}>
      <a href={n.source_url} target="_blank" rel="noopener noreferrer" className={s.imgWrap} tabIndex={-1} aria-hidden>
        <NewsImage src={displayImage(n)} fallback={n.game?.cover_url} alt="" className={s.img} />
        {variant === 'feature' && <span className={s.pin}>주요 뉴스</span>}
      </a>
      <div className={s.body}>
        <div className={s.meta}>
          <span className={s.media}>{n.media}</span>
          {date && <span className={s.date}>{date}</span>}
        </div>
        <h3 className={s.title}>
          <a href={n.source_url} target="_blank" rel="noopener noreferrer">{n.title}</a>
        </h3>
        {n.summary && <p className={s.summary}>{n.summary}</p>}
        <div className={s.credit}>출처: {n.media}</div>
        <div className={s.links}>
          <a href={n.source_url} target="_blank" rel="noopener noreferrer" className={s.sourceBtn}>
            원문 보기 ↗
          </a>
          {n.game && !hideGameLink && (
            <Link href={`/games/${n.game.id}`} className={s.gameLink}>
              {n.game.title} →
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
