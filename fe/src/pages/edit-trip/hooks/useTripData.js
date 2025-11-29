// fe/src/pages/edit-trip/hooks/useTripData.js
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { 
  saveTempChanges, 
  loadTempChanges, 
  getTempTripId 
} from '../utils/localStorage'

export function useTripData() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const rawTripData = location.state?.tripData
  const existingTripId = rawTripData?.id || getTempTripId()
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Initialize trip data with localStorage check
  const [tripData, setTripData] = useState(() => {
    if (!rawTripData) return null

    const tempChanges = loadTempChanges(existingTripId)
    if (tempChanges) return tempChanges

    // Initialize from rawTripData
    let travelPlan
    if (rawTripData.tripData) {
      travelPlan = rawTripData.tripData
    } else if (Array.isArray(rawTripData) && rawTripData[0]?.TravelPlan) {
      travelPlan = rawTripData[0].TravelPlan
    } else if (rawTripData.TravelPlan) {
      travelPlan = rawTripData.TravelPlan
    } else {
      travelPlan = rawTripData
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
            id: `${dateKey}-morning-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : undefined,
        // Lunch activity
        Lunch: dayData.Lunch ? {
          ...dayData.Lunch,
          Activity: dayData.Lunch.Activity ? {
            ...dayData.Lunch.Activity,
            id: `${dateKey}-lunch-${Date.now()}-${Math.random()}`,
          } : undefined
        } : undefined,
        // Afternoon activities
        Afternoon: dayData.Afternoon ? {
          ...dayData.Afternoon,
          Activities: (dayData.Afternoon.Activities || []).map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-afternoon-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : undefined,
        // Evening activities
        Evening: dayData.Evening ? {
          ...dayData.Evening,
          Activities: (dayData.Evening.Activities || []).map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-evening-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : undefined,
      }
    })

    return {
      userSelection: rawTripData.userSelection || {},
      tripData: {
        ...travelPlan,
        Itinerary: itineraryWithIds,
      },
    }
  })

  // Redirect if no trip data
  useEffect(() => {
    if (!tripData) {
      toast.error('No trip data found. Redirecting...')
      const timer = setTimeout(() => navigate('/create-trip'), 2000)
      return () => clearTimeout(timer)
    }
  }, [tripData, navigate])

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
    rawTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  }
}

/*
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { 
  saveTempChanges, 
  loadTempChanges, 
  getTempTripId 
} from '../utils/localStorage'

export function useTripData() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const rawTripData = location.state?.tripData
  const existingTripId = rawTripData?.id || getTempTripId()
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Initialize trip data with localStorage check
  const [tripData, setTripData] = useState(() => {
    if (!rawTripData) return null

    const tempChanges = loadTempChanges(existingTripId)
    if (tempChanges) return tempChanges

    // Initialize from rawTripData
    let travelPlan
    if (rawTripData.tripData) {
      travelPlan = rawTripData.tripData
    } else if (Array.isArray(rawTripData) && rawTripData[0]?.TravelPlan) {
      travelPlan = rawTripData[0].TravelPlan
    } else if (rawTripData.TravelPlan) {
      travelPlan = rawTripData.TravelPlan
    } else {
      travelPlan = rawTripData
    }

    if (!travelPlan || !travelPlan.Itinerary) {
      toast.error('Invalid trip data')
      return null
    }

    const itineraryWithIds = {}
    Object.entries(travelPlan.Itinerary).forEach(([dateKey, dayData]) => {
      itineraryWithIds[dateKey] = {
        ...dayData,
        Activities: (dayData.Activities || []).map((activity, idx) => ({
          ...activity,
          id: `${dateKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
        })),
      }
    })

    return {
      userSelection: rawTripData.userSelection || {},
      tripData: {
        ...travelPlan,
        Itinerary: itineraryWithIds,
      },
    }
  })

  // Redirect if no trip data
  useEffect(() => {
    if (!tripData) {
      toast.error('No trip data found. Redirecting...')
      const timer = setTimeout(() => navigate('/create-trip'), 2000)
      return () => clearTimeout(timer)
    }
  }, [tripData, navigate])

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
    rawTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  }
}

*/