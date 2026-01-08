import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api'

const imageCache = new Map();


function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

async function testImageUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    setTimeout(() => resolve(false), 5000);
  });
}

async function getHotelImage(hotelName, hotelAddress) {
  const cacheKey = `${hotelName}_${hotelAddress}`;
  
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  try {
    const query = `${hotelName} ${hotelAddress}`;
    const { data } = await api.get('/serp/images/search', {
      params: { q: query },
    });

    if (data.images && data.images.length > 0) {
      for (const image of data.images.slice(0, 10)) {
        const imageUrl = image.original || image.thumbnail;
        
        if (!imageUrl || !isValidImageUrl(imageUrl)) continue;

        try {
          const urlObj = new URL(imageUrl);
          const problematicDomains = ['bstatic.com', 'expedia.com', 'hotels.com'];
          
          if (problematicDomains.some(domain => urlObj.hostname.includes(domain))) continue;
          if (window.location.protocol === 'https:' && urlObj.protocol === 'http:') continue;
        } catch {
          continue;
        }

        const canLoad = await testImageUrl(imageUrl);
        if (canLoad) {
          imageCache.set(cacheKey, imageUrl);
          return imageUrl;
        }
      }
    }

    imageCache.set(cacheKey, '/placeholder.jpg');
    return '/placeholder.jpg';
    
  } catch (error) {
    console.error('Error fetching hotel image:', error);
    return '/placeholder.jpg';
  }
}

// Component for each hotel card
function HotelCard({ hotel, userSelection, tripId }) {
  const navigate = useNavigate();
  const returnTo = `/view-trip/${tripId}`;
  
  // Check if hotel already has a saved image URL
  const savedImageUrl = hotel.HotelImageUrl && hotel.HotelImageUrl !== '/placeholder.jpg' 
    ? hotel.HotelImageUrl 
    : null;
  
  const [imageUrl, setImageUrl] = useState(savedImageUrl || '/placeholder.jpg');
  const [imageLoading, setImageLoading] = useState(!savedImageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (hotel.HotelName) {
      setImageLoading(true);
      getHotelImage(hotel.HotelName, hotel.HotelAddress)
        .then(url => {
          setImageUrl(url);
          setImageLoading(false);
        })
        .catch(() => {
          setImageLoading(false);
        });
    }
  }, [hotel.HotelName, hotel.HotelAddress]);

  const handleClick = () => {
    const slug = encodeURIComponent(hotel.HotelName || 'hotel');
    
    // For manually added hotels, navigate to manual hotel detail page
    if (hotel.isManuallyAdded) {
      const lat = hotel.GeoCoordinates?.Latitude || hotel.lat;
      const lon = hotel.GeoCoordinates?.Longitude || hotel.lon;
      
      navigate(`/manual/hotel/${slug}`, {
        state: {
          hotel: {
            id: hotel.id,
            name: hotel.HotelName,
            address: hotel.HotelAddress,
            HotelName: hotel.HotelName,
            HotelAddress: hotel.HotelAddress,
            lat: Number.isFinite(Number(lat)) ? Number(lat) : lat,
            lon: Number.isFinite(Number(lon)) ? Number(lon) : lon,
            imageUrl: hotel.HotelImageUrl || imageUrl,
            city: hotel.city,
            country: hotel.country
          },
          tripContext: { userSelection },
          returnTo,
        },
      });
    } else {
      // For AI-generated hotels, use the regular hotel detail page
      navigate(`/hotel/${slug}`, {
        state: {
          hotel: {
            ...hotel,
            HotelImageUrl: hotel.HotelImageUrl || imageUrl
          },
          tripContext: { userSelection },
          returnTo,
        },
      });
    }
  };

  return (
    <div 
      onClick={handleClick}
      className='hover:scale-105 transition-all cursor-pointer'
    > 
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
        
        {/* Manually added badge */}
        {hotel.isManuallyAdded && (
          <div className='absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full'>
            Custom
          </div>
        )}
      </div>
      
      <div className='my-2 flex flex-col gap-2'> 
        <h2 className='font-medium'>{hotel.HotelName}</h2>
        <h2 className='text-xs text-gray-500'>📍 {hotel.HotelAddress}</h2>
        <h2 className='text-sm'>💰 {hotel.Price}</h2>
        <h2 className='text-sm'>⭐ {hotel.Rating}</h2>
      </div>
    </div>
  );
}

function Hotels({ trip, tripId }) {
  // FIXED: Handle both old and new data structure
  const hotels = trip?.tripData?.Hotels || trip?.tripData?.[0]?.TravelPlan?.Hotels || [];
  const userSelection = trip?.userSelection;
  
  console.log('Hotels data:', hotels);

  return (
    <div className='mb-10 mt-12'>
      <div className='mb-6'>
        <h2 className='font-bold text-3xl text-gray-900 mb-2'>Hotel Recommendations</h2>
        <div className='h-1 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full'></div>
      </div>

      
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
        {hotels.length === 0 ? (
          <div className='col-span-full text-center py-12 bg-gray-50 rounded-2xl'>
            <svg className='h-16 w-16 mx-auto mb-3 text-gray-300' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
            </svg>
            <p className='text-gray-500 font-medium'>No hotel recommendations available</p>
          </div>
        ) : (
          hotels.map((hotel, index) => (
            <HotelCard key={index} hotel={hotel} userSelection={userSelection} tripId={tripId} />
          ))
        )}
      </div>
    </div>
  );
}

export default Hotels;