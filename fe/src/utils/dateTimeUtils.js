// fe/src/utils/dateTimeUtils.js
import { Timestamp } from 'firebase/firestore'

/**
 * Parse time string like "2:00 PM" to { hours, minutes }
 */
export function parseTime(timeStr) {
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
 * Convert TimeSlot and date to Firebase Timestamps
 * @param {string} dateKey - Format: "2025-12-04"
 * @param {string} timeSlot - Format: "2:00 PM - 5:30 PM"
 * @param {string} timezone - Format: "Asia/Ho_Chi_Minh"
 * @returns {{ ScheduleStart: Timestamp, ScheduleEnd: Timestamp }}
 */
export function createScheduleTimestamps(dateKey, timeSlot, timezone = 'Asia/Ho_Chi_Minh') {
  if (!dateKey || !timeSlot) {
    return { ScheduleStart: null, ScheduleEnd: null }
  }

  // Parse the TimeSlot: "2:00 PM - 5:30 PM"
  const [startTimeStr, endTimeStr] = timeSlot.split('-').map(s => s.trim())
  
  const startTime = parseTime(startTimeStr)
  const endTime = parseTime(endTimeStr)
  
  // Create Date objects
  // dateKey format: "2025-12-04"
  const [year, month, day] = dateKey.split('-').map(Number)
  
  const startDate = new Date(year, month - 1, day, startTime.hours, startTime.minutes, 0)
  const endDate = new Date(year, month - 1, day, endTime.hours, endTime.minutes, 0)
  
  // Convert to Firebase Timestamps
  return {
    ScheduleStart: Timestamp.fromDate(startDate),
    ScheduleEnd: Timestamp.fromDate(endDate)
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