import React from 'react'
import { Clock } from 'lucide-react'
import ActivityCard from './ActivityCard'

function TimeSlotSection({ 
  title, 
  timeRange, 
  activities, 
  icon, 
  dateKey,
  onActivityClick, 
  onRemoveActivity 
}) {
  const iconMap = {
    Morning: '🌅',
    Lunch: '🍽️',
    Afternoon: '☀️',
    Evening: '🌆'
  }

  const colorMap = {
    Morning: 'from-amber-50 to-yellow-50 border-amber-200',
    Lunch: 'from-green-50 to-emerald-50 border-green-200',
    Afternoon: 'from-blue-50 to-cyan-50 border-blue-200',
    Evening: 'from-purple-50 to-pink-50 border-purple-200'
  }

  if (!activities || activities.length === 0) return null

  return (
    <div className='mb-4'>
      <div className={`bg-gradient-to-r ${colorMap[title]} border-l-4 px-4 py-2 rounded-lg mb-3`}>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>{iconMap[title]}</span>
          <h4 className='font-semibold text-lg'>{title}</h4>
          <Clock className='h-4 w-4 text-gray-500 ml-auto' />
          <span className='text-sm text-gray-600'>{timeRange}</span>
        </div>
      </div>

      <div className='space-y-2 pl-4'>
        {activities.map((activity) => (
          <div key={activity.id}>
            <div className='text-xs text-gray-500 mb-1 flex items-center gap-1'>
              <Clock className='h-3 w-3' />
              {activity.TimeSlot}
            </div>
            <ActivityCard
              activity={activity}
              onClick={() => onActivityClick(activity)}
              onRemove={() => onRemoveActivity(dateKey, activity.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default TimeSlotSection