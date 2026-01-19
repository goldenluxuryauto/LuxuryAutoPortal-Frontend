import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Compute the API base URL for the frontend.
 *
 * - Dev: default to relative URLs so the Vite proxy can forward `/api/*` to the backend
 * - Prod: prefer `VITE_API_URL`; if missing, fall back to known backend URL (Vercel) or same-origin
 */
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

/**
 * Build a full API URL from a path.
 * - If `API_BASE_URL` is empty, returns a relative path to trigger Vite proxy in dev.
 */
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

/**
 * Convert a Google Cloud Storage URL to a proxy URL to avoid CORS issues.
 * If the URL is not a GCS URL, returns it as-is.
 * 
 * @param url - The GCS URL or any other URL
 * @returns The proxy URL for GCS URLs, or the original URL for non-GCS URLs
 */
export function getProxiedImageUrl(url: string): string {
  if (!url) {
    return url;
  }

  // If it's a GCS URL (storage.googleapis.com), proxy it through the backend
  if (url.startsWith("https://storage.googleapis.com/")) {
    const encodedUrl = encodeURIComponent(url);
    const proxyUrl = buildApiUrl(`/api/gcs-image-proxy?url=${encodedUrl}`);
    
    // Debug logging in both dev and production to help diagnose issues
    console.log(`[IMAGE PROXY] Converting GCS URL to proxy:`, {
      original: url.substring(0, 150) + (url.length > 150 ? '...' : ''),
      proxy: proxyUrl.substring(0, 150) + (proxyUrl.length > 150 ? '...' : ''),
      apiBaseUrl: API_BASE_URL || 'relative',
      isProduction: import.meta.env.PROD
    });
    
    return proxyUrl;
  }

  // For other URLs (http/https), return as-is
  // For local paths, use buildApiUrl to proxy through backend
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Local path - use buildApiUrl to proxy through backend
  return buildApiUrl(url.startsWith("/") ? url : `/${url}`);
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

/**
 * Create a typed React Query `queryFn` that fetches JSON from an API path.
 * Supports optional 401 handling behavior for unauthenticated states.
 */
export const getQueryFn = <T,>({ on401: unauthorizedBehavior }: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> =>
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

    // In browsers, `setTimeout` returns a number; in Node it returns a Timeout object.
    // `ReturnType<typeof setTimeout>` works correctly in both environments.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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

        // Handle 401 for /api/auth/me gracefully (expected when not authenticated)
        if (res.status === 401 && path === "/api/auth/me") {
          // Return undefined user without throwing - this is expected when not authenticated
          return { user: undefined } as T;
        }

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null as T;
        }

        // Only throw if response is not ok (and not a handled 401)
        if (!res.ok) {
          await throwIfResNotOk(res);
        }

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
