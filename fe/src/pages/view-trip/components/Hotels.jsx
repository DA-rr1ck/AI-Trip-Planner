import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Function to get image from Pixabay
async function getHotelImage(hotelName) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(hotelName)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

// Component for each hotel card
function HotelCard({ hotel }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (hotel.HotelName) {
      getHotelImage(hotel.HotelName + hotel.HotelAddress).then(setImageUrl);
    }
  }, [hotel.HotelName]);

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + hotel.HotelName + "," + hotel.HotelAddress} 
      target='_blank'
    >
      <div className='hover:scale-105 transition-all cursor-pointer'> 
        <img 
          src={imageUrl} 
          alt={hotel.HotelName}
          className='rounded-xl h-[180px] w-full object-cover'
        />
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
      <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'>
        {hotels.map((hotel, index) => (
          <HotelCard key={index} hotel={hotel} />
        ))}
      </div>
    </div>
  );
}

export default Hotels;