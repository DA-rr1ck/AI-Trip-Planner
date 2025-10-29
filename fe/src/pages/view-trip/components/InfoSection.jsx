import React, { useState, useEffect } from 'react';
import { createApi } from 'unsplash-js';

const unsplash = createApi({
  accessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
});

// Function to get image
async function getPlaceImage(placeName) {
  try {
    const result = await unsplash.search.getPhotos({
      query: placeName,
      page: 1,
      perPage: 1,
    });
    
    // Check if response exists and has results
    if (result?.response?.results && result.response.results.length > 0) {
      return result.response.results[0]?.urls?.regular || '/placeholder.jpg';
    }
    
    return '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

function InfoSection({ trip }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (trip?.userSelection?.location) {
      getPlaceImage(trip.userSelection.location).then(setImageUrl);
    }
  }, [trip]);

  return (
    <div>
      <img src={imageUrl} className='h-[300px] w-full object-cover rounded-xl' />
      <div className='flex items-center'>
        <div className='my-5 flex flex-col gap-2'>
          <h2 className='font-bold text-2xl'>
            {trip?.userSelection?.location}
          </h2>
          <div className='flex gap-5'>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-xs md:text-md'>
              📅 {trip?.userSelection?.noOfdays} Days
            </h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-xs md:text-md'>
              💵 {trip?.userSelection?.budget} Budget
            </h2>
            <h2 className='p-1 px-3 bg-gray-200 rounded-full text-gray-500 text-xs md:text-md'>
              🥂  Travelers: {trip?.userSelection?.traveler}
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfoSection;
