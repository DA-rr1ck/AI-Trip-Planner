// fe/src/pages/edit-trip/index.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { Save, Loader2 } from 'lucide-react'
import { format, parse, differenceInDays, addDays } from 'date-fns'
import { addScheduleToItinerary } from '@/utils/dateTimeUtils'

// Import hooks
import { useTripData } from './hooks/useTripData'
import { useDragAndDrop } from './hooks/useDragAndDrop'

// Import utilities
import { clearTempChanges, clearTempTripId, loadTempChanges } from './utils/localStorage'
import { formatBudget, formatTravelers } from './utils/formatters'

// Import components
import TripOverview from './components/TripOverview'
import HotelsSection from './components/HotelsSection'
import ItinerarySection from './components/ItinerarySection'

// Import regeneration utilities
import { regenerateHotels } from './utils/regenerateHotels'
import { regenerateSingleDay } from './utils/regenerateItinerary'
import { generateTrip } from '@/service/AIModel'
import { AI_PROMPT } from '@/constants/options'

function EditTrip() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Use custom hooks
  const {
    tripData,
    updateTripData,
    existingTripId,
    rawTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useTripData()

  const {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop(tripData, updateTripData)

  // Component state
  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)
  
  // Hotel selection state
  const [selectedHotels, setSelectedHotels] = useState([])

  // Helper function to update hotel check-in/out activities
  const updateHotelActivities = (selectedHotel) => {
    if (!selectedHotel || !tripData?.tripData?.Itinerary) return

    const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
    if (dateKeys.length === 0) return

    const firstDate = dateKeys[0]
    const lastDate = dateKeys[dateKeys.length - 1]
    const newItinerary = { ...tripData.tripData.Itinerary }

    // Update check-in activity (first day's afternoon)
    if (newItinerary[firstDate]?.Afternoon?.Activities) {
      newItinerary[firstDate] = {
        ...newItinerary[firstDate],
        Afternoon: {
          ...newItinerary[firstDate].Afternoon,
          Activities: newItinerary[firstDate].Afternoon.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkin') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-in',
                PlaceDetails: `Check-in at ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    // Update check-out activity (last day's morning)
    if (newItinerary[lastDate]?.Morning?.Activities) {
      newItinerary[lastDate] = {
        ...newItinerary[lastDate],
        Morning: {
          ...newItinerary[lastDate].Morning,
          Activities: newItinerary[lastDate].Morning.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkout') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-out',
                PlaceDetails: `Check-out from ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }

    updateTripData(updatedTripData)
  }

  // Initialize selected hotels when tripData loads
  useEffect(() => {
    if (tripData?.tripData?.Hotels && rawTripData?.id && !existingTripId.startsWith('temp_')) {
      // Only auto-select if this is an existing saved trip being edited
      if (selectedHotels.length === 0) {
        setSelectedHotels(tripData.tripData.Hotels)
      }
    }
  }, [tripData?.tripData?.Hotels, rawTripData?.id, existingTripId])

  // Update hotel activities when hotel selection changes
  useEffect(() => {
    if (selectedHotels.length > 0 && tripData?.tripData?.Itinerary) {
      updateHotelActivities(selectedHotels[0])
    }
  }, [selectedHotels])

  // Handle hotel selection toggle
  const handleToggleHotelSelection = (hotel) => {
    setSelectedHotels(prev => {
      const isSelected = prev.some(h => h.HotelName === hotel.HotelName)
      
      if (isSelected) {
        // Deselect the hotel
        return []
      } else {
        // Select this hotel (replace any previously selected hotel)
        return [hotel]
      }
    })
    setHasUnsavedChanges(true)
  }

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasTempData = loadTempChanges(existingTripId)
      if (hasUnsavedChanges && !hasTempData) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, existingTripId])

  if (tripData === null) {
    return (
      <div className='p-10 md:px-20 lg:px-44 xl:px-56 flex flex-col justify-center items-center min-h-[50vh]'>
        <Loader2 className='h-8 w-8 animate-spin mb-4 text-purple-600' />
        <p className='text-gray-500'>Loading trip data...</p>
      </div>
    )
  }

  const getTotalDays = () => {
    if (!tripData?.userSelection?.startDate || !tripData?.userSelection?.endDate) return 0
    const start = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date())
    return differenceInDays(end, start) + 1
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
    if (totalDays < 1 || totalDays > 5) {
      toast.error('Please select a trip between 1-5 days')
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

      // Add IDs to activities in time-slotted structure
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
      setSelectedHotels(travelPlan.Hotels || [])
      toast.success('Trip regenerated successfully! Remember to save.')
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
      setSelectedHotels(newHotels)
      toast.success('Hotels regenerated successfully! Remember to save.')
      setHotelPreference('')
    } catch (error) {
      console.error('Error regenerating hotels:', error)
      toast.error('Failed to regenerate hotels. Please try again.')
    } finally {
      setRegeneratingHotels(false)
    }
  }

  // Handle per-day regeneration
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

      // Add date-specific IDs to activities in time slots
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
  
    // Check all time slots
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
    
    // Prevent removing hotel activities
    if (activityToRemove?.ActivityType === 'hotel_checkin' || activityToRemove?.ActivityType === 'hotel_checkout') {
      toast.error('Hotel check-in/out activities cannot be removed')
      return
    }

    // Remove from Morning
    if (dayData.Morning?.Activities) {
      const filtered = dayData.Morning.Activities.filter(a => a.id !== activityId)
      if (filtered.length !== dayData.Morning.Activities.length) {
        newDayData.Morning = { ...dayData.Morning, Activities: filtered }
      }
    }

    // Remove from Lunch
    if (dayData.Lunch?.Activity?.id === activityId) {
      newDayData.Lunch = { ...dayData.Lunch, Activity: null }
    }

    // Remove from Afternoon
    if (dayData.Afternoon?.Activities) {
      const filtered = dayData.Afternoon.Activities.filter(a => a.id !== activityId)
      if (filtered.length !== dayData.Afternoon.Activities.length) {
        newDayData.Afternoon = { ...dayData.Afternoon, Activities: filtered }
      }
    }

    // Remove from Evening
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

  const handleSaveTrip = async () => {
    if (!user) {
      toast.error('Please log in to save trip')
      return
    }
  
    if (selectedHotels.length === 0) {
      toast.error('Please select one hotel before saving', {
        duration: 3000
      })
      return
    }
  
    // Check for empty days based on time slot structure
    const emptyDays = Object.entries(tripData.tripData.Itinerary)
      .filter(([_, dayData]) => {
        const morningCount = dayData.Morning?.Activities?.length || 0
        const lunchCount = dayData.Lunch?.Activity ? 1 : 0
        const afternoonCount = dayData.Afternoon?.Activities?.length || 0
        const eveningCount = dayData.Evening?.Activities?.length || 0
        
        const totalActivities = morningCount + lunchCount + afternoonCount + eveningCount
        return totalActivities === 0
      })
      .map(([dateKey]) => format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMMM d'))
  
    if (emptyDays.length > 0) {
      toast.error(`Please add activities to: ${emptyDays.join(', ')}`, {
        duration: 3000
      })
      return
    }
  
    setSaving(true)
    try {
      const isRealId = rawTripData?.id && !existingTripId.startsWith('temp_')
      const docId = isRealId ? rawTripData.id : Date.now().toString()
  
      const timezone = tripData.tripData.Timezone || 'Asia/Ho_Chi_Minh'
  
      // Add schedule timestamps to all activities
      const itineraryWithSchedules = addScheduleToItinerary(
        tripData.tripData.Itinerary, 
        timezone
      )
  
      // Remove IDs from all activities in time slots
      const itineraryWithoutIds = {}
      Object.entries(itineraryWithSchedules).forEach(([dateKey, dayData]) => {
        const cleanedDay = {
          Theme: dayData.Theme,
          BestTimeToVisit: dayData.BestTimeToVisit
        }
        
        // Only add time slots if they exist and have content
        if (dayData.Morning?.Activities && dayData.Morning.Activities.length > 0) {
          cleanedDay.Morning = {
            StartTime: dayData.Morning.StartTime,
            EndTime: dayData.Morning.EndTime,
            Activities: dayData.Morning.Activities.map(({ id, ...activity }) => activity)
          }
        }
        
        if (dayData.Lunch?.Activity) {
          cleanedDay.Lunch = {
            StartTime: dayData.Lunch.StartTime,
            EndTime: dayData.Lunch.EndTime,
            Activity: (({ id, ...activity }) => activity)(dayData.Lunch.Activity)
          }
        }
        
        if (dayData.Afternoon?.Activities && dayData.Afternoon.Activities.length > 0) {
          cleanedDay.Afternoon = {
            StartTime: dayData.Afternoon.StartTime,
            EndTime: dayData.Afternoon.EndTime,
            Activities: dayData.Afternoon.Activities.map(({ id, ...activity }) => activity)
          }
        }
        
        if (dayData.Evening?.Activities && dayData.Evening.Activities.length > 0) {
          cleanedDay.Evening = {
            StartTime: dayData.Evening.StartTime,
            EndTime: dayData.Evening.EndTime,
            Activities: dayData.Evening.Activities.map(({ id, ...activity }) => activity)
          }
        }
        
        itineraryWithoutIds[dateKey] = cleanedDay
      })
  
      await setDoc(doc(db, 'AITrips', docId), {
        userSelection: tripData.userSelection,
        tripData: {
          Location: tripData.tripData.Location,
          Duration: tripData.tripData.Duration,
          Budget: tripData.tripData.Budget,
          Travelers: tripData.tripData.Travelers,
          TotalTravelers: tripData.tripData.TotalTravelers,
          Timezone: timezone,
          Hotels: selectedHotels,
          Itinerary: itineraryWithoutIds,
        },
        userEmail: user.email,
        id: docId,
      })
  
      clearTempChanges(existingTripId)
      clearTempTripId()
      setHasUnsavedChanges(false)
  
      toast.success(isRealId ? 'Trip updated successfully!' : 'Trip saved successfully!')
      navigate(`/view-trip/${docId}`)
    } catch (error) {
      console.error('Error saving trip:', error)
      toast.error('Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  const handleHotelClick = (hotel) => {
    const slug = encodeURIComponent(hotel.HotelName || 'hotel')
    navigate(`/hotel/${slug}`, {
      state: {
        hotel,
        tripContext: {
          userSelection: tripData.userSelection,
        },
      },
    })
  }

  const handleActivityClick = (activity) => {
    const slug = encodeURIComponent(activity.PlaceName || 'attraction')
    navigate(`/attraction/${slug}`, {
      state: {
        activity,
        tripContext: {
          userSelection: tripData.userSelection,
        },
      },
    })
  }

  // Calculate all activity IDs from time slots
  const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
  const allActivityIds = dateKeys.flatMap(dateKey => {
    const dayData = tripData.tripData.Itinerary[dateKey]
    return [
      ...(dayData.Morning?.Activities?.map(a => a.id) || []),
      ...(dayData.Lunch?.Activity ? [dayData.Lunch.Activity.id] : []),
      ...(dayData.Afternoon?.Activities?.map(a => a.id) || []),
      ...(dayData.Evening?.Activities?.map(a => a.id) || []),
    ]
  })

  return (
    <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
      {/* Header */}
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='font-bold text-3xl'>Customize Your Trip</h1>
          <p className='text-gray-500 text-sm mt-1'>
            Drag activities between days • Delete unwanted days or activities
            {hasUnsavedChanges && <span className='text-orange-600 ml-2'>• Unsaved changes</span>}
          </p>
        </div>
        <Button onClick={handleSaveTrip} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Saving...
            </>
          ) : (
            <>
              <Save className='mr-2 h-4 w-4' />
              {existingTripId.startsWith('temp_') ? 'Save Trip' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>

      {/* Trip Overview */}
      <TripOverview
        tripData={tripData}
        isEditingSelection={isEditingSelection}
        editedSelection={editedSelection}
        setEditedSelection={setEditedSelection}
        onEditSelection={handleEditSelection}
        onCancelEdit={handleCancelEdit}
        onRegenerateAll={handleRegenerateAll}
        regeneratingAll={regeneratingAll}
        getTotalDays={getTotalDays}
      />

      {/* Hotels Section */}
      <HotelsSection
        hotels={tripData.tripData?.Hotels}
        selectedHotels={selectedHotels}
        onToggleHotelSelection={handleToggleHotelSelection}
        hotelPreference={hotelPreference}
        setHotelPreference={setHotelPreference}
        regeneratingHotels={regeneratingHotels}
        onRegenerateHotels={handleRegenerateHotels}
        onHotelClick={handleHotelClick}
      />

      {/* Itinerary Section */}
      <ItinerarySection
        dateKeys={dateKeys}
        itinerary={tripData.tripData.Itinerary}
        allActivityIds={allActivityIds}
        onRegenerateSingleDay={handleRegenerateSingleDay}
        onRemoveDay={handleRemoveDay}
        onActivityClick={handleActivityClick}
        onRemoveActivity={handleRemoveActivity}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      />
    </div>
  )
}

export default EditTrip