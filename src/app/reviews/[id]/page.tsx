import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AccountLinks from '@/components/AccountLinks'
import { ReviewVerdict } from '@/components/review/ReviewVerdict'
import { createClient } from '@/lib/supabase-server'
import type { CriticReview, Game } from '@/lib/types'
import { isValidScoreDisplay, scoreClass, sourceDomain } from '@/lib/utils'
import { platformLabels } from '@/lib/platforms'
import s from './review.module.css'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

/** 전문가 리뷰 + 게임 — 숨긴 리뷰는 RLS에서 빠져 404 */
async function load(idParam: string) {
  const id = Number(idParam)
  if (!Number.isInteger(id) || id <= 0) return null
  const supabase = await createClient()
  const { data: review } = await supabase.from('critic_reviews').select('*').eq('id', id).maybeSingle()
  if (!review) return null
  const { data: game } = await supabase.from('games').select('*').eq('id', review.game_id).maybeSingle()
  if (!game) return null
  return { review: review as CriticReview, game: game as Game }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load((await params).id)
  if (!data) return { title: '리뷰를 찾을 수 없어요 | KRITIK' }
  const { review, game } = data
  return {
    title: `${game.title} 리뷰 — ${review.media} ${review.reviewer_name} | KRITIK`,
    description: review.verdict ?? review.review_text?.slice(0, 120) ?? undefined,
  }
}

export default async function ReviewPage({ params }: { params: Params }) {
  const data = await load((await params).id)
  if (!data) notFound()
  const { review: r, game } = data
  const body = r.review_text?.trim() ?? ''
  const platforms = platformLabels(game.platforms ?? [])

  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <nav>
            <Link href="/games">게임</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/collections">컬렉션</Link>
            <Link href="/releases">출시 일정</Link>
            <Link href="/news">뉴스</Link>
          </nav>
        </div>
      </header>

      <main className={s.container}>
        {/* 게임 정보 */}
        <Link href={`/games/${game.id}`} className={s.game}>
          {game.cover_url && <img src={game.cover_url} alt="" className={s.gameCover} />}
          <div className={s.gameInfo}>
            <div className={s.gameLabel}>전문가 리뷰</div>
            <div className={s.gameTitle}>{game.title}</div>
            {game.title_original && game.title_original !== game.title && (
              <div className={s.gameOriginal}>{game.title_original}</div>
            )}
            <div className={s.gameMeta}>
              {[game.developer, game.year, game.genre, ...platforms].filter(Boolean).join(' · ')}
            </div>
          </div>
          <span className={s.gameGo}>게임 페이지 →</span>
        </Link>

        <article className={s.review}>
          {/* 점수 + 매체 / 기자 */}
          <div className={s.top}>
            <div className={`${s.score} ${scoreClass(r.score)}`}>{r.score}</div>
            <div className={s.who}>
              <div className={s.media}>{r.media}</div>
              <div className={s.reviewer}>{r.reviewer_name}</div>
              <div className={s.meta}>
                {r.published_at.replaceAll('-', '.')}
                {r.score_display && isValidScoreDisplay(r.score_display) && <> · 원래 점수 {r.score_display}</>}
              </div>
            </div>
          </div>

          {/* 한줄평 */}
          {r.verdict && (
            <div className={s.verdict}><ReviewVerdict review={r} size="lg" /></div>
          )}

          {/* 전문 */}
          {body ? (
            <div className={s.body}>
              {body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
          ) : (
            <p className={s.noBody}>이 리뷰의 전문은 원문 기사에서 볼 수 있어요.</p>
          )}

          {r.source_url && (
            <div className={s.source}>
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" className={s.sourceLink}>
                원문 기사 읽기 ↗
              </a>
              <span className={s.sourceDomain}>{sourceDomain(r.source_url)}</span>
            </div>
          )}
        </article>

        <Link href={`/games/${game.id}`} className={s.back}>← {game.title}의 다른 리뷰 보기</Link>
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.ftLogo}>KRIT<span>IK</span></div>
            <div className={s.ftSub}>국내 게임 전문 평점 서비스</div>
          </div>
          <div>
            <div className={s.ftText}>리뷰 저작권은 작성한 기자와 매체에 있습니다.</div>
            <div className={s.pressLinks}><AccountLinks /></div>
          </div>
        </div>
      </footer>
    </div>
  )
}
