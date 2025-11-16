import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Save, Loader2, GripVertical, Trash2, Sparkles, Edit, X } from 'lucide-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { format, parse, differenceInDays, addDays } from 'date-fns'
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

// Droppable Day Card Component - Now displays actual dates
function DroppableDay({ dateKey, dayData, onRemoveDay, children }) {
  const { setNodeRef } = useSortable({ id: dateKey })
  const isEmpty = children.length === 0

  // Format date for display
  const displayDate = format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')

  return (
    <div ref={setNodeRef} className='mb-6'>
      <div className='bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-3 border border-blue-200'>
        <div className='flex items-center gap-3'>
          <div className='flex-1'>
            <h3 className='font-bold text-xl text-blue-900'>
              {displayDate}
            </h3>
            <p className='text-sm text-blue-700'>
              {dayData.Theme} • Best time: {dayData.BestTimeToVisit}
            </p>
          </div>
          <button
            onClick={() => onRemoveDay(dateKey)}
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
  
  const [isEditingSelection, setIsEditingSelection] = useState(false)
  const [editedSelection, setEditedSelection] = useState(null)

  const rawTripData = location.state?.tripData
  
  // FIXED: Better state initialization
  const [tripData, setTripData] = useState(() => {
    if (!rawTripData) return null

    console.log('Raw trip data received:', rawTripData)

    // Extract travel plan from various possible structures
    let travelPlan
    if (rawTripData.tripData) {
      // From create-trip or edit-trip navigation
      travelPlan = rawTripData.tripData
    } else if (Array.isArray(rawTripData) && rawTripData[0]?.TravelPlan) {
      // From database (array format)
      travelPlan = rawTripData[0].TravelPlan
    } else if (rawTripData.TravelPlan) {
      // Direct TravelPlan object
      travelPlan = rawTripData.TravelPlan
    } else {
      // Assume rawTripData is the travel plan
      travelPlan = rawTripData
    }

    console.log('Extracted travel plan:', travelPlan)

    // Validate itinerary exists
    if (!travelPlan || !travelPlan.Itinerary) {
      console.error('No itinerary found:', travelPlan)
      toast.error('Invalid trip data')
      return null
    }

    // Add unique IDs for drag-and-drop
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!tripData) {
      toast.error('No trip data found. Redirecting...')
      const timer = setTimeout(() => navigate('/create-trip'), 2000)
      return () => clearTimeout(timer)
    }
  }, [tripData, navigate])

  // Show loading state
  if (tripData === null) {
    return (
      <div className='p-10 md:px-20 lg:px-44 xl:px-56 flex flex-col justify-center items-center min-h-[50vh]'>
        <Loader2 className='h-8 w-8 animate-spin mb-4 text-purple-600' />
        <p className='text-gray-500'>Loading trip data...</p>
      </div>
    )
  }

  // Calculate total days from dates
  const getTotalDays = () => {
    if (!tripData?.userSelection?.startDate || !tripData?.userSelection?.endDate) return 0
    const start = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date())
    return differenceInDays(end, start) + 1
  }

  // Start editing user selection
  const handleEditSelection = () => {
    const start = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
    const end = parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date())
    
    setEditedSelection({
      startDate: start,
      endDate: end,
      budget: tripData.userSelection.budget,
      traveler: tripData.userSelection.traveler,
    })
    setIsEditingSelection(true)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditingSelection(false)
    setEditedSelection(null)
  }

  // Regenerate entire trip based on new user selection
  const handleRegenerateAll = async () => {
    if (!editedSelection.startDate || !editedSelection.endDate || !editedSelection.budget || !editedSelection.traveler) {
      toast.error('Please fill all fields')
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
        .replace('{traveler}', editedSelection.traveler)
        .replace('{budget}', editedSelection.budget)
        .replace('{totalDays}', totalDays)

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

      // Convert Day1, Day2... to actual dates
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

      setTripData({
        userSelection: {
          ...tripData.userSelection,
          startDate: format(editedSelection.startDate, 'yyyy-MM-dd'),
          endDate: format(editedSelection.endDate, 'yyyy-MM-dd'),
          budget: editedSelection.budget,
          traveler: editedSelection.traveler,
        },
        tripData: {
          ...travelPlan,
          Itinerary: itineraryWithDates,
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

      // Convert Day1, Day2... to actual dates
      const startDate = parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date())
      const itineraryWithDates = {}
      Object.entries(itineraryWithIds).forEach(([dayKey, dayData], index) => {
        const actualDate = addDays(startDate, index)
        const dateKey = format(actualDate, 'yyyy-MM-dd')
        itineraryWithDates[dateKey] = dayData
      })

      setTripData({
        ...tripData,
        tripData: {
          ...tripData.tripData,
          Itinerary: itineraryWithDates,
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

    setTripData({
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
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
      for (const [dateKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
        if (dayData.Activities.find(a => a.id === activityId)) {
          return dateKey
        }
      }
      return null
    }

    const activeDateKey = findDayForActivity(active.id)
    
    // Check if dropping on empty day container
    let overDateKey = findDayForActivity(over.id)
    
    // If not found in activities, check if it's a date key itself (empty day)
    if (!overDateKey && tripData.tripData.Itinerary[over.id]) {
      overDateKey = over.id
    }

    if (!activeDateKey || !overDateKey) return

    setTripData((prevData) => {
      const newItinerary = { ...prevData.tripData.Itinerary }

      if (activeDateKey === overDateKey) {
        // Same day - reorder activities
        const dayActivities = [...newItinerary[activeDateKey].Activities]
        const oldIndex = dayActivities.findIndex(a => a.id === active.id)
        const newIndex = dayActivities.findIndex(a => a.id === over.id)
        
        if (oldIndex !== -1 && newIndex !== -1) {
          newItinerary[activeDateKey] = {
            ...newItinerary[activeDateKey],
            Activities: arrayMove(dayActivities, oldIndex, newIndex)
          }
        }
      } else {
        // Cross-day - move activity
        const sourceActivities = [...newItinerary[activeDateKey].Activities]
        const targetActivities = [...newItinerary[overDateKey].Activities]
        
        const activeIndex = sourceActivities.findIndex(a => a.id === active.id)
        
        if (activeIndex !== -1) {
          const [movedActivity] = sourceActivities.splice(activeIndex, 1)
          
          // Generate new unique ID for moved activity
          const updatedActivity = {
            ...movedActivity,
            id: `${overDateKey}-activity-${Date.now()}-${Math.random()}`
          }
          
          // If dropping on an activity, insert at that position
          // If dropping on empty day container, append to end
          const overIndex = targetActivities.findIndex(a => a.id === over.id)
          if (overIndex !== -1) {
            targetActivities.splice(overIndex, 0, updatedActivity)
          } else {
            targetActivities.push(updatedActivity)
          }
          
          newItinerary[activeDateKey] = {
            ...newItinerary[activeDateKey],
            Activities: sourceActivities
          }
          
          newItinerary[overDateKey] = {
            ...newItinerary[overDateKey],
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
  const handleRemoveActivity = (dateKey, activityId) => {
    const updatedActivities = tripData.tripData.Itinerary[dateKey].Activities.filter(
      a => a.id !== activityId
    )

    setTripData({
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
      .map(([dateKey]) => format(parse(dateKey, 'yyyy-MM-dd', new Date()), 'MMMM d'))

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
      Object.entries(tripData.tripData.Itinerary).forEach(([dateKey, dayData]) => {
        itineraryWithoutIds[dateKey] = {
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

  const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
  
  const allActivityIds = dateKeys.flatMap(dateKey => 
    tripData.tripData.Itinerary[dateKey].Activities.map(a => a.id)
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

      {/* Trip Overview with Edit Option */}
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
            <span>📅 {format(parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date()), 'MMM d')} - {format(parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}</span>
            <span>🗓️ {getTotalDays()} Days</span>
            <span>💰 {tripData.userSelection?.budget}</span>
            <span>👤 {tripData.userSelection?.traveler}</span>
          </div>
        ) : (
          <div className='mt-4 space-y-4'>
            {/* Date Range */}
            <div>
              <label className='block text-sm font-medium text-purple-900 mb-2'>
                Trip Dates
              </label>
              <DatePicker
                selected={editedSelection.startDate}
                onChange={(dates) => {
                  const [start, end] = dates
                  setEditedSelection({ ...editedSelection, startDate: start, endDate: end })
                }}
                startDate={editedSelection.startDate}
                endDate={editedSelection.endDate}
                selectsRange
                minDate={new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start and end date"
                className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
                isClearable
              />
              {editedSelection.startDate && editedSelection.endDate && (
                <p className='mt-2 text-sm text-purple-700'>
                  Trip duration: {differenceInDays(editedSelection.endDate, editedSelection.startDate) + 1} days
                </p>
              )}
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
          <SortableContext items={[...allActivityIds, ...dateKeys]} strategy={verticalListSortingStrategy}>
            {dateKeys.map((dateKey) => (
              <DroppableDay
                key={dateKey}
                dateKey={dateKey}
                dayData={tripData.tripData.Itinerary[dateKey]}
                onRemoveDay={handleRemoveDay}
              >
                {tripData.tripData.Itinerary[dateKey].Activities.map((activity) => (
                  <SortableActivity
                    key={activity.id}
                    activity={activity}
                    onRemove={() => handleRemoveActivity(dateKey, activity.id)}
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