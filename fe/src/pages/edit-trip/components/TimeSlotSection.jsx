// fe/src/pages/edit-trip/components/TimeSlotSection.jsx
import React from 'react'
import { Clock } from 'lucide-react'
import ActivityCard from './ActivityCard'

function TimeSlotSection({ 
  title, 
  timeRange, 
  activities, 
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

  // Parse time string like "2:00 PM" to decimal hours (14.0)
  const parseTimeToHours = (timeStr) => {
    if (!timeStr) return 0
    
    const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
    if (!match) return 0
    
    let hours = parseInt(match[1])
    const minutes = match[2] ? parseInt(match[2]) : 0
    const period = match[3].toUpperCase()
    
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    
    return hours + (minutes / 60)
  }

  // Format decimal hours back to time string
  const formatTime = (hours) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
    return `${displayHour}${m > 0 ? ':' + m.toString().padStart(2, '0') : ''} ${period}`
  }

  // Calculate time based on position in the slot using ACTUAL timeRange
  const getActivityTime = (index, totalActivities) => {
    // Parse the actual start and end times from timeRange prop
    // Format is like "2:00 PM - 5:30 PM"
    const [startTimeStr, endTimeStr] = timeRange.split('-').map(s => s.trim())
    
    const start = parseTimeToHours(startTimeStr)
    const end = parseTimeToHours(endTimeStr)
    const duration = end - start
    
    // If only one activity, use the full slot time
    if (totalActivities === 1) {
      return timeRange // Return the original timeRange
    }
    
    // Divide time slot evenly among activities
    const timePerActivity = duration / totalActivities
    const activityStart = start + (timePerActivity * index)
    const activityEnd = activityStart + timePerActivity
    
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
            {/* Show position-based calculated time using actual timeRange */}
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