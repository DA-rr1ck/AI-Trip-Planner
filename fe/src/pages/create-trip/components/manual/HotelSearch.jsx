import React, { useState, useEffect } from 'react'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

function HotelSearch({ 
  location, 
  onHotelConfirm, 
  confirmedHotel, 
  onRemoveHotel 
}) {
  const [hotelSearchQuery, setHotelSearchQuery] = useState('')
  const [hotelResults, setHotelResults] = useState([])
  const [searchingHotels, setSearchingHotels] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState(null)

  // Debounced hotel search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (hotelSearchQuery && hotelSearchQuery.length >= 2) {
        searchHotels(hotelSearchQuery)
      } else {
        setHotelResults([])
      }
    }, 600)

    return () => clearTimeout(debounceTimer)
  }, [hotelSearchQuery, location])

  const searchHotels = async (query) => {
    if (!query || query.length < 2) {
      setHotelResults([])
      return
    }

    setSearchingHotels(true)
    try {
      const searchQuery = query.toLowerCase().includes('hotel') 
        ? `${query} ${location}` 
        : `${query} hotel ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=30&addressdetails=1`
      )
      const data = await response.json()
      
      const hotels = data
        .filter(item => {
          const displayName = item.display_name.toLowerCase()
          const itemType = (item.type || '').toLowerCase()
          const itemClass = (item.class || '').toLowerCase()
          
          const isHotel = itemType === 'hotel' || 
                         itemType === 'motel' || 
                         itemType === 'guest_house' ||
                         itemType === 'hostel' ||
                         itemType === 'apartment' ||
                         itemClass === 'tourism' ||
                         displayName.includes('hotel') ||
                         displayName.includes('resort') ||
                         displayName.includes('inn')
          
          const isInLocation = displayName.includes(location.toLowerCase().split(',')[0])
          
          return isHotel && isInLocation
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: item.lat,
          lon: item.lon,
          type: item.type || 'hotel',
          city: item.address?.city || item.address?.town || '',
          country: item.address?.country || ''
        }))
        .filter((hotel, index, self) => 
          index === self.findIndex(h => h.name.toLowerCase() === hotel.name.toLowerCase())
        )
        .slice(0, 15)
      
      setHotelResults(hotels)
    } catch (error) {
      console.error('Error searching hotels:', error)
      setHotelResults([])
    } finally {
      setSearchingHotels(false)
    }
  }

  const handleHotelSelect = (hotel) => {
    setSelectedHotel(hotel)
  }

  const handleConfirmHotel = () => {
    if (selectedHotel) {
      onHotelConfirm(selectedHotel)
      toast.success(`Hotel "${selectedHotel.name}" added to your trip!`)
      setHotelResults([])
      setHotelSearchQuery('')
    }
  }

  if (confirmedHotel) {
    return (
      <div className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
        <div className='p-4 bg-blue-50 border-2 border-blue-300 rounded-lg'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-sm font-semibold text-blue-900 mb-1'>
                ✓ Selected
              </p>
              <p className='font-medium text-blue-800'>{confirmedHotel.name}</p>
              <p className='text-xs text-blue-600 mt-1'>{confirmedHotel.address}</p>
            </div>
            <button
              onClick={onRemoveHotel}
              className='text-blue-600 hover:text-blue-800'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
      <div className='flex items-start gap-4 mb-6'>
        <div className='bg-blue-100 p-3 rounded-lg'>
          <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
          </svg>
        </div>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Find Hotels in {location}
          </h3>
          <p className='text-gray-600 mb-4'>
            Search and select hotels for your stay
          </p>
          
          {/* Search Input */}
          <div className='relative mb-4'>
            <input
              type='text'
              placeholder='Search for hotels...'
              value={hotelSearchQuery}
              onChange={(e) => setHotelSearchQuery(e.target.value)}
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

          {/* External Search Button */}
          <Button 
            variant='outline' 
            size='sm'
            className='flex items-center gap-2 mb-4'
            onClick={() => {
              window.open(`https://www.google.com/maps/search/hotels+in+${encodeURIComponent(location)}`, '_blank')
            }}
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
            </svg>
            Search on Google Maps
          </Button>

          {/* Loading State */}
          {searchingHotels && (
            <div className='flex items-center justify-center py-8'>
              <AiOutlineLoading3Quarters className='h-6 w-6 animate-spin text-blue-600' />
              <span className='ml-2 text-gray-600'>Searching hotels...</span>
            </div>
          )}

          {/* Hotel Results */}
          {!searchingHotels && hotelResults.length > 0 && (
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              <p className='text-sm text-gray-600 mb-3'>
                Found {hotelResults.length} hotel{hotelResults.length > 1 ? 's' : ''} • Click to select one
              </p>
              {hotelResults.map((hotel) => {
                const isSelected = selectedHotel && selectedHotel.id === hotel.id
                return (
                  <div
                    key={hotel.id}
                    onClick={() => handleHotelSelect(hotel)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-semibold text-gray-900'>{hotel.name}</p>
                        <p className='text-sm text-gray-500'>{hotel.address}</p>
                        {hotel.city && (
                          <p className='text-sm text-gray-400'>{hotel.city}, {hotel.country}</p>
                        )}
                      </div>
                      {isSelected && (
                        <svg className='w-5 h-5 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* No Results State */}
          {!searchingHotels && hotelResults.length === 0 && hotelSearchQuery.length >= 2 && (
            <div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
              <p className='text-sm text-gray-600'>
                No hotels found. Try adjusting your search, or search on Google Maps for more options.
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <div className='mt-4 flex justify-end'>
            <Button
              onClick={handleConfirmHotel}
              disabled={!selectedHotel}
            >
              Confirm Hotel
            </Button>
          </div>
        </div>
      </div>

      {/* Highlighted Tips */}
      <div className='grid sm:grid-cols-2 gap-4 mt-6'>
        <div className='p-4 bg-blue-50 rounded-lg'>
          <h4 className='text-sm font-semibold text-blue-900'>Pro Tip</h4>
          <p className='text-sm text-blue-800 mt-1'>
            Use specific terms like "luxury hotel" or "budget inn" to find options that match your preferences faster.
          </p>
        </div>
        <div className='p-4 bg-green-50 rounded-lg'>
          <h4 className='text-sm font-semibold text-green-900'>Save Time</h4>
          <p className='text-sm text-green-800 mt-1'>
            Once you confirm a hotel, we lock it into your itinerary so you can plan your days with confidence.
          </p>
        </div>
      </div>
    </div>
  )
}

export default HotelSearch
