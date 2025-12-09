import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, apiRequest } from "@/lib/queryClient";
import { Search, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { TablePagination, ItemsPerPage } from "@/components/ui/table-pagination";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
}

const offboardSchema = z.object({
  finalMileage: z.string().min(1, "Final mileage is required"),
  reason: z.enum(["sold", "damaged", "end_lease", "other"]),
  note: z.string().optional(),
});

type OffboardFormData = z.infer<typeof offboardSchema>;

export default function CarOffboarding() {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [isOffboardModalOpen, setIsOffboardModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  
  // Load items per page from localStorage, default to 10
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(() => {
    const saved = localStorage.getItem("car_offboarding_limit");
    return (saved ? parseInt(saved) : 10) as ItemsPerPage;
  });

  // Save to localStorage when itemsPerPage changes
  useEffect(() => {
    localStorage.setItem("car_offboarding_limit", itemsPerPage.toString());
  }, [itemsPerPage]);

  // Reset page to 1 when search or tab changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form for off-board
  const offboardForm = useForm<OffboardFormData>({
    resolver: zodResolver(offboardSchema),
    defaultValues: {
      finalMileage: "",
      reason: "sold",
      note: "",
    },
  });

  // Fetch active cars (can be off-boarded) from glav1_car table
  const { data: activeCarsData, isLoading: isLoadingActive } = useQuery<{
    success: boolean;
    data: Car[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/cars/offboarding", searchQuery, page, itemsPerPage],
    enabled: activeTab === "active",
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());
      const url = buildApiUrl(`/api/cars/offboarding?${params.toString()}`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Database connection failed" }));
        throw new Error(errorData.error || "Failed to fetch cars for offboarding");
      }
      return response.json();
    },
    retry: false,
  });

  // Fetch archived cars (off-fleet)
  const { data: archivedCarsData, isLoading: isLoadingArchived } = useQuery<{
    success: boolean;
    data: Car[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/cars", "off_fleet", searchQuery, page, itemsPerPage],
    enabled: activeTab === "archived",
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", "off_fleet");
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
        throw new Error(errorData.error || "Failed to fetch archived cars");
      }
      return response.json();
    },
    retry: false,
  });

  const activeCars = activeCarsData?.data || [];
  const archivedCars = archivedCarsData?.data || [];
  const activePagination = activeCarsData?.pagination;
  const archivedPagination = archivedCarsData?.pagination;
  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingArchived;
  const currentCars = activeTab === "active" ? activeCars : archivedCars;
  const currentPagination = activeTab === "active" ? activePagination : archivedPagination;

  // Off-board mutation
  const offboardMutation = useMutation({
    mutationFn: async (data: OffboardFormData) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/cars/offboarding"] });
      toast({
        title: "Success",
        description: "Vehicle off-boarded successfully",
      });
      setIsOffboardModalOpen(false);
      setSelectedCar(null);
      offboardForm.reset();
      // Switch to Archived tab
      setActiveTab("archived");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOffboard = (car: Car) => {
    setSelectedCar(car);
    offboardForm.reset({
      finalMileage: car.mileage.toString(),
      reason: "sold",
      note: "",
    });
    setIsOffboardModalOpen(true);
  };

  const onOffboardSubmit = (data: OffboardFormData) => {
    if (selectedCar) {
      offboardMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
            Available
          </Badge>
        );
      case "in_use":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">
            In Use
          </Badge>
        );
      case "maintenance":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
            Maintenance
          </Badge>
        );
      case "off_fleet":
        return (
          <Badge className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs">
            Off Fleet
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Car Off-boarding</h1>
          <p className="text-gray-400 mt-1">
            Remove vehicles from active fleet
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search by VIN, Make, Plate, or Owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500"
        />
      </div>

      <Card className="bg-[#111111] border-[#EAEB80]/20">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
            <TabsList className="bg-[#1a1a1a] border-b border-[#1a1a1a] rounded-none w-full justify-start">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-transparent data-[state=active]:text-[#EAEB80] data-[state=active]:border-b-2 data-[state=active]:border-[#EAEB80] rounded-none px-6 py-3"
              >
                Active Fleet
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:bg-transparent data-[state=active]:text-[#EAEB80] data-[state=active]:border-b-2 data-[state=active]:border-[#EAEB80] rounded-none px-6 py-3"
              >
                Archived
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#2a2a2a]">
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        ID
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        VIN
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Make
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Model
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Year
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Color
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        License Plate
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Status
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Current Driver
                      </TableHead>
                      <TableHead className="text-right text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      // Loading skeleton
                      Array.from({ length: itemsPerPage }).map((_, i) => (
                        <TableRow key={i} className="border-b border-[#2a2a2a]">
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-12" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-16" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-16" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-6 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="h-8 bg-gray-700 rounded animate-pulse w-24 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : activeCars.length > 0 ? (
                      activeCars.map((car) => {
                        // Parse make and model from makeModel string
                        const makeModelParts = car.makeModel ? car.makeModel.split(" ") : [];
                        const make = makeModelParts[0] || "N/A";
                        const model = makeModelParts.slice(1).join(" ") || "N/A";
                        
                        return (
                          <TableRow
                            key={car.id}
                            className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                          >
                            <TableCell className="px-6 py-4">
                              <span className="text-white font-mono text-sm">
                                {car.id}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-white font-mono text-sm">
                                {car.vin || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-white font-medium">
                                {make}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-white">
                                {model}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-gray-300">
                                {car.year || <span className="text-gray-500">N/A</span>}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-gray-300">
                                {car.color || <span className="text-gray-500">N/A</span>}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <span className="text-gray-300 font-mono text-sm">
                                {car.licensePlate || <span className="text-gray-500">N/A</span>}
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {getStatusBadge(car.status)}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {car.owner ? (
                                <div>
                                  <div className="text-white text-sm">
                                    {car.owner.firstName} {car.owner.lastName}
                                  </div>
                                  {car.owner.email && (
                                    <div className="text-gray-400 text-xs">
                                      {car.owner.email}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 hover:bg-[#EAEB80]/20 text-[#EAEB80]"
                                onClick={() => handleOffboard(car)}
                              >
                                <LogOut className="w-4 h-4 mr-1" />
                                Off-board Car
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-gray-400 text-lg mb-2">No cars available for off-boarding</p>
                            <p className="text-gray-500 text-sm">
                              {searchQuery
                                ? "Try adjusting your search"
                                : "No active vehicles found in glav1_car table"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination for Active Fleet */}
              {activePagination && (
                <div className="border-t border-[#2a2a2a] px-6 py-4">
                  <TablePagination
                    totalItems={activePagination.total}
                    itemsPerPage={itemsPerPage}
                    currentPage={page}
                    onPageChange={setPage}
                    onItemsPerPageChange={setItemsPerPage}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#2a2a2a]">
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        VIN
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Make & Model
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Plate
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Year
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Mileage
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Status
                      </TableHead>
                      <TableHead className="text-left text-xs font-medium text-[#EAEB80] uppercase tracking-wider px-6 py-4">
                        Off-boarded
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      // Loading skeleton
                      Array.from({ length: itemsPerPage }).map((_, i) => (
                        <TableRow key={i} className="border-b border-[#2a2a2a]">
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-32" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-16" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-6 bg-gray-700 rounded animate-pulse w-20" />
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="h-4 bg-gray-700 rounded animate-pulse w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : archivedCars.length > 0 ? (
                      archivedCars.map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors"
                        >
                          <TableCell className="px-6 py-4">
                            <span className="text-white font-mono text-sm">
                              {car.vin || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-white font-medium">
                              {car.makeModel || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-gray-300">
                              {car.licensePlate || <span className="text-gray-500">N/A</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-gray-300">
                              {car.year || <span className="text-gray-500">N/A</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-gray-300">
                              {car.mileage.toLocaleString()} mi
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {getStatusBadge("off_fleet")}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-gray-400 text-sm">
                              {car.offboardAt
                                ? new Date(car.offboardAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-gray-400 text-lg mb-2">No archived vehicles</p>
                            <p className="text-gray-500 text-sm">
                              {searchQuery
                                ? "Try adjusting your search"
                                : "No vehicles have been off-boarded yet"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination for Archived */}
              {archivedPagination && (
                <div className="border-t border-[#2a2a2a] px-6 py-4">
                  <TablePagination
                    totalItems={archivedPagination.total}
                    itemsPerPage={itemsPerPage}
                    currentPage={page}
                    onPageChange={setPage}
                    onItemsPerPageChange={setItemsPerPage}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Off-board Modal */}
      <Dialog open={isOffboardModalOpen} onOpenChange={setIsOffboardModalOpen}>
        <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Off-board Vehicle</DialogTitle>
            <DialogDescription className="text-gray-400">
              Remove this vehicle from the active fleet
            </DialogDescription>
          </DialogHeader>

          <Form {...offboardForm}>
            <form
              onSubmit={offboardForm.handleSubmit(onOffboardSubmit)}
              className="space-y-4"
            >
              <FormField
                control={offboardForm.control}
                name="finalMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Final Mileage *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="bg-[#0a0a0a] border-gray-700 text-white"
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
                    <FormLabel className="text-white">Reason *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <FormLabel className="text-white">Note (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="bg-[#0a0a0a] border-gray-700 text-white"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOffboardModalOpen(false);
                    setSelectedCar(null);
                    offboardForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                  disabled={offboardMutation.isPending}
                >
                  {offboardMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
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
