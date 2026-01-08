import { api } from '@/lib/api'

// Simple in-memory cache
const imageCache = new Map();

async function fetchImageFromAPI(query) {
  // Check cache first
  if (imageCache.has(query)) {
    return imageCache.get(query);
  }

  try {
    
    const { data } = await api.get('/serp/images/search', {
      params: {
        q: query,
      },
    });
    const imageUrl = data.images?.[0]?.original || data.images?.[0]?.thumbnail || '/placeholder.jpg';
    
    // Cache the result
    imageCache.set(query, imageUrl);
    
    return imageUrl;
  } catch (error) {
    console.error('Error fetching image:', error);
    return '/placeholder.jpg';
  }
}

export async function getHotelImage(hotelName, hotelAddress) {
  const query = `${hotelName} ${hotelAddress}`;
  return fetchImageFromAPI(query);
}

export async function getPlaceImage(placeName) {
  return fetchImageFromAPI(placeName);
}




/*
export async function getHotelImage(hotelName, hotelAddress) {
    const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
    try {
      const response = await fetch(
        `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(hotelName + ' ' + hotelAddress)}&image_type=photo&per_page=3`
      );
      const data = await response.json();
      return data.hits[0]?.largeImageURL || '/placeholder.jpg';
    } catch (error) {
      console.error('Error fetching image:', error);
      return '/placeholder.jpg';
    }
  }
  
  export async function getPlaceImage(placeName) {
    const API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
    try {
      const response = await fetch(
        `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(placeName)}&image_type=photo&per_page=3`
      );
      const data = await response.json();
      return data.hits[0]?.largeImageURL || '/placeholder.jpg';
    } catch (error) {
      console.error('Error fetching image:', error);
      return '/placeholder.jpg';
    }
  }

  */