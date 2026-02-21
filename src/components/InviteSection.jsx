import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

function InviteSection({ leagueId }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [copied, setCopied] = useState(null) // 'code' | 'link' | null

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
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Invite Players</h3>

      {/* League Code */}
      <div style={{
        background: '#f8f9fa',
        padding: '12px 15px',
        borderRadius: '8px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>League Code</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>{leagueId}</div>
        </div>
        <button
          onClick={() => copy(leagueId, 'code')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            background: copied === 'code' ? '#e8f5e9' : 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            color: copied === 'code' ? '#27ae60' : '#333'
          }}
        >
          {copied === 'code' ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Invite Link */}
      <div style={{
        background: '#f8f9fa',
        padding: '12px 15px',
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Invite Link</div>
          <div style={{
            fontSize: '12px',
            color: '#333',
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
            border: '1px solid #ddd',
            background: copied === 'link' ? '#e8f5e9' : 'white',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            flexShrink: 0,
            color: copied === 'link' ? '#27ae60' : '#333'
          }}
        >
          {copied === 'link' ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* QR Code */}
      {qrDataUrl && (
        <div style={{ textAlign: 'center' }}>
          <img
            src={qrDataUrl}
            alt="Invite QR Code"
            style={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
          />
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={downloadQR}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#333'
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
