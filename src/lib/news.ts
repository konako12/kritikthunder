/** 뉴스 공용 상수·헬퍼 (서버·클라이언트 모두 사용) */

export const NEWS_SUMMARY_MAX = 300
export const NEWS_TITLE_MAX = 200
export const NEWS_MEDIA_MAX = 50
export const NEWS_PAGE_SIZE = 20

/** 이미지가 없거나 깨졌을 때 마지막으로 쓰는 기본 이미지 */
export const NEWS_DEFAULT_IMAGE = '/news-placeholder.svg'

/** 공개 화면 select — 관련 게임 커버까지 한 번에 */
export const NEWS_PUBLIC_SELECT = '*, game:games(id,title,cover_url)'

export const NEWS_STATUS_LABEL = {
  draft: '임시저장',
  published: '게시',
  hidden: '숨김',
} as const

export const NEWS_IMAGE_SOURCE_LABEL = {
  original: '원문 대표 이미지',
  upload: '직접 업로드',
  game_cover: '관련 게임 커버',
} as const

/** 같은 기사인지 비교용 주소 — 대소문자·끝 슬래시·#·추적 파라미터 차이 무시 */
export function normalizeNewsUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key)
    }
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.hostname.replace(/^www\./, '').toLowerCase()}${path}${u.search}`
  } catch {
    return url.trim().toLowerCase()
  }
}

/** 2025-03-02 → 2025.03.02 */
export function formatNewsDate(date: string | null): string {
  return date ? date.slice(0, 10).replaceAll('-', '.') : ''
}
