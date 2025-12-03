// fe/src/pages/edit-trip/components/TimeSlotSection.jsx
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

  // Calculate time based on position in the slot
  const getActivityTime = (index, totalActivities) => {
    const slotTimes = {
      Morning: { start: 8, duration: 4 }, // 8 AM - 12 PM (4 hours)
      Lunch: { start: 12, duration: 1.5 }, // 12 PM - 1:30 PM (1.5 hours)
      Afternoon: { start: 13.5, duration: 4.5 }, // 1:30 PM - 6 PM (4.5 hours)
      Evening: { start: 18, duration: 4 } // 6 PM - 10 PM (4 hours)
    }
    
    const { start, duration } = slotTimes[title]
    
    // If only one activity, use the full slot time
    if (totalActivities === 1) {
      const formatTime = (hours) => {
        const h = Math.floor(hours)
        const m = Math.round((hours - h) * 60)
        const period = h >= 12 ? 'PM' : 'AM'
        const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
        return `${displayHour}${m > 0 ? ':' + m.toString().padStart(2, '0') : ''} ${period}`
      }
      return `${formatTime(start)} - ${formatTime(start + duration)}`
    }
    
    // Divide time slot evenly among activities
    const timePerActivity = duration / totalActivities
    const activityStart = start + (timePerActivity * index)
    const activityEnd = activityStart + timePerActivity
    
    const formatTime = (hours) => {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      const period = h >= 12 ? 'PM' : 'AM'
      const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
      return `${displayHour}${m > 0 ? ':' + m.toString().padStart(2, '0') : ''} ${period}`
    }
    
    return `${formatTime(activityStart)} - ${formatTime(activityEnd)}`
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
        {activities.map((activity, index) => (
          <div key={activity.id}>
            {/* Show position-based calculated time */}
            <div className='text-xs text-gray-500 mb-1 flex items-center gap-1'>
              <Clock className='h-3 w-3' />
              <span className='font-medium'>{getActivityTime(index, activities.length)}</span>
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