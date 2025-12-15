import React from 'react'
import Button from '@/components/ui/Button'
import { Save, Loader2 } from 'lucide-react'

function TripHeader({ hasUnsavedChanges, saving, onSave, isNewTrip }) {
  return (
    <div className='flex justify-between items-center mb-6'>
      <div>
        <h1 className='font-bold text-3xl'>Customize Your Trip</h1>
        <p className='text-gray-500 text-sm mt-1'>
          Drag activities between days • Delete unwanted days or activities
          {hasUnsavedChanges && <span className='text-orange-600 ml-2'>• Unsaved changes</span>}
        </p>
      </div>
      <Button onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Saving...
          </>
        ) : (
          <>
            <Save className='mr-2 h-4 w-4' />
            {isNewTrip ? 'Save Trip' : 'Save Changes'}
          </>
        )}
      </Button>
    </div>
  )
}

export default TripHeader