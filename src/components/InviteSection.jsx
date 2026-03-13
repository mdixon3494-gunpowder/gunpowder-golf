import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

function InviteSection({ leagueId }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [copied, setCopied] = useState(null) // 'code' | 'link' | 'message' | null

  const basePath = import.meta.env.BASE_URL || '/'
  const inviteLink = `${window.location.origin}${basePath}?join=${leagueId}`

  useEffect(() => {
    QRCode.toDataURL(inviteLink, { width: 200, margin: 2, color: { dark: '#333' } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('QR generation failed:', err))
  }, [inviteLink])

  const copy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `${leagueId}-invite-qr.png`
    a.click()
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Invite Players</h3>

      {/* League Code */}
      <div style={{
        background: 'var(--color-surface-sunken)',
        padding: '12px 15px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>League Code</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>{leagueId}</div>
        </div>
        <button
          onClick={() => copy(leagueId, 'code')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: copied === 'code' ? 'var(--color-success-light)' : 'var(--color-surface)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            color: copied === 'code' ? 'var(--color-success)' : 'var(--color-text-primary)'
          }}
        >
          {copied === 'code' ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Invite Link */}
      <div style={{
        background: 'var(--color-surface-sunken)',
        padding: '12px 15px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Invite Link</div>
          <div style={{
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {inviteLink}
          </div>
        </div>
        <button
          onClick={() => copy(inviteLink, 'link')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: copied === 'link' ? 'var(--color-success-light)' : 'var(--color-surface)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            flexShrink: 0,
            color: copied === 'link' ? 'var(--color-success)' : 'var(--color-text-primary)'
          }}
        >
          {copied === 'link' ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Copy Invite Message */}
      <button
        onClick={() => {
          const message = `You're invited to join my golf league on Gunpowder Big Boy's Golf!\n\nJoin with this link: ${inviteLink}\n\nOr use league code: ${leagueId}`
          copy(message, 'message')
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
          background: copied === 'message' ? 'var(--color-success-light)' : 'var(--color-surface)',
          cursor: 'pointer',
          marginBottom: '16px',
          textAlign: 'left'
        }}
      >
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: copied === 'message' ? 'var(--color-success)' : 'var(--color-text-primary)',
          marginBottom: '2px'
        }}>
          {copied === 'message' ? 'Copied to clipboard!' : 'Copy Invite Message'}
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)'
        }}>
          Copy a ready-to-send message with the join link and league code
        </div>
      </button>

      {/* QR Code */}
      {qrDataUrl && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={qrDataUrl}
            alt="Invite QR Code"
            style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          />
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={downloadQR}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--color-text-primary)'
              }}
            >
              Download QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default InviteSection
