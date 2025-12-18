import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Car, Upload, X, Loader2, Edit, Trash2 } from "lucide-react";
import { buildApiUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

interface CarDetail {
  id: number;
  vin: string;
  makeModel: string;
  licensePlate?: string;
  year?: number;
  color?: string;
  mileage: number;
  status: "available" | "in_use" | "maintenance" | "off_fleet";
  offboardReason?: "sold" | "damaged" | "end_lease" | "other" | null;
  offboardNote?: string | null;
  offboardAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userId?: number | null;
  clientId?: number | null;
  owner?: {
    firstName: string;
    lastName: string;
    email: string | null;
  } | null;
  photos?: string[];
}

const carSchema = z.object({
  vin: z
    .string()
    .min(1, "VIN is required")
    .max(17, "VIN must be 17 characters or less"),
  makeModel: z.string().min(1, "Make & Model is required"),
  licensePlate: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  mileage: z.string().optional(),
});

type CarFormData = z.infer<typeof carSchema>;

export default function CarDetailPage() {
  const [, params] = useRoute("/admin/cars/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const carId = params?.id ? parseInt(params.id, 10) : null;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Get current user to check if admin
  const { data: userData } = useQuery<{
    user?: {
      isAdmin?: boolean;
    };
  }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const isAdmin = userData?.user?.isAdmin === true;

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

  const updateMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const formData = new FormData();
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);

      const response = await fetch(buildApiUrl(`/api/cars/${carId}`), {
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
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({
        title: "Success",
        description: "Car updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update car",
        variant: "destructive",
      });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoPath: string) => {
      // Extract filename from path (e.g., "car-photos/1/filename.jpg" -> "filename.jpg")
      const filename = photoPath.split("/").pop() || photoPath;
      const response = await fetch(
        buildApiUrl(
          `/api/cars/${carId}/photos/${encodeURIComponent(filename)}`
        ),
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete photo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId] });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check photo count limit
    const currentPhotoCount = car?.photos?.length || 0;
    if (currentPhotoCount + files.length > 20) {
      toast({
        title: "Error",
        description: `Maximum 20 photos allowed. Current: ${currentPhotoCount}, Trying to add: ${files.length}`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("photos", file);
      });

      const response = await fetch(buildApiUrl(`/api/cars/${carId}/photos`), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photos");
      }

      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId] });
      toast({
        title: "Success",
        description: result.message || "Photos uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
      e.target.value = "";
    }
  };

  const handleEditClick = () => {
    if (!car) return;
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

  const onSubmit = (data: CarFormData) => {
    updateMutation.mutate(data);
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#EAEB80]" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !car) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-red-400 mb-4">Failed to load car details</p>
          <Button
            onClick={() => setLocation("/admin/cars")}
            className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cars
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/admin/cars")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-serif text-[#EAEB80] italic">
                {car.makeModel}
              </h1>
              <p className="text-gray-400 text-sm">Car Details</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={handleEditClick}
              className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Car Specifications */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] flex items-center gap-2">
                <Car className="w-5 h-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">VIN</p>
                  <p className="text-white font-mono">{car.vin}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Make & Model</p>
                  <p className="text-white">{car.makeModel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Year</p>
                  <p className="text-white">{car.year || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Color</p>
                  <p className="text-white">{car.color || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">License Plate</p>
                  <p className="text-white">{car.licensePlate || "N/A"}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(car.status)}
                    >
                      {car.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  {car.owner && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                      {car.clientId ? (
                        <button
                          onClick={() => setLocation(`/admin/clients/${car.clientId}`)}
                          className="text-left hover:text-[#EAEB80] transition-colors"
                        >
                          <p className="text-white text-sm hover:underline">
                            {car.owner.firstName} {car.owner.lastName}
                          </p>
                          {car.owner.email && (
                            <p className="text-gray-400 text-xs hover:text-[#EAEB80]">
                              {car.owner.email}
                            </p>
                          )}
                        </button>
                      ) : (
                        <>
                          <p className="text-white text-sm">
                            {car.owner.firstName} {car.owner.lastName}
                          </p>
                          {car.owner.email && (
                            <p className="text-gray-400 text-xs">
                              {car.owner.email}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {car.offboardAt && (
                <div className="pt-4 border-t border-[#2a2a2a]">
                  <p className="text-xs text-gray-500 mb-1">Off-boarded</p>
                  <p className="text-white text-sm">
                    {formatDate(car.offboardAt)}
                  </p>
                  {car.offboardReason && (
                    <p className="text-gray-400 text-xs mt-1">
                      Reason: {car.offboardReason.replace("_", " ")}
                    </p>
                  )}
                  {car.offboardNote && (
                    <p className="text-gray-400 text-xs mt-1">
                      Note: {car.offboardNote}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-white text-sm">
                  {formatDate(car.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                <p className="text-white text-sm">
                  {formatDate(car.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photos */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#EAEB80] flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Photos ({car.photos?.length || 0})
              </CardTitle>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    asChild
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570]"
                    disabled={uploadingPhotos}
                  >
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      {uploadingPhotos ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photos
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {car.photos && car.photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {car.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo.startsWith('/') ? photo : `/${photo}`}
                      alt={`Car photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-[#2a2a2a]"
                      onError={(e) => {
                        console.error('Failed to load photo:', photo);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {isAdmin && (
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        }
                        title="Delete Photo"
                        description="Are you sure you want to delete this photo?"
                        confirmText="Delete"
                        cancelText="Cancel"
                        variant="destructive"
                        onConfirm={() => deletePhotoMutation.mutate(photo)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No photos uploaded
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rental History - Placeholder */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-[#EAEB80]">Rental History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-center py-8">
              Rental history tracking coming soon
            </p>
          </CardContent>
        </Card>

        {/* Edit Modal - Only for admins */}
        {isAdmin && (
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Edit Car
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Update car information
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
                        <FormLabel className="text-gray-400">
                          License Plate
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
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
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#EAEB80] text-black hover:bg-[#d4d570] font-medium"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Update
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
