import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";

export function useImageUpload(carId: number, year: string, category: string, field: string, month: number) {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const imageFiles = files.filter((file) => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      return validTypes.includes(file.type);
    });

    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Only image files (JPEG, PNG, GIF, WebP) are allowed",
        variant: "destructive",
      });
    }

    if (imageFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...imageFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUploads = async () => {
    if (imageFiles.length === 0) {
      toast({
        title: "No images to upload",
        description: "Please select at least one image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      imageFiles.forEach((file) => {
        formData.append("images", file);
      });
      formData.append("carId", carId.toString());
      formData.append("year", year);
      formData.append("month", month.toString());
      formData.append("category", category);
      formData.append("field", field);

      const response = await fetch(buildApiUrl("/api/income-expense/images/upload"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload images");
      }

      toast({
        title: "Success",
        description: `${imageFiles.length} image(s) uploaded successfully`,
      });

      setImageFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetImages = () => {
    setImageFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    imageFiles,
    isUploading,
    fileInputRef,
    handleFileChange,
    handleRemoveImage,
    handleConfirmUploads,
    resetImages,
  };
}
