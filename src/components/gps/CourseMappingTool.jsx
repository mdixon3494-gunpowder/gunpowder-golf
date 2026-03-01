import { useState } from 'react'
import {
  getCurrentPosition,
  validateCoordinates,
  formatAccuracy,
  getAccuracyColor,
  createEmptyCourseMapping
} from '../../utils/gpsCalculations'

// Point type categories for filtering
const CATEGORIES = [
  { key: 'all', label: 'All Types', color: 'var(--color-accent-purple)' },
  { key: 'green', label: 'Green', color: 'var(--color-success)' },
  { key: 'tee', label: 'Tee Boxes', color: 'var(--color-info)' },
  { key: 'hazard', label: 'Hazards', color: 'var(--color-danger)' },
  { key: 'marker', label: 'Markers', color: 'var(--color-skins-dark)' }
]

// All point types organized by category
const POINT_TYPES = {
  green: [
    { key: 'greenCenter', label: 'Green Center', required: true, isArray: false },
    { key: 'greenFront', label: 'Green Front', required: false, isArray: false },
    { key: 'greenBack', label: 'Green Back', required: false, isArray: false }
  ],
  tee: [
    { key: 'teeBlue', label: 'Blue Tees', required: false, isArray: false },
    { key: 'teeGold', label: 'Gold Tees', required: false, isArray: false },
    { key: 'teeRed', label: 'Red Tees', required: false, isArray: false }
  ],
  hazard: [
    { key: 'waterFront', label: 'Water (Front of Green)', required: false, isArray: false },
    { key: 'waterLeft', label: 'Water (Left)', required: false, isArray: false },
    { key: 'waterRight', label: 'Water (Right)', required: false, isArray: false },
    { key: 'waterOther', label: 'Water (Fairway/Other)', required: false, isArray: true },
    { key: 'bunkerGreenside', label: 'Greenside Bunker', required: false, isArray: true },
    { key: 'bunkerFairway', label: 'Fairway Bunker', required: false, isArray: true }
  ],
  marker: [
    { key: 'marker200', label: '200 Yard Marker', required: false, isArray: false },
    { key: 'marker150', label: '150 Yard Marker', required: false, isArray: false },
    { key: 'marker100', label: '100 Yard Marker', required: false, isArray: false },
    { key: 'markerOther', label: 'Other Marker', required: false, isArray: true }
  ]
}

// Get all point types as flat array
const getAllPointTypes = () => {
  return Object.values(POINT_TYPES).flat()
}

// Get point types for a category
const getPointTypesForCategory = (category) => {
  if (category === 'all') return getAllPointTypes()
  return POINT_TYPES[category] || []
}

// Get category color for a point type
const getCategoryForPointType = (pointKey) => {
  for (const [cat, types] of Object.entries(POINT_TYPES)) {
    if (types.some(t => t.key === pointKey)) return cat
  }
  return 'all'
}

const getCategoryColor = (category) => {
  return CATEGORIES.find(c => c.key === category)?.color || 'var(--color-text-secondary)'
}

export default function CourseMappingTool({ courseMapping, onSave, onClose }) {
  const [mapping, setMapping] = useState(() => {
    return courseMapping || createEmptyCourseMapping()
  })
  const [selectedHole, setSelectedHole] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPointType, setSelectedPointType] = useState('greenCenter')
  const [customLabel, setCustomLabel] = useState('') // For array-type points
  const [loading, setLoading] = useState(false)
  const [lastCapture, setLastCapture] = useState(null)
  const [error, setError] = useState(null)
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false)
  const [showPoorAccuracyWarning, setShowPoorAccuracyWarning] = useState(false)
  const [pendingCapture, setPendingCapture] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Get current hole data
  const currentHoleData = mapping.holes?.find(h => h.number === selectedHole) || {}

  // Count mapped holes (based on green center)
  const mappedHolesCount = mapping.holes?.filter(h => h.greenCenter).length || 0

  // Get current point type info
  const currentPointTypeInfo = getAllPointTypes().find(pt => pt.key === selectedPointType)

  // Get filtered point types based on category
  const filteredPointTypes = getPointTypesForCategory(selectedCategory)

  // Count total points for current hole
  const countHolePoints = (holeData) => {
    let count = 0
    for (const pt of getAllPointTypes()) {
      if (pt.isArray) {
        count += (holeData[pt.key] || []).length
      } else if (holeData[pt.key]) {
        count++
      }
    }
    return count
  }

  // Capture current location
  const captureLocation = async () => {
    setLoading(true)
    setError(null)

    try {
      const position = await getCurrentPosition()
      const validation = validateCoordinates(position.lat, position.lng, position.accuracy)

      const captureData = {
        lat: position.lat,
        lng: position.lng,
        accuracy: position.accuracy,
        mappedAt: new Date().toISOString(),
        warnings: validation.warnings,
        accuracyTooLow: validation.accuracyTooLow,
        label: customLabel || undefined
      }

      setLastCapture(captureData)

      // If accuracy is too poor, show warning before allowing save
      if (validation.accuracyTooLow) {
        setPendingCapture(captureData)
        setShowPoorAccuracyWarning(true)
        return
      }

      // For array types, always add (no overwrite prompt)
      if (currentPointTypeInfo?.isArray) {
        applyCapture(captureData)
      } else if (currentHoleData[selectedPointType]) {
        // For single types, confirm overwrite
        setPendingCapture(captureData)
        setShowConfirmOverwrite(true)
      } else {
        applyCapture(captureData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Proceed after poor accuracy warning
  const proceedAfterPoorAccuracyWarning = () => {
    setShowPoorAccuracyWarning(false)
    if (pendingCapture) {
      // For array types, always add
      if (currentPointTypeInfo?.isArray) {
        applyCapture(pendingCapture)
      } else if (currentHoleData[selectedPointType]) {
        // For single types, confirm overwrite
        setShowConfirmOverwrite(true)
      } else {
        applyCapture(pendingCapture)
      }
    }
  }

  // Apply the captured coordinates
  const applyCapture = (captureData) => {
    const updatedMapping = { ...mapping }
    const holeIndex = updatedMapping.holes.findIndex(h => h.number === selectedHole)

    if (holeIndex >= 0) {
      const pointData = {
        lat: captureData.lat,
        lng: captureData.lng,
        accuracy: captureData.accuracy,
        mappedAt: captureData.mappedAt
      }

      if (captureData.label) {
        pointData.label = captureData.label
      }

      if (currentPointTypeInfo?.isArray) {
        // Add to array
        const existingArray = updatedMapping.holes[holeIndex][selectedPointType] || []
        updatedMapping.holes[holeIndex] = {
          ...updatedMapping.holes[holeIndex],
          [selectedPointType]: [...existingArray, pointData]
        }
      } else {
        // Set single value
        updatedMapping.holes[holeIndex] = {
          ...updatedMapping.holes[holeIndex],
          [selectedPointType]: pointData
        }
      }

      updatedMapping.lastUpdated = new Date().toISOString()
      updatedMapping.mappedBy = 'siteOwner'
      setMapping(updatedMapping)
      setHasUnsavedChanges(true)
      setCustomLabel('')
    }

    setShowConfirmOverwrite(false)
    setPendingCapture(null)
  }

  // Delete a mapped point
  const deletePoint = (pointType, index = null) => {
    const updatedMapping = { ...mapping }
    const holeIndex = updatedMapping.holes.findIndex(h => h.number === selectedHole)

    if (holeIndex >= 0) {
      const pointTypeInfo = getAllPointTypes().find(pt => pt.key === pointType)

      if (pointTypeInfo?.isArray && index !== null) {
        // Remove from array
        const existingArray = [...(updatedMapping.holes[holeIndex][pointType] || [])]
        existingArray.splice(index, 1)
        updatedMapping.holes[holeIndex] = {
          ...updatedMapping.holes[holeIndex],
          [pointType]: existingArray
        }
      } else {
        // Remove single value
        updatedMapping.holes[holeIndex] = {
          ...updatedMapping.holes[holeIndex],
          [pointType]: null
        }
      }

      updatedMapping.lastUpdated = new Date().toISOString()
      setMapping(updatedMapping)
      setHasUnsavedChanges(true)
    }
  }

  // Save and continue to next hole
  const handleSaveAndContinue = () => {
    onSave(mapping)
    setHasUnsavedChanges(false)
    // Advance to next hole (wrap from 18 to 1)
    const nextHole = selectedHole < 18 ? selectedHole + 1 : 1
    setSelectedHole(nextHole)
    // Switch to tees filter
    setSelectedCategory('tee')
    setSelectedPointType('teeBlue')
    setLastCapture(null)
  }

  // Save and close
  const handleSaveAndClose = () => {
    onSave(mapping)
    setHasUnsavedChanges(false)
    onClose()
  }

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // When category changes, select first point type in that category
  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    const types = getPointTypesForCategory(category)
    if (types.length > 0 && !types.some(t => t.key === selectedPointType)) {
      setSelectedPointType(types[0].key)
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h3>Course Mapping Tool</h3>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600' }}>Green Centers Mapped</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{mappedHolesCount}/18 holes</span>
            </div>
            <div style={{
              background: 'var(--color-border)',
              borderRadius: 'var(--radius-md)',
              height: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'var(--color-success)',
                height: '100%',
                width: `${(mappedHolesCount / 18) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Hole Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Select Hole
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
                const holeData = mapping.holes?.find(h => h.number === hole) || {}
                const pointCount = countHolePoints(holeData)
                const hasGreen = holeData.greenCenter != null
                return (
                  <button
                    key={hole}
                    onClick={() => setSelectedHole(hole)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      border: selectedHole === hole ? '2px solid var(--color-accent-purple)' : '1px solid var(--color-border)',
                      background: hasGreen
                        ? (selectedHole === hole ? 'var(--color-success)' : 'var(--color-success-light)')
                        : (selectedHole === hole ? 'var(--color-accent-purple)' : 'var(--color-surface)'),
                      color: (selectedHole === hole) ? 'white' : (hasGreen ? 'var(--color-success)' : 'var(--color-text-primary)'),
                      fontWeight: selectedHole === hole ? '700' : '500',
                      cursor: 'pointer',
                      position: 'relative',
                      fontSize: '16px'
                    }}
                  >
                    {hole}
                    {pointCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: 'var(--color-skins-dark)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700'
                      }}>
                        {pointCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Filter by Type
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: selectedCategory === cat.key ? `2px solid ${cat.color}` : '1px solid var(--color-border)',
                    background: selectedCategory === cat.key ? cat.color : 'var(--color-surface)',
                    color: selectedCategory === cat.key ? 'white' : 'var(--color-text-primary)',
                    fontWeight: selectedCategory === cat.key ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Point Type Selector */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Point Type
            </label>
            <select
              value={selectedPointType}
              onChange={(e) => setSelectedPointType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `2px solid ${getCategoryColor(getCategoryForPointType(selectedPointType))}`,
                fontSize: '16px',
                background: 'var(--color-surface)'
              }}
            >
              {filteredPointTypes.map(pt => (
                <option key={pt.key} value={pt.key}>
                  {pt.label} {pt.required ? '(Required)' : pt.isArray ? '(Multiple)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Label for array types */}
          {currentPointTypeInfo?.isArray && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Custom Label (optional)
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g., Left side, 180 yards out..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '16px'
                }}
              />
            </div>
          )}

          {/* Capture Button */}
          <button
            className="btn btn-primary"
            onClick={captureLocation}
            disabled={loading}
            style={{
              width: '100%',
              marginBottom: '15px',
              padding: '15px',
              fontSize: '16px',
              background: getCategoryColor(getCategoryForPointType(selectedPointType))
            }}
          >
            {loading ? 'Capturing...' : `Capture ${currentPointTypeInfo?.label || 'Location'}`}
          </button>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '15px' }}>
              {error}
            </div>
          )}

          {/* Last Capture Info */}
          {lastCapture && (
            <div style={{
              background: 'var(--color-surface-sunken)',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>Last Captured:</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <div>Lat: {lastCapture.lat.toFixed(6)}</div>
                <div>Lng: {lastCapture.lng.toFixed(6)}</div>
                <div style={{ color: getAccuracyColor(lastCapture.accuracy) }}>
                  Accuracy: {formatAccuracy(lastCapture.accuracy)} ({Math.round(lastCapture.accuracy)}m)
                </div>
              </div>
              {lastCapture.warnings?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {lastCapture.warnings.map((warning, i) => (
                    <div key={i} style={{ color: 'var(--color-skins-dark)', fontSize: '13px' }}>
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Hole Points - Filtered */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: '600', marginBottom: '10px' }}>
              Hole {selectedHole} - {selectedCategory === 'all' ? 'All Points' : CATEGORIES.find(c => c.key === selectedCategory)?.label}:
            </div>

            {filteredPointTypes.map(pt => {
              const category = getCategoryForPointType(pt.key)
              const categoryColor = getCategoryColor(category)

              if (pt.isArray) {
                // Render array of points
                const points = currentHoleData[pt.key] || []
                if (points.length === 0) {
                  return (
                    <div
                      key={pt.key}
                      style={{
                        padding: '10px',
                        background: 'var(--color-surface-sunken)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '8px',
                        borderLeft: `3px solid ${categoryColor}`
                      }}
                    >
                      <span style={{ fontWeight: '500' }}>{pt.label}</span>
                      <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '13px' }}>
                        None mapped
                      </span>
                    </div>
                  )
                }
                return points.map((point, idx) => (
                  <div
                    key={`${pt.key}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: point.accuracy > 30 ? 'var(--color-skins-light)' : 'var(--color-success-light)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '8px',
                      borderLeft: `3px solid ${point.accuracy > 30 ? 'var(--color-skins-dark)' : categoryColor}`
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '500' }}>{pt.label}</span>
                      {point.label && (
                        <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '13px' }}>
                          ({point.label})
                        </span>
                      )}
                      <span style={{ color: 'var(--color-success)', marginLeft: '10px', fontSize: '12px' }}>
                        {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                      </span>
                      {point.accuracy && (
                        <span style={{
                          color: point.accuracy > 30 ? 'var(--color-danger)' : point.accuracy > 15 ? 'var(--color-skins-dark)' : 'var(--color-success)',
                          marginLeft: '8px',
                          fontSize: '11px'
                        }}>
                          ±{Math.round(point.accuracy)}m
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deletePoint(pt.key, idx)}
                      style={{
                        background: 'var(--color-danger)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              } else {
                // Render single point
                const point = currentHoleData[pt.key]
                const hasLowAccuracy = point?.accuracy > 30
                return (
                  <div
                    key={pt.key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      background: point ? (hasLowAccuracy ? 'var(--color-skins-light)' : 'var(--color-success-light)') : 'var(--color-surface-sunken)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '8px',
                      borderLeft: `3px solid ${hasLowAccuracy ? 'var(--color-skins-dark)' : categoryColor}`
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: '500' }}>{pt.label}</span>
                      {point ? (
                        <>
                          <span style={{ color: 'var(--color-success)', marginLeft: '10px', fontSize: '12px' }}>
                            {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                          </span>
                          {point.accuracy && (
                            <span style={{
                              color: point.accuracy > 30 ? 'var(--color-danger)' : point.accuracy > 15 ? 'var(--color-skins-dark)' : 'var(--color-success)',
                              marginLeft: '8px',
                              fontSize: '11px'
                            }}>
                              ±{Math.round(point.accuracy)}m
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '13px' }}>
                          Not mapped
                        </span>
                      )}
                    </div>
                    {point && (
                      <button
                        onClick={() => deletePoint(pt.key)}
                        style={{
                          background: 'var(--color-danger)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '5px 10px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )
              }
            })}
          </div>

          {/* Save Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveAndContinue}
                disabled={!hasUnsavedChanges}
                style={{
                  flex: 1,
                  opacity: hasUnsavedChanges ? 1 : 0.5
                }}
              >
                Save & Next Hole
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAndClose}
                disabled={!hasUnsavedChanges}
                style={{
                  flex: 1,
                  opacity: hasUnsavedChanges ? 1 : 0.5
                }}
              >
                Save & Close
              </button>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleClose}
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Confirm Overwrite Modal */}
        {showConfirmOverwrite && (
          <div
            className="modal-overlay"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowConfirmOverwrite(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '350px' }}
            >
              <div className="modal-header">
                <h3>Overwrite Point?</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ marginBottom: '20px' }}>
                  This will replace the existing coordinates for Hole {selectedHole} {currentPointTypeInfo?.label}.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowConfirmOverwrite(false)
                      setPendingCapture(null)
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => applyCapture(pendingCapture)}
                    style={{ flex: 1 }}
                  >
                    Overwrite
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Poor Accuracy Warning Modal */}
        {showPoorAccuracyWarning && (
          <div
            className="modal-overlay"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => {
              setShowPoorAccuracyWarning(false)
              setPendingCapture(null)
            }}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '380px' }}
            >
              <div className="modal-header" style={{ background: 'var(--color-skins-light)' }}>
                <h3 style={{ color: 'var(--color-skins-dark)' }}>⚠️ Poor GPS Accuracy</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <p style={{ marginBottom: '15px', color: 'var(--color-skins-dark)', fontWeight: '600' }}>
                  GPS accuracy is {pendingCapture?.accuracy ? Math.round(pendingCapture.accuracy) : '?'}m
                </p>
                <p style={{ marginBottom: '15px', fontSize: '14px' }}>
                  This could result in yardage calculations being off by <strong>{pendingCapture?.accuracy ? Math.round(pendingCapture.accuracy * 1.09) : '?'}+ yards</strong>.
                </p>
                <p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  For best results, wait for better GPS signal (ideally under 10m). Cloudy weather and buildings can affect accuracy.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowPoorAccuracyWarning(false)
                      setPendingCapture(null)
                    }}
                    style={{ flex: 1 }}
                  >
                    Wait for Better Signal
                  </button>
                  <button
                    className="btn"
                    onClick={proceedAfterPoorAccuracyWarning}
                    style={{ flex: 1, background: 'var(--color-skins-dark)', color: 'white' }}
                  >
                    Save Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
