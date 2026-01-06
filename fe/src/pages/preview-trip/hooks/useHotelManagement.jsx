
import { useState, useEffect } from 'react'

export function useHotelManagement(tripData, updateTripData, rawTripData, existingTripId, setHasUnsavedChanges) {
  const [selectedHotels, setSelectedHotels] = useState([])

  const SELECTED_HOTEL_KEY = (tripId) => `tp:selectedHotel:${tripId}`
  const safeParse = (raw) => {
    try { return JSON.parse(raw) } catch { return null }
  }

  // Normalize hotel objects coming from different sources (HotelsSection vs NearbyHotelsSection/SerpAPI)
  const normalizeHotel = (h) => {
    if (!h || typeof h !== 'object') return null

    const header = h.header && typeof h.header === 'object' ? h.header : null
    const descObj = h.description && typeof h.description === 'object' ? h.description : null
    const rr = h.ratings_reviews && typeof h.ratings_reviews === 'object' ? h.ratings_reviews : null

    const HotelName =
      h.HotelName ||
      header?.name ||
      h.name ||
      h.title ||
      ''

    const HotelAddress =
      h.HotelAddress ||
      header?.address ||
      h.address ||
      (typeof h.location === 'string' ? h.location : '') ||
      ''

    const headerImages = Array.isArray(header?.images) ? header.images : []
    const HotelImageUrl =
      h.HotelImageUrl ||
      headerImages[0] ||
      h.thumbnail ||
      h.image ||
      h.ImageUrl ||
      null

    const Rating =
      h.Rating ??
      rr?.overall_rating ??
      h.overall_rating ??
      h.rating ??
      ''

    // Prefer explicit price fields first, else derive from rooms (details response)
    const rooms = Array.isArray(h.rooms) ? h.rooms : []
    const roomPrice = rooms.find(r => r && r.price)?.price || ''

    const Price =
      h.Price ||
      h.price ||
      h.rate_per_night?.lowest ||
      h.total_rate?.lowest ||
      roomPrice ||
      ''

    const Description =
      h.Description ||
      descObj?.description ||
      (typeof h.description === 'string' ? h.description : '') ||
      h.summary ||
      ''

    // property_token is the best stable ID across sources
    const property_token =
      h.property_token ||
      h.propertyToken ||
      h.query?.property_token ||
      h.query?.propertyToken ||
      null

    // Coordinates (details response puts it in nearby_highlights.hotel_coordinates)
    const rawCoords =
      h.GeoCoordinates ||
      h.gps_coordinates ||
      h.nearby_highlights?.hotel_coordinates ||
      null

    let GeoCoordinates = null
    if (rawCoords && typeof rawCoords === 'object') {
      const lat = rawCoords.lat ?? rawCoords.latitude
      const lng = rawCoords.lng ?? rawCoords.longitude
      if (typeof lat === 'number' && typeof lng === 'number') {
        GeoCoordinates = { lat, lng }
      }
    }

    return {
      ...h,
      HotelName,
      HotelAddress,
      HotelImageUrl,
      Rating,
      Price,
      Description,
      GeoCoordinates: GeoCoordinates || h.GeoCoordinates || null,
      property_token: property_token || h.property_token || null,
      id: h.id || null,
    }
  }

  const normStr = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "")

  const getHotelId = (h) => {
    const n = normalizeHotel(h) || h
    return {
      token: n?.property_token || n?.propertyToken || "",
      placeId: n?.PlaceId || n?.place_id || "",
      name: normStr(n?.HotelName || n?.name || n?.title),
      address: normStr(n?.HotelAddress || n?.address || n?.formatted_address),
    }
  }

  // Consider same if: token matches OR placeId matches OR (name+address matches)
  // fallback: if one side missing address, allow name-only match (last resort)
  const isSameHotel = (a, b) => {
    if (!a || !b) return false
    const A = getHotelId(a)
    const B = getHotelId(b)

    // strongest: name + address (works even when one has token and the other doesn't)
    if (A.name && B.name && A.address && B.address && A.name === B.name && A.address === B.address) return true

    // token / placeId matches
    if (A.token && B.token && A.token === B.token) return true
    if (A.placeId && B.placeId && A.placeId === B.placeId) return true

    // last resort: name only (when address missing)
    if (A.name && B.name && A.name === B.name) return true

    return false
  }

  // stable string for deps / storage
  const getHotelKeyStable = (h) => {
    const id = getHotelId(h)
    return id.token || id.placeId || `${id.name}__${id.address}` || id.name || ""
  }

  // Helper function to update hotel check-in/out activities
  const updateHotelActivities = (selectedHotel) => {
    if (!selectedHotel || !tripData?.tripData?.Itinerary) return

    const dateKeys = Object.keys(tripData.tripData.Itinerary).sort()
    if (dateKeys.length === 0) return

    const firstDate = dateKeys[0]
    const lastDate = dateKeys[dateKeys.length - 1]
    const newItinerary = { ...tripData.tripData.Itinerary }

    // Update check-in activity (first day's afternoon)
    if (newItinerary[firstDate]?.Afternoon?.Activities) {
      newItinerary[firstDate] = {
        ...newItinerary[firstDate],
        Afternoon: {
          ...newItinerary[firstDate].Afternoon,
          Activities: newItinerary[firstDate].Afternoon.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkin') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-in',
                PlaceDetails: `Check-in at ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    // Update check-out activity (last day's morning)
    if (newItinerary[lastDate]?.Morning?.Activities) {
      newItinerary[lastDate] = {
        ...newItinerary[lastDate],
        Morning: {
          ...newItinerary[lastDate].Morning,
          Activities: newItinerary[lastDate].Morning.Activities.map(activity => {
            if (activity.ActivityType === 'hotel_checkout') {
              return {
                ...activity,
                PlaceName: 'Hotel Check-out',
                PlaceDetails: `Check-out from ${selectedHotel.HotelName}`,
                ImageUrl: selectedHotel.HotelImageUrl || activity.ImageUrl,
                GeoCoordinates: selectedHotel.GeoCoordinates,
              }
            }
            return activity
          })
        }
      }
    }

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Itinerary: newItinerary,
      },
    }

    updateTripData(updatedTripData)
  }

  // Restore selection from localStorage (persists across refresh)
  useEffect(() => {
    if (!existingTripId) return
    if (selectedHotels.length > 0) return
    const raw = localStorage.getItem(SELECTED_HOTEL_KEY(existingTripId))
    const storedHotel = raw ? safeParse(raw) : null
    if (storedHotel) {
      setSelectedHotels([normalizeHotel(storedHotel)])
      return
    }

    // Optional fallback: if it's an existing trip (not temp), preselect first hotel
    if (!existingTripId.startsWith('temp_') && tripData?.tripData?.Hotels?.length) {
      setSelectedHotels([tripData.tripData.Hotels[0]])
    }
  }, [existingTripId, tripData?.tripData?.Hotels, selectedHotels.length])

  // Consume one-time handoff from Hotel Details (sessionStorage)
  useEffect(() => {
    if (!existingTripId) return
    const key = SELECTED_HOTEL_KEY(existingTripId)

    const raw = sessionStorage.getItem(key)
    if (!raw) return

    sessionStorage.removeItem(key)

    const hotel = safeParse(raw)

    const normalized = normalizeHotel(hotel)
    if (!normalized) return

    setSelectedHotels([normalized])
    localStorage.setItem(key, JSON.stringify(normalized)) // persist for refresh

    setHasUnsavedChanges(true)
  }, [existingTripId])

  /**
   * Ensure the selected hotel is visible inside HotelsSection:
   * - If the selected hotel already exists in tripData.tripData.Hotels => keep list order, just select it
   * - If not => replace the FIRST hotel card with the selected hotel (keep the rest order)
   */
  useEffect(() => {
    if (!existingTripId) return
    if (!tripData?.tripData?.Itinerary) return
    const selected = selectedHotels?.[0]
    if (!selected) return

    const normalizedSelected = normalizeHotel(selected)
    if (!normalizedSelected) return

    const hotels = Array.isArray(tripData?.tripData?.Hotels) ? tripData.tripData.Hotels : []
    const selectedKey = getHotelKeyStable(normalizedSelected)
    if (!selectedKey) return

    const existingIdx = hotels.findIndex(h => isSameHotel(h, normalizedSelected))

    // If already in list, keep order, but ensure selectedHotels points to the list object
    if (existingIdx >= 0) {
      const inListHotel = hotels[existingIdx]
      const currentSelectedKey = getHotelKeyStable(selected)
      if (selected !== inListHotel || currentSelectedKey !== selectedKey) {
        setSelectedHotels([inListHotel])
        localStorage.setItem(SELECTED_HOTEL_KEY(existingTripId), JSON.stringify(inListHotel))
      }
      return
    }

    // Not in list => replace the FIRST card only
    const nextHotels = hotels.length > 0 ? [normalizedSelected, ...hotels.slice(1)] : [normalizedSelected]

    const updatedTripData = {
      ...tripData,
      tripData: {
        ...tripData.tripData,
        Hotels: nextHotels,
      },
    }

    updateTripData(updatedTripData)
    localStorage.setItem(SELECTED_HOTEL_KEY(existingTripId), JSON.stringify(normalizedSelected))
    setHasUnsavedChanges(true)
  }, [
    existingTripId,
    tripData?.tripData?.Hotels,
    tripData?.tripData?.Itinerary,
    selectedHotels.length ? getHotelKeyStable(selectedHotels[0]) : '',
  ])

  // Update hotel activities when hotel selection changes
  useEffect(() => {
    if (selectedHotels.length > 0 && tripData?.tripData?.Itinerary) {
      updateHotelActivities(selectedHotels[0])
    }
  }, [selectedHotels])

  const selectHotel = (hotel) => {
    const normalized = normalizeHotel(hotel)
    if (!normalized) return

    setSelectedHotels((prev) => {
      const current = prev?.[0]
      const same = current && isSameHotel(current, normalized)
      return same ? prev : [normalized]
    })

    if (existingTripId) {
      const key = SELECTED_HOTEL_KEY(existingTripId)
      localStorage.setItem(key, JSON.stringify(normalized))
    }

    setHasUnsavedChanges(true)
  }

  // Handle hotel selection toggle
  const handleToggleHotelSelection = (hotel) => {
    const normalized = normalizeHotel(hotel)
    if (!existingTripId || !normalized) return

    const isSelected = selectedHotels.some((h) => isSameHotel(h, normalized))

    const next = isSelected ? [] : [normalized]
    setSelectedHotels(next)

    const key = SELECTED_HOTEL_KEY(existingTripId)
    if (next[0]) localStorage.setItem(key, JSON.stringify(next[0]))
    else localStorage.removeItem(key)

    setHasUnsavedChanges(true)
  }

  return {
    selectedHotels,
    selectHotel,
    handleToggleHotelSelection,
  }
}