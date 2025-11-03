import React from 'react'
import Button from '../ui/Button'
import { Link } from 'react-router-dom'

function Hero() {
  return (
    <div className='flex flex-col items-center mx-4 sm:mx-10 md:mx-32 lg:mx-56 gap-9'>
      <h1 className='font-extrabold text-[40px] sm:text-[50px] text-center mt-10'>
        <span className='text-[#f56551]'>Discover Your Next Adventure with AI </span>
        <br />
        Personalized Itinerary at Your Fingertips
      </h1>
      <p className='text-lg sm:text-xl text-gray-500 text-center max-w-3xl'>
        Your personal trip planner and travel curator, creating custom itineraries and budget
      </p>
      <Link to='/create-trip'>
        <Button>Get Started, It's Free</Button>
      </Link>
      <img 
        src='/landing3.jpg' 
        alt='Travel destinations'
        className='mt-5 rounded-xl shadow-2xl w-full max-w-5xl object-cover h-[300px] sm:h-[400px] md:h-[500px]'
      />
    </div>
  )
}

export default Hero