import React from 'react'

function ModeSwitch({ isManualMode, onChange }) {
  return (
    <div className='flex justify-center mb-8'>
      <div className='inline-flex items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-full p-1.5 shadow-sm border border-gray-200'>
        <button
          onClick={() => onChange(true)}
          className={`px-8 py-2.5 rounded-full transition-all duration-200 font-medium ${
            isManualMode 
              ? 'bg-white shadow-md text-gray-900 scale-105' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => onChange(false)}
          className={`px-8 py-2.5 rounded-full transition-all duration-200 font-medium ${
            !isManualMode 
              ? 'bg-white shadow-md text-gray-900 scale-105' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          AI
        </button>
      </div>
    </div>
  )
}

export default ModeSwitch
