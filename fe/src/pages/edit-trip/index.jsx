import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Save, Loader2, GripVertical, Trash2, Sparkles } from 'lucide-react'
import { generateTrip } from '@/service/AIModel'
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

// Sortable Day Card Component
function SortableDay({ dayKey, dayData, onActivityReorder, onRemoveActivity }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dayKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onActivityReorder(dayKey, active.id, over.id)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className='mb-6'>
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <button
            className='cursor-grab active:cursor-grabbing touch-none'
            {...attributes}
            {...listeners}
          >
            <GripVertical className='h-6 w-6 text-blue-600' />
          </button>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>
              {dayKey.replace('Day', 'Day ')}
            </h3>
            <p className='text-sm text-blue-700'>
              {dayData.Theme} • Best time: {dayData.BestTimeToVisit}
            </p>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={dayData.Activities.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-3 pl-9'>
            {dayData.Activities.map((activity) => (
              <SortableActivity
                key={activity.id}
                activity={activity}
                onRemove={() => onRemoveActivity(dayKey, activity.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function EditTrip() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [regeneratingHotels, setRegeneratingHotels] = useState(false)
  const [hotelPreference, setHotelPreference] = useState('')

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
          id: `${dayKey}-activity-${idx}`,
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

  // Regenerate Hotels with custom preference
  const handleRegenerateHotels = async () => {
    if (!hotelPreference.trim()) {
      toast.error('Please enter your hotel preferences')
      return
    }

    setRegeneratingHotels(true)
    try {
      const HOTEL_PROMPT = `
Generate 3 hotel recommendations for a trip to ${tripData.tripData.Location} with the following details:
- Duration: ${tripData.tripData.Duration}
- Budget: ${tripData.tripData.Budget}
- Traveler: ${tripData.tripData.Traveler}
- User Preference: ${hotelPreference}

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "HotelName": "Hotel Name",
    "HotelAddress": "Full Address",
    "Price": "Price per night",
    "HotelImageUrl": "https://example.com/image.jpg",
    "GeoCoordinates": {
      "Latitude": 0.0,
      "Longitude": 0.0
    },
    "Rating": "X stars",
    "Description": "Brief description"
  }
]
`
      const result = await generateTrip(HOTEL_PROMPT)
      console.log('Raw hotel result:', result)

      let newHotels
      if (typeof result === 'string') {
        // Remove markdown code blocks if present
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        newHotels = JSON.parse(cleanResult)
      } else {
        newHotels = result
      }

      // Update hotels in tripData
      setTripData({
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Hotels: newHotels,
        },
      })

      toast.success('Hotels regenerated successfully!')
      setHotelPreference('') // Clear input
    } catch (error) {
      console.error('Error regenerating hotels:', error)
      toast.error('Failed to regenerate hotels. Please try again.')
    } finally {
      setRegeneratingHotels(false)
    }
  }

  // Reorder days
  const handleDayReorder = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const dayKeys = Object.keys(tripData.tripData.Itinerary)
      const oldIndex = dayKeys.indexOf(active.id)
      const newIndex = dayKeys.indexOf(over.id)
      
      const newOrder = arrayMove(dayKeys, oldIndex, newIndex)
      
      const reorderedItinerary = {}
      newOrder.forEach((oldKey, index) => {
        const newKey = `Day${index + 1}`
        reorderedItinerary[newKey] = {
          ...tripData.tripData.Itinerary[oldKey],
          Activities: tripData.tripData.Itinerary[oldKey].Activities.map((activity, actIdx) => ({
            ...activity,
            id: `${newKey}-activity-${actIdx}`,
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
      toast.success('Days reordered')
    }
  }

  // Reorder activities within a day
  const handleActivityReorder = (dayKey, activeId, overId) => {
    const activities = tripData.tripData.Itinerary[dayKey].Activities
    const oldIndex = activities.findIndex(a => a.id === activeId)
    const newIndex = activities.findIndex(a => a.id === overId)

    const newActivities = arrayMove(activities, oldIndex, newIndex)

    setTripData({
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: {
          ...tripData.tripData.Itinerary,
          [dayKey]: {
            ...tripData.tripData.Itinerary[dayKey],
            Activities: newActivities,
          },
        },
      },
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

  const handleSaveTrip = async () => {
    if (!user) {
      toast.error('Please log in to save trip')
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

  return (
    <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='font-bold text-3xl'>Customize Your Trip</h1>
          <p className='text-gray-500 text-sm mt-1'>
            Drag and drop to reorder days and activities
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

      {/* Trip Overview */}
      <div className='mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200'>
        <h2 className='font-bold text-2xl text-purple-900 mb-2'>
          {tripData.tripData?.Location}
        </h2>
        <div className='flex gap-6 text-purple-700'>
          <span>📅 {tripData.tripData?.Duration}</span>
          <span>💰 {tripData.tripData?.Budget}</span>
          <span>👤 {tripData.tripData?.Traveler}</span>
        </div>
      </div>

      {/* Hotels - With Regeneration */}
      <div className='mb-8'>
        <h2 className='font-bold text-2xl mb-4'>Recommended Hotels</h2>
        
        {/* Hotel Preference Input */}
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

      {/* Itinerary - Drag and Drop */}
      <div className='mb-8'>
        <h2 className='font-bold text-2xl mb-4'>Daily Itinerary</h2>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDayReorder}
        >
          <SortableContext items={dayKeys} strategy={verticalListSortingStrategy}>
            {dayKeys.map((dayKey) => (
              <SortableDay
                key={dayKey}
                dayKey={dayKey}
                dayData={tripData.tripData.Itinerary[dayKey]}
                onActivityReorder={handleActivityReorder}
                onRemoveActivity={handleRemoveActivity}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

export default EditTrip