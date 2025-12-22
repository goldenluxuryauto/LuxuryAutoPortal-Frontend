import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

/**
 * Table Skeleton - For loading table rows
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={`skeleton-row-${i}`} className="border-b border-[#2a2a2a]">
          {[...Array(cols)].map((_, j) => (
            <td key={`skeleton-cell-${i}-${j}`} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-[#252525]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Card Skeleton - For loading card content
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-[#1a1a1a] p-6 rounded-lg border border-[#2a2a2a]", className)}>
      <Skeleton className="h-6 w-1/3 mb-4 bg-[#252525]" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-[#252525]" />
        <Skeleton className="h-4 w-5/6 bg-[#252525]" />
        <Skeleton className="h-4 w-4/6 bg-[#252525]" />
      </div>
    </div>
  );
}

/**
 * Profile Skeleton - For loading profile pages
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 bg-[#252525]" />
        <Skeleton className="h-4 w-48 bg-[#252525]" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={`card-skeleton-${i}`} />
        ))}
      </div>

      {/* Vehicle Information Skeleton */}
      <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#EAEB80]/20">
        <Skeleton className="h-6 w-48 mb-4 bg-[#252525]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={`field-skeleton-${i}`} className="space-y-2">
              <Skeleton className="h-3 w-24 bg-[#252525]" />
              <Skeleton className="h-4 w-32 bg-[#252525]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Form Skeleton - For loading forms
 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={`form-field-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24 bg-[#252525]" />
          <Skeleton className="h-10 w-full bg-[#252525]" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 bg-[#252525]" />
        <Skeleton className="h-10 w-24 bg-[#252525]" />
      </div>
    </div>
  );
}

/**
 * Table Row Skeleton - For loading table rows with specific column count
 */
export function TableRowSkeleton({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={`skeleton-row-${i}`} className="border-b border-[#2a2a2a]">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-2">
              <Skeleton className="h-4 w-full bg-[#252525]" />
              <Skeleton className="h-4 w-3/4 bg-[#252525]" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Client Detail Skeleton - For loading client detail pages
 */
export function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Skeleton className="h-10 w-64 bg-[#252525]" />

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-[#2a2a2a]">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={`tab-${i}`} className="h-10 w-24 bg-[#252525]" />
        ))}
      </div>

      {/* Content Cards */}
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <CardSkeleton key={`content-card-${i}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Car Detail Skeleton - For loading car detail pages
 */
export function CarDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 bg-[#252525]" />
        <Skeleton className="h-8 w-64 bg-[#252525]" />
      </div>

      {/* Car Info Card */}
      <CardSkeleton />

      {/* Photos Grid Skeleton */}
      <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#2a2a2a]">
        <Skeleton className="h-6 w-32 mb-4 bg-[#252525]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={`photo-${i}`} className="h-32 w-full bg-[#252525] rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

