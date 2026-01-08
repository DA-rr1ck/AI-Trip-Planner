import React from 'react'
import { AlertTriangle } from 'lucide-react'

function UnsavedChangesDialog({ open, onDiscard, onKeepEditing }) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className='fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200'
        onClick={onKeepEditing}
      />

      {/* Dialog */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200'>
        <div 
          className='bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon & Title */}
          <div className='flex items-center gap-3'>
            <div className='flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center'>
              <AlertTriangle className='h-6 w-6 text-orange-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                Unsaved Changes
              </h3>
              <p className='text-sm text-gray-500'>
                You're about to leave without saving
              </p>
            </div>
          </div>

          {/* Message */}
          <div className='border-l-4 border-orange-400 bg-orange-50 p-4 rounded'>
            <p className='text-sm text-gray-700'>
              You have unsaved changes to your trip. If you leave now, all changes will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className='flex flex-col-reverse sm:flex-row gap-3 pt-2'>
            <button
              onClick={onKeepEditing}
              className='flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
            >
              Keep Editing
            </button>
            <button
              onClick={onDiscard}
              className='flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            >
              Discard Changes
            </button>
          </div>

          {/* Help Text */}
          <p className='text-xs text-gray-500 text-center pt-2'>
            💡 Tip: Click "Save Trip" in the header to keep your changes before leaving
          </p>
        </div>
      </div>
    </>
  )
}

export default UnsavedChangesDialog