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

  try {
  const lastLogin = new Date(lastLoginAt);
    // Check if date is valid
    if (isNaN(lastLogin.getTime())) {
      console.warn('[Online Status] Invalid lastLoginAt date:', lastLoginAt);
      return null;
    }
    
  const now = new Date();
  const minutesAgo = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
    
    // Handle negative values (future dates) - treat as offline
    if (minutesAgo < 0) {
      return false;
    }
  
  return minutesAgo <= onlineThresholdMinutes;
  } catch (error) {
    console.error('[Online Status] Error calculating online status:', error);
    return null;
  }
}

/**
 * Get online status badge props for consistent styling
 * Online Status is based ONLY on login/logout activity, NOT on account status.
 * No time threshold - status changes immediately based on login/logout events.
 * 
 * Logic:
 * 1. If user has logged out (lastLogoutAt >= lastLoginAt) → Offline
 * 2. If no login time exists → "Never logged in"
 * 3. If logged in (lastLoginAt exists and lastLogoutAt is null or < lastLoginAt) → Online
 * 
 * @param lastLoginAt - ISO date string or Date object of last login
 * @param lastLogoutAt - ISO date string or Date object of last logout (if exists and more recent than login, user is offline)
 * @returns Object with status text, className, and variant
 */
export function getOnlineStatusBadge(
  lastLoginAt: string | Date | null | undefined,
  lastLogoutAt?: string | Date | null | undefined
): {
  text: string;
  className: string;
  isOnline: boolean | null;
} {
  // Step 1: Check if user has logged out
  // If lastLogoutAt exists and is more recent than (or equal to) lastLoginAt, user is offline
  if (lastLogoutAt) {
    try {
      const logoutDate = new Date(lastLogoutAt);
      if (!isNaN(logoutDate.getTime())) {
        const logoutTime = logoutDate.getTime();
    
    if (lastLoginAt) {
          try {
            const loginDate = new Date(lastLoginAt);
            if (!isNaN(loginDate.getTime())) {
              const loginTime = loginDate.getTime();
      // If logout is more recent or equal to login, user is offline
      if (logoutTime >= loginTime) {
        return {
          text: "Offline",
          className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
          isOnline: false,
        };
      }
              // If login is more recent than logout, user is online
            }
          } catch (error) {
            console.error('[Online Status] Error parsing lastLoginAt:', error);
          }
    } else {
      // Logout exists but no login time - user has logged out (show as offline)
      return {
        text: "Offline",
        className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
        isOnline: false,
      };
        }
      }
    } catch (error) {
      console.error('[Online Status] Error parsing lastLogoutAt:', error);
    }
  }

  // Step 2: If no login time, show as never logged in
  if (!lastLoginAt) {
    return {
      text: "Never logged in",
      className: "border-gray-500/50 text-gray-400 bg-gray-500/10",
      isOnline: null,
    };
  }

  // Step 3: User has logged in and hasn't logged out (or logout is older than login) → Online
    return {
      text: "Online",
      className: "border-green-500/50 text-green-400 bg-green-500/10",
      isOnline: true,
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

