import React, { useEffect, useState } from 'react'
import { format, parse, differenceInDays } from 'date-fns'

// Function to get location image from Unsplash
async function getLocationImage(locationName) {
  const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(locationName)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`
    );
    const data = await response.json();
    return data.results[0]?.urls?.regular || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  } catch (error) {
    console.error('Error fetching location image:', error);
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  }
}

function InfoSection({ trip }) {
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800');

  useEffect(() => {
    const location = trip?.tripData?.Location || trip?.userSelection?.location;
    if (location) {
      getLocationImage(location).then(setImageUrl);
    }
  }, [trip]);

  // Calculate total days
  const getTotalDays = () => {
    if (!trip?.userSelection?.startDate || !trip?.userSelection?.endDate) return 0;
    const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date());
    const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date());
    return differenceInDays(end, start) + 1;
  };

  const location = trip?.tripData?.Location || trip?.userSelection?.location;
  const startDate = trip?.userSelection?.startDate;
  const endDate = trip?.userSelection?.endDate;
  const budget = trip?.userSelection?.budget || trip?.tripData?.Budget;
  const traveler = trip?.userSelection?.traveler || trip?.tripData?.Traveler;

  return (
    <div>
      {/* Hero Image */}
      <img 
        src={imageUrl} 
        alt={location}
        className='h-[340px] w-full object-cover rounded-xl mb-6'
      />

      {/* Trip Details Card */}
      <div className='bg-white p-6 rounded-xl shadow-md border'>
        <h2 className='font-bold text-3xl mb-4'>{location}</h2>
        
        <div className='flex flex-wrap gap-6 text-gray-700'>
          {/* Dates */}
          {startDate && endDate && (
            <div className='flex items-center gap-2'>
              <span className='text-2xl'>📅</span>
              <div>
                <p className='text-xs text-gray-500'>Travel Dates</p>
                <p className='font-medium'>
                  {format(parse(startDate, 'yyyy-MM-dd', new Date()), 'MMM d')} - {format(parse(endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}

          {/* Duration */}
          <div className='flex items-center gap-2'>
            <span className='text-2xl'>🗓️</span>
            <div>
              <p className='text-xs text-gray-500'>Duration</p>
              <p className='font-medium'>{getTotalDays()} {getTotalDays() === 1 ? 'Day' : 'Days'}</p>
            </div>
          </div>

          {/* Budget */}
          {budget && (
            <div className='flex items-center gap-2'>
              <span className='text-2xl'>💰</span>
              <div>
                <p className='text-xs text-gray-500'>Budget</p>
                <p className='font-medium'>{budget}</p>
              </div>
            </div>
          )}

          {/* Traveler */}
          {traveler && (
            <div className='flex items-center gap-2'>
              <span className='text-2xl'>👤</span>
              <div>
                <p className='text-xs text-gray-500'>Traveling with</p>
                <p className='font-medium'>{traveler}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InfoSection