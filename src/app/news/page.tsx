import type { Metadata } from 'next'
import Link from 'next/link'
import AccountLinks from '@/components/AccountLinks'
import { createClient } from '@/lib/supabase-server'
import type { NewsWithGame } from '@/lib/types'
import { NEWS_PAGE_SIZE, NEWS_PUBLIC_SELECT } from '@/lib/news'
import NewsCard from '@/components/news/NewsCard'
import NewsList from './NewsList'
import ns from '@/components/news/news.module.css'
import s from './news.module.css'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ media?: string }>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { media } = await searchParams
  return { title: media ? `${media} 뉴스 | KRITIK` : '게임 뉴스 | KRITIK' }
}

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const media = (await searchParams).media?.trim() || null
  const supabase = await createClient()

  let pinnedQ = supabase
    .from('news')
    .select(NEWS_PUBLIC_SELECT)
    .eq('status', 'published')
    .eq('is_pinned', true)
    .order('sort_order')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  let listQ = supabase
    .from('news')
    .select(NEWS_PUBLIC_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .eq('is_pinned', false)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(0, NEWS_PAGE_SIZE - 1)
  if (media) {
    pinnedQ = pinnedQ.eq('media', media)
    listQ = listQ.eq('media', media)
  }

  const [pinnedRes, listRes, mediaRes] = await Promise.all([
    pinnedQ,
    listQ,
    supabase.from('news').select('media').eq('status', 'published'),
  ])
  const pinned = (pinnedRes.data ?? []) as NewsWithGame[]
  const list = (listRes.data ?? []) as NewsWithGame[]
  const total = listRes.count ?? list.length

  // 매체별 필터 — 기사 수 많은 순
  const counts = new Map<string, number>()
  for (const r of mediaRes.data ?? []) counts.set(r.media, (counts.get(r.media) ?? 0) + 1)
  const mediaList = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))

  const hrefFor = (m: string | null) => (m ? `/news?media=${encodeURIComponent(m)}` : '/news')

  return (
    <div className={s.root}>

      {/* HEADER */}
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <nav>
            <Link href="/games">게임</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/collections">컬렉션</Link>
            <Link href="/releases">출시 일정</Link>
            <Link href="/news" className={s.navActive}>뉴스</Link>
          </nav>
        </div>
      </header>

      {/* PAGE HERO */}
      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>NEWS</div>
          <h1 className={s.pageHeroTitle}>게임 뉴스</h1>
          <p className={s.pageHeroSub}>게임 전문 매체의 최신 기사를 모아 원문으로 연결해요</p>
        </div>
      </div>

      <div className={s.container}>

        {/* 매체별 필터 */}
        {mediaList.length > 1 && (
          <div className={s.chips}>
            <Link href={hrefFor(null)} className={`${s.chip} ${!media ? s.chipActive : ''}`}>전체</Link>
            {mediaList.map(([m, n]) => (
              <Link key={m} href={hrefFor(m)} className={`${s.chip} ${media === m ? s.chipActive : ''}`}>
                {m} <span className={s.chipCount}>{n}</span>
              </Link>
            ))}
          </div>
        )}

        {pinned.length === 0 && list.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📰</div>
            <div>{media ? `${media}의 뉴스가 아직 없어요` : '등록된 뉴스가 아직 없어요'}</div>
          </div>
        ) : (
          <>
            {/* 메인 고정 뉴스 — 맨 위에 크게 */}
            {pinned.length > 0 && (
              <div className={s.pinned}>
                {pinned.map((n) => <NewsCard key={n.id} news={n} variant="feature" />)}
              </div>
            )}

            {list.length > 0 && (
              <NewsList key={media ?? ''} initial={list} total={total} media={media} gridClass={ns.grid} />
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.ftLogo}>KRIT<span>IK</span></div>
            <div className={s.ftSub}>국내 게임 전문 평점 서비스</div>
          </div>
          <div>
            <div className={s.ftText}>
              뉴스 저작권은 각 매체에 있습니다. 기사 전문은 원문 링크에서 확인하세요.
            </div>
            <div className={s.pressLinks}>
              <AccountLinks />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
