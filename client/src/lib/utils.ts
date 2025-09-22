import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects if the user is on iOS device
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detects if the user is on Safari browser
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
}

/**
 * Generates route URL based on platform detection
 * iOS/Safari users get Apple Maps links, others get Google Maps links
 */
export function getRouteUrl(lat: string | number, lng: string | number, name?: string): string {
  const latitude = parseFloat(lat.toString());
  const longitude = parseFloat(lng.toString());
  
  if (isNaN(latitude) || isNaN(longitude)) {
    console.error('Invalid coordinates for route:', { lat, lng });
    return '#';
  }

  if (isIOS() || isSafari()) {
    // Apple Maps for iOS and Safari users with fallback support
    const destination = name ? encodeURIComponent(name) : `${latitude},${longitude}`;
    return `maps://?daddr=${destination}&dirflg=d`;
  } else {
    // Google Maps for Android and other browsers
    const destination = name ? encodeURIComponent(name) : `${latitude},${longitude}`;
    return `https://maps.google.com/maps?daddr=${destination}&dir_action=navigate`;
  }
}

/**
 * Opens route in native maps app with fallback
 */
export function openRoute(lat: string | number, lng: string | number, name?: string): void {
  const latitude = parseFloat(lat.toString());
  const longitude = parseFloat(lng.toString());
  
  if (isNaN(latitude) || isNaN(longitude)) {
    console.error('Invalid coordinates for route:', { lat, lng });
    return;
  }

  // Try native app first
  const nativeUrl = getRouteUrl(latitude, longitude, name);
  
  if (nativeUrl === '#') return;
  
  try {
    const opened = window.open(nativeUrl, '_blank');
    
    // For iOS Safari, if maps:// fails, try the web version
    if (isIOS() && opened === null) {
      const destination = name ? encodeURIComponent(name) : `${latitude},${longitude}`;
      const webFallbackUrl = `http://maps.apple.com/maps?daddr=${destination}&dirflg=d`;
      window.open(webFallbackUrl, '_blank');
    }
  } catch (error) {
    console.error('Failed to open route:', error);
    // Ultimate fallback to Google Maps web
    const destination = name ? encodeURIComponent(name) : `${latitude},${longitude}`;
    const fallbackUrl = `https://maps.google.com/maps?daddr=${destination}&dir_action=navigate`;
    window.open(fallbackUrl, '_blank');
  }
}

/**
 * Checks if a shop is currently open based on opening hours
 */
export function isShopOpen(openingHours: Array<{weekday: number, openTime?: string, closeTime?: string}>): boolean {
  if (!openingHours || openingHours.length === 0) return false;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Convert to HHMM format
  
  // Find today's opening hours
  const todayHours = openingHours.find(hours => hours.weekday === currentDay);
  
  if (!todayHours || !todayHours.openTime || !todayHours.closeTime) {
    return false; // Shop is closed today
  }
  
  // Convert time strings to HHMM numbers for comparison
  const openTime = parseInt(todayHours.openTime.replace(':', ''));
  const closeTime = parseInt(todayHours.closeTime.replace(':', ''));
  
  if (isNaN(openTime) || isNaN(closeTime)) return false;
  
  // Handle overnight hours (e.g., open until 2:00 AM next day)
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  }
  
  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Gets the next opening/closing time for display
 */
export function getShopStatusText(openingHours: Array<{weekday: number, openTime?: string, closeTime?: string}>): string {
  if (!openingHours || openingHours.length === 0) return 'Öffnungszeiten unbekannt';
  
  const now = new Date();
  const currentDay = now.getDay();
  const todayHours = openingHours.find(hours => hours.weekday === currentDay);
  
  if (isShopOpen(openingHours)) {
    if (todayHours?.closeTime) {
      return `Bis ${todayHours.closeTime} geöffnet`;
    }
    return 'Jetzt geöffnet';
  }
  
  // Shop is closed, find next opening
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayHours = openingHours.find(hours => hours.weekday === checkDay);
    
    if (dayHours?.openTime) {
      if (i === 0) {
        return `Öffnet heute um ${dayHours.openTime}`;
      } else if (i === 1) {
        return `Öffnet morgen um ${dayHours.openTime}`;
      } else {
        const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        return `Öffnet ${dayNames[checkDay]} um ${dayHours.openTime}`;
      }
    }
  }
  
  return 'Geschlossen';
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
}

/**
 * Get user's current geolocation
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Der Zugriff auf den Standort wurde verweigert.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Standortinformationen sind nicht verfügbar.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Zeitüberschreitung beim Abrufen des Standorts.'));
            break;
          default:
            reject(new Error('Ein unbekannter Fehler beim Abrufen des Standorts ist aufgetreten.'));
            break;
        }
      },
      options
    );
  });
}

/**
 * Request geolocation permission and get position with user feedback
 */
export async function requestLocationPermission(): Promise<{ position?: GeolocationPosition; error?: string }> {
  try {
    const position = await getCurrentPosition();
    return { position };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Standortabruf' };
  }
}

/**
 * Check if coordinates are within a radius from a center point
 */
export function isWithinRadius(
  centerLat: number, 
  centerLng: number, 
  targetLat: number, 
  targetLng: number, 
  radiusKm: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, targetLat, targetLng);
  return distance <= radiusKm;
}

/**
 * Sort shops by distance from a point
 */
export function sortShopsByDistance<T extends { lat: string | number; lng: string | number }>(
  shops: T[], 
  userLat: number, 
  userLng: number
): (T & { distance: number })[] {
  return shops
    .map(shop => ({
      ...shop,
      distance: calculateDistance(
        userLat, 
        userLng, 
        parseFloat(shop.lat.toString()), 
        parseFloat(shop.lng.toString())
      )
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Filter shops within a radius from user location
 */
export function filterShopsByRadius<T extends { lat: string | number; lng: string | number }>(
  shops: T[], 
  userLat: number, 
  userLng: number, 
  radiusKm: number
): T[] {
  return shops.filter(shop => 
    isWithinRadius(
      userLat, 
      userLng, 
      parseFloat(shop.lat.toString()), 
      parseFloat(shop.lng.toString()), 
      radiusKm
    )
  );
}
