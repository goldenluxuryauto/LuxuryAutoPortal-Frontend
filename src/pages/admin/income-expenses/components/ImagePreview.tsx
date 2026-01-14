import React, { useState, useEffect } from "react";
import { X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  images: File[];
  onRemove: (index: number) => void;
}

export default function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Create object URLs for images
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);

    // Cleanup function to revoke object URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleZoom = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setZoomedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
  };

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {images.map((file, index) => {
          return (
            <div
              key={index}
              className="relative group bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#2a2a2a] aspect-square"
            >
              <img
                src={imageUrls[index]}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleZoom(file)}
                  className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-600 text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                {file.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={handleCloseZoom}>
        <DialogContent className="bg-[#0f0f0f] border-[#1a1a1a] max-w-4xl max-h-[90vh] p-0">
          {zoomedImage && (
            <div className="relative">
              <img
                src={zoomedImage}
                alt="Zoomed preview"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseZoom}
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/70 hover:bg-black/90 text-white"
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
