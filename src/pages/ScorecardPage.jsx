import { GUNPOWDER_SCORECARD, getFront9Par, getBack9Par, getTotalPar } from '../lib/courseData'

function NineHoleTable({ holes, title, headerColor, outLabel, outBgColor }) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
  const totalGold = holes.reduce((sum, h) => sum + h.gold, 0)
  const totalBlue = holes.reduce((sum, h) => sum + h.blue, 0)
  const totalRed = holes.reduce((sum, h) => sum + h.red, 0)

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        background: headerColor,
        color: 'white',
        padding: '15px 20px',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                borderBottom: '2px solid #e0e0e0',
                minWidth: '70px'
              }}>
                Hole
              </th>
              {holes.map(hole => (
                <th key={hole.hole} style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontWeight: '600',
                  borderBottom: '2px solid #e0e0e0',
                  minWidth: '45px'
                }}>
                  {hole.hole}
                </th>
              ))}
              <th style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                borderBottom: '2px solid #e0e0e0',
                background: outBgColor,
                minWidth: '55px'
              }}>
                {outLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Par Row */}
            <tr>
              <td style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: '600',
                background: '#f8f9fa'
              }}>
                Par
              </td>
              {holes.map(hole => (
                <td key={hole.hole} style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: hole.par === 3 ? '#e74c3c' : hole.par === 5 ? '#3498db' : '#333'
                }}>
                  {hole.par}
                </td>
              ))}
              <td style={{
                padding: '10px 12px',
                textAlign: 'center',
                fontWeight: 'bold',
                background: outBgColor
              }}>
                {totalPar}
              </td>
            </tr>

            {/* Gold Tees */}
            <tr style={{ background: '#fffde7' }}>
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#f9a825'
              }}>
                Gold
              </td>
              {holes.map(hole => (
                <td key={hole.hole} style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '13px'
                }}>
                  {hole.gold}
                </td>
              ))}
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 'bold',
                background: '#fff8e1',
                fontSize: '13px'
              }}>
                {totalGold}
              </td>
            </tr>

            {/* Blue Tees */}
            <tr style={{ background: '#e3f2fd' }}>
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#1976d2'
              }}>
                Blue
              </td>
              {holes.map(hole => (
                <td key={hole.hole} style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '13px'
                }}>
                  {hole.blue}
                </td>
              ))}
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 'bold',
                background: '#bbdefb',
                fontSize: '13px'
              }}>
                {totalBlue}
              </td>
            </tr>

            {/* Red Tees */}
            <tr style={{ background: '#ffebee' }}>
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#c62828'
              }}>
                Red
              </td>
              {holes.map(hole => (
                <td key={hole.hole} style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '13px'
                }}>
                  {hole.red}
                </td>
              ))}
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 'bold',
                background: '#ffcdd2',
                fontSize: '13px'
              }}>
                {totalRed}
              </td>
            </tr>

            {/* Handicap Row */}
            <tr style={{ background: '#f5f5f5' }}>
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#666'
              }}>
                HCP
              </td>
              {holes.map(hole => (
                <td key={hole.hole} style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '12px'
                }}>
                  {hole.hcp}
                </td>
              ))}
              <td style={{
                padding: '8px 12px',
                textAlign: 'center',
                background: outBgColor
              }}>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CourseTotals() {
  const totalPar = getTotalPar()
  const goldTotal = GUNPOWDER_SCORECARD.front9.reduce((sum, h) => sum + h.gold, 0) +
                    GUNPOWDER_SCORECARD.back9.reduce((sum, h) => sum + h.gold, 0)
  const blueTotal = GUNPOWDER_SCORECARD.front9.reduce((sum, h) => sum + h.blue, 0) +
                    GUNPOWDER_SCORECARD.back9.reduce((sum, h) => sum + h.blue, 0)
  const redTotal = GUNPOWDER_SCORECARD.front9.reduce((sum, h) => sum + h.red, 0) +
                   GUNPOWDER_SCORECARD.back9.reduce((sum, h) => sum + h.red, 0)

  const { ratings } = GUNPOWDER_SCORECARD

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      {/* Total Par */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '5px' }}>Total Par</div>
        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalPar}</div>
      </div>

      {/* Yardage by Tee */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '15px',
        textAlign: 'center'
      }}>
        {/* Gold */}
        <div style={{
          background: 'rgba(249, 168, 37, 0.2)',
          padding: '12px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Gold Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{goldTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            Slope: {ratings.gold.slope} / Rating: {ratings.gold.rating}
          </div>
        </div>

        {/* Blue */}
        <div style={{
          background: 'rgba(25, 118, 210, 0.2)',
          padding: '12px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Blue Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{blueTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            Slope: {ratings.blue.slope} / Rating: {ratings.blue.rating}
          </div>
        </div>

        {/* Red */}
        <div style={{
          background: 'rgba(198, 40, 40, 0.2)',
          padding: '12px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Red Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{redTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
            Slope: {ratings.red.slope} / Rating: {ratings.red.rating}
          </div>
        </div>
      </div>
    </div>
  )
}

function Par3Summary() {
  const par3Holes = [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]
    .filter(h => h.par === 3)

  return (
    <div style={{
      background: '#e8f5e9',
      padding: '20px',
      borderRadius: '10px',
      border: '2px solid #27ae60'
    }}>
      <h3 style={{ marginBottom: '15px', color: '#27ae60' }}>Par 3 Holes (Greenie Holes)</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px'
      }}>
        {par3Holes.map(hole => (
          <div key={hole.hole} style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>
              Hole {hole.hole}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {hole.blue} yds (Blue)
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              HCP: {hole.hcp}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScorecardPage() {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Gunpowder Golf Course Scorecard</h2>

      <NineHoleTable
        holes={GUNPOWDER_SCORECARD.front9}
        title="Front 9"
        headerColor="linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)"
        outLabel="OUT"
        outBgColor="#e8f5e9"
      />

      <NineHoleTable
        holes={GUNPOWDER_SCORECARD.back9}
        title="Back 9"
        headerColor="linear-gradient(135deg, #e67e22 0%, #f39c12 100%)"
        outLabel="IN"
        outBgColor="#fff3e0"
      />

      <CourseTotals />

      <Par3Summary />
    </div>
  )
}

export default ScorecardPage
