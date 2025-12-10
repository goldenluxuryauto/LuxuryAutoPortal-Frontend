import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";
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
import { Plus, Edit, Trash2, Search, Loader2, X, LogOut } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Car {
  id: number;
  vin: string;
  makeModel: string;
  licensePlate: string | null;
  year: number | null;
  color: string | null;
  mileage: number;
  status: "available" | "in_use" | "maintenance" | "off_fleet";
  offboardReason: "sold" | "damaged" | "end_lease" | "other" | null;
  offboardNote: string | null;
  offboardAt: string | null;
  userId?: number | null;
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  photos?: string[];
}

const carSchema = z.object({
  vin: z.string().min(1, "VIN is required").max(17, "VIN must be 17 characters or less"),
  makeModel: z.string().min(1, "Make & Model is required"),
  licensePlate: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  mileage: z.string().optional(),
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

  const offboardForm = useForm({
    resolver: zodResolver(z.object({
      finalMileage: z.string().min(1, "Final mileage is required"),
      reason: z.enum(["sold", "damaged", "end_lease", "other"]),
      note: z.string().optional(),
    })),
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
      licensePlate: "",
      year: "",
      color: "",
      mileage: "",
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
        const errorData = await response.json().catch(() => ({ error: "Database connection failed" }));
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
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);

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
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);

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
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
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
    mutationFn: async (data: { finalMileage: string; reason: string; note?: string }) => {
      const response = await apiRequest("POST", `/api/cars/${selectedCar?.id}/offboard`, {
        finalMileage: parseInt(data.finalMileage, 10),
        reason: data.reason,
        note: data.note || undefined,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to off-board car");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
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

  const onOffboardSubmit = (data: { finalMileage: string; reason: string; note?: string }) => {
    offboardMutation.mutate(data);
  };

  const handleAddClick = () => {
    setSelectedCar(null);
    form.reset({
      vin: "",
      makeModel: "",
      licensePlate: "",
      year: "",
      color: "",
      mileage: "",
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (car: Car) => {
    setSelectedCar(car);
    form.reset({
      vin: car.vin,
      makeModel: car.makeModel,
      licensePlate: car.licensePlate || "",
      year: car.year?.toString() || "",
      color: car.color || "",
      mileage: car.mileage?.toString() || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (confirm("Are you sure you want to delete this car? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
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
      case "available":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_use":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "maintenance":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "off_fleet":
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
            <p className="text-gray-400 text-sm">Manage your vehicle fleet</p>
          </div>
          <Button
            onClick={handleAddClick}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Car
          </Button>
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
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1); // Reset to first page on filter change
              }}>
                <SelectTrigger className="w-full md:w-[200px] bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="off_fleet">Off Fleet</SelectItem>
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
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      VIN
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Make & Model
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Year
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Color
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Mileage
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      License Plate
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Owner
                    </th>
                    <th className="text-right text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <tr key={`skeleton-${i}`} className="border-b border-[#2a2a2a]">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="h-4 bg-[#252525] rounded animate-pulse" />
                      </td>
                    </tr>
                      ))}
                    </>
                  ) : cars.length > 0 ? (
                    cars.map((car) => {
                      return (
                        <tr 
                          key={car.id} 
                          className="hover:bg-[#252525] transition-colors cursor-pointer group"
                          onClick={() => setLocation(`/admin/cars/${car.id}`)}
                        >
                          <td className="px-6 py-4">
                            <span className="text-white font-mono text-sm">{car.vin || "N/A"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-medium">{car.makeModel || "N/A"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white">{car.year || "N/A"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-400">{car.color || "N/A"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-400">{car.mileage?.toLocaleString() || "0"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-400 font-mono text-sm">
                              {car.licensePlate || <span className="text-gray-600">N/A</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={getStatusBadgeColor(car.status)}>
                              {car.status === "available" ? "Available" : car.status === "in_use" ? "Rented" : car.status === "maintenance" ? "Maintenance" : "Off Fleet"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {car.owner ? (
                              <div>
                                <div className="text-white text-sm">
                                  {car.owner.firstName} {car.owner.lastName}
                                </div>
                                {car.owner.email && (
                                  <div className="text-gray-500 text-xs">{car.owner.email}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-600 text-sm">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              {car.status === "available" && (
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(car.id);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-gray-400 text-lg">No cars found</p>
                          <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
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
        <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedCar(null);
            form.reset();
          }
        }}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
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
                      <FormLabel className="text-gray-400">Make & Model *</FormLabel>
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
                    name="licensePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">License Plate</FormLabel>
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
                        <FormLabel className="text-gray-400">Color</FormLabel>
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
                    name="mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Current Mileage</FormLabel>
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
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {selectedCar ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Off-board Modal */}
        <Dialog open={isOffboardModalOpen} onOpenChange={setIsOffboardModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Off-board Vehicle</DialogTitle>
              <DialogDescription className="text-gray-400">
                Remove this vehicle from the active fleet
              </DialogDescription>
            </DialogHeader>

            <Form {...offboardForm}>
              <form onSubmit={offboardForm.handleSubmit(onOffboardSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={offboardForm.control}
                  name="finalMileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-400">Final Mileage *</FormLabel>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="end_lease">End of Lease</SelectItem>
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
                      <FormLabel className="text-gray-400">Note (optional)</FormLabel>
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
                    {offboardMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
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

