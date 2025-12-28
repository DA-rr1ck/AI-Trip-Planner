import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { parse, differenceInDays } from 'date-fns'
import { loadTempChanges } from '../../preview-trip/utils/localStorage'
import { getTripById } from '@/service/tripService' // NEW

// Import hooks from preview-trip
import { useTripData } from '../../preview-trip/hooks/useTripData'
import { useDragAndDrop } from '../../preview-trip/hooks/useDragAndDrop'
import { useHotelManagement } from '../../preview-trip/hooks/useHotelManagement'
import { useTripActions } from '../../preview-trip/hooks/useTripActions'
import { useAuth } from '@/context/AuthContext'

// Import components from preview-trip
import TripHeader from '../../preview-trip/components/TripHeader'
import TripOverview from '../../preview-trip/components/TripOverview'
import TripRegenerationSection from '../../preview-trip/components/TripRegenerationSection'
import HotelsSection from '../../preview-trip/components/HotelsSection'
import ItinerarySection from '../../preview-trip/components/ItinerarySection'
import TripMapSection from '../../preview-trip/components/TripMapSection'

function EditTrip() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const [loadingTrip, setLoadingTrip] = useState(true)
  const [loadedTripData, setLoadedTripData] = useState(null)

  // Load trip using backend API
  useEffect(() => {
    const loadTrip = async () => {
      try {
        // Check if data passed via state (from view-trip)
        if (location.state?.tripData) {
          setLoadedTripData(location.state.tripData)
          setLoadingTrip(false)
          return
        }

        // Load from backend API
        const result = await getTripById(tripId)
        
        if (result.success) {
          setLoadedTripData({
            userSelection: result.trip.userSelection,
            tripData: result.trip.tripData
          })
        } else {
          toast.error('Trip not found')
          navigate('/my-trips')
        }
      } catch (error) {
        console.error('Error loading trip:', error)
        toast.error(error.message || 'Failed to load trip')
        navigate('/my-trips')
      } finally {
        setLoadingTrip(false)
      }
    }

    if (tripId) {
      loadTrip()
    }
  }, [tripId, navigate, location.state])

  // Use custom hooks (same as preview-trip)
  const {
    tripData,
    updateTripData,
    existingTripId,
    rawTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useTripData(loadedTripData, tripId)

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop(tripData, updateTripData)

  const {
    selectedHotels,
    handleToggleHotelSelection,
  } = useHotelManagement(tripData, updateTripData, rawTripData, existingTripId, setHasUnsavedChanges)

  const {
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
  } = useTripActions(tripData, updateTripData, existingTripId, rawTripData, user)


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

  if (loadingTrip || tripData === null) {
    return (
      <div className='p-10 md:px-20 lg:px-44 xl:px-56 flex flex-col justify-center items-center min-h-[50vh]'>
        <Loader2 className='h-8 w-8 animate-spin mb-4 text-purple-600' />
        <p className='text-gray-500'>Loading trip...</p>
      </div>
    )
  }

  const getTotalDays = () => {
    if (!tripData?.userSelection?.startDate || !tripData?.userSelection?.endDate) return 0
    const start = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date())
    return differenceInDays(end, start) + 1
  }

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
      <TripHeader
        hasUnsavedChanges={hasUnsavedChanges}
        saving={saving}
        onSave={() => handleSaveTrip(selectedHotels, setHasUnsavedChanges)}
        isNewTrip={false}
      />

      <TripOverview
        tripData={tripData}
        onEditSelection={handleEditSelection}
        getTotalDays={getTotalDays}
      />

      <TripRegenerationSection
        isEditingSelection={isEditingSelection}
        editedSelection={editedSelection}
        setEditedSelection={setEditedSelection}
        onCancel={handleCancelEdit}
        onRegenerate={handleRegenerateAll}
        regeneratingAll={regeneratingAll}
      />

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

      <TripMapSection
        itinerary={tripData.tripData.Itinerary}
        locationName={tripData.tripData.Location}
      />
    </div>
  )
}

export default EditTrip