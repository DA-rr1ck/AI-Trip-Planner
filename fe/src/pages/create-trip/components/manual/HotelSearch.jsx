import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

import { differenceInDays, format } from 'date-fns'

// Fallback to Pixabay if SerpAPI fails
async function getImageFromPixabay(query) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  if (!API_KEY) return '/placeholder.jpg';
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3`
    );
    const data = await response.json();
    return data.hits?.[0]?.largeImageURL || '/placeholder.jpg';
  } catch (error) {
    console.error('Pixabay fallback failed:', error);
    return '/placeholder.jpg';
  }
}

// Function to get hotel image from SerpAPI (via backend) with Pixabay fallback
async function getHotelImage(hotelName, hotelAddress) {
  const searchQuery = `${hotelName} ${hotelAddress} hotel exterior`;
  
  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(searchQuery)}`
    );
    
    if (!response.ok) {
      throw new Error('SerpAPI request failed');
    }
    
    const data = await response.json();
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail;
    
    if (imageUrl) return imageUrl;
    throw new Error('No images found');
  } catch (error) {
    console.warn('SerpAPI failed, falling back to Pixabay:', error.message);
    return getImageFromPixabay(`${hotelName} hotel`);
  }
}

function HotelSearch({ 
  location, 
  onHotelConfirm, 
  confirmedHotel, 
  onRemoveHotel,
  startDate,
  endDate,
  budgetMin,
  budgetMax,
  adults,
  children,
  savedQuery = '',
  savedResults = [],
  onSearchStateChange
}) {
  const [hotelSearchQuery, setHotelSearchQuery] = useState(savedQuery)
  const [hotelResults, setHotelResults] = useState(savedResults)
  const [searchingHotels, setSearchingHotels] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [hoveredHotel, setHoveredHotel] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const [nearbyData, setNearbyData] = useState({})
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [hotelImage, setHotelImage] = useState(null)
  const navigate = useNavigate()

  // Fetch hotel image when confirmedHotel changes
  useEffect(() => {
    if (confirmedHotel) {
      getHotelImage(confirmedHotel.name, confirmedHotel.address).then(setHotelImage)
    } else {
      setHotelImage(null)
    }
  }, [confirmedHotel])

  // Sync state changes to parent
  useEffect(() => {
    onSearchStateChange?.(hotelSearchQuery, hotelResults)
  }, [hotelSearchQuery, hotelResults])

  // Calculate estimated price for a hotel
  const getEstimatedPrice = (hotelId) => {
    if (!startDate || !endDate) return null
    
    try {
      const days = differenceInDays(endDate, startDate) + 1
      const travelers = (adults || 1) + (children || 0)
      
      // Generate a deterministic factor based on hotel ID (0.8 to 1.2)
      // Ensure hotelId is a string to prevent split errors
      const idStr = String(hotelId)
      const idSum = idStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const factor = 0.8 + (idSum % 40) / 100
      
      // Base calculation: Average budget per person * travelers * 40% allocation for hotel
      // This scales with budget and travelers
      const avgBudget = (Number(budgetMin) + Number(budgetMax)) / 2
      const baseTotal = avgBudget * travelers * 0.4
      
      // Adjust by factor
      const estimatedTotal = baseTotal * factor
      
      return Math.round(estimatedTotal / 10) * 10 // Round to nearest 10
    } catch (error) {
      console.error('Error calculating price:', error)
      return null
    }
  }

  // Fetch nearby amenities using Overpass API
  useEffect(() => {
    const targetHotel = hoveredHotel || confirmedHotel
    if (!targetHotel) return

    // If we already have data for this hotel, don't fetch again
    if (nearbyData[targetHotel.id]) return

    const fetchNearby = async () => {
      setLoadingNearby(true)
      try {
        const query = `
          [out:json][timeout:25];
          (
            node["tourism"~"attraction|museum|viewpoint|theme_park|zoo|aquarium"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["highway"="bus_stop"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["public_transport"="platform"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["amenity"="fuel"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["shop"="convenience"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["amenity"="pharmacy"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
            node["amenity"="atm"](around:1000, ${targetHotel.lat}, ${targetHotel.lon});
          );
          out body;
        `
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        })
        const data = await response.json()
        
        // Process data
        const attractions = []
        const seenAttractions = new Set()
        const counts = {
          bus_stop: 0,
          gas_station: 0,
          conbini: 0,
          drug_store: 0,
          atm: 0
        }

        data.elements.forEach(el => {
          if (el.tags.tourism) {
            const name = el.tags['name:en'] || el.tags.name
            
            // Filter out low quality results (normalize data)
            if (!name) return
            if (seenAttractions.has(name.toLowerCase())) return
            if (['viewpoint', 'attraction', 'museum'].includes(name.toLowerCase())) return
            
            seenAttractions.add(name.toLowerCase())

            // Calculate distance
            const R = 6371e3 // metres
            const φ1 = targetHotel.lat * Math.PI/180
            const φ2 = el.lat * Math.PI/180
            const Δφ = (el.lat - targetHotel.lat) * Math.PI/180
            const Δλ = (el.lon - targetHotel.lon) * Math.PI/180

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const d = R * c // in metres

            attractions.push({
              name: name,
              distance: Math.round(d)
            })
          } else if (el.tags.highway === 'bus_stop' || el.tags.public_transport === 'platform') {
            counts.bus_stop++
          } else if (el.tags.amenity === 'fuel') {
            counts.gas_station++
          } else if (el.tags.shop === 'convenience') {
            counts.conbini++
          } else if (el.tags.amenity === 'pharmacy') {
            counts.drug_store++
          } else if (el.tags.amenity === 'atm') {
            counts.atm++
          }
        })

        // Sort attractions by distance and take top 2
        attractions.sort((a, b) => a.distance - b.distance)
        
        setNearbyData(prev => ({
          ...prev,
          [targetHotel.id]: {
            attractions: attractions.slice(0, 2),
            counts
          }
        }))
      } catch (error) {
        console.error('Error fetching nearby places:', error)
      } finally {
        setLoadingNearby(false)
      }
    }

    const timer = setTimeout(fetchNearby, 500)
    return () => clearTimeout(timer)
  }, [hoveredHotel, confirmedHotel])

  // Clear hovered hotel when results change
  useEffect(() => {
    setHoveredHotel(null)
  }, [hotelResults])

  // Debounced hotel search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (hotelSearchQuery && hotelSearchQuery.length >= 2) {
        searchHotels(hotelSearchQuery)
      } else {
        setHotelResults([])
      }
    }, 600)

    return () => clearTimeout(debounceTimer)
  }, [hotelSearchQuery, location])

  const searchHotels = async (query) => {
    if (!query || query.length < 2) {
      setHotelResults([])
      return
    }

    setSearchingHotels(true)
    try {
      const searchQuery = query.toLowerCase().includes('hotel') 
        ? `${query} ${location}` 
        : `${query} hotel ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=30&addressdetails=1`
      )
      const data = await response.json()
      
      const hotels = data
        .filter(item => {
          const displayName = item.display_name.toLowerCase()
          const itemType = (item.type || '').toLowerCase()
          
          // Stricter filtering for accommodation types
          const validTypes = [
            'hotel', 
            'motel', 
            'guest_house', 
            'hostel', 
            'apartment', 
            'chalet', 
            'resort', 
            'inn'
          ]
          
          const isHotel = validTypes.includes(itemType)
          
          const isInLocation = displayName.includes(location.toLowerCase().split(',')[0])
          
          return isHotel && isInLocation
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: item.lat,
          lon: item.lon,
          type: item.type || 'hotel',
          city: item.address?.city || item.address?.town || '',
          country: item.address?.country || ''
        }))
        .filter((hotel, index, self) => 
          index === self.findIndex(h => h.name.toLowerCase() === hotel.name.toLowerCase())
        )
        .slice(0, 15)
      
      setHotelResults(hotels)
    } catch (error) {
      console.error('Error searching hotels:', error)
      setHotelResults([])
    } finally {
      setSearchingHotels(false)
    }
  }

  const handleHotelSelect = (hotel) => {
    setSelectedHotel(hotel)
  }

  const handleConfirmHotel = () => {
    if (selectedHotel) {
      onHotelConfirm(selectedHotel)
      toast.success(`Hotel "${selectedHotel.name}" added to your trip!`)
      setHotelResults([])
      setHotelSearchQuery('')
    }
  }

  const handleMouseMove = (e) => {
    const popupHeight = 450 // Estimate max height with amenities
    const popupWidth = 320 // w-80 is 20rem = 320px
    const padding = 20

    let top = e.clientY + padding
    let left = e.clientX + padding

    // Check if popup would go off bottom of screen
    if (top + popupHeight > window.innerHeight) {
      // Position above cursor instead
      top = e.clientY - popupHeight - padding
    }

    // Check if popup would go off right of screen
    if (left + popupWidth > window.innerWidth) {
      // Position to left of cursor
      left = e.clientX - popupWidth - padding
    }

    setPopupPosition({ top, left })
  }

  if (confirmedHotel) {
    return (
      <div className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
        <div className='p-4 bg-blue-50 border-2 border-blue-300 rounded-lg'>
          {hotelImage && (
            <div className="mb-4 rounded-lg overflow-hidden h-48 w-full shadow-sm">
              <img 
                src={hotelImage} 
                alt={confirmedHotel.name} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className='flex items-start justify-between mb-3'>
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity group"
              onClick={() => {
                const slug = encodeURIComponent(confirmedHotel.name)
                navigate(`/manual/hotel/${slug}`, {
                  state: {
                    hotel: {
                      HotelName: confirmedHotel.name,
                      HotelAddress: confirmedHotel.address,
                      Rating: 4.5,
                      lat: confirmedHotel.lat,
                      lon: confirmedHotel.lon,
                      imageUrl: hotelImage
                    },
                    tripContext: {
                      userSelection: {
                        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
                        adults,
                        children
                      }
                    }
                  }
                })
              }}
            >
              <div className='flex items-center gap-2 mb-1'>
                <p className='text-sm font-semibold text-blue-900'>
                  ✓ Selected
                </p>
                <span className='bg-blue-200 text-blue-800 text-[10px] px-2 py-0.5 rounded-full capitalize'>
                  {confirmedHotel.type}
                </span>
              </div>
              <p className='font-medium text-blue-800 text-lg group-hover:underline decoration-blue-800 underline-offset-2'>
                {confirmedHotel.name}
              </p>
              <p className='text-[10px] text-blue-600 mt-0.5 flex items-center gap-1'>
                Click to view details
                <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </p>
            </div>
            <button
              onClick={onRemoveHotel}
              className='text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded-full transition-colors'
              title="Remove hotel"
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>

          <div className='space-y-2 pl-1'>
            <div className='flex items-start gap-2 text-sm text-blue-700'>
              <span className='min-w-[20px]'>📍</span>
              <p>{confirmedHotel.address}</p>
            </div>
            {confirmedHotel.city && (
              <div className='flex items-center gap-2 text-sm text-blue-700'>
                <span className='min-w-[20px]'>🏙️</span>
                <p>{confirmedHotel.city}, {confirmedHotel.country}</p>
              </div>
            )}
            <div className='flex items-center gap-2 text-sm text-blue-700'>
              <span className='min-w-[20px]'>🌍</span>
              <p>{parseFloat(confirmedHotel.lat).toFixed(4)}, {parseFloat(confirmedHotel.lon).toFixed(4)}</p>
            </div>
            
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${confirmedHotel.lat},${confirmedHotel.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className='flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 ml-7'
            >
              Open in Google Maps
              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
              </svg>
            </a>

            {startDate && endDate && getEstimatedPrice(confirmedHotel.id) !== null && (
              <div className='mt-3 pt-3 border-t border-blue-200'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-blue-800'>Est. Total Cost:</span>
                  <span className='text-lg font-bold text-blue-900'>
                    ${getEstimatedPrice(confirmedHotel.id).toLocaleString()}
                  </span>
                </div>
                <p className='text-xs text-blue-600 mt-1'>
                  For {(adults || 1) + (children || 0)} travelers, {differenceInDays(endDate, startDate) + 1} days
                </p>
              </div>
            )}

            {/* Nearby Amenities for Confirmed Hotel */}
            {nearbyData[confirmedHotel.id] && (
              <div className='mt-3 pt-3 border-t border-blue-200'>
                <p className='text-xs font-semibold text-blue-800 mb-2'>Nearby Highlights (1km radius)</p>
                
                {/* Featured Attractions */}
                {nearbyData[confirmedHotel.id].attractions.length > 0 && (
                  <div className='grid grid-cols-2 gap-2 mb-3'>
                    {nearbyData[confirmedHotel.id].attractions.map((attr, idx) => (
                      <div key={idx} className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm text-center'>
                        <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>{attr.distance}m</span>
                        <span className='text-sm font-bold text-blue-900 line-clamp-1 w-full px-1' title={attr.name}>{attr.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amenities Counts */}
                <div className='grid grid-cols-5 gap-2'>
                  <div className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm'>
                    <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>Bus</span>
                    <span className='text-sm font-bold text-blue-900'>{nearbyData[confirmedHotel.id].counts.bus_stop}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm'>
                    <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>Gas</span>
                    <span className='text-sm font-bold text-blue-900'>{nearbyData[confirmedHotel.id].counts.gas_station}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm'>
                    <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>Store</span>
                    <span className='text-sm font-bold text-blue-900'>{nearbyData[confirmedHotel.id].counts.conbini}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm'>
                    <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>Pharm</span>
                    <span className='text-sm font-bold text-blue-900'>{nearbyData[confirmedHotel.id].counts.drug_store}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-blue-200 shadow-sm'>
                    <span className='text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-0.5'>ATM</span>
                    <span className='text-sm font-bold text-blue-900'>{nearbyData[confirmedHotel.id].counts.atm}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='border-2 border-gray-200 rounded-xl p-6 bg-white shadow-sm'>
      <div className='flex items-start gap-4 mb-6'>
        <div className='bg-blue-100 p-3 rounded-lg'>
          <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
          </svg>
        </div>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Find Hotels in {location}
          </h3>
          <p className='text-gray-600 mb-4'>
            Search and select hotels for your stay
          </p>
          
          {/* Search Input */}
          <div className='relative mb-4'>
            <input
              type='text'
              placeholder='Search for hotels...'
              value={hotelSearchQuery}
              onChange={(e) => setHotelSearchQuery(e.target.value)}
              className='w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
            />
            <svg 
              className='w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2' 
              fill='none' 
              stroke='currentColor' 
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
            </svg>
          </div>

          {/* External Search Button */}
          <Button 
            variant='outline' 
            size='sm'
            className='flex items-center gap-2 mb-4'
            onClick={() => {
              window.open(`https://www.google.com/maps/search/hotels+in+${encodeURIComponent(location)}`, '_blank')
            }}
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
            </svg>
            Search on Google Maps
          </Button>

          {/* Loading State */}
          {searchingHotels && (
            <div className='flex items-center justify-center py-8'>
              <AiOutlineLoading3Quarters className='h-6 w-6 animate-spin text-blue-600' />
              <span className='ml-2 text-gray-600'>Searching hotels...</span>
            </div>
          )}

          {/* Hotel Results */}
          {!searchingHotels && hotelResults.length > 0 && (
            <div className='space-y-2 max-h-96 overflow-y-auto'>
              <p className='text-sm text-gray-600 mb-3'>
                Found {hotelResults.length} hotel{hotelResults.length > 1 ? 's' : ''} • Click to select one
              </p>
              {hotelResults.map((hotel) => {
                const isSelected = selectedHotel && selectedHotel.id === hotel.id
                return (
                  <div
                    key={hotel.id}
                    onClick={() => handleHotelSelect(hotel)}
                    onMouseEnter={(e) => {
                      handleMouseMove(e)
                      setHoveredHotel(hotel)
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredHotel(null)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-semibold text-gray-900'>{hotel.name}</p>
                        <p className='text-sm text-gray-500'>{hotel.address}</p>
                        {hotel.city && (
                          <p className='text-sm text-gray-400'>{hotel.city}, {hotel.country}</p>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const slug = encodeURIComponent(hotel.name)
                            
                            navigate(`/hotel/${slug}`, { 
                              state: { 
                                hotel: {
                                  ...hotel,
                                  HotelName: hotel.name,
                                  HotelAddress: hotel.address
                                },
                                tripContext: {
                                  userSelection: {
                                    location,
                                    startDate,
                                    endDate,
                                    budget: { min: budgetMin, max: budgetMax },
                                    adults: adults || 1,
                                    children: children || 0,
                                    travelers: (adults || 1) + (children || 0)
                                  }
                                }
                              } 
                            })
                          }}
                          className='text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-flex items-center gap-1'
                        >
                          View Details
                          <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                          </svg>
                        </button>
                      </div>
                      {isSelected && (
                        <svg className='w-5 h-5 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* No Results State */}
          {!searchingHotels && hotelResults.length === 0 && hotelSearchQuery.length >= 2 && (
            <div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
              <p className='text-sm text-gray-600'>
                No hotels found. Try adjusting your search, or search on Google Maps for more options.
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <div className='mt-4 flex justify-end'>
            <Button
              onClick={handleConfirmHotel}
              disabled={!selectedHotel}
            >
              Confirm Hotel
            </Button>
          </div>
        </div>
      </div>

      {/* Highlighted Tips */}
      <div className='grid sm:grid-cols-2 gap-4 mt-6'>
        <div className='p-4 bg-blue-50 rounded-lg'>
          <h4 className='text-sm font-semibold text-blue-900'>Pro Tip</h4>
          <p className='text-sm text-blue-800 mt-1'>
            Use specific terms like "luxury hotel" or "budget inn" to find options that match your preferences faster.
          </p>
        </div>
        <div className='p-4 bg-green-50 rounded-lg'>
          <h4 className='text-sm font-semibold text-green-900'>Save Time</h4>
          <p className='text-sm text-green-800 mt-1'>
            Once you confirm a hotel, we lock it into your itinerary so you can plan your days with confidence.
          </p>
        </div>
      </div>

      {/* Hover Popup - Dynamic Position */}
      {hoveredHotel && (
        <div 
          className='fixed z-50 w-80 bg-white rounded-xl shadow-2xl border border-blue-100 p-5 animate-in fade-in zoom-in-95 duration-200 hidden xl:block'
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <div className='flex items-start justify-between mb-3'>
            <h3 className='font-bold text-lg text-gray-900'>{hoveredHotel.name}</h3>
            <span className='bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full capitalize'>
              {hoveredHotel.type}
            </span>
          </div>
          
          <div className='space-y-2'>
            <div className='flex items-start gap-2 text-sm text-gray-600'>
              <span className='min-w-[20px]'>📍</span>
              <p>{hoveredHotel.address}</p>
            </div>
            {hoveredHotel.city && (
              <div className='flex items-center gap-2 text-sm text-gray-600'>
                <span className='min-w-[20px]'>🏙️</span>
                <p>{hoveredHotel.city}, {hoveredHotel.country}</p>
              </div>
            )}
            <div className='flex items-center gap-2 text-sm text-gray-600'>
              <span className='min-w-[20px]'>🌍</span>
              <p>{parseFloat(hoveredHotel.lat).toFixed(4)}, {parseFloat(hoveredHotel.lon).toFixed(4)}</p>
            </div>
            
            {startDate && endDate ? (
              getEstimatedPrice(hoveredHotel.id) !== null && (
                <div className='mt-3 pt-3 border-t border-gray-100'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-gray-600'>Est. Total Cost:</span>
                    <span className='text-lg font-bold text-green-600'>
                      ${getEstimatedPrice(hoveredHotel.id).toLocaleString()}
                    </span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    For {(adults || 1) + (children || 0)} travelers, {differenceInDays(endDate, startDate) + 1} days
                  </p>
                </div>
              )
            ) : (
              <div className='mt-3 pt-3 border-t border-gray-100'>
                <p className='text-xs text-gray-500 italic flex items-center gap-1'>
                  <span className='text-amber-500'>⚠️</span> Select trip dates to see price estimates
                </p>
              </div>
            )}

            {/* Nearby Amenities for Hovered Hotel */}
            {loadingNearby && !nearbyData[hoveredHotel.id] ? (
              <div className='mt-3 pt-3 border-t border-gray-100 flex justify-center'>
                <AiOutlineLoading3Quarters className='h-4 w-4 animate-spin text-blue-500' />
              </div>
            ) : nearbyData[hoveredHotel.id] ? (
              <div className='mt-3 pt-3 border-t border-gray-100'>
                <p className='text-xs font-semibold text-gray-700 mb-2'>Nearby Highlights (1km)</p>
                
                {/* Featured Attractions */}
                {nearbyData[hoveredHotel.id].attractions.length > 0 && (
                  <div className='grid grid-cols-2 gap-1.5 mb-2'>
                    {nearbyData[hoveredHotel.id].attractions.map((attr, idx) => (
                      <div key={idx} className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200 text-center'>
                        <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight mb-0.5'>{attr.distance}m</span>
                        <span className='text-xs font-bold text-gray-800 line-clamp-1 w-full px-1' title={attr.name}>{attr.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amenities Counts */}
                <div className='grid grid-cols-5 gap-1.5'>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Bus Stops">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Bus</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredHotel.id].counts.bus_stop}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Gas Stations">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Gas</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredHotel.id].counts.gas_station}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Convenience Stores">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Store</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredHotel.id].counts.conbini}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="Pharmacies">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>Pharm</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredHotel.id].counts.drug_store}</span>
                  </div>
                  <div className='flex flex-col items-center justify-center p-1.5 bg-gray-50 rounded-md border border-gray-200' title="ATMs">
                    <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-tight'>ATM</span>
                    <span className='text-xs font-bold text-gray-800'>{nearbyData[hoveredHotel.id].counts.atm}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className='mt-4 pt-3 border-t border-gray-100'>
            <p className='text-xs text-gray-400 italic'>
              Click to select this hotel for your trip
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelSearch
