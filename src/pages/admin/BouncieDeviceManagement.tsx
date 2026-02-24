import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { RefreshCw, MapPin, Car, Zap, Gauge, Calendar, AlertTriangle } from 'lucide-react';

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

interface BouncieApiResponse {
  success: boolean;
  message: string;
  data?: BouncieDevice[];
  timestamp: string;
}

const BouncieDeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<BouncieDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BouncieDevice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionTest, setConnectionTest] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: ''
  });

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bouncie/devices');
      const data: BouncieApiResponse = await response.json();
      
      if (data.success && data.data) {
        setDevices(data.data);
        toast({
          title: 'Success',
          description: `Retrieved ${data.data.length} Bouncie devices`,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch devices');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bouncie/test');
      const data = await response.json();
      
      setConnectionTest({
        tested: true,
        success: data.success,
        message: data.message
      });

      if (data.success) {
        toast({
          title: 'Connection Success',
          description: `Connected to Bouncie API - ${data.deviceCount || 0} devices available`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setConnectionTest({
        tested: true,
        success: false,
        message: 'Failed to connect to Bouncie API'
      });
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const syncDevices = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/bouncie/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeInDB: true })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${data.data.totalDevices} devices`,
        });
        await fetchDevices();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const filteredDevices = devices.filter(device =>
    device.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    testConnection();
  }, []);

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bouncie Device Management</h1>
        <p className="text-gray-600 mt-2">Manage vehicle tracking devices and real-time data</p>
      </div>

      {/* Connection Status */}
      {connectionTest.tested && (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${connectionTest.success ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`font-medium ${connectionTest.success ? 'text-green-700' : 'text-red-700'}`}>
                {connectionTest.success ? 'Connected to Bouncie API' : 'Connection Failed'}
              </span>
              <span className="text-gray-500">({connectionTest.message})</span>
            </div>
            <Button onClick={testConnection} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative max-w-sm">
            <Label htmlFor="search">Search Devices</Label>
            <Input
              id="search"
              placeholder="Search by nickname, VIN, make, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="space-x-2">
          <Button onClick={fetchDevices} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={syncDevices} disabled={syncing || !connectionTest.success}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <Card key={device.imei} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Car className="w-5 h-5 mr-2 text-blue-600" />
                  {device.nickname || `${device.make} ${device.model}`}
                </CardTitle>
                <Badge variant={device.deviceStatus.connected ? "default" : "destructive"}>
                  {device.deviceStatus.connected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                {device.year} {device.make} {device.model}
              </p>
              <p className="text-xs text-gray-400">VIN: {device.vin}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Location */}
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{device.location.address}</p>
                    <p className="text-xs text-gray-500">
                      {device.location.lat.toFixed(4)}, {device.location.lon.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-gray-700">{device.mileage.toLocaleString()} mi</p>
                      <p className="text-xs text-gray-500">Total Mileage</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <div>
                      <p className="text-gray-700">{device.fuelLevel}%</p>
                      <p className="text-xs text-gray-500">Fuel Level</p>
                    </div>
                  </div>
                </div>

                {/* Device Status */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Signal: {device.deviceStatus.signalStrength}%</span>
                    <span>Last seen: {formatLastSeen(device.deviceStatus.lastSeen)}</span>
                  </div>
                  {device.deviceStatus.signalStrength < 30 && (
                    <div className="flex items-center mt-1 text-amber-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      <span className="text-xs">Weak signal</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDevices.length === 0 && !loading && (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Devices Found</h3>
            <p className="mb-4">
              {devices.length === 0 
                ? 'No Bouncie devices are currently connected to your account.'
                : 'No devices match your search criteria.'}
            </p>
            {devices.length === 0 && connectionTest.success && (
              <Button onClick={fetchDevices}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Fetch Devices
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BouncieDeviceManagement;