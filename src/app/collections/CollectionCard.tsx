import Link from 'next/link'
import { scoreClass } from '@/lib/utils'
import type { Collection } from '@/lib/curation'
import s from './collections.module.css'

const STACK = [s.stack0, s.stack1, s.stack2]

/** 상위 3개 게임 커버를 겹쳐 보여주는 컬렉션 카드 */
export default function CollectionCard({ collection: c }: { collection: Collection }) {
  const top3 = c.games.slice(0, 3)
  return (
    <Link href={`/collections/${c.slug}`} className={s.card}>
      <div className={s.stack}>
        {top3.map((g, i) => (
          <div key={g.id} className={`${s.stackItem} ${STACK[i]}`}>
            {g.cover_url ? <img src={g.cover_url} alt={g.title} /> : <span>{g.title[0]}</span>}
          </div>
        ))}
      </div>
      <div className={s.cardBody}>
        {c.pinned && <span className={s.pinBadge}>추천</span>}
        <div className={s.cardTitle}>{c.title}</div>
        <ol className={s.cardList}>
          {top3.map((g, i) => (
            <li key={g.id}>
              <span className={s.cardRank}>{i + 1}</span>
              <span className={s.cardGame}>{g.title}</span>
              <span className={`${s.cardScore} ${scoreClass(g.critic_score)}`}>{g.critic_score}</span>
            </li>
          ))}
        </ol>
        <div className={s.cardMore}>{c.size}개 게임 · 전체 보기 →</div>
      </div>
    </Link>
  )
}
