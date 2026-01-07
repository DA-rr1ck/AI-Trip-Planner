import React from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'
import HotelCard from './HotelCard'
import HotelSearchBox from './HotelSearchBox'

function HotelsSection({ 
  hotels, 
  selectedHotels,
  onToggleHotelSelection,
  hotelPreference,
  setHotelPreference,
  regeneratingHotels,
  onRegenerateHotels,
  onHotelClick,
  onHotelAdd,
  location
}) {
  const selectedCount = selectedHotels?.length || 0
  const totalCount = hotels?.length || 0

  return (
    <div className='mb-8'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='font-bold text-2xl'>Recommended Hotels</h2>
        {totalCount > 0 && (
          <div className='flex items-center gap-2 text-sm'>
            <CheckCircle className={`h-4 w-4 ${selectedCount > 0 ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={selectedCount > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {selectedCount > 0 ? '✓ Hotel selected' : 'No hotel selected'}
            </span>
          </div>
        )}
      </div>

      {selectedCount === 0 && totalCount > 0 && (
        <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <p className='text-sm text-yellow-800'>
            ⚠️ Please select one hotel before saving your trip
          </p>
        </div>
      )}

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
            onKeyDown={(e) => e.key === 'Enter' && onRegenerateHotels()}
          />
          <Button
            onClick={onRegenerateHotels}
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

      {totalCount > 0 && (
        <p className='text-sm text-gray-600 mb-3'>
          💡 Click on a hotel to select it. You can only select one hotel for your trip.
        </p>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {hotels?.map((hotel, index) => (
          <HotelCard
            key={index}
            hotel={hotel}
            onClick={() => onHotelClick(hotel)}
            isSelected={selectedHotels?.some(h => h.HotelName === hotel.HotelName)}
            onToggleSelect={() => onToggleHotelSelection(hotel)}
          />
        ))}
      </div>

      {/* Manual Hotel Search Box */}
      {location && onHotelAdd && (
        <HotelSearchBox
          location={location}
          onHotelAdd={onHotelAdd}
          existingHotels={hotels || []}
        />
      )}
    </div>
  )
}

export default HotelsSection



/*
import React from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'
import HotelCard from './HotelCard'

function HotelsSection({ 
  hotels, 
  selectedHotels,
  onToggleHotelSelection,
  hotelPreference,
  setHotelPreference,
  regeneratingHotels,
  onRegenerateHotels,
  onHotelClick
}) {
  const selectedCount = selectedHotels?.length || 0
  const totalCount = hotels?.length || 0

  return (
    <div className='mb-8'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='font-bold text-2xl'>Recommended Hotels</h2>
        {totalCount > 0 && (
          <div className='flex items-center gap-2 text-sm'>
            <CheckCircle className={`h-4 w-4 ${selectedCount > 0 ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={selectedCount > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
              {selectedCount} of {totalCount} selected
            </span>
          </div>
        )}
      </div>

      {selectedCount === 0 && totalCount > 0 && (
        <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
          <p className='text-sm text-yellow-800'>
            ⚠️ Please select at least one hotel before saving your trip
          </p>
        </div>
      )}

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
            onKeyDown={(e) => e.key === 'Enter' && onRegenerateHotels()}
          />
          <Button
            onClick={onRegenerateHotels}
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

      {totalCount > 0 && (
        <p className='text-sm text-gray-600 mb-3'>
          💡 Click the checkmark to select/deselect hotels you want to include in your trip
        </p>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {hotels?.map((hotel, index) => (
          <HotelCard
            key={index}
            hotel={hotel}
            onClick={() => onHotelClick(hotel)}
            isSelected={selectedHotels?.some(h => h.HotelName === hotel.HotelName)}
            onToggleSelect={() => onToggleHotelSelection(hotel)}
          />
        ))}
      </div>
    </div>
  )
}

export default HotelsSection

*/