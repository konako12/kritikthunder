import Link from 'next/link'

export default function RejectedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f5f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Noto Sans KR', sans-serif",
      padding: '16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '48px 40px',
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '2.2rem',
          letterSpacing: '0.04em',
          color: '#0f172a',
          marginBottom: 6,
        }}>
          KRIT<span style={{ color: '#2563eb' }}>IK</span>
        </div>

        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✗</div>

        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
          가입 신청 거절
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
          아쉽게도 이번 심사에서 가입이 거절됐습니다.<br />
          추가 문의는 관리자에게 이메일로 연락해주세요.
        </p>

        <Link href="/" style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: '#64748b',
          color: '#fff',
          borderRadius: 8,
          fontSize: '0.88rem',
          fontWeight: 500,
          textDecoration: 'none',
        }}>
          메인으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
