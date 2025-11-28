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
import { regenerateItinerary } from './utils/regenerateItinerary'
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
  } = useDragAndDrop(tripData, updateTripData)

  // Component state
  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [regeneratingItinerary, setRegeneratingItinerary] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')
  const [itineraryPreference, setItineraryPreference] = useState('')
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)
  
  // NEW: Hotel selection state - initialize with all hotels selected
  const [selectedHotels, setSelectedHotels] = useState([])

  // Initialize selected hotels when tripData loads
  useEffect(() => {
    if (tripData?.tripData?.Hotels) {
      // If no previous selection, select all hotels by default
      if (selectedHotels.length === 0) {
        setSelectedHotels(tripData.tripData.Hotels)
      }
    }
  }, [tripData?.tripData?.Hotels])

  // NEW: Handle hotel selection toggle
  const handleToggleHotelSelection = (hotel) => {
    setSelectedHotels(prev => {
      const isSelected = prev.some(h => h.HotelName === hotel.HotelName)
      
      if (isSelected) {
        // Deselect hotel
        return prev.filter(h => h.HotelName !== hotel.HotelName)
      } else {
        // Select hotel
        return [...prev, hotel]
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
          Activities: dayData.Activities.map((activity, idx) => ({
            ...activity,
            id: `${dateKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
          })),
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
          budget: formatBudget(editedSelection.budgetMin, editedSelection.budgetMax),
          traveler: formatTravelers(editedSelection.adults, editedSelection.children),
        },
        tripData: {
          ...travelPlan,
          Itinerary: itineraryWithDates,
        },
      }

      updateTripData(updatedTripData)
      // Reset selected hotels to all new hotels
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
      // Reset selected hotels to all new hotels
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

  const handleRegenerateItinerary = async () => {
    if (!itineraryPreference.trim()) {
      toast.error('Please enter your itinerary preferences')
      return
    }

    setRegeneratingItinerary(true)
    try {
      const dayCount = Object.keys(tripData.tripData.Itinerary).length
      const itineraryWithIds = await regenerateItinerary(
        tripData.tripData, 
        itineraryPreference, 
        dayCount
      )

      const startDate = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
      const itineraryWithDates = {}
      Object.entries(itineraryWithIds).forEach(([dayKey, dayData], index) => {
        const actualDate = addDays(startDate, index)
        const dateKey = format(actualDate, 'yyyy-MM-dd')
        itineraryWithDates[dateKey] = dayData
      })

      const updatedTripData = {
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Itinerary: itineraryWithDates,
        },
      }

      updateTripData(updatedTripData)
      toast.success('Itinerary regenerated successfully! Remember to save.')
      setItineraryPreference('')
    } catch (error) {
      console.error('Error regenerating itinerary:', error)
      toast.error('Failed to regenerate itinerary. Please try again.')
    } finally {
      setRegeneratingItinerary(false)
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
    const updatedActivities = tripData.tripData.Itinerary[dateKey].Activities.filter(
      a => a.id !== activityId
    )

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: {
          ...tripData.tripData.Itinerary,
          [dateKey]: {
            ...tripData.tripData.Itinerary[dateKey],
            Activities: updatedActivities,
          },
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

    // NEW: Validate hotel selection
    if (selectedHotels.length === 0) {
      toast.error('Please select at least one hotel before saving', {
        duration: 3000
      })
      return
    }

    const emptyDays = Object.entries(tripData.tripData.Itinerary)
      .filter(([_, dayData]) => dayData.Activities.length === 0)
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

      const itineraryWithoutIds = {}
      Object.entries(tripData.tripData.Itinerary).forEach(([dateKey, dayData]) => {
        itineraryWithoutIds[dateKey] = {
          ...dayData,
          Activities: (dayData.Activities || []).map(({ id, ...activity }) => activity),
        }
      })

      // NEW: Save only selected hotels
      await setDoc(doc(db, 'AITrips', docId), {
        userSelection: tripData.userSelection,
        tripData: {
          ...tripData.tripData,
          Hotels: selectedHotels, // Only save selected hotels
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

  const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
  const allActivityIds = dateKeys.flatMap(dateKey => 
    tripData.tripData.Itinerary[dateKey].Activities.map(a => a.id)
  )

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
        itineraryPreference={itineraryPreference}
        setItineraryPreference={setItineraryPreference}
        regeneratingItinerary={regeneratingItinerary}
        onRegenerateItinerary={handleRegenerateItinerary}
        onRemoveDay={handleRemoveDay}
        onActivityClick={handleActivityClick}
        onRemoveActivity={handleRemoveActivity}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
    </div>
  )
}

export default EditTrip