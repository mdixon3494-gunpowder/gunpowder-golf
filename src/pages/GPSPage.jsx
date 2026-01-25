import { useState, useEffect, useCallback, useRef } from 'react'
import { useLeague } from '../context/LeagueContext'
import SimpleView from '../components/gps/SimpleView'
import {
  getCurrentPosition,
  calculateGreenYardages,
  formatAccuracy,
  getAccuracyColor
} from '../utils/gpsCalculations'

export default function GPSPage() {
  const { courseMapping } = useLeague()

  // GPS state
  const [position, setPosition] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // UI state
  const [selectedHole, setSelectedHole] = useState(() => {
    const saved = localStorage.getItem('gps_selected_hole')
    return saved ? parseInt(saved, 10) : 1
  })
  const [showSimpleView, setShowSimpleView] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(() => {
    return localStorage.getItem('gps_auto_refresh') !== 'false'
  })

  const autoRefreshInterval = useRef(null)

  // Get current hole data
  const currentHoleData = courseMapping?.holes?.find(h => h.number === selectedHole)
  const hasMappingData = currentHoleData?.greenCenter != null
  const mappedPointAccuracy = currentHoleData?.greenCenter?.accuracy
  const hasPoorMappingAccuracy = mappedPointAccuracy && mappedPointAccuracy > 30

  // Calculate yardages
  const yardages = position && hasMappingData
    ? calculateGreenYardages(position, currentHoleData)
    : { front: null, center: null, back: null }

  // Refresh GPS position
  const refreshPosition = useCallback(async () => {
    setLoading(true)
    setGpsError(null)

    try {
      const pos = await getCurrentPosition()
      setPosition(pos)
      setLastUpdated(new Date())
    } catch (error) {
      setGpsError(error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial GPS request on mount
  useEffect(() => {
    refreshPosition()
  }, [refreshPosition])

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (autoRefresh && !showSimpleView) {
      autoRefreshInterval.current = setInterval(refreshPosition, 5000)
    } else {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
        autoRefreshInterval.current = null
      }
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current)
      }
    }
  }, [autoRefresh, showSimpleView, refreshPosition])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('gps_selected_hole', selectedHole.toString())
  }, [selectedHole])

  useEffect(() => {
    localStorage.setItem('gps_auto_refresh', autoRefresh.toString())
  }, [autoRefresh])

  // Handle hole navigation
  const goToPrevHole = () => {
    setSelectedHole(h => h > 1 ? h - 1 : 18)
  }

  const goToNextHole = () => {
    setSelectedHole(h => h < 18 ? h + 1 : 1)
  }

  // Show Simple View
  if (showSimpleView) {
    return (
      <SimpleView
        selectedHole={selectedHole}
        onHoleChange={setSelectedHole}
        onClose={() => setShowSimpleView(false)}
        courseMapping={courseMapping}
      />
    )
  }

  return (
    <div className="gps-page">
      <div className="gps-header">
        <h2>GPS Yardage</h2>
        <button
          className="btn btn-primary btn-small"
          onClick={() => setShowSimpleView(true)}
        >
          Simple View
        </button>
      </div>

      {/* Hole Selector */}
      <div className="gps-hole-selector">
        <button className="btn btn-secondary" onClick={goToPrevHole}>
          &lt; Prev
        </button>
        <div className="hole-display">
          <label htmlFor="hole-select">Hole</label>
          <select
            id="hole-select"
            value={selectedHole}
            onChange={(e) => setSelectedHole(parseInt(e.target.value, 10))}
            className="hole-dropdown"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
              <option key={hole} value={hole}>
                {hole}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={goToNextHole}>
          Next &gt;
        </button>
      </div>

      {/* GPS Error */}
      {gpsError && (
        <div className="alert alert-error">
          {gpsError}
        </div>
      )}

      {/* No Course Mapping */}
      {!courseMapping && (
        <div className="alert alert-info">
          <strong>Course not mapped</strong>
          <p>GPS coordinates have not been captured for this course yet. Contact a Site Owner to set up course mapping.</p>
        </div>
      )}

      {/* No Mapping for this hole */}
      {courseMapping && !hasMappingData && (
        <div className="alert alert-warning">
          <strong>Hole {selectedHole} not mapped</strong>
          <p>GPS coordinates have not been captured for this hole.</p>
        </div>
      )}

      {/* Poor Mapping Accuracy Warning */}
      {hasMappingData && hasPoorMappingAccuracy && (
        <div className="alert alert-warning" style={{ marginBottom: '10px', fontSize: '13px' }}>
          <strong>⚠️ Low accuracy mapping</strong>
          <p style={{ margin: '5px 0 0 0' }}>
            Hole {selectedHole} was mapped with {Math.round(mappedPointAccuracy)}m accuracy.
            Distances may be off by ±{Math.round(mappedPointAccuracy * 1.09)} yards.
            Consider remapping this hole with better GPS signal.
          </p>
        </div>
      )}

      {/* Yardage Display */}
      {hasMappingData && (
        <div className="gps-yardage-card">
          <div className="yardage-row">
            {yardages.front !== null && (
              <div className="yardage-item">
                <span className="yardage-label">Front</span>
                <span className="yardage-value yardage-front">{yardages.front}</span>
              </div>
            )}
            <div className="yardage-item yardage-center-item">
              <span className="yardage-label">Center</span>
              <span className="yardage-value yardage-center">
                {loading ? '...' : (yardages.center ?? '--')}
              </span>
            </div>
            {yardages.back !== null && (
              <div className="yardage-item">
                <span className="yardage-label">Back</span>
                <span className="yardage-value yardage-back">{yardages.back}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GPS Status */}
      <div className="gps-status-card">
        <div className="gps-status-row">
          <span className="status-label">GPS Accuracy:</span>
          <span
            className="status-value"
            style={{ color: getAccuracyColor(position?.accuracy) }}
          >
            {position ? `${formatAccuracy(position.accuracy)} (${Math.round(position.accuracy)}m)` : 'No signal'}
          </span>
        </div>
        <div className="gps-status-row">
          <span className="status-label">Last Updated:</span>
          <span className="status-value">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="gps-controls">
        <button
          className="btn btn-primary"
          onClick={refreshPosition}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh GPS'}
        </button>

        <label className="gps-toggle">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>Auto-refresh (5s)</span>
        </label>
      </div>

      {/* Course Info */}
      {courseMapping && (
        <div className="gps-course-info">
          <p className="course-name">{courseMapping.courseName}</p>
          {courseMapping.lastUpdated && (
            <p className="course-updated">
              Mapping updated: {new Date(courseMapping.lastUpdated).toLocaleDateString()}
            </p>
          )}
          <p className="holes-mapped">
            {courseMapping.holes?.filter(h => h.greenCenter).length || 0}/18 holes mapped
          </p>
        </div>
      )}
    </div>
  )
}
