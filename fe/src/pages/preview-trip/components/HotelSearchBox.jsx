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

// Function to get hotel image from SerpAPI (via backend) with Pixabay fallback
async function getHotelImage(hotelName, hotelAddress) {
  const searchQuery = `${hotelName} ${hotelAddress} hotel exterior`
  
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
    return getImageFromPixabay(`${hotelName} hotel`)
  }
}

function HotelSearchBox({ 
  location,
  onHotelAdd,
  existingHotels = []
}) {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [addingHotel, setAddingHotel] = useState(null)
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

  // Debounced hotel search
  useEffect(() => {
    if (!isExpanded) return
    
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 2) {
        searchHotels(searchQuery)
      } else if (isInputFocused && !searchQuery && !hasSearchedDefault) {
        // When input is focused but empty, search for hotels in destination
        searchHotelsInDestination()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, location, isInputFocused, hasSearchedDefault, isExpanded])

  // Search for hotels in the destination (used when input is focused without query)
  const searchHotelsInDestination = async () => {
    if (!location || hasSearchedDefault) return
    
    setSearching(true)
    setHasSearchedDefault(true)
    
    try {
      const searchQueryStr = `hotel ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryStr)}&limit=30&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AI-Trip-Planner/1.0'
          }
        }
      )
      const data = await response.json()
      
      const hotels = data
        .filter(item => {
          const displayName = item.display_name.toLowerCase()
          const itemType = (item.type || '').toLowerCase()
          
          const validTypes = [
            'hotel', 'motel', 'guest_house', 'hostel', 
            'apartment', 'chalet', 'resort', 'inn'
          ]
          
          const isHotel = validTypes.includes(itemType)
          const isInLocation = displayName.includes(location.toLowerCase().split(',')[0])
          
          return isHotel && isInLocation
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || 'hotel',
          city: item.address?.city || item.address?.town || '',
          country: item.address?.country || ''
        }))
        .filter((hotel, index, self) => 
          index === self.findIndex(h => h.name.toLowerCase() === hotel.name.toLowerCase())
        )
        // Filter out hotels that already exist
        .filter(hotel => !existingHotels.some(
          existing => existing.HotelName?.toLowerCase() === hotel.name.toLowerCase()
        ))
        .slice(0, 15)
      
      setSearchResults(hotels)
    } catch (error) {
      console.error('Error searching hotels in destination:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const searchHotels = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const searchQueryStr = query.toLowerCase().includes('hotel') 
        ? `${query} ${location}` 
        : `${query} hotel ${location}`
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQueryStr)}&limit=20&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AI-Trip-Planner/1.0'
          }
        }
      )
      const data = await response.json()
      
      const hotels = data
        .filter(item => {
          const displayName = item.display_name.toLowerCase()
          const itemType = (item.type || '').toLowerCase()
          
          const validTypes = [
            'hotel', 'motel', 'guest_house', 'hostel', 
            'apartment', 'chalet', 'resort', 'inn'
          ]
          
          const isHotel = validTypes.includes(itemType) || 
                          displayName.includes('hotel') || 
                          displayName.includes('resort') ||
                          displayName.includes('inn')
          
          return isHotel
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0].trim(),
          address: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || 'hotel',
          city: item.address?.city || item.address?.town || '',
          country: item.address?.country || ''
        }))
        .filter((hotel, index, self) => 
          index === self.findIndex(h => h.name.toLowerCase() === hotel.name.toLowerCase())
        )
        // Filter out hotels that already exist
        .filter(hotel => !existingHotels.some(
          existing => existing.HotelName?.toLowerCase() === hotel.name.toLowerCase()
        ))
        .slice(0, 10)
      
      setSearchResults(hotels)
    } catch (error) {
      console.error('Error searching hotels:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddHotel = async (hotel) => {
    setAddingHotel(hotel.id)
    try {
      // Fetch image for the hotel using SerpAPI with Pixabay fallback
      let hotelImageUrl = '/placeholder.jpg'
      try {
        hotelImageUrl = await getHotelImage(hotel.name, hotel.address)
      } catch (e) {
        console.warn('Failed to fetch image for hotel:', hotel.name)
      }

      // Build a more descriptive description
      const locationParts = []
      if (hotel.city) locationParts.push(hotel.city)
      if (hotel.country) locationParts.push(hotel.country)
      const locationStr = locationParts.length > 0 ? locationParts.join(', ') : location
      
      // Convert to AI trip hotel format - matching the structure expected by HotelCard and detail page
      const newHotel = {
        HotelName: hotel.name,
        HotelAddress: hotel.address,
        Price: 'Check availability',
        HotelImageUrl: hotelImageUrl,
        GeoCoordinates: {
          Latitude: hotel.lat,
          Longitude: hotel.lon
        },
        Rating: 'View details',
        Description: `Located in ${locationStr}. Click to view full details, amenities, and pricing.`,
        isManuallyAdded: true,
        // Include additional data for navigation to detail page
        lat: hotel.lat,
        lon: hotel.lon,
        city: hotel.city,
        country: hotel.country
      }

      onHotelAdd(newHotel)
      toast.success(`Hotel "${hotel.name}" added! Click on it to view details.`)
      
      // Reset state
      setSearchQuery('')
      setSearchResults([])
      setIsExpanded(false)
      setHasSearchedDefault(false)
    } catch (error) {
      console.error('Error adding hotel:', error)
      toast.error('Failed to add hotel')
    } finally {
      setAddingHotel(null)
    }
  }

  const handleViewDetails = (hotel) => {
    const slug = encodeURIComponent(hotel.name)
    // Navigate to manual hotel detail page for Nominatim-sourced places
    navigate(`/manual/hotel/${slug}`, {
      state: {
        hotel: {
          // Keep both legacy/manual keys and AI-friendly keys for compatibility
          id: hotel.id,
          name: hotel.name,
          address: hotel.address,
          HotelName: hotel.name,
          HotelAddress: hotel.address,
          Rating: 4.5,
          lat: Number.isFinite(Number(hotel.lat)) ? Number(hotel.lat) : hotel.lat,
          lon: Number.isFinite(Number(hotel.lon)) ? Number(hotel.lon) : hotel.lon,
          city: hotel.city,
          country: hotel.country
        }
      }
    })
  }

  const openGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/search/hotels+in+${encodeURIComponent(location)}`,
      '_blank'
    )
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full mt-4 p-4 border-2 border-dashed border-gray-300 rounded-xl 
                   hover:border-blue-400 hover:bg-blue-50 transition-all duration-200
                   flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
      >
        <Plus className="h-5 w-5" />
        <span className="font-medium">Select Hotel Manually</span>
      </button>
    )
  }

  return (
    <div className="mt-4 p-4 border-2 border-blue-200 rounded-xl bg-blue-50/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-600" />
          Search Hotels in {location}
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

      {/* Search Input */}
      <div className="relative mb-3">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for hotels by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            setIsInputFocused(true)
            if (!searchQuery && !hasSearchedDefault) {
              searchHotelsInDestination()
            }
          }}
          onBlur={() => {
            // Delay to allow clicking on results
            setTimeout(() => setIsInputFocused(false), 200)
          }}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {/* External Search Button */}
      <button
        onClick={openGoogleMaps}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-3"
      >
        <ExternalLink className="h-4 w-4" />
        Search on Google Maps
      </button>

      {/* Loading State */}
      {searching && (
        <div className="flex items-center justify-center py-4">
          <AiOutlineLoading3Quarters className="h-5 w-5 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 text-sm">Searching hotels...</span>
        </div>
      )}

      {/* Search Results */}
      {!searching && searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">
            Found {searchResults.length} hotel{searchResults.length > 1 ? 's' : ''}
          </p>
          {searchResults.map((hotel) => (
            <div
              key={hotel.id}
              className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 
                         hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{hotel.name}</p>
                  <p className="text-xs text-gray-500 truncate">{hotel.address}</p>
                  {hotel.city && (
                    <p className="text-xs text-gray-400">{hotel.city}, {hotel.country}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">
                      {hotel.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(hotel)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      <Info className="h-3 w-3" />
                      View Details
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-green-600 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      Map
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleAddHotel(hotel)}
                  disabled={addingHotel === hotel.id}
                  className="ml-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Add to trip"
                >
                  {addingHotel === hotel.id ? (
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
        <p className="text-sm text-gray-500 text-center py-4">
          No hotels found. Try a different search term or search on Google Maps.
        </p>
      )}

      {/* Hint when no query and no results */}
      {!searching && !searchQuery && searchResults.length === 0 && hasSearchedDefault && (
        <p className="text-xs text-gray-500 text-center py-2">
          No hotels found in this area. Try searching by name above.
        </p>
      )}
    </div>
  )
}

export default HotelSearchBox
