/** 비밀번호 재설정 메일 링크로 들어왔음을 표시하는 쿠키 (재설정 페이지 진입 허용용) */
export const RECOVERY_COOKIE = 'kritik_pw_recovery'

/** 재설정 링크 유효 시간 동안만 비밀번호 변경 허용 (초) */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60

/** 비밀번호 최소 길이 (가입 신청과 동일) */
export const PASSWORD_MIN_LENGTH = 6

/** 외부 사이트로의 오픈 리다이렉트 방지 — 사이트 내부 경로만 허용 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

/** 새 비밀번호 검증 — 문제가 있으면 안내 문구, 없으면 null */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
  if (password !== confirm) return '새 비밀번호가 일치하지 않습니다.'
  return null
}
