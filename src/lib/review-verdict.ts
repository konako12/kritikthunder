/**
 * 전문가 리뷰 한줄평 (SQL 012)
 * 원칙: 한줄평은 항상 리뷰를 쓴 기자 본인의 문장 — 관리자가 대신 쓰거나 요약하지 않음
 *   own   : 기자가 CMS에서 직접 작성 (관리자 수정 불가, 숨김만 가능)
 *   quote : 관리자가 원문 기사 문장을 그대로 인용 (원문 링크 필수)
 */

export const VERDICT_MAX = 100

export type VerdictType = 'own' | 'quote'

/** DB char_length와 같은 기준(코드 포인트)으로 센 글자 수 */
export function verdictLength(v: string): number {
  return [...v.trim()].length
}

/** 한줄평 검증 — 문제가 없으면 null */
export function verdictError(v: string, label = '한줄평'): string | null {
  const n = verdictLength(v)
  if (!n) return `${label}을 입력해주세요`
  if (n > VERDICT_MAX) return `${label}은 ${VERDICT_MAX}자 이내로 입력해주세요 (지금 ${n}자)`
  return null
}

/** 전문으로 가는 링크 — 원문이 있으면 원문(새 탭), 없으면 KRITIK 리뷰 상세 */
export function fullReviewLink(r: { id: number; source_url: string | null }):
  { href: string; external: boolean; label: string } {
  return r.source_url
    ? { href: r.source_url, external: true, label: '전문 읽기 ↗' }
    : { href: `/reviews/${r.id}`, external: false, label: '전문 보기' }
}
