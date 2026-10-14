'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import s from './status.module.css'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function logout() {
    setLoading(true)
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <button className={s.btnGhost} onClick={logout} disabled={loading}>
      {loading ? '로그아웃 중...' : '로그아웃'}
    </button>
  )
}
