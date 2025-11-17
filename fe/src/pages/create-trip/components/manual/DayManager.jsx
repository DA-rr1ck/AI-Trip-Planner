import React, { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { toast } from 'sonner'

function DayManager({ location, tripDays, onDaysChange }) {
  const [daySearchQueries, setDaySearchQueries] = useState({})
  const [dayPlaceResults, setDayPlaceResults] = useState({})
  const [searchingDayPlaces, setSearchingDayPlaces] = useState({})

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
        if (day.places.find(p => p.id === place.id)) {
          toast.info('This place is already in this day')
          return day
        }
        return { ...day, places: [...day.places, place] }
      }
      return day
    })
    onDaysChange(updated)
    // Clear the query and results for this day immediately after adding a place
    setDaySearchQueries(prev => ({ ...prev, [dayId]: '' }))
    setDayPlaceResults(prev => ({ ...prev, [dayId]: [] }))
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
        <div className='space-y-6'>
          {tripDays.map((day) => (
            <div key={day.id} className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-semibold text-gray-900'>
                  Day {day.dayNumber}
                </h3>
                <button
                  onClick={() => removeDay(day.id)}
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
                    value={daySearchQueries[day.id] || ''}
                    onChange={(e) => {
                      setDaySearchQueries({ ...daySearchQueries, [day.id]: e.target.value })
                    }}
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

              {searchingDayPlaces[day.id] && (
                <div className='flex items-center justify-center py-6'>
                  <AiOutlineLoading3Quarters className='h-5 w-5 animate-spin text-blue-600' />
                  <span className='ml-2 text-gray-600 text-sm'>Searching places...</span>
                </div>
              )}

              {!searchingDayPlaces[day.id] && dayPlaceResults[day.id]?.length > 0 && (
                <div className='space-y-2 max-h-64 overflow-y-auto mb-4'>
                  <p className='text-xs text-gray-600 mb-2'>
                    Found {dayPlaceResults[day.id].length} places • Click to add
                  </p>
                  {dayPlaceResults[day.id].map((place) => (
                    <div
                      key={place.id}
                      onClick={() => addPlaceToDay(day.id, place)}
                      className='p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all'
                    >
                      <h4 className='font-medium text-gray-900 text-sm'>{place.name}</h4>
                      <p className='text-xs text-gray-600 line-clamp-1 mt-1'>{place.address}</p>
                      {place.category && (
                        <span className='inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded'>
                          {place.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {day.places.length > 0 && (
                <div className='mt-4'>
                  <p className='text-sm font-medium text-gray-700 mb-2'>
                    Places to visit ({day.places.length})
                  </p>
                  <div className='space-y-2'>
                    {day.places.map((place, index) => (
                      <div key={place.id} className='flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg'>
                        <div className='flex items-start gap-2'>
                          <span className='text-sm font-semibold text-green-700'>
                            {index + 1}.
                          </span>
                          <div>
                            <p className='font-medium text-green-900 text-sm'>{place.name}</p>
                            <p className='text-xs text-green-700 mt-0.5'>{place.type}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removePlaceFromDay(day.id, place.id)}
                          className='text-red-600 hover:text-red-800'
                        >
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {day.places.length === 0 && !daySearchQueries[day.id] && (
                <div className='text-center py-6 text-gray-500 text-sm'>
                  Search and add places to visit on this day
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DayManager
