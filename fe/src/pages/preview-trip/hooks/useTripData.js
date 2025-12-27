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
  
  const passedTripData = initialTripData || location.state?.tripData
  
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
  
  // Initialize trip data
  const [tripData, setTripData] = useState(() => {
    console.log('=== Initializing tripData ===');
    
    if (!passedTripData) {
      console.log('No passedTripData');
      return null;
    }

    // First, try to load from localStorage
    const tempChanges = loadTempChanges(existingTripId)
    if (tempChanges) {
      console.log('✅ Loaded from localStorage');
      console.log('localStorage itinerary keys:', Object.keys(tempChanges.tripData.Itinerary).sort());
      return tempChanges;
    }

    console.log('No localStorage data, initializing from passedTripData');

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

    console.log('Initial itinerary keys from passedTripData:', Object.keys(travelPlan.Itinerary).sort());

    const itineraryWithIds = {}
    Object.entries(travelPlan.Itinerary).forEach(([dateKey, dayData]) => {
      itineraryWithIds[dateKey] = {
        ...dayData,
        Morning: dayData.Morning ? {
          ...dayData.Morning,
          Activities: (dayData.Morning.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-morning-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        Lunch: dayData.Lunch ? {
          ...dayData.Lunch,
          Activity: dayData.Lunch.Activity ? {
            ...dayData.Lunch.Activity,
            id: dayData.Lunch.Activity.id || `${dateKey}-lunch-${Date.now()}-${Math.random()}`,
          } : null
        } : null,
        Afternoon: dayData.Afternoon ? {
          ...dayData.Afternoon,
          Activities: (dayData.Afternoon.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-afternoon-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        Evening: dayData.Evening ? {
          ...dayData.Evening,
          Activities: (dayData.Evening.Activities || []).map((activity, idx) => ({
            ...activity,
            id: activity.id || `${dateKey}-evening-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
      }
    })

    const initialized = {
      userSelection: passedTripData.userSelection || {},
      tripData: {
        ...travelPlan,
        Timezone: travelPlan.Timezone || 'Asia/Ho_Chi_Minh',
        Itinerary: itineraryWithIds,
      },
    }

    console.log('Initialized itinerary keys:', Object.keys(initialized.tripData.Itinerary).sort());
    
    // Save to localStorage immediately after initialization
    saveTempChanges(existingTripId, initialized)
    console.log('Saved initial data to localStorage');

    return initialized;
  })

  // Redirect if no trip data
  useEffect(() => {
    if (!tripData && !initialTripData && !forcedTripId) {
      toast.error('No trip data found. Redirecting...')
      const timer = setTimeout(() => navigate('/create-trip'), 2000)
      return () => clearTimeout(timer)
    }
  }, [tripData, navigate, initialTripData, forcedTripId])

// Update trip data and save to localStorage
const updateTripData = (updatedData) => {
  console.log('=== updateTripData Called ===')
  console.log('updatedData structure:', updatedData)
  console.log('updatedData.tripData:', updatedData?.tripData)
  console.log('updatedData.tripData.Itinerary:', updatedData?.tripData?.Itinerary)
  
  if (!updatedData?.tripData?.Itinerary) {
    console.error('❌ ERROR: Invalid updatedData structure!', updatedData)
    toast.error('Error updating trip data - invalid structure')
    return
  }
  
  console.log('New itinerary keys:', Object.keys(updatedData.tripData.Itinerary).sort())
  
  // Use functional update to ensure we're working with latest state
  setTripData(prev => {
    console.log('Previous state:', prev)
    console.log('Previous itinerary keys:', prev ? Object.keys(prev.tripData.Itinerary).sort() : 'null')
    console.log('Updated itinerary keys:', Object.keys(updatedData.tripData.Itinerary).sort())
    
    // Verify the structure before returning
    if (!updatedData.tripData || !updatedData.tripData.Itinerary) {
      console.error('❌ ERROR: Corrupted data in setTripData!')
      return prev // Return previous state to avoid corruption
    }
    
    return updatedData
  })
  
  saveTempChanges(existingTripId, updatedData)
  setHasUnsavedChanges(true)
  
  // Verify it was saved
  setTimeout(() => {
    const saved = loadTempChanges(existingTripId)
    console.log('Verified saved itinerary keys (after delay):', saved ? Object.keys(saved.tripData.Itinerary).sort() : 'NOT SAVED')
  }, 100)
}

// Debug: Log current state
useEffect(() => {
  console.log('=== Current tripData State (useEffect triggered) ===')
  console.log('tripData:', tripData)
  console.log('tripData?.tripData:', tripData?.tripData)
  console.log('tripData?.tripData?.Itinerary:', tripData?.tripData?.Itinerary)
  
  if (tripData && tripData.tripData && tripData.tripData.Itinerary) {
    console.log('Current itinerary keys:', Object.keys(tripData.tripData.Itinerary).sort())
  } else {
    console.error('❌ ERROR: tripData structure is broken!', tripData)
  }
}, [tripData])

  // Debug: Log current state
  useEffect(() => {
    if (tripData) {
      console.log('=== Current tripData State ===')
      console.log('Current itinerary keys:', Object.keys(tripData.tripData.Itinerary).sort())
    }
  }, [tripData])

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