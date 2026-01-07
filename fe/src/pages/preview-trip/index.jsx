import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { parse, differenceInDays } from 'date-fns'
import { loadTempChanges } from './utils/localStorage'

// Import hooks
import { useTripData } from './hooks/useTripData'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useHotelManagement } from './hooks/useHotelManagement'
import { useTripActions } from './hooks/useTripActions'
import { useAuth } from '@/context/AuthContext'

// Import components
import TripHeader from './components/TripHeader'
import TripOverview from './components/TripOverview'
import TripRegenerationSection from './components/TripRegenerationSection'
import HotelsSection from './components/HotelsSection'
import ItinerarySection from './components/ItinerarySection'
import TripMapSection from './components/TripMapSection'

function PreviewTrip() {
  const { user } = useAuth()

  const [searchParams] = useSearchParams()
  const forcedTripId = searchParams.get('tripId')

  const navigate = useNavigate()
  
  // Use custom hooks
  const {
    tripData,
    updateTripData,
    existingTripId,
    rawTripData,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  } = useTripData(null, forcedTripId)

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
    handleAddHotel,
    handleAddActivity,
  } = useTripActions(tripData, updateTripData, existingTripId, rawTripData, user)

  useEffect(() => {
    // If URL has no tripId, rewrite it to the canonical form
    if (!forcedTripId && existingTripId) {
      navigate(`/preview-trip?tripId=${existingTripId}`, { replace: true })
    }
  }, [forcedTripId, existingTripId, navigate])

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
        <p className='text-gray-500'>Loading trip preview...</p>
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
        isNewTrip={existingTripId.startsWith('temp_')}
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
        onHotelAdd={handleAddHotel}
        location={tripData.tripData?.Location}
      />

      <ItinerarySection
        dateKeys={dateKeys}
        itinerary={tripData.tripData.Itinerary}
        allActivityIds={allActivityIds}
        onRegenerateSingleDay={handleRegenerateSingleDay}
        onRemoveDay={handleRemoveDay}
        onActivityClick={handleActivityClick}
        onRemoveActivity={handleRemoveActivity}
        onActivityAdd={handleAddActivity}
        location={tripData.tripData?.Location}
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

export default PreviewTrip