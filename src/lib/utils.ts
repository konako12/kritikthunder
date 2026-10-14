/** 점수에 따른 색상 클래스 */
export function scoreClass(score: number | null): string {
  if (score === null) return 'score-tbd'
  if (score >= 90) return 'score-great'
  if (score >= 75) return 'score-good'
  return 'score-bad'
}

/** 별점 → 퍼센트 (0~100) */
export function starsToPercent(stars: number): number {
  return (stars / 5) * 100
}

/** 날짜 포맷 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 닉네임 첫 글자 */
export function initial(name: string): string {
  return name[0] ?? '?'
}

/** 원문 링크 검증 — 비어 있으면 통과, 아니면 http(s):// 주소만 허용 */
export function isValidSourceUrl(url: string): boolean {
  const v = url.trim()
  if (!v) return true
  if (!/^https?:\/\/\S+$/i.test(v)) return false
  try { new URL(v); return true } catch { return false }
}

/** 입력값 → DB 저장값 (빈 문자열은 null) */
export function normalizeSourceUrl(url: string | null | undefined): string | null {
  const v = (url ?? '').trim()
  return v ? v : null
}

/** 출처 도메인 (예: https://www.example.com/view.php → example.com) */
export function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** 원래 점수 표기 최대 길이 (예: "9.5/10", "88/100") */
export const SCORE_DISPLAY_MAX = 12

/** 원래 점수 표기 입력값 → DB 저장값 (빈 문자열은 null, "9 / 10" → "9/10") */
export function normalizeScoreDisplay(v: string | null | undefined): string | null {
  const t = (v ?? '').trim().replace(/\s*\/\s*/g, '/')
  return t ? t : null
}

const SCORE_DISPLAY_RE = /^(\d{1,3}(?:\.\d{1,2})?)\/(\d{1,3}(?:\.\d{1,2})?)$/

/** 만점이 포함된 형식인지 — "9/10", "4.5/5" (점수 ≤ 만점). 빈 값은 통과 */
export function isValidScoreDisplay(v: string | null | undefined): boolean {
  const t = normalizeScoreDisplay(v)
  if (!t) return true
  const m = SCORE_DISPLAY_RE.exec(t)
  return !!m && Number(m[2]) > 0 && Number(m[1]) <= Number(m[2])
}

export const SCORE_DISPLAY_HINT = '원래 점수 표기는 "9/10", "4.5/5"처럼 만점을 함께 적어주세요'

/** 화면 표시용 점수 — 만점이 포함된 원래 표기가 있으면 그대로, 아니면(없거나 "8.8"처럼 숫자만) 100점 환산 "96/100" */
export function scoreLabel(r: { score: number; score_display?: string | null }): string {
  return r.score_display && isValidScoreDisplay(r.score_display) ? normalizeScoreDisplay(r.score_display)! : `${r.score}/100`
}

/** 게임 커버 이미지 대체 텍스트 */
export function coverAlt(title: string): string {
  return `${title} 커버`
}

/** 게임 검색 — 한국어 제목 · 원어 제목 둘 다로 찾기 (대소문자·공백 무시) */
export function gameTitleMatches(g: { title: string; title_original?: string | null }, query: string): boolean {
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, '')
  const q = norm(query)
  if (!q) return true
  return norm(g.title).includes(q) || (!!g.title_original && norm(g.title_original).includes(q))
}

/** 출시일 표시 — 날짜가 있으면 2026.10.15, 없으면 2026년 */
export function formatReleaseDate(g: { release_date: string | null; year: number }): string {
  return g.release_date ? g.release_date.replaceAll('-', '.') : `${g.year}년`
}
