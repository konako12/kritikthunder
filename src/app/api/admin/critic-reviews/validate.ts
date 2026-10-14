import { isValidSourceUrl, normalizeSourceUrl, normalizeScoreDisplay, SCORE_DISPLAY_MAX } from '@/lib/utils'
import { verdictError } from '@/lib/review-verdict'

/**
 * 관리자가 쓸 수 있는 critic_reviews 필드만 골라 검증
 *  · 한줄평은 원문 인용(quote)으로만 — 기자 한줄평(own)은 쓰거나 고칠 수 없음 (라우트 · DB 트리거에서도 막음)
 *  · 전문(review_text)은 관리자가 쓰지 않음 — 외부 리뷰는 원문 링크로 연결
 */
export function pickReviewFields(body: Record<string, unknown>, { partial }: { partial: boolean }) {
  const out: Record<string, unknown> = {}
  const has = (k: string) => k in body

  if (!partial || has('game_id')) {
    const id = Number(body.game_id)
    if (!Number.isInteger(id) || id <= 0) return { error: '게임을 선택해주세요' }
    out.game_id = id
  }
  for (const [key, label] of [['media', '매체명'], ['reviewer_name', '기자명']] as const) {
    if (!partial || has(key)) {
      const v = String(body[key] ?? '').trim()
      if (!v) return { error: `${label}을 입력해주세요` }
      out[key] = v
    }
  }
  if (!partial || has('score')) {
    const n = Number(body.score)
    if (!Number.isInteger(n) || n < 0 || n > 100) return { error: '점수를 0~100 사이 정수로 입력해주세요' }
    out.score = n
  }
  if (!partial || has('published_at')) {
    const d = String(body.published_at ?? '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: '게재일을 입력해주세요' }
    out.published_at = d
  }
  if (!partial || has('source_url')) {
    const url = String(body.source_url ?? '')
    if (!isValidSourceUrl(url)) return { error: '원문 링크는 http:// 또는 https://로 시작해야 해요' }
    out.source_url = normalizeSourceUrl(url)
    if (!partial && !out.source_url) return { error: '원문 기사 링크를 입력해주세요' }
  }
  if (!partial || has('score_display')) {
    const v = normalizeScoreDisplay(String(body.score_display ?? ''))
    if (v && v.length > SCORE_DISPLAY_MAX) return { error: `원래 점수 표기는 ${SCORE_DISPLAY_MAX}자 이내로 입력해주세요` }
    if (v !== null || partial) out.score_display = v // 새 등록 시 빈 값은 보내지 않음
  }
  // 원문 인용 문장 — 새 등록은 필수, 수정 때 빈 값이면 인용 삭제
  if (!partial || has('verdict')) {
    const v = String(body.verdict ?? '').trim()
    if (v || !partial) {
      const err = verdictError(v, '원문 인용 문장')
      if (err) return { error: err }
      out.verdict = v
      out.verdict_type = 'quote'
    } else {
      out.verdict = null
      out.verdict_type = null
    }
  }
  if (partial && has('is_hidden')) {
    out.is_hidden = body.is_hidden === true
    out.hidden_at = body.is_hidden === true ? new Date().toISOString() : null
  }
  return { fields: out }
}
