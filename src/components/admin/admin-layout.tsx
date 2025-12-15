import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  DollarSign, 
  Calculator,
  Wrench,
  ClipboardList,
  Eye,
  Key,
  Briefcase,
  CreditCard,
  Settings,
  BookOpen,
  GraduationCap,
  Star,
  LogOut,
  Menu,
  X,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AuthGuard } from "./auth-guard";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface SidebarItem {
  href: string;
  label: string;
  icon: any;
  badge?: number;
  badgeKey?: string;
  roles?: ("admin" | "client" | "employee")[];
}

const allSidebarItems: SidebarItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/admins", label: "Admins", icon: Users, roles: ["admin"] },
  { href: "/admin/clients", label: "Clients", icon: Users, roles: ["admin"] },
  { href: "/admin/cars", label: "Cars", icon: Car },
  { href: "/admin/profile", label: "Profile", icon: User },
  { href: "/admin/income-expenses", label: "Income and Expenses", icon: DollarSign, roles: ["admin"] },
  { href: "/admin/payments", label: "Client Payments", icon: CreditCard, roles: ["admin"] },
  { href: "/admin/totals", label: "Totals", icon: Calculator },
  { href: "/admin/earnings", label: "Earnings Calculator", icon: Calculator },
  { href: "/admin/maintenance", label: "Car Maintenance", icon: Wrench },
  { href: "/admin/forms", label: "Forms", icon: ClipboardList, badgeKey: "/admin/forms" },
  { href: "/admin/view-client", label: "View as a Client", icon: Eye, roles: ["admin"] },
  { href: "/admin/view-employee", label: "View as an Employee", icon: Eye, roles: ["admin"] },
  { href: "/admin/car-rental", label: "Car Rental", icon: Key, roles: ["admin"] },
  { href: "/admin/hr", label: "Human Resources", icon: Briefcase, roles: ["admin"] },
  { href: "/admin/payroll", label: "Payroll", icon: DollarSign, roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["admin"] },
  { href: "/admin/turo-guide", label: "Turo Guide", icon: BookOpen },
  { href: "/admin/training-manual", label: "Training Manual", icon: GraduationCap },
  { href: "/admin/testimonials", label: "Client Testimonials", icon: Star },
];

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  const { data } = useQuery<{ user?: any }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auth/me`, { credentials: "include" });
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
    retry: false,
  });

  const user = data?.user;

  // Fetch badge counts
  useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const counts: Record<string, number> = {};
      
      // Fetch clients count (active clients)
      try {
        const clientsResponse = await fetch(`${apiUrl}/api/clients?limit=1`, { credentials: "include" });
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          counts["/admin/clients"] = clientsData.pagination?.total || 0;
        }
      } catch (e) {
        counts["/admin/clients"] = 0;
      }
      
      // Fetch available cars count (active cars from car table)
      try {
        const carsResponse = await fetch(`${apiUrl}/api/cars?status=available`, { credentials: "include" });
        if (carsResponse.ok) {
          const carsData = await carsResponse.json();
          counts["/admin/cars"] = carsData.data?.length || 0;
        }
      } catch (e) {
        counts["/admin/cars"] = 0;
      }
      
      // Fetch car onboarding submissions count (for Forms badge)
      try {
        const onboardingCountResponse = await fetch(`${apiUrl}/api/car-onboarding/today-count`, { credentials: "include" });
        if (onboardingCountResponse.ok) {
          const onboardingCountData = await onboardingCountResponse.json();
          counts["/admin/forms"] = (counts["/admin/forms"] || 0) + (onboardingCountData.count || 0);
        }
      } catch (e) {
        // Ignore error, keep existing count
      }
      
      setBadgeCounts(counts);
      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter sidebar items based on user role
  const sidebarItems = useMemo(() => {
    if (!user) return [];

    const userRole = user.isAdmin ? "admin" : user.isClient ? "client" : user.isEmployee ? "employee" : null;
    
    return allSidebarItems.filter((item) => {
      // If no roles specified, show to all
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      
      // If roles specified, check if user's role is included
      return userRole && item.roles.includes(userRole);
    });
  }, [user]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      
      // Clear ALL query caches to prevent showing previous user's data
      // This ensures when a new user logs in, they see fresh data, not cached data from previous user
      queryClient.clear();
      
      // Also invalidate auth query explicitly
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails on server, clear cache to prevent data leakage
      queryClient.clear();
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a] transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#1a1a1a]">
          <Link href="/admin" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Golden Luxury Auto" 
              className={cn(
                "object-contain transition-all duration-300 drop-shadow-[0_0_8px_rgba(234,235,128,0.3)]",
                sidebarOpen ? "w-[180px] md:w-[200px]" : "w-[40px]"
              )}
            />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2 rounded transition-colors relative",
                  isActive 
                    ? "bg-[#EAEB80]/10 text-[#EAEB80]" 
                    : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-admin-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="text-sm">{item.label}</span>
                    {(item.badge || (item.badgeKey && badgeCounts[item.href])) && (item.badge || badgeCounts[item.href] || 0) > 0 && (
                      <span className="ml-auto bg-[#EAEB80] text-black text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[24px] text-center">
                        {item.badge || badgeCounts[item.href] || 0}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1a1a1a]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        <header className="h-14 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-400">
                {user.firstName} {user.lastName} ({user.roleName})
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-[#0a0a0a]">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthGuard>
  );
}
