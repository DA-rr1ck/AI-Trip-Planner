import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { format } from 'date-fns'
import SmartTripForm from './components/SmartTripForm'
import { generateSmartTrip } from '@/service/smartTripService'

function SmartTripPage() {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGenerateTrip = async (formData) => {
    if (!user) {
      toast.error('Please log in to generate a trip')
      navigate('/sign-in')
      return
    }

    setLoading(true)
    
    try {
      // Format dates
      const startDate = format(formData.startDate, 'yyyy-MM-dd')
      const endDate = format(formData.endDate, 'yyyy-MM-dd')
      
      // Generate trip with database + AI
      const tripPlan = await generateSmartTrip({
        ...formData,
        startDate,
        endDate
      })

      // Save to Firestore
      const docId = Date.now().toString()
      
      await setDoc(doc(db, 'AITrips', docId), {
        userSelection: {
          location: formData.location,
          startDate,
          endDate,
          budgetMin: formData.budgetMin,
          budgetMax: formData.budgetMax,
          budget: `$${formData.budgetMin} - $${formData.budgetMax}`,
          adults: formData.adults,
          children: formData.children,
          childrenAges: formData.childrenAges,
          traveler: `${formData.adults} Adults${formData.children > 0 ? `, ${formData.children} Children` : ''}`
        },
        tripData: tripPlan,
        userEmail: user.email,
        id: docId,
        createdAt: new Date().toISOString(),
        generationMethod: 'smart_database'
      })

      toast.success('✨ Smart trip generated successfully!')
      navigate(`/smart-trip/view/${docId}`)
      
    } catch (error) {
      console.error('Error generating smart trip:', error)
      toast.error(error.message || 'Failed to generate trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-purple-50 to-white'>
      <SmartTripForm onGenerate={handleGenerateTrip} loading={loading} />
    </div>
  )
}

export default SmartTripPage