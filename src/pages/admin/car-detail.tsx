import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Car, Upload, X, Edit, Trash2, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import { CarDetailSkeleton } from "@/components/ui/skeletons";
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
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState<number | null>(null);

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

  // Reset carousel index when car changes or photos change
  useEffect(() => {
    if (car?.photos && car.photos.length > 0) {
      // Ensure carousel index is within bounds
      if (carouselIndex >= car.photos.length) {
        // If current index is out of bounds, go to last available photo
        setCarouselIndex(Math.max(0, car.photos.length - 1));
      }
      // If carousel index is 0 but there are photos, ensure it's valid
      if (carouselIndex < 0) {
        setCarouselIndex(0);
      }
    } else {
      // No photos available, reset to 0
      setCarouselIndex(0);
    }
  }, [car?.photos?.length, carouselIndex]);

  // Note: We no longer automatically deselect photos when carousel changes
  // Carousel navigation does not affect Photos card selection

  // Keyboard navigation for full screen image viewer
  useEffect(() => {
    if (fullScreenImageIndex === null || !car?.photos) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullScreenImageIndex(null);
      } else if (e.key === "ArrowLeft" && car.photos && car.photos.length > 1) {
        const prevIndex = (fullScreenImageIndex - 1 + car.photos.length) % car.photos.length;
        setFullScreenImageIndex(prevIndex);
      } else if (e.key === "ArrowRight" && car.photos && car.photos.length > 1) {
        const nextIndex = (fullScreenImageIndex + 1) % car.photos.length;
        setFullScreenImageIndex(nextIndex);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [fullScreenImageIndex, car?.photos]);

  // Auto-advance carousel every 3 seconds
  useEffect(() => {
    if (!car?.photos || car.photos.length <= 1 || isCarouselPaused) return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % car.photos!.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [car?.photos, carouselIndex, isCarouselPaused]);

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
      // Don't clear all selections here - selection management is handled in the onConfirm callback
      // Adjust carousel index if needed - will be handled by useEffect after data refresh
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const deleteMultiplePhotosMutation = useMutation({
    mutationFn: async (photoPaths: string[]) => {
      // Delete all selected photos sequentially to avoid race conditions
      // and ensure all deletions are processed correctly
      const results = [];
      const errors: string[] = [];
      
      for (const photoPath of photoPaths) {
        try {
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
            errors.push(`${filename}: ${error.error || "Failed to delete"}`);
          } else {
            const result = await response.json();
            results.push(result);
          }
        } catch (error: any) {
          const filename = photoPath.split("/").pop() || photoPath;
          errors.push(`${filename}: ${error.message || "Failed to delete"}`);
        }
      }
      
      // If any deletions failed, throw error with details
      if (errors.length > 0) {
        throw new Error(`Failed to delete some photos:\n${errors.join("\n")}`);
      }
      
      return { success: true, deletedCount: results.length };
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh car data
      queryClient.invalidateQueries({ queryKey: ["/api/cars", carId] });
      
      const deletedCount = variables.length;
      toast({
        title: "Success",
        description: `${deletedCount} photo(s) deleted successfully`,
      });
      
      // Clear all selections
      setSelectedPhotos(new Set());
      
      // Reset carousel index - will be adjusted by useEffect when car data refreshes
      // Set to 0 initially, useEffect will handle bounds checking
      setCarouselIndex(0);
      setIsCarouselPaused(false);
      
      // Close full screen viewer if open
      setFullScreenImageIndex(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photos",
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
      // Reset carousel to first image if no images were present before
      if (!car?.photos || car.photos.length === 0) {
        setCarouselIndex(0);
      }
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

  // Photo selection and deletion handlers
  const handleSelectPhoto = (index: number) => {
    if (!isAdmin) return;
    
    // Allow selecting any photo, including the carousel photo
    // The carousel photo will only be automatically deselected when "Select All" is clicked
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    if (!isAdmin || !car?.photos) return;
    
    // Check if all photos are already selected
    const allIndices = car.photos.map((_, index) => index);
    const allSelected = allIndices.length > 0 && allIndices.every(index => selectedPhotos.has(index));
    
    if (allSelected && selectedPhotos.size === allIndices.length) {
      // Deselect all
      setSelectedPhotos(new Set());
    } else {
      // Select all photos including the one currently displayed in the carousel
      setSelectedPhotos(new Set(allIndices));
    }
  };

  const handleDeleteSelected = () => {
    if (!isAdmin || !car?.photos || selectedPhotos.size === 0) return;
    
    // Get photo paths from selected indices
    const selectedIndices = Array.from(selectedPhotos);
    const photoPaths = selectedIndices.map(index => car.photos![index]).filter(Boolean);
    
    if (photoPaths.length === 0) {
      toast({
        title: "Error",
        description: "No valid photos selected",
        variant: "destructive",
      });
      return;
    }
    
    // Delete all selected photos (even if currently displayed in carousel)
    deleteMultiplePhotosMutation.mutate(photoPaths);
  };

  // Carousel navigation handlers
  // Note: Carousel navigation does not affect Photos card selection
  const handleCarouselNext = () => {
    if (!car?.photos || car.photos.length === 0) return;
    setIsCarouselPaused(true);
    const nextIndex = (carouselIndex + 1) % car.photos!.length;
    setCarouselIndex(nextIndex);
    // Resume auto-advance after 5 seconds
    setTimeout(() => setIsCarouselPaused(false), 5000);
  };

  const handleCarouselPrev = () => {
    if (!car?.photos || car.photos.length === 0) return;
    setIsCarouselPaused(true);
    const prevIndex = (carouselIndex - 1 + car.photos!.length) % car.photos!.length;
    setCarouselIndex(prevIndex);
    // Resume auto-advance after 5 seconds
    setTimeout(() => setIsCarouselPaused(false), 5000);
  };

  const handleCarouselGoTo = (index: number) => {
    if (!car?.photos || car.photos.length === 0) return;
    setIsCarouselPaused(true);
    setCarouselIndex(index);
    // Resume auto-advance after 5 seconds
    setTimeout(() => setIsCarouselPaused(false), 5000);
  };

  // Keyboard navigation for carousel
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!car?.photos || car.photos.length === 0) return;
      if (e.key === "ArrowLeft") {
        setCarouselIndex((prev) => (prev - 1 + car.photos!.length) % car.photos!.length);
      } else if (e.key === "ArrowRight") {
        setCarouselIndex((prev) => (prev + 1) % car.photos!.length);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [car?.photos]);

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
        <CarDetailSkeleton />
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Specifications Card - Increased by 1 column (4 + 1 = 5 columns) */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] flex items-center gap-2">
                <Car className="w-5 h-5" />
                Specifications
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
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
                <div className="pt-1.5 border-t border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
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
                  <div className="pt-1.5 border-t border-[#2a2a2a]">
                    <p className="text-xs text-gray-500 mb-0.5">Off-boarded</p>
                    <p className="text-white text-sm">
                      {formatDate(car.offboardAt)}
                    </p>
                    {car.offboardReason && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Reason: {car.offboardReason.replace("_", " ")}
                      </p>
                    )}
                    {car.offboardNote && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        Note: {car.offboardNote}
                      </p>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Timestamps Card - Increased by 1 column (2 + 1 = 3 columns) */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-white">
                  {formatDate(car.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                <p className="text-white">
                  {formatDate(car.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Car Photos Carousel Card - Reduced by 1/5 (6 * 4/5 = 4.8 ≈ 5 columns) */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-4 h-full">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] flex items-center gap-2">
                <Car className="w-5 h-5" />
                Car Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {car.photos && car.photos.length > 0 ? (
                <div className="space-y-4">
                    {/* Main Carousel Display - Reduced height by 1/5 (333 * 4/5 = 266px) */}
                    <div className="relative w-full h-[266px] bg-black rounded-lg overflow-hidden border border-[#2a2a2a]">
                    {car.photos.map((photo, index) => {
                      const photoUrl = buildApiUrl(photo.startsWith('/') ? photo : `/${photo}`);
                      const isActive = index === carouselIndex;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "absolute inset-0 transition-all duration-500 ease-in-out px-6",
                            isActive ? "opacity-100 z-10" : "opacity-0 z-0"
                          )}
                        >
                          <img
                            src={photoUrl}
                            alt={`Car photo ${index + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              console.error('Failed to load photo:', photoUrl);
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      );
                    })}
                    
                    {/* Navigation Controls - Bottom Center */}
                    {car.photos.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
                        {/* Previous Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCarouselPrev}
                          className="h-9 w-9 bg-black/70 hover:bg-black/90 text-white border border-white/30 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        
                        {/* Image Counter */}
                        <div className="bg-black/70 px-4 py-2 rounded-full border border-white/30 shadow-lg backdrop-blur-sm">
                          <span className="text-white text-sm font-medium">
                            {carouselIndex + 1} / {car.photos.length}
                          </span>
                        </div>
                        
                        {/* Next Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCarouselNext}
                          className="h-9 w-9 bg-black/70 hover:bg-black/90 text-white border border-white/30 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Circular Indicator Dots */}
                  {car.photos.length > 1 && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {car.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => handleCarouselGoTo(index)}
                          className={cn(
                            "w-3 h-3 rounded-full transition-all duration-300",
                            index === carouselIndex
                              ? "bg-[#EAEB80] w-8"
                              : "bg-gray-600 hover:bg-gray-500"
                          )}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                ) : (
                  <div className="flex items-center justify-center h-[266px] bg-black/20 rounded-lg border border-[#2a2a2a]">
                    <p className="text-gray-400 text-center">
                      No photos available
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Photos Grid - 8 columns per row (up to 20 images) */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#EAEB80] flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Photos ({car.photos?.length || 0} / 20)
              </CardTitle>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {selectedPhotos.size > 0 && (
                    <>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="outline"
                            disabled={deleteMultiplePhotosMutation.isPending}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                          >
                            {deleteMultiplePhotosMutation.isPending ? (
                              <>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Selected ({selectedPhotos.size})
                              </>
                            )}
                          </Button>
                        }
                        title="Delete Selected Photos"
                        description={`Are you sure you want to delete ${selectedPhotos.size} photo(s)? This action cannot be undone. Photos will be deleted from both the interface and storage.`}
                        confirmText="Delete"
                        cancelText="Cancel"
                        variant="destructive"
                        onConfirm={handleDeleteSelected}
                      />
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedPhotos(new Set())}
                        className="text-gray-400 hover:text-white"
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                  {car.photos && car.photos.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      className="border-[#EAEB80]/50 text-[#EAEB80] hover:bg-[#EAEB80]/10"
                    >
                      {(() => {
                        // Check if all photos are selected
                        const allIndices = car.photos.map((_, index) => index);
                        const allSelected = allIndices.length > 0 && 
                          allIndices.every(index => selectedPhotos.has(index)) &&
                          selectedPhotos.size === allIndices.length;
                        
                        return allSelected ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Deselect All
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Select All
                          </>
                        );
                      })()}
                    </Button>
                  )}
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
              <div className="grid grid-cols-8 gap-4">
                {car.photos.map((photo, index) => {
                  const photoUrl = buildApiUrl(photo.startsWith('/') ? photo : `/${photo}`);
                  const isSelected = selectedPhotos.has(index);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative group",
                        isSelected && "ring-2 ring-[#EAEB80] rounded-lg",
                        // Removed carousel sync indicator - carousel and Photos card are independent
                      )}
                      onClick={(e) => {
                        // Only handle selection if clicking checkbox area or button
                        // Otherwise, open full screen view
                        const target = e.target as HTMLElement;
                        if (isAdmin && (target.closest('.checkbox-area') || target.closest('button'))) {
                          handleSelectPhoto(index);
                        } else {
                          // Open full screen view when clicking on the image
                          setFullScreenImageIndex(index);
                        }
                      }}
                    >
                      <div className="relative aspect-square">
                        <img
                          src={photoUrl}
                          alt={`Car photo ${index + 1}`}
                          className={cn(
                            "w-full h-full object-cover rounded-lg border transition-all",
                            isSelected
                              ? "border-[#EAEB80] opacity-80"
                              : "border-[#2a2a2a] group-hover:border-[#EAEB80]/50"
                          )}
                          onError={(e) => {
                            console.error('Failed to load photo:', photoUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {/* Checkbox Overlay */}
                        {isAdmin && (
                          <div 
                            className="absolute top-2 left-2 z-10 checkbox-area"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPhoto(index);
                              }}
                              className={cn(
                                "w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
                                isSelected
                                  ? "bg-[#EAEB80] border-[#EAEB80] hover:bg-[#d4d570]"
                                  : "bg-black/50 border-white/50 hover:border-white hover:bg-black/70"
                              )}
                            >
                              {isSelected && (
                                <CheckSquare className="w-4 h-4 text-black" />
                              )}
                            </button>
                          </div>
                        )}
                        {/* Delete Button (Admin only, single delete) */}
                        {isAdmin && (
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 hover:bg-red-500 text-white z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            }
                            title="Delete Photo"
                            description={`Are you sure you want to delete this photo? This will only delete the selected photo, not all selected photos.`}
                            confirmText="Delete"
                            cancelText="Cancel"
                            variant="destructive"
                            onConfirm={() => {
                              // Capture the photo path and index in the closure
                              const photoToDelete = photo;
                              const photoIndex = index;
                              
                              // Delete only this specific photo
                              deletePhotoMutation.mutate(photoToDelete, {
                                onSuccess: () => {
                                  // Remove from selection if it was selected
                                  if (selectedPhotos.has(photoIndex)) {
                                    const newSelected = new Set(selectedPhotos);
                                    newSelected.delete(photoIndex);
                                    setSelectedPhotos(newSelected);
                                  }
                                }
                              });
                            }}
                          />
                        )}
                        {/* Image Number Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-gray-400 text-center">
                  No photos uploaded. {isAdmin && "Upload photos to get started."}
                </p>
              </div>
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
                    {updateMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}

        {/* Full Screen Image Viewer */}
        {fullScreenImageIndex !== null && car?.photos && car.photos[fullScreenImageIndex] && (
          <Dialog open={fullScreenImageIndex !== null} onOpenChange={(open) => !open && setFullScreenImageIndex(null)}>
            <DialogContent className="bg-black/98 border-none p-0 max-w-[100vw] max-h-[100vh] w-full h-full m-0 rounded-none overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Close Button - Top Right */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFullScreenImageIndex(null)}
                  className="absolute top-4 right-4 z-[100] bg-black/80 hover:bg-black/95 text-white border-2 border-white/40 rounded-full h-12 w-12 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:border-white/60"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </Button>
                
                {/* Navigation Buttons - Only show if more than one photo */}
                {car.photos.length > 1 && (
                  <>
                    {/* Previous Button - Left Center */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIndex = (fullScreenImageIndex - 1 + car.photos!.length) % car.photos!.length;
                        setFullScreenImageIndex(prevIndex);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-[90] bg-black/80 hover:bg-black/95 text-white border-2 border-white/40 rounded-full h-16 w-16 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:border-white/60"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    
                    {/* Next Button - Right Center */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = (fullScreenImageIndex + 1) % car.photos!.length;
                        setFullScreenImageIndex(nextIndex);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-[90] bg-black/80 hover:bg-black/95 text-white border-2 border-white/40 rounded-full h-16 w-16 shadow-2xl backdrop-blur-sm transition-all hover:scale-110 hover:border-white/60"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                  </>
                )}

                {/* Image Counter - Bottom Center */}
                {car.photos.length > 1 && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/40 shadow-2xl">
                    <span className="text-white text-base font-semibold tracking-wide">
                      {fullScreenImageIndex + 1} / {car.photos.length}
                    </span>
                  </div>
                )}

                {/* Full Screen Image - High Resolution Display */}
                {car.photos && car.photos[fullScreenImageIndex] && (
                  <img
                    src={buildApiUrl(car.photos[fullScreenImageIndex].startsWith('/') ? car.photos[fullScreenImageIndex] : `/${car.photos[fullScreenImageIndex]}`)}
                    alt={`Car photo ${fullScreenImageIndex + 1}`}
                    className="w-full h-full object-contain z-10"
                    style={{
                      maxWidth: '100vw',
                      maxHeight: '100vh',
                    }}
                    onError={(e) => {
                      console.error('Failed to load photo:', car.photos?.[fullScreenImageIndex]);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminLayout>
  );
}
