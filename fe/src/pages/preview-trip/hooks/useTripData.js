import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  saveTempChanges, 
  loadTempChanges, 
  getTempTripId,
  saveTempTripId 
} from '../utils/localStorage'

function generateTempTripId() {
  const tempId = `temp_${Date.now()}`
  saveTempTripId(tempId)
  return tempId
}

export function useTripData(initialTripData = null, forcedTripId = null) {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Use initialTripData if provided (for edit-trip), otherwise use location.state
  const passedTripData = initialTripData || location.state?.tripData
  
  // Determine trip ID - prioritize forcedTripId (from URL param for edit-trip)
  const existingTripId = forcedTripId || 
                        passedTripData?.id || 
                        getTempTripId() || 
                        generateTempTripId()
  
  console.log('=== useTripData Debug ===');
  console.log('forcedTripId:', forcedTripId);
  console.log('passedTripData?.id:', passedTripData?.id);
  console.log('existingTripId:', existingTripId);
  console.log('passedTripData:', passedTripData);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Initialize trip data with localStorage check
  const [tripData, setTripData] = useState(() => {
    if (!passedTripData) return null

    const tempChanges = loadTempChanges(existingTripId)
    if (tempChanges) {
      console.log('Loaded from localStorage:', tempChanges);
      return tempChanges;
    }

    // Initialize from passedTripData
    let travelPlan
    if (passedTripData.tripData) {
      travelPlan = passedTripData.tripData
    } else if (Array.isArray(passedTripData) && passedTripData[0]?.TravelPlan) {
      travelPlan = passedTripData[0].TravelPlan
    } else if (passedTripData.TravelPlan) {
      travelPlan = passedTripData.TravelPlan
    } else {
      travelPlan = passedTripData
    }

    if (!travelPlan || !travelPlan.Itinerary) {
      toast.error('Invalid trip data')
      return null
    }

    // Add IDs to activities in time slots
    const itineraryWithIds = {}
    Object.entries(travelPlan.Itinerary).forEach(([dateKey, dayData]) => {
      itineraryWithIds[dateKey] = {
        ...dayData,
        // Morning activities
        Morning: dayData.Morning ? {
          ...dayData.Morning,
          Activities: (dayData.Morning.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-morning-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        // Lunch activity
        Lunch: dayData.Lunch ? {
          ...dayData.Lunch,
          Activity: dayData.Lunch.Activity ? {
            ...dayData.Lunch.Activity,
            id: dayData.Lunch.Activity.id || `${dateKey}-lunch-${Date.now()}-${Math.random()}`,
          } : null
        } : null,
        // Afternoon activities
        Afternoon: dayData.Afternoon ? {
          ...dayData.Afternoon,
          Activities: (dayData.Afternoon.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-afternoon-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        // Evening activities
        Evening: dayData.Evening ? {
          ...dayData.Evening,
          Activities: (dayData.Evening.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-evening-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
      }
    })

    return {
      userSelection: passedTripData.userSelection || {},
      tripData: {
        ...travelPlan,
        Timezone: travelPlan.Timezone || 'Asia/Ho_Chi_Minh',
        Itinerary: itineraryWithIds,
      },
    }
  })

  // Redirect if no trip data (only for preview-trip, not edit-trip)
  useEffect(() => {
    // Don't redirect if we have a forcedTripId (edit-trip with URL param)
    if (!tripData && !initialTripData && !forcedTripId) {
      toast.error('No trip data found. Redirecting...')
      const timer = setTimeout(() => navigate('/create-trip'), 2000)
      return () => clearTimeout(timer)
    }
  }, [tripData, navigate, initialTripData, forcedTripId])

  // Update trip data and save to localStorage
  const updateTripData = (updatedData) => {
    setTripData(updatedData)
    saveTempChanges(existingTripId, updatedData)
    setHasUnsavedChanges(true)
  }

  return {
    tripData,
    setTripData,
    updateTripData,
    existingTripId,
    rawTripData: passedTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  }
}