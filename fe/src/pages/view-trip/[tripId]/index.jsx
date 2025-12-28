import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Edit } from 'lucide-react'
import Button from '@/components/ui/Button'
import InfoSection from '../components/InfoSection'
import Hotels from '../components/Hotels'
import PlacesToVisit from '../components/PlacesToVisit'
import MapRoute from '@/components/MapRoute'
import { getTripById } from '@/service/tripService' // NEW

function ViewTrip() {
    const { tripId } = useParams()
    const navigate = useNavigate()
    const [trip, setTrip] = useState({})
    const [loading, setLoading] = useState(true)

    const GetTripData = async () => {
        try {
            const result = await getTripById(tripId)
            
            if (result.success) {
                setTrip(result.trip)
            } else {
                toast.error('Trip not found')
            }
        } catch (error) {
            console.error('Error loading trip:', error)
            toast.error(error.message || 'Failed to load trip')
        } finally {
            setLoading(false)
        }
    }

    const handleEditTrip = () => {
        // Pass trip data to edit page via state
        navigate(`/edit-trip/${tripId}`, {
            state: {
                tripData: {
                    userSelection: trip.userSelection,
                    tripData: trip.tripData
                }
            }
        })
    }

    useEffect(() => {
        if (tripId) {
            GetTripData()
        }
    }, [tripId])

    // Collect all activities from itinerary for the map
    const getAllActivities = () => {
        if (!trip?.tripData?.Itinerary) return []
        
        const itinerary = trip.tripData.Itinerary
        const dateKeys = Object.keys(itinerary).sort()
        
        return dateKeys.flatMap(dateKey => {
            const dayData = itinerary[dateKey]
            return [
                ...(dayData.Morning?.Activities || []),
                ...(dayData.Lunch?.Activity ? [dayData.Lunch.Activity] : []),
                ...(dayData.Afternoon?.Activities || []),
                ...(dayData.Evening?.Activities || [])
            ]
        }).filter(activity => activity.GeoCoordinates)
    }

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

    const allActivities = getAllActivities()

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

            {/* Map Section */}
            {allActivities.length > 0 && (
                <div className='mb-8'>
                    <h2 className='font-bold text-2xl mb-4'>Complete Trip Route</h2>
                    <p className='text-sm text-gray-600 mb-4'>
                        🗺️ View all {allActivities.length} activities across your entire trip
                    </p>
                    <div className='bg-white rounded-xl p-4 shadow-md border border-gray-200'>
                        <MapRoute
                            activities={allActivities}
                            locationName={trip?.tripData?.Location}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default ViewTrip