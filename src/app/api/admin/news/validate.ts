import { NEWS_MEDIA_MAX, NEWS_SUMMARY_MAX, NEWS_TITLE_MAX } from '@/lib/news'

const URL_RE = /^https?:\/\/\S+$/i
const isHttpUrl = (v: string) => {
  if (!URL_RE.test(v)) return false
  try { new URL(v); return true } catch { return false }
}

const STATUSES = ['draft', 'published', 'hidden']
const IMAGE_SOURCES = ['original', 'upload', 'game_cover']

/** 관리자가 쓸 수 있는 news 필드만 골라 검증 (partial: 보낸 필드만) */
export function pickNewsFields(body: Record<string, unknown>, { partial }: { partial: boolean }) {
  const out: Record<string, unknown> = {}
  const has = (k: string) => k in body
  const str = (k: string) => String(body[k] ?? '').trim()

  if (!partial || has('title')) {
    const v = str('title')
    if (!v) return { error: '기사 제목을 입력해주세요' }
    if (v.length > NEWS_TITLE_MAX) return { error: `기사 제목은 ${NEWS_TITLE_MAX}자 이내로 입력해주세요` }
    out.title = v
  }
  if (!partial || has('media')) {
    const v = str('media')
    if (!v) return { error: '매체명을 입력해주세요' }
    if (v.length > NEWS_MEDIA_MAX) return { error: `매체명은 ${NEWS_MEDIA_MAX}자 이내로 입력해주세요` }
    out.media = v
  }
  if (!partial || has('source_url')) {
    const v = str('source_url')
    if (!v) return { error: '원문 링크를 입력해주세요' }
    if (!isHttpUrl(v)) return { error: '원문 링크는 http:// 또는 https://로 시작해야 해요' }
    out.source_url = v
  }
  if (!partial || has('summary')) {
    const v = str('summary')
    if (v.length > NEWS_SUMMARY_MAX) return { error: `첫 문단은 ${NEWS_SUMMARY_MAX}자 이내로 입력해주세요` }
    out.summary = v || null
  }
  if (!partial || has('published_at')) {
    const v = str('published_at')
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: '원문 게재일 형식이 올바르지 않아요' }
    out.published_at = v || null
  }
  for (const key of ['image_url', 'original_image_url'] as const) {
    if (!partial || has(key)) {
      const v = str(key)
      if (v && !isHttpUrl(v)) return { error: '이미지 주소는 http:// 또는 https://로 시작해야 해요' }
      out[key] = v || null
    }
  }
  if (!partial || has('image_source')) {
    const v = str('image_source')
    if (v && !IMAGE_SOURCES.includes(v)) return { error: '이미지 출처 값이 올바르지 않아요' }
    out.image_source = v || null
  }
  if ('image_url' in out && !out.image_url) out.image_source = null
  if (!partial || has('game_id')) {
    const raw = body.game_id
    if (raw === null || raw === '' || raw === undefined) out.game_id = null
    else {
      const id = Number(raw)
      if (!Number.isInteger(id) || id <= 0) return { error: '관련 게임 값이 올바르지 않아요' }
      out.game_id = id
    }
  }
  if (!partial || has('status')) {
    const v = str('status') || 'draft'
    if (!STATUSES.includes(v)) return { error: '상태 값이 올바르지 않아요' }
    out.status = v
  }
  if (!partial || has('is_pinned')) {
    out.is_pinned = body.is_pinned === true
  }
  if (!partial || has('sort_order')) {
    const n = Number(body.sort_order ?? 0)
    if (!Number.isInteger(n) || n < 0 || n > 9999) return { error: '노출 순서는 0~9999 사이 정수로 입력해주세요' }
    out.sort_order = n
  }
  // 고정 해제 시 순서도 초기화 (고정 뉴스끼리만 순서를 쓰므로)
  if (out.is_pinned === false) out.sort_order = 0
  return { fields: out }
}
