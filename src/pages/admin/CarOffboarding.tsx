import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { buildApiUrl } from "@/lib/queryClient";
import {
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active cars (can be off-boarded)
  const { data: activeCarsData, isLoading: isLoadingActive } = useQuery<{
    success: boolean;
    data: Car[];
  }>({
    queryKey: ["cars", "active"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/cars"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch active cars");
      }
      const data = await response.json();
      // Filter for active cars only (not off_fleet)
      const active = (data.data || []).filter(
        (car: Car) => car.status !== "off_fleet"
      );
      return { success: true, data: active };
    },
  });

  // Fetch archived cars (off-fleet)
  const { data: archivedCarsData, isLoading: isLoadingArchived } = useQuery<{
    success: boolean;
    data: Car[];
  }>({
    queryKey: ["cars", "off_fleet"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/cars?status=off_fleet"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch archived cars");
      }
      return response.json();
    },
  });

  const activeCars = activeCarsData?.data || [];
  const archivedCars = archivedCarsData?.data || [];

  // Form for off-board
  const offboardForm = useForm<OffboardFormData>({
    resolver: zodResolver(offboardSchema),
    defaultValues: {
      finalMileage: "",
      reason: "sold",
      note: "",
    },
  });

  // Off-board mutation
  const offboardMutation = useMutation({
    mutationFn: async (data: OffboardFormData) => {
      const response = await fetch(buildApiUrl(`/api/cars/${selectedCar?.id}/offboard`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          finalMileage: parseInt(data.finalMileage, 10),
          reason: data.reason,
          note: data.note || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to off-board car");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: "Success",
        description: "Vehicle off-boarded successfully",
      });
      setIsOffboardModalOpen(false);
      setSelectedCar(null);
      offboardForm.reset();
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

      <Card className="bg-[#111111] border-[#EAEB80]/20">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")}>
            <TabsList className="bg-[#1a1a1a] border-b border-[#1a1a1a] rounded-none">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-[#EAEB80]"
              >
                Active Fleet
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-[#EAEB80]"
              >
                Archived
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="m-0">
              {isLoadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
                </div>
              ) : activeCars.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No active vehicles to off-board</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#1a1a1a]">
                        <TableHead className="text-gray-400">VIN</TableHead>
                        <TableHead className="text-gray-400">Make & Model</TableHead>
                        <TableHead className="text-gray-400">Plate</TableHead>
                        <TableHead className="text-gray-400">Year</TableHead>
                        <TableHead className="text-gray-400">Mileage</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeCars.map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-[#1a1a1a] hover:bg-[#1a1a1a]"
                        >
                          <TableCell className="text-white font-mono text-sm">
                            {car.vin}
                          </TableCell>
                          <TableCell className="text-white">{car.makeModel}</TableCell>
                          <TableCell className="text-gray-300">
                            {car.licensePlate || <span className="text-gray-500">N/A</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.year || <span className="text-gray-500">N/A</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.mileage.toLocaleString()} mi
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-xs",
                                car.status === "available"
                                  ? "bg-green-500/20 text-green-400 border-green-500/50"
                                  : car.status === "in_use"
                                  ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              )}
                            >
                              {car.status === "available"
                                ? "Available"
                                : car.status === "in_use"
                                ? "In Use"
                                : "Maintenance"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 hover:bg-red-500/20"
                              onClick={() => handleOffboard(car)}
                              title="Off-board"
                            >
                              <LogOut className="w-4 h-4 mr-1 text-red-500" />
                              Off-board
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="m-0">
              {isLoadingArchived ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
                </div>
              ) : archivedCars.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No archived vehicles</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#1a1a1a]">
                        <TableHead className="text-gray-400">VIN</TableHead>
                        <TableHead className="text-gray-400">Make & Model</TableHead>
                        <TableHead className="text-gray-400">Plate</TableHead>
                        <TableHead className="text-gray-400">Year</TableHead>
                        <TableHead className="text-gray-400">Mileage</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Reason</TableHead>
                        <TableHead className="text-gray-400">Off-boarded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archivedCars.map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-[#1a1a1a] hover:bg-[#1a1a1a]"
                        >
                          <TableCell className="text-white font-mono text-sm">
                            {car.vin}
                          </TableCell>
                          <TableCell className="text-white">{car.makeModel}</TableCell>
                          <TableCell className="text-gray-300">
                            {car.licensePlate || <span className="text-gray-500">N/A</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.year || <span className="text-gray-500">N/A</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.mileage.toLocaleString()} mi
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-gray-800/50 text-gray-400 border-gray-700 text-xs"
                            >
                              Off Fleet
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm capitalize">
                            {car.offboardReason?.replace("_", " ") || "N/A"}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {car.offboardAt
                              ? new Date(car.offboardAt).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

