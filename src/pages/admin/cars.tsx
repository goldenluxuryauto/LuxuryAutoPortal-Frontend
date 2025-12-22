import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TablePagination,
  ItemsPerPage,
} from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, buildApiUrl } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Search, X, LogOut, ExternalLink } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeletons";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Car {
  id: number;
  vin: string;
  makeModel: string;
  make?: string | null;
  model?: string | null;
  licensePlate: string | null;
  year: number | null;
  color: string | null;
  mileage: number;
  status: "ACTIVE" | "INACTIVE";
  offboardReason: "sold" | "damaged" | "end_lease" | "other" | null;
  offboardNote: string | null;
  offboardAt: string | null;
  userId?: number | null;
  tireSize?: string | null;
  oilType?: string | null;
  lastOilChange?: string | null;
  fuelType?: string | null;
  registrationExpiration?: string | null;
  contactPhone?: string | null;
  turoLink?: string | null;
  adminTuroLink?: string | null;
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
  } | null;
}

const carSchema = z.object({
  vin: z
    .string()
    .min(1, "VIN is required")
    .max(17, "VIN must be 17 characters or less"),
  makeModel: z.string().min(1, "Make & Model is required"),
  make: z.string().optional(),
  model: z.string().optional(),
  licensePlate: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  interiorColor: z.string().optional(),
  mileage: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  tireSize: z.string().optional(),
  oilType: z.string().optional(),
  lastOilChange: z.string().optional(),
  fuelType: z.string().optional(),
  turoLink: z.string().url().optional().or(z.literal("")),
  adminTuroLink: z.string().url().optional().or(z.literal("")),
});

type CarFormData = z.infer<typeof carSchema>;

export default function CarsPage() {
  const [, setLocation] = useLocation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOffboardModalOpen, setIsOffboardModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("cars_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("cars_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to check if admin
  const { data: userData } = useQuery<{ user?: { isAdmin?: boolean } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const isAdmin = userData?.user?.isAdmin === true;

  const offboardForm = useForm({
    resolver: zodResolver(
      z.object({
        finalMileage: z.string().min(1, "Final mileage is required"),
        reason: z.enum(["sold", "damaged", "end_lease", "other"]),
        note: z.string().optional(),
      })
    ),
    defaultValues: {
      finalMileage: "",
      reason: "sold" as const,
      note: "",
    },
  });

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      vin: "",
      makeModel: "",
      make: "",
      model: "",
      licensePlate: "",
      year: "",
      color: "",
      interiorColor: "",
      mileage: "",
      status: "ACTIVE",
      tireSize: "",
      oilType: "",
      lastOilChange: "",
      fuelType: "",
      turoLink: "",
      adminTuroLink: "",
    },
  });

  const { data: carsData, isLoading } = useQuery<{
    success: boolean;
    data: Car[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/cars", statusFilter, searchQuery, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());
      const url = buildApiUrl(`/api/cars?${params.toString()}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Database connection failed" }));
        throw new Error(errorData.error || "Failed to fetch cars");
      }
      return response.json();
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.make) formData.append("make", data.make);
      if (data.model) formData.append("model", data.model);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.interiorColor) formData.append("interiorColor", data.interiorColor);
      if (data.mileage) formData.append("mileage", data.mileage);
      if (data.status) formData.append("status", data.status);
      if (data.tireSize) formData.append("tireSize", data.tireSize);
      if (data.oilType) formData.append("oilType", data.oilType);
      if (data.lastOilChange) formData.append("lastOilChange", data.lastOilChange);
      if (data.fuelType) formData.append("fuelType", data.fuelType);
      if (data.turoLink) formData.append("turoLink", data.turoLink);
      if (data.adminTuroLink) formData.append("adminTuroLink", data.adminTuroLink);

      const response = await fetch(buildApiUrl("/api/cars"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create car");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({
        title: "Success",
        description: "Car added successfully",
      });
      setIsAddModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create car",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CarFormData }) => {
      console.log(`📤 [FRONTEND] Update mutation - Full form data:`, data);
      console.log(`📤 [FRONTEND] Status value:`, data.status, `(type: ${typeof data.status})`);
      
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.make) formData.append("make", data.make);
      if (data.model) formData.append("model", data.model);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.interiorColor) formData.append("interiorColor", data.interiorColor);
      if (data.mileage) formData.append("mileage", data.mileage);
      
      // ALWAYS send status - it's required and should always have a value
      const statusValue = data.status || "ACTIVE"; // Default to ACTIVE if somehow undefined
      formData.append("status", statusValue);
      console.log(`📤 [FRONTEND] Appending status to FormData: "${statusValue}"`);
      
      // Debug: Log all FormData entries
      console.log(`📤 [FRONTEND] FormData entries:`);
      for (const [key, value] of formData.entries()) {
        console.log(`   ${key}: ${value}`);
      }
      if (data.tireSize) formData.append("tireSize", data.tireSize);
      if (data.oilType) formData.append("oilType", data.oilType);
      if (data.lastOilChange) formData.append("lastOilChange", data.lastOilChange);
      if (data.fuelType) formData.append("fuelType", data.fuelType);
      if (data.turoLink) formData.append("turoLink", data.turoLink);
      if (data.adminTuroLink) formData.append("adminTuroLink", data.adminTuroLink);

      const response = await fetch(buildApiUrl(`/api/cars/${id}`), {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update car");
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all car queries to force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/cars"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ queryKey: ["/api/cars"], exact: false });
      toast({
        title: "Success",
        description: "Car updated successfully",
      });
      setIsEditModalOpen(false);
      setSelectedCar(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update car",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/cars/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete car");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({
        title: "Success",
        description: "Car deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete car",
        variant: "destructive",
      });
    },
  });

  const offboardMutation = useMutation({
    mutationFn: async (data: {
      finalMileage: string;
      reason: string;
      note?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/cars/${selectedCar?.id}/offboard`,
        {
          finalMileage: parseInt(data.finalMileage, 10),
          reason: data.reason,
          note: data.note || undefined,
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to off-board car");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({
        title: "Success",
        description: "Car off-boarded successfully",
      });
      setIsOffboardModalOpen(false);
      setSelectedCar(null);
      offboardForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to off-board car",
        variant: "destructive",
      });
    },
  });

  const handleOffboardClick = (car: Car) => {
    setSelectedCar(car);
    offboardForm.reset({
      finalMileage: car.mileage.toString(),
      reason: "sold",
      note: "",
    });
    setIsOffboardModalOpen(true);
  };

  const onOffboardSubmit = (data: {
    finalMileage: string;
    reason: string;
    note?: string;
  }) => {
    offboardMutation.mutate(data);
  };

  const handleAddClick = () => {
    setSelectedCar(null);
    form.reset({
      vin: "",
      makeModel: "",
      make: "",
      model: "",
      licensePlate: "",
      year: "",
      color: "",
      interiorColor: "",
      mileage: "",
      status: "ACTIVE",
      tireSize: "",
      oilType: "",
      lastOilChange: "",
      fuelType: "",
      turoLink: "",
      adminTuroLink: "",
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (car: Car) => {
    setSelectedCar(car);
    form.reset({
      vin: car.vin,
      makeModel: car.makeModel,
      make: car.make || "",
      model: car.model || "",
      licensePlate: car.licensePlate || "",
      year: car.year?.toString() || "",
      color: car.color || "",
      interiorColor: "",
      mileage: car.mileage?.toString() || "",
      status: car.status || "ACTIVE",
      tireSize: car.tireSize || "",
      oilType: car.oilType || "",
      lastOilChange: car.lastOilChange || "",
      fuelType: car.fuelType || "",
      turoLink: car.turoLink || "",
      adminTuroLink: car.adminTuroLink || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    deleteMutation.mutate(id);
  };

  const onSubmit = (data: CarFormData) => {
    if (selectedCar) {
      updateMutation.mutate({ id: selectedCar.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "INACTIVE":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const cars = carsData?.data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Cars</h1>
            <p className="text-gray-400 text-sm">{isAdmin ? "Manage your vehicle fleet" : "View your vehicles"}</p>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="bg-[#111111] border-[#2a2a2a]">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by VIN, Plate, Owner, Make/Model/Year..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-600"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1); // Reset to first page on filter change
                }}
              >
                <SelectTrigger className="w-full md:w-[200px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cars Table */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-center text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3 w-12">
                      #
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Stats
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Management
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Owner
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Make
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Year
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Model/Specs
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Contact
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      VIN #
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Plate #
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Gas
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Tire Size
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Oil Type
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Turo Link
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                      Admin Turo Link
                    </th>
                    {isAdmin && (
                      <th className="text-right text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {isLoading ? (
                    <TableRowSkeleton colSpan={isAdmin ? 17 : 16} rows={5} />
                  ) : cars.length > 0 ? (
                    cars.map((car, index) => {
                      const formatDate = (dateStr: string | null | undefined): string => {
                        if (!dateStr) return "N/A";
                        try {
                          return new Date(dateStr).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                        } catch {
                          return "N/A";
                        }
                      };

                      // Determine Management value based on owner name
                      const ownerFullName = car.owner 
                        ? `${car.owner.firstName || ''} ${car.owner.lastName || ''}`.trim()
                        : '';
                      const managementValue = ownerFullName === "Jay Barton" ? "Own" : "Manage";

                      // Create unique key to avoid duplicate key warnings
                      // Use combination of id, index, and vin to ensure uniqueness
                      const uniqueKey = `car-${car.id}-${index}-${car.vin || 'no-vin'}`;

                      return (
                        <tr
                          key={uniqueKey}
                          className="hover:bg-[#252525] transition-colors group border-b border-[#2a2a2a]"
                        >
                          <td className="text-center text-[#EAEB80] text-sm px-4 py-3 align-middle">
                            {index + 1}
                          </td>
                          <td className="text-left px-4 py-3 align-middle">
                            <Badge
                              variant="outline"
                              className={getStatusBadgeColor(car.status)}
                            >
                              {car.status === "ACTIVE"
                                ? "ACTIVE"
                                : car.status === "INACTIVE"
                                ? "INACTIVE"
                                : car.status || "ACTIVE"}
                            </Badge>
                          </td>
                          <td className="text-left px-4 py-3 align-middle">
                            <a
                              href={`/admin/cars/${car.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                setLocation(`/admin/cars/${car.id}`);
                              }}
                              className="text-[#EAEB80] hover:underline text-sm"
                            >
                              View Stats
                            </a>
                          </td>
                          <td className="text-left text-white text-sm px-4 py-3 align-middle">
                            {managementValue}
                          </td>
                          <td className="text-left px-4 py-3 align-middle">
                            {car.owner ? (
                              <div>
                                <div className="text-white text-sm">
                                  {car.owner.firstName} {car.owner.lastName}
                                </div>
                                {car.owner.email && (
                                  <div className="text-gray-500 text-xs">
                                    {car.owner.email}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-sm">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="text-left text-white text-sm px-4 py-3 align-middle">
                            {car.make || "N/A"}
                          </td>
                          <td className="text-left text-white text-sm px-4 py-3 align-middle">
                            {car.year || "N/A"}
                          </td>
                          <td className="text-left text-white text-sm px-4 py-3 align-middle">
                            {car.model || "N/A"}
                          </td>
                          <td className="text-left text-gray-400 text-sm px-4 py-3 align-middle">
                            {car.contactPhone || car.owner?.phone || "N/A"}
                          </td>
                          <td className="text-left text-white font-mono text-sm px-4 py-3 align-middle">
                            {car.vin || "N/A"}
                          </td>
                          <td className="text-left text-gray-400 text-sm px-4 py-3 align-middle">
                            {car.licensePlate || "N/A"}
                          </td>
                          <td className="text-left text-gray-400 text-sm px-4 py-3 align-middle">
                            {car.fuelType || "N/A"}
                          </td>
                          <td className="text-left text-gray-400 text-sm px-4 py-3 align-middle">
                            {car.tireSize || "N/A"}
                          </td>
                          <td className="text-left text-gray-400 text-sm px-4 py-3 align-middle">
                            {car.oilType || "N/A"}
                          </td>
                          <td className="text-left px-4 py-3 align-middle">
                            <a
                              href="#"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#EAEB80] hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                          <td className="text-left px-4 py-3 align-middle">
                            <a
                              href="#"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#EAEB80] hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#EAEB80] hover:text-[#EAEB80] hover:bg-[#EAEB80]/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(car);
                                  }}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {car.status === "ACTIVE" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-orange-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOffboardClick(car);
                                    }}
                                    title="Off-board vehicle"
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </Button>
                                )}
                                <ConfirmDialog
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-gray-400 hover:text-red-400"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  }
                                  title="Delete Car"
                                  description="Are you sure you want to delete this car? This action cannot be undone."
                                  confirmText="Delete"
                                  cancelText="Cancel"
                                  variant="destructive"
                                  onConfirm={() => handleDeleteClick(car.id)}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 18 : 17} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-gray-400 text-lg">No cars found</p>
                          <p className="text-gray-500 text-sm">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {carsData?.pagination && (
              <TablePagination
                totalItems={carsData.pagination.total}
                itemsPerPage={itemsPerPage}
                currentPage={page}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setPage(1); // Reset to first page when changing limit
                }}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Car Modal */}
        <Dialog
          open={isAddModalOpen || isEditModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedCar(null);
              form.reset();
            }
          }}
        >
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {selectedCar ? "Edit Car" : "Add New Car"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCar
                  ? "Update car information"
                  : "Add a new vehicle to the fleet"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">VIN *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="1HGBH41JXMN109186"
                          maxLength={17}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="makeModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">
                        Make & Model *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          placeholder="2024 Mercedes S580"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Make</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Mercedes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Model</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="S580"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="licensePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">
                          License Plate
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="ABC-1234"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Year</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="2024"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Exterior Color</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Black"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interiorColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Interior Color</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Black"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">
                          Current Mileage
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Status *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            console.log(`📝 [FRONTEND] Status changed to: ${value}`);
                            field.onChange(value);
                          }}
                          value={field.value || "ACTIVE"}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tireSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Tire Size</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="225/50R17"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="oilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Oil Type</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="5W-30"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lastOilChange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Last Oil Change</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Fuel Type</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Premium"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="turoLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Turo Link</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="https://turo.com/us/en/car/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminTuroLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Admin Turo Link</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="https://turo.com/us/en/car/..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                      setSelectedCar(null);
                      form.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {selectedCar ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Off-board Modal */}
        <Dialog
          open={isOffboardModalOpen}
          onOpenChange={setIsOffboardModalOpen}
        >
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Off-board Vehicle
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Remove this vehicle from the active fleet
              </DialogDescription>
            </DialogHeader>

            <Form {...offboardForm}>
              <form
                onSubmit={offboardForm.handleSubmit(onOffboardSubmit)}
                className="space-y-4 mt-4"
              >
                <FormField
                  control={offboardForm.control}
                  name="finalMileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">
                        Final Mileage *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={offboardForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Reason *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="end_lease">
                            End of Lease
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={offboardForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">
                        Note (optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsOffboardModalOpen(false);
                      setSelectedCar(null);
                      offboardForm.reset();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={offboardMutation.isPending}
                  >
                    Confirm
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
