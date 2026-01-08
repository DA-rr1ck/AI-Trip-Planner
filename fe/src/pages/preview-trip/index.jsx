import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { parse, differenceInDays } from 'date-fns'
import { loadTempChanges, clearTempChanges } from './utils/localStorage'
import { toast } from 'sonner'

// Import hooks
import { useTripData } from './hooks/useTripData'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useHotelManagement } from './hooks/useHotelManagement'
import { useTripActions } from './hooks/useTripActions'
import { useAuth } from '@/context/AuthContext'

// Import components
import TripHeader from './components/TripHeader'
import TripOverview from './components/TripOverview'
import HotelsSection from './components/HotelsSection'
import ItinerarySection from './components/ItinerarySection'
import TripMapSection from './components/TripMapSection'
import UnsavedChangesDialog from './components/UnsavedChangesDialog'

function PreviewTrip() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const forcedTripId = searchParams.get('tripId')
  const navigate = useNavigate()
  const location = useLocation()
  
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState(null)
  const isDraggingRef = useRef(false)

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

  // ✅ Wrap drag handlers
  const wrappedHandleDragStart = useCallback((event) => {
    isDraggingRef.current = true
    handleDragStart(event)
  }, [handleDragStart])

  const wrappedHandleDragEnd = useCallback((event) => {
    isDraggingRef.current = false
    handleDragEnd(event)
  }, [handleDragEnd])

  const wrappedHandleDragCancel = useCallback(() => {
    isDraggingRef.current = false
    handleDragCancel()
  }, [handleDragCancel])

  // ✅ Block browser back/forward
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handlePopState = (e) => {
      if (!isDraggingRef.current) {
        window.history.pushState(null, '', location.pathname + location.search)
        setShowUnsavedDialog(true)
        setPendingNavigation({ pathname: '/', search: '' })
      }
    }

    window.history.pushState(null, '', location.pathname + location.search)
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [hasUnsavedChanges, location])

  // ✅ Listen for navigation blocks from Header
  useEffect(() => {
    // Store state for Header to check
    localStorage.setItem('preview_has_unsaved', hasUnsavedChanges ? 'true' : 'false')
    
    // Handle navigation attempts from Header
    const handleBlockNavigation = (e) => {
      setShowUnsavedDialog(true)
      setPendingNavigation({ pathname: e.detail.pathname, search: '' })
    }

    window.addEventListener('preview-trip-block-navigation', handleBlockNavigation)
    
    return () => {
      localStorage.removeItem('preview_has_unsaved')
      window.removeEventListener('preview-trip-block-navigation', handleBlockNavigation)
    }
  }, [hasUnsavedChanges])

  // ✅ Browser refresh warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isDraggingRef.current) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // ✅ Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    clearTempChanges(existingTripId)
    localStorage.removeItem('preview_trip_id')
    localStorage.removeItem('preview_has_unsaved')
    
    setHasUnsavedChanges(false)
    setShowUnsavedDialog(false)
    
    toast.info('Changes discarded')
    
    if (pendingNavigation) {
      setTimeout(() => {
        navigate(pendingNavigation.pathname + pendingNavigation.search)
        setPendingNavigation(null)
      }, 100)
    }
  }, [existingTripId, pendingNavigation, navigate, setHasUnsavedChanges])

  // ✅ Handle keep editing
  const handleKeepEditing = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }, [])

  // ✅ Update URL if needed
  useEffect(() => {
    if (!forcedTripId && existingTripId) {
      navigate(`/preview-trip?tripId=${existingTripId}`, { replace: true })
    }
  }, [forcedTripId, existingTripId, navigate])

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
    <>
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
          isEditingSelection={isEditingSelection}
          editedSelection={editedSelection}
          setEditedSelection={setEditedSelection}
          onCancelEdit={handleCancelEdit}
          onRegenerateAll={handleRegenerateAll}
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
          onDragStart={wrappedHandleDragStart}
          onDragEnd={wrappedHandleDragEnd}
          onDragCancel={wrappedHandleDragCancel}
        />

        <TripMapSection
          itinerary={tripData.tripData.Itinerary}
          locationName={tripData.tripData.Location}
        />
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onDiscard={handleDiscardChanges}
        onKeepEditing={handleKeepEditing}
      />
    </>
  )
}

export default PreviewTrip