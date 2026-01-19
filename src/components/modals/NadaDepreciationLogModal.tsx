import React, { useState, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildApiUrl } from "@/lib/queryClient";
import { format } from "date-fns";

interface NadaDepreciationLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  carId: number;
  item?: string;
}

export function NadaDepreciationLogModal({
  isOpen,
  onClose,
  carId,
  item,
}: NadaDepreciationLogModalProps) {
  const [searchValue, setSearchValue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFilter, setIsFilter] = useState(false);
  const [onSearch, setOnSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  let counter = 1;

  // Custom IntersectionObserver hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  // Reset filters when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setDateFrom("");
      setDateTo("");
      setIsFilter(false);
      setOnSearch(false);
    }
  }, [isOpen]);

  interface PageData {
    data: any[];
    page: number;
    total: number;
    count: number;
  }

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery<PageData>({
    queryKey: [
      "/api/car-backlog",
      carId,
      item,
      onSearch,
      searchValue,
      dateFrom,
      dateTo,
      isFilter,
    ],
    queryFn: async ({ pageParam = 1 }): Promise<PageData> => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      const params = new URLSearchParams({
        carId: carId.toString(),
        page: page.toString(),
        car_backlog_page: "nada-depreciation-schedule",
      });

      if (item) {
        params.append("item", item);
      }

      if (searchValue) {
        params.append("searchValue", searchValue);
      }

      if (dateFrom) {
        params.append("date_from", dateFrom);
      }

      if (dateTo) {
        params.append("date_to", dateTo);
      }

      if (isFilter) {
        params.append("isFilter", "true");
      }

      const url = buildApiUrl(`/api/car-backlog?${params.toString()}`);
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || errorData.message || `Failed to fetch log: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle both success: true and direct data responses
      if (result.success === false) {
        throw new Error(result.error || result.message || "Failed to fetch log");
      }

      return {
        data: result.data || [],
        page: result.page || page,
        total: result.total || 0,
        count: result.count || 0,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageData) => {
      const totalPages = Math.ceil(lastPage.total / 20);
      if (lastPage.page < totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: isOpen && !!carId,
    refetchOnWindowFocus: true,
  });

  const handleSearch = () => {
    if (searchValue.trim() !== "") {
      setOnSearch(true);
    } else {
      setOnSearch(false);
    }
    refetch();
  };

  const handleDateFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    setIsFilter(true);
  };

  const handleDateTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    setIsFilter(true);
  };

  const handleClear = () => {
    setDateTo("");
    setDateFrom("");
    setSearchValue("");
    setIsFilter(false);
    setOnSearch(false);
    if (searchRef.current) {
      searchRef.current.value = "";
    }
  };

  useEffect(() => {
    if (dateFrom === "" && dateTo === "") {
      setIsFilter(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const logs = data?.pages.flatMap((page) => page.data) || [];

  // Format month year from YYYY-MM format
  const formatMonthYear = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const [year, month] = dateStr.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(date, "MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatCurrency = (value: string | number) => {
    if (!value || value === "0" || value === 0) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-6xl max-h-[90vh] p-6 relative flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            NADA Depreciation Schedule Edit History
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row justify-between gap-3 pb-4 mb-4 border-b border-[#2a2a2a]">
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1 capitalize">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={handleDateFrom}
                className="bg-[#0f0f0f] border-[#2a2a2a] text-white w-40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-400 mb-1 capitalize">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={handleDateTo}
                className="bg-[#0f0f0f] border-[#2a2a2a] text-white w-40"
              />
            </div>
            {(isFilter || onSearch) && (
              <Button
                onClick={handleClear}
                variant="ghost"
                className="text-gray-400 hover:text-white underline h-9"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full md:max-w-80 items-end">
            <Input
              ref={searchRef}
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="bg-[#0f0f0f] border-[#2a2a2a] text-white h-9"
            />
            <Button
              onClick={handleSearch}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570] h-9"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="text-center text-red-400 py-8">
              <div className="mb-2">Error loading data.</div>
              <div className="text-sm text-gray-400 mb-4">
                {error instanceof Error ? error.message : "Please try again."}
              </div>
              <Button
                onClick={() => refetch()}
                className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
              >
                Retry
              </Button>
            </div>
          )}

          {!error && (status === "pending" || (isFetching && !isFetchingNextPage)) ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : !error && logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No edit history found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[#0f0f0f] sticky top-0 z-10">
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 w-12">
                      #
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 min-w-[10rem]">
                      Edit by
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 min-w-[10rem]">
                      Date Time
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300 min-w-[8rem]">
                      Item
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300">
                      Category
                    </th>
                    <th className="text-left px-3 py-3 text-sm font-medium text-gray-300">
                      Month Year
                    </th>
                    <th className="text-right px-3 py-3 text-sm font-medium text-gray-300">
                      Old Values
                    </th>
                    <th className="text-right px-3 py-3 text-sm font-medium text-gray-300">
                      New Values
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any, index: number) => {
                    const rowNumber = counter++;
                    return (
                      <tr
                        key={log.carBacklogAid || index}
                        className="border-b border-[#2a2a2a] hover:bg-[#0f0f0f] transition-colors"
                      >
                        <td className="px-3 py-2 text-sm text-gray-300 text-center">
                          {rowNumber}.
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300">
                          {log.fullname || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300">
                          {log.carBacklogCreated
                            ? format(
                                new Date(log.carBacklogCreated),
                                "MMM dd, yyyy HH:mm"
                              )
                            : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300 capitalize">
                          {log.carBacklogItem
                            ? log.carBacklogItem.replaceAll("-", " ")
                            : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300">
                          {log.carBacklogCategoryName || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300">
                          {formatMonthYear(log.carBacklogDate)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-300 text-right">
                          {formatCurrency(
                            log.carBacklogOldAmount || log.carBacklogOldValues || "0"
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-[#EAEB80] font-medium text-right">
                          {formatCurrency(
                            log.carBacklogNewAmount || log.carBacklogNewValues || "0"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Load More */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="text-center py-4">
                  {isFetchingNextPage ? (
                    <div className="text-gray-400">Loading more...</div>
                  ) : (
                    <Button
                      onClick={() => fetchNextPage()}
                      variant="ghost"
                      className="text-[#EAEB80] hover:text-[#d4d570]"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-[#2a2a2a] mt-4">
          <Button
            onClick={onClose}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
