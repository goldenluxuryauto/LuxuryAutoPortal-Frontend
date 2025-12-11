import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { buildApiUrl } from "@/lib/queryClient";
import { Loader2, Search, LogOut } from "lucide-react";
import {
  TablePagination,
  ItemsPerPage,
} from "@/components/ui/table-pagination";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface OffboardingCar {
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

const offboardCarSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Name is required"),
  vehicleMakeModelYear: z
    .string()
    .min(1, "Vehicle Make/Model/Year is required"),
  licensePlate: z.string().min(1, "License Plate is required"),
  returnDate: z.string().min(1, "Return date is required"),
});

type OffboardCarFormData = z.infer<typeof offboardCarSchema>;

export default function CarOffboarding() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isOffboardDialogOpen, setIsOffboardDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("car_offboarding_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("car_offboarding_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Fetch cars for offboarding section with pagination
  const { data: carsData, isLoading } = useQuery<{
    success: boolean;
    data: OffboardingCar[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["cars-offboarding-forms", searchQuery, page, itemsPerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(
        buildApiUrl(`/api/cars/offboarding-forms?${params.toString()}`),
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Database connection failed" }));
        throw new Error(
          errorData.error || "Failed to fetch cars for offboarding"
        );
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Form for Offboard Car dialog
  const offboardCarForm = useForm<OffboardCarFormData>({
    resolver: zodResolver(offboardCarSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      name: "",
      vehicleMakeModelYear: "",
      licensePlate: "",
      returnDate: new Date().toISOString().split("T")[0],
    },
  });

  // Offboard car mutation
  const offboardCarMutation = useMutation({
    mutationFn: async (data: OffboardCarFormData) => {
      const response = await fetch(buildApiUrl("/api/cars/offboard"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to offboard car" }));
        throw new Error(error.error || "Failed to offboard car");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars-offboarding-forms"] });
      setIsOffboardDialogOpen(false);
      offboardCarForm.reset();
      toast({
        title: "✅ Success",
        description: "Car offboarded successfully",
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to offboard car",
        variant: "destructive",
      });
    },
  });

  const onSubmitOffboardCar = (data: OffboardCarFormData) => {
    offboardCarMutation.mutate(data);
  };

  const cars = carsData?.data || [];
  const pagination = carsData?.pagination;

  // Handle row click - navigate to client profile
  const handleRowClick = (car: OffboardingCar) => {
    if (car.clientId) {
      setLocation(`/admin/clients?id=${car.clientId}`);
    } else {
      setLocation(
        `/admin/clients?search=${encodeURIComponent(car.clientName)}`
      );
    }
  };

  // Format offboard reason
  const formatReason = (reason: string | null): string => {
    if (!reason) return "—";
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6">
      {/* Header with Off-board Car button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Car Off-boarding</h2>
          <p className="text-sm text-gray-400 mt-1">
            View vehicles removed from the fleet
          </p>
        </div>
        <Button
          onClick={() => setIsOffboardDialogOpen(true)}
          className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Offboard Car
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search by name, email, phone, VIN, plate, or make/model..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
        />
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
                        Car Offboarding Date
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
                        <TableCell
                          className="px-6 py-4 text-white cursor-pointer"
                          onClick={() => handleRowClick(car)}
                        >
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
                          {car.licensePlate
                            ? car.licensePlate.toUpperCase()
                            : "—"}
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
                            className="border-red-500/50 text-red-400 bg-red-500/10 text-xs"
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
                          {car.offboardAt
                            ? new Date(car.offboardAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                }
                              )
                            : "—"}
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
                    setPage(1); // Reset to first page when changing limit
                  }}
                  isLoading={isLoading}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No records found</p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No cars have been offboarded yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offboard Car Dialog */}
      <Dialog
        open={isOffboardDialogOpen}
        onOpenChange={setIsOffboardDialogOpen}
      >
        <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-[#EAEB80]">
              Offboard Car
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Remove a vehicle from the active fleet
            </DialogDescription>
          </DialogHeader>

          <Form {...offboardCarForm}>
            <form
              onSubmit={offboardCarForm.handleSubmit(onSubmitOffboardCar)}
              className="space-y-6 mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={offboardCarForm.control}
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
                  control={offboardCarForm.control}
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
                control={offboardCarForm.control}
                name="vehicleMakeModelYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">
                      Vehicle Make/Model (Year){" "}
                      <span className="text-[#EAEB80]">*</span>
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
                  control={offboardCarForm.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        License Plate Number{" "}
                        <span className="text-[#EAEB80]">*</span>
                      </FormLabel>
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
                  control={offboardCarForm.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">
                        Vehicle Return Date{" "}
                        <span className="text-[#EAEB80]">*</span>
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
                    setIsOffboardDialogOpen(false);
                    offboardCarForm.reset();
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    offboardCarMutation.isPending ||
                    !offboardCarForm.formState.isValid
                  }
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {offboardCarMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Offboarding...
                    </>
                  ) : (
                    "Confirm Offboarding"
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
