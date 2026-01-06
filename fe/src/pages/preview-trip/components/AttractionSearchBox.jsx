import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { Search, Plus, X, MapPin, ExternalLink, Info } from 'lucide-react'
import { toast } from 'sonner'

// Fallback to Pixabay if SerpAPI fails
async function getImageFromPixabay(query) {
  const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY
  if (!API_KEY) return '/placeholder.jpg'
  try {
    const response = await fetch(
      `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3`
    )
    const data = await response.json()
    return data.hits?.[0]?.largeImageURL || '/placeholder.jpg'
  } catch (error) {
    console.error('Pixabay fallback failed:', error)
    return '/placeholder.jpg'
  }
}

// Function to get place image from SerpAPI (via backend) with Pixabay fallback
async function getPlaceImage(placeName) {
  const searchQuery = `${placeName} tourist attraction`
  
  try {
    const response = await fetch(
      `/api/serp/images/search?q=${encodeURIComponent(searchQuery)}`
    )
    
    if (!response.ok) {
      throw new Error('SerpAPI request failed')
    }
    
    const data = await response.json()
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail
    
    if (imageUrl) return imageUrl
    throw new Error('No images found')
  } catch (error) {
    console.warn('SerpAPI failed, falling back to Pixabay:', error.message)
    return getImageFromPixabay(placeName)
  }
}

// Time slot options for adding activities
const TIME_SLOTS = [
  { key: 'Morning', label: 'Morning (8AM - 12PM)', icon: '🌅' },
  { key: 'Afternoon', label: 'Afternoon (2PM - 6PM)', icon: '☀️' },
  { key: 'Evening', label: 'Evening (6PM - 10PM)', icon: '🌙' },
]

function AttractionSearchBox({ 
  location,
  dateKey,
  onActivityAdd,
  existingActivities = [],
  defaultTimeSlot = 'Afternoon'
}) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(defaultTimeSlot)
  const [addingPlace, setAddingPlace] = useState(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [hasSearchedDefault, setHasSearchedDefault] = useState(false)
  const searchInputRef = useRef(null)

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isExpanded])

  // Reset hasSearchedDefault when location changes
  useEffect(() => {
    setHasSearchedDefault(false)
  }, [location])

  // Debounced search
  useEffect(() => {
    if (!isExpanded) return
    
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 2) {
        searchPlaces(searchQuery)
      } else if (isInputFocused && !searchQuery && !hasSearchedDefault) {
        // When input is focused but empty, search for attractions in destination
        searchPlacesInDestination()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, location, isInputFocused, hasSearchedDefault, isExpanded])

  // Search for attractions in the destination (used when input is focused without query)
  const searchPlacesInDestination = async () => {
    if (!location || hasSearchedDefault) return
    
    setSearching(true)
    setHasSearchedDefault(true)
    
    try {
      const searchQueryStr = `attractions ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryStr)}&limit=30&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AI-Trip-Planner/1.0'
          }
        }
      )
      const data = await response.json()
      
      const places = data
        .filter(item => {
          const itemType = (item.type || '').toLowerCase()
          const itemClass = (item.class || '').toLowerCase()
          
          // Filter for tourist-relevant places
          const validClasses = ['tourism', 'amenity', 'leisure', 'historic', 'natural', 'building']
          const excludeTypes = ['hotel', 'motel', 'hostel', 'guest_house', 'apartment']
          
          return (validClasses.includes(itemClass) || itemClass === '') && !excludeTypes.includes(itemType)
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || item.class || 'attraction',
          category: item.class || 'tourism'
        }))
        .filter((place, index, self) => 
          index === self.findIndex(p => p.name.toLowerCase() === place.name.toLowerCase())
        )
        // Filter out places that already exist in this day
        .filter(place => !existingActivities.some(
          existing => existing.PlaceName?.toLowerCase() === place.name.toLowerCase()
        ))
        .slice(0, 15)
      
      setSearchResults(places)
    } catch (error) {
      console.error('Error searching places in destination:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const searchPlaces = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const searchQueryStr = `${query} ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryStr)}&limit=20&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AI-Trip-Planner/1.0'
          }
        }
      )
      const data = await response.json()
      
      const places = data
        .filter(item => {
          const itemType = (item.type || '').toLowerCase()
          const itemClass = (item.class || '').toLowerCase()
          
          // Filter for tourist-relevant places
          const validClasses = ['tourism', 'amenity', 'leisure', 'historic', 'natural', 'shop', 'building']
          const excludeTypes = ['hotel', 'motel', 'hostel', 'guest_house', 'apartment']
          
          return (validClasses.includes(itemClass) || itemClass === '') && !excludeTypes.includes(itemType)
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || item.class || 'attraction',
          category: item.class || 'tourism'
        }))
        .filter((place, index, self) => 
          index === self.findIndex(p => p.name.toLowerCase() === place.name.toLowerCase())
        )
        // Filter out places that already exist in this day
        .filter(place => !existingActivities.some(
          existing => existing.PlaceName?.toLowerCase() === place.name.toLowerCase()
        ))
        .slice(0, 10)
      
      setSearchResults(places)
    } catch (error) {
      console.error('Error searching places:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddPlace = async (place) => {
    setAddingPlace(place.id)
    try {
      // Fetch image for the place using SerpAPI with Pixabay fallback
      let imageUrl = '/placeholder.jpg'
      try {
        imageUrl = await getPlaceImage(place.name)
      } catch (e) {
        console.warn('Failed to fetch image for place:', place.name)
      }

      // Build a more descriptive details text
      const typeDisplay = place.type.charAt(0).toUpperCase() + place.type.slice(1).replace(/_/g, ' ')
      
      // Convert to AI trip activity format - matching the structure expected by ActivityCard and detail page
      const newActivity = {
        ActivityId: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        id: `${dateKey}-${selectedTimeSlot.toLowerCase()}-manual-${Date.now()}`,
        ActivityType: 'normal_attraction',
        PlaceName: place.name,
        PlaceDetails: `${typeDisplay} in ${location}. Click to view full details, photos, and reviews.`,
        PlaceAddress: place.address,
        ImageUrl: imageUrl,
        GeoCoordinates: {
          Latitude: place.lat,
          Longitude: place.lon
        },
        TicketPricing: 'View details for pricing',
        TimeSlot: getTimeSlotRange(selectedTimeSlot),
        Duration: '1-2 hours',
        BestTimeToVisit: selectedTimeSlot,
        isManuallyAdded: true,
        // Include additional data for navigation to detail page
        lat: place.lat,
        lon: place.lon,
        type: place.type,
        category: place.category
      }

      onActivityAdd(dateKey, selectedTimeSlot, newActivity)
      toast.success(`"${place.name}" added to ${selectedTimeSlot}! Click on it to view details.`)
      
      // Reset search but keep expanded
      setSearchQuery('')
      setSearchResults([])
      setHasSearchedDefault(false)
    } catch (error) {
      console.error('Error adding place:', error)
      toast.error('Failed to add place')
    } finally {
      setAddingPlace(null)
    }
  }

  const handleViewDetails = (place) => {
    const slug = encodeURIComponent(place.name)
    // Navigate to manual attraction detail page for Nominatim-sourced places
    navigate(`/manual/attraction/${slug}`, {
      state: {
        activity: {
          // Keep both legacy/manual keys and AI-friendly keys for compatibility
          name: place.name,
          address: place.address,
          lat: Number.isFinite(Number(place.lat)) ? Number(place.lat) : place.lat,
          lon: Number.isFinite(Number(place.lon)) ? Number(place.lon) : place.lon,
          PlaceName: place.name,
          PlaceDetails: place.address,
          Address: place.address,
          GeoCoordinates: {
            Latitude: Number.isFinite(Number(place.lat)) ? Number(place.lat) : place.lat,
            Longitude: Number.isFinite(Number(place.lon)) ? Number(place.lon) : place.lon
          },
          Rating: 4.5,
          type: place.type,
          category: place.category
        }
      }
    })
  }

  const getTimeSlotRange = (slot) => {
    const ranges = {
      Morning: '8:00 AM - 12:00 PM',
      Afternoon: '2:00 PM - 6:00 PM',
      Evening: '6:00 PM - 10:00 PM'
    }
    return ranges[slot] || ranges.Afternoon
  }

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/search/attractions+in+${encodeURIComponent(location)}`,
      '_blank'
    )
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full mt-3 p-3 border-2 border-dashed border-gray-300 rounded-lg 
                   hover:border-green-400 hover:bg-green-50 transition-all duration-200
                   flex items-center justify-center gap-2 text-gray-600 hover:text-green-600 text-sm"
      >
        <Plus className="h-4 w-4" />
        <span className="font-medium">Select Place Manually</span>
      </button>
    )
  }

  return (
    <div className="mt-3 p-4 border-2 border-green-200 rounded-lg bg-green-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
          <Search className="h-4 w-4 text-green-600" />
          Add Place to {dateKey}
        </h4>
        <button
          onClick={() => {
            setIsExpanded(false)
            setSearchQuery('')
            setSearchResults([])
          }}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Time Slot Selector */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">
          Add to time slot:
        </label>
        <div className="flex flex-wrap gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.key}
              onClick={() => setSelectedTimeSlot(slot.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${selectedTimeSlot === slot.key 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-green-400'
                }`}
            >
              {slot.icon} {slot.key}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search attractions, restaurants, landmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            setIsInputFocused(true)
            if (!searchQuery && !hasSearchedDefault) {
              searchPlacesInDestination()
            }
          }}
          onBlur={() => {
            // Delay to allow clicking on results
            setTimeout(() => setIsInputFocused(false), 200)
          }}
          className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>

      {/* External Search Button */}
      <button
        onClick={openGoogleMaps}
        className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-800 mb-3"
      >
        <ExternalLink className="h-3 w-3" />
        Search on Google Maps
      </button>

      {/* Loading State */}
      {searching && (
        <div className="flex items-center justify-center py-3">
          <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin text-green-600" />
          <span className="ml-2 text-gray-600 text-xs">Searching...</span>
        </div>
      )}

      {/* Search Results */}
      {!searching && searchResults.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs text-gray-500">
            Found {searchResults.length} place{searchResults.length > 1 ? 's' : ''}
          </p>
          {searchResults.map((place) => (
            <div
              key={place.id}
              className="p-2.5 bg-white border border-gray-200 rounded-lg hover:border-green-300 
                         hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{place.name}</p>
                  <p className="text-xs text-gray-500 truncate">{place.address}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                      {place.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(place)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                    >
                      <Info className="h-3 w-3" />
                      Details
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-green-600 hover:underline flex items-center gap-0.5"
                    >
                      <MapPin className="h-3 w-3" />
                      Map
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleAddPlace(place)}
                  disabled={addingPlace === place.id}
                  className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 
                             transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Add to trip"
                >
                  {addingPlace === place.id ? (
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-3">
          No places found. Try a different search term or search on Google Maps.
        </p>
      )}

      {/* Hint when no query and no results */}
      {!searching && !searchQuery && searchResults.length === 0 && hasSearchedDefault && (
        <p className="text-xs text-gray-500 text-center py-2">
          No attractions found in this area. Try searching by name above.
        </p>
      )}
    </div>
  )
}

export default AttractionSearchBox
