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

  // 하이드레이션 전에 이미 실패한 이미지는 onError가 다시 오지 않으므로 직접 확인
  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) fail()
  }, [current])

  return (
    <img
      ref={ref}
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      // 일부 매체는 다른 사이트에서 이미지를 불러가면(핫링크) 차단하므로 리퍼러를 보내지 않음
      referrerPolicy="no-referrer"
      onError={fail}
    />
  )
}
