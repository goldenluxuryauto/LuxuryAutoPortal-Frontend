/**
 * Utility functions for calculating and displaying online/offline status
 */

/**
 * Calculate if a user is online based on their last login time
 * @param lastLoginAt - ISO date string or Date object of last login
 * @param onlineThresholdMinutes - Minutes threshold to consider user online (default: 15)
 * @returns true if user is online, false if offline, null if never logged in
 */
export function calculateOnlineStatus(
  lastLoginAt: string | Date | null | undefined,
  onlineThresholdMinutes: number = 15
): boolean | null {
  if (!lastLoginAt) {
    return null; // Never logged in
  }

  const lastLogin = new Date(lastLoginAt);
  const now = new Date();
  const minutesAgo = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
  
  return minutesAgo <= onlineThresholdMinutes;
}

/**
 * Get online status badge props for consistent styling
 * @param lastLoginAt - ISO date string or Date object of last login
 * @param onlineThresholdMinutes - Minutes threshold to consider user online (default: 15)
 * @param isActive - Whether the user account is active (default: true)
 * @param status - Account status: 0 = inactive, 1 = active, 3 = blocked (default: 1)
 * @param lastLogoutAt - ISO date string or Date object of last logout (if exists and more recent than login, user is offline)
 * @returns Object with status text, className, and variant
 */
export function getOnlineStatusBadge(
  lastLoginAt: string | Date | null | undefined,
  onlineThresholdMinutes: number = 15,
  isActive: boolean = true,
  status?: number, // 0 = inactive, 1 = active, 3 = blocked
  lastLogoutAt?: string | Date | null | undefined
): {
  text: string;
  className: string;
  isOnline: boolean | null;
} {
  // Immediately show as Offline if account is inactive, blocked, or deleted
  if (!isActive || status === 0 || status === 3) {
    return {
      text: "Offline",
      className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
      isOnline: false,
    };
  }

  // If user has logged out, show as Offline immediately
  // Priority: If lastLogoutAt exists and is more recent than (or equal to) lastLoginAt, user is offline
  if (lastLogoutAt) {
    const logoutTime = new Date(lastLogoutAt).getTime();
    
    if (lastLoginAt) {
      // Both exist - check which is more recent
      const loginTime = new Date(lastLoginAt).getTime();
      // If logout is more recent or equal to login, user is offline
      if (logoutTime >= loginTime) {
        return {
          text: "Offline",
          className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
          isOnline: false,
        };
      }
      // If login is more recent than logout, continue to check online status based on login time
    } else {
      // Logout exists but no login time - user has logged out (show as offline)
      return {
        text: "Offline",
        className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
        isOnline: false,
      };
    }
  }

  // If no login time, show as never logged in
  if (!lastLoginAt) {
    return {
      text: "Never logged in",
      className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
      isOnline: null,
    };
  }

  // Calculate online status based on last login time
  const isOnline = calculateOnlineStatus(lastLoginAt, onlineThresholdMinutes);

  if (isOnline) {
    return {
      text: "Online",
      className: "border-green-500/50 text-green-400 bg-green-500/10",
      isOnline: true,
    };
  }

  return {
    text: "Offline",
    className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
    isOnline: false,
  };
}

/**
 * Format last login time for display
 * @param lastLoginAt - ISO date string or Date object of last login
 * @returns Formatted string or "Never logged in"
 */
export function formatLastLogin(lastLoginAt: string | Date | null | undefined): string {
  if (!lastLoginAt) {
    return "Never logged in";
  }

  try {
    const date = new Date(lastLoginAt);
    return date.toLocaleString();
  } catch {
    return "Invalid date";
  }
}

