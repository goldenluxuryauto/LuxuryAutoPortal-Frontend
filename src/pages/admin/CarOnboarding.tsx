import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  Plus,
  Loader2,
  Search,
  Undo2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClientCar {
  id: number;
  date: string;
  name: string;
  makeModel: string;
  plateNumber: string;
  dropOffDate: string;
  isActive: boolean;
  returnedAt?: string | null;
}

// Validation schemas
const carOnboardingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Name is required"),
  makeModel: z.string().min(1, "Car Make/Model (year) is required"),
  plateNumber: z.string().min(1, "Plate # is required"),
  dropOffDate: z.string().min(1, "Date of Car Drop Off is required"),
});

const carOffboardingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  name: z.string().min(1, "Name is required"),
  makeModel: z.string().min(1, "Car Make/Model (year) is required"),
  plateNumber: z.string().min(1, "Plate # is required"),
  pickUpDate: z.string().min(1, "Date of Car Pick Up is required"),
});

type CarOnboardingFormData = z.infer<typeof carOnboardingSchema>;
type CarOffboardingFormData = z.infer<typeof carOffboardingSchema>;

export default function CarOnboarding() {
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isOffboardModalOpen, setIsOffboardModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "returned">("active");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Onboarding form
  const onboardForm = useForm<CarOnboardingFormData>({
    resolver: zodResolver(carOnboardingSchema),
    mode: "onChange",
    defaultValues: {
      date: getTodayDate(),
      name: "",
      makeModel: "",
      plateNumber: "",
      dropOffDate: "",
    },
  });

  // Offboarding form
  const offboardForm = useForm<CarOffboardingFormData>({
    resolver: zodResolver(carOffboardingSchema),
    mode: "onChange",
    defaultValues: {
      date: getTodayDate(),
      name: "",
      makeModel: "",
      plateNumber: "",
      pickUpDate: "",
    },
  });

  // Fetch client cars
  const { data: carsData, isLoading } = useQuery<{
    success: boolean;
    data: ClientCar[];
  }>({
    queryKey: ["client-cars", activeTab === "returned"],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeReturned: activeTab === "returned" ? "true" : "false",
      });
      const response = await fetch(
        buildApiUrl(`/api/client/cars?${params.toString()}`),
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
  });

  // Onboard vehicle mutation
  const onboardMutation = useMutation({
    mutationFn: async (data: CarOnboardingFormData) => {
      const response = await fetch(buildApiUrl("/api/client/cars/onboard"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to add vehicle");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-cars"] });
      toast({
        title: "Success!",
        description: "Vehicle added to your fleet.",
      });
      setIsOnboardModalOpen(false);
      onboardForm.reset({
        date: getTodayDate(),
        name: "",
        makeModel: "",
        plateNumber: "",
        dropOffDate: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Vehicle",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Offboard vehicle mutation
  const offboardMutation = useMutation({
    mutationFn: async (data: CarOffboardingFormData) => {
      const response = await fetch(buildApiUrl("/api/client/cars/offboard"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to return vehicle");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-cars"] });
      toast({
        title: "Success!",
        description: "Vehicle returned successfully.",
      });
      setIsOffboardModalOpen(false);
      offboardForm.reset({
        date: getTodayDate(),
        name: "",
        makeModel: "",
        plateNumber: "",
        pickUpDate: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Return Vehicle",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Filter cars based on search query
  const filteredCars = carsData?.data?.filter((car) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      car.name.toLowerCase().includes(query) ||
      car.makeModel.toLowerCase().includes(query) ||
      car.plateNumber.toLowerCase().includes(query)
    );
  });

  // Get active and returned counts
  const activeCars = carsData?.data?.filter((car) => car.isActive) || [];
  const returnedCars = carsData?.data?.filter((car) => !car.isActive) || [];

  return (
    <div className="space-y-6">
      {/* Header with buttons */}
      <Card className="bg-[#0a0a0a] border-[#EAEB80]/30 border-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold text-[#EAEB80]">
              My Vehicles
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Manage your vehicle fleet with GLA
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
              onClick={() => setIsOnboardModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 font-medium"
              onClick={() => setIsOffboardModalOpen(true)}
            >
              <Undo2 className="w-4 h-4 mr-2" /> Return Vehicle
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main content card */}
      <Card className="bg-[#0a0a0a] border-[#EAEB80]/30 border-2">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-[#111111]">
                <TabsTrigger value="active" className="data-[state=active]:bg-[#EAEB80] data-[state=active]:text-black">
                  Active Fleet ({activeCars.length})
                </TabsTrigger>
                <TabsTrigger value="returned" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  Returned ({returnedCars.length})
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#111111] border-[#1a1a1a] text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <TabsContent value="active" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#EAEB80] animate-spin" />
                </div>
              ) : filteredCars && filteredCars.filter((c) => c.isActive).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#1a1a1a] hover:bg-transparent">
                        <TableHead className="text-gray-400 font-medium">Drop-off Date</TableHead>
                        <TableHead className="text-gray-400 font-medium">Name</TableHead>
                        <TableHead className="text-gray-400 font-medium">Make & Model</TableHead>
                        <TableHead className="text-gray-400 font-medium">Plate #</TableHead>
                        <TableHead className="text-gray-400 font-medium">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCars.filter((c) => c.isActive).map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-b border-[#1a1a1a] hover:bg-[#111111] transition-colors"
                        >
                          <TableCell className="text-white">
                            {new Date(car.dropOffDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-300">{car.name}</TableCell>
                          <TableCell className="text-gray-300">{car.makeModel}</TableCell>
                          <TableCell className="text-gray-300">{car.plateNumber}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                              Active
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No active vehicles in your fleet.</p>
                  <p className="text-sm mt-2">Click "+ Add Vehicle" to add your first vehicle.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="returned" className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#EAEB80] animate-spin" />
                </div>
              ) : filteredCars && filteredCars.filter((c) => !c.isActive).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#1a1a1a] hover:bg-transparent">
                        <TableHead className="text-gray-400 font-medium">Drop-off Date</TableHead>
                        <TableHead className="text-gray-400 font-medium">Name</TableHead>
                        <TableHead className="text-gray-400 font-medium">Make & Model</TableHead>
                        <TableHead className="text-gray-400 font-medium">Plate #</TableHead>
                        <TableHead className="text-gray-400 font-medium">Returned</TableHead>
                        <TableHead className="text-gray-400 font-medium">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCars.filter((c) => !c.isActive).map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-b border-[#1a1a1a] hover:bg-[#111111] transition-colors opacity-60"
                        >
                          <TableCell className="text-white">
                            {new Date(car.dropOffDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-300">{car.name}</TableCell>
                          <TableCell className="text-gray-300">{car.makeModel}</TableCell>
                          <TableCell className="text-gray-300">{car.plateNumber}</TableCell>
                          <TableCell className="text-gray-300">
                            {car.returnedAt ? new Date(car.returnedAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/50">
                              Returned
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No returned vehicles.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Onboarding Modal */}
      <Dialog open={isOnboardModalOpen} onOpenChange={setIsOnboardModalOpen}>
        <DialogContent className="max-w-md bg-[#111111] border-[#EAEB80]/30 border-2 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Car On-boarding Form</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please fill out the details below when dropping off your car to GLA
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onboardForm.handleSubmit((data) => onboardMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Date *</label>
              <Input
                type="date"
                {...onboardForm.register("date")}
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white"
              />
              {onboardForm.formState.errors.date && (
                <p className="text-red-500 text-sm mt-1">{onboardForm.formState.errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Name *</label>
              <Input
                {...onboardForm.register("name")}
                placeholder="Your name"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {onboardForm.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{onboardForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Car Make/Model (year) *</label>
              <Input
                {...onboardForm.register("makeModel")}
                placeholder="e.g., Mercedes-Benz C-Class (2023)"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {onboardForm.formState.errors.makeModel && (
                <p className="text-red-500 text-sm mt-1">{onboardForm.formState.errors.makeModel.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Plate # *</label>
              <Input
                {...onboardForm.register("plateNumber")}
                placeholder="e.g., ABC-123"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {onboardForm.formState.errors.plateNumber && (
                <p className="text-red-500 text-sm mt-1">{onboardForm.formState.errors.plateNumber.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Date of Car Drop Off *</label>
              <Input
                type="date"
                {...onboardForm.register("dropOffDate")}
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white"
              />
              {onboardForm.formState.errors.dropOffDate && (
                <p className="text-red-500 text-sm mt-1">{onboardForm.formState.errors.dropOffDate.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOnboardModalOpen(false);
                  onboardForm.reset();
                }}
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                disabled={onboardMutation.isPending || !onboardForm.formState.isValid}
              >
                {onboardMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offboarding Modal */}
      <Dialog open={isOffboardModalOpen} onOpenChange={setIsOffboardModalOpen}>
        <DialogContent className="max-w-md bg-[#111111] border-red-600/30 border-2 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Car Off-boarding Form</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please fill out the details below when you want us to return your car
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={offboardForm.handleSubmit((data) => offboardMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Date *</label>
              <Input
                type="date"
                {...offboardForm.register("date")}
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white"
              />
              {offboardForm.formState.errors.date && (
                <p className="text-red-500 text-sm mt-1">{offboardForm.formState.errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Name *</label>
              <Input
                {...offboardForm.register("name")}
                placeholder="Your name"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {offboardForm.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{offboardForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Car Make/Model (year) *</label>
              <Input
                {...offboardForm.register("makeModel")}
                placeholder="e.g., Mercedes-Benz C-Class (2023)"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {offboardForm.formState.errors.makeModel && (
                <p className="text-red-500 text-sm mt-1">{offboardForm.formState.errors.makeModel.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Plate # *</label>
              <Input
                {...offboardForm.register("plateNumber")}
                placeholder="e.g., ABC-123"
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white placeholder:text-gray-500"
              />
              {offboardForm.formState.errors.plateNumber && (
                <p className="text-red-500 text-sm mt-1">{offboardForm.formState.errors.plateNumber.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-white">Date of Car Pick Up *</label>
              <Input
                type="date"
                {...offboardForm.register("pickUpDate")}
                className="mt-1 bg-[#1a1a1a] border-[#222222] text-white"
              />
              {offboardForm.formState.errors.pickUpDate && (
                <p className="text-red-500 text-sm mt-1">{offboardForm.formState.errors.pickUpDate.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOffboardModalOpen(false);
                  offboardForm.reset();
                }}
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 text-white hover:bg-red-700 font-medium"
                disabled={offboardMutation.isPending || !offboardForm.formState.isValid}
              >
                {offboardMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Return Vehicle"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
