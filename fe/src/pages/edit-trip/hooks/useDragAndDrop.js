// fe/src/pages/edit-trip/hooks/useDragAndDrop.js
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