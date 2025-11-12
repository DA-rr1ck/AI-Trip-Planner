import { AI_PROMPT } from '@/constants/options'
import { generateTrip } from '@/service/AIModel'

// Generates AI trip data from form inputs; returns parsed tripData object
export async function generateAiTripFromForm(formData) {
  const daysNum = Number(formData?.noOfdays)
  if (!Number.isFinite(daysNum) || daysNum < 1 || daysNum > 5) {
    throw new Error('Please enter a valid number of days (1-5).')
  }
  if (!formData?.location || !formData?.noOfdays || !formData?.budget || !formData?.traveler) {
    throw new Error('Please fill all the fields.')
  }

  const FINAL_PROMPT = AI_PROMPT
    .replace('{location}', formData.location)
    .replace('{totalDays}', formData.noOfdays)
    .replace('{traveler}', formData.traveler)
    .replace('{budget}', formData.budget)
    .replace('{totalDays}', formData.noOfdays)

  const result = await generateTrip(FINAL_PROMPT)

  let tripData
  if (typeof result === 'string') {
    tripData = JSON.parse(result)
  } else if (typeof result === 'object') {
    tripData = result
  } else {
    throw new Error('Invalid trip data format')
  }
  return tripData
}
