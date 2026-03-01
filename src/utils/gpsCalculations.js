/**
 * GPS Calculations Utility
 * Provides distance calculations and GPS helper functions for golf course yardage
 */

// Gunpowder Golf Course center coordinates
const GUNPOWDER_CENTER = {
  lat: 39.0871,
  lng: -76.9199
}

// Maximum reasonable distance from course center (5 miles in meters)
const MAX_COURSE_DISTANCE_METERS = 8046.72

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in yards
 */
export function calculateDistanceYards(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters

  const toRadians = (degrees) => degrees * (Math.PI / 180)

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distanceMeters = R * c

  // Convert meters to yards (1 meter = 1.09361 yards)
  return Math.round(distanceMeters * 1.09361)
}

/**
 * Calculate yardages to green (front, center, back)
 * @param {{ lat: number, lng: number }} userPosition - User's current GPS position
 * @param {{ greenFront?: { lat, lng }, greenCenter: { lat, lng }, greenBack?: { lat, lng } }} greenCoords - Green coordinates
 * @returns {{ front: number|null, center: number, back: number|null }}
 */
export function calculateGreenYardages(userPosition, greenCoords) {
  if (!userPosition || !greenCoords?.greenCenter) {
    return { front: null, center: null, back: null }
  }

  const center = calculateDistanceYards(
    userPosition.lat,
    userPosition.lng,
    greenCoords.greenCenter.lat,
    greenCoords.greenCenter.lng
  )

  const front = greenCoords.greenFront
    ? calculateDistanceYards(
        userPosition.lat,
        userPosition.lng,
        greenCoords.greenFront.lat,
        greenCoords.greenFront.lng
      )
    : null

  const back = greenCoords.greenBack
    ? calculateDistanceYards(
        userPosition.lat,
        userPosition.lng,
        greenCoords.greenBack.lat,
        greenCoords.greenBack.lng
      )
    : null

  return { front, center, back }
}

/**
 * Get current GPS position as a Promise
 * @param {object} options - Geolocation options
 * @returns {Promise<{ lat: number, lng: number, accuracy: number }>}
 */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        let message = 'Unable to get location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable'
            break
          case error.TIMEOUT:
            message = 'Location request timed out'
            break
        }
        reject(new Error(message))
      },
      { ...defaultOptions, ...options }
    )
  })
}

/**
 * Start watching position for continuous updates
 * @param {function} onUpdate - Callback with { lat, lng, accuracy }
 * @param {function} onError - Error callback
 * @param {object} options - Geolocation options
 * @returns {number} Watch ID for clearing
 */
export function watchPosition(onUpdate, onError, options = {}) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser'))
    return null
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      })
    },
    (error) => {
      let message = 'Unable to get location'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied'
          break
        case error.POSITION_UNAVAILABLE:
          message = 'Location information unavailable'
          break
        case error.TIMEOUT:
          message = 'Location request timed out'
          break
      }
      onError(new Error(message))
    },
    { ...defaultOptions, ...options }
  )
}

/**
 * Watch position with accuracy filtering
 * Only delivers readings that meet the accuracy threshold.
 * Before a good reading is found, delivers improving readings so the UI isn't blank.
 * After a good reading is found, only delivers readings that meet the threshold.
 * @param {function} onUpdate - Callback with { lat, lng, accuracy }
 * @param {function} onError - Error callback
 * @param {object} options - { accuracyThreshold (meters), ...geolocation options }
 * @returns {number} Watch ID for clearing with clearPositionWatch()
 */
export function watchPositionFiltered(onUpdate, onError, options = {}) {
  const {
    accuracyThreshold = 5,
    ...geoOptions
  } = options

  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser'))
    return null
  }

  let bestAccuracy = Infinity
  let hasGoodReading = false

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const reading = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      }

      const meetsThreshold = reading.accuracy <= accuracyThreshold

      if (meetsThreshold) {
        hasGoodReading = true
        bestAccuracy = Math.min(bestAccuracy, reading.accuracy)
        onUpdate(reading)
      } else if (!hasGoodReading) {
        // No good reading yet — deliver if this is the best so far
        if (reading.accuracy < bestAccuracy) {
          bestAccuracy = reading.accuracy
          onUpdate(reading)
        }
      }
      // Once we've had good readings, skip poor ones
    },
    (error) => {
      let message = 'Unable to get location'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied'
          break
        case error.POSITION_UNAVAILABLE:
          message = 'Location information unavailable'
          break
        case error.TIMEOUT:
          message = 'Location request timed out'
          break
      }
      onError(new Error(message))
    },
    { ...defaultOptions, ...geoOptions }
  )
}

/**
 * Clear a position watch
 * @param {number} watchId - Watch ID to clear
 */
export function clearPositionWatch(watchId) {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Validate coordinates and return warnings
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} accuracy - GPS accuracy in meters
 * @returns {{ valid: boolean, warnings: string[], accuracyTooLow: boolean }}
 */
export function validateCoordinates(lat, lng, accuracy) {
  const warnings = []
  let accuracyTooLow = false

  // Check if coordinates are valid numbers
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return { valid: false, warnings: ['Invalid coordinate values'], accuracyTooLow: false }
  }

  // Check if coordinates are within valid range
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, warnings: ['Coordinates out of valid range'], accuracyTooLow: false }
  }

  // Check distance from expected Gunpowder location
  const distanceFromCourse = calculateDistanceYards(lat, lng, GUNPOWDER_CENTER.lat, GUNPOWDER_CENTER.lng)
  const distanceInMiles = distanceFromCourse / 1760

  if (distanceInMiles > 5) {
    warnings.push(`Location is ${distanceInMiles.toFixed(1)} miles from Gunpowder Golf Course`)
  }

  // Check GPS accuracy - tiered warnings
  if (accuracy) {
    if (accuracy > 30) {
      warnings.push(`GPS accuracy is very poor (${Math.round(accuracy)}m) - distances could be off by ${Math.round(accuracy * 1.09)}+ yards`)
      accuracyTooLow = true
    } else if (accuracy > 15) {
      warnings.push(`GPS accuracy is poor (${Math.round(accuracy)}m) - consider waiting for better signal`)
    } else if (accuracy > 10) {
      warnings.push(`GPS accuracy is fair (${Math.round(accuracy)}m)`)
    }
  }

  return { valid: true, warnings, accuracyTooLow }
}

/**
 * Format accuracy for display
 * @param {number} accuracy - Accuracy in meters
 * @returns {string} Formatted accuracy string
 */
export function formatAccuracy(accuracy) {
  if (!accuracy) return 'Unknown'
  if (accuracy <= 5) return 'Excellent'
  if (accuracy <= 10) return 'Good'
  if (accuracy <= 20) return 'Fair'
  return 'Poor'
}

/**
 * Get accuracy color class
 * @param {number} accuracy - Accuracy in meters
 * @returns {string} CSS color value
 */
export function getAccuracyColor(accuracy) {
  if (!accuracy) return '#95a5a6'
  if (accuracy <= 5) return '#27ae60'
  if (accuracy <= 10) return '#2ecc71'
  if (accuracy <= 20) return '#f39c12'
  return '#e74c3c'
}

/**
 * Create empty course mapping structure
 * @returns {object} Empty course mapping object
 */
export function createEmptyCourseMapping() {
  const holes = []
  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i,
      greenCenter: null,
      greenFront: null,
      greenBack: null,
      teeBoxes: [],
      hazards: [],
      markers: []
    })
  }

  return {
    courseName: "Gunpowder Golf Course",
    lastUpdated: null,
    mappedBy: null,
    holes
  }
}
