import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  RefreshCw,
  Settings,
  Car,
  Link,
  Trash2,
  Battery,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
  Navigation,
  CheckCircle2,
} from "lucide-react";

interface BouncieDevice {
  id: string;
  userId: string;
  imei: string;
  nickname?: string;
  carId?: string;
  carInfo?: {
    id: string;
    make: string;
    model: string;
    year: string;
    licensePlate?: string;
    color?: string;
  };
  isActive: boolean;
  trackingEnabled: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  status?: 'online' | 'offline' | 'driving' | 'parked';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AvailableCar {
  id: string;
  make: string;
  model: string;
  year: string;
  licensePlate?: string;
  color?: string;
  displayName: string;
}

interface DeviceSettingsDialogProps {
  device: BouncieDevice | null;
  availableCars: AvailableCar[];
  onClose: () => void;
  onSave: (deviceId: string, updates: any) => void;
}

function DeviceSettingsDialog({ device, availableCars, onClose, onSave }: DeviceSettingsDialogProps) {
  const [nickname, setNickname] = useState(device?.nickname || "");
  const [trackingEnabled, setTrackingEnabled] = useState(device?.trackingEnabled ?? true);
  const [selectedCarId, setSelectedCarId] = useState(device?.carId || "");

  if (!device) return null;

  const handleSave = () => {
    onSave(device.id, {
      nickname: nickname.trim() || null,
      trackingEnabled,
      carId: selectedCarId || null
    });
    onClose();
  };

  return (
    <Dialog open={!!device} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
          <DialogDescription>
            Configure settings for device {device.imei}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nickname">Device Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter a friendly name"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="car-assignment">Assigned Vehicle</Label>
            <Select value={selectedCarId} onValueChange={setSelectedCarId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No assignment</SelectItem>
                {availableCars.map((car) => (
                  <SelectItem key={car.id} value={car.id}>
                    {car.displayName}
                    {car.licensePlate && (
                      <span className="text-muted-foreground ml-2">
                        ({car.licensePlate})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tracking">Enable Tracking</Label>
              <div className="text-sm text-muted-foreground">
                Allow this device to send location data
              </div>
            </div>
            <Switch
              id="tracking"
              checked={trackingEnabled}
              onCheckedChange={setTrackingEnabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getStatusIcon(status?: string) {
  switch (status) {
    case "driving":
      return <Navigation className="w-3 h-3" />;
    case "parked":
      return <CheckCircle2 className="w-3 h-3" />;
    case "online":
      return <Wifi className="w-3 h-3" />;
    case "offline":
    default:
      return <WifiOff className="w-3 h-3" />;
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "driving":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "parked":
      return "bg-green-100 text-green-800 border-green-200";
    case "online":
      return "bg-green-100 text-green-800 border-green-200";
    case "offline":
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function formatLastSeen(dateStr?: string) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function DeviceManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<BouncieDevice | null>(null);

  // Fetch user's devices
  const { data: devicesData, isLoading: devicesLoading } = useQuery<{
    success: boolean;
    data: BouncieDevice[];
  }>({
    queryKey: ["/api/bouncie/devices"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/devices"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch devices");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch available cars
  const { data: carsData } = useQuery<{
    success: boolean;
    data: AvailableCar[];
  }>({
    queryKey: ["/api/bouncie/cars"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/cars"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch cars");
      return res.json();
    },
  });

  // Sync devices from Bouncie
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/devices/sync"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to sync devices");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/devices"] });
      toast({
        title: "Devices Synced",
        description: `${data.data?.synced || 0} device(s) synced from Bouncie`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update device settings
  const updateMutation = useMutation({
    mutationFn: async ({
      deviceId,
      updates,
    }: {
      deviceId: string;
      updates: any;
    }) => {
      // Handle car assignment separately
      if (updates.carId !== undefined) {
        const assignRes = await fetch(
          buildApiUrl(`/api/bouncie/devices/${deviceId}/assign`),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ carId: updates.carId }),
          }
        );
        if (!assignRes.ok) {
          const err = await assignRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to assign device");
        }
      }

      // Handle other settings
      const settingsUpdates = {
        nickname: updates.nickname,
        trackingEnabled: updates.trackingEnabled,
      };

      const settingsRes = await fetch(
        buildApiUrl(`/api/bouncie/devices/${deviceId}/settings`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(settingsUpdates),
        }
      );

      if (!settingsRes.ok) {
        const err = await settingsRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update settings");
      }

      return settingsRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/devices"] });
      toast({
        title: "Settings Updated",
        description: "Device settings saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove device
  const removeMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch(buildApiUrl(`/api/bouncie/devices/${deviceId}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove device");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/devices"] });
      toast({
        title: "Device Removed",
        description: "Device has been removed from your account",
      });
    },
    onError: (error) => {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const devices = devicesData?.data || [];
  const cars = carsData?.data || [];

  const handleDeviceSettings = (device: BouncieDevice) => {
    setSelectedDevice(device);
  };

  const handleSaveSettings = (deviceId: string, updates: any) => {
    updateMutation.mutate({ deviceId, updates });
  };

  const handleRemoveDevice = (device: BouncieDevice) => {
    if (
      confirm(
        `Remove device ${device.nickname || device.imei}? This will stop tracking for this device.`
      )
    ) {
      removeMutation.mutate(device.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">My Tracking Devices</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["/api/bouncie/devices"] })
                }
                disabled={devicesLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${devicesLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${
                    syncMutation.isPending ? "animate-spin" : ""
                  }`}
                />
                {syncMutation.isPending ? "Syncing..." : "Sync from Bouncie"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No devices found</p>
              <p className="text-sm mt-1">
                Click "Sync from Bouncie" to import your devices
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Status indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      device.status === "driving"
                        ? "bg-blue-500 animate-pulse"
                        : device.status === "online" || device.status === "parked"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />

                  {/* Device info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {device.nickname || `Device ${device.imei}`}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(device.status)}`}
                      >
                        {getStatusIcon(device.status)}
                        {device.status || "offline"}
                      </Badge>
                      {!device.trackingEnabled && (
                        <Badge variant="secondary" className="text-xs">
                          Tracking Disabled
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="font-mono">IMEI: {device.imei}</span>
                      
                      {device.lastSeen && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatLastSeen(device.lastSeen)}
                        </span>
                      )}
                      
                      {device.batteryLevel && (
                        <span className="flex items-center gap-1">
                          <Battery className="w-3 h-3" />
                          {device.batteryLevel}%
                        </span>
                      )}
                      
                      {device.location && (
                        <a
                          href={`https://www.google.com/maps?q=${device.location.latitude},${device.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline text-primary"
                        >
                          <MapPin className="w-3 h-3" />
                          View Map
                        </a>
                      )}
                    </div>

                    {device.carInfo && (
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        <Car className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Assigned to:</span>
                        <span className="font-medium">
                          {device.carInfo.year} {device.carInfo.make} {device.carInfo.model}
                        </span>
                        {device.carInfo.licensePlate && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {device.carInfo.licensePlate}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeviceSettings(device)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDevice(device)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeviceSettingsDialog
        device={selectedDevice}
        availableCars={cars}
        onClose={() => setSelectedDevice(null)}
        onSave={handleSaveSettings}
      />
    </>
  );
}