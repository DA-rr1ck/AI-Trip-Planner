import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../service/firebaseConfig';
import { createApi } from 'unsplash-js';

const unsplash = createApi({
  accessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
});

// Function to get image from Unsplash
async function getPlaceImage(placeName) {
  try {
    const result = await unsplash.search.getPhotos({
      query: placeName,
      page: 1,
      perPage: 1,
    });
    
    if (result?.response?.results && result.response.results.length > 0) {
      return result.response.results[0]?.urls?.regular || '/placeholder.jpg';
    }
    
    return '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

// Component for each trip card
function TripCard({ trip }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');
  const navigate = useNavigate();

  useEffect(() => {
    if (trip.userSelection?.location) {
      getPlaceImage(trip.userSelection.location).then(setImageUrl);
    }
  }, [trip.userSelection?.location]);

  return (
    <div 
      onClick={() => navigate(`/view-trip/${trip.id}`)}
      className='border rounded-xl overflow-hidden hover:scale-105 transition-all cursor-pointer hover:shadow-lg'
    >
      <img 
        src={imageUrl} 
        alt={trip.userSelection?.location}
        className='h-[220px] w-full object-cover'
      />
      <div className='p-3'>
        <h3 className='font-bold text-lg'>{trip.userSelection?.location}</h3>
        <div className='flex gap-2 mt-2'>
          <p className='text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full'>
            📅 {trip.userSelection?.noOfdays} Days
          </p>
          <p className='text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full'>
            💰 {trip.userSelection?.budget}
          </p>
        </div>
        <p className='text-sm text-gray-500 mt-2'>
          🥂 {trip.userSelection?.traveler}
        </p>
      </div>
    </div>
  );
}

function MyTrips() {
  const navigate = useNavigate();
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GetUserTrips();
  }, [])

  const GetUserTrips = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const q = query(collection(db, 'AITrips'), where('userEmail', '==', user?.email));
      const querySnapshot = await getDocs(q);
      const trips = [];
      
      querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        trips.push({ id: doc.id, ...doc.data() });
      });
      
      setUserTrips(trips);
      console.log('Fetched trips:', trips);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
        <h2 className='font-bold text-3xl'>My Trips</h2>
        <p className='mt-5'>Loading your trips...</p>
      </div>
    );
  }

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
      <h2 className='font-bold text-3xl'>My Trips</h2>
      
      {userTrips.length === 0 ? (
        <div className='mt-10 text-center'>
          <p className='text-gray-500 text-lg'>No trips found. Create your first trip!</p>
          <button 
            onClick={() => navigate('/create-trip')}
            className='mt-5 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800'
          >
            Create New Trip
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10'>
          {userTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyTrips