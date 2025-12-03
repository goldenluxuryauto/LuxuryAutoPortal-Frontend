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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Loader2,
  X,
  Image as ImageIcon,
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
  photos?: string[];
}

interface RegisteredCar {
  id: number;
  vinNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  licensePlate: string;
  firstNameOwner: string;
  lastNameOwner: string;
  emailOwner: string;
  contractSignedAt: string;
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

export default function CarOnboarding() {
  const [activeTab, setActiveTab] = useState<"registered" | "active">("registered");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch registered cars (from onboarding submissions with signed contracts)
  const { data: registeredCarsData, isLoading: isLoadingRegistered } = useQuery<{
    success: boolean;
    data: RegisteredCar[];
  }>({
    queryKey: ["registered-cars"],
    queryFn: async () => {
      const response = await fetch(buildApiUrl("/api/onboarding/submissions"), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch registered cars");
      }
      const data = await response.json();
      // Filter for signed contracts only
      const signed = (data.data || []).filter(
        (sub: any) => sub.contractStatus === "signed"
      );
      return { success: true, data: signed };
    },
  });

  // Fetch active cars from cars table
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

  const registeredCars = registeredCarsData?.data || [];
  const activeCars = activeCarsData?.data || [];

  // Form for add/edit
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

  // Create car mutation
  const createMutation = useMutation({
    mutationFn: async (data: CarFormData & { photos: File[] }) => {
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);
      
      data.photos.forEach((photo) => {
        formData.append("photos", photo);
      });

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
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: "Success",
        description: "Vehicle added successfully",
      });
      setIsAddModalOpen(false);
      form.reset();
      setUploadedPhotos([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update car mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CarFormData & { photos: File[] } }) => {
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);
      
      data.photos.forEach((photo) => {
        formData.append("photos", photo);
      });

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
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });
      setIsEditModalOpen(false);
      setSelectedCar(null);
      form.reset();
      setUploadedPhotos([]);
      setExistingPhotos([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    form.reset();
    setUploadedPhotos([]);
    setIsAddModalOpen(true);
  };

  const handleEdit = (car: Car) => {
    setSelectedCar(car);
    form.reset({
      vin: car.vin,
      makeModel: car.makeModel,
      licensePlate: car.licensePlate || "",
      year: car.year?.toString() || "",
      color: car.color || "",
      mileage: car.mileage?.toString() || "",
    });
    setExistingPhotos(car.photos || []);
    setUploadedPhotos([]);
    setIsEditModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedPhotos((prev) => [...prev, ...files]);
    }
  };

  const removeUploadedPhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoPath: string) => {
    if (!selectedCar) return;
    
    try {
      const pathParts = photoPath.split("/");
      const filename = pathParts[pathParts.length - 1];
      
      const response = await fetch(buildApiUrl(`/api/cars/${selectedCar.id}/photos/${encodeURIComponent(filename)}`), {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        setExistingPhotos((prev) => prev.filter((p) => p !== photoPath));
        queryClient.invalidateQueries({ queryKey: ["cars"] });
        toast({
          title: "Success",
          description: "Photo removed",
        });
      } else {
        throw new Error("Failed to delete photo");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove photo",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: CarFormData) => {
    if (selectedCar) {
      updateMutation.mutate({ id: selectedCar.id, data: { ...data, photos: uploadedPhotos } });
    } else {
      createMutation.mutate({ ...data, photos: uploadedPhotos });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Car On-boarding</h1>
          <p className="text-gray-400 mt-1">
            Manage registered vehicles and active fleet
          </p>
        </div>
        <Button
          onClick={handleAdd}
          className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Vehicle
        </Button>
      </div>

      <Card className="bg-[#111111] border-[#EAEB80]/20">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "registered" | "active")}>
            <TabsList className="bg-[#1a1a1a] border-b border-[#1a1a1a] rounded-none">
              <TabsTrigger
                value="registered"
                className="data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-[#EAEB80]"
              >
                Registered Cars
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-[#0a0a0a] data-[state=active]:text-[#EAEB80]"
              >
                Active Fleet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="registered" className="m-0">
              {isLoadingRegistered ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
                </div>
              ) : registeredCars.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No registered vehicles</p>
                  <p className="text-sm mt-2">Vehicles will appear here after clients sign contracts</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#1a1a1a]">
                        <TableHead className="text-gray-400">VIN</TableHead>
                        <TableHead className="text-gray-400">Make & Model</TableHead>
                        <TableHead className="text-gray-400">Year</TableHead>
                        <TableHead className="text-gray-400">Plate</TableHead>
                        <TableHead className="text-gray-400">Owner</TableHead>
                        <TableHead className="text-gray-400">Signed Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registeredCars.map((car) => (
                        <TableRow
                          key={car.id}
                          className="border-[#1a1a1a] hover:bg-[#1a1a1a]"
                        >
                          <TableCell className="text-white font-mono text-sm">
                            {car.vinNumber}
                          </TableCell>
                          <TableCell className="text-white">
                            {car.vehicleMake} {car.vehicleModel}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.vehicleYear}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.licensePlate || <span className="text-gray-500">N/A</span>}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {car.firstNameOwner} {car.lastNameOwner}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(car.contractSignedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="m-0">
              {isLoadingActive ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#EAEB80] animate-spin" />
                </div>
              ) : activeCars.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No active vehicles</p>
                  <p className="text-sm mt-2">Add your first vehicle to get started</p>
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
                              className="h-8 w-8 p-0 hover:bg-gray-800"
                              onClick={() => handleEdit(car)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-gray-400 hover:text-white" />
                            </Button>
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

      {/* Add/Edit Vehicle Modal */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedCar(null);
            form.reset();
            setUploadedPhotos([]);
            setExistingPhotos([]);
          }
        }}
      >
        <DialogContent className="bg-[#111111] border-[#EAEB80]/30 border-2 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedCar ? "Edit Vehicle" : "Add New Vehicle"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCar
                ? "Update vehicle information"
                : "Add a new vehicle to your fleet"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">VIN *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#0a0a0a] border-gray-700 text-white"
                          placeholder="1HGBH41JXMN109186"
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
                      <FormLabel className="text-white">Make & Model *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#0a0a0a] border-gray-700 text-white"
                          placeholder="2024 Mercedes S580"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licensePlate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">License Plate</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#0a0a0a] border-gray-700 text-white"
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
                      <FormLabel className="text-white">Year</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="bg-[#0a0a0a] border-gray-700 text-white"
                          placeholder="2024"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Color</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-[#0a0a0a] border-gray-700 text-white"
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
                      <FormLabel className="text-white">Current Mileage</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="bg-[#0a0a0a] border-gray-700 text-white"
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="text-white">Upload Photos (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {existingPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={buildApiUrl(`/${photo}`)}
                        alt={`Photo ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-700"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-0 right-0 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingPhoto(photo)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-gray-700"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-0 right-0 w-5 h-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeUploadedPhoto(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed border-gray-700 rounded flex items-center justify-center cursor-pointer hover:border-[#EAEB80] transition-colors">
                    <ImageIcon className="w-6 h-6 text-gray-500" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setSelectedCar(null);
                    form.reset();
                    setUploadedPhotos([]);
                    setExistingPhotos([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
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

