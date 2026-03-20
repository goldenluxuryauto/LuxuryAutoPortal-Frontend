import { differenceInDays } from "date-fns";
import { MONTHS_SHORT } from "./constants";
import type { TuroTrip } from "./types";

export function fmt(val: number | string | null | undefined): string {
  const n = parseFloat(String(val ?? 0)) || 0;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

export function tripDays(trip: TuroTrip): number {
  try {
    return Math.max(1, differenceInDays(new Date(trip.tripEnd), new Date(trip.tripStart)));
  } catch {
    return 1;
  }
}
