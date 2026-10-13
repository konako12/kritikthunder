import { isValidSourceUrl, normalizeSourceUrl, normalizeScoreDisplay, SCORE_DISPLAY_MAX } from '@/lib/utils'

/** 관리자가 쓸 수 있는 critic_reviews 필드만 골라 검증 */
export function pickReviewFields(body: Record<string, unknown>, { partial }: { partial: boolean }) {
  const out: Record<string, unknown> = {}
  const has = (k: string) => k in body

  if (!partial || has('game_id')) {
    const id = Number(body.game_id)
    if (!Number.isInteger(id) || id <= 0) return { error: '게임을 선택해주세요' }
    out.game_id = id
  }
  for (const [key, label] of [['media', '매체명'], ['reviewer_name', '기자명'], ['review_text', '요약']] as const) {
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
  }
  if (!partial || has('score_display')) {
    const v = normalizeScoreDisplay(String(body.score_display ?? ''))
    if (v && v.length > SCORE_DISPLAY_MAX) return { error: `원래 점수 표기는 ${SCORE_DISPLAY_MAX}자 이내로 입력해주세요` }
    if (v !== null || partial) out.score_display = v // 새 등록 시 빈 값은 보내지 않음
  }
  return { fields: out }
}
