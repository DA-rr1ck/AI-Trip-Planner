import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/service/firebaseConfig';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Loader2, Edit } from 'lucide-react';
import Button from '@/components/ui/Button';
import InfoSection from '../components/InfoSection';
import Hotels from '../components/Hotels';
import PlacesToVisit from '../components/PlacesToVisit';

function ViewTrip() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState({});
    const [loading, setLoading] = useState(true)

    const GetTripData = async () => {
        try {
            const docRef = doc(db, 'AITrips', tripId)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                setTrip({ id: docSnap.id, ...docSnap.data() })
            } else {
                toast.error('Trip not found')
            }
        } catch (e) {
            console.error(e)
            toast.error('Failed to load trip')
        } finally {
            setLoading(false)
        }
    }

    const handleEditTrip = () => {
        // navigate('/edit-trip', {
        //     state: {
        //         tripData: trip
        //     }
        // })
    }

    useEffect(() => {
        tripId && GetTripData();
    }, [tripId])

    if (loading) {
        return (
            <div className='p-10 md:px-20 lg:px-44 xl:px-56 flex flex-col justify-center items-center min-h-[50vh]'>
                <Loader2 className='h-8 w-8 animate-spin mb-4 text-purple-600' />
                <p className='text-gray-500'>Loading trip...</p>
            </div>
        )
    }

    if (!trip?.tripData) {
        return (
            <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
                <p className='text-center text-gray-500'>Trip not found</p>
            </div>
        )
    }

    return (
        <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
            {/* Header with Edit Button */}
            <div className='flex justify-between items-center mb-6'>
                <h1 className='font-bold text-3xl'>Your Trip Details</h1>
                <Button onClick={handleEditTrip}>
                    <Edit className='mr-2 h-4 w-4' />
                    Edit Trip
                </Button>
            </div>

            {/* Information */}
            <InfoSection trip={trip} />
            
            {/* Recommend hotels */}
            <Hotels trip={trip} />
            
            {/* Daily plan */}
            <PlacesToVisit trip={trip} />
        </div>
    )
}

export default ViewTrip