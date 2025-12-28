import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Users, DollarSign, TrendingUp, Mail, Phone, Clock, MessageCircle, CheckCircle } from "lucide-react";
import QuickLinks from "@/components/admin/QuickLinks";
import { OnboardingTutorial, useTutorial } from "@/components/onboarding/OnboardingTutorial";
import { buildApiUrl } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { openTutorial, isOpen: tutorialIsOpen } = useTutorial();
  const queryClient = useQueryClient();
  const hasAttemptedOpen = useRef(false); // Track if we've already tried to open the tutorial
  
  // Fetch user role information
  const { data: userData } = useQuery<{ user?: { id?: number; isAdmin?: boolean; isClient?: boolean; isEmployee?: boolean; firstName?: string; lastName?: string; roleName?: string; tourCompleted?: boolean } }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/auth/me"), {
        credentials: "include",
      });
      if (!response.ok) {
        return { user: undefined };
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes to prevent unnecessary refetches
  });

  // Mutation to mark tour as shown (when tutorial is first displayed)
  const markTourShownMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(buildApiUrl("/api/auth/mark-tour-shown"), {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        // Don't throw error - just log it to prevent logout
        console.error("Failed to mark tour as shown:", response.status, response.statusText);
        return { success: false };
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Only invalidate if mutation was successful
      if (data?.success) {
        // Add a small delay before invalidating to ensure session is stable
        // This prevents logout issues right after login
        setTimeout(() => {
          // Invalidate user query to refresh user data with updated tourCompleted
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }, 500);
      }
    },
    onError: (error) => {
      // Log error but don't throw - prevent logout
      console.error("Error marking tour as shown:", error);
    },
  });

  const user = userData?.user;
  const isAdmin = user?.isAdmin || false;
  const isClient = user?.isClient || false;
  const isEmployee = user?.isEmployee || false;
  const tourCompleted = user?.tourCompleted === true;

  // Auto-open tutorial for new users (admin, client, employee) who haven't completed the tour
  // Only on dashboard page, only once per user
  useEffect(() => {
    // Don't open if tour is already completed (tourCompleted === 1)
    if (tourCompleted) {
      return;
    }

    // Don't open if tutorial is already open
    if (tutorialIsOpen) {
      return;
    }

    // Only open if conditions are met and we haven't already attempted
    // This should only happen on dashboard page for users with tourCompleted === 0
    // First check the database value, then display the modal
    // Check for all roles: admin, client, or employee
    if ((isAdmin || isClient || isEmployee) && !tourCompleted && user?.id && !hasAttemptedOpen.current) {
      hasAttemptedOpen.current = true; // Mark that we've attempted to open
      
      // Small delay to ensure page is fully loaded, then open tutorial
      const timer = setTimeout(() => {
        openTutorial();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, isClient, isEmployee, tourCompleted, user?.id, tutorialIsOpen, openTutorial]);

  // When tutorial is closed, mark it as shown in database
  // Add a small delay to ensure session is fully established before making the mutation
  useEffect(() => {
    // If tutorial was open and is now closed, and tourCompleted is still 0, update it
    if (!tutorialIsOpen && hasAttemptedOpen.current && !tourCompleted && user?.id) {
      // Add a small delay to ensure session is fully established
      // This prevents logout issues right after login
      const timer = setTimeout(() => {
        markTourShownMutation.mutate();
      }, 1000); // Wait 1 second after tutorial closes before updating
      
      return () => clearTimeout(timer);
    }
  }, [tutorialIsOpen, tourCompleted, user?.id, markTourShownMutation]);

  const { data: stats, isLoading } = useQuery<{ activeVehicles?: number; totalClients?: number; monthlyRevenue?: number; growthRate?: number }>({
    queryKey: ["/api/admin/dashboard"],
    retry: false,
    enabled: !!user, // Only fetch if user is authenticated
  });

  const quickStartSteps = [
    "Navigate to Forms tab",
    "Share QR code with potential clients",
    "Get instant notifications via Slack and email",
    "Review and approve in the portal",
  ];

  const features = [
    "Automated client onboarding",
    "Digital document collection",
    "ACH payment setup",
    "Insurance verification",
  ];

  const supportInfo = {
    email: "support@goldenluxuryauto.com",
    phone: "(555) 123-4567",
    hours: "Mon-Fri: 9AM - 6PM EST",
    chat: "Live chat available",
  };

  // Role-specific welcome messages
  const getWelcomeMessage = () => {
    if (isAdmin) {
      return {
        title: "Welcome to the Admin Portal",
        description: "Premium vehicle management portal for tracking clients, vehicles, and revenue.",
      };
    } else if (isClient) {
      return {
        title: "Welcome to Your Dashboard",
        description: "Manage your vehicles, view your account information, and access your resources.",
      };
    } else if (isEmployee) {
      return {
        title: "Welcome to the Employee Portal",
        description: "Access your assigned tasks and resources.",
      };
    }
    return {
      title: "Welcome to the Portal",
      description: "Premium vehicle management portal.",
    };
  };

  const welcome = getWelcomeMessage();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Golden Luxury Auto" 
            className="h-[47px] md:h-[60px] w-auto mx-auto object-contain mb-6 drop-shadow-[0_0_12px_rgba(234,235,128,0.4)]"
          />
          <h1 className="text-2xl font-semibold text-[#EAEB80] mb-2">
            {welcome.title}
          </h1>
          <p className="text-gray-500 text-sm">
            {welcome.description}
          </p>
          {user && (
            <p className="text-gray-600 text-xs mt-2">
              Logged in as {user.firstName} {user.lastName} ({user.roleName})
            </p>
          )}
        </div>

        {/* Role-based stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Show all stats for admins */}
          {isAdmin && (
            <>
              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">Active Vehicles</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-vehicles">
                    {isLoading ? "..." : stats?.activeVehicles || 24}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">Total Clients</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-clients">
                    {isLoading ? "..." : stats?.totalClients || 18}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">Monthly Revenue</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-revenue">
                    ${isLoading ? "..." : ((stats?.monthlyRevenue || 42500) / 1000).toFixed(1)}K
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">Growth Rate</span>
                  </div>
                  <p className="text-3xl font-bold text-[#EAEB80]" data-testid="stat-growth">
                    +{isLoading ? "..." : stats?.growthRate || 23}%
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Show limited stats for clients */}
          {isClient && (
            <>
              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">My Vehicles</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-vehicles">
                    {isLoading ? "..." : stats?.activeVehicles || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">My Earnings</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-revenue">
                    ${isLoading ? "..." : ((stats?.monthlyRevenue || 0) / 1000).toFixed(1)}K
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Show limited stats for employees */}
          {isEmployee && !isAdmin && !isClient && (
            <>
              <Card className="bg-[#111111] border-[#EAEB80]/20 hover:border-[#EAEB80]/40 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="w-4 h-4 text-[#EAEB80]" />
                    <span className="text-sm text-gray-400">Assigned Vehicles</span>
                  </div>
                  <p className="text-3xl font-bold text-white" data-testid="stat-vehicles">
                    {isLoading ? "..." : stats?.activeVehicles || 0}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Show Quick Start only for admins */}
          {isAdmin && (
            <Card className="bg-[#111111] border-[#EAEB80]/20">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold text-white mb-4">Quick Start</h3>
                <ol className="space-y-3">
                  {quickStartSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm text-gray-400">
                      <span className="text-[#EAEB80] font-medium">{index + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Show Quick Start for clients with different steps */}
          {isClient && (
            <Card className="bg-[#111111] border-[#EAEB80]/20">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold text-white mb-4">Quick Start</h3>
                <ol className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-[#EAEB80] font-medium">1.</span>
                    <span>View your vehicles in the Cars section</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-[#EAEB80] font-medium">2.</span>
                    <span>Check your earnings and totals</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-[#EAEB80] font-medium">3.</span>
                    <span>Access forms and resources</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-gray-400">
                    <span className="text-[#EAEB80] font-medium">4.</span>
                    <span>Update your profile information</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}

          <Card className="bg-[#111111] border-[#EAEB80]/20">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckCircle className="w-4 h-4 text-[#EAEB80]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#EAEB80]/20">
            <CardContent className="p-5">
              <h3 className="text-base font-semibold text-white mb-4">Support</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Mail className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.email}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Phone className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.phone}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <Clock className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.hours}</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <MessageCircle className="w-4 h-4 text-[#EAEB80]" />
                  <span>{supportInfo.chat}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quick Links</h2>
          <QuickLinks />
        </div>

        {/* Tutorial - shows automatically for new users (admin, client, employee) who haven't completed the tour */}
        {(isAdmin || isClient || isEmployee) && <OnboardingTutorial />}
      </div>
    </AdminLayout>
  );
}
