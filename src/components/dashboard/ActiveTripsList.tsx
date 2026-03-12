import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  DollarSign,
  ExternalLink
} from 'lucide-react';

interface ActiveTrip {
  id: string;
  vehicleId: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'upcoming' | 'ending_soon';
  startTime: string;
  endTime: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  revenue: number;
}

interface ActiveTripsListProps {
  trips: ActiveTrip[];
}

export function ActiveTripsList({ trips }: ActiveTripsListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'ending_soon':
        return <Badge className="bg-yellow-100 text-yellow-800">Ending Soon</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (trips.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <Clock className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">No active trips</p>
        <p className="text-sm text-gray-400">All vehicles are available</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-4">
        {trips.map((trip) => (
          <div key={trip.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900">
                    {trip.vehicleInfo.year} {trip.vehicleInfo.make} {trip.vehicleInfo.model}
                  </h3>
                  {getStatusBadge(trip.status)}
                </div>
                <p className="text-sm text-gray-500">
                  {trip.vehicleInfo.licensePlate}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-green-600">
                  ${trip.revenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                <span>{trip.customerInfo.name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span>{trip.customerInfo.phone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  {formatDate(trip.startTime)} {formatTime(trip.startTime)} - 
                  {formatTime(trip.endTime)}
                </span>
              </div>
              {trip.currentLocation && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="truncate max-w-32">
                    {trip.currentLocation.address}
                  </span>
                </div>
              )}
            </div>

            {trip.currentLocation && (
              <div className="mt-3 flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(
                    `https://maps.google.com/?q=${trip.currentLocation?.lat},${trip.currentLocation?.lng}`,
                    '_blank'
                  )}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  View Location
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}