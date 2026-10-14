import type { ReactNode } from 'react'
import s from './status.module.css'

/** 안내 페이지 공용 카드 — /pending · /rejected · /no-access */
export default function StatusCard({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>KRIT<span>IK</span></div>
        <div className={s.icon}>{icon}</div>
        <h1 className={s.title}>{title}</h1>
        {children}
      </div>
    </div>
  )
}
