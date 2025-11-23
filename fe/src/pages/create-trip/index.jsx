import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { differenceInDays, format, addDays } from 'date-fns'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import AuthDialog from '@/components/custom/AuthDialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import { SelectBudgetOptions, SelectTravelesList } from '@/constants/options'
import { useAuth } from '@/context/AuthContext'
import ModeSwitch from './components/ModeSwitch'
import DestinationSelector from './components/DestinationSelector'
import HotelSearch from './components/manual/HotelSearch'
import DayManager from './components/manual/DayManager'
import { saveManualTrip as saveManualTripUtil } from './utils/manual/tripSaver'
import { generateAiTripFromForm } from './utils/ai/aiTripGenerator'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [formData, setFormData] = useState({
    startDate: null,
    endDate: null
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

  useEffect(() => {
    if (!isManualMode) return

    // Auto-calculate days from date range if dates are selected
    const totalDays = getTotalDays()
    if (totalDays > 0) {
      setFormData(prev => ({ ...prev, noOfdays: totalDays.toString() }))
    }

    const n = parseInt(formData.noOfdays, 10)
    if (!Number.isFinite(n) || n <= 0) return

    setTripDays(prev => {
      if (prev.length === n) {
        return prev.map((day, index) => ({ ...day, dayNumber: index + 1 }))
      }

      const next = []
      for (let i = 0; i < n; i++) {
        const existing = prev[i]
        if (existing) {
          next.push({ ...existing, dayNumber: i + 1 })
        } else {
          next.push({ id: Date.now() + i, dayNumber: i + 1, places: [] })
        }
      }
      return next
    })
  }, [formData.noOfdays, formData.startDate, formData.endDate, isManualMode])

  useEffect(() => {
    if (!isManualMode) return
    if (!formData.noOfdays) {
      setTripDays([])
    }
  }, [formData.noOfdays, isManualMode])

  const getTotalDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    return differenceInDays(formData.endDate, formData.startDate) + 1
  }

  useEffect(() => {
    if (isManualMode) {
      // Keep dates in manual mode, clear nothing
    } else {
      setConfirmedHotel(null)
      setTripDays([])
    }
  }, [isManualMode])

  const saveManualTrip = async () => {
    if (!isAuthenticated) {
      setOpenDialog(true)
      toast.info('Please sign in to save your trip.')
      return
    }

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

    const totalDays = getTotalDays()
    if (totalDays < 1 || totalDays > 5) {
      toast.error('Please select a trip between 1-5 days.', { duration: 1200 })
      return
    }

    if (!formData.location || !formData.startDate || !formData.endDate || !formData.budget || !formData.traveler) {
      toast.error('Please fill all the fields.', { duration: 1200 })
      return
    }

    setLoading(true)
    try {
      const tripData = await generateAiTripFromForm({ ...formData, noOfdays: totalDays })
      const travelPlan = tripData[0]?.TravelPlan || tripData.TravelPlan || tripData

      const itineraryWithDates = {}
      Object.entries(travelPlan.Itinerary || {}).forEach(([, dayData], index) => {
        const actualDate = addDays(formData.startDate, index)
        const dateKey = format(actualDate, 'yyyy-MM-dd')
        itineraryWithDates[dateKey] = dayData
      })

      navigate('/edit-trip', {
        state: {
          tripData: {
            userSelection: {
              ...formData,
              noOfdays: totalDays,
              startDate: format(formData.startDate, 'yyyy-MM-dd'),
              endDate: format(formData.endDate, 'yyyy-MM-dd')
            },
            tripData: {
              ...travelPlan,
              Itinerary: itineraryWithDates
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

  useEffect(() => {
    if (isManualMode) {
      setPlace(null)
      setOptions([])
      setInputValue('')
      return
    }

    const timer = setTimeout(() => {
      if ((inputValue || '').length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}`)
          .then(response => response.json())
          .then(data => setOptions(data.map(item => ({ label: item.display_name, value: item }))))
          .catch(() => setOptions([]))
      } else {
        setOptions([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [inputValue, isManualMode])

  const renderBudgetOptions = (selectedValue) => (
    <div className='grid sm:grid-cols-3 mt-5 gap-5'>
      {SelectBudgetOptions.map((item, index) => (
        <div
          key={index}
          className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg transition-all ${
            selectedValue === item.title ? 'border-blue-500 bg-blue-50 shadow-md' : ''
          }`}
          onClick={() => handleInputChange('budget', item.title)}
        >
          <h2 className='text-4xl'>{item.icon}</h2>
          <h2 className='font-bold text-lg'>{item.title}</h2>
          <h2 className='text-sm text-gray-500'>{item.desc}</h2>
        </div>
      ))}
    </div>
  )

  const renderTravelerOptions = (selectedValue) => (
    <div className='grid sm:grid-cols-3 mt-5 gap-5'>
      {SelectTravelesList.map((item, index) => (
        <div
          key={index}
          onClick={() => handleInputChange('traveler', item.title)}
          className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg transition-all ${
            selectedValue === item.title ? 'border-blue-500 bg-blue-50 shadow-md' : ''
          }`}
        >
          <h2 className='text-4xl'>{item.icon}</h2>
          <h2 className='font-bold text-lg'>{item.title}</h2>
          <h2 className='text-sm text-gray-500'>{item.desc}</h2>
        </div>
      ))}
    </div>
  )

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 px-5 mt-10'>
      <ModeSwitch isManualMode={isManualMode} onChange={setIsManualMode} />

      <h2 className='font-bold text-3xl'>
        {isManualMode ? 'Create Your Trip Manually' : 'Tell us your travel preferences 🏕️🌴'}
      </h2>
      <p className='mt-3 text-gray-500 text-xl'>
        {isManualMode
          ? 'Build your custom itinerary step by step with full control over every detail'
          : 'Just provide some basic information, and our trip planner will generate a customized itinerary based on your preferences'}
      </p>

      {isManualMode ? (
        <div className='mt-20 flex flex-col gap-10'>
          <DestinationSelector
            label='What is your desired destination?'
            onLocationSelected={(label) => handleInputChange('location', label)}
          />

          <div>
            <h2 className='text-xl my-3 font-medium'>
              When are you planning your trip?
            </h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Start Date
                </label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleInputChange('startDate', date)}
                  minDate={new Date()}
                  maxDate={formData.endDate || undefined}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Select start date'
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  isClearable
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  End Date
                </label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => handleInputChange('endDate', date)}
                  minDate={formData.startDate || new Date()}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Select end date'
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  disabled={!formData.startDate}
                  isClearable
                />
              </div>
            </div>

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

          <div>
            <h2 className='text-xl my-3 font-medium'>
              What is your budget?
            </h2>
            {renderBudgetOptions(formData.budget)}
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              Who do you plan to travel with?
            </h2>
            {renderTravelerOptions(formData.traveler)}
          </div>

          {formData.location && (
            <HotelSearch
              location={formData.location}
              confirmedHotel={confirmedHotel}
              onHotelConfirm={(hotel) => setConfirmedHotel(hotel)}
              onRemoveHotel={() => setConfirmedHotel(null)}
            />
          )}

          {confirmedHotel && (
            <DayManager
              location={formData.location}
              tripDays={tripDays}
              onDaysChange={setTripDays}
            />
          )}
        </div>
      ) : (
        <div className='mt-20 flex flex-col gap-10'>
          <div>
            <h2 className='text-xl my-3 font-medium'>
              What is your desired destination?
            </h2>
            <Select
              options={options}
              value={place}
              onChange={(value) => {
                setPlace(value)
                handleInputChange('location', value?.label)
              }}
              onInputChange={(value) => setInputValue(value)}
              placeholder='Search for a location...'
            />
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              When are you planning your trip?
            </h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Start Date
                </label>
                <DatePicker
                  selected={formData.startDate}
                  onChange={(date) => handleInputChange('startDate', date)}
                  minDate={new Date()}
                  maxDate={formData.endDate || undefined}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Select start date'
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  isClearable
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  End Date
                </label>
                <DatePicker
                  selected={formData.endDate}
                  onChange={(date) => handleInputChange('endDate', date)}
                  minDate={formData.startDate || new Date()}
                  dateFormat='dd/MM/yyyy'
                  placeholderText='Select end date'
                  className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  disabled={!formData.startDate}
                  isClearable
                />
              </div>
            </div>

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

          <div>
            <h2 className='text-xl my-3 font-medium'>
              What is your budget?
            </h2>
            {renderBudgetOptions(formData.budget)}
          </div>

          <div>
            <h2 className='text-xl my-3 font-medium'>
              Who do you plan to travel with?
            </h2>
            {renderTravelerOptions(formData.traveler)}
          </div>
        </div>
      )}

      <div className='my-10 justify-end flex'>
        <Button
          disabled={loading}
          onClick={isManualMode ? saveManualTrip : onGenerateTrip}
        >
          {loading
            ? <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' />
            : (isManualMode ? 'Save Trip' : 'Generate Trip')}
        </Button>
      </div>

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
