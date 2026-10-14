'use client'

import { useEffect, useRef, useState } from 'react'
import { NEWS_DEFAULT_IMAGE } from '@/lib/news'

interface Props {
  src: string | null
  /** src가 깨졌을 때 쓸 이미지 (관련 게임 커버) */
  fallback?: string | null
  alt: string
  className?: string
}

/**
 * 뉴스 이미지 — 원문 이미지가 깨지면 관련 게임 커버 → 기본 이미지 순으로 자동 대체.
 * 외부 매체 이미지 주소를 그대로 쓰기 때문에 next/image가 아닌 <img>를 사용한다
 * (next.config의 images.remotePatterns 허용 목록에 막히지 않음).
 */
export default function NewsImage({ src, fallback, alt, className }: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState<string[]>([])

  const candidates = [src, fallback, NEWS_DEFAULT_IMAGE].filter((v): v is string => !!v)
  const current = candidates.find((c) => !failed.includes(c)) ?? NEWS_DEFAULT_IMAGE

  const fail = () => {
    if (current !== NEWS_DEFAULT_IMAGE) setFailed((f) => [...f, current])
  }

  // 하이드레이션 전에 이미 실패한 이미지는 onError가 다시 오지 않으므로 직접 확인.
  // 단, loading="lazy" 이미지는 아직 화면 밖이라 안 불러온 상태에서도 complete=true, naturalWidth=0으로
  // 보일 수 있어 그것만으로 실패 처리하면 멀쩡한 이미지가 기본 이미지로 바뀐다.
  // → 의심될 때만 같은 조건(리퍼러 없음)으로 따로 불러와 보고, 실제로 실패할 때만 대체.
  useEffect(() => {
    const img = ref.current
    if (!img || !img.complete || img.naturalWidth > 0 || current === NEWS_DEFAULT_IMAGE) return
    let cancelled = false
    const probe = new Image()
    probe.referrerPolicy = 'no-referrer'
    probe.onerror = () => { if (!cancelled) fail() }
    probe.src = current
    return () => { cancelled = true }
  }, [current])

  return (
    <img
      ref={ref}
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      // 외부 매체에 우리 사이트 주소(리퍼러)를 보내지 않음 — 관리자 미리보기와 공개 화면이 같은 조건으로 요청
      referrerPolicy="no-referrer"
      onError={fail}
    />
  )
}
