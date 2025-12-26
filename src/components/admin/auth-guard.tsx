import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const { data, isLoading, isError, error, isFetching } = useQuery<{ user?: { id?: number; email?: string; isAdmin?: boolean; isClient?: boolean; isEmployee?: boolean } }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const { buildApiUrl } = await import("@/lib/queryClient");
      const response = await fetch(buildApiUrl("/api/auth/me"), { credentials: "include" });
      if (!response.ok) {
        // Return undefined user instead of throwing to prevent logout on refetch errors
        return { user: undefined };
      }
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    // Use cached data if available, don't refetch immediately
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Handle initial authentication check
    // Add a delay to allow session cookie to be fully set after login redirect
    if (!isLoading && !initialLoadComplete) {
      // Wait for session to stabilize after login redirect
      // This prevents false negatives when the cookie hasn't been set yet
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
        
        // Check if we have a user in the data
        if (data?.user) {
          // User is authenticated on initial load
          setHasAuthenticated(true);
          setIsChecking(false);
        } else {
          // No user found - but this might be a race condition
          // Wait a bit more and check again before redirecting
          setTimeout(() => {
            // Re-check the query data - it might have updated by now
            // We'll check again in the next effect cycle
            if (!data?.user) {
              // Still no user after waiting - redirect to login
              setLocation("/admin/login");
            }
          }, 800);
        }
      }, 500); // Wait 500ms before initial check to allow session to stabilize
      
      return () => clearTimeout(timer);
    }
    
    // After initial load is complete, handle authentication state changes
    if (initialLoadComplete && !isLoading && !isFetching) {
      if (data?.user) {
        // We have a user - mark as authenticated
        if (!hasAuthenticated) {
          setHasAuthenticated(true);
          setIsChecking(false);
        }
      } else if (!data?.user && hasAuthenticated) {
        // User was authenticated but now session is gone
        // This handles actual session expiration
        // Add a delay to prevent false positives from race conditions
        const timer = setTimeout(() => {
          // Double-check that we still don't have a user
          // The query might have updated by now
          if (!data?.user) {
            setLocation("/admin/login");
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isFetching, isError, data, setLocation, hasAuthenticated, initialLoadComplete]);

  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#EAEB80] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

