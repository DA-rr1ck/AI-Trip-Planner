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
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (dates) => {
    const [start, end] = dates
    setFormData(prev => ({ ...prev, startDate: start, endDate: end }))
  }

  // Calculate number of days
  const getTotalDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    return differenceInDays(formData.endDate, formData.startDate) + 1
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
      toast.error('Failed to generate trip. Please try again.', { duration: 2000 })
    } finally {
      setLoading(false)
    }
  }

  // Debounced place search (OpenStreetMap Nominatim)
  useEffect(() => {
    const t = setTimeout(() => {
      if ((inputValue || '').length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}`)
          .then(r => r.json())
          .then(data => setOptions(data.map(item => ({ label: item.display_name, value: item }))))
          .catch(() => setOptions([]))
      }
    }, 500)
    return () => clearTimeout(t)
  }, [inputValue])

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 px-5 mt-10'>
      <h2 className='font-bold text-3xl'>
        Tell us your travel preferences 🏕️🌴
      </h2>
      <p className='mt-3 text-gray-500 text-xl'>
        Just provide some basic information, and our trip planner will generate a customized itinerary based on your preferences
      </p>

      <div className='mt-20 flex flex-col gap-10'>
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
      </div>

      {/* NEW: Date Range Picker */}
      <div>
        <h2 className='text-xl my-3 font-medium'>
          When are you planning your trip?
        </h2>
        <DatePicker
          selected={formData.startDate}
          onChange={handleDateChange}
          startDate={formData.startDate}
          endDate={formData.endDate}
          selectsRange
          minDate={new Date()}
          dateFormat="dd/MM/yyyy"
          placeholderText="Select start and end date"
          className='w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          isClearable
        />
        {formData.startDate && formData.endDate && (
          <p className='mt-2 text-sm text-gray-600'>
            Trip duration: {getTotalDays()} {getTotalDays() === 1 ? 'day' : 'days'}
          </p>
        )}
      </div>

      <div>
        <h2 className='text-xl my-3 font-medium'>
          What is your budget?
        </h2>
        <div className='grid sm:grid-cols-3 mt-5 gap-5'>
          {SelectBudgetOptions.map((item, index) => (
            <div
              key={index}
              className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${
                formData.budget === item.title ? 'border-blue-500 bg-blue-50' : ''
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
              className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg ${
                formData.traveler === item.title ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <h2 className='text-4xl'>{item.icon}</h2>
              <h2 className='font-bold text-lg'>{item.title}</h2>
              <h2 className='text-sm text-gray-500'>{item.desc}</h2>
            </div>
          ))}
        </div>
      </div>

      <div className='my-10 justify-end flex'>
        <Button disabled={loading} onClick={onGenerateTrip}>
          {loading ? <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' /> : 'Generate Trip'}
        </Button>
      </div>

      <AuthDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSuccess={() => { setOpenDialog(false); onGenerateTrip(); }}
      />
    </div>
  )
}

export default CreateTrip