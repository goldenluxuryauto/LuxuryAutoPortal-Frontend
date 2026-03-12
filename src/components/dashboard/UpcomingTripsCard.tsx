import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  User, 
  Car,
  ArrowRight,
  MapPin
} from 'lucide-react';

interface UpcomingTrip {
  id: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  customerName: string;
  startDate: string;
  endDate: string;
  status: 'confirmed' | 'pending' | 'in_progress';
}

interface UpcomingTripsCardProps {
  trips: UpcomingTrip[];
  type: 'start' | 'end';
  emptyMessage: string;
}

export function UpcomingTripsCard({ trips, type, emptyMessage }: UpcomingTripsCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dayOfWeek: date.toLocaleDateString('en-US', {
        weekday: 'short'
      })
    };
  };

  const isToday = (dateString: string) => {
    const tripDate = new Date(dateString).toDateString();
    const today = new Date().toDateString();
    return tripDate === today;
  };

  const isTomorrow = (dateString: string) => {
    const tripDate = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tripDate.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isTomorrow(dateString)) return 'Tomorrow';
    return formatDateTime(dateString).dayOfWeek;
  };

  // Sort trips by date
  const sortedTrips = [...trips].sort((a, b) => {
    const dateA = new Date(type === 'start' ? a.startDate : a.endDate);
    const dateB = new Date(type === 'start' ? b.startDate : b.endDate);
    return dateA.getTime() - dateB.getTime();
  });

  if (sortedTrips.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <Calendar className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">{emptyMessage}</p>
        <p className="text-sm text-gray-400">All caught up!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80">
      <div className="space-y-3">
        {sortedTrips.map((trip) => {
          const relevantDate = type === 'start' ? trip.startDate : trip.endDate;
          const dateInfo = formatDateTime(relevantDate);
          const dateLabel = getDateLabel(relevantDate);
          const isUrgent = isToday(relevantDate);

          return (
            <div 
              key={trip.id} 
              className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                isUrgent ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {/* Trip Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-gray-900">
                      {trip.vehicleInfo.year} {trip.vehicleInfo.make} {trip.vehicleInfo.model}
                    </h3>
                    {getStatusBadge(trip.status)}
                    {isUrgent && (
                      <Badge className="bg-amber-100 text-amber-800">
                        {type === 'start' ? 'Starting Today' : 'Ending Today'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {trip.vehicleInfo.licensePlate}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <User className="h-4 w-4 mr-2" />
                <span>{trip.customerName}</span>
              </div>

              {/* Date and Time Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className={isUrgent ? 'font-medium text-amber-800' : 'text-gray-600'}>
                    {dateLabel}, {dateInfo.date}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span className={isUrgent ? 'font-medium text-amber-800' : 'text-gray-600'}>
                    {dateInfo.time}
                  </span>
                </div>
              </div>

              {/* Full Trip Duration (if showing trip starts) */}
              {type === 'start' && (
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>
                    {formatDateTime(trip.startDate).date} - {formatDateTime(trip.endDate).date}
                  </span>
                  <ArrowRight className="h-3 w-3 mx-2" />
                  <span>
                    {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="flex-1">
                  <Car className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                {type === 'start' && trip.status === 'confirmed' && (
                  <Button size="sm" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Prepare Vehicle
                  </Button>
                )}
                {type === 'end' && (
                  <Button size="sm" className="flex-1">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule Return
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}