'use client'

import { useEffect, useState } from 'react'

/**
 * 접근성 · 공용 작은 조각
 *  · SrSep: 태그 사이 화면 낭독기용 쉼표 (화면에는 안 보임)
 *  · CopyrightYear: 푸터 저작권 연도 — 현재 연도 자동 (캐시된 화면이어도 브라우저에서 다시 맞춤)
 */

export function SrSep() {
  return <span className="sr-only">, </span>
}

export function CopyrightYear() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  useEffect(() => { setYear(new Date().getFullYear()) }, [])
  return <>{year}</>
}
