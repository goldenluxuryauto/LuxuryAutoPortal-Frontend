import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { buildApiUrl } from "@/lib/queryClient";
import {
  MapPin,
  Navigation,
  Car,
  Wifi,
  WifiOff,
  Battery,
  Clock,
  Gauge,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Maximize2,
  Play,
  Square,
  Route,
  Zap
} from "lucide-react";
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from "@/utils/googleMaps";

interface VehicleLocation {
  deviceId: string;
  imei: string;
  nickname?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: string;
    licensePlate?: string;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    timestamp: string;
  };
  status: 'online' | 'offline' | 'driving' | 'parked';
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  lastSeen: string;
  isOnTrip?: boolean;
  currentTrip?: {
    id: string;
    startTime: string;
    startLocation: string;
    distance: number;
    duration: number;
  };
  alerts?: Array<{
    type: 'speed' | 'geofence' | 'battery' | 'offline';
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface FleetMapData {
  vehicles: VehicleLocation[];
  center: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  summary: {
    total: number;
    online: number;
    driving: number;
    parked: number;
    offline: number;
    onTrip: number;
    alerts: number;
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "driving":
      return "bg-blue-500";
    case "parked":
      return "bg-green-500";
    case "online":
      return "bg-green-400";
    case "offline":
    default:
      return "bg-gray-400";
  }
}

function getStatusColorHex(status: string) {
  switch (status) {
    case "driving":
      return "#3b82f6";
    case "parked":
      return "#10b981";
    case "online":
      return "#4ade80";
    case "offline":
    default:
      return "#9ca3af";
  }
}

function getStatusIcon(status: string, size = 4) {
  const className = `w-${size} h-${size}`;
  switch (status) {
    case "driving":
      return <Navigation className={className} />;
    case "parked":
      return <CheckCircle2 className={className} />;
    case "online":
      return <Wifi className={className} />;
    case "offline":
    default:
      return <WifiOff className={className} />;
  }
}

function getAlertColor(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  if (miles < 1) {
    return `${Math.round(meters)} m`;
  }
  return `${miles.toFixed(1)} mi`;
}

function formatLastSeen(dateStr: string): string {
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

function VehicleMarker({ vehicle, onClick }: { vehicle: VehicleLocation; onClick: () => void }) {
  const statusColor = getStatusColor(vehicle.status);
  const hasAlerts = vehicle.alerts && vehicle.alerts.length > 0;
  const isMoving = vehicle.status === 'driving';
  
  return (
    <div
      className={`relative cursor-pointer transition-transform hover:scale-110 ${
        isMoving ? 'animate-pulse' : ''
      }`}
      onClick={onClick}
      style={{
        transform: vehicle.heading ? `rotate(${vehicle.heading}deg)` : undefined,
      }}
    >
      {/* Main marker */}
      <div className={`w-6 h-6 rounded-full border-2 border-white shadow-lg ${statusColor}`}>
        {hasAlerts && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        )}
      </div>
      
      {/* Speed indicator for moving vehicles */}
      {isMoving && vehicle.speed && vehicle.speed > 0 && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded font-bold">
            {Math.round(vehicle.speed)}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle }: { vehicle: VehicleLocation }) {
  const displayName = vehicle.nickname || 
    (vehicle.vehicleInfo ? 
      `${vehicle.vehicleInfo.year} ${vehicle.vehicleInfo.make} ${vehicle.vehicleInfo.model}` : 
      `Device ${vehicle.imei}`);
  
  const hasAlerts = vehicle.alerts && vehicle.alerts.length > 0;
  
  return (
    <Card className={`transition-all hover:shadow-md ${hasAlerts ? 'border-red-200 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)} ${
              vehicle.status === 'driving' ? 'animate-pulse' : ''
            }`} />
            <span className="font-medium text-sm">{displayName}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {getStatusIcon(vehicle.status, 3)}
            {hasAlerts && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>

        {/* Vehicle info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {vehicle.vehicleInfo?.licensePlate && (
            <div className="flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span className="font-mono">{vehicle.vehicleInfo.licensePlate}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatLastSeen(vehicle.lastSeen)}</span>
          </div>
          
          {vehicle.batteryLevel && (
            <div className="flex items-center gap-1">
              <Battery className="w-3 h-3" />
              <span>{vehicle.batteryLevel}%</span>
            </div>
          )}
          
          {vehicle.speed !== undefined && vehicle.speed > 0 && (
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>{Math.round(vehicle.speed)} mph</span>
            </div>
          )}
        </div>

        {/* Current trip */}
        {vehicle.isOnTrip && vehicle.currentTrip && (
          <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
            <div className="flex items-center gap-1 text-xs font-medium text-blue-800">
              <Route className="w-3 h-3" />
              <span>Active Trip</span>
            </div>
            <div className="text-xs text-blue-700 mt-1">
              <div>{formatDistance(vehicle.currentTrip.distance)} • {formatDuration(vehicle.currentTrip.duration)}</div>
              <div className="truncate">{vehicle.currentTrip.startLocation}</div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {hasAlerts && (
          <div className="mt-2 space-y-1">
            {vehicle.alerts?.slice(0, 2).map((alert, index) => (
              <div
                key={index}
                className={`text-xs px-2 py-1 rounded border ${getAlertColor(alert.severity)}`}
              >
                <div className="font-medium">{alert.type.toUpperCase()}</div>
                <div>{alert.message}</div>
              </div>
            ))}
            {vehicle.alerts && vehicle.alerts.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{vehicle.alerts.length - 2} more alerts
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              const url = `https://www.google.com/maps?q=${vehicle.location.latitude},${vehicle.location.longitude}`;
              window.open(url, '_blank');
            }}
          >
            <MapPin className="w-3 h-3 mr-1" />
            View Map
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FleetMap() {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapView, setMapView] = useState<'satellite' | 'roadmap'>('roadmap');
  const [showOffline, setShowOffline] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [realtimeTracking, setRealtimeTracking] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMapsAPI()
      .then(() => {
        setIsGoogleMapsLoaded(true);
        setMapError(null);
      })
      .catch((error) => {
        setMapError(error.message);
        setIsGoogleMapsLoaded(false);
      });
  }, []);

  // Fetch real-time fleet data with enhanced tracking
  const { data, isLoading, error } = useQuery<{ success: boolean; data: FleetMapData & { realtimeStatus?: any } }>({
    queryKey: ["/api/realtime/fleet"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/realtime/fleet"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch fleet data");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false, // 10 second updates for real-time
    refetchIntervalInBackground: true,
  });

  // Check real-time tracking status
  const { data: trackingStatus } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/realtime/status"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/realtime/status"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tracking status");
      return res.json();
    },
    refetchInterval: 30000, // Check status every 30 seconds
    enabled: autoRefresh,
  });

  const fleetData = data?.data;
  const vehicles = fleetData?.vehicles?.filter(v => showOffline || v.status !== 'offline') || [];
  const summary = fleetData?.summary;
  const realtimeStatus = fleetData?.realtimeStatus;

  // Update real-time tracking state
  useEffect(() => {
    if (trackingStatus?.data) {
      setRealtimeTracking(trackingStatus.data.isRunning);
      if (trackingStatus.data.lastSync) {
        setLastSyncTime(new Date(trackingStatus.data.lastSync).toLocaleTimeString());
      }
    }
    if (realtimeStatus?.lastSync) {
      setLastSyncTime(new Date(realtimeStatus.lastSync).toLocaleTimeString());
    }
  }, [trackingStatus, realtimeStatus]);

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || !isGoogleMapsLoaded || mapError) return;

    if (!fleetData) {
      console.warn("No fleet data available for map");
      return;
    }

    try {
      // Default to Salt Lake City if no center provided
      const mapCenter = {
        lat: fleetData.center?.latitude || 40.7831,
        lng: fleetData.center?.longitude || -111.9836,
      };

      const map = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: fleetData.center?.zoom || 12,
        mapTypeId: mapView,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      // Add vehicle markers
      vehicles.forEach((vehicle) => {
        // Validate coordinates
        if (!vehicle.location?.latitude || !vehicle.location?.longitude) {
          console.warn(`Invalid coordinates for vehicle ${vehicle.imei}:`, vehicle.location);
          return;
        }

        const marker = new window.google.maps.Marker({
          position: {
            lat: vehicle.location.latitude,
            lng: vehicle.location.longitude,
          },
          map: map,
          title: vehicle.nickname || `Device ${vehicle.imei}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: vehicle.status === 'driving' ? 10 : 8,
            fillColor: getStatusColorHex(vehicle.status),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        // Add click handler
        marker.addListener('click', () => {
          setSelectedVehicle(vehicle);
          
          // Create info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${vehicle.nickname || `Device ${vehicle.imei}`}</div>
                <div style="font-size: 14px; color: #666;">
                  <div><strong>Status:</strong> ${vehicle.status}</div>
                  ${vehicle.speed ? `<div><strong>Speed:</strong> ${Math.round(vehicle.speed)} mph</div>` : ''}
                  ${vehicle.batteryLevel ? `<div><strong>Battery:</strong> ${vehicle.batteryLevel}%</div>` : ''}
                  <div><strong>Last seen:</strong> ${formatLastSeen(vehicle.lastSeen)}</div>
                </div>
                ${vehicle.location.address ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">${vehicle.location.address}</div>` : ''}
              </div>
            `,
          });
          
          infoWindow.open(map, marker);
        });
      });

      console.log(`✅ Map initialized with ${vehicles.length} vehicle markers`);

    } catch (error) {
      console.error("Error initializing Google Map:", error);
      setMapError(`Map initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  }, [fleetData, vehicles, mapView, isGoogleMapsLoaded, mapError]);

  // Real-time tracking controls
  const startTracking = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/realtime/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ intervalMs: 30000 })
      });
      if (res.ok) {
        setRealtimeTracking(true);
        queryClient.invalidateQueries({ queryKey: ["/api/realtime/status"] });
      }
    } catch (error) {
      console.error("Error starting tracking:", error);
    }
  };

  const stopTracking = async () => {
    try {
      const res = await fetch(buildApiUrl("/api/realtime/stop"), {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        setRealtimeTracking(false);
        queryClient.invalidateQueries({ queryKey: ["/api/realtime/status"] });
      }
    } catch (error) {
      console.error("Error stopping tracking:", error);
    }
  };

  const forceSyncNow = async () => {
    try {
      await fetch(buildApiUrl("/api/realtime/sync"), {
        method: "POST",
        credentials: "include"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/realtime/fleet"] });
    } catch (error) {
      console.error("Error forcing sync:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        <span>Loading fleet data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
        <p>Failed to load fleet monitoring data</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-live"] })}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fleet Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{summary?.total || 0}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary?.driving || 0}</div>
            <div className="text-sm text-muted-foreground">Driving</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary?.parked || 0}</div>
            <div className="text-sm text-muted-foreground">Parked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{summary?.offline || 0}</div>
            <div className="text-sm text-muted-foreground">Offline</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{summary?.onTrip || 0}</div>
            <div className="text-sm text-muted-foreground">On Trip</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary?.alerts || 0}</div>
            <div className="text-sm text-muted-foreground">Alerts</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh (15s)
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="show-offline"
              checked={showOffline}
              onCheckedChange={setShowOffline}
            />
            <Label htmlFor="show-offline" className="text-sm">
              Show offline
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMapView(mapView === 'roadmap' ? 'satellite' : 'roadmap')}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            {mapView === 'roadmap' ? 'Satellite' : 'Roadmap'}
          </Button>

          <Button
            variant={realtimeTracking ? "default" : "outline"}
            size="sm"
            onClick={realtimeTracking ? stopTracking : startTracking}
          >
            {realtimeTracking ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Real-time
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Real-time
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={forceSyncNow}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Now
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Live Fleet Map
                {realtimeTracking && !mapError && (
                  <Badge variant="default" className="ml-2">
                    <Zap className="w-3 h-3 mr-1" />
                    Real-time
                  </Badge>
                )}
                {autoRefresh && !realtimeTracking && !mapError && (
                  <Badge variant="secondary" className="ml-2">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Auto-refresh
                  </Badge>
                )}
                {lastSyncTime && (
                  <span className="text-sm text-muted-foreground ml-auto">
                    Last sync: {lastSyncTime}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mapError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-96">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                  <h4 className="font-medium mb-2">Map Unavailable</h4>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    {mapError}
                  </p>
                  <div className="space-y-2 text-xs text-left bg-gray-50 p-4 rounded border">
                    <p><strong>To fix this:</strong></p>
                    <p>1. Get a Google Maps API key from Google Cloud Console</p>
                    <p>2. Add it to <code>.env.local</code> as <code>REACT_APP_GOOGLE_MAPS_API_KEY</code></p>
                    <p>3. Restart the development server</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                </div>
              ) : !isGoogleMapsLoaded ? (
                <div className="flex items-center justify-center p-8 h-96">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                  <span>Loading Google Maps...</span>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-96">
                  <Car className="w-12 h-12 text-gray-400 mb-4" />
                  <h4 className="font-medium mb-2">No Vehicles to Display</h4>
                  <p className="text-sm text-muted-foreground">
                    {fleetData?.summary?.total === 0 
                      ? "No vehicles found. Make sure your Bouncie devices are connected."
                      : showOffline 
                        ? "All vehicles are currently offline."
                        : "No online vehicles found. Toggle 'Show offline' to see all vehicles."
                    }
                  </p>
                </div>
              ) : (
                <div
                  ref={mapRef}
                  className="w-full h-96 rounded-b-lg"
                  style={{ minHeight: "400px" }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vehicle Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fleet Status</h3>
            <Badge variant="outline">
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No vehicles {showOffline ? 'found' : 'online'}</p>
              </div>
            ) : (
              vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.deviceId} vehicle={vehicle} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}