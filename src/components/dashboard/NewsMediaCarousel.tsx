import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play,
  Calendar,
  FileText
} from 'lucide-react';

interface NewsMediaItem {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

interface NewsMediaCarouselProps {
  items: NewsMediaItem[];
}

export function NewsMediaCarousel({ items }: NewsMediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <FileText className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No news or media content available</p>
        <p className="text-sm text-gray-400">Upload videos and news to get started</p>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? items.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === items.length - 1 ? 0 : prevIndex + 1
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Carousel Item */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            {/* Media Content */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              {currentItem.videoUrl ? (
                <div className="relative w-full h-full">
                  <video
                    className="w-full h-full object-cover"
                    poster={currentItem.imageUrl}
                    controls
                  >
                    <source src={currentItem.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : currentItem.imageUrl ? (
                <img 
                  src={currentItem.imageUrl} 
                  alt={currentItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <Play className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p>Media content</p>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {items.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Item Counter */}
            {items.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                {currentIndex + 1} / {items.length}
              </div>
            )}
          </div>

          {/* Content Info */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 flex-1">
                {currentItem.title}
              </h3>
              <div className="flex items-center text-sm text-gray-500 ml-4">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(currentItem.createdAt)}
              </div>
            </div>
            
            {currentItem.description && (
              <p className="text-gray-600 leading-relaxed">
                {currentItem.description}
              </p>
            )}

            {currentItem.videoUrl && (
              <div className="mt-3">
                <Badge className="bg-blue-100 text-blue-800">
                  <Play className="h-3 w-3 mr-1" />
                  Video Content
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail Navigation */}
      {items.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden transition-all ${
                index === currentIndex 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Play className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}