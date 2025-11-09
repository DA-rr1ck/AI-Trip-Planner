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
import { useGoogleLogin } from '@react-oauth/google'
import { db } from '@/service/firebaseConfig'
import { doc, setDoc } from 'firebase/firestore'
import axios from 'axios'

function CreateTrip() {
  const [place, setPlace] = useState(null)
  const [formData, setFormData] = useState({})
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // FE Google OAuth -> localStorage user
  const GetUserProfile = (tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`, {
      headers: { Authorization: `Bearer ${tokenInfo?.access_token}`, Accept: 'application/json' }
    })
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.data))
        setOpenDialog(false)
        onGenerateTrip() // continue flow after sign-in
      })
      .catch(() => {
        toast.error('Google sign-in failed')
      })
  }

  const login = useGoogleLogin({
    onSuccess: (codeResp) => GetUserProfile(codeResp),
    onError: () => toast.error('Google sign-in failed')
  })

  const SaveAITrip = async (TripData) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
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
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
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
      const newId = await SaveAITrip(result)
      toast.success('Trip saved successfully!', { duration: 1000 })
      navigate(`/view-trip/${newId}`)
    } catch (error) {
      console.error(error)
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
    <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
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

      {/* Combined Auth Dialog: BE email/password + FE Google */}
      <AuthDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        googleLogin={login}
        onSuccess={() => { setOpenDialog(false); onGenerateTrip(); }}
      />
    </div>
  )
}

export default CreateTrip
