import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
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
      
      console.log('=== Generating Smart Trip ===')
      console.log('User:', user.email)
      console.log('Location:', formData.location)
      console.log('Dates:', startDate, '->', endDate)
      
      // Generate trip with database + AI using backend API
      const result = await generateSmartTrip({
        location: formData.location,
        startDate,
        endDate,
        budgetMin: formData.budgetMin,
        budgetMax: formData.budgetMax,
        adults: formData.adults,
        children: formData.children,
        childrenAges: formData.childrenAges
        // ❌ Don't send userEmail - we'll save later in preview page
      })

      console.log('Trip generated:', result)

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate trip')
      }

      toast.success('✨ Smart trip generated successfully!')
      
      // ✅ Navigate to preview page with trip data (same as normal AI trip)
      navigate('/preview-trip', {
        state: {
          tripData: {
            userSelection: {
              location: formData.location,
              startDate,
              endDate,
              budgetMin: formData.budgetMin,
              budgetMax: formData.budgetMax,
              adults: formData.adults,
              children: formData.children,
              childrenAges: formData.childrenAges,
              budget: `$${formData.budgetMin} - $${formData.budgetMax}`,
              traveler: `${formData.adults} Adults${formData.children > 0 ? `, ${formData.children} Children` : ''}`
            },
            tripData: result.tripData
          }
        }
      })
      
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