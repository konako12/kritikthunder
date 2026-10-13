import type { CSSProperties } from 'react'
import type { CriticReview } from '@/lib/types'
import { scoreLabel } from '@/lib/utils'
import s from './HeroAccolades.module.css'

/** 개별 점수를 보여주려면 필요한 최소 리뷰 수 — 미만이면 종합 점수만 */
const MIN_REVIEWS_FOR_QUOTES = 3

function totalColor(score: number) {
  if (score >= 90) return s.great
  if (score >= 75) return s.good
  return s.bad
}

/** 트레일러 어콜레이드 스타일 평론가 점수 — 종합 점수 + 최신 리뷰 최대 6개 */
export default function HeroAccolades({ total, reviews }: { total: number; reviews: CriticReview[] }) {
  const quotes = reviews.length >= MIN_REVIEWS_FOR_QUOTES ? reviews.slice(0, 6) : []

  return (
    <div className={`${s.root} ${quotes.length ? '' : s.totalOnly}`}>
      <div className={s.total} style={{ '--i': 0 } as CSSProperties}>
        <span className={s.totalLabel}>KRITIK 종합</span>
        <span className={`${s.totalNum} ${totalColor(total)}`}>{total}</span>
      </div>
      {quotes.length > 0 && (
        <ul className={s.grid}>
          {quotes.map((r, i) => (
            <li key={r.id} className={s.item} style={{ '--i': i + 1 } as CSSProperties}>
              <span className={s.num}>{scoreLabel(r)}</span>
              <span className={s.media}>{r.media}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
