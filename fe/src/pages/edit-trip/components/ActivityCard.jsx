// fe/src/pages/edit-trip/components/ActivityCard.jsx
import React, { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { getPlaceImage } from '../utils/imageUtils'

function ActivityCard({ activity, onClick, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const [imageUrl, setImageUrl] = useState('/placeholder.jpg');

  useEffect(() => {
    if (activity.PlaceName) {
      getPlaceImage(activity.PlaceName).then(setImageUrl);
    }
  }, [activity.PlaceName]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='border rounded-lg p-3 bg-white hover:shadow-md transition-shadow cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-start gap-3'>
        <button
          className='mt-1 cursor-grab active:cursor-grabbing touch-none flex-shrink-0'
          {...attributes}
          {...listeners}
        >
          <GripVertical className='h-5 w-5 text-gray-400' />
        </button>

        <img
          src={imageUrl}
          alt={activity.PlaceName}
          className='w-[100px] h-[100px] rounded-lg object-cover flex-shrink-0'
        />

        <div className='flex-1 min-w-0'>
          <h4 className='font-semibold text-lg'>{activity.PlaceName}</h4>
          <p className='text-sm text-gray-600 mt-1 line-clamp-2'>{activity.PlaceDetails}</p>
          <div className='flex gap-4 mt-2 text-sm text-gray-500'>
            <span>💰 {activity.TicketPricing}</span>
            <span>⏱️ {activity.TimeTravel}</span>
          </div>
        </div>

        <button
          onClick={onRemove}
          className='text-red-500 hover:text-red-700 p-1 flex-shrink-0'
          title='Remove activity'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}

export default ActivityCard