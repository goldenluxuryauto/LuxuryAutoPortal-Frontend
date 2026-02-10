import React, { useState, useMemo, useEffect } from "react";
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
  User,
  ChevronDown
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
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
  children?: SidebarItem[];
}

const allSidebarItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // Client-only profile link for logged-in clients
  { href: "/profile", label: "Profile", icon: User, roles: ["client"] },
  { href: "/admin/admins", label: "Admins", icon: Users, roles: ["admin"] },
  { href: "/admin/clients", label: "Clients", icon: Users, roles: ["admin"] },
  { href: "/cars", label: "Cars", icon: Car },
  { href: "/admin/income-expenses", label: "Income and Expenses", icon: DollarSign, roles: ["admin"] },
  {
    href: "/admin/payments",
    label: "Client Payments",
    icon: CreditCard,
    roles: ["admin"],
    children: [
      { href: "/admin/payments", label: "Payments", icon: CreditCard, roles: ["admin"] },
      { href: "/admin/payment-status", label: "Status", icon: ClipboardList, roles: ["admin"] },
    ],
  },
  { href: "/admin/totals", label: "Totals", icon: Calculator, roles: ["admin"] },
  { href: "/admin/maintenance", label: "Car Maintenance", icon: Wrench, roles: ["admin"] },
  { href: "/admin/forms", label: "Forms", icon: ClipboardList },
  { href: "/admin/view-client", label: "View as a Client", icon: Eye, roles: ["admin"] },
  { href: "/admin/view-employee", label: "View as an Employee", icon: Eye, roles: ["admin"] },
  { href: "/admin/car-rental", label: "Car Rental", icon: Key, roles: ["admin"] },
  {
    href: "/admin/hr",
    label: "Human Resources",
    icon: Briefcase,
    roles: ["admin"],
    children: [
      { href: "/admin/hr/employees", label: "Employees", icon: Users, roles: ["admin"] }
    ],
  },
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

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {};
    allSidebarItems.forEach((it) => {
      if (it.children && it.children.length > 0) {
        obj[it.href] = it.children.some((c) => location === c.href || location.startsWith(c.href));
      }
    });
    return obj;
  });

  const toggleExpand = (href: string) => setExpandedParents((prev) => ({ ...prev, [href]: !prev[href] }));

  useEffect(() => {
    // Auto-expand parent when a child matches the current location
    let changed = false;
    const newState = { ...expandedParents };
    allSidebarItems.forEach((it) => {
      if (it.children && it.children.length > 0) {
        const childActive = it.children.some((c) => location === c.href || location.startsWith(c.href));
        if (childActive && !newState[it.href]) {
          newState[it.href] = true;
          changed = true;
        }
      }
    });
    if (changed) setExpandedParents(newState);
  }, [location]);

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
    
    // Filter parent's visibility based on role and also filter children by role
    return allSidebarItems
      .map((item) => {
        const visible = !item.roles || item.roles.length === 0 || (userRole && item.roles.includes(userRole));
        if (!visible) return null;

        if (item.children && item.children.length > 0) {
          const filteredChildren = item.children.filter((c) => !c.roles || c.roles.length === 0 || (userRole && c.roles.includes(userRole)));
          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter(Boolean) as SidebarItem[];
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
    <div className="flex h-screen bg-background" style={{ overflow: 'auto' }}>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
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
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            
                      if (item.children && item.children.length > 0) {
              // Parent with children - render expandable menu
              const isParentActive = item.children.some((c) => location === c.href || location.startsWith(c.href));
              const isActiveParent = isActive || isParentActive;
              const expanded = expandedParents[item.href] ?? isParentActive;

              return (
                <div key={item.href} className="mx-2">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded transition-colors relative cursor-pointer",
                      isActiveParent ? "bg-sidebar-primary/10 text-sidebar-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                    onClick={() => toggleExpand(item.href)}
                    data-testid={`link-admin-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm flex-1">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </div>

                  {expanded && sidebarOpen && (
                    <div className="mt-1 ml-6">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = location === child.href || (child.href !== '/dashboard' && location.startsWith(child.href));
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded text-sm",
                              childActive ? "bg-sidebar-primary/10 text-sidebar-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                            onClick={() => setMobileMenuOpen(false)}
                            data-testid={`link-admin-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <ChildIcon className="w-3 h-3 shrink-0" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2 rounded transition-colors relative",
                  isActive 
                    ? "bg-sidebar-primary/10 text-sidebar-primary" 
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
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

        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
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
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            {user && (
              <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                {user.firstName} {user.lastName} <span className="hidden sm:inline">({user.roleName})</span>
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto-y p-3 sm:p-4 md:p-6 bg-background">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
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
