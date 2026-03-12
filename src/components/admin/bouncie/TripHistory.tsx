import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildApiUrl } from "@/lib/queryClient";
import {
  Calendar,
  MapPin,
  Route,
  Clock,
  Gauge,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Navigation,
  Fuel,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Car,
  Timer,
  Zap,
  Target,
  Activity
} from "lucide-react";

interface TripData {
  id: string;
  deviceId: string;
  deviceName: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: string;
    licensePlate?: string;
  };
  startTime: string;
  endTime: string;
  startLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  endLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  distance: number; // meters
  duration: number; // seconds
  maxSpeed: number; // mph
  averageSpeed: number; // mph
  fuelUsed?: number; // gallons
  waypoints: Array<{
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp: string;
    accuracy?: number;
  }>;
  drivingEvents: Array<{
    type: 'hard_brake' | 'hard_accel' | 'speeding' | 'sharp_turn';
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
    latitude: number;
    longitude: number;
    speed?: number;
    details: string;
  }>;
  geofenceEvents: Array<{
    type: 'enter' | 'exit';
    geofenceName: string;
    timestamp: string;
    latitude: number;
    longitude: number;
  }>;
  score?: {
    overall: number; // 0-100
    speeding: number;
    acceleration: number;
    braking: number;
    turning: number;
  };
}

interface TripFilters {
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  minDistance?: number;
  maxDistance?: number;
  minDuration?: number;
  maxDuration?: number;
  includeGeofenceEvents?: boolean;
  includeDrivingEvents?: boolean;
}

interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number; // 1x, 2x, 5x, 10x
  showRoute: boolean;
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

function formatSpeed(mph: number): string {
  return `${Math.round(mph)} mph`;
}

function getDrivingEventIcon(type: string) {
  switch (type) {
    case 'hard_brake':
      return <Square className="w-4 h-4 text-red-500" />;
    case 'hard_accel':
      return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    case 'speeding':
      return <Gauge className="w-4 h-4 text-red-600" />;
    case 'sharp_turn':
      return <Navigation className="w-4 h-4 text-orange-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-500" />;
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

function getScoreBadgeColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

interface TripPlaybackProps {
  trip: TripData;
  isOpen: boolean;
  onClose: () => void;
}

function TripPlayback({ trip, isOpen, onClose }: TripPlaybackProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentIndex: 0,
    speed: 1,
    showRoute: true
  });
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [routePath, setRoutePath] = useState<any>(null);
  const [currentMarker, setCurrentMarker] = useState<any>(null);

  // Initialize map when dialog opens
  useEffect(() => {
    if (!isOpen || !mapRef.current || !window.google || !trip.waypoints.length) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: {
        lat: trip.startLocation.latitude,
        lng: trip.startLocation.longitude,
      },
      zoom: 14,
      mapTypeId: 'roadmap',
    });

    setMapInstance(map);

    // Draw route
    if (playbackState.showRoute && trip.waypoints.length > 1) {
      const path = trip.waypoints.map(wp => ({
        lat: wp.latitude,
        lng: wp.longitude
      }));

      const polyline = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 3,
      });

      polyline.setMap(map);
      setRoutePath(polyline);

      // Fit map to route bounds
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);
    }

    // Add start/end markers
    new window.google.maps.Marker({
      position: { lat: trip.startLocation.latitude, lng: trip.startLocation.longitude },
      map: map,
      title: 'Trip Start',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    new window.google.maps.Marker({
      position: { lat: trip.endLocation.latitude, lng: trip.endLocation.longitude },
      map: map,
      title: 'Trip End',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    // Add driving event markers
    trip.drivingEvents.forEach(event => {
      const marker = new window.google.maps.Marker({
        position: { lat: event.latitude, lng: event.longitude },
        map: map,
        title: event.details,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: event.severity === 'high' ? '#ef4444' : event.severity === 'medium' ? '#f59e0b' : '#6b7280',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <div class="font-semibold">${event.type.replace('_', ' ').toUpperCase()}</div>
            <div class="text-sm">${event.details}</div>
            <div class="text-xs text-gray-500">${new Date(event.timestamp).toLocaleTimeString()}</div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

    // Initialize current position marker
    if (trip.waypoints.length > 0) {
      const initialMarker = new window.google.maps.Marker({
        position: {
          lat: trip.waypoints[0].latitude,
          lng: trip.waypoints[0].longitude
        },
        map: map,
        title: 'Current Position',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
      setCurrentMarker(initialMarker);
    }

    return () => {
      if (routePath) routePath.setMap(null);
      if (currentMarker) currentMarker.setMap(null);
    };
  }, [isOpen, trip, playbackState.showRoute]);

  // Playback control
  useEffect(() => {
    if (!playbackState.isPlaying || !currentMarker || !trip.waypoints.length) return;

    const interval = setInterval(() => {
      setPlaybackState(prev => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= trip.waypoints.length) {
          return { ...prev, isPlaying: false, currentIndex: trip.waypoints.length - 1 };
        }
        return { ...prev, currentIndex: nextIndex };
      });
    }, 1000 / playbackState.speed);

    return () => clearInterval(interval);
  }, [playbackState.isPlaying, playbackState.speed, currentMarker, trip.waypoints.length]);

  // Update marker position
  useEffect(() => {
    if (!currentMarker || !trip.waypoints.length || playbackState.currentIndex >= trip.waypoints.length) return;

    const waypoint = trip.waypoints[playbackState.currentIndex];
    const position = new window.google.maps.LatLng(waypoint.latitude, waypoint.longitude);
    currentMarker.setPosition(position);
    
    if (mapInstance) {
      mapInstance.panTo(position);
    }
  }, [playbackState.currentIndex, currentMarker, mapInstance, trip.waypoints]);

  const togglePlayback = () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const resetPlayback = () => {
    setPlaybackState(prev => ({ ...prev, isPlaying: false, currentIndex: 0 }));
  };

  const changeSpeed = (speed: number) => {
    setPlaybackState(prev => ({ ...prev, speed }));
  };

  const currentWaypoint = trip.waypoints[playbackState.currentIndex];
  const progress = (playbackState.currentIndex / (trip.waypoints.length - 1)) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Trip Playback - {trip.deviceName}
          </DialogTitle>
          <DialogDescription>
            {new Date(trip.startTime).toLocaleString()} → {new Date(trip.endTime).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-full">
          {/* Map */}
          <div className="flex-1">
            <div ref={mapRef} className="w-full h-full rounded-lg" />
          </div>

          {/* Controls & Info */}
          <div className="w-80 space-y-4 overflow-y-auto">
            {/* Playback Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Playback Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resetPlayback}
                    disabled={playbackState.currentIndex === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={togglePlayback}
                    disabled={trip.waypoints.length === 0}
                  >
                    {playbackState.isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPlaybackState(prev => ({ 
                      ...prev, 
                      currentIndex: Math.min(prev.currentIndex + 10, trip.waypoints.length - 1) 
                    }))}
                    disabled={playbackState.currentIndex >= trip.waypoints.length - 1}
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Speed</span>
                    <span>{playbackState.speed}x</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 5, 10].map(speed => (
                      <Button
                        key={speed}
                        size="sm"
                        variant={playbackState.speed === speed ? "default" : "outline"}
                        onClick={() => changeSpeed(speed)}
                        className="flex-1 text-xs"
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{playbackState.currentIndex + 1}</span>
                    <span>{trip.waypoints.length} points</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Position Info */}
            {currentWaypoint && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current Position</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{new Date(currentWaypoint.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {currentWaypoint.speed && (
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span className="font-mono">{Math.round(currentWaypoint.speed)} mph</span>
                    </div>
                  )}
                  {currentWaypoint.heading && (
                    <div className="flex justify-between">
                      <span>Heading:</span>
                      <span className="font-mono">{Math.round(currentWaypoint.heading)}°</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-mono text-xs">
                      {currentWaypoint.latitude.toFixed(6)}, {currentWaypoint.longitude.toFixed(6)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trip Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span className="font-medium">{formatDistance(trip.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{formatDuration(trip.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Speed:</span>
                  <span className="font-medium">{formatSpeed(trip.maxSpeed)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Speed:</span>
                  <span className="font-medium">{formatSpeed(trip.averageSpeed)}</span>
                </div>
                {trip.score && (
                  <div className="flex justify-between">
                    <span>Safety Score:</span>
                    <span className={`font-medium ${getScoreColor(trip.score.overall)}`}>
                      {trip.score.overall}/100
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Driving Events */}
            {trip.drivingEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Driving Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {trip.drivingEvents.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {getDrivingEventIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{event.details}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge variant={
                        event.severity === 'high' ? 'destructive' :
                        event.severity === 'medium' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {event.severity}
                      </Badge>
                    </div>
                  ))}
                  {trip.drivingEvents.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{trip.drivingEvents.length - 5} more events
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TripHistoryProps {
  deviceId?: string;
}

export function TripHistory({ deviceId }: TripHistoryProps) {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState<TripData | null>(null);
  const [filters, setFilters] = useState<TripFilters>({
    deviceId: deviceId || undefined,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeGeofenceEvents: true,
    includeDrivingEvents: true,
  });

  // Fetch trips with filters
  const { data: tripsData, isLoading } = useQuery<{ success: boolean; data: TripData[] }>({
    queryKey: ["/api/bouncie/trips", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const res = await fetch(buildApiUrl(`/api/bouncie/trips?${params.toString()}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch trip history");
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const trips = tripsData?.data || [];

  // Calculate aggregated statistics
  const stats = trips.reduce(
    (acc, trip) => ({
      totalDistance: acc.totalDistance + trip.distance,
      totalDuration: acc.totalDuration + trip.duration,
      totalTrips: acc.totalTrips + 1,
      avgScore: trip.score ? acc.avgScore + trip.score.overall : acc.avgScore,
      drivingEvents: acc.drivingEvents + trip.drivingEvents.length,
    }),
    { totalDistance: 0, totalDuration: 0, totalTrips: 0, avgScore: 0, drivingEvents: 0 }
  );

  if (stats.totalTrips > 0) {
    stats.avgScore = stats.avgScore / trips.filter(t => t.score).length || 0;
  }

  const exportTrips = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/bouncie/trips/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(filters),
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `trip-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Trip Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="device">Device</Label>
              <Select
                value={filters.deviceId || "all"}
                onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, deviceId: value === "all" ? undefined : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  {/* Device options would be populated from API */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-distance">Min Distance (mi)</Label>
              <Input
                id="min-distance"
                type="number"
                placeholder="0"
                value={filters.minDistance || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minDistance: e.target.value ? parseFloat(e.target.value) * 1609.34 : undefined 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-duration">Min Duration (min)</Label>
              <Input
                id="min-duration"
                type="number"
                placeholder="0"
                value={filters.minDuration || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minDuration: e.target.value ? parseInt(e.target.value) * 60 : undefined 
                }))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bouncie/trips"] })}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportTrips}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.totalTrips}</div>
            <div className="text-sm text-muted-foreground">Total Trips</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatDistance(stats.totalDistance)}</div>
            <div className="text-sm text-muted-foreground">Total Distance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
            <div className="text-sm text-muted-foreground">Total Duration</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {Math.round(stats.avgScore)}/100
            </div>
            <div className="text-sm text-muted-foreground">Avg Safety Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.drivingEvents}</div>
            <div className="text-sm text-muted-foreground">Driving Events</div>
          </CardContent>
        </Card>
      </div>

      {/* Trip List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Trip Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-3" />
              <span>Loading trip history...</span>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No trips found</p>
              <p className="text-sm mt-1">Adjust your filters to see trip data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trip.deviceName}</span>
                        {trip.vehicleInfo && (
                          <Badge variant="outline">
                            {trip.vehicleInfo.year} {trip.vehicleInfo.make} {trip.vehicleInfo.model}
                          </Badge>
                        )}
                        {trip.score && (
                          <Badge className={getScoreBadgeColor(trip.score.overall)}>
                            Score: {trip.score.overall}/100
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {new Date(trip.startTime).toLocaleString()} → {new Date(trip.endTime).toLocaleString()}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Route className="w-4 h-4" />
                          {formatDistance(trip.distance)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(trip.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          Max {formatSpeed(trip.maxSpeed)}
                        </div>
                        {trip.drivingEvents.length > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            {trip.drivingEvents.length} events
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <div className="text-muted-foreground">
                          From: {trip.startLocation.address || `${trip.startLocation.latitude.toFixed(4)}, ${trip.startLocation.longitude.toFixed(4)}`}
                        </div>
                        <div className="text-muted-foreground">
                          To: {trip.endLocation.address || `${trip.endLocation.latitude.toFixed(4)}, ${trip.endLocation.longitude.toFixed(4)}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Play className="w-4 h-4 mr-1" />
                        Playback
                      </Button>
                      <Button size="sm" variant="ghost">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Playback Dialog */}
      {selectedTrip && (
        <TripPlayback
          trip={selectedTrip}
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}