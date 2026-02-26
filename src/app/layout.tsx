import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KRITIK — 국내 게임 전문 평점',
  description: '국내 게임 전문지 기자와 플레이어가 함께 만드는 신뢰할 수 있는 게임 리뷰',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
