import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { buildCollections, loadGameStats } from '@/lib/curation'
import CollectionCard from './CollectionCard'
import Shell from './Shell'
import s from './collections.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: '추천 컬렉션 | KRITIK' }

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { games, settings } = await loadGameStats(supabase)
  const all = buildCollections(games, settings).filter((c) => !c.hidden)
  // 고정 컬렉션을 맨 앞에
  const list = [...all.filter((c) => c.pinned), ...all.filter((c) => !c.pinned)]

  return (
    <Shell title="추천 컬렉션" sub={`전문가 리뷰 ${settings.minCriticReviews}개 이상 게임으로 자동 생성된 컬렉션`}>
      {list.length === 0 ? (
        <div className={s.empty}>아직 만들어진 컬렉션이 없어요</div>
      ) : (
        <div className={s.grid}>
          {list.map((c) => <CollectionCard key={c.slug} collection={c} />)}
        </div>
      )}
    </Shell>
  )
}
