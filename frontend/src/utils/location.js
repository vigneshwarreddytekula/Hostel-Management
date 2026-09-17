/**
 * Get current browser geolocation coordinates (latitude, longitude) with high GPS accuracy
 */
export function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    // Attempt high accuracy GPS position first with zero cache (maximumAge: 0)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        // Fallback to standard accuracy if high accuracy times out (useful for laptops/desktops without dedicated GPS)
        if (error.code === error.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              });
            },
            () => {
              reject(new Error('Location request timed out. Please check location permissions.'));
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
          );
        } else {
          let msg = 'Unable to retrieve your location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable on your device.';
          }
          reject(new Error(msg));
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal place
}

/**
 * Search/Geocode an address/location string into latitude and longitude using OpenStreetMap Nominatim
 */
export async function geocodeAddress(query) {
  if (!query || !query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'NestoraHostelsApp/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

/**
 * Reverse geocode latitude and longitude into a precise address string using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'NestoraHostelsApp/1.0' } }
    );
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      const buildingOrRoad = a.building || a.road || a.pedestrian || a.suburb || a.neighbourhood || '';
      const cityOrArea = a.city || a.town || a.village || a.county || '';
      if (buildingOrRoad && cityOrArea) return `${buildingOrRoad}, ${cityOrArea}`;
    }
    if (data && data.display_name) {
      return data.display_name;
    }
    return null;
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}
