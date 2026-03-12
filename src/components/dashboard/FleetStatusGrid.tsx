import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Car, 
  MapPin, 
  Clock, 
  Search,
  Filter,
  ExternalLink
} from 'lucide-react';

interface FleetVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  status: 'available' | 'rented' | 'maintenance' | 'offline';
  currentTrip?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  lastUpdate: string;
}

interface FleetStatusGridProps {
  vehicles: FleetVehicle[];
}

export function FleetStatusGrid({ vehicles }: FleetStatusGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-gray-100 text-gray-800">Available</Badge>;
      case 'rented':
        return <Badge className="bg-green-100 text-green-800">Rented</Badge>;
      case 'maintenance':
        return <Badge className="bg-red-100 text-red-800">Maintenance</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-600">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-gray-300';
      case 'rented': return 'border-green-300';
      case 'maintenance': return 'border-red-300';
      case 'offline': return 'border-gray-400';
      default: return 'border-gray-300';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = searchTerm === '' || 
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatLastUpdate = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({vehicles.length})
          </Button>
          <Button
            variant={statusFilter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('available')}
          >
            Available ({statusCounts.available || 0})
          </Button>
          <Button
            variant={statusFilter === 'rented' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('rented')}
          >
            Rented ({statusCounts.rented || 0})
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{statusCounts.available || 0}</p>
          <p className="text-xs text-gray-500">Available</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-600">{statusCounts.rented || 0}</p>
          <p className="text-xs text-gray-500">Rented</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">{statusCounts.maintenance || 0}</p>
          <p className="text-xs text-gray-500">Maintenance</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600">{statusCounts.offline || 0}</p>
          <p className="text-xs text-gray-500">Offline</p>
        </div>
      </div>

      {/* Vehicle Grid */}
      <ScrollArea className="h-80">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No vehicles match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredVehicles.map((vehicle) => (
              <div 
                key={vehicle.id} 
                className={`border-2 rounded-lg p-3 hover:bg-gray-50 transition-colors ${getStatusColor(vehicle.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-500">{vehicle.licensePlate}</p>
                  </div>
                  <div className="ml-2">
                    {getStatusBadge(vehicle.status)}
                  </div>
                </div>

                {vehicle.location && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{vehicle.location.address}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatLastUpdate(vehicle.lastUpdate)}</span>
                  </div>
                  {vehicle.location && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => window.open(
                        `https://maps.google.com/?q=${vehicle.location?.lat},${vehicle.location?.lng}`,
                        '_blank'
                      )}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Map
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>

                {vehicle.currentTrip && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Active Trip: {vehicle.currentTrip}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}