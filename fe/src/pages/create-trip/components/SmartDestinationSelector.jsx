import React from 'react'
import Select from 'react-select'
import { VIETNAM_PROVINCES } from '@/constants/options'

const SMART_LOCATION_OPTIONS = VIETNAM_PROVINCES.map(province => ({
  value: province,
  label: province
}))

function SmartDestinationSelector({ 
  generationMethod, 
  place, 
  setPlace, 
  handleLocationChange,
  options,
  inputValue,
  setInputValue
}) {
  return (
    <div>
      <h2 className='text-xl my-3 font-medium'>
        What is your desired destination?
      </h2>
      
      {generationMethod === 'smart' ? (
        <>
          <Select
            options={SMART_LOCATION_OPTIONS}
            value={place}
            onChange={(option) => {
              setPlace(option)
              handleLocationChange(option?.value || '')
            }}
            placeholder='Select a destination from our database...'
            className='w-full'
          />
          <p className='text-xs text-purple-600 mt-2 flex items-center gap-1'>
            <span>✨</span>
            Smart trips only include destinations with verified data in our database
          </p>
        </>
      ) : (
        <>
          <Select
            options={options}
            value={place}
            onChange={(value) => {
              setPlace(value)
              handleLocationChange(value?.label || '')
            }}
            onInputChange={setInputValue}
            placeholder='Search for any location worldwide...'
          />
          <p className='text-xs text-blue-600 mt-2 flex items-center gap-1'>
            <span>🤖</span>
            AI will generate recommendations for any location you search
          </p>
        </>
      )}
    </div>
  )
}

export default SmartDestinationSelector