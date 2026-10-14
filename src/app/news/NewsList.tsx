'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { NewsWithGame } from '@/lib/types'
import { NEWS_PAGE_SIZE, NEWS_PUBLIC_SELECT } from '@/lib/news'
import NewsCard from '@/components/news/NewsCard'
import s from './news.module.css'

interface Props {
  initial: NewsWithGame[]
  total: number
  media: string | null
  gridClass: string
}

/** 고정되지 않은 뉴스 목록 — 20개씩 "더 보기" */
export default function NewsList({ initial, total, media, gridClass }: Props) {
  const [items, setItems] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadMore() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    let q = supabase
      .from('news')
      .select(NEWS_PUBLIC_SELECT)
      .eq('status', 'published')
      .eq('is_pinned', false)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(items.length, items.length + NEWS_PAGE_SIZE - 1)
    if (media) q = q.eq('media', media)
    const { data, error: err } = await q
    setLoading(false)
    if (err) { setError('뉴스를 더 불러오지 못했어요. 잠시 후 다시 시도해주세요.'); return }
    // 그 사이 새 뉴스가 추가돼 순서가 밀린 경우 중복 제거
    setItems((prev) => {
      const seen = new Set(prev.map((n) => n.id))
      return [...prev, ...((data ?? []) as NewsWithGame[]).filter((n) => !seen.has(n.id))]
    })
  }

  return (
    <>
      <div className={gridClass}>
        {items.map((n) => <NewsCard key={n.id} news={n} />)}
      </div>
      {error && <div className={s.loadError}>{error}</div>}
      {items.length < total && (
        <div className={s.moreWrap}>
          <button className={s.moreBtn} onClick={loadMore} disabled={loading}>
            {loading ? '불러오는 중...' : `더 보기 (${items.length} / ${total})`}
          </button>
        </div>
      )}
    </>
  )
}
