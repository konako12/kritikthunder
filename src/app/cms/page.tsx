export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import CmsClient from './CmsClient'

export default async function CmsPage() {
  const supabase = await createClient()

  const [gamesRes, journalistsRes] = await Promise.all([
    supabase.from('games').select('id,title,cover_url,developer,year').eq('status', 'published').order('title'),
    supabase.from('journalists').select('*').eq('status', 'approved').order('name'),
  ])

  return (
    <CmsClient
      games={gamesRes.data ?? []}
      journalists={journalistsRes.data ?? []}
    />
  )
}
