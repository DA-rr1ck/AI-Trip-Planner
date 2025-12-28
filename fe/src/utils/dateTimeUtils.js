// fe/src/utils/dateTimeUtils.js
import { Timestamp } from 'firebase/firestore'

/**
 * Parse time string like "2:00 PM" to { hours, minutes }
 */
export function parseTimeToObject(timeStr) {
  if (!timeStr) return { hours: 0, minutes: 0 }
  
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
  if (!match) return { hours: 0, minutes: 0 }
  
  let hours = parseInt(match[1])
  const minutes = match[2] ? parseInt(match[2]) : 0
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  
  return { hours, minutes }
}

/**
 * Parse time string to Date object
 */
function parseTimeToDate(timeStr, baseDate) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) throw new Error('Invalid time format')
  
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  
  const result = new Date(baseDate)
  result.setHours(hours, minutes, 0, 0)
  
  return result
}

/**
 * Convert TimeSlot and date to ISO date strings
 * @param {string} dateKey - Format: "2025-12-04"
 * @param {string} timeSlot - Format: "2:00 PM - 5:30 PM"
 * @param {string} timezone - Format: "Asia/Ho_Chi_Minh"
 * @returns {{ ScheduleStart: string, ScheduleEnd: string }} - ISO date strings
 */
export function createScheduleTimestamps(dateKey, timeSlot, timezone = 'Asia/Ho_Chi_Minh') {
  if (!dateKey || !timeSlot) {
    return { ScheduleStart: null, ScheduleEnd: null }
  }

  const match = timeSlot.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i)
  
  if (!match) {
    console.warn('Invalid time slot format:', timeSlot)
    return { ScheduleStart: null, ScheduleEnd: null }
  }

  try {
    const startTimeStr = `${match[1]}:${match[2] || '00'} ${match[3] || 'AM'}`
    const endTimeStr = `${match[4]}:${match[5] || '00'} ${match[6] || 'PM'}`
    
    const baseDate = new Date(dateKey + 'T00:00:00')
    
    const startDate = parseTimeToDate(startTimeStr, baseDate)
    const endDate = parseTimeToDate(endTimeStr, baseDate)
    
    // Return ISO strings (serializable for API calls)
    return {
      ScheduleStart: startDate.toISOString(),
      ScheduleEnd: endDate.toISOString()
    }
  } catch (error) {
    console.error('Error creating schedule timestamps:', error)
    return { ScheduleStart: null, ScheduleEnd: null }
  }
}

/**
 * Add schedule timestamps to an activity
 */
export function addScheduleToActivity(activity, dateKey, timezone) {
  if (!activity.TimeSlot) {
    return activity
  }
  
  const { ScheduleStart, ScheduleEnd } = createScheduleTimestamps(
    dateKey, 
    activity.TimeSlot, 
    timezone
  )
  
  return {
    ...activity,
    ScheduleStart,
    ScheduleEnd
  }
}

/**
 * Add schedule timestamps to all activities in a day
 */
export function addScheduleToDayActivities(dayData, dateKey, timezone) {
  const processed = { ...dayData }
  
  // Process Morning activities
  if (dayData.Morning?.Activities) {
    processed.Morning = {
      ...dayData.Morning,
      Activities: dayData.Morning.Activities.map(activity => 
        addScheduleToActivity(activity, dateKey, timezone)
      )
    }
  }
  
  // Process Lunch activity
  if (dayData.Lunch?.Activity) {
    processed.Lunch = {
      ...dayData.Lunch,
      Activity: addScheduleToActivity(dayData.Lunch.Activity, dateKey, timezone)
    }
  }
  
  // Process Afternoon activities
  if (dayData.Afternoon?.Activities) {
    processed.Afternoon = {
      ...dayData.Afternoon,
      Activities: dayData.Afternoon.Activities.map(activity => 
        addScheduleToActivity(activity, dateKey, timezone)
      )
    }
  }
  
  // Process Evening activities
  if (dayData.Evening?.Activities) {
    processed.Evening = {
      ...dayData.Evening,
      Activities: dayData.Evening.Activities.map(activity => 
        addScheduleToActivity(activity, dateKey, timezone)
      )
    }
  }
  
  return processed
}

/**
 * Add schedule timestamps to entire itinerary
 */
export function addScheduleToItinerary(itinerary, timezone = 'Asia/Ho_Chi_Minh') {
  const processed = {}
  
  Object.entries(itinerary).forEach(([dateKey, dayData]) => {
    processed[dateKey] = addScheduleToDayActivities(dayData, dateKey, timezone)
  })
  
  return processed
}