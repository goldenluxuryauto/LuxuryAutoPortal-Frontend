import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ArrowLeft, ChevronRight, ExternalLink } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { CarDetailSkeleton } from "@/components/ui/skeletons";

interface CarDetail {
  id: number;
  vin: string;
  makeModel: string;
  licensePlate?: string;
  year?: number;
  mileage: number;
  status: "ACTIVE" | "INACTIVE";
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
  } | null;
  turoLink?: string | null;
  adminTuroLink?: string | null;
  fuelType?: string | null;
  tireSize?: string | null;
  oilType?: string | null;
}

interface MenuItem {
  label: string;
  path: string;
  external?: boolean;
}

export default function ViewCarPage() {
  const [, params] = useRoute("/admin/view-car/:id");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: CarDetail;
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
          return { success: false, data: null };
        }
        throw new Error("Failed to fetch onboarding");
      }
      return response.json();
    },
    enabled: !!car?.vin,
    retry: false,
  });

  const onboarding = onboardingData?.success ? onboardingData?.data : null;

  const menuItems: MenuItem[] = [
    { label: "Car Detail", path: `/admin/cars/${carId}` },
    { label: "Earnings", path: `/admin/cars/${carId}/earnings` },
    { label: "Income and Expense", path: `/admin/income-expenses?car=${carId}` },
    { label: "NADA Depreciation Schedule", path: `/admin/cars/${carId}/depreciation` },
    { label: "Totals", path: `/admin/cars/${carId}/totals` },
    { label: "Records and Files", path: `/admin/cars/${carId}/records` },
    { label: "Maintenance", path: `/admin/cars/${carId}/maintenance` },
    { label: "Payment history", path: `/admin/cars/${carId}/payments` },
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.external) {
      window.open(item.path, "_blank");
    } else {
      setLocation(item.path);
    }
  };

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
            onClick={() => setLocation("/cars")}
            className="mt-4 text-[#EAEB80] hover:underline"
          >
            ← Back to Cars
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
      <div className="flex flex-col h-full overflow-x-hidden">
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
          <span className="text-gray-400">View Car</span>
        </div>

        {/* Car and Owner Information Header */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Car Information */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Car Information</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Car Name: </span>
                  <span className="text-white text-xs sm:text-sm break-words">{carName}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">VIN #: </span>
                  <span className="text-white font-mono text-xs sm:text-sm break-all">{car.vin}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">License: </span>
                  <span className="text-white text-xs sm:text-sm">{car.licensePlate || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Owner Information</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Name: </span>
                  <span className="text-white text-xs sm:text-sm break-words">{ownerName}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Contact #: </span>
                  <span className="text-white text-xs sm:text-sm">{ownerContact}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Email: </span>
                  <span className="text-white text-xs sm:text-sm break-all">{ownerEmail}</span>
                </div>
              </div>
            </div>

            {/* Car Specifications */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Car Specifications</h3>
              <div className="space-y-1.5 sm:space-y-2">
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Fuel/Gas: </span>
                  <span className="text-white text-xs sm:text-sm">{fuelType}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Tire Size: </span>
                  <span className="text-white text-xs sm:text-sm">{tireSize}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs sm:text-sm">Oil Type: </span>
                  <span className="text-white text-xs sm:text-sm">{oilType}</span>
                </div>
              </div>
            </div>

            {/* Turo Links */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Turo Links</h3>
              <div className="space-y-1.5 sm:space-y-2">
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

        {/* Menu Items List */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-auto">
          <div className="divide-y divide-[#1a1a1a]">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuItemClick(item)}
                className={cn(
                  "w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between",
                  "hover:bg-[#1a1a1a] transition-colors",
                  "text-white group"
                )}
              >
                <span className="text-xs sm:text-sm break-words pr-2">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#EAEB80] transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

