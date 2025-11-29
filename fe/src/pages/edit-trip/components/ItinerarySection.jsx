// fe/src/pages/edit-trip/components/ItinerarySection.jsx
import React, { useState } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Sparkles, Loader2, ChevronUp } from 'lucide-react'
import DayCard from './DayCard'

function ItinerarySection({ 
  dateKeys,
  itinerary,
  allActivityIds,
  onRemoveDay,
  onActivityClick,
  onRemoveActivity,
  onRegenerateSingleDay,
  sensors,
  onDragStart,
  onDragEnd
}) {
  const [expandedDay, setExpandedDay] = useState(null)
  const [dayPreferences, setDayPreferences] = useState({})
  const [regeneratingDays, setRegeneratingDays] = useState({})

  const handleRegenerateDay = async (dateKey) => {
    const preference = dayPreferences[dateKey]
    if (!preference?.trim()) {
      return
    }

    setRegeneratingDays(prev => ({ ...prev, [dateKey]: true }))
    try {
      await onRegenerateSingleDay(dateKey, preference)
      setDayPreferences(prev => ({ ...prev, [dateKey]: '' }))
      setExpandedDay(null)
    } finally {
      setRegeneratingDays(prev => ({ ...prev, [dateKey]: false }))
    }
  }

  return (
    <div className='mb-8'>
      <h2 className='font-bold text-2xl mb-4'>Daily Itinerary</h2>
      <p className='text-sm text-gray-600 mb-4'>
        💡 Click on any day to customize its activities with your preferences
      </p>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={[...allActivityIds, ...dateKeys]} strategy={verticalListSortingStrategy}>
          {dateKeys.map((dateKey) => (
            <DayCard
              key={dateKey}
              dateKey={dateKey}
              dayData={itinerary[dateKey]}
              onRemoveDay={onRemoveDay}
              onActivityClick={onActivityClick}
              onRemoveActivity={onRemoveActivity}
            >
              {/* Per-Day Regeneration Section - passed as first child */}
              <div className='mb-4'>
                <button
                  onClick={() => setExpandedDay(expandedDay === dateKey ? null : dateKey)}
                  className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium'
                >
                  {expandedDay === dateKey ? (
                    <>
                      <ChevronUp className='h-4 w-4' />
                      Hide Customization
                    </>
                  ) : (
                    <>
                      <Sparkles className='h-4 w-4' />
                      Customize This Day
                    </>
                  )}
                </button>

                {expandedDay === dateKey && (
                  <div className='mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200'>
                    <p className='text-sm text-gray-700 mb-3'>
                      ✨ Tell us what you'd like to do differently for this day
                    </p>
                    <div className='flex gap-2'>
                      <Input
                        placeholder='e.g., "More outdoor activities" or "Include a cooking class" or "Visit local markets"'
                        value={dayPreferences[dateKey] || ''}
                        onChange={(e) => setDayPreferences(prev => ({ 
                          ...prev, 
                          [dateKey]: e.target.value 
                        }))}
                        disabled={regeneratingDays[dateKey]}
                        onKeyDown={(e) => e.key === 'Enter' && handleRegenerateDay(dateKey)}
                      />
                      <Button
                        onClick={() => handleRegenerateDay(dateKey)}
                        disabled={regeneratingDays[dateKey] || !dayPreferences[dateKey]?.trim()}
                        className='whitespace-nowrap'
                      >
                        {regeneratingDays[dateKey] ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Sparkles className='mr-2 h-4 w-4' />
                            Update Day
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DayCard>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default ItinerarySection



/*
import React, { useState } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/input'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import DayCard from './DayCard'
import ActivityCard from './ActivityCard'

function ItinerarySection({ 
  dateKeys,
  itinerary,
  allActivityIds,
  onRemoveDay,
  onActivityClick,
  onRemoveActivity,
  onRegenerateSingleDay,
  sensors,
  onDragStart,
  onDragEnd
}) {
  const [expandedDay, setExpandedDay] = useState(null)
  const [dayPreferences, setDayPreferences] = useState({})
  const [regeneratingDays, setRegeneratingDays] = useState({})

  const handleRegenerateDay = async (dateKey) => {
    const preference = dayPreferences[dateKey]
    if (!preference?.trim()) {
      return
    }

    setRegeneratingDays(prev => ({ ...prev, [dateKey]: true }))
    try {
      await onRegenerateSingleDay(dateKey, preference)
      setDayPreferences(prev => ({ ...prev, [dateKey]: '' }))
      setExpandedDay(null)
    } finally {
      setRegeneratingDays(prev => ({ ...prev, [dateKey]: false }))
    }
  }

  return (
    <div className='mb-8'>
      <h2 className='font-bold text-2xl mb-4'>Daily Itinerary</h2>
      <p className='text-sm text-gray-600 mb-4'>
        💡 Click on any day to customize its activities with your preferences
      </p>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={[...allActivityIds, ...dateKeys]} strategy={verticalListSortingStrategy}>
          {dateKeys.map((dateKey) => (
            <div key={dateKey} className='mb-6'>
              
              <DayCard
                dateKey={dateKey}
                dayData={itinerary[dateKey]}
                onRemoveDay={onRemoveDay}
              >
                
                <div className='mb-4'>
                  <button
                    onClick={() => setExpandedDay(expandedDay === dateKey ? null : dateKey)}
                    className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium'
                  >
                    {expandedDay === dateKey ? (
                      <>
                        <ChevronUp className='h-4 w-4' />
                        Hide Customization
                      </>
                    ) : (
                      <>
                        <Sparkles className='h-4 w-4' />
                        Customize This Day
                      </>
                    )}
                  </button>

                  {expandedDay === dateKey && (
                    <div className='mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200'>
                      <p className='text-sm text-gray-700 mb-3'>
                        ✨ Tell us what you'd like to do differently for this day
                      </p>
                      <div className='flex gap-2'>
                        <Input
                          placeholder='e.g., "More outdoor activities" or "Include a cooking class" or "Visit local markets"'
                          value={dayPreferences[dateKey] || ''}
                          onChange={(e) => setDayPreferences(prev => ({ 
                            ...prev, 
                            [dateKey]: e.target.value 
                          }))}
                          disabled={regeneratingDays[dateKey]}
                          onKeyDown={(e) => e.key === 'Enter' && handleRegenerateDay(dateKey)}
                        />
                        <Button
                          onClick={() => handleRegenerateDay(dateKey)}
                          disabled={regeneratingDays[dateKey] || !dayPreferences[dateKey]?.trim()}
                          className='whitespace-nowrap'
                        >
                          {regeneratingDays[dateKey] ? (
                            <>
                              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Sparkles className='mr-2 h-4 w-4' />
                              Update Day
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              
                {itinerary[dateKey].Activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onClick={() => onActivityClick(activity)}
                    onRemove={() => onRemoveActivity(dateKey, activity.id)}
                  />
                ))}
              </DayCard>
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default ItinerarySection

*/


