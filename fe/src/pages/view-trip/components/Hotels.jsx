import React, { useState, useEffect } from 'react';
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


function HotelCard({ hotel }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');
  const [imageLoading, setImageLoading] = useState(true);

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

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(hotel.HotelName + "," + hotel.HotelAddress)} 
      target='_blank'
    >
      
      <div className='relative border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all'>
       
        <div className='cursor-pointer'>
          {imageLoading && (
            <div className='w-full h-[160px] flex items-center justify-center bg-gray-100'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
            </div>
          )}
          
          {!imageLoading && (
            <img
              src={imageUrl}
              alt={hotel.HotelName}
              className='w-full h-[160px] object-cover'
              onError={(e) => {
                e.target.src = '/placeholder.jpg';
              }}
            />
          )}
        </div>

      
        <div className='p-4 cursor-pointer'>
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
    </Link>
  );
}

function Hotels({ trip }) {
  const hotels = trip?.tripData?.Hotels || trip?.tripData?.[0]?.TravelPlan?.Hotels || [];

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
            <HotelCard key={index} hotel={hotel} />
          ))
        )}
      </div>
    </div>
  );
}

export default Hotels;