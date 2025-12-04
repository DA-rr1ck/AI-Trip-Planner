// fe/src/utils/activityUtils.js

/**
 * Generate unique activity ID
 * Format: {type}-{timestamp}-{random}
 */
export function generateActivityId(type = 'normal') {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return `${type}-${timestamp}-${random}`
  }
  
  /**
   * Add ActivityId and ActivityType to activities
   */
  export function addActivityMetadata(activity, type = 'normal_attraction') {
    return {
      ...activity,
      ActivityId: activity.ActivityId || generateActivityId(type),
      ActivityType: activity.ActivityType || type
    }
  }
  
  /**
   * Process itinerary to add metadata to all activities
   */
  export function processItineraryActivities(itinerary) {
    const processed = {}
    
    Object.entries(itinerary).forEach(([dateKey, dayData]) => {
      processed[dateKey] = {
        ...dayData,
        Morning: dayData.Morning ? {
          ...dayData.Morning,
          Activities: (dayData.Morning.Activities || []).map(activity => 
            addActivityMetadata(activity, activity.ActivityType || 'normal_attraction')
          )
        } : null,
        Lunch: dayData.Lunch ? {
          ...dayData.Lunch,
          Activity: dayData.Lunch.Activity 
            ? addActivityMetadata(dayData.Lunch.Activity, 'normal_attraction')
            : null
        } : null,
        Afternoon: dayData.Afternoon ? {
          ...dayData.Afternoon,
          Activities: (dayData.Afternoon.Activities || []).map(activity => 
            addActivityMetadata(activity, activity.ActivityType || 'normal_attraction')
          )
        } : null,
        Evening: dayData.Evening ? {
          ...dayData.Evening,
          Activities: (dayData.Evening.Activities || []).map(activity => 
            addActivityMetadata(activity, activity.ActivityType || 'normal_attraction')
          )
        } : null
      }
    })
    
    return processed
  }
  
  /**
   * Check if activity is a hotel check-in/out
   */
  export function isHotelActivity(activity) {
    return activity.ActivityType === 'hotel_checkin' || activity.ActivityType === 'hotel_checkout'
  }