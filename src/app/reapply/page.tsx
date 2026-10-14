export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { resolveDestination } from '@/lib/auth-destination'
import { canReapply, koreanMonthDay, reapplyAvailableDate } from '@/lib/journalist-review'
import ReapplyClient from './ReapplyClient'

export const metadata: Metadata = { title: '기자 가입 재신청 | KRITIK' }

/** 거절된 기자의 재신청 — 거절 상태가 아니면 이동 규칙대로 */
export default async function ReapplyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { destination, journalist } = await resolveDestination(user)
  if (destination !== '/rejected' || !journalist) redirect(destination)

  const day = reapplyAvailableDate(journalist.rejected_at)
  return (
    <ReapplyClient
      initial={{
        name: journalist.name,
        media: journalist.media,
        email: journalist.email,
        article_links: journalist.article_links ?? [],
        bio: journalist.bio ?? '',
      }}
      reason={journalist.rejection_reason ?? null}
      applyCount={journalist.apply_count ?? 1}
      availableLabel={canReapply(journalist.rejected_at) ? null : koreanMonthDay(day!)}
    />
  )
}
