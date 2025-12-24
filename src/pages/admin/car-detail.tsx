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
  // Vehicle Information
  vin: z
    .string()
    .min(1, "VIN is required")
    .max(17, "VIN must be 17 characters or less"),
  makeModel: z.string().min(1, "Make & Model is required"),
  licensePlate: z.string().optional(),
  year: z.string().optional(),
  color: z.string().optional(),
  mileage: z.string().optional(),
  // Financial Information
  purchasePrice: z.string().optional(),
  downPayment: z.string().optional(),
  monthlyPayment: z.string().optional(),
  interestRate: z.string().optional(),
  transportCityToCity: z.string().optional(),
  ultimateGoal: z.string().optional(),
  // Insurance Information
  insuranceProvider: z.string().optional(),
  insurancePhone: z.string().optional(),
  policyNumber: z.string().optional(),
  insuranceExpiration: z.string().optional(),
  // Additional Information
  carManufacturerWebsite: z.string().optional(),
  carManufacturerUsername: z.string().optional(),
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
  const [fullScreenDocument, setFullScreenDocument] = useState<{ url: string; type: 'insurance' | 'license'; index?: number } | null>(null);

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

  // Fetch onboarding data for financial, insurance, and additional information
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/clients", car?.clientId, "onboarding"],
    queryFn: async () => {
      if (!car?.clientId) throw new Error("No client ID");
      const url = buildApiUrl(`/api/clients/${car.clientId}/onboarding`);
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Return null if no onboarding found (404) instead of throwing
        if (response.status === 404) {
          return { success: false, data: null };
        }
        throw new Error(errorData.error || `Failed to fetch onboarding: ${response.statusText}`);
      }
      const result = await response.json();
      return result;
    },
    enabled: !!car?.clientId,
    retry: false,
  });

  const onboarding = onboardingData?.success ? onboardingData?.data : null;

  // Helper functions
  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }
    return String(value);
  };

  const formatCurrency = (value: string | null | undefined): string => {
    if (!value) return "Not provided";
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return `$${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

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

  // Keyboard navigation for full screen document viewer
  useEffect(() => {
    if (fullScreenDocument === null || !onboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullScreenDocument.type === 'license' && 
          onboarding.driversLicenseUrls && 
          Array.isArray(onboarding.driversLicenseUrls) && 
          onboarding.driversLicenseUrls.length > 1 && 
          fullScreenDocument.index !== undefined) {
        if (e.key === 'ArrowLeft' && fullScreenDocument.index > 0) {
          const prevIndex = fullScreenDocument.index - 1;
          const prevUrl = onboarding.driversLicenseUrls[prevIndex];
          const imageUrl = prevUrl.startsWith('http') ? prevUrl : buildApiUrl(prevUrl);
          setFullScreenDocument({ 
            url: imageUrl, 
            type: 'license', 
            index: prevIndex 
          });
        } else if (e.key === 'ArrowRight' && fullScreenDocument.index < onboarding.driversLicenseUrls.length - 1) {
          const nextIndex = fullScreenDocument.index + 1;
          const nextUrl = onboarding.driversLicenseUrls[nextIndex];
          const imageUrl = nextUrl.startsWith('http') ? nextUrl : buildApiUrl(nextUrl);
          setFullScreenDocument({ 
            url: imageUrl, 
            type: 'license', 
            index: nextIndex 
          });
        }
      }
      
      if (e.key === 'Escape') {
        setFullScreenDocument(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullScreenDocument, onboarding]);

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
      purchasePrice: "",
      downPayment: "",
      monthlyPayment: "",
      interestRate: "",
      transportCityToCity: "",
      ultimateGoal: "",
      insuranceProvider: "",
      insurancePhone: "",
      policyNumber: "",
      insuranceExpiration: "",
      carManufacturerWebsite: "",
      carManufacturerUsername: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const formData = new FormData();
      // Vehicle Information
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      if (data.licensePlate) formData.append("licensePlate", data.licensePlate);
      if (data.year) formData.append("year", data.year);
      if (data.color) formData.append("color", data.color);
      if (data.mileage) formData.append("mileage", data.mileage);
      // Financial Information
      if (data.purchasePrice !== undefined) formData.append("purchasePrice", data.purchasePrice || "");
      if (data.downPayment !== undefined) formData.append("downPayment", data.downPayment || "");
      if (data.monthlyPayment !== undefined) formData.append("monthlyPayment", data.monthlyPayment || "");
      if (data.interestRate !== undefined) formData.append("interestRate", data.interestRate || "");
      if (data.transportCityToCity !== undefined) formData.append("transportCityToCity", data.transportCityToCity || "");
      if (data.ultimateGoal !== undefined) formData.append("ultimateGoal", data.ultimateGoal || "");
      // Insurance Information
      if (data.insuranceProvider !== undefined) formData.append("insuranceProvider", data.insuranceProvider || "");
      if (data.insurancePhone !== undefined) formData.append("insurancePhone", data.insurancePhone || "");
      if (data.policyNumber !== undefined) formData.append("policyNumber", data.policyNumber || "");
      if (data.insuranceExpiration !== undefined) formData.append("insuranceExpiration", data.insuranceExpiration || "");
      // Additional Information
      if (data.carManufacturerWebsite !== undefined) formData.append("carManufacturerWebsite", data.carManufacturerWebsite || "");
      if (data.carManufacturerUsername !== undefined) formData.append("carManufacturerUsername", data.carManufacturerUsername || "");

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
    onSuccess: async () => {
      // Refetch both car and onboarding data to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ["/api/cars", carId] });
      if (car?.clientId) {
        await queryClient.refetchQueries({ queryKey: ["/api/clients", car.clientId, "onboarding"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] }); // For the cars list page
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      toast({
        title: "Success",
        description: "Car information updated successfully",
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
      // Financial Information
      purchasePrice: onboarding?.purchasePrice || "",
      downPayment: onboarding?.downPayment || "",
      monthlyPayment: onboarding?.monthlyPayment || "",
      interestRate: onboarding?.interestRate || "",
      transportCityToCity: onboarding?.transportCityToCity || "",
      ultimateGoal: onboarding?.ultimateGoal || "",
      // Insurance Information
      insuranceProvider: onboarding?.insuranceProvider || "",
      insurancePhone: onboarding?.insurancePhone || "",
      policyNumber: onboarding?.policyNumber || "",
      insuranceExpiration: onboarding?.insuranceExpiration || "",
      // Additional Information
      carManufacturerWebsite: onboarding?.carManufacturerWebsite || "",
      carManufacturerUsername: onboarding?.carManufacturerUsername || "",
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

        {/* Row 1: Vehicle Information, Financial Information, Insurance Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Vehicle Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">VIN</p>
                    <p className="text-white text-base font-mono">{car.vin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Make & Model</p>
                    <p className="text-white text-base">{car.makeModel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Year</p>
                    <p className="text-white text-base">{car.year || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Color</p>
                    <p className="text-white text-base">{car.color || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">License Plate</p>
                    <p className="text-white text-base">{car.licensePlate || "N/A"}</p>
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
                          <p className="text-white text-base hover:underline">
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
                          <p className="text-white text-base">
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
                    <p className="text-white text-base">
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

          {/* Financial Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingOnboarding ? (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : onboarding ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                    <p className="text-white text-base">{formatCurrency(onboarding.purchasePrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Down Payment</p>
                    <p className="text-white text-base">{formatCurrency(onboarding.downPayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Monthly Payment</p>
                    <p className="text-white text-base">{formatCurrency(onboarding.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                    <p className="text-white text-base">{formatValue(onboarding.interestRate)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transport City to City</p>
                    <p className="text-white text-base">{formatValue(onboarding.transportCityToCity)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ultimate Goal</p>
                    <p className="text-white text-base">{formatValue(onboarding.ultimateGoal)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">No financial information available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Insurance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingOnboarding ? (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : onboarding ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Provider</p>
                    <p className="text-white text-base">{formatValue(onboarding.insuranceProvider)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-white text-base">{formatValue(onboarding.insurancePhone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Policy Number</p>
                    <p className="text-white text-base font-mono">{formatValue(onboarding.policyNumber)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Expiration</p>
                    <p className="text-white text-base">{formatValue(onboarding.insuranceExpiration)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">No insurance information available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Additional Information, Timestamps, Car Photos Carousel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Additional Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingOnboarding ? (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : onboarding ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {onboarding.carManufacturerWebsite && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Car Manufacturer Website</p>
                      <p className="text-white text-base break-all">
                        <a
                          href={onboarding.carManufacturerWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#EAEB80] hover:underline"
                        >
                          {formatValue(onboarding.carManufacturerWebsite)}
                        </a>
                      </p>
                    </div>
                  )}
                  {onboarding.carManufacturerUsername && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Manufacturer Username</p>
                      <p className="text-white text-base">{formatValue(onboarding.carManufacturerUsername)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">No additional information available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p className="text-white text-base">
                  {formatDate(car.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                <p className="text-white text-base">
                  {formatDate(car.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Car Photos Carousel Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-5 h-full">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
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
                      // For static assets like car photos, use the path directly without buildApiUrl
                      // buildApiUrl is for API endpoints, not static files
                      const photoUrl = photo.startsWith('/') ? photo : `/${photo}`;
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

        {/* Row 3: Documents (Insurance Card & Driver's License) */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-[#EAEB80] text-lg">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOnboarding ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Loading documents...</p>
              </div>
            ) : onboarding ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Insurance Card */}
                <div>
                  <h4 className="text-base font-semibold text-gray-200 mb-4">Insurance Card</h4>
                  {onboarding.insuranceCardUrl ? (
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => {
                        const imageUrl = onboarding.insuranceCardUrl.startsWith('http') 
                          ? onboarding.insuranceCardUrl 
                          : buildApiUrl(onboarding.insuranceCardUrl);
                        setFullScreenDocument({ url: imageUrl, type: 'insurance' });
                      }}
                    >
                      <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 border-[#EAEB80]/30 hover:border-[#EAEB80] transition-all overflow-hidden shadow-lg hover:shadow-[#EAEB80]/20">
                        <img
                          src={onboarding.insuranceCardUrl.startsWith('http') 
                            ? onboarding.insuranceCardUrl 
                            : buildApiUrl(onboarding.insuranceCardUrl)}
                          alt="Insurance Card"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            console.error('Failed to load insurance card image:', onboarding.insuranceCardUrl);
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement?.parentElement;
                            if (parent && !parent.querySelector(".error-message")) {
                              const errorDiv = document.createElement("div");
                              errorDiv.className = "error-message text-sm text-gray-500 absolute inset-0 flex items-center justify-center";
                              errorDiv.textContent = "Failed to load image";
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                            Click to view full screen
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border border-gray-700 flex items-center justify-center">
                      <p className="text-sm text-gray-500">No insurance card uploaded</p>
                    </div>
                  )}
                </div>

                {/* Drivers License */}
                <div>
                  <h4 className="text-base font-semibold text-gray-200 mb-4">Drivers License</h4>
                  {onboarding.driversLicenseUrls && Array.isArray(onboarding.driversLicenseUrls) && onboarding.driversLicenseUrls.length > 0 ? (
                    <div className="space-y-4">
                      {onboarding.driversLicenseUrls.map((url: string, index: number) => {
                        const imageUrl = url.startsWith('http') ? url : buildApiUrl(url);
                        return (
                          <div 
                            key={index}
                            className="relative group cursor-pointer"
                            onClick={() => setFullScreenDocument({ url: imageUrl, type: 'license', index })}
                          >
                            <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 border-[#EAEB80]/30 hover:border-[#EAEB80] transition-all overflow-hidden shadow-lg hover:shadow-[#EAEB80]/20">
                              <img
                                src={imageUrl}
                                alt={`Drivers License ${index + 1}`}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  console.error('Failed to load drivers license image:', url);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement?.parentElement;
                                  if (parent && !parent.querySelector(".error-message")) {
                                    const errorDiv = document.createElement("div");
                                    errorDiv.className = "error-message text-sm text-gray-500 absolute inset-0 flex items-center justify-center";
                                    errorDiv.textContent = "Failed to load image";
                                    parent.appendChild(errorDiv);
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                  Click to view full screen
                                </div>
                              </div>
                            </div>
                            {onboarding.driversLicenseUrls.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                {index + 1} / {onboarding.driversLicenseUrls.length}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border border-gray-700 flex items-center justify-center">
                      <p className="text-sm text-gray-500">No drivers license uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No documents available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos Grid - 8 columns per row (up to 20 images) */}
        <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
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
                  // For static assets like car photos, use the path directly without buildApiUrl
                  // buildApiUrl is for API endpoints, not static files
                  const photoUrl = photo.startsWith('/') ? photo : `/${photo}`;
                  const isSelected = selectedPhotos.has(index);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative group",
                        isSelected && "ring-2 ring-[#EAEB80] rounded-lg",
                        // Removed carousel sync indicator - carousel and Photos card are independent
                        isAdmin && "cursor-pointer"
                      )}
                      onClick={(e) => {
                        // Only select if admin and not clicking on checkbox or delete button
                        if (isAdmin) {
                          const target = e.target as HTMLElement;
                          if (!target.closest('.checkbox-area') && !target.closest('button')) {
                            handleSelectPhoto(index);
                          }
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
                          <div 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ConfirmDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="bg-red-500/80 hover:bg-red-500 text-white"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              }
                              title="Delete Photo"
                              description={`Are you sure you want to delete this photo? This action cannot be undone.`}
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
                                    // Adjust carousel index if needed
                                    if (car.photos && carouselIndex >= car.photos.length - 1) {
                                      setCarouselIndex(Math.max(0, car.photos.length - 2));
                                    }
                                  }
                                });
                              }}
                            />
                          </div>
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
            <CardTitle className="text-[#EAEB80] text-lg">Rental History</CardTitle>
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
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Edit Car Information
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Update vehicle, financial, insurance, and additional information
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 mt-4"
              >
                {/* Vehicle Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Vehicle Information
                  </h3>
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

                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Mileage</FormLabel>
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
                </div>

                {/* Financial Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Purchase Price</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Down Payment</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthlyPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Monthly Payment</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Interest Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transportCityToCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Transport City to City</FormLabel>
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
                      name="ultimateGoal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Ultimate Goal</FormLabel>
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
                </div>

                {/* Insurance Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Insurance Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insuranceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Provider</FormLabel>
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
                      name="insurancePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Policy Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80] font-mono"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insuranceExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Expiration</FormLabel>
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
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="carManufacturerWebsite"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Car Manufacturer Website</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="url"
                              placeholder="https://example.com"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carManufacturerUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Manufacturer Username</FormLabel>
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
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
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
          <div 
            className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center"
            onClick={() => setFullScreenImageIndex(null)}
          >
            {/* Close Button - Top Right */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenImageIndex(null);
              }}
              className="fixed top-6 right-6 z-[200] h-12 w-12 bg-black/90 hover:bg-red-600/90 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
              aria-label="Close full screen view"
            >
              <X className="w-7 h-7" />
            </Button>

            <div className="relative w-full h-full flex items-center justify-center">

              {/* Image Counter - Bottom Center */}
              {car.photos.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[101] bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/40 shadow-2xl">
                  <span className="text-white text-base font-semibold tracking-wide">
                    {fullScreenImageIndex + 1} / {car.photos.length}
                  </span>
                </div>
              )}

              {/* Full Screen Image - High Resolution Display */}
              {car.photos && car.photos[fullScreenImageIndex] && (
                <img
                  src={car.photos[fullScreenImageIndex].startsWith('/') ? car.photos[fullScreenImageIndex] : `/${car.photos[fullScreenImageIndex]}`}
                  alt={`Car photo ${fullScreenImageIndex + 1}`}
                  className="w-full h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
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
          </div>
        )}

        {/* Full Screen Document Viewer Dialog */}
        {fullScreenDocument && (
          <div 
            className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center"
            onClick={() => setFullScreenDocument(null)}
          >
            {/* Close Button - Top Right */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenDocument(null);
              }}
              className="fixed top-6 right-6 z-[200] h-12 w-12 bg-black/90 hover:bg-red-600/90 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
              aria-label="Close full screen view"
            >
              <X className="w-7 h-7" />
            </Button>

            <div className="relative w-full h-full flex items-center justify-center p-8">
              {/* Image Counter - Bottom Center (for multiple drivers licenses) */}
              {fullScreenDocument.type === 'license' && 
               onboarding?.driversLicenseUrls && 
               Array.isArray(onboarding.driversLicenseUrls) && 
               onboarding.driversLicenseUrls.length > 1 && 
               fullScreenDocument.index !== undefined && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[101] bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/40 shadow-2xl">
                  <span className="text-white text-base font-semibold tracking-wide">
                    {fullScreenDocument.index + 1} / {onboarding.driversLicenseUrls.length}
                  </span>
                </div>
              )}

              {/* Navigation Buttons (for multiple drivers licenses) */}
              {fullScreenDocument.type === 'license' && 
               onboarding?.driversLicenseUrls && 
               Array.isArray(onboarding.driversLicenseUrls) && 
               onboarding.driversLicenseUrls.length > 1 && 
               fullScreenDocument.index !== undefined && (
                <>
                  {/* Previous Button */}
                  {fullScreenDocument.index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const prevIndex = fullScreenDocument.index! - 1;
                        const prevUrl = onboarding.driversLicenseUrls[prevIndex];
                        const imageUrl = prevUrl.startsWith('http') ? prevUrl : buildApiUrl(prevUrl);
                        setFullScreenDocument({ 
                          url: imageUrl, 
                          type: 'license', 
                          index: prevIndex 
                        });
                      }}
                      className="fixed left-6 top-1/2 -translate-y-1/2 z-[200] h-14 w-14 bg-black/90 hover:bg-[#EAEB80]/20 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}

                  {/* Next Button */}
                  {fullScreenDocument.index < onboarding.driversLicenseUrls.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = fullScreenDocument.index! + 1;
                        const nextUrl = onboarding.driversLicenseUrls[nextIndex];
                        const imageUrl = nextUrl.startsWith('http') ? nextUrl : buildApiUrl(nextUrl);
                        setFullScreenDocument({ 
                          url: imageUrl, 
                          type: 'license', 
                          index: nextIndex 
                        });
                      }}
                      className="fixed right-6 top-1/2 -translate-y-1/2 z-[200] h-14 w-14 bg-black/90 hover:bg-[#EAEB80]/20 text-white border-2 border-white/60 rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                </>
              )}

              {/* Full Screen Image - High Resolution Display */}
              <img
                src={fullScreenDocument.url}
                alt={fullScreenDocument.type === 'insurance' ? 'Insurance Card' : `Drivers License ${fullScreenDocument.index !== undefined ? fullScreenDocument.index + 1 : ''}`}
                className="w-full h-full object-contain"
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                }}
                onError={(e) => {
                  console.error('Failed to load image in full screen viewer:', fullScreenDocument.url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
