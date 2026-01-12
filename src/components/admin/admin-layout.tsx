import React, { useState, useMemo } from "react";
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
  roles?: ("admin" | "client" | "employee")[];
}

const allSidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // Client-only profile link for logged-in clients
  { href: "/profile", label: "Profile", icon: User, roles: ["client"] },
  { href: "/admin/admins", label: "Admins", icon: Users, roles: ["admin"] },
  { href: "/admin/clients", label: "Clients", icon: Users, roles: ["admin"] },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/admin/income-expenses", label: "Income and Expenses", icon: DollarSign, roles: ["admin"] },
  { href: "/admin/payments", label: "Client Payments", icon: CreditCard, roles: ["admin"] },
  { href: "/admin/totals", label: "Totals", icon: Calculator },
  { href: "/admin/maintenance", label: "Car Maintenance", icon: Wrench },
  { href: "/admin/forms", label: "Forms", icon: ClipboardList },
  { href: "/admin/view-client", label: "View as a Client", icon: Eye, roles: ["admin"] },
  { href: "/admin/view-employee", label: "View as an Employee", icon: Eye, roles: ["admin"] },
  { href: "/admin/car-rental", label: "Car Rental", icon: Key, roles: ["admin"] },
  { href: "/admin/hr", label: "Human Resources", icon: Briefcase, roles: ["admin"] },
  { href: "/admin/payroll", label: "Payroll", icon: DollarSign, roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/turo-guide", label: "Turo Guide", icon: BookOpen },
  { href: "/admin/training-manual", label: "System Tutorial", icon: GraduationCap },
  { href: "/admin/testimonials", label: "Client Testimonials", icon: Star },
];

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { data } = useQuery<{ user?: any }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const { buildApiUrl } = await import("@/lib/queryClient");
      try {
        const response = await fetch(buildApiUrl("/api/auth/me"), { credentials: "include" });
        if (!response.ok) {
          // 401 is expected when not authenticated - don't log as error
          if (response.status === 401) {
            return { user: undefined };
          }
          // For other errors, still return undefined but don't throw
          return { user: undefined };
        }
        return response.json();
      } catch (error) {
        // Silently handle network errors - AuthGuard will handle redirect
        return { user: undefined };
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes to prevent unnecessary refetches
  });

  const user = data?.user;

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
    <div className="flex h-screen bg-[#0a0a0a]" style={{ overflow: 'auto' }}>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a] transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#1a1a1a]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img 
              src="/logo.svg" 
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
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            
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
        <header className="h-14 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-3 sm:px-4 lg:px-6">
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
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[120px] sm:max-w-none">
                {user.firstName} {user.lastName} <span className="hidden sm:inline">({user.roleName})</span>
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-3 sm:p-4 md:p-6 bg-[#0a0a0a]">
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
