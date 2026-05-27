import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, SHENVALEE_COURSE } from '../lib/courseData'

const GUNPOWDER_TEES = [
  { key: 'gold', label: 'Gold', rowBg: 'var(--color-warning-light)', labelColor: 'var(--color-accent-gold)' },
  { key: 'blue', label: 'Blue', rowBg: 'var(--color-info-light)', labelColor: 'var(--color-info-dark)' },
  { key: 'red', label: 'Red', rowBg: 'var(--color-danger-light)', labelColor: 'var(--color-danger-dark)' }
]

const SHENVALEE_TEES = [
  { key: 'blue', label: 'Blue', rowBg: 'var(--color-info-light)', labelColor: 'var(--color-info-dark)' },
  { key: 'white', label: 'White', rowBg: 'var(--color-surface-sunken)', labelColor: 'var(--color-text-primary)' },
  { key: 'gold', label: 'Gold', rowBg: 'var(--color-warning-light)', labelColor: 'var(--color-accent-gold)' },
  { key: 'red', label: 'Red', rowBg: 'var(--color-danger-light)', labelColor: 'var(--color-danger-dark)' },
  { key: 'green', label: 'Green', rowBg: 'var(--color-success-light)', labelColor: 'var(--color-success)' }
]

function holeParDisplay(hole) {
  // Show "4/3" when a hole has different pars by tee (e.g. Shenvalee Miller #4).
  if (hole.parByTee) {
    const vals = Object.values(hole.parByTee)
    const unique = [...new Set(vals)].sort((a, b) => b - a)
    if (unique.length > 1) return unique.join('/')
  }
  return String(hole.par)
}

function NineHoleTable({ holes, title, headerColor, outLabel, outBgColor, tees, holeNumberKey = 'hole', parFootnote }) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
  const totalsByTee = {}
  for (const t of tees) {
    totalsByTee[t.key] = holes.reduce((sum, h) => sum + (h[t.key] || 0), 0)
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
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
            <tr style={{ background: 'var(--color-surface-sunken)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid var(--color-border)', minWidth: '70px' }}>
                Hole
              </th>
              {holes.map((hole, idx) => (
                <th key={idx} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid var(--color-border)', minWidth: '45px' }}>
                  {hole[holeNumberKey]}
                </th>
              ))}
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid var(--color-border)', background: outBgColor, minWidth: '55px' }}>
                {outLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Par */}
            <tr>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', background: 'var(--color-surface-sunken)' }}>Par</td>
              {holes.map((hole, idx) => {
                const display = holeParDisplay(hole)
                const isSplit = display.includes('/')
                return (
                  <td key={idx} style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: hole.par === 3 ? 'var(--color-danger)' : hole.par === 5 ? 'var(--color-info)' : 'var(--color-text-primary)',
                    fontSize: isSplit ? '13px' : '14px',
                    whiteSpace: 'nowrap'
                  }}>
                    {display}{isSplit ? '*' : ''}
                  </td>
                )
              })}
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 'bold', background: outBgColor }}>{totalPar}</td>
            </tr>

            {/* Tee rows */}
            {tees.map(tee => (
              <tr key={tee.key} style={{ background: tee.rowBg }}>
                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: tee.labelColor }}>{tee.label}</td>
                {holes.map((hole, idx) => (
                  <td key={idx} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                    {hole[tee.key] ?? '—'}
                  </td>
                ))}
                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', background: tee.rowBg, fontSize: '13px' }}>
                  {totalsByTee[tee.key]}
                </td>
              </tr>
            ))}

            {/* HCP */}
            <tr style={{ background: 'var(--color-surface-sunken)' }}>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-secondary)' }}>HCP</td>
              {holes.map((hole, idx) => (
                <td key={idx} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                  {hole.hcp ?? ''}
                </td>
              ))}
              <td style={{ padding: '8px 12px', textAlign: 'center', background: outBgColor }} />
            </tr>
          </tbody>
        </table>
      </div>
      {parFootnote && (
        <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--color-text-secondary)', background: 'var(--color-surface-sunken)' }}>
          {parFootnote}
        </div>
      )}
    </div>
  )
}

function ShenvaleeNineCard({ nineKey }) {
  const nine = SHENVALEE_COURSE.nines[nineKey]
  if (!nine) return null

  const splitPar = nine.holes.find(h => h.parByTee && new Set(Object.values(h.parByTee)).size > 1)
  let footnote = null
  if (splitPar) {
    const counts = splitPar.parByTee
    const teeByPar = {}
    for (const [t, p] of Object.entries(counts)) {
      teeByPar[p] = teeByPar[p] || []
      teeByPar[p].push(t.charAt(0).toUpperCase() + t.slice(1))
    }
    const parts = Object.entries(teeByPar)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([p, tees]) => `Par ${p} from ${tees.join(' / ')}`)
    footnote = `* Hole ${splitPar.holeOnNine}: ${parts.join('; ')}.`
  }

  const headerColors = {
    olde: 'var(--color-success)',
    creek: 'var(--color-back9)',
    miller: 'var(--color-skins)'
  }

  return (
    <NineHoleTable
      holes={nine.holes}
      title={`${nine.name} 9 — Par ${nine.par}`}
      headerColor={headerColors[nineKey] || 'var(--color-primary)'}
      outLabel="OUT"
      outBgColor="var(--color-surface-sunken)"
      tees={SHENVALEE_TEES}
      holeNumberKey="holeOnNine"
      parFootnote={footnote}
    />
  )
}

function ShenvaleeRatingsTable() {
  const combos = SHENVALEE_COURSE.ratings
  const teeKeys = ['blue', 'white', 'gold', 'red']

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '12px' }}>USGA Ratings by 18-Hole Combination</h3>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
        Shenvalee plays as three 18-hole pairings. Pick which nine plays as front and which as back before each round.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-sunken)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Combo</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid var(--color-border)' }}>Par</th>
              {teeKeys.map(t => (
                <th key={t} style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid var(--color-border)', textTransform: 'capitalize' }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(combos).map(([key, combo]) => (
              <tr key={key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '8px 10px', fontWeight: '600' }}>{key.split('+').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{combo.par}</td>
                {teeKeys.map(t => {
                  const r = combo.tees[t]
                  return (
                    <td key={t} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      {r ? `${r.rating} / ${r.slope}` : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
        Rating / Slope per tee.
      </div>
    </div>
  )
}

function GunpowderCourseTotals() {
  const totalPar = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0) +
                   GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)
  const goldTotal = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.gold, 0) +
                    GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.gold, 0)
  const blueTotal = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.blue, 0) +
                    GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.blue, 0)
  const redTotal = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.red, 0) +
                   GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.red, 0)
  const { ratings } = GUNPOWDER_SCORECARD

  return (
    <div style={{ background: 'var(--color-border-dark)', color: 'white', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '5px' }}>Total Par</div>
        <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{totalPar}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(249, 168, 37, 0.2)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Gold Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{goldTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Slope: {ratings.gold.slope} / Rating: {ratings.gold.rating}</div>
        </div>
        <div style={{ background: 'rgba(25, 118, 210, 0.2)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Blue Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{blueTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Slope: {ratings.blue.slope} / Rating: {ratings.blue.rating}</div>
        </div>
        <div style={{ background: 'rgba(198, 40, 40, 0.2)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Red Tees</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{redTotal} yds</div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Slope: {ratings.red.slope} / Rating: {ratings.red.rating}</div>
        </div>
      </div>
    </div>
  )
}

function GreenieSummary({ holes, title = 'Par 3 Holes (Greenie Holes)' }) {
  // Card par 3 only — holes with parByTee but card par 4 (e.g. Miller #4) are intentionally excluded.
  const par3Holes = holes.filter(h => h.par === 3)

  if (par3Holes.length === 0) return null

  return (
    <div style={{ background: 'var(--color-success-light)', padding: '20px', borderRadius: 'var(--radius-md)', border: '2px solid var(--color-success)', marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '15px', color: 'var(--color-success)' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
        {par3Holes.map((hole, idx) => (
          <div key={idx} style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)' }}>
              Hole {hole.holeOnNine ?? hole.hole}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              {hole.blue ?? hole.white ?? hole.gold} yds
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
              HCP: {hole.hcp}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScorecardPage() {
  const { leagueSettings } = useLeague()
  const courseId = leagueSettings?.course || 'gunpowder'

  if (courseId === 'shenvalee') {
    const allShenvaleeHoles = Object.values(SHENVALEE_COURSE.nines).flatMap(n => n.holes)
    return (
      <div>
        <h2 style={{ marginBottom: '4px' }}>Shenvalee Golf Resort</h2>
        <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          New Market, VA — 27 holes (Olde, Creek, Miller). Each round uses two of the three nines.
        </p>

        <ShenvaleeNineCard nineKey="olde" />
        <ShenvaleeNineCard nineKey="creek" />
        <ShenvaleeNineCard nineKey="miller" />

        <ShenvaleeRatingsTable />

        <GreenieSummary holes={allShenvaleeHoles} title="Greenie Holes (Par 3s)" />
        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '-10px', marginBottom: '20px' }}>
          Miller #4 is excluded from greenies — it plays as a par 4 from Blue/White and par 3 from Gold/Red/Green, but is treated as a par 4 hole for scoring and skins on the card.
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Gunpowder Golf Course Scorecard</h2>

      <NineHoleTable
        holes={GUNPOWDER_SCORECARD.front9}
        title="Front 9"
        headerColor="var(--color-success)"
        outLabel="OUT"
        outBgColor="var(--color-success-light)"
        tees={GUNPOWDER_TEES}
      />

      <NineHoleTable
        holes={GUNPOWDER_SCORECARD.back9}
        title="Back 9"
        headerColor="var(--color-back9)"
        outLabel="IN"
        outBgColor="var(--color-skins-light)"
        tees={GUNPOWDER_TEES}
      />

      <GunpowderCourseTotals />

      <GreenieSummary holes={[...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]} />
    </div>
  )
}

export default ScorecardPage
