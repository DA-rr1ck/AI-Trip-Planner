import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)

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
    const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')
    if (!window.confirm(`Delete ${displayDate}? This cannot be undone.`)) {
      return
    }

    const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
    if (dateKeys.length <= 1) {
      toast.error('Cannot delete the last day!')
      return
    }

    const newItinerary = { ...tripData.tripData.Itinerary }
    delete newItinerary[dateKey]

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }

    updateTripData(updatedTripData)
    toast.success('Day deleted successfully')
  }

  const handleRemoveActivity = (dateKey, activityId) => {
    const dayData = tripData.tripData.Itinerary[dateKey]
    const newDayData = { ...dayData }

    let activityToRemove = null
  
    if (dayData.Morning?.Activities) {
      activityToRemove = dayData.Morning.Activities.find(a => a.id === activityId)
    }
    if (!activityToRemove && dayData.Lunch?.Activity?.id === activityId) {
      activityToRemove = dayData.Lunch.Activity
    }
    if (!activityToRemove && dayData.Afternoon?.Activities) {
      activityToRemove = dayData.Afternoon.Activities.find(a => a.id === activityId)
    }
    if (!activityToRemove && dayData.Evening?.Activities) {
      activityToRemove = dayData.Evening.Activities.find(a => a.id === activityId)
    }
    
    if (activityToRemove?.ActivityType === 'hotel_checkin' || activityToRemove?.ActivityType === 'hotel_checkout') {
      toast.error('Hotel check-in/out activities cannot be removed')
      return
    }

    if (dayData.Morning?.Activities) {
      const filtered = dayData.Morning.Activities.filter(a => a.id !== activityId)
      if (filtered.length !== dayData.Morning.Activities.length) {
        newDayData.Morning = { ...dayData.Morning, Activities: filtered }
      }
    }

    if (dayData.Lunch?.Activity?.id === activityId) {
      newDayData.Lunch = { ...dayData.Lunch, Activity: null }
    }

    if (dayData.Afternoon?.Activities) {
      const filtered = dayData.Afternoon.Activities.filter(a => a.id !== activityId)
      if (filtered.length !== dayData.Afternoon.Activities.length) {
        newDayData.Afternoon = { ...dayData.Afternoon, Activities: filtered }
      }
    }

    if (dayData.Evening?.Activities) {
      const filtered = dayData.Evening.Activities.filter(a => a.id !== activityId)
      if (filtered.length !== dayData.Evening.Activities.length) {
        newDayData.Evening = { ...dayData.Evening, Activities: filtered }
      }
    }

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
    toast.success('Activity removed')
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
  
    setSaving(true)
    try {
      // Determine tripId to send to backend
      // If existingTripId starts with 'temp_', it's a new trip, send null
      // Otherwise, it's an existing trip, send the ID
      const tripIdToSave = existingTripId.startsWith('temp_') ? null : existingTripId;
      
      console.log('=== handleSaveTrip Debug ===');
      console.log('existingTripId:', existingTripId);
      console.log('tripIdToSave:', tripIdToSave);
      console.log('rawTripData:', rawTripData);
      console.log('rawTripData?.id:', rawTripData?.id);

      // Call backend API to save trip
      const result = await saveTripToFirestore({
        tripId: tripIdToSave,
        userEmail: user.email,
        userSelection: tripData.userSelection,
        tripData: tripData.tripData,
        selectedHotels
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save trip')
      }

      // Clear temporary data
      clearTempChanges(existingTripId)
      clearTempTripId()
      setHasUnsavedChanges(false)
  
      toast.success(result.message)
      navigate(`/view-trip/${result.tripId}`)
    } catch (error) {
      console.error('Error saving trip:', error)
      toast.error(error.message || 'Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  const handleHotelClick = (hotel) => {
    const slug = encodeURIComponent(hotel.HotelName || 'hotel')
    navigate(`/hotel/${slug}`, {
      state: {
        hotel,
        tripContext: { userSelection: tripData.userSelection },
      },
    })
  }

  const handleActivityClick = (activity) => {
    const slug = encodeURIComponent(activity.PlaceName || 'attraction')
    navigate(`/attraction/${slug}`, {
      state: {
        activity,
        tripContext: { userSelection: tripData.userSelection },
      },
    })
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
  }
}