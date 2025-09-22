import { z } from "zod";

// Google Places API Types
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  formatted_phone_number?: string;
  website?: string;
  business_status?: string;
  types: string[];
}

export interface GooglePlaceDetails extends GooglePlace {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    author_url?: string;
    language: string;
    profile_photo_url?: string;
    rating: number;
    relative_time_description: string;
    text: string;
    time: number;
  }>;
  utc_offset?: number;
}

export interface GoogleSearchFilters {
  query?: string;
  location?: string;
  radius?: number;
  lat?: number;
  lng?: number;
  type?: string;
}

export class GooglePlacesClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Places API key is required');
    }
    this.apiKey = apiKey;
  }

  // Search for places by query (text search)
  async searchPlaces(filters: GoogleSearchFilters): Promise<GooglePlace[]> {
    const { query, location, radius = 5000, lat, lng, type = 'restaurant' } = filters;
    
    if (!query && !location && (!lat || !lng)) {
      throw new Error('Query, location, or coordinates are required');
    }

    const url = new URL(`${this.baseUrl}/textsearch/json`);
    url.searchParams.set('key', this.apiKey);
    
    if (query) {
      // Enhance query to focus on döner/kebab shops
      const enhancedQuery = `${query} döner kebab turkish restaurant`;
      url.searchParams.set('query', enhancedQuery);
    }
    
    if (location) {
      url.searchParams.set('location', location);
      url.searchParams.set('radius', radius.toString());
    } else if (lat && lng) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', radius.toString());
    }
    
    url.searchParams.set('type', type);

    try {
      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      // Filter results to focus on döner/kebab related places
      const filteredResults = (data.results || []).filter((place: GooglePlace) => {
        const name = place.name.toLowerCase();
        const types = place.types.join(' ').toLowerCase();
        return (
          name.includes('döner') || 
          name.includes('doner') || 
          name.includes('kebab') || 
          name.includes('turkish') ||
          types.includes('turkish') ||
          name.includes('istanbul') ||
          name.includes('anatolien') ||
          name.includes('orient')
        );
      });

      return filteredResults;
    } catch (error) {
      console.error('Google Places search error:', error);
      throw new Error(`Failed to search Google Places: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get detailed information about a specific place
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails> {
    const url = new URL(`${this.baseUrl}/details/json`);
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('fields', [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'price_level',
      'opening_hours',
      'photos',
      'formatted_phone_number',
      'international_phone_number',
      'website',
      'reviews',
      'business_status',
      'types',
      'utc_offset'
    ].join(','));

    try {
      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      return data.result;
    } catch (error) {
      console.error('Google Places details error:', error);
      throw new Error(`Failed to get place details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get photo URL from photo reference
  getPhotoUrl(photoReference: string, maxWidth = 800): string {
    const url = new URL(`${this.baseUrl}/photo`);
    url.searchParams.set('photo_reference', photoReference);
    url.searchParams.set('maxwidth', maxWidth.toString());
    url.searchParams.set('key', this.apiKey);
    return url.toString();
  }

  // Download photo data for storage
  async downloadPhoto(photoReference: string, maxWidth = 2048): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }> {
    const photoUrl = this.getPhotoUrl(photoReference, maxWidth);
    
    try {
      const response = await fetch(photoUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download photo: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      const filename = `google-${photoReference}.jpg`;

      return { buffer, mimeType, filename };
    } catch (error) {
      throw new Error(`Photo download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process Google photos for a place
  async processPlacePhotos(googlePlace: GooglePlace | GooglePlaceDetails): Promise<{
    photos: Array<{
      googlePhotoReference: string;
      width: number;
      height: number;
      url: string;
    }>;
    primaryPhoto?: {
      googlePhotoReference: string;
      width: number;
      height: number;
      url: string;
    };
  }> {
    if (!googlePlace.photos || googlePlace.photos.length === 0) {
      return { photos: [] };
    }

    const processedPhotos = googlePlace.photos.map(photo => ({
      googlePhotoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      url: this.getPhotoUrl(photo.photo_reference, 800)
    }));

    // First photo is usually the primary/best one
    const primaryPhoto = processedPhotos[0] || undefined;

    return {
      photos: processedPhotos,
      primaryPhoto
    };
  }

  // Enhanced place conversion with photo metadata
  async convertToShopDataWithPhotos(googlePlace: GooglePlaceDetails): Promise<{
    shopData: any;
    photoData: Array<{
      googlePhotoReference: string;
      width: number;
      height: number;
      url: string;
      category: string;
    }>;
  }> {
    const shopData = this.convertToShopData(googlePlace);
    const photoResult = await this.processPlacePhotos(googlePlace);
    
    // Categorize photos based on Google's photo attributions and types
    const photoData = photoResult.photos.map((photo, index) => ({
      ...photo,
      category: index === 0 ? 'storefront' : 'other' // First photo is usually storefront
    }));

    return { shopData, photoData };
  }

  // Search for places nearby a location
  async searchNearby(lat: number, lng: number, radius = 5000, keyword = 'döner kebab'): Promise<GooglePlace[]> {
    const url = new URL(`${this.baseUrl}/nearbysearch/json`);
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('type', 'restaurant');
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('key', this.apiKey);

    try {
      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Google Places nearby search error:', error);
      throw new Error(`Failed to search nearby places: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Convert Google opening hours to our format
  static convertOpeningHours(googleHours?: GooglePlace['opening_hours']): Array<{
    weekday: number;
    openTime: string | null;
    closeTime: string | null;
    note?: string;
  }> {
    if (!googleHours?.periods) {
      return [];
    }

    const hours: Array<{
      weekday: number;
      openTime: string | null;
      closeTime: string | null;
      note?: string;
    }> = [];

    for (const period of googleHours.periods) {
      hours.push({
        weekday: period.open.day,
        openTime: this.formatTime(period.open.time),
        closeTime: period.close ? this.formatTime(period.close.time) : null,
        note: undefined
      });
    }

    return hours;
  }

  // Convert time from HHMM to HH:MM format
  private static formatTime(time: string): string {
    if (time.length === 4) {
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    return time;
  }

  // Extract photos and prepare them for our system
  static convertPhotos(googlePhotos?: GooglePlace['photos'], maxPhotos = 5): Array<{
    googlePhotoReference: string;
    width: number;
    height: number;
    source: 'google';
  }> {
    if (!googlePhotos) {
      return [];
    }

    return googlePhotos.slice(0, maxPhotos).map(photo => ({
      googlePhotoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      source: 'google' as const
    }));
  }

  // Convert Google Place to our shop format
  static convertToShopData(googlePlace: GooglePlaceDetails): {
    name: string;
    lat: string;
    lng: string;
    street: string;
    city: string;
    zip?: string;
    phone?: string;
    website?: string;
    priceLevel?: number;
    googlePlaceId: string;
    dataSource: 'google';
    googleRating?: string;
    googleReviewCount?: number;
    isPublished: boolean;
  } {
    // Extract city and street from formatted address
    const addressParts = googlePlace.formatted_address.split(', ');
    let street = '';
    let city = '';
    let zip = '';

    // Try to parse German address format
    if (addressParts.length >= 2) {
      street = addressParts[0];
      const cityPart = addressParts[1];
      
      // Extract ZIP code and city from "09599 Freiberg" format
      const zipCityMatch = cityPart.match(/^(\d{5})\s+(.+)$/);
      if (zipCityMatch) {
        zip = zipCityMatch[1];
        city = zipCityMatch[2];
      } else {
        city = cityPart;
      }
    } else {
      street = googlePlace.formatted_address;
      city = 'Unknown';
    }

    return {
      name: googlePlace.name,
      lat: googlePlace.geometry.location.lat.toString(),
      lng: googlePlace.geometry.location.lng.toString(),
      street,
      city,
      zip: zip || undefined,
      phone: googlePlace.formatted_phone_number || undefined,
      website: googlePlace.website || undefined,
      priceLevel: googlePlace.price_level || undefined,
      googlePlaceId: googlePlace.place_id,
      dataSource: 'google' as const,
      googleRating: googlePlace.rating?.toString(),
      googleReviewCount: googlePlace.user_ratings_total || undefined,
      isPublished: true
    };
  }
}

// Export a factory function to create the client
export function createGooglePlacesClient(): GooglePlacesClient | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Places API key not found. Google integration will be disabled.');
    return null;
  }

  return new GooglePlacesClient(apiKey);
}