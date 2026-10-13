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

/** 출처 도메인 (예: https://www.gamemeca.com/view.php → gamemeca.com) */
export function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}
