/**
 * Notification Bell - System notifications dropdown
 * Shows expense form submission, approval, decline events
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { buildApiUrl } from "@/lib/queryClient";
import { Bell, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: Notification[];
    unreadCount: number;
  }>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/notifications?limit=10"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildApiUrl(`/api/notifications/${id}/read`), {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl("/api/notifications/read-all"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.link) {
      try {
        const url = new URL(n.link);
        if (url.origin === window.location.origin) {
          setLocation(url.pathname + url.search);
        } else {
          window.location.href = n.link;
        }
      } catch {
        setLocation(n.link.startsWith("/") ? n.link : "/admin/forms");
      }
    }
    setOpen(false);
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-400 hover:text-[#EAEB80] transition-colors rounded-lg hover:bg-[#1a1a1a]"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-[#EAEB80] text-black rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-hidden bg-[#111111] border border-[#2a2a2a] rounded-lg shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]">
            <span className="text-sm font-medium text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs text-[#EAEB80] hover:underline flex items-center gap-1"
              >
                {markAllReadMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#EAEB80]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors",
                    !n.isRead && "bg-[#1a1a1a]/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#EAEB80] shrink-0" />}
                    <div className={cn("flex-1 min-w-0", !n.isRead && "ml-0")}>
                      <p className="text-sm font-medium text-white truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-400 truncate mt-0.5">{n.message}</p>}
                      <p className="text-[10px] text-gray-500 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
