import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { buildApiUrl } from "@/lib/queryClient";
import {
  Loader2,
  Search,
  Plus,
  Eye,
  Edit,
  LogOut,
} from "lucide-react";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface OnboardingCar {
  id: number;
  createdAt: string;
  clientId: number | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  vin: string | null;
  carMakeModel: string;
  year: number | null;
  licensePlate: string | null;
  status: string;
  offboardAt: string | null;
  offboardReason: string | null;
  finalMileage: number | null;
}

const addCarSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Name is required"),
  carMakeModelYear: z.string().min(1, "Car Make/Model/Year is required"),
  plateNumber: z.string().optional(),
  dropOffDate: z.string().min(1, "Drop-off date is required"),
});

type AddCarFormData = z.infer<typeof addCarSchema>;

function CarOnboarding() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("car_onboarding_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("car_onboarding_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  // Reset page to 1 when search or status changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  // Form for Add New Car dialog
  const addCarForm = useForm<AddCarFormData>({
    resolver: zodResolver(addCarSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      name: "",
      carMakeModelYear: "",
      plateNumber: "",
      dropOffDate: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch cars for onboarding section with pagination
  const { data: carsData, isLoading } = useQuery<{
    success: boolean;
    data: OnboardingCar[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["cars-onboarding", searchQuery, statusFilter, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const response = await fetch(
        buildApiUrl(`/api/cars/onboarding?${params.toString()}`),
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch cars" }));
        throw new Error(error.error || `Failed to fetch cars: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Add new car mutation
  const addCarMutation = useMutation({
    mutationFn: async (data: AddCarFormData) => {
      const response = await fetch(buildApiUrl("/api/cars/onboard"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to add car" }));
        throw new Error(error.error || "Failed to add car");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars-onboarding"] });
      setIsAddDialogOpen(false);
      addCarForm.reset();
      toast({
        title: "✅ Success",
        description: "New car added successfully",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add car",
        variant: "destructive",
      });
    },
  });

  const onSubmitAddCar = (data: AddCarFormData) => {
    addCarMutation.mutate(data);
  };

  const cars = carsData?.data || [];
  const pagination = carsData?.pagination;

  // Handle row click - navigate to client profile
  const handleRowClick = (car: OnboardingCar) => {
    if (car.clientId) {
      setLocation(`/admin/clients?id=${car.clientId}`);
    } else {
      setLocation(`/admin/clients?search=${encodeURIComponent(car.clientName)}`);
    }
  };

  // Handle action buttons
  const handleView = (e: React.MouseEvent, car: OnboardingCar) => {
    e.stopPropagation();
    if (car.clientId) {
      setLocation(`/admin/clients?id=${car.clientId}`);
    }
  };

  const handleEdit = (e: React.MouseEvent, car: OnboardingCar) => {
    e.stopPropagation();
    setLocation(`/admin/cars?id=${car.id}`);
  };

  const handleOffboard = (e: React.MouseEvent, car: OnboardingCar) => {
    e.stopPropagation();
    setLocation(`/admin/cars/offboarding?carId=${car.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add New Car button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Car On-boarding</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage vehicles added to the fleet
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Car
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name, email, phone, VIN, plate, or make/model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="offboarded">Offboarded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Card */}
      <Card className="bg-[#111111] border-[#EAEB80]/20">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#EAEB80] animate-spin" />
            </div>
          ) : cars.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#1a1a1a]">
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Name
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Email
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Phone
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Vehicle
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        VIN#
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Plate #
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Submitted
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Status
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Contract
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Car Onboarding Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cars.map((car) => (
                      <TableRow
                        key={car.id}
                        className={cn(
                          "border-b border-[#1a1a1a] hover:bg-[#111111] transition-colors"
                        )}
                      >
                        <TableCell className="px-6 py-4 text-white cursor-pointer" onClick={() => handleRowClick(car)}>
                          {car.clientName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300">
                          {car.clientEmail || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300">
                          {car.clientPhone || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300">
                          {car.carMakeModel}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300 font-mono text-xs">
                          {car.vin || "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300 font-mono">
                          {car.licensePlate ? car.licensePlate.toUpperCase() : "—"}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300">
                          {new Date(car.createdAt).toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              car.status === "On-boarded"
                                ? "border-green-500/50 text-green-400 bg-green-500/10"
                                : "border-gray-500/50 text-gray-400 bg-gray-500/10"
                            )}
                          >
                            {car.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant="outline"
                            className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs"
                          >
                            N/A
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-300">
                          {new Date(car.createdAt).toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && (
                <TablePagination
                  totalItems={pagination.total}
                  itemsPerPage={itemsPerPage}
                  currentPage={page}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onItemsPerPageChange={(newLimit) => {
                    setItemsPerPage(newLimit);
                    setPage(1);
                  }}
                  isLoading={isLoading}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No records found</p>
              <p className="text-sm mt-2">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No cars have been onboarded yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Car Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#EAEB80]">
              Add New Car
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new vehicle to the onboarding queue
            </DialogDescription>
          </DialogHeader>

          <Form {...addCarForm}>
            <form onSubmit={addCarForm.handleSubmit(onSubmitAddCar)} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addCarForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Date <span className="text-[#EAEB80]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addCarForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Name <span className="text-[#EAEB80]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Client full name"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addCarForm.control}
                name="carMakeModelYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      Car Make/Model (Year) <span className="text-[#EAEB80]">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., 2024 Lamborghini Urus"
                        className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addCarForm.control}
                  name="plateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Plate #</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="License plate number"
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80] uppercase"
                          style={{ textTransform: "uppercase" }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addCarForm.control}
                  name="dropOffDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Date of Car Drop Off <span className="text-[#EAEB80]">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
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
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    addCarForm.reset();
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addCarMutation.isPending || !addCarForm.formState.isValid}
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addCarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CarOnboarding;
