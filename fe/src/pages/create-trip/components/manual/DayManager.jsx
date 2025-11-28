import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { toast } from 'sonner'
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
import { GripVertical } from 'lucide-react'
import MapRoute from '@/components/MapRoute'

// Fallback to Pixabay if SerpAPI fails
async function getImageFromPixabay(query) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  if (!API_KEY) return '/placeholder.jpg';
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits?.[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Pixabay fallback failed:', error);
    return '/placeholder.jpg';
  }
}

// Function to get place image from SerpAPI (via backend) with Pixabay fallback
async function getPlaceImage(placeName) {
  const searchQuery = `${placeName} tourist attraction`;
  
  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(searchQuery)}`
    );
    
    if (!response.ok) {
      throw new Error('SerpAPI request failed');
    }
    
    const data = await response.json();
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail;
    
    if (imageUrl) return imageUrl;
    throw new Error('No images found');
  } catch (error) {
    console.warn('SerpAPI failed, falling back to Pixabay:', error.message);
    return getImageFromPixabay(placeName);
  }
}

// Sortable Place Component
function SortablePlace({ place, index, onRemove }) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id })

  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (place.name) {
      getPlaceImage(place.name).then(setImageUrl);
    }
  }, [place.name]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        const slug = encodeURIComponent(place.name || 'attraction');
        navigate(`/manual/attraction/${slug}`, {
          state: {
            activity: {
              PlaceName: place.name,
              PlaceDetails: place.address,
              Address: place.address,
              GeoCoordinates: {
                  Latitude: place.lat,
                  Longitude: place.lon
              },
              Rating: 4.5,
              imageUrl: imageUrl
            }
          },
        })
      }}
      className='flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg group cursor-pointer hover:bg-green-100 transition-colors'
    >
      <div className='flex items-start gap-3 flex-1'>
        <button
          className='mt-1 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 text-gray-400 hover:text-gray-600'
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className='h-4 w-4' />
        </button>
        
        <img 
          src={imageUrl} 
          alt={place.name} 
          className="w-[100px] h-[100px] rounded-lg object-cover flex-shrink-0 bg-gray-200"
        />

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-semibold text-green-700'>
              {index + 1}.
            </span>
            <p className='font-medium text-green-900 text-sm line-clamp-1'>{place.name}</p>
          </div>
          <p className='text-xs text-green-700 mt-0.5 capitalize'>{place.type.replace(/_/g, ' ')}</p>
          <p className='text-xs text-green-600 mt-0.5 line-clamp-1'>{place.address}</p>
          <p className='text-[10px] text-green-500 mt-0.5'>
            {parseFloat(place.lat).toFixed(4)}, {parseFloat(place.lon).toFixed(4)}
          </p>
          <a 
            href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className='flex items-center gap-1 text-[10px] text-green-600 hover:text-green-800 hover:underline mt-1'
            onClick={(e) => e.stopPropagation()}
          >
            Open in Google Maps
            <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
            </svg>
          </a>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className='text-red-600 hover:text-red-800 ml-2'
      >
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
        </svg>
      </button>
    </div>
  )
}

// Droppable Day Component
function DroppableDay({ day, children, onRemoveDay, daySearchQuery, onSearchQueryChange, searching, searchResults, onAddPlace, onHoverPlace, onRemovePlace }) {
  const { setNodeRef } = useSortable({ id: day.id })

  return (
    <div ref={setNodeRef} className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-semibold text-gray-900'>
          Day {day.dayNumber}
        </h3>
        <button
          onClick={() => onRemoveDay(day.id)}
          className='text-red-600 hover:text-red-800 p-2'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
          </svg>
        </button>
      </div>

      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Search places to visit
        </label>
        <div className='relative'>
          <input
            type='text'
            placeholder='Search for attractions, restaurants, etc...'
            value={daySearchQuery || ''}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className='w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
          />
          <svg
            className='w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
          </svg>
        </div>
      </div>

      {searching && (
        <div className='flex items-center justify-center py-6'>
          <AiOutlineLoading3Quarters className='h-5 w-5 animate-spin text-blue-600' />
          <span className='ml-2 text-gray-600 text-sm'>Searching places...</span>
        </div>
      )}

      {!searching && searchResults?.length > 0 && (
        <div className='space-y-2 max-h-64 overflow-y-auto mb-4'>
          <p className='text-xs text-gray-600 mb-2'>
            Found {searchResults.length} places • Click to add
          </p>
          {searchResults.map((place) => (
            <div
              key={place.id}
              onClick={() => onAddPlace(day.id, place)}
              onMouseEnter={(e) => onHoverPlace(e, place, day.id)}
              onMouseMove={(e) => onHoverPlace(e, null, null, true)}
              onMouseLeave={() => onHoverPlace(null)}
              className='p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all'
            >
              <h4 className='font-medium text-gray-900 text-sm'>{place.name}</h4>
              <p className='text-xs text-gray-600 line-clamp-1 mt-1'>{place.address}</p>
              {place.type && (
                <span className='inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize'>
                  {place.type.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className='space-y-2 min-h-[50px]'>
        {children}
      </div>

      {day.places.length > 0 && (
        <div className='mt-4'>
          <MapRoute 
            activities={day.places.map(p => ({
              GeoCoordinates: {
                Latitude: parseFloat(p.lat),
                Longitude: parseFloat(p.lon)
              },
              PlaceName: p.name,
              PlaceDetails: p.address,
              TicketPricing: 'N/A', 
              TimeTravel: 'N/A' 
            }))} 
            locationName={`Day ${day.dayNumber}`}
          />
        </div>
      )}

      {day.places.length === 0 && !daySearchQuery && (
        <div className='text-center py-6 text-gray-500 text-sm'>
          Search and add places to visit on this day
        </div>
      )}
    </div>
  )
}

function DayManager({ location, tripDays, onDaysChange }) {
  const [daySearchQueries, setDaySearchQueries] = useState({})
  const [dayPlaceResults, setDayPlaceResults] = useState({})
  const [searchingDayPlaces, setSearchingDayPlaces] = useState({})
  const [activeId, setActiveId] = useState(null)
  
  // Hover state
  const [hoveredPlace, setHoveredPlace] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const [nearbyData, setNearbyData] = useState({})
  const [loadingNearby, setLoadingNearby] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleMouseMove = (e) => {
    const popupHeight = 400 
    const popupWidth = 320 
    const padding = 20

    let top = e.clientY + padding
    let left = e.clientX + padding

    if (top + popupHeight > window.innerHeight) {
      top = e.clientY - popupHeight - padding
    }

    if (left + popupWidth > window.innerWidth) {
      left = e.clientX - popupWidth - padding
    }

    setPopupPosition({ top, left })
  }

  // Fetch nearby amenities using Overpass API
  useEffect(() => {
    if (!hoveredPlace) return
    if (nearbyData[hoveredPlace.id]) return

    const fetchNearby = async () => {
      setLoadingNearby(true)
      try {
        const query = `
          [out:json][timeout:25];
          (
            node["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["highway"="bus_stop"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["public_transport"="platform"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["amenity"="fuel"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["shop"="convenience"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["amenity"="pharmacy"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
            node["amenity"="atm"](around:1000, ${hoveredPlace.lat}, ${hoveredPlace.lon});
          );
          out body;
        `
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        })
        const data = await response.json()
        
        // Process data
        const attractions = []
        const seenAttractions = new Set()
        const counts = {
          bus_stop: 0,
          gas_station: 0,
          conbini: 0,
          drug_store: 0,
          atm: 0
        }

        data.elements.forEach(el => {
          if (el.tags.tourism) {
            const name = el.tags['name:en'] || el.tags.name
            
            if (!name) return
            if (seenAttractions.has(name.toLowerCase())) return
            if (['viewpoint', 'attraction', 'museum'].includes(name.toLowerCase())) return
            
            seenAttractions.add(name.toLowerCase())

            // Calculate distance
            const R = 6371e3 
            const φ1 = hoveredPlace.lat * Math.PI/180
            const φ2 = el.lat * Math.PI/180
            const Δφ = (el.lat - hoveredPlace.lat) * Math.PI/180
            const Δλ = (el.lon - hoveredPlace.lon) * Math.PI/180

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const d = R * c 

            attractions.push({
              name: name,
              distance: Math.round(d)
            })
          } else if (el.tags.highway === 'bus_stop' || el.tags.public_transport === 'platform') {
            counts.bus_stop++
          } else if (el.tags.amenity === 'fuel') {
            counts.gas_station++
          } else if (el.tags.shop === 'convenience') {
            counts.conbini++
          } else if (el.tags.amenity === 'pharmacy') {
            counts.drug_store++
          } else if (el.tags.amenity === 'atm') {
            counts.atm++
          }
        })

        attractions.sort((a, b) => a.distance - b.distance)
        
        setNearbyData(prev => ({
          ...prev,
          [hoveredPlace.id]: {
            attractions: attractions.slice(0, 2),
            counts
          }
        }))
      } catch (error) {
        console.error('Error fetching nearby places:', error)
      } finally {
        setLoadingNearby(false)
      }
    }

    const timer = setTimeout(fetchNearby, 500)
    return () => clearTimeout(timer)
  }, [hoveredPlace])

  const addNewDay = () => {
    const dayNumber = tripDays.length + 1
    onDaysChange([...tripDays, { id: Date.now(), dayNumber, places: [] }])
  }

  const removeDay = (dayId) => {
    onDaysChange(tripDays.filter(day => day.id !== dayId))
  }

  // Debounced search for places per day
  useEffect(() => {
    const timers = {}
    Object.keys(daySearchQueries).forEach(dayId => {
      const query = daySearchQueries[dayId]
      timers[dayId] = setTimeout(() => {
        if (query && query.length >= 2) {
          searchPlacesForDay(dayId, query)
        } else {
          setDayPlaceResults(prev => ({ ...prev, [dayId]: [] }))
        }
      }, 600)
    })
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [daySearchQueries, location])

  const searchPlacesForDay = async (dayId, query) => {
    if (!query || query.length < 2) {
      setDayPlaceResults(prev => ({ ...prev, [dayId]: [] }))
      return
    }
    setSearchingDayPlaces(prev => ({ ...prev, [dayId]: true }))
    try {
      const searchQuery = `${query} ${location}`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=20&addressdetails=1`
      )
      const data = await response.json()
      const places = data
        .filter(item => {
          const displayName = item.display_name.toLowerCase()
          const isInLocation = displayName.includes((location || '').toLowerCase().split(',')[0])
          return isInLocation
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: item.lat,
          lon: item.lon,
          type: item.type || 'place',
          category: item.class || ''
        }))
        .filter((p, i, self) => i === self.findIndex(s => s.name.toLowerCase() === p.name.toLowerCase()))
        .slice(0, 10)
      setDayPlaceResults(prev => ({ ...prev, [dayId]: places }))
    } catch (e) {
      console.error('Error searching places:', e)
      setDayPlaceResults(prev => ({ ...prev, [dayId]: [] }))
    } finally {
      setSearchingDayPlaces(prev => ({ ...prev, [dayId]: false }))
    }
  }

  const addPlaceToDay = (dayId, place) => {
    const updated = tripDays.map(day => {
      if (day.id === dayId) {
        // Check for duplicates using original ID if available, or just ID
        if (day.places.find(p => (p.originalId || p.id) === place.id)) {
          toast.info('This place is already in this day')
          return day
        }
        
        const newPlace = { 
          ...place, 
          originalId: place.id,
          id: `place-${Date.now()}-${Math.random()}` 
        }
        
        return { ...day, places: [...day.places, newPlace] }
      }
      return day
    })
    onDaysChange(updated)
    // Clear the query and results for this day immediately after adding a place
    setDaySearchQueries(prev => ({ ...prev, [dayId]: '' }))
    setDayPlaceResults(prev => ({ ...prev, [dayId]: [] }))
    setHoveredPlace(null) // Clear hover state
    const dayNum = updated.find(d => d.id === dayId)?.dayNumber
    if (dayNum) toast.success(`Added "${place.name}" to Day ${dayNum}`)
  }

  const removePlaceFromDay = (dayId, placeId) => {
    const updated = tripDays.map(day => {
      if (day.id === dayId) {
        return { ...day, places: day.places.filter(p => p.id !== placeId) }
      }
      return day
    })
    onDaysChange(updated)
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const findDayForPlace = (placeId) => {
      for (const day of tripDays) {
        if (day.places.find(p => p.id === placeId)) {
          return day.id
        }
      }
      return null
    }

    const activeDayId = findDayForPlace(active.id)
    let overDayId = findDayForPlace(over.id)

    if (!overDayId) {
        // Check if over.id is a day id
        const overDay = tripDays.find(d => d.id === over.id)
        if (overDay) {
            overDayId = overDay.id
        }
    }

    if (!activeDayId || !overDayId) return

    if (activeDayId === overDayId) {
        // Reorder within same day
        const dayIndex = tripDays.findIndex(d => d.id === activeDayId)
        const day = tripDays[dayIndex]
        const oldIndex = day.places.findIndex(p => p.id === active.id)
        const newIndex = day.places.findIndex(p => p.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
            const newPlaces = arrayMove(day.places, oldIndex, newIndex)
            const newTripDays = [...tripDays]
            newTripDays[dayIndex] = { ...day, places: newPlaces }
            onDaysChange(newTripDays)
        }
    } else {
        // Move to different day
        const sourceDayIndex = tripDays.findIndex(d => d.id === activeDayId)
        const targetDayIndex = tripDays.findIndex(d => d.id === overDayId)
        
        const sourceDay = tripDays[sourceDayIndex]
        const targetDay = tripDays[targetDayIndex]

        const sourcePlaces = [...sourceDay.places]
        const targetPlaces = [...targetDay.places]

        const activeIndex = sourcePlaces.findIndex(p => p.id === active.id)
        if (activeIndex !== -1) {
            const [movedPlace] = sourcePlaces.splice(activeIndex, 1)
            
            const overIndex = targetPlaces.findIndex(p => p.id === over.id)
            if (overIndex !== -1) {
                targetPlaces.splice(overIndex, 0, movedPlace)
            } else {
                targetPlaces.push(movedPlace)
            }

            const newTripDays = [...tripDays]
            newTripDays[sourceDayIndex] = { ...sourceDay, places: sourcePlaces }
            newTripDays[targetDayIndex] = { ...targetDay, places: targetPlaces }
            onDaysChange(newTripDays)
        }
    }
  }

  const allPlaceIds = tripDays.flatMap(day => day.places.map(p => p.id))

  return (
    <div className='mt-10'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Plan Your Days</h2>
          <p className='text-gray-600 mt-1'>Add days and places to visit</p>
        </div>
        <Button onClick={addNewDay} className='flex items-center gap-2'>
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 4v16m8-8H4' />
          </svg>
          Add Day
        </Button>
      </div>

      {tripDays.length === 0 ? (
        <div className='text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50'>
          <p className='text-gray-600 mb-4'>No days added yet</p>
          <Button onClick={addNewDay} variant='outline'>
            Add Your First Day
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={[...allPlaceIds, ...tripDays.map(d => d.id)]} strategy={verticalListSortingStrategy}>
            <div className='space-y-6'>
              {tripDays.map((day) => (
                <DroppableDay
                  key={day.id}
                  day={day}
                  onRemoveDay={removeDay}
                  daySearchQuery={daySearchQueries[day.id]}
                  onSearchQueryChange={(val) => setDaySearchQueries({ ...daySearchQueries, [day.id]: val })}
                  searching={searchingDayPlaces[day.id]}
                  searchResults={dayPlaceResults[day.id]}
                  onAddPlace={addPlaceToDay}
                  onHoverPlace={(e, place, dayId, isMove) => {
                    if (isMove) {
                      handleMouseMove(e)
                    } else if (place) {
                      handleMouseMove(e)
                      setHoveredPlace({ ...place, dayId })
                    } else {
                      setHoveredPlace(null)
                    }
                  }}
                  onRemovePlace={removePlaceFromDay}
                >
                  {day.places.map((place, index) => (
                    <SortablePlace
                      key={place.id}
                      place={place}
                      index={index}
                      onRemove={() => removePlaceFromDay(day.id, place.id)}
                    />
                  ))}
                </DroppableDay>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Hover Popup */}
      {hoveredPlace && (
        <div 
          className='fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-blue-100 p-5 animate-in fade-in zoom-in-95 duration-200 hidden xl:block'
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <div className='flex items-start justify-between mb-3'>
            <h3 className='font-bold text-lg text-gray-900'>{hoveredPlace.name}</h3>
            <span className='bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full capitalize'>
              {hoveredPlace.type?.replace(/_/g, ' ') || 'Place'}
            </span>
          </div>
          
          <div className='space-y-2'>
            <div className='flex items-start gap-2 text-sm text-gray-600'>
              <span className='min-w-[20px]'>📍</span>
              <p>{hoveredPlace.address}</p>
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-600'>
              <span className='min-w-[20px]'>🌍</span>
              <p>{parseFloat(hoveredPlace.lat).toFixed(4)}, {parseFloat(hoveredPlace.lon).toFixed(4)}</p>
            </div>

            {/* Nearby Amenities for Hovered Place */}
            {loadingNearby && !nearbyData[hoveredPlace.id] ? (
              <div className='mt-3 pt-3 border-t border-gray-100 flex justify-center'>
                <AiOutlineLoading3Quarters className='h-4 w-4 animate-spin text-blue-500' />
              </div>
            ) : nearbyData[hoveredPlace.id] ? (
              <div className='mt-3 pt-3 border-t border-gray-100'>
                <p className='text-xs font-semibold text-gray-700 mb-2'>Nearby Highlights (1km)</p>
                
                {/* Featured Attractions */}
                {nearbyData[hoveredPlace.id].attractions.length > 0 && (
                  <div className='grid grid-cols-2 gap-1.5 mb-2'>
                    {nearbyData[hoveredPlace.id].attractions.map((attr, idx) => (
                      <div key={idx} className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200 text-center'>
                        <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight mb-0.5'>{attr.distance}m</span>
                        <span className='text-xs font-bold text-gray-800 line-clamp-1 w-full px-1' title={attr.name}>{attr.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amenities Counts */}
                <div className='grid grid-cols-5 gap-1.5'>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Bus Stops">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Bus</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredPlace.id].counts.bus_stop}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Gas Stations">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Gas</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredPlace.id].counts.gas_station}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Convenience Stores">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Store</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredPlace.id].counts.conbini}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Pharmacies">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Pharm</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredPlace.id].counts.drug_store}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="ATMs">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>ATM</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredPlace.id].counts.atm}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className='mt-4 pt-3 border-t border-gray-100'>
            <p className='text-xs text-gray-400 italic'>
              Click to add this place to Day {tripDays.find(d => d.id === hoveredPlace.dayId)?.dayNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DayManager
