import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Download, FileText } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";

const formatCurrency = (value: number): string => {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function PurchaseDetailsPage() {
  const [, params] = useRoute("/admin/cars/:id/purchase");
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

  // Purchase Documents data
  const purchaseDocuments = [
    { label: "Trade Inn or Cash Down Payment", value: 0 },
    { label: "Purchase Price", value: 0 },
    { label: "Dealer Doc Fee", value: 0 },
    { label: "Sales Tax", value: 0 },
    { label: "License and Registration", value: 0 },
    { label: "Age Based/Property Asses", value: 0 },
    { label: "State Inspection/Emissions", value: 0 },
    { label: "State Waste Tire Recycle", value: 0 },
    { label: "Temporary Permit", value: 0 },
    { label: "Document Prep", value: 0 },
  ];

  const totalPurchasePrice = purchaseDocuments.reduce((sum, doc) => sum + doc.value, 0);

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
          <span className="text-gray-300">Purchase Details</span>
        </div>

        {/* Header Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
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

              {/* Car Specifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Car Specifications</h3>
                <div className="space-y-2">
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
              </div>

              {/* Turo Links */}
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
            {/* Export All Button */}
            <div className="ml-4">
              <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>

        {/* Purchase Details Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif text-[#EAEB80] italic mb-6">Purchase Details</h1>
          
          {/* Purchase Documents Section */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-[#EAEB80]">Purchase Documents</h2>
              <div className="flex gap-2">
                <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a]">
                  <FileText className="w-4 h-4 mr-2" />
                  Log
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {purchaseDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-[#2a2a2a] last:border-b-0"
                  >
                    <span className="text-sm text-gray-300">
                      {index + 1}. {doc.label}
                    </span>
                    <span className="text-sm text-gray-300 font-medium">
                      {formatCurrency(doc.value)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Total Purchase Price */}
              <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Purchase Price</span>
                  <span className="text-lg font-semibold text-[#EAEB80]">
                    {formatCurrency(totalPurchasePrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Financed Section */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mt-6">
            <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-[#EAEB80]">Purchase Financed</h2>
              <div className="flex gap-2">
                <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a]">
                  <FileText className="w-4 h-4 mr-2" />
                  Log
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-[#1a1a1a] px-4 py-2 mb-4">
                <span className="text-sm font-semibold text-gray-300"># Purchase Financed</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">1. Auto Loan Amount</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">2. Months Financed</span>
                  <span className="text-sm text-gray-300 font-medium">0</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">3. Monthly Payment</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">4. Financed Percentage %</span>
                  <span className="text-sm text-gray-300 font-medium">0%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">5. First Payment Date</span>
                  <span className="text-sm text-gray-500 font-medium">--</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">6. Frequency of Payment</span>
                  <span className="text-sm text-gray-500 font-medium">--</span>
                </div>
              </div>
              
              {/* Current Amount Owed */}
              <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Current Amount Owed</span>
                  <span className="text-lg font-semibold text-[#EAEB80]">
                    {formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Car Value Section */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mt-6">
            <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-[#EAEB80]">Total Car Value</h2>
              <div className="flex gap-2">
                <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button className="bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a]">
                  <FileText className="w-4 h-4 mr-2" />
                  Log
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-[#1a1a1a] px-4 py-2 mb-4">
                <span className="text-sm font-semibold text-gray-300"># Total Car Value</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">1. Purchase Price</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">2. Interest Paid</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">3. Principal Paid</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">4. Total Car Payment</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">5. NADA Clean Trade</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">6. Amount Owed</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
              </div>
              
              {/* Total Car Profit */}
              <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Total Car Profit</span>
                  <span className="text-lg font-semibold text-[#EAEB80]">
                    {formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Car Rental Value Section */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden mt-6">
            <div className="flex justify-between items-center p-4 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-semibold text-[#EAEB80]">Total Car Rental Value</h2>
              <div className="flex gap-2">
                <Button className="bg-[#EAEB80] text-black hover:bg-[#d4d570]">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-[#1a1a1a] px-4 py-2 mb-4">
                <span className="text-sm font-semibold text-gray-300"># Total Car Rental Value</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">Total Car Rental Income</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">Total Car Management Exp</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">Total Car Misc Exp</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                  <span className="text-sm text-gray-300">Total Car Expenses</span>
                  <span className="text-sm text-gray-300 font-medium">{formatCurrency(0)}</span>
                </div>
              </div>
              
              {/* Totals Car Rental Profit */}
              <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Totals Car Rental Profit</span>
                  <span className="text-lg font-semibold text-[#EAEB80]">
                    {formatCurrency(0)}
                  </span>
                </div>
              </div>
              
              {/* Total Car & Rental Profit */}
              <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-300">Total Car & Rental Profit</span>
                  <span className="text-lg font-semibold text-[#EAEB80]">
                    {formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

