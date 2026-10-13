import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return <RegisterClient />
}
