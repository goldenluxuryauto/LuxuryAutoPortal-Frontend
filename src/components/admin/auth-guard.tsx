import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  const { data, isLoading, isError, error } = useQuery<{ user?: { id?: number; email?: string; isAdmin?: boolean; isClient?: boolean; isEmployee?: boolean } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError || !data?.user) {
        setLocation("/admin/login");
      } else {
        setIsChecking(false);
      }
    }
  }, [isLoading, isError, data, setLocation]);

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
