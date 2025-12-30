import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Car, Upload, X, Edit, Trash2, ChevronLeft, ChevronRight, CheckSquare, Square, FileText } from "lucide-react";
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
  status: "ACTIVE" | "INACTIVE";
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
  turoLink?: string | null;
  adminTuroLink?: string | null;
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
  // Extended Vehicle Information
  vehicleTrim: z.string().optional(),
  interiorColor: z.string().optional(),
  registrationExpiration: z.string().optional(),
  vehicleRecall: z.string().optional(),
  numberOfSeats: z.string().optional(),
  numberOfDoors: z.string().optional(),
  skiRacks: z.string().optional(),
  skiCrossBars: z.string().optional(),
  roofRails: z.string().optional(),
  oilType: z.string().optional(),
  lastOilChange: z.string().optional(),
  freeDealershipOilChanges: z.string().optional(),
  fuelType: z.string().optional(),
  tireSize: z.string().optional(),
  vehicleFeatures: z.string().optional(), // JSON string array or comma-separated
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
  password: z.string().optional(),
  // Car Links
  turoLink: z.string().optional(),
  adminTuroLink: z.string().optional(),
  // Documents
  insuranceCardUrl: z.string().optional(),
  driversLicenseUrls: z.string().optional(), // JSON string array
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
  const [fullScreenDocument, setFullScreenDocument] = useState<{ url: string; type: 'insurance' | 'license'; index?: number; isPdf?: boolean } | null>(null);
  // Document editing state
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null);
  const [insuranceCardPreview, setInsuranceCardPreview] = useState<string | null>(null);
  const [driversLicenseFiles, setDriversLicenseFiles] = useState<File[]>([]);
  const [driversLicensePreviews, setDriversLicensePreviews] = useState<string[]>([]);

  // Helper function to check if a URL is a PDF
  const isPdfDocument = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('application/pdf');
  };

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
  // Use VIN from vehicle information card to fetch the correct onboarding record
  const { data: onboardingData, isLoading: isLoadingOnboarding } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: ["/api/onboarding/vin", car?.vin, "onboarding"],
    queryFn: async () => {
      if (!car?.vin) throw new Error("No VIN");
      // Use VIN to fetch onboarding data
      const url = buildApiUrl(`/api/onboarding/vin/${encodeURIComponent(car.vin)}`);
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
    enabled: !!car?.vin,
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
      vehicleTrim: "",
      interiorColor: "",
      registrationExpiration: "",
      vehicleRecall: "",
      numberOfSeats: "",
      numberOfDoors: "",
      skiRacks: "",
      skiCrossBars: "",
      roofRails: "",
      oilType: "",
      lastOilChange: "",
      freeDealershipOilChanges: "",
      fuelType: "",
      tireSize: "",
      vehicleFeatures: "",
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
      password: "",
      turoLink: "",
      adminTuroLink: "",
      insuranceCardUrl: "",
      driversLicenseUrls: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const formData = new FormData();
      // Vehicle Information
      formData.append("vin", data.vin);
      formData.append("makeModel", data.makeModel);
      formData.append("licensePlate", data.licensePlate || "");
      formData.append("year", data.year || "");
      formData.append("color", data.color || "");
      formData.append("mileage", data.mileage || "");
      // Extended Vehicle Information - Always send all fields to ensure backend can update them
      formData.append("vehicleTrim", data.vehicleTrim || "");
      formData.append("interiorColor", data.interiorColor || "");
      formData.append("registrationExpiration", data.registrationExpiration || "");
      formData.append("vehicleRecall", data.vehicleRecall || "");
      formData.append("numberOfSeats", data.numberOfSeats || "");
      formData.append("numberOfDoors", data.numberOfDoors || "");
      formData.append("skiRacks", data.skiRacks || "");
      formData.append("skiCrossBars", data.skiCrossBars || "");
      formData.append("roofRails", data.roofRails || "");
      formData.append("oilType", data.oilType || "");
      formData.append("lastOilChange", data.lastOilChange || "");
      formData.append("freeDealershipOilChanges", data.freeDealershipOilChanges || "");
      formData.append("fuelType", data.fuelType || "");
      formData.append("tireSize", data.tireSize || "");
      // Convert vehicleFeatures to JSON array if it's a comma-separated string
      if (data.vehicleFeatures) {
        try {
          // Try to parse as JSON first
          JSON.parse(data.vehicleFeatures);
          formData.append("vehicleFeatures", data.vehicleFeatures);
        } catch {
          // If not JSON, treat as comma-separated and convert to JSON array
          const featuresArray = data.vehicleFeatures.split(',').map(f => f.trim()).filter(f => f);
          formData.append("vehicleFeatures", JSON.stringify(featuresArray));
        }
      } else {
        formData.append("vehicleFeatures", "");
      }
      // Financial Information - Always send all fields to ensure backend can update them
      formData.append("purchasePrice", data.purchasePrice || "");
      formData.append("downPayment", data.downPayment || "");
      formData.append("monthlyPayment", data.monthlyPayment || "");
      formData.append("interestRate", data.interestRate || "");
      formData.append("transportCityToCity", data.transportCityToCity || "");
      formData.append("ultimateGoal", data.ultimateGoal || "");
      // Insurance Information - Always send all fields to ensure backend can update them
      formData.append("insuranceProvider", data.insuranceProvider || "");
      formData.append("insurancePhone", data.insurancePhone || "");
      formData.append("policyNumber", data.policyNumber || "");
      formData.append("insuranceExpiration", data.insuranceExpiration || "");
      // Additional Information - Always send all fields to ensure backend can update them
      formData.append("carManufacturerWebsite", data.carManufacturerWebsite || "");
      formData.append("carManufacturerUsername", data.carManufacturerUsername || "");
      formData.append("password", data.password || "");
      // Car Links - Always send all fields to ensure backend can update them
      formData.append("turoLink", data.turoLink || "");
      formData.append("adminTuroLink", data.adminTuroLink || "");
      
      // Documents - Handle file uploads using state
      if (insuranceCardFile instanceof File) {
        formData.append("insuranceCard", insuranceCardFile);
      } else if (data.insuranceCardUrl !== undefined) {
        // Fallback to URL if no file uploaded
        formData.append("insuranceCardUrl", data.insuranceCardUrl || "");
      }
      
      if (driversLicenseFiles && driversLicenseFiles.length > 0) {
        driversLicenseFiles.forEach((file: File) => {
          if (file instanceof File) {
            formData.append("driversLicense", file);
          }
        });
      } else if (data.driversLicenseUrls !== undefined) {
        // Fallback to URLs if no files uploaded
        formData.append("driversLicenseUrls", data.driversLicenseUrls || "");
      }

      const response = await fetch(buildApiUrl(`/api/cars/${carId}`), {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update car");
      }
      const result = await response.json();
      return result;
    },
    onSuccess: async (responseData) => {
      // Immediately update the car data in cache to reflect changes
      // This ensures the UI updates instantly without waiting for refetch
      if (responseData?.data) {
        queryClient.setQueryData(["/api/cars", carId], responseData);
      }
      
      // Get the VIN from updated car data (prioritize response data, then current car)
      const updatedCar = responseData?.data || car;
      const carVin = updatedCar?.vin || car?.vin;
      
      // Refetch car data in the background to ensure we have the latest from server
      // This will update the cache again with any server-side changes
      queryClient.refetchQueries({ queryKey: ["/api/cars", carId] });
      
      // Refetch onboarding data using VIN (as we changed to VIN-based query)
      // This ensures Financial, Insurance, and Additional Information are updated immediately
      if (carVin) {
        // Invalidate first to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding/vin", carVin, "onboarding"] });
        // Then refetch to get the latest data
        await queryClient.refetchQueries({ queryKey: ["/api/onboarding/vin", carVin, "onboarding"] });
      }
      
      // Also invalidate client-based onboarding queries for backward compatibility
      const finalCar = updatedCar;
      if (finalCar?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", finalCar.clientId, "onboarding"] });
      } else if (car?.clientId) {
        queryClient.invalidateQueries({ queryKey: ["/api/clients", car.clientId, "onboarding"] });
      }
      
      // Invalidate other related queries
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] }); // For the cars list page
      queryClient.invalidateQueries({ queryKey: ["sidebar-badges"] });
      
      toast({
        title: "Success",
        description: "Car information updated successfully",
      });
      // Reset document file state after successful update
      setInsuranceCardFile(null);
      setInsuranceCardPreview(null);
      setDriversLicenseFiles([]);
      setDriversLicensePreviews([]);
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
    
    // Format vehicleFeatures for form (array to comma-separated string or JSON string)
    let vehicleFeaturesValue = "";
    if (onboarding?.vehicleFeatures) {
      if (Array.isArray(onboarding.vehicleFeatures)) {
        vehicleFeaturesValue = onboarding.vehicleFeatures.join(", ");
      } else if (typeof onboarding.vehicleFeatures === 'string') {
        try {
          // Try to parse as JSON array
          const parsed = JSON.parse(onboarding.vehicleFeatures);
          if (Array.isArray(parsed)) {
            vehicleFeaturesValue = parsed.join(", ");
          } else {
            vehicleFeaturesValue = onboarding.vehicleFeatures;
          }
        } catch {
          vehicleFeaturesValue = onboarding.vehicleFeatures;
        }
      }
    }
    
    form.reset({
      vin: car.vin,
      makeModel: car.makeModel,
      licensePlate: car.licensePlate || "",
      year: car.year?.toString() || "",
      color: car.color || "",
      mileage: car.mileage?.toString() || "",
      // Extended Vehicle Information
      vehicleTrim: onboarding?.vehicleTrim || "",
      interiorColor: onboarding?.interiorColor || "",
      registrationExpiration: onboarding?.registrationExpiration || "",
      vehicleRecall: onboarding?.vehicleRecall || "",
      numberOfSeats: onboarding?.numberOfSeats || "",
      numberOfDoors: onboarding?.numberOfDoors || "",
      skiRacks: onboarding?.skiRacks || "",
      skiCrossBars: onboarding?.skiCrossBars || "",
      roofRails: onboarding?.roofRails || "",
      oilType: onboarding?.oilType || "",
      lastOilChange: onboarding?.lastOilChange || "",
      freeDealershipOilChanges: onboarding?.freeDealershipOilChanges || "",
      fuelType: onboarding?.fuelType || "",
      tireSize: onboarding?.tireSize || "",
      vehicleFeatures: vehicleFeaturesValue,
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
      password: onboarding?.password || "",
      // Car Links
      turoLink: car.turoLink || "",
      adminTuroLink: car.adminTuroLink || "",
      // Documents
      insuranceCardUrl: onboarding?.insuranceCardUrl || "",
      driversLicenseUrls: onboarding?.driversLicenseUrls ? (Array.isArray(onboarding.driversLicenseUrls) ? JSON.stringify(onboarding.driversLicenseUrls) : onboarding.driversLicenseUrls) : "",
    });
    // Reset document file state when opening edit dialog
    setInsuranceCardFile(null);
    setInsuranceCardPreview(null);
    setDriversLicenseFiles([]);
    setDriversLicensePreviews([]);
    setIsEditModalOpen(true);
  };

  // Handle insurance card file selection
  const handleInsuranceCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInsuranceCardFile(file);
      // Generate preview
      if (file.type === 'application/pdf') {
        setInsuranceCardPreview(null); // PDF preview handled separately
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setInsuranceCardPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle drivers license files selection
  const handleDriversLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setDriversLicenseFiles(fileArray);
      // Generate previews
      const previews: string[] = [];
      let loadedCount = 0;
      fileArray.forEach((file, index) => {
        if (file.type === 'application/pdf') {
          previews[index] = 'pdf'; // Mark as PDF
          loadedCount++;
          if (loadedCount === fileArray.length) {
            setDriversLicensePreviews(previews);
          }
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            previews[index] = reader.result as string;
            loadedCount++;
            if (loadedCount === fileArray.length) {
              setDriversLicensePreviews(previews);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Remove insurance card file
  const handleRemoveInsuranceCard = () => {
    setInsuranceCardFile(null);
    setInsuranceCardPreview(null);
    // Reset file input
    const input = document.getElementById('insurance-card-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  // Remove drivers license file
  const handleRemoveDriversLicense = (index: number) => {
    const newFiles = driversLicenseFiles.filter((_, i) => i !== index);
    const newPreviews = driversLicensePreviews.filter((_, i) => i !== index);
    setDriversLicenseFiles(newFiles);
    setDriversLicensePreviews(newPreviews);
    // Reset file input if all files removed
    if (newFiles.length === 0) {
      const input = document.getElementById('drivers-license-input') as HTMLInputElement;
      if (input) input.value = '';
    }
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
      case "ACTIVE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "INACTIVE":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      // Legacy support for database values (if any still exist)
      case "available":
      case "in_use":
        return "bg-green-500/20 text-green-400 border-green-500/30";
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

        {/* Row 1: Vehicle Information, Car Photos, and Car Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Vehicle Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-6 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                {/* Column 1 (Left) */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Make & Model</p>
                    <p className="text-white text-base font-medium">{car.makeModel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">VIN</p>
                    <p className="text-white text-base font-mono">{car.vin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Oil Type</p>
                    <p className="text-white text-base">{onboarding?.oilType ? formatValue(onboarding.oilType) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fuel Type</p>
                    <p className="text-white text-base">{onboarding?.fuelType ? formatValue(onboarding.fuelType) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Interior Color</p>
                    <p className="text-white text-base">{onboarding?.interiorColor ? formatValue(onboarding.interiorColor) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vehicle Ownership</p>
                    <p className="text-white text-base">{onboarding?.titleType ? formatValue(onboarding.titleType) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vehicle Recall</p>
                    <p className="text-white text-base">{onboarding?.vehicleRecall ? formatValue(onboarding.vehicleRecall) : "N/A"}</p>
                  </div>
                </div>

                {/* Column 2 (Middle) */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Year</p>
                    <p className="text-white text-base">{car.year || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tire Size</p>
                    <p className="text-white text-base">{onboarding?.tireSize ? formatValue(onboarding.tireSize) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Free Oil Change</p>
                    <p className="text-white text-base">{onboarding?.freeDealershipOilChanges ? formatValue(onboarding.freeDealershipOilChanges) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trim</p>
                    <p className="text-white text-base">{onboarding?.vehicleTrim ? formatValue(onboarding.vehicleTrim) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Exterior Color</p>
                    <p className="text-white text-base">{onboarding?.exteriorColor ? formatValue(onboarding.exteriorColor) : (car.color || "N/A")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Number of Doors</p>
                    <p className="text-white text-base">{onboarding?.numberOfDoors ? formatValue(onboarding.numberOfDoors) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Number of Seats</p>
                    <p className="text-white text-base">{onboarding?.numberOfSeats ? formatValue(onboarding.numberOfSeats) : "N/A"}</p>
                  </div>
                </div>

                {/* Column 3 (Right) */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">License Plate</p>
                    <p className="text-white text-base">{car.licensePlate || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Registration Expiration</p>
                    <p className="text-white text-base">{onboarding?.registrationExpiration ? formatValue(onboarding.registrationExpiration) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Oil Change</p>
                    <p className="text-white text-base">{onboarding?.lastOilChange ? formatValue(onboarding.lastOilChange) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mileage</p>
                    <p className="text-white text-base">{onboarding?.vehicleMiles ? formatValue(onboarding.vehicleMiles) : (car.mileage ? `${car.mileage.toLocaleString()} miles` : "N/A")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Roof Rails</p>
                    <p className="text-white text-base">{onboarding?.roofRails ? formatValue(onboarding.roofRails) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ski Crossbars</p>
                    <p className="text-white text-base">{onboarding?.skiCrossBars ? formatValue(onboarding.skiCrossBars) : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ski Rack</p>
                    <p className="text-white text-base">{onboarding?.skiRacks ? formatValue(onboarding.skiRacks) : "N/A"}</p>
                  </div>
                </div>
              </div>
                {/* Features - Full width */}
                <div className="pt-4 border-t border-[#2a2a2a]">
                  <p className="text-xs text-gray-500 mb-1">Features</p>
                  <p className="text-white text-base">
                    {onboarding?.vehicleFeatures && Array.isArray(onboarding.vehicleFeatures) && onboarding.vehicleFeatures.length > 0
                      ? onboarding.vehicleFeatures.join(", ")
                      : (onboarding?.vehicleFeatures && typeof onboarding.vehicleFeatures === 'string'
                        ? onboarding.vehicleFeatures
                        : "N/A")}
                  </p>
                </div>
                <div className="pt-1.5 border-t border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(car.status)}
                    >
                      {car.status === "ACTIVE"
                        ? "ACTIVE"
                        : car.status === "INACTIVE"
                        ? "INACTIVE"
                        : String(car.status).replace("_", " ").toUpperCase()}
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

          {/* Column 2: Car Photos and Car Links stacked vertically */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            {/* Car Photos Carousel Card */}
            <Card className="bg-[#0f0f0f] border-[#1a1a1a] flex flex-col flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Car Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {car.photos && car.photos.length > 0 ? (
                  <div className="space-y-2 flex-1 flex flex-col">
                      {/* Main Carousel Display - Flexible height to match Vehicle Information card */}
                      <div className="relative w-full flex-1 bg-black rounded-lg overflow-hidden border border-[#2a2a2a]">
                      {car.photos.map((photo, index) => {
                        // For static assets like car photos, use buildApiUrl to get correct backend URL in production
                        const photoPath = photo.startsWith('/') ? photo : `/${photo}`;
                        const photoUrl = buildApiUrl(photoPath);
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
                    <div className="flex items-center justify-center flex-1 bg-black/20 rounded-lg border border-[#2a2a2a]">
                      <p className="text-gray-400 text-center">
                        No photos available
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Car Links Card */}
            <Card className="bg-[#0f0f0f] border-[#1a1a1a]">
              <CardHeader>
                <CardTitle className="text-[#EAEB80] text-lg flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Car Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Turo Link</p>
                    {car.turoLink ? (
                      <p className="text-white text-base break-all">
                        <a
                          href={car.turoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#EAEB80] hover:underline"
                        >
                          {formatValue(car.turoLink)}
                        </a>
                      </p>
                    ) : (
                      <p className="text-gray-500 text-base">Not provided</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Admin Turo Link</p>
                      {car.adminTuroLink ? (
                        <p className="text-white text-base break-all">
                          <a
                            href={car.adminTuroLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#EAEB80] hover:underline"
                          >
                            {formatValue(car.adminTuroLink)}
                          </a>
                        </p>
                      ) : (
                        <p className="text-gray-500 text-base">Not provided</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 2: Documents, Vehicle Purchase Information, Car Login Information, Insurance Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Documents Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
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
                    {onboarding.insuranceCardUrl ? (() => {
                      const documentUrl = onboarding.insuranceCardUrl.startsWith('http') 
                        ? onboarding.insuranceCardUrl 
                        : buildApiUrl(onboarding.insuranceCardUrl);
                      const isPdf = isPdfDocument(onboarding.insuranceCardUrl);
                      
                      return (
                        <div 
                          className="relative group cursor-pointer"
                          onClick={() => {
                            setFullScreenDocument({ url: documentUrl, type: 'insurance', isPdf });
                          }}
                        >
                          <div className={`relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 transition-all overflow-hidden shadow-lg ${
                            isPdf 
                              ? 'border-[#EAEB80]/50 hover:border-[#EAEB80] shadow-[#EAEB80]/20' 
                              : 'border-[#EAEB80]/30 hover:border-[#EAEB80] shadow-[#EAEB80]/20'
                          }`}>
                            {isPdf ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                <p className="text-gray-400 text-xs mt-1">Click to open in PDF viewer</p>
                              </div>
                            ) : (
                              <img
                                src={documentUrl}
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
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                {isPdf ? 'Click to open PDF' : 'Click to view full screen'}
                              </div>
                            </div>
                            {isPdf && (
                              <div className="absolute top-2 right-2 bg-[#EAEB80]/90 text-black text-xs px-2 py-1 rounded font-semibold">
                                PDF
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
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
                          const documentUrl = url.startsWith('http') ? url : buildApiUrl(url);
                          const isPdf = isPdfDocument(url);
                          
                          return (
                            <div 
                              key={index}
                              className="relative group cursor-pointer"
                              onClick={() => setFullScreenDocument({ url: documentUrl, type: 'license', index, isPdf })}
                            >
                              <div className={`relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-lg border-2 transition-all overflow-hidden shadow-lg ${
                                isPdf 
                                  ? 'border-[#EAEB80]/50 hover:border-[#EAEB80] shadow-[#EAEB80]/20' 
                                  : 'border-[#EAEB80]/30 hover:border-[#EAEB80] shadow-[#EAEB80]/20'
                              }`}>
                                {isPdf ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    <div className="text-[#EAEB80] mb-2">
                                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                    <p className="text-gray-400 text-xs mt-1">Click to open in PDF viewer</p>
                                  </div>
                                ) : (
                                  <img
                                    src={documentUrl}
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
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
                                    {isPdf ? 'Click to open PDF' : 'Click to view full screen'}
                                  </div>
                                </div>
                                {isPdf && (
                                  <div className="absolute top-2 right-2 bg-[#EAEB80]/90 text-black text-xs px-2 py-1 rounded font-semibold">
                                    PDF
                                  </div>
                                )}
                                {onboarding.driversLicenseUrls.length > 1 && (
                                  <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                    {index + 1} / {onboarding.driversLicenseUrls.length}
                                  </div>
                                )}
                              </div>
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

          {/* Vehicle Purchase Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
              Vehicle Purchase Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingOnboarding ? (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Loading...</p>
                </div>
              ) : onboarding ? (
                <div className="grid grid-cols-1 gap-2 text-sm">
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

          {/* Car Login Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-[#EAEB80] text-lg">
                Car Login Information
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
                  {onboarding.password && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Password</p>
                      <p className="text-white text-base font-mono">{formatValue(onboarding.password)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">No additional information available</p>
                </div>
              )}
              {/* Timestamps */}
              <div className="pt-3 border-t border-[#2a2a2a] space-y-2">
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
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information Card */}
          <Card className="bg-[#0f0f0f] border-[#1a1a1a] lg:col-span-3">
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

        {/* Photos Grid - 8 columns per row (up to 20 images) - Hidden for client accounts */}
        {isAdmin && (
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
                  // For static assets like car photos, use buildApiUrl to get correct backend URL in production
                  const photoPath = photo.startsWith('/') ? photo : `/${photo}`;
                  const photoUrl = buildApiUrl(photoPath);
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
        )}

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
          <Dialog open={isEditModalOpen} onOpenChange={(open) => {
            setIsEditModalOpen(open);
            if (!open) {
              // Reset document file state when dialog closes
              setInsuranceCardFile(null);
              setInsuranceCardPreview(null);
              setDriversLicenseFiles([]);
              setDriversLicensePreviews([]);
            }
          }}>
          <DialogContent className="bg-[#111111] border-[#2a2a2a] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Edit Car Information
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Update vehicle information, documents, vehicle purchase information, vehicle login information, and insurance information
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
                        <FormLabel className="text-gray-400">Exterior Color</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="vehicleTrim"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Trim</FormLabel>
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
                    name="interiorColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Interior Color</FormLabel>
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
                    name="registrationExpiration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Registration Expiration</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="vehicleRecall"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Vehicle Recall</FormLabel>
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
                    name="numberOfSeats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Number of Seats</FormLabel>
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
                    control={form.control}
                    name="numberOfDoors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Number of Doors</FormLabel>
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
                    control={form.control}
                    name="skiRacks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Ski Rack</FormLabel>
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
                    name="skiCrossBars"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Ski Crossbars</FormLabel>
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
                    name="roofRails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Roof Rails</FormLabel>
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
                    name="oilType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Oil Type</FormLabel>
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
                    name="lastOilChange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Last Oil Change Date</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="freeDealershipOilChanges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Free Service Center Oil Change</FormLabel>
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
                    name="fuelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Fuel Type</FormLabel>
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
                    name="tireSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400">Tire Size</FormLabel>
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
                    name="vehicleFeatures"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-gray-400">Features (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            placeholder="Feature 1, Feature 2, Feature 3"
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

                {/* Car Login Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Car Login Information
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
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80] font-mono"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Car Links Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Car Links
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="turoLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-400">Turo Link</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="url"
                              placeholder="https://turo.com/..."
                              className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isAdmin && (
                      <FormField
                        control={form.control}
                        name="adminTuroLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-400">Admin Turo Link</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://turo.com/..."
                                className="bg-[#1a1a1a] border-[#2a2a2a] text-white focus:border-[#EAEB80]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Documents Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-[#EAEB80] border-b border-[#2a2a2a] pb-2">
                    Documents
                  </h3>
                  
                  {/* Upload Boxes - Side by Side */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Insurance Card Upload */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-[#EAEB80]"></div>
                        <Label className="text-gray-300 text-base font-semibold">Insurance Card</Label>
                      </div>
                      
                      {/* Current Insurance Card Preview */}
                      {onboarding?.insuranceCardUrl && !insuranceCardFile && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Current Document</p>
                          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a] overflow-hidden shadow-lg hover:border-[#EAEB80]/30 transition-all">
                            {(() => {
                              const documentUrl = onboarding.insuranceCardUrl.startsWith('http') 
                                ? onboarding.insuranceCardUrl 
                                : buildApiUrl(onboarding.insuranceCardUrl);
                              const isPdf = isPdfDocument(onboarding.insuranceCardUrl);
                              
                              return isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                  <div className="relative">
                                    <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                    <div className="absolute -top-1 -right-1 bg-[#EAEB80]/20 text-[#EAEB80] text-xs px-2 py-0.5 rounded-full font-bold">
                                      PDF
                                    </div>
                                  </div>
                                  <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                  <p className="text-gray-400 text-xs mt-1 truncate max-w-full px-2">{onboarding.insuranceCardUrl.split("/").pop()}</p>
                                </div>
                              ) : (
                                <img
                                  src={documentUrl}
                                  alt="Current Insurance Card"
                                  className="w-full h-full object-contain p-2"
                                />
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* New Insurance Card Preview */}
                      {insuranceCardFile && (
                        <div className="space-y-2">
                          <p className="text-xs text-[#EAEB80] font-semibold">New Document Selected</p>
                          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#EAEB80]/10 to-[#EAEB80]/5 rounded-xl border-2 border-[#EAEB80]/60 overflow-hidden shadow-lg ring-2 ring-[#EAEB80]/20">
                            {insuranceCardFile.type === 'application/pdf' ? (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                <div className="relative">
                                  <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                  <div className="absolute -top-1 -right-1 bg-[#EAEB80] text-black text-xs px-2 py-0.5 rounded-full font-bold">
                                    PDF
                                  </div>
                                </div>
                                <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                <p className="text-gray-300 text-xs mt-1 truncate max-w-full px-2">{insuranceCardFile.name}</p>
                              </div>
                            ) : insuranceCardPreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={insuranceCardPreview}
                                  alt="Preview"
                                  className="w-full h-full object-contain p-2"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleRemoveInsuranceCard}
                                  className="absolute top-2 right-2 h-8 w-8 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Stylish Upload Button */}
                      <div className="relative">
                        <label
                          htmlFor="insurance-card-input"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#EAEB80]/40 rounded-xl bg-[#0a0a0a]/50 hover:border-[#EAEB80]/60 hover:bg-[#EAEB80]/5 transition-all cursor-pointer group"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-[#EAEB80] mb-2 group-hover:scale-110 transition-transform" />
                            <p className="mb-2 text-sm font-semibold text-gray-300 group-hover:text-[#EAEB80] transition-colors">
                              {insuranceCardFile ? "Change File" : "Click to Upload"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Image or PDF (Max 10MB)
                            </p>
                          </div>
                          <Input
                            id="insurance-card-input"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleInsuranceCardChange}
                            className="hidden"
                          />
                        </label>
                        {insuranceCardFile && (
                          <p className="text-xs text-[#EAEB80] mt-2 text-center font-medium">
                            ✓ Ready to update
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Drivers License Upload */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-[#EAEB80]"></div>
                        <Label className="text-gray-300 text-base font-semibold">Drivers License</Label>
                      </div>
                      
                      {/* Current Drivers License Previews */}
                      {onboarding?.driversLicenseUrls && Array.isArray(onboarding.driversLicenseUrls) && onboarding.driversLicenseUrls.length > 0 && driversLicenseFiles.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Current Documents ({onboarding.driversLicenseUrls.length})</p>
                          {onboarding.driversLicenseUrls.length === 1 ? (
                            // Single document - full width to match Insurance Card
                            <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a] overflow-hidden shadow-lg hover:border-[#EAEB80]/30 transition-all">
                              {(() => {
                                const url = onboarding.driversLicenseUrls[0];
                                const documentUrl = url.startsWith('http') ? url : buildApiUrl(url);
                                const isPdf = isPdfDocument(url);
                                
                                return isPdf ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    <div className="relative">
                                      <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                      <div className="absolute -top-1 -right-1 bg-[#EAEB80]/20 text-[#EAEB80] text-xs px-2 py-0.5 rounded-full font-bold">
                                        PDF
                                      </div>
                                    </div>
                                    <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                    <p className="text-gray-400 text-xs mt-1 truncate max-w-full px-2">{url.split("/").pop()}</p>
                                  </div>
                                ) : (
                                  <img
                                    src={documentUrl}
                                    alt="Drivers License"
                                    className="w-full h-full object-contain p-2"
                                  />
                                );
                              })()}
                            </div>
                          ) : (
                            // Multiple documents - grid layout
                            <div className="grid grid-cols-2 gap-3">
                              {onboarding.driversLicenseUrls.map((url: string, index: number) => {
                                const documentUrl = url.startsWith('http') ? url : buildApiUrl(url);
                                const isPdf = isPdfDocument(url);
                                
                                return (
                                <div key={index} className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] rounded-xl border-2 border-[#2a2a2a] overflow-hidden shadow-lg hover:border-[#EAEB80]/30 transition-all">
                                  {isPdf ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                      <div className="relative">
                                        <FileText className="w-12 h-12 text-[#EAEB80] mb-1" />
                                        <div className="absolute -top-1 -right-1 bg-[#EAEB80]/20 text-[#EAEB80] text-xs px-1.5 py-0.5 rounded-full font-bold">
                                          PDF
                                        </div>
                                      </div>
                                      <p className="text-[#EAEB80] text-xs font-semibold">PDF</p>
                                    </div>
                                  ) : (
                                      <img
                                        src={documentUrl}
                                        alt={`License ${index + 1}`}
                                        className="w-full h-full object-contain p-1"
                                      />
                                    )}
                                    <div className="absolute top-1 left-1 bg-black/90 text-[#EAEB80] text-xs px-1.5 py-0.5 rounded font-semibold shadow-lg">
                                      {index + 1}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* New Drivers License Previews */}
                      {driversLicenseFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-[#EAEB80] font-semibold">New Documents Selected ({driversLicenseFiles.length})</p>
                          {driversLicenseFiles.length === 1 ? (
                            // Single file - full width to match Insurance Card
                            <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#EAEB80]/10 to-[#EAEB80]/5 rounded-xl border-2 border-[#EAEB80]/60 overflow-hidden shadow-lg ring-2 ring-[#EAEB80]/20">
                              {driversLicenseFiles[0].type === 'application/pdf' ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                  <div className="relative">
                                    <FileText className="w-16 h-16 text-[#EAEB80] mb-2" />
                                    <div className="absolute -top-1 -right-1 bg-[#EAEB80] text-black text-xs px-2 py-0.5 rounded-full font-bold">
                                      PDF
                                    </div>
                                  </div>
                                  <p className="text-[#EAEB80] text-sm font-semibold">PDF Document</p>
                                  <p className="text-gray-300 text-xs mt-1 truncate max-w-full px-2">{driversLicenseFiles[0].name}</p>
                                </div>
                              ) : driversLicensePreviews[0] && driversLicensePreviews[0] !== 'pdf' ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={driversLicensePreviews[0]}
                                    alt="Preview"
                                    className="w-full h-full object-contain p-2"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveDriversLicense(0)}
                                    className="absolute top-2 right-2 h-8 w-8 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <p className="text-xs text-gray-500">Loading...</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Multiple files - grid layout
                            <div className="grid grid-cols-2 gap-3">
                              {driversLicenseFiles.map((file, index) => (
                              <div key={index} className="relative w-full aspect-[4/3] bg-gradient-to-br from-[#EAEB80]/10 to-[#EAEB80]/5 rounded-xl border-2 border-[#EAEB80]/60 overflow-hidden shadow-lg ring-2 ring-[#EAEB80]/20">
                                {file.type === 'application/pdf' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                    <div className="relative">
                                      <FileText className="w-12 h-12 text-[#EAEB80] mb-1" />
                                      <div className="absolute -top-1 -right-1 bg-[#EAEB80] text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                                        PDF
                                      </div>
                                    </div>
                                    <p className="text-[#EAEB80] text-xs font-semibold">PDF</p>
                                    <p className="text-gray-300 text-xs truncate w-full px-1">{file.name}</p>
                                  </div>
                                ) : driversLicensePreviews[index] && driversLicensePreviews[index] !== 'pdf' ? (
                                    <div className="relative w-full h-full">
                                      <img
                                        src={driversLicensePreviews[index]}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-full object-contain p-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveDriversLicense(index)}
                                        className="absolute top-1 right-1 h-6 w-6 bg-red-600/90 hover:bg-red-600 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <p className="text-xs text-gray-500">Loading...</p>
                                    </div>
                                  )}
                                  <div className="absolute top-1 left-1 bg-[#EAEB80] text-black text-xs px-1.5 py-0.5 rounded font-bold shadow-lg">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Stylish Upload Button */}
                      <div className="relative">
                        <label
                          htmlFor="drivers-license-input"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#EAEB80]/40 rounded-xl bg-[#0a0a0a]/50 hover:border-[#EAEB80]/60 hover:bg-[#EAEB80]/5 transition-all cursor-pointer group"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-[#EAEB80] mb-2 group-hover:scale-110 transition-transform" />
                            <p className="mb-2 text-sm font-semibold text-gray-300 group-hover:text-[#EAEB80] transition-colors">
                              {driversLicenseFiles.length > 0 ? `Change Files (${driversLicenseFiles.length} selected)` : "Click to Upload"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Multiple files allowed (Max 10MB each)
                            </p>
                          </div>
                          <Input
                            id="drivers-license-input"
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={handleDriversLicenseChange}
                            className="hidden"
                          />
                        </label>
                        {driversLicenseFiles.length > 0 && (
                          <p className="text-xs text-[#EAEB80] mt-2 text-center font-medium">
                            ✓ {driversLicenseFiles.length} file(s) ready to update
                          </p>
                        )}
                      </div>
                    </div>
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
                  src={buildApiUrl(car.photos[fullScreenImageIndex].startsWith('/') ? car.photos[fullScreenImageIndex] : `/${car.photos[fullScreenImageIndex]}`)}
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
            {/* Close Button - Top Right Corner */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenDocument(null);
              }}
              className="fixed top-4 right-4 z-[9999] h-14 w-14 bg-red-600/90 hover:bg-red-600 text-white border-2 border-white rounded-full shadow-2xl backdrop-blur-sm transition-all hover:scale-110 flex items-center justify-center"
              aria-label="Close full screen view"
              style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                zIndex: 9999,
              }}
            >
              <X className="w-8 h-8" strokeWidth={3} />
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
                          index: prevIndex,
                          isPdf: isPdfDocument(prevUrl)
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
                          index: nextIndex,
                          isPdf: isPdfDocument(nextUrl)
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

              {/* Full Screen Document Display - PDF or Image */}
              {fullScreenDocument.isPdf ? (
                <iframe
                  src={fullScreenDocument.url}
                  className="w-full h-full border-0"
                  style={{
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title={fullScreenDocument.type === 'insurance' ? 'Insurance Card PDF' : `Drivers License PDF ${fullScreenDocument.index !== undefined ? fullScreenDocument.index + 1 : ''}`}
                />
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
