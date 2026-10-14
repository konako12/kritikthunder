import Link from 'next/link'
import type { CriticReview } from '@/lib/types'
import { fullReviewLink } from '@/lib/review-verdict'
import s from './review.module.css'

type ReviewLike = Pick<CriticReview, 'id' | 'verdict' | 'verdict_type' | 'review_text' | 'source_url'>

/**
 * 전문가 리뷰 한줄평
 *  · quote(원문 인용) → 따옴표 스타일
 *  · own(기자 직접 작성) → 일반 문장
 *  · 한줄평이 없는 기존 리뷰 → 전문을 2줄로 잘라 임시 표시
 */
export function ReviewVerdict({ review, size = 'md' }: { review: ReviewLike; size?: 'md' | 'lg' }) {
  const sz = size === 'lg' ? s.lg : s.md
  if (review.verdict && review.verdict_type === 'quote') {
    return (
      <blockquote className={`${s.quote} ${sz}`} cite={review.source_url ?? undefined}>
        <p>{review.verdict}</p>
        <span className={s.quoteNote}>원문 인용</span>
      </blockquote>
    )
  }
  if (review.verdict) return <p className={`${s.own} ${sz}`}>{review.verdict}</p>
  return <p className={`${s.fallback} ${sz}`}>{review.review_text}</p>
}

/** "전문 읽기 ↗"(원문, 새 탭) 또는 "전문 보기"(KRITIK 리뷰 상세) */
export function FullReviewLink({ review, className }: { review: Pick<CriticReview, 'id' | 'source_url'>; className?: string }) {
  const link = fullReviewLink(review)
  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{link.label}</a>
  ) : (
    <Link href={link.href} className={className}>{link.label}</Link>
  )
}
