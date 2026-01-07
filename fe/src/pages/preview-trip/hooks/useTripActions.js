import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { format, parse, differenceInDays, addDays } from 'date-fns'
import { clearTempChanges, clearTempTripId } from '../utils/localStorage'
import { formatBudget, formatTravelers } from '../utils/formatters'
import { regenerateHotels } from '../utils/regenerateHotels'
import { regenerateSingleDay } from '../utils/regenerateItinerary'
import { generateTrip } from '@/service/AIModel'
import { AI_PROMPT } from '@/constants/options'
import { saveTripToFirestore } from '@/service/tripService'

export function useTripActions(tripData, updateTripData, existingTripId, rawTripData, user) {
  const navigate = useNavigate()
  const location = useLocation()

  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)

  const buildReturnTo = () => {
    const path = location.pathname
    const search = location.search || ''
    const params = new URLSearchParams(search)

    // Ensure preview-trip always has tripId in query when returning
    if (path === '/preview-trip' && !params.has('tripId')) {
      const join = search ? '&' : '?'
      return `${path}${search}${join}tripId=${encodeURIComponent(existingTripId)}`
    }

    // For /edit-trip/:tripId, pathname already contains tripId — keep as-is
    return `${path}${search}`
  }

  const handleEditSelection = () => {
    const start = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date())
    
    setEditedSelection({
      startDate: start,
      endDate: end,
      budgetMin: tripData.userSelection.budgetMin || 500,
      budgetMax: tripData.userSelection.budgetMax || 2000,
      adults: tripData.userSelection.adults || 2,
      children: tripData.userSelection.children || 0,
      childrenAges: tripData.userSelection.childrenAges || []
    })
    setIsEditingSelection(true)
  }

  const handleCancelEdit = () => {
    setIsEditingSelection(false)
    setEditedSelection(null)
  }

  const handleRegenerateAll = async () => {
    if (!editedSelection.startDate || !editedSelection.endDate) {
      toast.error('Please select dates')
      return
    }

    if (editedSelection.adults === 0 && editedSelection.children === 0) {
      toast.error('Please add at least one traveler')
      return
    }

    const totalDays = differenceInDays(editedSelection.endDate, editedSelection.startDate) + 1
    if (totalDays < 1 || totalDays > 30) {
      toast.error('Please select a trip between 1-30 days')
      return
    }

    setRegeneratingAll(true)
    try {
      const FINAL_PROMPT = AI_PROMPT
        .replace('{location}', tripData.userSelection.location)
        .replace('{totalDays}', totalDays)
        .replace('{adults}', editedSelection.adults)
        .replace('{children}', editedSelection.children)
        .replace('{childrenAges}', editedSelection.childrenAges?.join(', ') || 'N/A')
        .replace('{budgetMin}', editedSelection.budgetMin)
        .replace('{budgetMax}', editedSelection.budgetMax)

      const result = await generateTrip(FINAL_PROMPT)

      let newTripData
      if (typeof result === 'string') {
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        newTripData = JSON.parse(cleanResult)
      } else {
        newTripData = result
      }

      const travelPlan = newTripData[0]?.TravelPlan || newTripData.TravelPlan || newTripData

      const itineraryWithDates = {}
      Object.entries(travelPlan.Itinerary).forEach(([dayKey, dayData], index) => {
        const actualDate = addDays(editedSelection.startDate, index)
        const dateKey = format(actualDate, 'yyyy-MM-dd')
        
        itineraryWithDates[dateKey] = {
          ...dayData,
          Morning: dayData.Morning && dayData.Morning.Activities ? {
            ...dayData.Morning,
            Activities: dayData.Morning.Activities.map((activity, idx) => ({
              ...activity,
              id: `${dateKey}-morning-${idx}-${Date.now()}-${Math.random()}`,
            }))
          } : null,
          Lunch: dayData.Lunch && dayData.Lunch.Activity ? {
            ...dayData.Lunch,
            Activity: {
              ...dayData.Lunch.Activity,
              id: `${dateKey}-lunch-${Date.now()}-${Math.random()}`,
            }
          } : null,
          Afternoon: dayData.Afternoon && dayData.Afternoon.Activities ? {
            ...dayData.Afternoon,
            Activities: dayData.Afternoon.Activities.map((activity, idx) => ({
              ...activity,
              id: `${dateKey}-afternoon-${idx}-${Date.now()}-${Math.random()}`,
            }))
          } : null,
          Evening: dayData.Evening && dayData.Evening.Activities ? {
            ...dayData.Evening,
            Activities: dayData.Evening.Activities.map((activity, idx) => ({
              ...activity,
              id: `${dateKey}-evening-${idx}-${Date.now()}-${Math.random()}`,
            }))
          } : null,
        }
      })

      const updatedTripData = {
        userSelection: {
          ...tripData.userSelection,
          startDate: format(editedSelection.startDate, 'yyyy-MM-dd'),
          endDate: format(editedSelection.endDate, 'yyyy-MM-dd'),
          budgetMin: editedSelection.budgetMin,
          budgetMax: editedSelection.budgetMax,
          adults: editedSelection.adults,
          children: editedSelection.children,
          childrenAges: editedSelection.childrenAges,
          budget: formatBudget(editedSelection.budgetMin, editedSelection.budgetMax),
          traveler: formatTravelers(editedSelection.adults, editedSelection.children, editedSelection.childrenAges),
        },
        tripData: {
          ...travelPlan,
          Itinerary: itineraryWithDates,
        },
      }

      updateTripData(updatedTripData)
      toast.success('Trip regenerated successfully! Hotels updated. Please select one and remember to save.')
      setIsEditingSelection(false)
      setEditedSelection(null)
    } catch (error) {
      console.error('Error regenerating trip:', error)
      toast.error('Failed to regenerate trip. Please try again.')
    } finally {
      setRegeneratingAll(false)
    }
  }

  const handleRegenerateHotels = async () => {
    if (!hotelPreference.trim()) {
      toast.error('Please enter your hotel preferences')
      return
    }

    setRegeneratingHotels(true)
    try {
      const newHotels = await regenerateHotels(tripData.tripData, hotelPreference)
      
      const updatedTripData = {
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Hotels: newHotels,
        },
      }
      
      updateTripData(updatedTripData)
      toast.success('Hotels regenerated successfully! Please select one and remember to save.')
      setHotelPreference('')
    } catch (error) {
      console.error('Error regenerating hotels:', error)
      toast.error('Failed to regenerate hotels. Please try again.')
    } finally {
      setRegeneratingHotels(false)
    }
  }

  const handleRegenerateSingleDay = async (dateKey, preference) => {
    try {
      const dayNumber = Object.keys(tripData.tripData.Itinerary).sort().indexOf(dateKey) + 1
      const currentDayData = tripData.tripData.Itinerary[dateKey]
      
      const newDayData = await regenerateSingleDay(
        tripData.tripData,
        currentDayData.Theme,
        preference,
        dayNumber
      )

      const dayDataWithIds = {
        ...newDayData,
        Morning: newDayData.Morning ? {
          ...newDayData.Morning,
          Activities: (newDayData.Morning.Activities || []).map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-morning-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        Lunch: newDayData.Lunch ? {
          ...newDayData.Lunch,
          Activity: newDayData.Lunch.Activity ? {
            ...newDayData.Lunch.Activity,
            id: `${dateKey}-lunch-${Date.now()}-${Math.random()}`,
          } : null
        } : null,
        Afternoon: newDayData.Afternoon ? {
          ...newDayData.Afternoon,
          Activities: (newDayData.Afternoon.Activities || []).map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-afternoon-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
        Evening: newDayData.Evening ? {
          ...newDayData.Evening,
          Activities: (newDayData.Evening.Activities || []).map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-evening-${idx}-${Date.now()}-${Math.random()}`,
          }))
        } : null,
      }

      const updatedTripData = {
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Itinerary: {
            ...tripData.tripData.Itinerary,
            [dateKey]: dayDataWithIds,
          },
        },
      }

      updateTripData(updatedTripData)
      toast.success('Day updated successfully! Remember to save.')
    } catch (error) {
      console.error('Error regenerating day:', error)
      toast.error('Failed to update day. Please try again.')
      throw error
    }
  }

  const handleRemoveDay = (dateKey) => {
    const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
    
    // Check if it's the last remaining day
    if (dateKeys.length <= 1) {
      toast.error('Cannot delete the last day!')
      return
    }
    
    const firstDay = dateKeys[0]
    const lastDay = dateKeys[dateKeys.length - 1]
    
    // Prevent deleting first day (has check-in)
    if (dateKey === firstDay) {
      toast.error('Cannot delete the first day (contains hotel check-in)', {
        duration: 4000
      })
      return
    }
    
    // Prevent deleting last day (has check-out)
    if (dateKey === lastDay) {
      toast.error('Cannot delete the last day (contains hotel check-out)', {
        duration: 4000
      })
      return
    }
    
    const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')
    if (!window.confirm(`Delete ${displayDate}? This cannot be undone.`)) {
      return
    }
  
    // Create a new itinerary without this date
    const newItinerary = { ...tripData.tripData.Itinerary }
    delete newItinerary[dateKey]
  
    console.log('=== handleRemoveDay Debug ===')
    console.log('Deleted day:', dateKey)
    console.log('Remaining days:', Object.keys(newItinerary).sort())
    console.log('Old itinerary keys:', Object.keys(tripData.tripData.Itinerary).sort())
    console.log('New itinerary keys:', Object.keys(newItinerary).sort())
  
    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }
  
    console.log('Updated trip data itinerary:', Object.keys(updatedTripData.tripData.Itinerary).sort())
  
    updateTripData(updatedTripData)
    toast.success('Day deleted successfully. Remember to save your changes!')
  }

  const handleRemoveActivity = (dateKey, activityId) => {
    const dayData = tripData.tripData.Itinerary[dateKey]
    
    // Find the activity to remove and which time slot it's in
    let activityToRemove = null
    let timeSlot = null
    let timeSlotActivities = []
    
    if (dayData.Morning?.Activities) {
      activityToRemove = dayData.Morning.Activities.find(a => a.id === activityId)
      if (activityToRemove) {
        timeSlot = 'Morning'
        timeSlotActivities = dayData.Morning.Activities
      }
    }
    
    if (!activityToRemove && dayData.Lunch?.Activity?.id === activityId) {
      activityToRemove = dayData.Lunch.Activity
      timeSlot = 'Lunch'
      timeSlotActivities = [dayData.Lunch.Activity]
    }
    
    if (!activityToRemove && dayData.Afternoon?.Activities) {
      activityToRemove = dayData.Afternoon.Activities.find(a => a.id === activityId)
      if (activityToRemove) {
        timeSlot = 'Afternoon'
        timeSlotActivities = dayData.Afternoon.Activities
      }
    }
    
    if (!activityToRemove && dayData.Evening?.Activities) {
      activityToRemove = dayData.Evening.Activities.find(a => a.id === activityId)
      if (activityToRemove) {
        timeSlot = 'Evening'
        timeSlotActivities = dayData.Evening.Activities
      }
    }
    
    if (!activityToRemove) {
      toast.error('Activity not found')
      return
    }
    
    // Prevent removing hotel check-in/out activities
    if (activityToRemove.ActivityType === 'hotel_checkin' || activityToRemove.ActivityType === 'hotel_checkout') {
      toast.error('Hotel check-in/out activities cannot be removed')
      return
    }
    
    // Check if this is the last activity in the TIME SLOT
    if (timeSlotActivities.length <= 1) {
      toast.error(`Cannot remove the last activity from ${timeSlot} slot. Each time slot must have at least one activity.`, {
        duration: 4000
      })
      return
    }
    
    // Show confirmation dialog
    const activityName = activityToRemove.PlaceName || 'this activity'
    if (!window.confirm(`Remove "${activityName}" from ${timeSlot}? This cannot be undone.`)) {
      return
    }
  
    // Create a copy of the day data
    const newDayData = { ...dayData }
  
    // Remove the activity based on which time slot it's in
    if (timeSlot === 'Morning') {
      const filtered = dayData.Morning.Activities.filter(a => a.id !== activityId)
      newDayData.Morning = { ...dayData.Morning, Activities: filtered }
    } else if (timeSlot === 'Lunch') {
      // This case should never happen since we check timeSlotActivities.length <= 1 above
      // But keep it for safety
      delete newDayData.Lunch
    } else if (timeSlot === 'Afternoon') {
      const filtered = dayData.Afternoon.Activities.filter(a => a.id !== activityId)
      newDayData.Afternoon = { ...dayData.Afternoon, Activities: filtered }
    } else if (timeSlot === 'Evening') {
      const filtered = dayData.Evening.Activities.filter(a => a.id !== activityId)
      newDayData.Evening = { ...dayData.Evening, Activities: filtered }
    }
  
    // Update trip data
    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: {
          ...tripData.tripData.Itinerary,
          [dateKey]: newDayData,
        },
      },
    }
  
    updateTripData(updatedTripData)
    toast.success(`Activity removed from ${timeSlot}`)
  }

  const handleSaveTrip = async (selectedHotels, setHasUnsavedChanges) => {
    if (!user) {
      toast.error('Please log in to save trip')
      return
    }
  
    if (selectedHotels.length === 0) {
      toast.error('Please select one hotel before saving', { duration: 3000 })
      return
    }
  
    const emptyDays = Object.entries(tripData.tripData.Itinerary)
      .filter(([_, dayData]) => {
        const morningCount = dayData.Morning?.Activities?.length || 0
        const lunchCount = dayData.Lunch?.Activity ? 1 : 0
        const afternoonCount = dayData.Afternoon?.Activities?.length || 0
        const eveningCount = dayData.Evening?.Activities?.length || 0
        return (morningCount + lunchCount + afternoonCount + eveningCount) === 0
      })
      .map(([dateKey]) => format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMMM d'))
  
    if (emptyDays.length > 0) {
      toast.error(`Please add activities to: ${emptyDays.join(', ')}`, { duration: 3000 })
      return
    }
  
    console.log('=== handleSaveTrip Debug ===')
    console.log('tripData:', tripData)
    console.log('tripData.tripData:', tripData?.tripData)
    console.log('tripData.tripData.Itinerary:', tripData?.tripData?.Itinerary)
    console.log('Itinerary days being saved:', Object.keys(tripData.tripData.Itinerary).sort())
    console.log('Full itinerary being sent:', JSON.stringify(tripData.tripData.Itinerary, null, 2))
  
    setSaving(true)
    try {
      const tripIdToSave = existingTripId.startsWith('temp_') ? null : existingTripId
      
      console.log('existingTripId:', existingTripId)
      console.log('tripIdToSave:', tripIdToSave)
      console.log('Calling saveTripToFirestore...')
  
      // Call backend API to save trip
      const result = await saveTripToFirestore({
        tripId: tripIdToSave,
        userEmail: user.email,
        userSelection: tripData.userSelection,
        tripData: tripData.tripData,
        selectedHotels
      })
  
      console.log('Backend response:', result)
  
      if (!result.success) {
        throw new Error(result.error || 'Failed to save trip')
      }
  
      // Clear temporary data
      clearTempChanges(existingTripId)
      clearTempTripId()
      setHasUnsavedChanges(false)
      localStorage.removeItem(`tp:selectedHotel:${existingTripId}`)
  
      toast.success(result.message)
      navigate(`/view-trip/${result.tripId}`)
    } catch (error) {
      console.error('Error saving trip:', error)
      console.error('Error details:', error.message)
      toast.error(error.message || 'Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  const handleHotelClick = (hotel) => {
    const slug = encodeURIComponent(hotel.HotelName || 'hotel')
    
    // For manually added hotels, navigate to manual hotel detail page
    // with the proper state format expected by that page
    if (hotel.isManuallyAdded) {
      const lat = hotel.GeoCoordinates?.Latitude || hotel.lat
      const lon = hotel.GeoCoordinates?.Longitude || hotel.lon
      
      navigate(`/manual/hotel/${slug}`, {
        state: {
          hotel: {
            // Keep both legacy/manual keys and AI-friendly keys for compatibility
            id: hotel.id,
            name: hotel.HotelName,
            address: hotel.HotelAddress,
            HotelName: hotel.HotelName,
            HotelAddress: hotel.HotelAddress,
            lat: Number.isFinite(Number(lat)) ? Number(lat) : lat,
            lon: Number.isFinite(Number(lon)) ? Number(lon) : lon,
            imageUrl: hotel.HotelImageUrl,
            city: hotel.city,
            country: hotel.country
          },
          tripContext: { userSelection: tripData.userSelection },
        },
      })
    } else {
      // For AI-generated hotels, use the regular hotel detail page
      navigate(`/hotel/${slug}`, {
        state: {
          hotel,
          tripContext: { userSelection: tripData.userSelection, existingTripId },
          returnTo: buildReturnTo(),
      },
      })
    }
  }

  const handleActivityClick = (activity) => {
    const slug = encodeURIComponent(activity.PlaceName || 'attraction')
    
    // For manually added activities, navigate to manual attraction detail page
    // with the proper state format expected by that page
    if (activity.isManuallyAdded) {
      const lat = activity.GeoCoordinates?.Latitude || activity.lat
      const lon = activity.GeoCoordinates?.Longitude || activity.lon
      
      navigate(`/manual/attraction/${slug}`, {
        state: {
          activity: {
            // Keep both legacy/manual keys and AI-friendly keys for compatibility
            name: activity.PlaceName,
            address: activity.PlaceAddress || activity.PlaceDetails,
            lat: Number.isFinite(Number(lat)) ? Number(lat) : lat,
            lon: Number.isFinite(Number(lon)) ? Number(lon) : lon,
            PlaceName: activity.PlaceName,
            PlaceDetails: activity.PlaceDetails,
            Address: activity.PlaceAddress || activity.PlaceDetails,
            GeoCoordinates: {
              Latitude: Number.isFinite(Number(lat)) ? Number(lat) : lat,
              Longitude: Number.isFinite(Number(lon)) ? Number(lon) : lon
            },
            Rating: activity.Rating || 4.5,
            imageUrl: activity.ImageUrl
          },
          tripContext: { userSelection: tripData.userSelection },
        },
      })
    } else {
      // For AI-generated activities, use the regular attraction detail page
      navigate(`/attraction/${slug}`, {
        state: {
          activity,
          tripContext: { userSelection: tripData.userSelection, existingTripId },
          returnTo: buildReturnTo(),
      },
      })
    }
  }

  // Handler to add a manually searched hotel
  const handleAddHotel = (newHotel) => {
    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Hotels: [...(tripData.tripData.Hotels || []), newHotel]
      }
    }
    updateTripData(updatedTripData)
  }

  // Handler to add a manually searched activity to a specific day/slot
  const handleAddActivity = (dateKey, timeSlot, newActivity) => {
    const dayData = { ...tripData.tripData.Itinerary[dateKey] }

    // Handle different time slots
    if (timeSlot === 'Morning') {
      const existingSlot = dayData.Morning || { StartTime: '8:00 AM', EndTime: '12:00 PM', Activities: [] }
      dayData.Morning = {
        ...existingSlot,
        Activities: [...(existingSlot.Activities || []), newActivity]
      }
    } else if (timeSlot === 'Afternoon') {
      const existingSlot = dayData.Afternoon || { StartTime: '2:00 PM', EndTime: '6:00 PM', Activities: [] }
      dayData.Afternoon = {
        ...existingSlot,
        Activities: [...(existingSlot.Activities || []), newActivity]
      }
    } else if (timeSlot === 'Evening') {
      const existingSlot = dayData.Evening || { StartTime: '6:00 PM', EndTime: '10:00 PM', Activities: [] }
      dayData.Evening = {
        ...existingSlot,
        Activities: [...(existingSlot.Activities || []), newActivity]
      }
    }

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: {
          ...tripData.tripData.Itinerary,
          [dateKey]: dayData
        }
      }
    }

    updateTripData(updatedTripData)
  }

  return {
    saving,
    regeneratingHotels,
    regeneratingAll,
    hotelPreference,
    setHotelPreference,
    isEditingSelection,
    editedSelection,
    setEditedSelection,
    handleEditSelection,
    handleCancelEdit,
    handleRegenerateAll,
    handleRegenerateHotels,
    handleRegenerateSingleDay,
    handleRemoveDay,
    handleRemoveActivity,
    handleSaveTrip,
    handleHotelClick,
    handleActivityClick,
    handleAddHotel,
    handleAddActivity,
  }
}