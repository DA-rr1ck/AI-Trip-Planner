import React, { useEffect, useState } from 'react'
import Select from 'react-select';
import Input from '../components/ui/Input';
import { AI_PROMPT, SelectBudgetOptions } from '../constants/options';
import { SelectTravelesList } from '../constants/options';
import Button from '../components/ui/Button';
import { toast } from 'sonner';
import { generateTrip } from '../service/AIModel';
import { FcGoogle } from "react-icons/fc";
import axios from 'axios';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { doc, setDoc } from "firebase/firestore"; 
import { db } from '../service/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useGoogleLogin } from '@react-oauth/google';
function CreateTrip() {
  const [place, setPlace] = useState();
  const [formData, setFormData] = useState([]);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const[openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleInputChange = (name, value) => {
    setFormData({...formData, [name]: value})
  }

  const login = useGoogleLogin({
    onSuccess:(codeResp)=> GetUserProfile(codeResp),
    onError:(error)=> console.log('Login Failed:', error)
  })

  const onGenerateTrip = async () => {
    const user =  localStorage.getItem('user');
    if(!user) {
      setOpenDialog(true);
      return;
    }
    if (formData.noOfdays < 1 || formData.noOfdays > 5) {
      toast.error('Please enter a valid number of days (1-5).', { duration: 1000 });
      return;
}
setErrorMessage('');
if(!formData.location || !formData.noOfdays || !formData.budget || !formData.traveler) {
  toast.error('Please fill all the fields.', { duration: 1000 });
  return;
}
console.log("Generating trip with data:", formData);
setLoading(true);
const FINAL_PROMPT = AI_PROMPT
.replace('{location}', formData?.location)
.replace('{totalDays}', formData?.noOfdays)
.replace('{traveler}', formData?.traveler)
.replace('{budget}', formData?.budget)
.replace('{totalDays}', formData?.noOfdays);
console.log(FINAL_PROMPT);
try {
  const result = await generateTrip(FINAL_PROMPT);
  console.log(result);
  setLoading(false);
  SaveAITrip(result);
} catch (error) {
  toast.error('Failed to generate trip. Please try again.', { duration: 2000 });
  console.error(error);
}
  }

  const SaveAITrip=async(TripData) => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('user'));
    const docId =Date.now().toString();
    await setDoc(doc(db, "AITrips", docId), {
      userSelection: formData,
      tripData: TripData,
      userEmail: user?.email,
      id:docId
}); 
    setLoading(false);
    navigate(`/view-trip/${docId}`);
    toast.success('Trip saved successfully!', { duration: 1000 });
  }

  const GetUserProfile=(tokenInfo) => {
    axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo?.access_token}`,{
      headers:{
        Authorization:`Bearer ${tokenInfo?.access_token}`,
        Accept:'application/json'
      }
    }).then((res)=>{
      console.log(res);
      localStorage.setItem('user', JSON.stringify(res.data));
      setOpenDialog(false);
      onGenerateTrip();
    })
  }
  useEffect(() => {
    console.log(formData)
  }, [formData])

  // Fetch places from Nominatim with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (inputValue.length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${inputValue}`)
          .then(res => res.json())
          .then(data => {
            const results = data.map(item => ({
              label: item.display_name,
              value: item
            }));
            setOptions(results);
          });
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [inputValue]);

  return (
    <div className='sm:px-10 md:px-32 lg:px-56 xl:px-10 px-5 mt-10'>
      <h2 className='font-bold text-3xl'> 
        Tell us your travel preferences 🏕️🌴
      </h2>
      <p className='mt-3 text-gray-500 text-xl'>Just provide some basic information, and our trip planner will generate a customized itinerary based on your preferences </p>
      <div className='mt-20 flex flex-col gap-10'>
        <div> 
          <h2 className='text-xl my-3 font-medium'>
            What is your desire destination?
          </h2>
          <Select
            options={options}
            value={place}
            onChange={(v) => { 
              setPlace(v); 
              handleInputChange('location', v?.label);
              console.log(v); 
            }}
            onInputChange={setInputValue}
            placeholder="Search for a location..."
          />
        </div>
      </div>
      <div>
        <h2 className='text-xl my-3 font-medium'>
          How many days are you planning your trip?
        </h2>
        <Input
          placeholder={'Ex.3'}
          type="number"
          onChange={(e) => handleInputChange('noOfdays', e.target.value)}
        />
        {errorMessage && (
          <div className="text-red-500 mt-2">{errorMessage}</div>
        )}
      </div>
      <div>
        <h2 className='text-xl my-3 font-medium'>
          What is your budget?
        </h2>
        <div className='grid sm:grid-cols-3 mt-5 gap-5'>
          {SelectBudgetOptions.map((item, index) => (
            <div key={index} className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg
              ${formData.budget === item.title ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => handleInputChange('budget', item.title)}> 
              <h2 className='text-4xl'> {item.icon}</h2>
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
            <div key={index}
              onClick={() => handleInputChange('traveler', item.title)} 
              className={`p-4 cursor-pointer border rounded-lg hover:shadow-lg
                ${formData.traveler === item.title ? 'border-blue-500 bg-blue-50' : ''}`}> 
              <h2 className='text-4xl'> {item.icon}</h2>
              <h2 className='font-bold text-lg'>{item.title}</h2>
              <h2 className='text-sm text-gray-500'>{item.desc}</h2>
            </div>
          ))}
        </div>
      </div>
      <div className='my-10 justify-end flex'>
        <Button 
        disabled={loading}
        onClick={onGenerateTrip}>
         {loading? <AiOutlineLoading3Quarters className='h-7 w-7 animate-spin' />:'Generate Trip'}
          
        </Button>
      </div>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
  
  <DialogContent>
    <DialogHeader>
      
      <DialogDescription>
        <img src="/webicon.jpg" height={40} width={63}></img>
        <h2 className='font-bold text-lg mt-7'>Sign in with Google</h2>
        <p>Sign in to the app with Google authentication</p>
        <Button 
        onClick={login}
        className='w-full mt-5 flex gap-4 items-center'>
        <FcGoogle className='h-7 w-7' /> Sign in with Google</Button>
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
    </div>
  )
}

export default CreateTrip