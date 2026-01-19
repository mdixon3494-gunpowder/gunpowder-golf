import { useState, useEffect, useRef } from 'react'
import {
  watchPosition,
  clearPositionWatch,
  calculateGreenYardages,
  formatAccuracy,
  getAccuracyColor
} from '../../utils/gpsCalculations'

export default function SimpleView({ selectedHole, onHoleChange, onClose, courseMapping }) {
  const [position, setPosition] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const watchIdRef = useRef(null)

  // Get current hole data
  const currentHoleData = courseMapping?.holes?.find(h => h.number === selectedHole)
  const hasMappingData = currentHoleData?.greenCenter != null

  // Calculate yardages
  const yardages = position && hasMappingData
    ? calculateGreenYardages(position, currentHoleData)
    : { front: null, center: null, back: null }

  // Start continuous GPS watching
  useEffect(() => {
    watchIdRef.current = watchPosition(
      (pos) => {
        setPosition(pos)
        setGpsError(null)
      },
      (error) => {
        setGpsError(error.message)
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        clearPositionWatch(watchIdRef.current)
      }
    }
  }, [])

  // Prevent body scroll in simple view
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const goToPrevHole = () => {
    onHoleChange(selectedHole > 1 ? selectedHole - 1 : 18)
  }

  const goToNextHole = () => {
    onHoleChange(selectedHole < 18 ? selectedHole + 1 : 1)
  }

  return (
    <div className="simple-view">
      {/* Exit Button */}
      <button className="simple-view-exit" onClick={onClose}>
        Exit
      </button>

      {/* Hole Number */}
      <div className="simple-view-hole">
        Hole {selectedHole}
      </div>

      {/* GPS Error */}
      {gpsError && (
        <div className="simple-view-error">
          {gpsError}
        </div>
      )}

      {/* No Mapping Message */}
      {!hasMappingData && (
        <div className="simple-view-no-data">
          Not Mapped
        </div>
      )}

      {/* Yardage Display */}
      {hasMappingData && (
        <div className="simple-view-yardages">
          {/* Front yardage */}
          {yardages.front !== null && (
            <div className="simple-view-secondary">
              <span className="simple-label">Front</span>
              <span className="simple-value">{yardages.front}</span>
            </div>
          )}

          {/* Center yardage - main display */}
          <div className="simple-view-center">
            {yardages.center ?? '--'}
          </div>

          {/* Back yardage */}
          {yardages.back !== null && (
            <div className="simple-view-secondary">
              <span className="simple-label">Back</span>
              <span className="simple-value">{yardages.back}</span>
            </div>
          )}
        </div>
      )}

      {/* GPS Accuracy Indicator */}
      <div
        className="simple-view-accuracy"
        style={{ color: getAccuracyColor(position?.accuracy) }}
      >
        {position ? formatAccuracy(position.accuracy) : 'No GPS'}
      </div>

      {/* Navigation Buttons */}
      <div className="simple-view-nav">
        <button className="simple-nav-btn" onClick={goToPrevHole}>
          &lt; PREV
        </button>
        <button className="simple-nav-btn" onClick={goToNextHole}>
          NEXT &gt;
        </button>
      </div>
    </div>
  )
}
