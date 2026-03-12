/**
 * Google Maps API Loader
 * Ensures Google Maps is properly loaded before use
 */

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

let isLoading = false;
let isLoaded = false;
const loadPromises: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

export function loadGoogleMapsAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isLoaded && window.google?.maps) {
      resolve();
      return;
    }

    // Add to queue if currently loading
    if (isLoading) {
      loadPromises.push({ resolve, reject });
      return;
    }

    // Check if API key is configured
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      const error = new Error('Google Maps API key not configured. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env.local file.');
      reject(error);
      loadPromises.forEach(({ reject }) => reject(error));
      loadPromises.length = 0;
      return;
    }

    isLoading = true;

    // Create callback function
    window.initGoogleMaps = () => {
      isLoaded = true;
      isLoading = false;
      
      // Resolve all pending promises
      resolve();
      loadPromises.forEach(({ resolve }) => resolve());
      loadPromises.length = 0;
    };

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      isLoading = false;
      const error = new Error('Failed to load Google Maps API. Please check your internet connection and API key.');
      reject(error);
      loadPromises.forEach(({ reject }) => reject(error));
      loadPromises.length = 0;
    };

    document.head.appendChild(script);
    
    // Add to queue
    loadPromises.push({ resolve, reject });
  });
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}