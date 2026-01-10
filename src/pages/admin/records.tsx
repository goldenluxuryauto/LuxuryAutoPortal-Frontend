import React, { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Plus, Search, Edit, Trash2, List } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

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

interface Document {
  id: number;
  documentName: string;
  status: "Active" | "Inactive";
  date: string;
  remarks?: string;
}

const sampleDocuments: Document[] = [
  { id: 1, documentName: "Airport Receipts", status: "Active", date: "Aug 13, 2024" },
  { id: 2, documentName: "Average Vehicle Performance", status: "Active", date: "Aug 13, 2024" },
  { id: 3, documentName: "Car Issue Messages", status: "Active", date: "Aug 13, 2024" },
  { id: 4, documentName: "Contract", status: "Active", date: "Aug 13, 2024" },
  { id: 5, documentName: "Gas Receipts", status: "Active", date: "Aug 13, 2024" },
  { id: 6, documentName: "Lifetime Performance", status: "Active", date: "Aug 13, 2024" },
  { id: 7, documentName: "Other Receipts", status: "Active", date: "Aug 13, 2024" },
  { id: 8, documentName: "Performance Benchmark", status: "Active", date: "Aug 13, 2024" },
  { id: 9, documentName: "Trip Receipts", status: "Active", date: "Aug 13, 2024" },
  { id: 10, documentName: "Your Trends", status: "Active", date: "Aug 13, 2024" },
];

export default function RecordsPage() {
  const [, params] = useRoute("/admin/cars/:id/records");
  const [, setLocation] = useLocation();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itemsPerPage, setItemsPerPage] = useState<10 | 20 | 50>(10);

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

  // Filter documents based on search and filter
  const filteredDocuments = sampleDocuments.filter((doc) => {
    const matchesSearch = doc.documentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "All" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Paginate documents
  const paginatedDocuments = filteredDocuments.slice(0, itemsPerPage);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setLocation("/cars")}
              className="text-gray-400 hover:text-[#EAEB80] transition-colors flex items-center gap-1 text-xs sm:text-sm"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Cars</span>
            </button>
            <span className="text-gray-500 text-xs sm:text-sm">/</span>
            <button
              onClick={() => setLocation(`/admin/view-car/${carId}`)}
              className="text-gray-400 hover:text-[#EAEB80] transition-colors text-xs sm:text-sm"
            >
              View Car
            </button>
            <span className="text-gray-500 text-xs sm:text-sm">/</span>
            <span className="text-gray-300 text-xs sm:text-sm">Records and Files</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
            <Button
              variant="outline"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white hover:bg-[#2a2a2a] flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <List className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Log</span>
            </Button>
          </div>
        </div>

        {/* Car and Owner Information Header */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            {/* Car Specifications & Links */}
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-400 mb-2 sm:mb-3">Car Specifications & Links</h3>
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
                {car.turoLink && (
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Turo Link: </span>
                    <a
                      href={car.turoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#EAEB80] hover:underline text-xs sm:text-sm flex items-center gap-1 inline"
                    >
                      View Car
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {car.adminTuroLink && (
                  <div>
                    <span className="text-gray-400 text-xs sm:text-sm">Admin Turo Link: </span>
                    <a
                      href={car.adminTuroLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#EAEB80] hover:underline text-xs sm:text-sm flex items-center gap-1 inline"
                    >
                      View Car
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Records And Files Section */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg overflow-hidden" style={{ overflowY: 'auto' }}>
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-white mb-4 sm:mb-6">Records And Files</h2>
            
            {/* Filter, Items Per Page, and Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[120px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-gray-400" />
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => setItemsPerPage(parseInt(value) as 10 | 20 | 50)}
                  >
                    <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 sm:max-w-md w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Q Search here..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Documents Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                    <TableHead className="text-center text-[#EAEB80] font-medium w-12">#</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Document Name</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Date</TableHead>
                    <TableHead className="text-left text-[#EAEB80] font-medium">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.length > 0 ? (
                    paginatedDocuments.map((doc, index) => (
                      <TableRow
                        key={doc.id}
                        className="border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <TableCell className="text-center text-gray-300">
                          {(index + 1)}
                        </TableCell>
                        <TableCell className="text-white">{doc.documentName}</TableCell>
                        <TableCell className="text-gray-300">{doc.date}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              className="text-gray-400 hover:text-[#EAEB80] transition-colors"
                              aria-label="Edit document"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              aria-label="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                        No documents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* End of list */}
            {paginatedDocuments.length > 0 && (
              <div className="text-center mt-6 text-gray-500 text-sm">
                End of list.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

