import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { differenceInDays, format, addDays } from 'date-fns'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import AuthDialog from '@/components/custom/AuthDialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import { AI_PROMPT, SelectBudgetOptions, SelectTravelesList } from '@/constants/options'
import { generateTrip } from '@/service/AIModel'
import { useAuth } from '@/context/AuthContext'
import ModeSwitch from './components/ModeSwitch'
import DestinationSelector from './components/DestinationSelector'
import HotelSearch from './components/HotelSearch'
import DayManager from './components/DayManager'
import { saveManualTrip as saveManualTripUtil } from './utils/tripSaver'
import { generateAiTripFromForm } from './utils/aiTripGenerator'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null,
  })
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
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

  // Calculate number of days
  const getTotalDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    return differenceInDays(formData.endDate, formData.startDate) + 1
  }

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

    const totalDays = getTotalDays()
    if (totalDays < 1 || totalDays > 5) {
      toast.error('Please select a trip between 1-5 days.', { duration: 1200 })
      return
    }

    if (!formData.location || !formData.startDate || !formData.endDate || !formData.budget || !formData.traveler) {
      toast.error('Please fill all the fields.', { duration: 1200 })
      return
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

    const FINAL_PROMPT = AI_PROMPT
      .replace('{location}', formData?.location)
      .replace('{totalDays}', totalDays)
      .replace('{traveler}', formData?.traveler)
      .replace('{budget}', formData?.budget)
      .replace('{totalDays}', totalDays)

    try {
      const result = await generateTrip(FINAL_PROMPT)
      console.log('Raw result:', result)
      
      let tripData
      if (typeof result === 'string') {
        tripData = JSON.parse(result)
      } else if (typeof result === 'object') {
        tripData = result
      } else {
        throw new Error('Invalid trip data format')
      }

      // Extract TravelPlan
      const travelPlan = tripData[0]?.TravelPlan || tripData.TravelPlan || tripData

      // Convert Day1, Day2... to actual dates
      const itineraryWithDates = {}
      Object.entries(travelPlan.Itinerary).forEach(([dayKey, dayData], index) => {
        const actualDate = addDays(formData.startDate, index)
        const dateKey = format(actualDate, 'yyyy-MM-dd')
        itineraryWithDates[dateKey] = dayData
      })

      setLoading(false)
      navigate('/edit-trip', {
        state: {
          tripData: {
            userSelection: {
              ...formData,
              startDate: format(formData.startDate, 'yyyy-MM-dd'),
              endDate: format(formData.endDate, 'yyyy-MM-dd'),
            },
            tripData: {
              ...travelPlan,
              Itinerary: itineraryWithDates,
            }
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

      <div className='mt-20 flex flex-col gap-10'>
        {/* Location Selection */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            What is your desired destination?
          </h2>
          <Select
            options={options}
            value={place}
            onChange={(v) => {
              setPlace(v)
              handleInputChange('location', v?.label)
            }}
            onInputChange={setInputValue}
            placeholder='Search for a location...'
          />
        </div>

        {/* Separate Date Pickers */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            When are you planning your trip?
          </h2>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Start Date */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Start Date
              </label>
              <DatePicker
                selected={formData.startDate}
                onChange={(date) => handleInputChange('startDate', date)}
                minDate={new Date()}
                maxDate={formData.endDate || undefined}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
                className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                isClearable
              />
            </div>

            {/* End Date */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                End Date
              </label>
              <DatePicker
                selected={formData.endDate}
                onChange={(date) => handleInputChange('endDate', date)}
                minDate={formData.startDate || new Date()}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
                className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                disabled={!formData.startDate}
                isClearable
              />
            </div>
          </div>

          {/* Trip Duration Display */}
          {formData.startDate && formData.endDate && (
            <div className='mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <p className='text-sm text-blue-800'>
                ✈️ Trip duration: <span className='font-semibold'>{getTotalDays()} {getTotalDays() === 1 ? 'day' : 'days'}</span>
              </p>
              <p className='text-xs text-blue-600 mt-1'>
                {format(formData.startDate, 'EEEE, MMMM d, yyyy')} → {format(formData.endDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Budget Selection */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            What is your budget?
          </h2>
          <div className='grid sm:grid-cols-3 mt-5 gap-5'>
            {SelectBudgetOptions.map((item, index) => (
              <div
                key={index}
                className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg transition-all ${
                  formData.budget === item.title ? 'border-blue-500 bg-blue-50 shadow-md' : ''
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

        {/* Traveler Selection */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            Who do you plan to travel with?
          </h2>
          <div className='grid sm:grid-cols-3 mt-5 gap-5'>
            {SelectTravelesList.map((item, index) => (
              <div
                key={index}
                onClick={() => handleInputChange('traveler', item.title)}
                className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg transition-all ${
                  formData.traveler === item.title ? 'border-blue-500 bg-blue-50 shadow-md' : ''
                }`}
              >
                <h2 className='text-4xl'>{item.icon}</h2>
                <h2 className='font-bold text-lg'>{item.title}</h2>
                <h2 className='text-sm text-gray-500'>{item.desc}</h2>
              </div>
            ))}
          </div>
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

      {/* Generate Button */}
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

      {/* Auth Dialog */}
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