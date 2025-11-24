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
import { AI_PROMPT } from '@/constants/options'
import { generateTrip } from '@/service/AIModel'
import { useAuth } from '@/context/AuthContext'
import { Minus, Plus, DollarSign } from 'lucide-react'
import DestinationSelector from './components/DestinationSelector'
import ModeSwitch from './components/ModeSwitch'
import HotelSearch from './components/manual/HotelSearch'
import DayManager from './components/manual/DayManager'
import { saveManualTrip } from './utils/manual/tripSaver'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [aiFormData, setAiFormData] = useState({
    startDate: null,
    endDate: null,
    budgetMin: 500,
    budgetMax: 2000,
    adults: 2,
    children: 0,
  })
  const [manualFormData, setManualFormData] = useState({
    startDate: null,
    endDate: null,
    budgetMin: 500,
    budgetMax: 2000,
    adults: 2,
    children: 0,
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

  const formData = isManualMode ? manualFormData : aiFormData

  const handleInputChange = (name, value) => {
    if (isManualMode) {
      setManualFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setAiFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  useEffect(() => {
    if (!isManualMode) return

    // Auto-calculate days from date range if dates are selected
    const totalDays = getTotalDays()
    if (totalDays > 0) {
      setManualFormData(prev => ({ ...prev, noOfdays: totalDays.toString() }))
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

  // Format budget range
  const formatBudget = (min, max) => {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  // Format travelers
  const formatTravelers = () => {
    const parts = []
    if (formData.adults > 0) parts.push(`${formData.adults} ${formData.adults === 1 ? 'Adult' : 'Adults'}`)
    if (formData.children > 0) parts.push(`${formData.children} ${formData.children === 1 ? 'Child' : 'Children'}`)
    return parts.join(', ') || '0 Travelers'
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

    if (!formData.location || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all the fields.', { duration: 1200 })
      return
    }

    if (formData.adults === 0 && formData.children === 0) {
      toast.error('Please add at least one traveler.', { duration: 1200 })
      return
    }

    setLoading(true)

    const FINAL_PROMPT = AI_PROMPT
      .replace('{location}', formData?.location)
      .replace('{totalDays}', totalDays)
      .replace('{adults}', formData.adults)
      .replace('{children}', formData.children)
      .replace('{budgetMin}', formData.budgetMin)
      .replace('{budgetMax}', formData.budgetMax)

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
              location: formData.location,
              startDate: format(formData.startDate, 'yyyy-MM-dd'),
              endDate: format(formData.endDate, 'yyyy-MM-dd'),
              budget: formatBudget(formData.budgetMin, formData.budgetMax),
              traveler: formatTravelers(),
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

  const onSaveManualTrip = async () => {
    if (!user) {
      setOpenDialog(true)
      return
    }
    setLoading(true)
    try {
      const budget = formatBudget(formData.budgetMin, formData.budgetMax)
      const traveler = formatTravelers()
      const manualFormData = { ...formData, budget, traveler }
      
      const tripId = await saveManualTrip({ formData: manualFormData, confirmedHotel, tripDays, user })
      toast.success('Trip saved successfully!')
      navigate(`/view-trip/${tripId}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualDaysChange = (newTripDays) => {
    const currentDaysCount = tripDays.length
    const newDaysCount = newTripDays.length

    if (newDaysCount < currentDaysCount) {
      toast.success('Day deleted', { duration: 1000 })
      
      if (formData.startDate) {
        const newEndDate = addDays(formData.startDate, newDaysCount - 1)
        setManualFormData(prev => ({ ...prev, endDate: newEndDate }))
      }
    } else if (newDaysCount > currentDaysCount) {
      if (formData.startDate) {
        const newEndDate = addDays(formData.startDate, newDaysCount - 1)
        setManualFormData(prev => ({ ...prev, endDate: newEndDate }))
      }
    }
    
    setTripDays(newTripDays)
  }

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

        {/* Budget Range Slider */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            What is your budget range? (per person)
          </h2>
          
          <div className='p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-2'>
                <DollarSign className='h-5 w-5 text-green-600' />
                <span className='text-2xl font-bold text-green-700'>
                  ${formData.budgetMin.toLocaleString()} - ${formData.budgetMax.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Min Budget Slider */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Minimum Budget: ${formData.budgetMin.toLocaleString()}
              </label>
              <input
                type='range'
                min='100'
                max='10000'
                step='100'
                value={formData.budgetMin}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (val < formData.budgetMax) {
                    handleInputChange('budgetMin', val)
                  }
                }}
                className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
              />
            </div>

            {/* Max Budget Slider */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Maximum Budget: ${formData.budgetMax.toLocaleString()}
              </label>
              <input
                type='range'
                min='100'
                max='10000'
                step='100'
                value={formData.budgetMax}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (val > formData.budgetMin) {
                    handleInputChange('budgetMax', val)
                  }
                }}
                className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
              />
            </div>

            <p className='text-xs text-gray-600 mt-3 text-center'>
              💡 This is the total budget per person for the entire trip
            </p>
          </div>
        </div>

        {/* Number of Travelers */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            How many people are traveling?
          </h2>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Adults */}
            <div className='p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='font-semibold text-lg'>Adults</h3>
                  <p className='text-xs text-gray-600'>Age 18+</p>
                </div>
                <span className='text-4xl'>👨‍💼</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => handleInputChange('adults', Math.max(0, formData.adults - 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.adults === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-3xl font-bold text-blue-700'>{formData.adults}</span>
                
                <button
                  type='button'
                  onClick={() => handleInputChange('adults', Math.min(10, formData.adults + 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.adults === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className='p-6 border rounded-lg bg-gradient-to-br from-pink-50 to-rose-50'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='font-semibold text-lg'>Children</h3>
                  <p className='text-xs text-gray-600'>Age 0-17</p>
                </div>
                <span className='text-4xl'>👶</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => handleInputChange('children', Math.max(0, formData.children - 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.children === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-3xl font-bold text-pink-700'>{formData.children}</span>
                
                <button
                  type='button'
                  onClick={() => handleInputChange('children', Math.min(10, formData.children + 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.children === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Total Travelers Summary */}
          <div className='mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
            <p className='text-sm text-purple-800 text-center'>
              👥 Total: <span className='font-semibold'>{formatTravelers()}</span>
            </p>
          </div>
        </div>

          {formData.location && (
            <HotelSearch
              location={formData.location}
              confirmedHotel={confirmedHotel}
              onHotelConfirm={(hotel) => setConfirmedHotel(hotel)}
              onRemoveHotel={() => setConfirmedHotel(null)}
              startDate={formData.startDate}
              endDate={formData.endDate}
              budgetMin={formData.budgetMin}
              budgetMax={formData.budgetMax}
              adults={formData.adults}
              children={formData.children}
            />
          )}

          {confirmedHotel && (
            <DayManager
              location={formData.location}
              tripDays={tripDays}
              onDaysChange={handleManualDaysChange}
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

        {/* Date Pickers */}
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
                dateFormat="dd/MM/yyyy"
                placeholderText="Select start date"
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
                dateFormat="dd/MM/yyyy"
                placeholderText="Select end date"
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

        {/* Budget Range Slider */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            What is your budget range? (per person)
          </h2>
          
          <div className='p-6 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-2'>
                <DollarSign className='h-5 w-5 text-green-600' />
                <span className='text-2xl font-bold text-green-700'>
                  ${formData.budgetMin.toLocaleString()} - ${formData.budgetMax.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Min Budget Slider */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Minimum Budget: ${formData.budgetMin.toLocaleString()}
              </label>
              <input
                type='range'
                min='100'
                max='10000'
                step='100'
                value={formData.budgetMin}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (val < formData.budgetMax) {
                    handleInputChange('budgetMin', val)
                  }
                }}
                className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
              />
            </div>

            {/* Max Budget Slider */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Maximum Budget: ${formData.budgetMax.toLocaleString()}
              </label>
              <input
                type='range'
                min='100'
                max='10000'
                step='100'
                value={formData.budgetMax}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (val > formData.budgetMin) {
                    handleInputChange('budgetMax', val)
                  }
                }}
                className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
              />
            </div>

            <p className='text-xs text-gray-600 mt-3 text-center'>
              💡 This is the total budget per person for the entire trip
            </p>
          </div>
        </div>

        {/* Number of Travelers */}
        <div>
          <h2 className='text-xl my-3 font-medium'>
            How many people are traveling?
          </h2>
          
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Adults */}
            <div className='p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='font-semibold text-lg'>Adults</h3>
                  <p className='text-xs text-gray-600'>Age 18+</p>
                </div>
                <span className='text-4xl'>👨‍💼</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => handleInputChange('adults', Math.max(0, formData.adults - 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.adults === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-3xl font-bold text-blue-700'>{formData.adults}</span>
                
                <button
                  type='button'
                  onClick={() => handleInputChange('adults', Math.min(10, formData.adults + 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.adults === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className='p-6 border rounded-lg bg-gradient-to-br from-pink-50 to-rose-50'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h3 className='font-semibold text-lg'>Children</h3>
                  <p className='text-xs text-gray-600'>Age 0-17</p>
                </div>
                <span className='text-4xl'>👶</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => handleInputChange('children', Math.max(0, formData.children - 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.children === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-3xl font-bold text-pink-700'>{formData.children}</span>
                
                <button
                  type='button'
                  onClick={() => handleInputChange('children', Math.min(10, formData.children + 1))}
                  className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={formData.children === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Total Travelers Summary */}
          <div className='mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
            <p className='text-sm text-purple-800 text-center'>
              👥 Total: <span className='font-semibold'>{formatTravelers()}</span>
            </p>
          </div>
        </div>
        </div>
      )}

      <div className='my-10 justify-end flex'>
        <Button
          disabled={loading}
          onClick={isManualMode ? onSaveManualTrip : onGenerateTrip}
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
            onSaveManualTrip()
          } else {
            onGenerateTrip()
          }
        }}
      />
    </div>
  )
}

export default CreateTrip
