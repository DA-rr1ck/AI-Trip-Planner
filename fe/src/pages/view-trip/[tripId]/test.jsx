import React from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/service/firebaseConfig';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import InfoSection from '../components/InfoSection';
import Hotels from '../components/Hotels';
import PlacesToVisit from '../components/PlacesToVisit';

function ViewTrip() {
    const { tripId } = useParams();
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

    useEffect(() => {
        tripId && GetTripData();
    }, [tripId])

    if (loading) {
        return (
            <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
                <p>Loading trip...</p>
            </div>
        )
    }

    return (
        <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
            {/* Information */}
            <InfoSection trip={trip} />
            {/* Recommend hotels */}
            <Hotels trip={trip} />
            {/* Daily plan */}
            <PlacesToVisit trip={trip} />
            {/* Footer */}
        </div>
    )
}

export default ViewTrip
