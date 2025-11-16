import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Trash2, Pencil } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from '@/service/firebaseConfig';
import { createApi } from 'unsplash-js';
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { format, parse, differenceInDays } from 'date-fns'

const unsplash = createApi({
  accessKey: import.meta.env.VITE_UNSPLASH_ACCESS_KEY,
});

async function getPlaceImage(placeName) {
  try {
    const result = await unsplash.search.getPhotos({ query: placeName, page: 1, perPage: 1 });
    if (result?.response?.results?.length) {
      return result.response.results[0]?.urls?.regular || '/placeholder.jpg';
    }
    return '/placeholder.jpg';
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

function TripCard({ trip, onDelete }) {
  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');
  const navigate = useNavigate();

  useEffect(() => {
    if (trip.userSelection?.location) {
      getPlaceImage(trip.userSelection.location).then(setImageUrl);
    }
  }, [trip.userSelection?.location]);

  // Calculate days from date range
  const getTripDays = () => {
    // First check for the new date-based format
    if (trip.userSelection?.startDate && trip.userSelection?.endDate) {
      const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date());
      const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date());
      return differenceInDays(end, start) + 1;
    }
    // Fallback to old format (if exists)
    return trip.userSelection?.noOfdays || 0;
  };

  // Format date range for display
  const getDateRange = () => {
    if (trip.userSelection?.startDate && trip.userSelection?.endDate) {
      const start = parse(trip.userSelection.startDate, 'yyyy-MM-dd', new Date());
      const end = parse(trip.userSelection.endDate, 'yyyy-MM-dd', new Date());
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return null;
  };

  const days = getTripDays();
  const dateRange = getDateRange();

  return (
    <div
      onClick={() => navigate(`/view-trip/${trip.id}`)}
      className='relative border rounded-xl overflow-hidden hover:scale-105 transition-all cursor-pointer hover:shadow-lg'
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className='absolute top-2 right-2 z-10 rounded-full p-2 bg-white/80 hover:bg-white shadow border'
            aria-label='Trip actions'
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className='h-4 w-4' />
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-44 p-2' align='end' sideOffset={6} onClick={(e) => e.stopPropagation()}>
          <div className='flex flex-col gap-1'>
            <button
              type='button'
              className='flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-gray-100 text-left'
              onClick={() =>
                navigate('/edit-trip', {
                  state: {
                    tripData: trip
                  },
                })
              }
            >
              <Pencil className='h-4 w-4' />
              View / Edit Trip
            </button>
            <button
              type='button'
              className='flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-red-50 text-left text-red-600'
              onClick={() => onDelete?.(trip.id)}
            >
              <Trash2 className='h-4 w-4' />
              Delete Trip
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <img src={imageUrl} alt={trip.userSelection?.location} className='h-[220px] w-full object-cover' />

      <div className='p-3'>
        <h3 className='font-bold text-lg'>{trip.userSelection?.location}</h3>
        
        {/* Date range (if available) */}
        {dateRange && (
          <p className='text-sm text-gray-600 mt-1'>📅 {dateRange}</p>
        )}
        
        <div className='flex gap-2 mt-2'>
          {/* Number of days */}
          {days > 0 && (
            <p className='text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full'>
              🗓️ {days} {days === 1 ? 'Day' : 'Days'}
            </p>
          )}
          
          {/* Budget */}
          {trip.userSelection?.budget && (
            <p className='text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded-full'>
              💰 {trip.userSelection.budget}
            </p>
          )}
        </div>
        
        {/* Traveler type */}
        {trip.userSelection?.traveler && (
          <p className='text-sm text-gray-500 mt-2'>🥂 {trip.userSelection.traveler}</p>
        )}
      </div>
    </div>
  );
}

function MyTrips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      navigate('/');
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'AITrips'), where('userEmail', '==', user.email));
        const querySnapshot = await getDocs(q);
        const trips = [];
        querySnapshot.forEach((d) => trips.push({ id: d.id, ...d.data() }));
        
        // Sort trips by creation date (newest first)
        trips.sort((a, b) => {
          const dateA = a.userSelection?.startDate ? new Date(a.userSelection.startDate) : new Date(0);
          const dateB = b.userSelection?.startDate ? new Date(b.userSelection.startDate) : new Date(0);
          return dateB - dateA;
        });
        
        setUserTrips(trips);
      } catch (error) {
        console.error('Error fetching trips:', error);
        toast.error('Failed to load your trips');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Delete this trip permanently? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'AITrips', tripId));
      setUserTrips((prev) => prev.filter((t) => t.id !== tripId));
      toast.success('Trip deleted successfully');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip, please try again.');
    }
  }

  if (loading) {
    return (
      <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
        <h2 className='font-bold text-3xl'>My Trips</h2>
        <div className='mt-10 flex justify-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 px-5 mt-10'>
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
            <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyTrips