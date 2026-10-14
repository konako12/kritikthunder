import type { Metadata } from 'next'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: '비밀번호 찾기 | KRITIK',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
