import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Use empty string for relative URLs (works with Vite proxy in dev, and same-origin in production)
// In development, Vite proxy handles /api requests and forwards to backend
// In production, use VITE_API_URL if set, otherwise use relative URLs
// 
// IMPORTANT: In development, do NOT set VITE_API_URL to localhost:5000 (Vite server port)
// Instead, either:
//   1. Leave VITE_API_URL unset (uses relative URLs + Vite proxy to localhost:3001)
//   2. Set VITE_API_URL to http://localhost:3001 (direct backend URL)
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.replace(/\/$/, ""))
  : ""; // Empty string = relative URLs (use Vite proxy in dev)

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
      "   Using relative URL to enable proxy. Set VITE_API_URL to http://localhost:3001 or unset it."
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

    const res = await fetch(buildApiUrl(path), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
