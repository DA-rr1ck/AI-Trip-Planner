import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, parse } from 'date-fns';

// Function to get image from Pixabay
async function getPlaceImage(placeName) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(placeName)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

// Component for each activity card
function ActivityCard({ activity, location }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (activity.PlaceName) {
      getPlaceImage(activity.PlaceName).then(setImageUrl);
    }
  }, [activity.PlaceName]);

  return (
    <Link 
      to={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(activity.PlaceName + " " + location)} 
      target='_blank'
    >
      <div className='border rounded-xl p-3 mt-2 flex gap-5 hover:scale-105 transition-all hover:shadow-md cursor-pointer'>
        <img 
          src={imageUrl} 
          alt={activity.PlaceName} 
          className='w-[130px] h-[130px] rounded-xl object-cover'
        />
        <div>
          <h2 className='font-bold text-lg'>{activity.PlaceName}</h2>
          <p className='text-sm text-gray-400 mt-1'>{activity.PlaceDetails}</p>
          <h2 className='mt-2'>🎟️ {activity.TicketPricing}</h2>
          <h2 className='mt-2'>⏱️ {activity.TimeTravel}</h2>
        </div>
      </div>
    </Link>
  );
}

function PlacesToVisit({ trip }) {
  // Handle both date-based and Day-based structures
  const itinerary = trip?.tripData?.Itinerary;
  const location = trip?.tripData?.Location || trip?.userSelection?.location;

  if (!itinerary) return <div>No itinerary found.</div>;

  // Sort by date (for date-based structure like '2024-08-24')
  const sortedDays = Object.entries(itinerary).sort((a, b) => {
    // Try to parse as date first
    const dateA = new Date(a[0]);
    const dateB = new Date(b[0]);
    
    // If both are valid dates, sort by date
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB;
    }
    
    // Otherwise, sort by day number (Day1, Day2, etc.)
    const dayNumA = parseInt(a[0].replace('Day', ''));
    const dayNumB = parseInt(b[0].replace('Day', ''));
    return dayNumA - dayNumB;
  });

  return (
    <div>
      <h2 className='font-bold text-xl mt-5'>Places to Visit</h2>
      <div>
        {sortedDays.map(([dayKey, dayPlan]) => {
          // Check if dayKey is a date (YYYY-MM-DD format) or Day1, Day2, etc.
          const isDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(dayKey);
          
          let displayTitle;
          if (isDateFormat) {
            // Format as "Friday, August 24, 2024"
            displayTitle = format(parse(dayKey, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy');
          } else {
            // Format as "Day 1", "Day 2", etc.
            displayTitle = dayKey.replace('Day', 'Day ');
          }

          return (
            <div key={dayKey} className="mt-5">
              <h2 className='font-bold text-lg'>{displayTitle}</h2>
              {dayPlan.Theme && (
                <p className='text-sm text-gray-600 mb-2'>
                  {dayPlan.Theme} • Best time: {dayPlan.BestTimeToVisit}
                </p>
              )}
              <div className='grid md:grid-cols-2 gap-5'>
                {dayPlan.Activities?.map((activity, idx) => (
                  <ActivityCard 
                    key={idx} 
                    activity={activity} 
                    location={location}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlacesToVisit;