import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading } = useQuery({
    queryKey: ["/api/car-backlog", carId, item],
    queryFn: async () => {
      const url = buildApiUrl(
        `/api/car-backlog?carId=${carId}${item ? `&item=${encodeURIComponent(item)}` : ""}`
      );
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch log");
      return response.json();
    },
    enabled: isOpen && !!carId,
  });

  const logs = data?.data || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg w-full max-w-4xl max-h-[80vh] p-6 relative flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            NADA Depreciation Schedule Edit History
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No edit history found</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div
                  key={log.carBacklogAid}
                  className="bg-[#0f0f0f] border border-[#2a2a2a] rounded p-4"
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="text-gray-300 ml-2">
                        {log.carBacklogCategoryName || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-300 ml-2">
                        {log.carBacklogDate || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Old Value:</span>
                      <span className="text-gray-300 ml-2">
                        {log.carBacklogOldAmount || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">New Value:</span>
                      <span className="text-[#EAEB80] ml-2 font-medium">
                        {log.carBacklogNewAmount || "N/A"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-300 ml-2">
                        {log.carBacklogCreated
                          ? format(
                              new Date(log.carBacklogCreated),
                              "MMM dd, yyyy HH:mm"
                            )
                          : "N/A"}
                      </span>
                    </div>
                    {log.carBacklogRemarks && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Remarks:</span>
                        <span className="text-gray-300 ml-2">
                          {log.carBacklogRemarks}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

