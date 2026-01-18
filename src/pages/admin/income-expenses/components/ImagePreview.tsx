import React, { useState, useEffect } from "react";
import { X, ZoomIn, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/queryClient";
import type { ExistingImage } from "../utils/useImageUpload";

interface ImagePreviewProps {
  newImages?: File[];
  existingImages?: ExistingImage[];
  onRemoveNew?: (index: number) => void;
  onRemoveExisting?: (imageId: string) => void;
  onImageClick?: (url: string) => void;
}

export default function ImagePreview({ 
  newImages = [], 
  existingImages = [],
  onRemoveNew,
  onRemoveExisting,
  onImageClick
}: ImagePreviewProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);

  // Create object URLs for new images
  useEffect(() => {
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setNewImageUrls(urls);

    // Cleanup function to revoke object URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  const handleZoom = (url: string) => {
    setZoomedImage(url);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  const getImageUrl = (image: ExistingImage) => {
    // If URL is already absolute, return as is
    if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
      return image.url;
    }
    
    // For static files (starting with /), use buildApiUrl which handles both dev and prod
    // In dev: returns relative path (uses Vite proxy)
    // In prod: returns full URL with backend domain
    return buildApiUrl(image.url);
  };

  const allImagesCount = newImages.length + existingImages.length;
  if (allImagesCount === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {/* Existing Images */}
        {existingImages.map((image) => {
          const imageUrl = getImageUrl(image);
          return (
            <div
              key={image.id}
              className="relative group bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#2a2a2a] aspect-square shadow-lg hover:border-[#EAEB80]/50 transition-all"
            >
              <img
                src={imageUrl}
                alt={image.filename}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => onImageClick ? onImageClick(imageUrl) : handleZoom(imageUrl)}
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  imgElement.style.display = 'none';
                  // Show error placeholder
                  const parent = imgElement.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-red-500/20 text-red-400 text-xs p-2 text-center">
                        Failed to load image
                      </div>
                    `;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                  <span className="text-white text-xs truncate flex-1 mr-2">
                    {image.filename}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoom(imageUrl);
                      }}
                      className="h-7 w-7 p-0 bg-white/20 hover:bg-white/30 text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    {onRemoveExisting && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveExisting(image.id);
                        }}
                        className="h-7 w-7 p-0 bg-red-500/80 hover:bg-red-600 text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute top-1 right-1">
                <span className="bg-[#EAEB80] text-black text-[10px] px-1.5 py-0.5 rounded font-medium">
                  Saved
                </span>
              </div>
            </div>
          );
        })}

        {/* New Images (to be uploaded) */}
        {newImages.map((file, index) => {
          const imageUrl = newImageUrls[index];
          if (!imageUrl) return null;
          
          return (
            <div
              key={`new-${index}`}
              className="relative group bg-[#1a1a1a] rounded-lg overflow-hidden border-2 border-dashed border-[#EAEB80]/50 aspect-square shadow-lg hover:border-[#EAEB80] transition-all"
            >
              <img
                src={imageUrl}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Image failed to load
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                  <span className="text-white text-xs truncate flex-1 mr-2">
                    {file.name}
                  </span>
                  <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                      onClick={() => handleZoom(newImageUrls[index])}
                      className="h-7 w-7 p-0 bg-white/20 hover:bg-white/30 text-white"
                >
                      <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                    {onRemoveNew && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                        onClick={() => onRemoveNew(index)}
                        className="h-7 w-7 p-0 bg-red-500/80 hover:bg-red-600 text-white"
                >
                        <X className="w-3.5 h-3.5" />
                </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute top-1 right-1">
                <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <Upload className="w-2.5 h-2.5" />
                  New
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={handleCloseZoom}>
        <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Zoomed Image Preview</DialogTitle>
            <DialogDescription>View the full-size image preview</DialogDescription>
          </DialogHeader>
          {zoomedImage && (
            <div className="relative">
              <img
                src={zoomedImage}
                alt="Zoomed preview"
                className="w-full h-auto max-h-[85vh] object-contain"
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  imgElement.src = "";
                  imgElement.alt = "Failed to load image";
                  imgElement.className = "hidden";
                  // Show error message
                  const parent = imgElement.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-[400px] flex items-center justify-center bg-red-500/20 text-red-400">
                        <div class="text-center">
                          <p class="text-sm font-medium">Failed to load image</p>
                          <p class="text-xs mt-2 text-gray-400">${zoomedImage}</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseZoom}
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white z-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
