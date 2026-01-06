import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Simple in-memory cache
const imageCache = new Map();

// Function to get image from your backend SerpAPI
async function getHotelImage(hotelName, hotelAddress) {
  const cacheKey = `${hotelName}_${hotelAddress}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  try {
    const query = `${hotelName} ${hotelAddress}`;
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail || '/placeholder.jpg';
    
    // Cache the result
    imageCache.set(cacheKey, imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('Error fetching hotel image:', error);
    return '/placeholder.jpg';
  }
}

// Component for each hotel card
function HotelCard({ hotel }) {
  // Check if hotel already has a saved image URL
  const savedImageUrl = hotel.HotelImageUrl && hotel.HotelImageUrl !== '/placeholder.jpg' 
    ? hotel.HotelImageUrl 
    : null;
  
  const [imageUrl, setImageUrl] = useState(savedImageUrl || '/placeholder.jpg');
  const [imageLoading, setImageLoading] = useState(!savedImageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Only fetch if there's no saved image URL
    if (!savedImageUrl && hotel.HotelName) {
      setImageLoading(true);
      setImageError(false);
      
      getHotelImage(hotel.HotelName, hotel.HotelAddress)
        .then(url => {
          setImageUrl(url);
          setImageLoading(false);
        })
        .catch(err => {
          console.error('Failed to load hotel image:', err);
          setImageError(true);
          setImageLoading(false);
        });
    }
  }, [hotel.HotelName, hotel.HotelAddress, savedImageUrl]);

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hotel.HotelName + "," + hotel.HotelAddress)} 
      target='_blank'
    >
      <div className='hover:scale-105 transition-all cursor-pointer'> 
        <div className='rounded-xl h-[180px] w-full overflow-hidden bg-gray-200 relative'>
          {imageLoading && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400'></div>
            </div>
          )}
          
          {!imageLoading && imageError && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
              </svg>
            </div>
          )}

          {!imageLoading && !imageError && (
            <img 
              src={imageUrl} 
              alt={hotel.HotelName}
              className='w-full h-full object-cover'
              onError={() => setImageError(true)}
            />
          )}
        </div>
        
        <div className='my-2 flex flex-col gap-2'> 
          <h2 className='font-medium'>{hotel.HotelName}</h2>
          <h2 className='text-xs text-gray-500'>📍 {hotel.HotelAddress}</h2>
          <h2 className='text-sm'>💰 {hotel.Price}</h2>
          <h2 className='text-sm'>⭐ {hotel.Rating}</h2>
        </div>
      </div>
    </Link>
  );
}

function Hotels({ trip }) {
  // FIXED: Handle both old and new data structure
  const hotels = trip?.tripData?.Hotels || trip?.tripData?.[0]?.TravelPlan?.Hotels || [];
  
  console.log('Hotels data:', hotels);

  return (
    <div>
      <h2 className='font-bold text-xl mt-5'>Hotel Recommendations</h2>
      <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 mt-4'>
        {hotels.length === 0 ? (
          <div className='col-span-full text-center py-8 text-gray-500'>
            No hotel recommendations available
          </div>
        ) : (
          hotels.map((hotel, index) => (
            <HotelCard key={index} hotel={hotel} />
          ))
        )}
      </div>
    </div>
  );
}

export default Hotels;