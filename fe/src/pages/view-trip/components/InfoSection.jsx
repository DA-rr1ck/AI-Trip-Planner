import React, { useEffect, useState } from 'react'
import { format, parse, differenceInDays } from 'date-fns'

// Function to get location image from your backend SerpAPI
async function getLocationImage(locationName) {
  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(locationName + ' landmark tourist destination')}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the first image's original URL, or fallback to thumbnail, or default fallback
    return data.images?.[0]?.original || 
           data.images?.[0]?.thumbnail || 
           'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  } catch (error) {
    console.error('Error fetching location image:', error);
    return 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  }
}

function InfoSection({ trip }) {
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800');
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    const location = trip?.tripData?.Location || trip?.userSelection?.location;
    if (location) {
      setImageLoading(true);
      getLocationImage(location)
        .then(url => {
          setImageUrl(url);
          setImageLoading(false);
        })
        .catch(err => {
          console.error('Failed to load location image:', err);
          setImageLoading(false);
        });
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
      {/* Hero Image with Loading State */}
      <div className='h-[340px] w-full rounded-xl mb-6 overflow-hidden relative'>
        {imageLoading && (
          <div className='absolute inset-0 bg-gray-200 flex items-center justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400'></div>
          </div>
        )}
        <img 
          src={imageUrl} 
          alt={location}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setImageLoading(false)}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
            setImageLoading(false);
          }}
        />
      </div>

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