import React, { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import { Sparkles, Loader2, Users, DollarSign, Calendar, Search } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { getAvailableLocations } from '@/service/smartTripService'
import { VIETNAM_PROVINCES } from '@/constants/options'
function SmartTripForm({ onGenerate, loading }) {
  const [formData, setFormData] = useState({
    location: '',
    startDate: null,
    endDate: null,
    budgetMin: 500,
    budgetMax: 2000,
    adults: 2,
    children: 0,
    childrenAges: []
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Filter provinces based on search
  const filteredProvinces = VIETNAM_PROVINCES.filter(province =>
    province.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleChildrenChange = (newCount) => {
    const currentAges = formData.childrenAges || []
    const newAges = [...currentAges]
    
    if (newCount > formData.children) {
      for (let i = formData.children; i < newCount; i++) {
        newAges.push(5)
      }
    } else {
      newAges.splice(newCount)
    }
    
    setFormData({ ...formData, children: newCount, childrenAges: newAges })
  }

  const handleLocationSelect = (province) => {
    setFormData({ ...formData, location: province })
    setSearchTerm(province)
    setShowDropdown(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.location || !formData.startDate || !formData.endDate) {
      alert('Please fill in all required fields')
      return
    }
    
    onGenerate(formData)
  }

  const totalDays = formData.startDate && formData.endDate 
    ? differenceInDays(formData.endDate, formData.startDate) + 1 
    : 0

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className='bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-200'>
        <div className='flex items-center gap-3 mb-2'>
          <Sparkles className='h-8 w-8 text-purple-600' />
          <h1 className='text-3xl font-bold text-purple-900'>Smart Trip Generator</h1>
        </div>
        <p className='text-purple-700'>
          ⚡ Powered by our curated database + AI for better recommendations
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6 bg-white rounded-xl p-6 shadow-lg'>
        {/* Location Selection - Searchable */}
        <div className='relative'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            📍 Destination *
          </label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' />
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setFormData({ ...formData, location: '' })
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder='Search for a destination...'
              className='w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
              required
            />
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
              {filteredProvinces.length > 0 ? (
                filteredProvinces.map((province) => (
                  <button
                    key={province}
                    type='button'
                    onClick={() => handleLocationSelect(province)}
                    className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${
                      formData.location === province ? 'bg-purple-100 font-semibold' : ''
                    }`}
                  >
                    {province}
                  </button>
                ))
              ) : (
                <div className='px-4 py-3 text-gray-500 text-sm'>
                  No provinces found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}

          {formData.location && (
            <div className='mt-2 flex items-center gap-2'>
              <span className='text-xs text-green-600 font-medium'>
                ✓ Selected: {formData.location}
              </span>
            </div>
          )}
          
          <p className='text-xs text-gray-500 mt-1'>
            {VIETNAM_PROVINCES.length} provinces available in Vietnam
          </p>
        </div>

        {/* Dates */}
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <Calendar className='inline h-4 w-4 mr-1' />
              Start Date *
            </label>
            <DatePicker
              selected={formData.startDate}
              onChange={(date) => setFormData({ ...formData, startDate: date })}
              minDate={new Date()}
              dateFormat='dd/MM/yyyy'
              placeholderText='Select start date'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
              required
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <Calendar className='inline h-4 w-4 mr-1' />
              End Date *
            </label>
            <DatePicker
              selected={formData.endDate}
              onChange={(date) => setFormData({ ...formData, endDate: date })}
              minDate={formData.startDate || new Date()}
              dateFormat='dd/MM/yyyy'
              placeholderText='Select end date'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none'
              disabled={!formData.startDate}
              required
            />
          </div>
        </div>

        {totalDays > 0 && (
          <div className='p-3 bg-purple-50 rounded-lg text-purple-700 text-sm'>
            ✈️ Trip duration: {totalDays} day{totalDays > 1 ? 's' : ''}
          </div>
        )}

        {/* Budget */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            <DollarSign className='inline h-4 w-4 mr-1' />
            Budget per person
          </label>
          <div className='p-4 bg-green-50 rounded-lg'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-2xl font-bold text-green-700'>
                ${formData.budgetMin} - ${formData.budgetMax}
              </span>
            </div>
            <div className='space-y-3'>
              <div>
                <label className='text-xs text-gray-600'>Min: ${formData.budgetMin}</label>
                <input
                  type='range'
                  min='100'
                  max='5000'
                  step='100'
                  value={formData.budgetMin}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val < formData.budgetMax) {
                      setFormData({ ...formData, budgetMin: val })
                    }
                  }}
                  className='w-full'
                />
              </div>
              <div>
                <label className='text-xs text-gray-600'>Max: ${formData.budgetMax}</label>
                <input
                  type='range'
                  min='100'
                  max='5000'
                  step='100'
                  value={formData.budgetMax}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val > formData.budgetMin) {
                      setFormData({ ...formData, budgetMax: val })
                    }
                  }}
                  className='w-full'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Travelers */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='p-4 bg-blue-50 rounded-lg'>
            <label className='block text-sm font-medium text-gray-700 mb-3'>
              <Users className='inline h-4 w-4 mr-1' />
              Adults (18+)
            </label>
            <div className='flex items-center justify-center gap-4'>
              <button
                type='button'
                onClick={() => setFormData({ ...formData, adults: Math.max(1, formData.adults - 1) })}
                className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors'
              >
                -
              </button>
              <span className='text-3xl font-bold text-blue-700'>{formData.adults}</span>
              <button
                type='button'
                onClick={() => setFormData({ ...formData, adults: Math.min(10, formData.adults + 1) })}
                className='w-10 h-10 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors'
              >
                +
              </button>
            </div>
          </div>

          <div className='p-4 bg-pink-50 rounded-lg'>
            <label className='block text-sm font-medium text-gray-700 mb-3'>
              👶 Children (0-17)
            </label>
            <div className='flex items-center justify-center gap-4'>
              <button
                type='button'
                onClick={() => handleChildrenChange(Math.max(0, formData.children - 1))}
                className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors'
              >
                -
              </button>
              <span className='text-3xl font-bold text-pink-700'>{formData.children}</span>
              <button
                type='button'
                onClick={() => handleChildrenChange(Math.min(5, formData.children + 1))}
                className='w-10 h-10 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors'
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Children Ages */}
        {formData.children > 0 && (
          <div className='p-4 bg-purple-50 rounded-lg'>
            <label className='block text-sm font-medium text-gray-700 mb-3'>
              Ages of children
            </label>
            <div className='grid grid-cols-3 gap-3'>
              {Array.from({ length: formData.children }).map((_, idx) => (
                <div key={idx}>
                  <label className='text-xs text-gray-600'>Child {idx + 1}</label>
                  <select
                    value={formData.childrenAges[idx] || 5}
                    onChange={(e) => {
                      const newAges = [...formData.childrenAges]
                      newAges[idx] = Number(e.target.value)
                      setFormData({ ...formData, childrenAges: newAges })
                    }}
                    className='w-full px-2 py-2 border rounded-lg'
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i} value={i}>{i} years</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading || !formData.location || !formData.startDate || !formData.endDate}
          className='w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all'
        >
          {loading ? (
            <>
              <Loader2 className='h-5 w-5 animate-spin' />
              Generating your perfect trip...
            </>
          ) : (
            <>
              <Sparkles className='h-5 w-5' />
              Generate Smart Trip
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default SmartTripForm