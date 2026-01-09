import React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { GraphsChartsReportSection } from "@/pages/admin/components/GraphsChartsReportSection";

export default function GraphsChartsPage() {
  const [, params] = useRoute("/admin/cars/:id/graphs");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/cars", carId],
    queryFn: async () => {
      if (!carId) throw new Error("Invalid car ID");
      const url = buildApiUrl(`/api/cars/${carId}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch car");
      return response.json();
    },
    enabled: !!carId,
    retry: false,
  });

  const car = data?.data;

  // Fetch onboarding data for additional car info
  const { data: onboardingData } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/onboarding/vin", car?.vin, "onboarding"],
    queryFn: async () => {
      if (!car?.vin) throw new Error("No VIN");
      const url = buildApiUrl(`/api/onboarding/vin/${encodeURIComponent(car.vin)}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { success: true, data: null };
        }
        throw new Error("Failed to fetch onboarding data");
      }
      return response.json();
    },
    enabled: !!car?.vin,
    retry: false,
  });

  const onboarding = onboardingData?.data;

  if (isLoading) {
    return (
      <AdminLayout>
        <CarDetailSkeleton />
      </AdminLayout>
    );
  }

  if (error || !car) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-400">Failed to load car details</p>
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="mt-4 text-[#EAEB80] hover:underline"
          >
            ← Back to View Car
          </button>
        </div>
      </AdminLayout>
    );
  }

  const carName = car.makeModel || `${car.year || ""} ${car.vin}`.trim();
  const ownerName = car.owner
    ? `${car.owner.firstName} ${car.owner.lastName}`
    : "N/A";
  const ownerContact = car.owner?.phone || "N/A";
  const ownerEmail = car.owner?.email || "N/A";
  const fuelType = onboarding?.fuelType || car.fuelType || "N/A";
  const tireSize = onboarding?.tireSize || car.tireSize || "N/A";
  const oilType = onboarding?.oilType || car.oilType || "N/A";

  return (
    <AdminLayout>
      <div className="flex flex-col w-full overflow-x-hidden">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setLocation("/cars")}
            className="text-gray-400 hover:text-[#EAEB80] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cars</span>
          </button>
          <span className="text-gray-500">/</span>
          <button
            onClick={() => setLocation(`/admin/view-car/${carId}`)}
            className="text-gray-400 hover:text-[#EAEB80] transition-colors"
          >
            View Car
          </button>
          <span className="text-gray-500">/</span>
          <span className="text-gray-300">Graphs and Charts Report</span>
        </div>

        {/* Header Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Car Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Car Name:</span>
                  <p className="text-sm text-gray-300">{carName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">VIN #:</span>
                  <p className="text-sm text-gray-300">{car.vin || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">License:</span>
                  <p className="text-sm text-gray-300">{car.licensePlate || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Owner Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-gray-500">Name:</span>
                  <p className="text-sm text-gray-300">{ownerName}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Contact #:</span>
                  <p className="text-sm text-gray-300">{ownerContact}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Email:</span>
                  <p className="text-sm text-gray-300">{ownerEmail}</p>
                </div>
              </div>
            </div>

            {/* Car Specifications & Turo Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Specifications</h3>
              <div className="space-y-2 mb-4">
                <div>
                  <span className="text-xs text-gray-500">Fuel/Gas:</span>
                  <p className="text-sm text-gray-300">{fuelType}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Tire Size:</span>
                  <p className="text-sm text-gray-300">{tireSize}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Oil Type:</span>
                  <p className="text-sm text-gray-300">{oilType}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Turo Links</h3>
                <div className="space-y-2">
                  {car.turoLink && (
                    <div>
                      <a
                        href={car.turoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#EAEB80] hover:underline text-sm flex items-center gap-1"
                      >
                        Turo Link: View Car
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {car.adminTuroLink && (
                    <div>
                      <a
                        href={car.adminTuroLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#EAEB80] hover:underline text-sm flex items-center gap-1"
                      >
                        Admin Turo Link: View Car
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {!car.turoLink && !car.adminTuroLink && (
                    <span className="text-gray-500 text-sm">No Turo links available</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <GraphsChartsReportSection className="mb-6" />
      </div>
    </AdminLayout>
  );
}

