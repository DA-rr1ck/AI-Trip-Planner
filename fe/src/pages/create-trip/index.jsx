import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import AuthDialog from '@/components/custom/AuthDialog'
import Input from '@/components/ui/input'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import { AI_PROMPT, SelectBudgetOptions, SelectTravelesList } from '@/constants/options'
import { generateTrip } from '@/service/AIModel'
import { db } from '@/service/firebaseConfig'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [formData, setFormData] = useState({})
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const SaveAITrip = async (TripData) => {
    const id = Date.now().toString()
    await setDoc(doc(db, 'AITrips', id), {
      userSelection: formData,
      tripData: TripData,
      userEmail: user?.email || '',
      id,
    })
    return id
  }

  const onGenerateTrip = async () => {
    if (!isAuthenticated) {
      setOpenDialog(true)
      toast.info('Please sign in to generate your trip.')
      return
    }

    const daysNum = Number(formData.noOfdays)
    if (!Number.isFinite(daysNum) || daysNum < 1 || daysNum > 5) {
      toast.error('Please enter a valid number of days (1-5).', { duration: 1200 })
      return
    }

    if (!formData.location || !formData.noOfdays || !formData.budget || !formData.traveler) {
      toast.error('Please fill all the fields.', { duration: 1200 })
      return
    }

    setLoading(true)

    const FINAL_PROMPT = AI_PROMPT
      .replace('{location}', formData?.location)
      .replace('{totalDays}', formData?.noOfdays)
      .replace('{traveler}', formData?.traveler)
      .replace('{budget}', formData?.budget)
      .replace('{totalDays}', formData?.noOfdays)

    try {
      const result = await generateTrip(FINAL_PROMPT)
      console.log('Raw result:', result)
      console.log('Result type:', typeof result)
      
      // Check if result is already an object or needs parsing
      let tripData
      if (typeof result === 'string') {
        tripData = JSON.parse(result)
      } else if (typeof result === 'object') {
        tripData = result
      } else {
        throw new Error('Invalid trip data format')
      }

      setLoading(false)
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
            What is your desire destination?
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

      <div className='my-10 justify-end flex'>
        <Button disabled={loading} onClick={onGenerateTrip}>
          {loading ? <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' /> : 'Generate Trip'}
        </Button>
      </div>

      {/* Shared Auth Dialog (BE email/password + FE Google via AuthContext) */}
      <AuthDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSuccess={() => { setOpenDialog(false); onGenerateTrip(); }}
      />
    </div>
  )
}

export default CreateTrip
