import { addLeagueMember } from '../lib/leagueService'

function PendingApprovalList({ leagueId, pendingRequests, onUpdate }) {
  if (!pendingRequests || pendingRequests.length === 0) return null

  const handleApprove = async (request) => {
    try {
      if (request.profileId) {
        await addLeagueMember(leagueId, request.profileId, 'player')
      }
      onUpdate(pendingRequests.filter(r => r.id !== request.id))
    } catch (err) {
      console.warn('Failed to approve member:', err)
    }
  }

  const handleReject = (request) => {
    onUpdate(pendingRequests.filter(r => r.id !== request.id))
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '2px solid #ff9800'
    }}>
      <h3 style={{ marginBottom: '4px', color: '#e65100' }}>Pending Join Requests</h3>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>
        {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} waiting for approval
      </p>

      {pendingRequests.map(request => (
        <div key={request.id} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px',
          borderRadius: '8px',
          background: '#fff8e1',
          marginBottom: '8px'
        }}>
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{request.name || 'Unknown'}</div>
            {request.email && (
              <div style={{ fontSize: '12px', color: '#666' }}>{request.email}</div>
            )}
            {request.requestedAt && (
              <div style={{ fontSize: '11px', color: '#999' }}>
                {new Date(request.requestedAt).toLocaleDateString()}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleApprove(request)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: '#27ae60',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              Approve
            </button>
            <button
              onClick={() => handleReject(request)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#666'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PendingApprovalList
