import React from 'react'
import { format, parse, differenceInDays } from 'date-fns'
import DatePicker from 'react-datepicker'
import Button from '@/components/ui/Button'
import { Edit, X, Minus, Plus, DollarSign, Sparkles, Loader2 } from 'lucide-react'
import { formatBudget, formatTravelers } from '../utils/formatters'

function TripOverview({ 
  tripData, 
  isEditingSelection,
  editedSelection,
  setEditedSelection,
  onEditSelection,
  onCancelEdit,
  onRegenerateAll,
  regeneratingAll,
  getTotalDays
}) {
  // Handle children count change with age array management
  const handleChildrenChange = (newCount) => {
    const currentCount = editedSelection.children || 0
    const currentAges = editedSelection.childrenAges || []
    
    if (newCount > currentCount) {
      // Adding children - add default ages
      const newAges = [...currentAges]
      for (let i = currentCount; i < newCount; i++) {
        newAges.push(5) // Default age
      }
      setEditedSelection({ ...editedSelection, children: newCount, childrenAges: newAges })
    } else {
      // Removing children - trim ages array
      const newAges = currentAges.slice(0, newCount)
      setEditedSelection({ ...editedSelection, children: newCount, childrenAges: newAges })
    }
  }

  // Handle individual child age change
  const handleChildAgeChange = (index, age) => {
    const newAges = [...(editedSelection.childrenAges || [])]
    newAges[index] = age
    setEditedSelection({ ...editedSelection, childrenAges: newAges })
  }

  return (
    <div className='mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200'>
      <div className='flex justify-between items-start mb-2'>
        <h2 className='font-bold text-2xl text-purple-900'>
          {tripData.tripData?.Location || tripData.userSelection?.location}
        </h2>
        {!isEditingSelection && (
          <Button 
            onClick={onEditSelection}
            variant='outline'
            size='sm'
            className='bg-white'
          >
            <Edit className='mr-2 h-4 w-4' />
            Edit Trip Details
          </Button>
        )}
      </div>

      {!isEditingSelection ? (
        <div className='flex flex-wrap gap-4 text-purple-700'>
          <span>📅 {format(parse(tripData.userSelection.startDate, 'yyyy-MM-dd', new Date()), 'MMM d')} - {format(parse(tripData.userSelection.endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}</span>
          <span>🗓️ {getTotalDays()} Days</span>
          <span>💰 {tripData.userSelection?.budget || formatBudget(tripData.userSelection?.budgetMin, tripData.userSelection?.budgetMax)}</span>
          <span>👤 {tripData.userSelection?.traveler || formatTravelers(tripData.userSelection?.adults, tripData.userSelection?.children)}</span>
        </div>
      ) : (
        <div className='mt-4 space-y-6'>
          {/* Date Range */}
          <div>
            <label className='block text-sm font-medium text-purple-900 mb-2'>
              Trip Dates
            </label>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-xs text-gray-600 mb-1'>Start Date</label>
                <DatePicker
                  selected={editedSelection.startDate}
                  onChange={(date) => setEditedSelection({ ...editedSelection, startDate: date })}
                  minDate={new Date()}
                  maxDate={editedSelection.endDate}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select start date"
                  className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-600 mb-1'>End Date</label>
                <DatePicker
                  selected={editedSelection.endDate}
                  onChange={(date) => setEditedSelection({ ...editedSelection, endDate: date })}
                  minDate={editedSelection.startDate || new Date()}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select end date"
                  className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
                  disabled={!editedSelection.startDate}
                />
              </div>
            </div>
            {editedSelection.startDate && editedSelection.endDate && (
              <p className='mt-2 text-sm text-purple-700'>
                ✈️ Trip duration: {differenceInDays(editedSelection.endDate, editedSelection.startDate) + 1} days
              </p>
            )}
          </div>

          {/* Budget Range Sliders */}
          <div className='p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50'>
            <div className='flex items-center gap-2 mb-3'>
              <DollarSign className='h-5 w-5 text-green-600' />
              <span className='text-lg font-bold text-green-700'>
                ${editedSelection.budgetMin?.toLocaleString()} - ${editedSelection.budgetMax?.toLocaleString()}
              </span>
              <span className='text-xs text-gray-600'>per person</span>
            </div>

            <div className='space-y-3'>
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Minimum: ${editedSelection.budgetMin?.toLocaleString()}
                </label>
                <input
                  type='range'
                  min='100'
                  max='10000'
                  step='100'
                  value={editedSelection.budgetMin}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val < editedSelection.budgetMax) {
                      setEditedSelection({ ...editedSelection, budgetMin: val })
                    }
                  }}
                  className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
                />
              </div>

              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Maximum: ${editedSelection.budgetMax?.toLocaleString()}
                </label>
                <input
                  type='range'
                  min='100'
                  max='10000'
                  step='100'
                  value={editedSelection.budgetMax}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val > editedSelection.budgetMin) {
                      setEditedSelection({ ...editedSelection, budgetMax: val })
                    }
                  }}
                  className='w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600'
                />
              </div>
            </div>
          </div>

          {/* Number of Travelers */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Adults */}
            <div className='p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h3 className='font-semibold'>Adults</h3>
                  <p className='text-xs text-gray-600'>Age 18+</p>
                </div>
                <span className='text-3xl'>👨‍💼</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => setEditedSelection({ ...editedSelection, adults: Math.max(0, editedSelection.adults - 1) })}
                  className='w-8 h-8 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={editedSelection.adults === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-2xl font-bold text-blue-700'>{editedSelection.adults}</span>
                
                <button
                  type='button'
                  onClick={() => setEditedSelection({ ...editedSelection, adults: Math.min(10, editedSelection.adults + 1) })}
                  className='w-8 h-8 rounded-full bg-white border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={editedSelection.adults === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className='p-4 border rounded-lg bg-gradient-to-br from-pink-50 to-rose-50'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <h3 className='font-semibold'>Children</h3>
                  <p className='text-xs text-gray-600'>Age 0-17</p>
                </div>
                <span className='text-3xl'>👶</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <button
                  type='button'
                  onClick={() => handleChildrenChange(Math.max(0, editedSelection.children - 1))}
                  className='w-8 h-8 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={editedSelection.children === 0}
                >
                  <Minus className='h-4 w-4' />
                </button>
                
                <span className='text-2xl font-bold text-pink-700'>{editedSelection.children}</span>
                
                <button
                  type='button'
                  onClick={() => handleChildrenChange(Math.min(10, editedSelection.children + 1))}
                  className='w-8 h-8 rounded-full bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors flex items-center justify-center'
                  disabled={editedSelection.children === 10}
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>

          {/* Children Ages Selection */}
          {editedSelection.children > 0 && (
            <div className='p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50'>
              <h3 className='font-semibold mb-3 flex items-center gap-2'>
                <span>👶</span>
                Ages of Children
              </h3>
              <p className='text-xs text-gray-600 mb-3'>
                Please select the age of each child at the time of travel (0-17 years)
              </p>
              
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
                {Array.from({ length: editedSelection.children }).map((_, index) => (
                  <div key={index} className='bg-white p-3 rounded-lg border border-purple-200'>
                    <label className='block text-xs font-medium text-gray-700 mb-1'>
                      Child {index + 1}
                    </label>
                    <select
                      value={editedSelection.childrenAges?.[index] ?? 5}
                      onChange={(e) => handleChildAgeChange(index, Number(e.target.value))}
                      className='w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm'
                    >
                      {Array.from({ length: 18 }, (_, i) => i).map((age) => (
                        <option key={age} value={age}>
                          {age} {age === 0 ? 'year' : age === 1 ? 'year' : 'years'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Summary */}
          <div className='p-3 bg-purple-100 border border-purple-300 rounded-lg'>
            <p className='text-sm text-purple-900 text-center'>
              👥 Total: <span className='font-semibold'>{formatTravelers(editedSelection.adults, editedSelection.children, editedSelection.childrenAges)}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex gap-2'>
            <Button 
              onClick={onRegenerateAll}
              disabled={regeneratingAll || (editedSelection.children > 0 && (!editedSelection.childrenAges || editedSelection.childrenAges.length !== editedSelection.children))}
            >
              {regeneratingAll ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Regenerate Entire Trip
                </>
              )}
            </Button>
            <Button 
              onClick={onCancelEdit}
              variant='outline'
            >
              <X className='mr-2 h-4 w-4' />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TripOverview