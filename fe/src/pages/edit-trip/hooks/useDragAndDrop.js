// fe/src/pages/edit-trip/hooks/useDragAndDrop.js
import { useState } from 'react'
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { createScheduleTimestamps } from '@/utils/dateTimeUtils'

export function useDragAndDrop(tripData, updateTripData) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Helper to calculate new TimeSlot based on slot and position
  const calculateNewTimeSlot = (dateKey, slot, index, totalActivities) => {
    const dayData = tripData.tripData.Itinerary[dateKey]
    const slotData = dayData[slot]
    
    if (!slotData) return null
    
    const startTime = slotData.StartTime
    const endTime = slotData.EndTime
    
    // Parse time string to hours
    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
      if (!match) return 0
      
      let hours = parseInt(match[1])
      const minutes = match[2] ? parseInt(match[2]) : 0
      const period = match[3].toUpperCase()
      
      if (period === 'PM' && hours !== 12) hours += 12
      if (period === 'AM' && hours === 12) hours = 0
      
      return hours + (minutes / 60)
    }
    
    // Format hours back to time string
    const formatTime = (hours) => {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      const period = h >= 12 ? 'PM' : 'AM'
      const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h)
      return `${displayHour}${m > 0 ? ':' + m.toString().padStart(2, '0') : ''} ${period}`
    }
    
    const start = parseTime(startTime)
    const end = parseTime(endTime)
    const duration = end - start
    
    // If only one activity, use full slot
    if (totalActivities === 1) {
      return `${startTime} - ${endTime}`
    }
    
    // Divide evenly
    const timePerActivity = duration / totalActivities
    const activityStart = start + (timePerActivity * index)
    const activityEnd = activityStart + timePerActivity
    
    return `${formatTime(activityStart)} - ${formatTime(activityEnd)}`
  }

  // Helper function to find which day and time slot an activity belongs to
  const findActivityLocation = (activityId) => {
    for (const [dateKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
      if (dayData.Morning?.Activities) {
        const index = dayData.Morning.Activities.findIndex(a => a.id === activityId)
        if (index !== -1) {
          return { dateKey, slot: 'Morning', index, activity: dayData.Morning.Activities[index] }
        }
      }
      
      if (dayData.Lunch?.Activity?.id === activityId) {
        return { dateKey, slot: 'Lunch', index: 0, activity: dayData.Lunch.Activity }
      }
      
      if (dayData.Afternoon?.Activities) {
        const index = dayData.Afternoon.Activities.findIndex(a => a.id === activityId)
        if (index !== -1) {
          return { dateKey, slot: 'Afternoon', index, activity: dayData.Afternoon.Activities[index] }
        }
      }
      
      if (dayData.Evening?.Activities) {
        const index = dayData.Evening.Activities.findIndex(a => a.id === activityId)
        if (index !== -1) {
          return { dateKey, slot: 'Evening', index, activity: dayData.Evening.Activities[index] }
        }
      }
    }
    return null
  }

  const findActivityById = (activityId) => {
    for (const [dateKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
      if (dayData.Morning?.Activities) {
        const activity = dayData.Morning.Activities.find(a => a.id === activityId)
        if (activity) return activity
      }
      if (dayData.Lunch?.Activity?.id === activityId) {
        return dayData.Lunch.Activity
      }
      if (dayData.Afternoon?.Activities) {
        const activity = dayData.Afternoon.Activities.find(a => a.id === activityId)
        if (activity) return activity
      }
      if (dayData.Evening?.Activities) {
        const activity = dayData.Evening.Activities.find(a => a.id === activityId)
        if (activity) return activity
      }
    }
    return null
  }

  const handleDragStart = (event) => {
    const activityId = event.active.id
    const activity = findActivityById(activityId)
    
    if (activity?.ActivityType === 'hotel_checkin' || activity?.ActivityType === 'hotel_checkout') {
      toast.error('Hotel check-in/out activities cannot be moved', {
        duration: 2000
      })
      return
    }
    
    setActiveId(activityId)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeLocation = findActivityLocation(active.id)
    let overLocation = findActivityLocation(over.id)
    
    if (!activeLocation || !overLocation) return
    
    if (activeLocation.activity?.ActivityType === 'hotel_checkin' || 
        activeLocation.activity?.ActivityType === 'hotel_checkout') {
      toast.error('Hotel check-in/out activities cannot be moved')
      return
    }

    const newItinerary = { ...tripData.tripData.Itinerary }

    // Same day and same slot - reorder
    if (activeLocation.dateKey === overLocation.dateKey && 
        activeLocation.slot === overLocation.slot) {
      
      const slot = activeLocation.slot
      
      if (slot === 'Lunch') {
        return
      }
      
      const slotActivities = [...newItinerary[activeLocation.dateKey][slot].Activities]
      const oldIndex = slotActivities.findIndex(a => a.id === active.id)
      const newIndex = slotActivities.findIndex(a => a.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedActivities = arrayMove(slotActivities, oldIndex, newIndex)
        
        // UPDATE TimeSlots for all activities in this slot
        const updatedActivities = reorderedActivities.map((activity, idx) => ({
          ...activity,
          TimeSlot: calculateNewTimeSlot(activeLocation.dateKey, slot, idx, reorderedActivities.length)
        }))
        
        newItinerary[activeLocation.dateKey] = {
          ...newItinerary[activeLocation.dateKey],
          [slot]: {
            ...newItinerary[activeLocation.dateKey][slot],
            Activities: updatedActivities
          }
        }
      }
    } 
    // Different slot or different day - move
    else {
      const sourceSlot = activeLocation.slot
      const sourceActivitiesCount = sourceSlot === 'Lunch' 
        ? 1 
        : (newItinerary[activeLocation.dateKey][sourceSlot]?.Activities?.length || 0)
      
      if (sourceActivitiesCount === 1) {
        toast.error(`Cannot move the last activity from ${sourceSlot}. Each time slot must have at least one activity.`, {
          duration: 3000
        })
        return
      }

      // Remove from source
      if (sourceSlot === 'Lunch') {
        newItinerary[activeLocation.dateKey] = {
          ...newItinerary[activeLocation.dateKey],
          Lunch: {
            ...newItinerary[activeLocation.dateKey].Lunch,
            Activity: undefined
          }
        }
      } else {
        const sourceActivities = [...newItinerary[activeLocation.dateKey][sourceSlot].Activities]
        sourceActivities.splice(activeLocation.index, 1)
        
        // UPDATE TimeSlots for remaining activities in source slot
        const updatedSourceActivities = sourceActivities.map((activity, idx) => ({
          ...activity,
          TimeSlot: calculateNewTimeSlot(activeLocation.dateKey, sourceSlot, idx, sourceActivities.length)
        }))
        
        newItinerary[activeLocation.dateKey] = {
          ...newItinerary[activeLocation.dateKey],
          [sourceSlot]: {
            ...newItinerary[activeLocation.dateKey][sourceSlot],
            Activities: updatedSourceActivities
          }
        }
      }
      
      // Add to destination
      const targetSlot = overLocation.slot
      
      if (targetSlot === 'Lunch') {
        const newTimeSlot = calculateNewTimeSlot(overLocation.dateKey, targetSlot, 0, 1)
        
        newItinerary[overLocation.dateKey] = {
          ...newItinerary[overLocation.dateKey],
          Lunch: {
            ...newItinerary[overLocation.dateKey].Lunch,
            Activity: {
              ...activeLocation.activity,
              id: `${overLocation.dateKey}-lunch-${Date.now()}-${Math.random()}`,
              TimeSlot: newTimeSlot
            }
          }
        }
      } else {
        const targetActivities = [...(newItinerary[overLocation.dateKey][targetSlot]?.Activities || [])]
        
        const overIndex = targetActivities.findIndex(a => a.id === over.id)
        const insertIndex = overIndex !== -1 ? overIndex : targetActivities.length
        
        // Insert activity WITHOUT TimeSlot first
        targetActivities.splice(insertIndex, 0, {
          ...activeLocation.activity,
          id: `${overLocation.dateKey}-${targetSlot.toLowerCase()}-${Date.now()}-${Math.random()}`
        })
        
        // UPDATE TimeSlots for ALL activities in target slot
        const updatedTargetActivities = targetActivities.map((activity, idx) => {
          const newTimeSlot = calculateNewTimeSlot(overLocation.dateKey, targetSlot, idx, targetActivities.length)
          const { ScheduleStart, ScheduleEnd } = createScheduleTimestamps(
            overLocation.dateKey, 
            newTimeSlot, 
            tripData.tripData.Timezone || 'Asia/Ho_Chi_Minh'
          )
          
          return {
            ...activity,
            TimeSlot: newTimeSlot,
            ScheduleStart,
            ScheduleEnd
          }
        })
        
        newItinerary[overLocation.dateKey] = {
          ...newItinerary[overLocation.dateKey],
          [targetSlot]: {
            ...newItinerary[overLocation.dateKey][targetSlot],
            Activities: updatedTargetActivities
          }
        }
      }
    }

    const updatedData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }

    updateTripData(updatedData)
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}