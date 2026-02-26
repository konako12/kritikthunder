import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KRITIK CMS — 기자 리뷰 작성',
}

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
