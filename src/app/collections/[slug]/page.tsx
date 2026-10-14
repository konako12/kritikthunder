import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { scoreClass } from '@/lib/utils'
import { buildCollections, loadGameStats } from '@/lib/curation'
import Shell from '../Shell'
import s from '../collections.module.css'

export const dynamic = 'force-dynamic'

const DETAIL_LIMIT = 10
const MEDALS = ['🥇', '🥈', '🥉']

type Params = Promise<{ slug: string }>

async function findCollection(slug: string) {
  const supabase = await createClient()
  const { games, settings } = await loadGameStats(supabase)
  const c = buildCollections(games, settings).find((x) => x.slug === slug)
  return { collection: c && !c.hidden ? c : null, settings }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection } = await findCollection((await params).slug)
  return { title: `${collection?.title ?? '컬렉션'} | KRITIK` }
}

export default async function CollectionDetailPage({ params }: { params: Params }) {
  const { collection: c, settings } = await findCollection((await params).slug)
  if (!c) notFound()

  const top = c.games.slice(0, DETAIL_LIMIT)

  return (
    <Shell title={c.title} sub={`전문가 점수 기준 상위 ${top.length}개 · 전문가 리뷰 ${settings.minCriticReviews}개 이상`}>
      <Link href="/collections" className={s.backLink}>← 전체 컬렉션</Link>
      <div className={s.list}>
        {top.map((g, i) => (
          <Link href={`/games/${g.id}`} key={g.id} className={s.row}>
            <span className={`${s.rank} ${i < 3 ? s.rankTop : ''}`}>{i < 3 ? MEDALS[i] : i + 1}</span>
            {g.cover_url ? (
              <img src={g.cover_url} alt="" className={s.cover} />
            ) : (
              <span className={s.coverFallback} aria-hidden>{g.title[0]}</span>
            )}
            <span className={s.info}>
              <span className={s.title}>{g.title}</span>
              <span className={s.meta}>{g.developer} · {g.release_date ?? g.year}</span>
            </span>
            <span className={s.genreCol}>{g.genre}</span>
            <span className={s.scoreCol}>
              <span className={`${s.scoreChip} ${scoreClass(g.critic_score)}`}>{g.critic_score}</span>
            </span>
          </Link>
        ))}
      </div>
    </Shell>
  )
}
