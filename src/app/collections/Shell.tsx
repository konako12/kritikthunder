import Link from 'next/link'
import { CopyrightYear } from '@/components/a11y'
import type { ReactNode } from 'react'
import s from './collections.module.css'

/** 컬렉션 목록/상세 공용 헤더·히어로·푸터 */
export default function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" className={s.logo}>KRIT<span>IK</span></Link>
          <nav>
            <Link href="/games">게임</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/collections" className={s.navActive}>컬렉션</Link>
            <Link href="/releases">출시 일정</Link>
            <Link href="/news">뉴스</Link>
          </nav>
        </div>
      </header>

      <div className={s.pageHero}>
        <div className={s.pageHeroInner}>
          <div className={s.pageHeroBadge}>COLLECTION</div>
          <h1 className={s.pageHeroTitle}>{title}</h1>
          <p className={s.pageHeroSub}>{sub}</p>
        </div>
      </div>

      <div className={s.container}>{children}</div>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.ftLogo}>KRIT<span>IK</span></div>
            <div className={s.ftSub}>국내 게임 전문 평점 서비스</div>
          </div>
          <div className={s.ftText}>© <CopyrightYear /> KRITIK. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
