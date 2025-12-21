import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { differenceInDays, format } from 'date-fns'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import AuthDialog from '@/components/custom/AuthDialog'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/service/firebaseConfig'
import { Minus, Plus, DollarSign } from 'lucide-react'
import DestinationSelector from './components/DestinationSelector'
import ModeSwitch from './components/ModeSwitch'
import HotelSearch from './components/manual/HotelSearch'
import DayManager from './components/manual/DayManager'
import { generateAITrip } from '@/service/tripService'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [aiFormData, setAiFormData] = useState({
    location: '',
    startDate: null,
    endDate: null,
    budgetMin: 500,
    budgetMax: 2000,
    adults: 2,
    children: 0,
    childrenAges: [],
  })
  const [manualFormData, setManualFormData] = useState({
    location: '',
    startDate: null,
    endDate: null,
    budgetMin: 500,
    budgetMax: 2000,
    adults: 2,
    children: 0,
    childrenAges: [],
  })
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [confirmedHotel, setConfirmedHotel] = useState(null)
  const [tripDays, setTripDays] = useState([])
  const [hotelSearchState, setHotelSearchState] = useState({ query: '', results: [] })
  const [isLoaded, setIsLoaded] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  // Load session data on mount
  useEffect(() => {
    const wasPageReloaded = sessionStorage.getItem('createTripPageLoaded') === 'true'

    if (wasPageReloaded) {
      const navEntry = performance.getEntriesByType("navigation")[0];
      if (navEntry && navEntry.type === 'reload') {
        sessionStorage.removeItem('createTripSession');
        sessionStorage.removeItem('createTripPageLoaded');
        setIsLoaded(true);
        return;
      }
    }

    sessionStorage.setItem('createTripPageLoaded', 'true')

    const savedSession = sessionStorage.getItem('createTripSession')
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        if (parsed.aiFormData) {
          if (parsed.aiFormData.startDate) parsed.aiFormData.startDate = new Date(parsed.aiFormData.startDate)
          if (parsed.aiFormData.endDate) parsed.aiFormData.endDate = new Date(parsed.aiFormData.endDate)
          setAiFormData(parsed.aiFormData)
        }
        if (parsed.manualFormData) {
          if (parsed.manualFormData.startDate) parsed.manualFormData.startDate = new Date(parsed.manualFormData.startDate)
          if (parsed.manualFormData.endDate) parsed.manualFormData.endDate = new Date(parsed.manualFormData.endDate)
          setManualFormData(parsed.manualFormData)
        }
        if (parsed.isManualMode !== undefined) setIsManualMode(parsed.isManualMode)
        if (parsed.confirmedHotel) setConfirmedHotel(parsed.confirmedHotel)
        if (parsed.tripDays) setTripDays(parsed.tripDays)
        if (parsed.place) setPlace(parsed.place)
        if (parsed.hotelSearchState) setHotelSearchState(parsed.hotelSearchState)
      } catch (e) {
        console.error('Failed to restore session', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save session data on change
  useEffect(() => {
    if (!isLoaded) return

    const sessionData = {
      place,
      aiFormData,
      manualFormData,
      isManualMode,
      confirmedHotel,
      tripDays,
      hotelSearchState
    }
    sessionStorage.setItem('createTripSession', JSON.stringify(sessionData))
  }, [place, aiFormData, manualFormData, isManualMode, confirmedHotel, tripDays, hotelSearchState, isLoaded])

  const formData = isManualMode ? manualFormData : aiFormData

  const handleInputChange = (name, value) => {
    if (isManualMode) {
      setManualFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setAiFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleChildrenChange = (newCount) => {
    const currentFormData = isManualMode ? manualFormData : aiFormData
    const setCurrentFormData = isManualMode ? setManualFormData : setAiFormData

    const currentCount = currentFormData.children ?? 0
    const currentAges = currentFormData.childrenAges ?? []

    let newAges
    if (newCount > currentCount) {
      newAges = [...currentAges]
      for (let i = currentCount; i < newCount; i++) {
        newAges.push(5)
      }
    } else {
      newAges = currentAges.slice(0, newCount)
    }

    setCurrentFormData(prev => ({
      ...prev,
      children: newCount,
      childrenAges: newAges,
    }))
  }

  const handleChildAgeChange = (index, age) => {
    const setCurrentFormData = isManualMode ? setManualFormData : setAiFormData

    setCurrentFormData(prev => {
      const currentAges = prev.childrenAges ?? []
      const newAges = [...currentAges]
      newAges[index] = age
      return { ...prev, childrenAges: newAges }
    })
  }

  const getTotalDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    return differenceInDays(formData.endDate, formData.startDate) + 1
  }

  const formatBudget = (min, max) => {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  }

  const formatTravelers = () => {
    const parts = []
    if (formData.adults > 0) parts.push(`${formData.adults} ${formData.adults === 1 ? 'Adult' : 'Adults'}`)
    if (formData.children > 0) {
      const childrenText = `${formData.children} ${formData.children === 1 ? 'Child' : 'Children'}`
      const agesText = formData.childrenAges.length > 0 ? ` (ages: ${formData.childrenAges.join(', ')})` : ''
      parts.push(childrenText + agesText)
    }
    return parts.join(', ') || '0 Travelers'
  }

  // AI Trip Generation - Uses backend API
  const onGenerateTrip = async () => {
    if (!isAuthenticated) {
      setOpenDialog(true)
      toast.info('Please sign in to generate your trip.')
      return
    }

    const totalDays = getTotalDays()
    if (totalDays < 1 || totalDays > 30) {
      toast.error('Please select a trip between 1-30 days.', { duration: 1200 })
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

    if (formData.children > 0 && formData.childrenAges.length !== formData.children) {
      toast.error('Please set ages for all children.', { duration: 1200 })
      return
    }

    setLoading(true)

    try {
      // Call backend API
      const result = await generateAITrip({
        location: formData.location,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        budgetMin: formData.budgetMin,
        budgetMax: formData.budgetMax,
        adults: formData.adults,
        children: formData.children,
        childrenAges: formData.childrenAges
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate trip')
      }

      // Clear session on success
      sessionStorage.removeItem('createTripSession')

      // Navigate to edit page with trip data
      navigate('/preview-trip', {
        state: {
          tripData: result.tripData
        }
      })

      toast.success('Trip generated successfully!')

    } catch (error) {
      console.error('Error generating trip:', error)
      toast.error(error.message || 'Failed to generate trip. Please try again.', { duration: 2000 })
    } finally {
      setLoading(false)
    }
  }

  // Manual Trip Save - OLD WAY (saves directly to Firestore)
  const onSaveManualTrip = async () => {
    if (!user) {
      setOpenDialog(true)
      return
    }

    if (!formData.location || !formData.startDate || !formData.endDate) {
      toast.error('Please fill all required fields.')
      return
    }

    if (tripDays.length === 0) {
      toast.error('Please add at least one day to your trip.')
      return
    }

    setLoading(true)

    try {
      const docId = Date.now().toString()

      // Build itinerary from tripDays
      const itinerary = {}
      const start = new Date(formData.startDate)

      tripDays.forEach((day, index) => {
        const dayDate = new Date(start)
        dayDate.setDate(start.getDate() + index)
        const dateKey = format(dayDate, 'yyyy-MM-dd')

        itinerary[dateKey] = {
          DayNumber: day.dayNumber,
          Activities: day.places || []
        }
      })

      const tripDocument = {
        id: docId,
        userEmail: user.email,
        userSelection: {
          location: formData.location,
          startDate: format(formData.startDate, 'yyyy-MM-dd'),
          endDate: format(formData.endDate, 'yyyy-MM-dd'),
          budget: formatBudget(formData.budgetMin, formData.budgetMax),
          traveler: formatTravelers(),
          budgetMin: formData.budgetMin,
          budgetMax: formData.budgetMax,
          adults: formData.adults,
          children: formData.children,
          childrenAges: formData.childrenAges
        },
        tripData: {
          Location: formData.location,
          Hotels: confirmedHotel ? [confirmedHotel] : [],
          Itinerary: itinerary
        },
        createdAt: new Date().toISOString(),
        generationMethod: 'manual'
      }

      // Save to Firestore directly
      await setDoc(doc(db, 'AITrips', docId), tripDocument)

      toast.success('Trip saved successfully!')

      // Clear session on success
      sessionStorage.removeItem('createTripSession')

      // Navigate to view trip
      navigate(`/view-trip/${docId}`)

    } catch (error) {
      console.error('Error saving manual trip:', error)
      toast.error('Failed to save trip. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Location search
  useEffect(() => {
    if (isManualMode) {
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

  // Warn before refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const hasData = place ||
        (isManualMode && (confirmedHotel || tripDays.length > 0)) ||
        (!isManualMode && (aiFormData.startDate || aiFormData.endDate));

      if (hasData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [place, isManualMode, confirmedHotel, tripDays, aiFormData]);

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

      {/* AI Mode Form - EXACT SAME UI AS BEFORE */}
      {!isManualMode && (
        <div className='mt-20 flex flex-col gap-10'>
          {/* Location Selector */}
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
                    onClick={() => handleChildrenChange(Math.max(0, formData.children - 1))}
                    className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                    disabled={formData.children === 0}
                  >
                    <Minus className='h-4 w-4' />
                  </button>

                  <span className='text-3xl font-bold text-pink-700'>{formData.children}</span>

                  <button
                    type='button'
                    onClick={() => handleChildrenChange(Math.min(10, formData.children + 1))}
                    className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                    disabled={formData.children === 10}
                  >
                    <Plus className='h-4 w-4' />
                  </button>
                </div>
              </div>
            </div>

            {/* Children Ages Selection */}
            {formData.children > 0 && (
              <div className='mt-6 p-6 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50'>
                <h3 className='font-semibold text-lg mb-4 flex items-center gap-2'>
                  <span>👶</span>
                  Ages of Children
                </h3>
                <p className='text-xs text-gray-600 mb-4'>
                  Please select the age of each child at the time of travel (0-17 years)
                </p>

                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                  {Array.from({ length: formData.children }).map((_, index) => (
                    <div key={index} className='bg-white p-4 rounded-lg border border-purple-200'>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Child {index + 1}
                      </label>
                      <select
                        value={formData.childrenAges[index] ?? 5}
                        onChange={(e) => handleChildAgeChange(index, Number(e.target.value))}
                        className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
                      >
                        {Array.from({ length: 18 }, (_, i) => i).map((age) => (
                          <option key={age} value={age}>
                            {age} {age === 0 ? 'year (infant)' : age === 1 ? 'year' : 'years'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Travelers Summary */}
            <div className='mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
              <p className='text-sm text-purple-800 text-center'>
                👥 Total: <span className='font-semibold'>{formatTravelers()}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Mode - Keep as is */}
      {isManualMode && (
        <>
          <DestinationSelector
            isManualMode={isManualMode}
            formData={formData}
            place={place}
            setPlace={setPlace}
            inputValue={inputValue}
            setInputValue={setInputValue}
            options={options}
            handleInputChange={handleInputChange}
          />

          {/* Rest of manual mode components... */}
          <HotelSearch
            confirmedHotel={confirmedHotel}
            setConfirmedHotel={setConfirmedHotel}
            hotelSearchState={hotelSearchState}
            setHotelSearchState={setHotelSearchState}
          />

          <DayManager
            tripDays={tripDays}
            setTripDays={setTripDays}
            startDate={formData.startDate}
            endDate={formData.endDate}
          />
        </>
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