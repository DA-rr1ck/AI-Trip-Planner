import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import AuthDialog from '@/components/custom/AuthDialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import { SelectBudgetOptions, SelectTravelesList } from '@/constants/options'
import { useAuth } from '@/context/AuthContext'
import ModeSwitch from './components/ModeSwitch'
import DestinationSelector from './components/DestinationSelector'
import HotelSearch from './components/HotelSearch'
import DayManager from './components/DayManager'
import { saveManualTrip as saveManualTripUtil } from './utils/tripSaver'
import { generateAiTripFromForm } from './utils/aiTripGenerator'

function CreateTrip() {
  const [formData, setFormData] = useState({})
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [confirmedHotel, setConfirmedHotel] = useState(null)
  const [tripDays, setTripDays] = useState([])
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Auto-create/truncate days to match the user's desired number
  useEffect(() => {
    const n = parseInt(formData.noOfdays, 10)
    if (!Number.isFinite(n) || n <= 0) return
    if (tripDays.length === n) return

    // Preserve existing first N days (and their places), renumber sequentially
    const next = []
    for (let i = 0; i < n; i++) {
      const existing = tripDays[i]
      if (existing) {
        next.push({ ...existing, dayNumber: i + 1 })
      } else {
        next.push({ id: Date.now() + i, dayNumber: i + 1, places: [] })
      }
    }
    setTripDays(next)
  }, [formData.noOfdays])

  const saveManualTrip = async () => {
    if (!isAuthenticated) {
      setOpenDialog(true)
      toast.info('Please sign in to save your trip.')
      return
    }

    // Basic validation for manual save
    if (!formData.location || !confirmedHotel || tripDays.length === 0) {
      toast.error('Please complete your trip: location, hotel, and at least one day required.')
      return
    }

    setLoading(true)
    try {
      const id = await saveManualTripUtil({ formData, confirmedHotel, tripDays, user })
      toast.success('Trip saved successfully!')
      navigate(`/view-trip/${id}`)
    } catch (error) {
      console.error('Error saving manual trip:', error)
      toast.error('Failed to save trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onGenerateTrip = async () => {
    if (!isAuthenticated) {
      setOpenDialog(true)
      toast.info('Please sign in to generate your trip.')
      return
    }
    setLoading(true)
    try {
      const tripData = await generateAiTripFromForm(formData)
      navigate('/edit-trip', {
        state: {
          tripData: {
            userSelection: formData,
            tripData: tripData
          }
        }
      })
    } catch (error) {
      console.error('Error generating trip:', error)
      toast.error(error.message || 'Failed to generate trip. Please try again.', { duration: 2000 })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className='sm:px-10 md:px-32 lg:px-56 px-5 mt-10'>
      {/* Mode Switch */}
      <ModeSwitch isManualMode={isManualMode} onChange={setIsManualMode} />

      <h2 className='font-bold text-3xl'>
        {isManualMode ? 'Create Your Trip Manually' : 'Tell us your travel preferences 🏕️🌴'}
      </h2>
      <p className='mt-3 text-gray-500 text-xl'>
        {isManualMode 
          ? 'Build your custom itinerary step by step with full control over every detail'
          : 'Just provide some basic information, and our trip planner will generate a customized itinerary based on your preferences'
        }
      </p>

      {isManualMode ? (
        // Manual Mode UI
        <div className='mt-20 flex flex-col gap-10'>
          <DestinationSelector 
            label='What is your destination?'
            onLocationSelected={(label) => handleInputChange('location', label)}
          />

          {/* How many days? */}
          <div>
            <h2 className='text-xl my-3 font-medium'>
              How many days are you planning your trip?
            </h2>
            <Input
              placeholder='Ex.3'
              type='number'
              value={formData.noOfdays || ''}
              onChange={(e) => handleInputChange('noOfdays', e.target.value)}
            />
          </div>

          {/* Budget */}
          <div>
            <h2 className='text-xl my-3 font-medium'>
              What is your budget?
            </h2>
            <div className='grid sm:grid-cols-3 mt-5 gap-5'>
              {SelectBudgetOptions.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${formData.budget === item.title ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => handleInputChange('budget', item.title)}
                >
                  <h2 className='text-4xl'>{item.icon}</h2>
                  <h2 className='font-bold text-lg'>{item.title}</h2>
                  <h2 className='text-sm text-gray-500'>{item.desc}</h2>
                </div>
              ))}
            </div>
          </div>

          {/* Traveler */}
          <div>
            <h2 className='text-xl my-3 font-medium'>
              Who do you plan to travel with?
            </h2>
            <div className='grid sm:grid-cols-3 mt-5 gap-5'>
              {SelectTravelesList.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleInputChange('traveler', item.title)}
                  className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${formData.traveler === item.title ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <h2 className='text-4xl'>{item.icon}</h2>
                  <h2 className='font-bold text-lg'>{item.title}</h2>
                  <h2 className='text-sm text-gray-500'>{item.desc}</h2>
                </div>
              ))}
            </div>
          </div>

          {/* Hotel Search */}
          {formData.location && (
            <HotelSearch 
              location={formData.location}
              confirmedHotel={confirmedHotel}
              onHotelConfirm={(hotel) => setConfirmedHotel(hotel)}
              onRemoveHotel={() => setConfirmedHotel(null)}
            />
          )}

          {/* Day Management */}
          {confirmedHotel && (
            <DayManager 
              location={formData.location}
              tripDays={tripDays}
              onDaysChange={setTripDays}
            />
          )}
        </div>
      ) : (
        // AI Mode UI (existing)
        <>
          <div className='mt-20 flex flex-col gap-10'>
            <DestinationSelector 
              label='What is your desire destination?'
              onLocationSelected={(label) => handleInputChange('location', label)}
            />
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              How many days are you planning your trip?
            </h2>
            <Input
              placeholder='Ex.3'
              type='number'
              onChange={(e) => handleInputChange('noOfdays', e.target.value)}
            />
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              What is your budget?
            </h2>
            <div className='grid sm:grid-cols-3 mt-5 gap-5'>
              {SelectBudgetOptions.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${formData.budget === item.title ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  onClick={() => handleInputChange('budget', item.title)}
                >
                  <h2 className='text-4xl'>{item.icon}</h2>
                  <h2 className='font-bold text-lg'>{item.title}</h2>
                  <h2 className='text-sm text-gray-500'>{item.desc}</h2>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              Who do you plan to travel with?
            </h2>
            <div className='grid sm:grid-cols-3 mt-5 gap-5'>
              {SelectTravelesList.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleInputChange('traveler', item.title)}
                  className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${formData.traveler === item.title ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                >
                  <h2 className='text-4xl'>{item.icon}</h2>
                  <h2 className='font-bold text-lg'>{item.title}</h2>
                  <h2 className='text-sm text-gray-500'>{item.desc}</h2>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className='my-10 justify-end flex'>
        <Button 
          disabled={loading} 
          onClick={isManualMode ? saveManualTrip : onGenerateTrip}
        >
          {loading ? (
            <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' />
          ) : (
            isManualMode ? 'Save' : 'Generate Trip'
          )}
        </Button>
      </div>

      {/* Shared Auth Dialog (BE email/password + FE Google via AuthContext) */}
      <AuthDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSuccess={() => { 
          setOpenDialog(false)
          if (isManualMode) {
            saveManualTrip()
          } else {
            onGenerateTrip()
          }
        }}
      />
    </div>
  )
}

export default CreateTrip
