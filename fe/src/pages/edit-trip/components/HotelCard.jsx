import React, { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { getHotelImage } from '../utils/imageUtils'

function HotelCard({ hotel, onClick, isSelected, onToggleSelect }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (hotel.HotelName) {
      getHotelImage(hotel.HotelName, hotel.HotelAddress).then(setImageUrl);
    }
  }, [hotel.HotelName, hotel.HotelAddress]);

  return (
    <div 
      className={`relative border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
    >
      {/* Selection Checkbox */}
      <div className='absolute top-3 right-3 z-10'>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-gray-300 hover:border-blue-400'
          }`}
        >
          {isSelected && <Check className='h-4 w-4 text-white' />}
        </button>
      </div>

      {/* Hotel Image - No overlay */}
      <div 
        className='cursor-pointer'
        onClick={onClick}
        role="button"
      >
        <img
          src={imageUrl}
          alt={hotel.HotelName}
          className='w-full h-[160px] object-cover'
        />
      </div>

      {/* Hotel Details with blue background when selected */}
      <div 
        className={`p-4 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={onClick}
        role="button"
      >
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

export default HotelCard