// fe/src/pages/edit-trip/hooks/useDragAndDrop.js
import { useState } from 'react'
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'

export function useDragAndDrop(tripData, updateTripData) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    // Helper function to find which day and time slot an activity belongs to
    const findActivityLocation = (activityId) => {
      for (const [dateKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
        // Check Morning
        if (dayData.Morning?.Activities) {
          const index = dayData.Morning.Activities.findIndex(a => a.id === activityId)
          if (index !== -1) {
            return { dateKey, slot: 'Morning', index, activity: dayData.Morning.Activities[index] }
          }
        }
        
        // Check Lunch
        if (dayData.Lunch?.Activity?.id === activityId) {
          return { dateKey, slot: 'Lunch', index: 0, activity: dayData.Lunch.Activity }
        }
        
        // Check Afternoon
        if (dayData.Afternoon?.Activities) {
          const index = dayData.Afternoon.Activities.findIndex(a => a.id === activityId)
          if (index !== -1) {
            return { dateKey, slot: 'Afternoon', index, activity: dayData.Afternoon.Activities[index] }
          }
        }
        
        // Check Evening
        if (dayData.Evening?.Activities) {
          const index = dayData.Evening.Activities.findIndex(a => a.id === activityId)
          if (index !== -1) {
            return { dateKey, slot: 'Evening', index, activity: dayData.Evening.Activities[index] }
          }
        }
      }
      return null
    }

    const activeLocation = findActivityLocation(active.id)
    let overLocation = findActivityLocation(over.id)
    
    // If dropping on a day card (not an activity), don't do anything
    if (!activeLocation || !overLocation) return

    const newItinerary = { ...tripData.tripData.Itinerary }

    // Same day and same slot - reorder
    if (activeLocation.dateKey === overLocation.dateKey && 
        activeLocation.slot === overLocation.slot) {
      
      const slot = activeLocation.slot
      
      if (slot === 'Lunch') {
        // Can't reorder a single lunch activity
        return
      }
      
      const slotActivities = [...newItinerary[activeLocation.dateKey][slot].Activities]
      const oldIndex = slotActivities.findIndex(a => a.id === active.id)
      const newIndex = slotActivities.findIndex(a => a.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        newItinerary[activeLocation.dateKey] = {
          ...newItinerary[activeLocation.dateKey],
          [slot]: {
            ...newItinerary[activeLocation.dateKey][slot],
            Activities: arrayMove(slotActivities, oldIndex, newIndex)
          }
        }
      }
    } 
    // Different slot or different day - move
    else {
      // NEW: Prevent moving if it's the last activity in the source slot
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
        
        newItinerary[activeLocation.dateKey] = {
          ...newItinerary[activeLocation.dateKey],
          [sourceSlot]: {
            ...newItinerary[activeLocation.dateKey][sourceSlot],
            Activities: sourceActivities
          }
        }
      }
      
      // Add to destination
      const targetSlot = overLocation.slot
      
      // NEW: Generate new ID based on target slot BUT preserve TimeSlot field
      const movedActivity = {
        ...activeLocation.activity,
        id: `${overLocation.dateKey}-${targetSlot.toLowerCase()}-${Date.now()}-${Math.random()}`,
        // PRESERVE the original TimeSlot - don't change it!
        // TimeSlot: activeLocation.activity.TimeSlot // Keep original time
      }
      
      if (targetSlot === 'Lunch') {
        // Replace lunch activity
        newItinerary[overLocation.dateKey] = {
          ...newItinerary[overLocation.dateKey],
          Lunch: {
            ...newItinerary[overLocation.dateKey].Lunch,
            Activity: movedActivity
          }
        }
      } else {
        const targetActivities = [...(newItinerary[overLocation.dateKey][targetSlot]?.Activities || [])]
        
        // Insert at the position of the over item
        const overIndex = targetActivities.findIndex(a => a.id === over.id)
        if (overIndex !== -1) {
          targetActivities.splice(overIndex, 0, movedActivity)
        } else {
          targetActivities.push(movedActivity)
        }
        
        newItinerary[overLocation.dateKey] = {
          ...newItinerary[overLocation.dateKey],
          [targetSlot]: {
            ...newItinerary[overLocation.dateKey][targetSlot],
            Activities: targetActivities
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

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
  }
}

/*
import { useState } from 'react'
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'

export function useDragAndDrop(tripData, updateTripData) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const findDayForActivity = (activityId) => {
      for (const [dateKey, dayData] of Object.entries(tripData.tripData.Itinerary)) {
        if (dayData.Activities.find(a => a.id === activityId)) {
          return dateKey
        }
      }
      return null
    }

    const activeDateKey = findDayForActivity(active.id)
    let overDateKey = findDayForActivity(over.id)
    
    if (!overDateKey && tripData.tripData.Itinerary[over.id]) {
      overDateKey = over.id
    }

    if (!activeDateKey || !overDateKey) return

    const newItinerary = { ...tripData.tripData.Itinerary }

    if (activeDateKey === overDateKey) {
      // Same day reordering
      const dayActivities = [...newItinerary[activeDateKey].Activities]
      const oldIndex = dayActivities.findIndex(a => a.id === active.id)
      const newIndex = dayActivities.findIndex(a => a.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        newItinerary[activeDateKey] = {
          ...newItinerary[activeDateKey],
          Activities: arrayMove(dayActivities, oldIndex, newIndex)
        }
      }
    } else {
      // Cross-day move
      const sourceActivities = [...newItinerary[activeDateKey].Activities]
      const targetActivities = [...newItinerary[overDateKey].Activities]
      const activeIndex = sourceActivities.findIndex(a => a.id === active.id)
      
      if (activeIndex !== -1) {
        const [movedActivity] = sourceActivities.splice(activeIndex, 1)
        const updatedActivity = {
          ...movedActivity,
          id: `${overDateKey}-activity-${Date.now()}-${Math.random()}`
        }
        
        const overIndex = targetActivities.findIndex(a => a.id === over.id)
        if (overIndex !== -1) {
          targetActivities.splice(overIndex, 0, updatedActivity)
        } else {
          targetActivities.push(updatedActivity)
        }
        
        newItinerary[activeDateKey] = {
          ...newItinerary[activeDateKey],
          Activities: sourceActivities
        }
        
        newItinerary[overDateKey] = {
          ...newItinerary[overDateKey],
          Activities: targetActivities
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

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
  }
}

*/