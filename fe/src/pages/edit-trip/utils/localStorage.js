const TEMP_TRIP_KEY = 'temp_trip_changes'

export const saveTempChanges = (tripId, updatedTripData) => {
  if (!tripId) return
  try {
    localStorage.setItem(`${TEMP_TRIP_KEY}_${tripId}`, JSON.stringify(updatedTripData))
    console.log('Temporary changes saved to localStorage')
  } catch (error) {
    console.error('Error saving temp changes:', error)
  }
}

export const loadTempChanges = (tripId) => {
  if (!tripId) return null
  try {
    const stored = localStorage.getItem(`${TEMP_TRIP_KEY}_${tripId}`)
    if (stored) {
      console.log('Loading temporary changes from localStorage')
      return JSON.parse(stored)
    }
    return null
  } catch (error) {
    console.error('Error loading temp changes:', error)
    return null
  }
}

export const clearTempChanges = (tripId) => {
  if (!tripId) return
  try {
    localStorage.removeItem(`${TEMP_TRIP_KEY}_${tripId}`)
    console.log('Temporary changes cleared from localStorage')
  } catch (error) {
    console.error('Error clearing temp changes:', error)
  }
}

export const getTempTripId = () => {
  let tempId = sessionStorage.getItem('current_temp_trip_id')
  if (!tempId) {
    tempId = `temp_${Date.now()}`
    sessionStorage.setItem('current_temp_trip_id', tempId)
  }
  return tempId
}

export const clearTempTripId = () => {
  sessionStorage.removeItem('current_temp_trip_id')
}