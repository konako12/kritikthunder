export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import LoginClient from './LoginClient'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // 승인된 기자이면 /cms, 그 외는 /admin
    const { data: journalist } = await supabase
      .from('journalists')
      .select('id')
      .eq('email', user.email!)
      .eq('status', 'approved')
      .maybeSingle()

    redirect(journalist ? '/cms' : '/admin')
  }

  return <LoginClient />
}
