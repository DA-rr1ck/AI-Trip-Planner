import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Save, Loader2, GripVertical, Trash2, Sparkles, Edit, X } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { regenerateHotels } from './utils/regenerateHotels'
import { regenerateItinerary } from './utils/regenerateItinerary'
import { SelectBudgetOptions, SelectTravelesList } from '@/constants/options'
import { generateTrip } from '@/service/AIModel'
import { AI_PROMPT } from '@/constants/options'

// Function to get hotel image from Pixabay
async function getHotelImage(hotelName, hotelAddress) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(hotelName + ' ' + hotelAddress)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

// Function to get place image from Pixabay
async function getPlaceImage(placeName) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(placeName)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

// Hotel Card Component with Image
function HotelCard({ hotel }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (hotel.HotelName) {
      getHotelImage(hotel.HotelName, hotel.HotelAddress).then(setImageUrl);
    }
  }, [hotel.HotelName, hotel.HotelAddress]);

  return (
    <div className='border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow'>
      <img 
        src={imageUrl} 
        alt={hotel.HotelName}
        className='w-full h-[160px] object-cover'
      />
      <div className='p-4'>
        <h3 className='font-semibold text-lg'>{hotel.HotelName}</h3>
        <p className='text-sm text-gray-600 mt-1 line-clamp-2'>{hotel.HotelAddress}</p>
        <div className='flex justify-between mt-3 text-sm'>
          <span className='text-gray-700'>⭐ {hotel.Rating}</span>
          <span className='font-medium text-blue-600'>{hotel.Price}</span>
        </div>
        {hotel.Description && (
          <p className='text-xs text-gray-500 mt-2 line-clamp-2'>{hotel.Description}</p>
        )}
      </div>
    </div>
  );
}

// Sortable Activity Card Component with Image
function SortableActivity({ activity, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (activity.PlaceName) {
      getPlaceImage(activity.PlaceName).then(setImageUrl);
    }
  }, [activity.PlaceName]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='border rounded-lg p-3 bg-white hover:shadow-md transition-shadow'
    >
      <div className='flex items-start gap-3'>
        <button
          className='mt-1 cursor-grab active:cursor-grabbing touch-none flex-shrink-0'
          {...attributes}
          {...listeners}
        >
          <GripVertical className='h-5 w-5 text-gray-400' />
        </button>
        
        <img 
          src={imageUrl} 
          alt={activity.PlaceName}
          className='w-[100px] h-[100px] rounded-lg object-cover flex-shrink-0'
        />
        
        <div className='flex-1 min-w-0'>
          <h4 className='font-semibold text-lg'>{activity.PlaceName}</h4>
          <p className='text-sm text-gray-600 mt-1 line-clamp-2'>{activity.PlaceDetails}</p>
          <div className='flex gap-4 mt-2 text-sm text-gray-500'>
            <span>💰 {activity.TicketPricing}</span>
            <span>⏱️ {activity.TimeTravel}</span>
          </div>
        </div>

        <button
          onClick={onRemove}
          className='text-red-500 hover:text-red-700 p-1 flex-shrink-0'
          title='Remove activity'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

// Droppable Day Card Component
function DroppableDay({ dayKey, dayData, onRemoveDay, children }) {
  const { setNodeRef } = useSortable({ id: dayKey })
  const isEmpty = children.length === 0

  return (
    <div ref={setNodeRef} className='mb-6'>
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>
              {dayKey.replace('Day', 'Day ')}
            </h3>
            <p className='text-sm text-blue-700'>
              {dayData.Theme} • Best time: {dayData.BestTimeToVisit}
            </p>
          </div>
          <button
            onClick={() => onRemoveDay(dayKey)}
            className='text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50'
            title='Delete this day'
          >
            <Trash2 className='h-5 w-5' />
          </button>
        </div>
      </div>
      <div className='space-y-3 pl-4 min-h-[100px]'>
        {isEmpty ? (
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50'>
            <p className='text-sm'>Drop activities here</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function EditTrip() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [regeneratingItinerary, setRegeneratingItinerary] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')
  const [itineraryPreference, setItineraryPreference] = useState('')
  const [activeId, setActiveId] = useState(null)
  
  // NEW: User selection editing
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)

  const rawTripData = location.state?.tripData
  const [tripData, setTripData] = useState(() => {
    if (!rawTripData) return null

    const travelPlan = rawTripData.tripData?.[0]?.TravelPlan || rawTripData.tripData?.TravelPlan
    
    // Add unique IDs to activities for drag-and-drop
    const itineraryWithIds = {}
    Object.entries(travelPlan.Itinerary).forEach(([dayKey, dayData]) => {
      itineraryWithIds[dayKey] = {
        ...dayData,
        Activities: dayData.Activities.map((activity, idx) => ({
          ...activity,
          id: `${dayKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
        })),
      }
    })

    return {
      userSelection: rawTripData.userSelection,
      tripData: {
        ...travelPlan,
        Itinerary: itineraryWithIds,
      },
    }
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!tripData) {
      toast.error('No trip data found')
      navigate('/create-trip')
    }
  }, [tripData, navigate])

  // NEW: Start editing user selection
  const handleEditSelection = () => {
    setEditedSelection({
      noOfdays: tripData.userSelection.noOfdays,
      budget: tripData.userSelection.budget,
      traveler: tripData.userSelection.traveler,
    })
    setIsEditingSelection(true)
  }

  // NEW: Cancel editing
  const handleCancelEdit = () => {
    setIsEditingSelection(false)
    setEditedSelection(null)
  }

  // NEW: Regenerate entire trip based on new user selection
  const handleRegenerateAll = async () => {
    if (!editedSelection.noOfdays || !editedSelection.budget || !editedSelection.traveler) {
      toast.error('Please fill all fields')
      return
    }

    const daysNum = Number(editedSelection.noOfdays)
    if (!Number.isFinite(daysNum) || daysNum < 1 || daysNum > 5) {
      toast.error('Please enter valid number of days (1-5)')
      return
    }

    setRegeneratingAll(true)
    try {
      const FINAL_PROMPT = AI_PROMPT
        .replace('{location}', tripData.userSelection.location)
        .replace('{totalDays}', editedSelection.noOfdays)
        .replace('{traveler}', editedSelection.traveler)
        .replace('{budget}', editedSelection.budget)
        .replace('{totalDays}', editedSelection.noOfdays)

      const result = await generateTrip(FINAL_PROMPT)
      console.log('Raw regenerate result:', result)

      let newTripData
      if (typeof result === 'string') {
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        newTripData = JSON.parse(cleanResult)
      } else {
        newTripData = result
      }

      // Extract TravelPlan from array if needed
      const travelPlan = newTripData[0]?.TravelPlan || newTripData.TravelPlan || newTripData

      // Add unique IDs to activities
      const itineraryWithIds = {}
      Object.entries(travelPlan.Itinerary).forEach(([dayKey, dayData]) => {
        itineraryWithIds[dayKey] = {
          ...dayData,
          Activities: dayData.Activities.map((activity, idx) => ({
            ...activity,
            id: `${dayKey}-activity-${idx}-${Date.now()}-${Math.random()}`,
          })),
        }
      })

      setTripData({
        userSelection: {
          ...tripData.userSelection,
          ...editedSelection,
        },
        tripData: {
          ...travelPlan,
          Itinerary: itineraryWithIds,
        },
      })

      toast.success('Trip regenerated successfully!')
      setIsEditingSelection(false)
      setEditedSelection(null)
    } catch (error) {
      console.error('Error regenerating trip:', error)
      toast.error('Failed to regenerate trip. Please try again.')
    } finally {
      setRegeneratingAll(false)
    }
  }

  // Regenerate Hotels with custom preference
  const handleRegenerateHotels = async () => {
    if (!hotelPreference.trim()) {
      toast.error('Please enter your hotel preferences')
      return
    }

    setRegeneratingHotels(true)
    try {
      const newHotels = await regenerateHotels(tripData.tripData, hotelPreference)

      setTripData({
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Hotels: newHotels,
        },
      })

      toast.success('Hotels regenerated successfully!')
      setHotelPreference('')
    } catch (error) {
      console.error('Error regenerating hotels:', error)
      toast.error('Failed to regenerate hotels. Please try again.')
    } finally {
      setRegeneratingHotels(false)
    }
  }

  // Regenerate Itinerary with custom preference
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

      setTripData({
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Itinerary: itineraryWithIds,
        },
      })

      toast.success('Itinerary regenerated successfully!')
      setItineraryPreference('')
    } catch (error) {
      console.error('Error regenerating itinerary:', error)
      toast.error('Failed to regenerate itinerary. Please try again.')
    } finally {
      setRegeneratingItinerary(false)
    }
  }

  // Delete entire day
  const handleRemoveDay = (dayKey) => {
    if (!window.confirm(`Delete ${dayKey.replace('Day', 'Day ')}? This cannot be undone.`)) {
      return
    }

    const dayKeys = Object.keys(tripData.tripData.Itinerary)
    if (dayKeys.length <= 1) {
      toast.error('Cannot delete the last day!')
      return
    }

    const newItinerary = { ...tripData.tripData.Itinerary }
    delete newItinerary[dayKey]

    // Renumber remaining days
    const reorderedItinerary = {}
    Object.keys(newItinerary).forEach((oldKey, index) => {
      const newKey = `Day${index + 1}`
      reorderedItinerary[newKey] = {
        ...newItinerary[oldKey],
        Activities: newItinerary[oldKey].Activities.map((activity, actIdx) => ({
          ...activity,
          id: `${newKey}-activity-${actIdx}-${Date.now()}-${Math.random()}`,
        })),
      }
    })

    setTripData({
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: reorderedItinerary,
      },
    })
    toast.success('Day deleted successfully')
  }

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  // Handle drag end with support for empty days
  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Find which day each activity belongs to
    const findDayForActivity = (activityId) => {
      for (const [dayKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
        if (dayData.Activities.find(a => a.id === activityId)) {
          return dayKey
        }
      }
      return null
    }

    const activeDayKey = findDayForActivity(active.id)
    
    // Check if dropping on empty day container
    let overDayKey = findDayForActivity(over.id)
    
    // If not found in activities, check if it's a day key itself (empty day)
    if (!overDayKey && tripData.tripData.Itinerary[over.id]) {
      overDayKey = over.id
    }

    if (!activeDayKey || !overDayKey) return

    setTripData((prevData) => {
      const newItinerary = { ...prevData.tripData.Itinerary }

      if (activeDayKey === overDayKey) {
        // Same day - reorder activities
        const dayActivities = [...newItinerary[activeDayKey].Activities]
        const oldIndex = dayActivities.findIndex(a => a.id === active.id)
        const newIndex = dayActivities.findIndex(a => a.id === over.id)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          newItinerary[activeDayKey] = {
            ...newItinerary[activeDayKey],
            Activities: arrayMove(dayActivities, oldIndex, newIndex)
          }
        }
      } else {
        // Cross-day - move activity
        const sourceActivities = [...newItinerary[activeDayKey].Activities]
        const targetActivities = [...newItinerary[overDayKey].Activities]
        
        const activeIndex = sourceActivities.findIndex(a => a.id === active.id)
        
        if (activeIndex !== -1) {
          const [movedActivity] = sourceActivities.splice(activeIndex, 1)
          
          // Generate new unique ID for moved activity
          const updatedActivity = {
            ...movedActivity,
            id: `${overDayKey}-activity-${Date.now()}-${Math.random()}`
          }
          
          // If dropping on an activity, insert at that position
          // If dropping on empty day container, append to end
          const overIndex = targetActivities.findIndex(a => a.id === over.id)
          if (overIndex !== -1) {
            targetActivities.splice(overIndex, 0, updatedActivity)
          } else {
            targetActivities.push(updatedActivity)
          }
          
          newItinerary[activeDayKey] = {
            ...newItinerary[activeDayKey],
            Activities: sourceActivities
          }
          
          newItinerary[overDayKey] = {
            ...newItinerary[overDayKey],
            Activities: targetActivities
          }
        }
      }

      return {
        ...prevData,
        tripData: {
          ...prevData.tripData,
          Itinerary: newItinerary,
        },
      }
    })
  }

  // Remove activity
  const handleRemoveActivity = (dayKey, activityId) => {
    const updatedActivities = tripData.tripData.Itinerary[dayKey].Activities.filter(
      a => a.id !== activityId
    )

    setTripData({
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: {
          ...tripData.tripData.Itinerary,
          [dayKey]: {
            ...tripData.tripData.Itinerary[dayKey],
            Activities: updatedActivities,
          },
        },
      },
    })
    toast.success('Activity removed')
  }

  // Validate before saving
  const handleSaveTrip = async () => {
    if (!user) {
      toast.error('Please log in to save trip')
      return
    }

    // VALIDATION: Check for empty days
    const emptyDays = Object.entries(tripData.tripData.Itinerary)
      .filter(([_, dayData]) => dayData.Activities.length === 0)
      .map(([dayKey]) => dayKey.replace('Day', 'Day '))

    if (emptyDays.length > 0) {
      toast.error(`Please add activities to: ${emptyDays.join(', ')}`, {
        duration: 3000
      })
      return
    }

    setSaving(true)
    try {
      const docId = Date.now().toString()
      
      // Remove IDs before saving
      const itineraryWithoutIds = {}
      Object.entries(tripData.tripData.Itinerary).forEach(([dayKey, dayData]) => {
        itineraryWithoutIds[dayKey] = {
          ...dayData,
          Activities: dayData.Activities.map(({ id, ...activity }) => activity),
        }
      })

      await setDoc(doc(db, 'AITrips', docId), {
        userSelection: tripData.userSelection,
        tripData: {
          ...tripData.tripData,
          Itinerary: itineraryWithoutIds,
        },
        userEmail: user.email,
        id: docId,
      })
      
      toast.success('Trip saved successfully!')
      navigate(`/view-trip/${docId}`)
    } catch (error) {
      console.error('Error saving trip:', error)
      toast.error('Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  if (!tripData) return null

  const dayKeys = Object.keys(tripData.tripData.Itinerary)
  
  const allActivityIds = dayKeys.flatMap(dayKey => 
    tripData.tripData.Itinerary[dayKey].Activities.map(a => a.id)
  )

  return (
    <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='font-bold text-3xl'>Customize Your Trip</h1>
          <p className='text-gray-500 text-sm mt-1'>
            Drag activities between days • Delete unwanted days or activities
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
              Save Trip
            </>
          )}
        </Button>
      </div>

      {/* NEW: Trip Overview with Edit Option */}
      <div className='mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200'>
        <div className='flex justify-between items-start mb-2'>
          <h2 className='font-bold text-2xl text-purple-900'>
            {tripData.tripData?.Location || tripData.userSelection?.location}
          </h2>
          {!isEditingSelection && (
            <Button 
              onClick={handleEditSelection}
              variant='outline'
              size='sm'
              className='bg-white'
            >
              <Edit className='mr-2 h-4 w-4' />
              Edit Trip Details
            </Button>
          )}
        </div>

        {!isEditingSelection ? (
          <div className='flex gap-6 text-purple-700'>
            <span>📅 {tripData.userSelection?.noOfdays} Days</span>
            <span>💰 {tripData.userSelection?.budget}</span>
            <span>👤 {tripData.userSelection?.traveler}</span>
          </div>
        ) : (
          <div className='mt-4 space-y-4'>
            {/* Number of Days */}
            <div>
              <label className='block text-sm font-medium text-purple-900 mb-2'>
                Number of Days
              </label>
              <Input
                type='number'
                min='1'
                max='5'
                value={editedSelection.noOfdays}
                onChange={(e) => setEditedSelection({ ...editedSelection, noOfdays: e.target.value })}
                className='max-w-[200px]'
              />
            </div>

            {/* Budget */}
            <div>
              <label className='block text-sm font-medium text-purple-900 mb-2'>
                Budget
              </label>
              <div className='grid grid-cols-3 gap-3'>
                {SelectBudgetOptions.map((option) => (
                  <div
                    key={option.title}
                    onClick={() => setEditedSelection({ ...editedSelection, budget: option.title })}
                    className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                      editedSelection.budget === option.title 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className='text-2xl mb-1'>{option.icon}</div>
                    <div className='font-semibold text-sm'>{option.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traveler */}
            <div>
              <label className='block text-sm font-medium text-purple-900 mb-2'>
                Who are you traveling with?
              </label>
              <div className='grid grid-cols-3 gap-3'>
                {SelectTravelesList.map((option) => (
                  <div
                    key={option.title}
                    onClick={() => setEditedSelection({ ...editedSelection, traveler: option.title })}
                    className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-all ${
                      editedSelection.traveler === option.title 
                        ? 'border-purple-500 bg-purple-100' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className='text-2xl mb-1'>{option.icon}</div>
                    <div className='font-semibold text-sm'>{option.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-2'>
              <Button 
                onClick={handleRegenerateAll}
                disabled={regeneratingAll}
              >
                {regeneratingAll ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className='mr-2 h-4 w-4' />
                    Regenerate Entire Trip
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCancelEdit}
                variant='outline'
              >
                <X className='mr-2 h-4 w-4' />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Hotels - With Regeneration */}
      <div className='mb-8'>
        <h2 className='font-bold text-2xl mb-4'>Recommended Hotels</h2>
        
        <div className='mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200'>
          <p className='text-sm text-gray-700 mb-2'>
            💡 Not satisfied with the hotels? Describe your preferences and we'll find better options!
          </p>
          <div className='flex gap-2'>
            <Input
              placeholder='e.g., "I want cheaper hotels near the beach" or "Hotels with pools and gyms"'
              value={hotelPreference}
              onChange={(e) => setHotelPreference(e.target.value)}
              disabled={regeneratingHotels}
              onKeyDown={(e) => e.key === 'Enter' && handleRegenerateHotels()}
            />
            <Button
              onClick={handleRegenerateHotels}
              disabled={regeneratingHotels || !hotelPreference.trim()}
              className='whitespace-nowrap'
            >
              {regeneratingHotels ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {tripData.tripData?.Hotels?.map((hotel, index) => (
            <HotelCard key={index} hotel={hotel} />
          ))}
        </div>
      </div>

      {/* Itinerary - Drag and Drop with Regeneration */}
      <div className='mb-8'>
        <h2 className='font-bold text-2xl mb-4'>Daily Itinerary</h2>

        <div className='mb-4 p-4 bg-green-50 rounded-lg border border-green-200'>
          <p className='text-sm text-gray-700 mb-2'>
            ✨ Want different activities? Tell us your preferences and we'll create a new itinerary!
          </p>
          <div className='flex gap-2'>
            <Input
              placeholder='e.g., "More outdoor activities" or "Focus on museums and culture" or "Include food tours"'
              value={itineraryPreference}
              onChange={(e) => setItineraryPreference(e.target.value)}
              disabled={regeneratingItinerary}
              onKeyDown={(e) => e.key === 'Enter' && handleRegenerateItinerary()}
            />
            <Button
              onClick={handleRegenerateItinerary}
              disabled={regeneratingItinerary || !itineraryPreference.trim()}
              className='whitespace-nowrap'
            >
              {regeneratingItinerary ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...allActivityIds, ...dayKeys]} strategy={verticalListSortingStrategy}>
            {dayKeys.map((dayKey) => (
              <DroppableDay
                key={dayKey}
                dayKey={dayKey}
                dayData={tripData.tripData.Itinerary[dayKey]}
                onRemoveDay={handleRemoveDay}
              >
                {tripData.tripData.Itinerary[dayKey].Activities.map((activity) => (
                  <SortableActivity
                    key={activity.id}
                    activity={activity}
                    onRemove={() => handleRemoveActivity(dayKey, activity.id)}
                  />
                ))}
              </DroppableDay>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

export default EditTrip