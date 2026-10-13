import Link from 'next/link'

export default function PendingPage() {
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

        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>

        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
          승인 대기 중
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
          가입 신청이 접수됐습니다.<br />
          관리자 심사 후 승인 시 이용 가능합니다.<br />
          심사는 영업일 기준 1~3일 소요될 수 있습니다.
        </p>

        <Link href="/login" style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 8,
          fontSize: '0.88rem',
          fontWeight: 500,
          textDecoration: 'none',
        }}>
          로그인 페이지로
        </Link>
      </div>
    </div>
  )
}
