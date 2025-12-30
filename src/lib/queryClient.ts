import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Use empty string for relative URLs (works with Vite proxy in dev, and same-origin in production)
// In development, Vite proxy handles /api requests and forwards to backend
// In production, use VITE_API_URL if set, otherwise use relative URLs
// 
// IMPORTANT: In development, do NOT set VITE_API_URL to localhost:5000 (Vite server port)
// Instead, either:
//   1. Leave VITE_API_URL unset (uses relative URLs + Vite proxy to localhost:3000)
//   2. Set VITE_API_URL to http://localhost:3000 (direct backend URL)
//
// For mobile/Replit: If VITE_API_URL is not set, use fallback backend URL
// IMPORTANT: In production, VITE_API_URL MUST be set in Vercel environment variables
// Fallback to known backend URL if not set (for emergency fallback only)
const computeApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/$/, "");
    console.log(`[API] Using VITE_API_URL: ${url}`);
    return url;
  }
  
  // In production, if VITE_API_URL is not set, use fallback backend URL
  // This is a temporary fallback - VITE_API_URL should be set in Vercel
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    
    // If accessing from Vercel, use known backend URL as fallback
    if (currentOrigin.includes('vercel.app')) {
      const fallbackUrl = 'https://luxuryautoportal-replit-1.onrender.com';
      console.warn(`⚠️ [API] VITE_API_URL not set! Using fallback backend URL: ${fallbackUrl}`);
      console.warn(`⚠️ [API] Please set VITE_API_URL in Vercel environment variables to: ${fallbackUrl}`);
      return fallbackUrl;
    }
    
    // For other production domains, try current origin (for same-origin setups)
    if (!currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
      console.warn(`⚠️ [API] VITE_API_URL not set! Using current origin as fallback: ${currentOrigin}`);
      console.warn(`⚠️ [API] If API calls fail, please set VITE_API_URL environment variable`);
      return currentOrigin;
    }
  }
  
  return ""; // Empty string = relative URLs (use Vite proxy in dev)
};

const API_BASE_URL = computeApiBaseUrl();

export const getApiBaseUrl = () => API_BASE_URL;

export function buildApiUrl(path: string): string {
  if (!path) {
    return API_BASE_URL;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  // In development mode, check if VITE_API_URL is incorrectly set to localhost:5000
  // This would break the Vite proxy - warn and use relative URL instead
  if (import.meta.env.DEV && API_BASE_URL === "http://localhost:5000") {
    console.warn(
      "⚠️ [API] VITE_API_URL is set to http://localhost:5000 which bypasses Vite proxy.\n" +
      "   Using relative URL to enable proxy. Set VITE_API_URL to http://localhost:3000 or unset it."
    );
    return normalizedPath; // Use relative URL to trigger Vite proxy
  }
  
  // If API_BASE_URL is empty, return just the path (relative URL for Vite proxy)
  // Otherwise, prepend the base URL
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/*
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(buildApiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}
*/


export async function apiRequest(
  method: string,
  path: string,  // Changed from 'url' to 'path' for clarity
  data?: unknown | undefined,
): Promise<Response> {
  // Use buildApiUrl to ensure proper URL construction (respects Vite proxy in dev)
  const fullUrl = buildApiUrl(path);
  console.log('API call to:', fullUrl);  // Debug log (remove later if not needed)

  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}


type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [path] = queryKey;
    if (typeof path !== "string") {
      throw new Error("Query keys must include the API path as the first element");
    }

    const fullUrl = buildApiUrl(path);
    
    // Enhanced logging for mobile and production debugging
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isProduction = import.meta.env.PROD;
      
      // Always log in production or on mobile for debugging
      if (isProduction || isMobile) {
        console.log(`[API] Fetching: ${fullUrl}`);
        console.log(`[API] Current origin: ${window.location.origin}`);
        console.log(`[API] API base URL: ${API_BASE_URL || 'relative'}`);
        console.log(`[API] VITE_API_URL env: ${import.meta.env.VITE_API_URL || 'Not set'}`);
        if (isMobile) {
          console.log(`[API] Mobile device detected`);
        }
      }
    }

    let timeoutId: NodeJS.Timeout | null = null;
    try {
      // Add timeout to prevent hanging requests (especially on mobile/slow connections)
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const res = await fetch(fullUrl, {
        credentials: "include",
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Clear timeout if error occurs
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Enhanced error logging for mobile and production
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[API] Request timeout (10s) for ${fullUrl}`);
      }
      
      // Enhanced error logging for mobile and production
      if (typeof window !== 'undefined') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isProduction = import.meta.env.PROD;
        
        if (isMobile || isProduction) {
          console.error(`[API] Fetch error for ${fullUrl}:`, error);
          console.error(`[API] Error details:`, {
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.name : 'Unknown',
            url: fullUrl,
            origin: window.location.origin,
            apiBaseUrl: API_BASE_URL || 'relative',
            viteApiUrl: import.meta.env.VITE_API_URL || 'Not set',
            isMobile,
            isProduction
          });
          
          // Show user-friendly error message in console for debugging
          if (isProduction) {
            console.error(`\n❌ [API CONNECTION ERROR]`);
            console.error(`   The app cannot connect to the backend API.`);
            console.error(`   Current API URL: ${fullUrl}`);
            console.error(`   Expected: Backend should be accessible at this URL`);
            console.error(`   Solution: Set VITE_API_URL environment variable in Vercel`);
            console.error(`   Expected value: https://luxuryautoportal-replit-1.onrender.com\n`);
          }
        }
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      // Don't throw errors by default - let components handle them
      throwOnError: false,
      // Add timeout to prevent queries from hanging indefinitely
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    },
    mutations: {
      retry: false,
      // Don't throw errors by default
      throwOnError: false,
    },
  },
});
