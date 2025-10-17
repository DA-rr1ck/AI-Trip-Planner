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
    const [trip, setTrip] = useState([]);
    useEffect(() => {
        'tripdId'&&GetTripData();
    },[tripId])

    const GetTripData= async() => {
        const docRef = doc(db, "AITrips", tripId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            setTrip(docSnap.data());
        } else {
            console.log("No such document!");
            toast("Trip not found", { type: "error" });
        }
    }
  return (
    <div className='p-10 md:px-20 lg:px-44 xl:px-56'>
        {/* Information */}
        <InfoSection trip = {trip}/>
        {/* Recommend hotels */}
        <Hotels trip = {trip}/>
        {/* Daily plan */}
        <PlacesToVisit trip = {trip}/>
        {/* Footer */}
    </div>
  )
}

export default ViewTrip
