import React, { useEffect, useState } from 'react'
import Select from 'react-select'

function DestinationSelector({ label = 'What is your destination?', onLocationSelected, value }) {
  const [options, setOptions] = useState([])
  const [inputValue, setInputValue] = useState('')

  // Debounced place search using OpenStreetMap Nominatim
  useEffect(() => {
    const t = setTimeout(() => {
      const q = (inputValue || '').trim()
      if (q.length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
          .then(r => r.json())
          .then(data => setOptions(data.map(item => ({ label: item.display_name, value: item }))))
          .catch(() => setOptions([]))
      }
    }, 500)
    return () => clearTimeout(t)
  }, [inputValue])

  return (
    <div>
      {label && (
        <h2 className='text-xl my-3 font-medium'>
          {label}
        </h2>
      )}
      <Select
        options={options}
        value={value}
        onChange={(v) => {
          onLocationSelected?.(v?.label, v)
        }}
        onInputChange={setInputValue}
        placeholder='Search for a location...'
      />
    </div>
  )
}

export default DestinationSelector
