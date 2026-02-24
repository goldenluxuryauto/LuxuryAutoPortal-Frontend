import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Fuel, Battery, Signal, Clock, Gauge } from 'lucide-react';

interface BouncieDevice {
  imei: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  nickname: string;
  mileage: number;
  fuelLevel: number;
  batteryVoltage: number;
  location: {
    lat: number;
    lon: number;
    address: string;
    timestamp: string;
  };
  stats: {
    totalTrips: number;
    totalMiles: number;
    avgMpg: number;
  };
  deviceStatus: {
    connected: boolean;
    lastSeen: string;
    signalStrength: number;
  };
}

interface BouncieDeviceCardProps {
  device: BouncieDevice;
  onViewDetails?: (device: BouncieDevice) => void;
  onLinkToCar?: (device: BouncieDevice) => void;
  linkedCarId?: number | null;
}

const BouncieDeviceCard: React.FC<BouncieDeviceCardProps> = ({
  device,
  onViewDetails,
  onLinkToCar,
  linkedCarId
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 70) return 'text-green-600';
    if (strength >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBatteryColor = (voltage: number) => {
    if (voltage >= 12.4) return 'text-green-600';
    if (voltage >= 12.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {device.nickname || `${device.make} ${device.model}`}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={device.deviceStatus.connected ? "default" : "destructive"}>
              {device.deviceStatus.connected ? 'Online' : 'Offline'}
            </Badge>
            {linkedCarId && (
              <Badge variant="outline">
                Linked to Car #{linkedCarId}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p>{device.year} {device.make} {device.model}</p>
          <p className="text-xs text-gray-500">IMEI: {device.imei}</p>
          <p className="text-xs text-gray-500">VIN: {device.vin}</p>
        </div>
      </CardHeader>

      <CardContent>
        {/* Location */}
        <div className="mb-4">
          <div className="flex items-start space-x-2 mb-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">{device.location.address}</p>
              <p className="text-xs text-gray-500">
                {device.location.lat.toFixed(6)}, {device.location.lon.toFixed(6)}
              </p>
              <p className="text-xs text-gray-400">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimestamp(device.location.timestamp)}
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{device.mileage.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Miles</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Fuel className="w-4 h-4 text-yellow-600" />
            <div>
              <p className="text-sm font-medium">{device.fuelLevel}%</p>
              <p className="text-xs text-gray-500">Fuel Level</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Battery className={`w-4 h-4 ${getBatteryColor(device.batteryVoltage)}`} />
            <div>
              <p className="text-sm font-medium">{device.batteryVoltage}V</p>
              <p className="text-xs text-gray-500">Battery</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Signal className={`w-4 h-4 ${getSignalStrengthColor(device.deviceStatus.signalStrength)}`} />
            <div>
              <p className="text-sm font-medium">{device.deviceStatus.signalStrength}%</p>
              <p className="text-xs text-gray-500">Signal</p>
            </div>
          </div>
        </div>

        {/* Trip Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded">
          <div className="text-center">
            <p className="text-sm font-medium">{device.stats.totalTrips}</p>
            <p className="text-xs text-gray-500">Trips</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{device.stats.totalMiles.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Trip Miles</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{device.stats.avgMpg}</p>
            <p className="text-xs text-gray-500">Avg MPG</p>
          </div>
        </div>

        {/* Device Status */}
        <div className="text-xs text-gray-500 mb-4">
          <p>Last seen: {formatTimestamp(device.deviceStatus.lastSeen)}</p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(device)}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
          {onLinkToCar && !linkedCarId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onLinkToCar(device)}
              className="flex-1"
            >
              Link to Car
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BouncieDeviceCard;