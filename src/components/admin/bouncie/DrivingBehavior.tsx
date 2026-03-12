import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Progress } from "@/components/ui/progress";
import { buildApiUrl } from "@/lib/queryClient";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Gauge,
  Square,
  RotateCcw,
  Clock,
  MapPin,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Car,
  Target,
  Activity,
  Award,
  Zap,
  Timer,
  Navigation,
  Users
} from "lucide-react";

interface DrivingEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  eventType: 'hard_brake' | 'hard_accel' | 'speeding' | 'sharp_turn' | 'idle_excessive' | 'rapid_lane_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  details: string;
  duration?: number; // seconds, for events like speeding or idling
  gForce?: number; // G-force for acceleration/braking events
  rpm?: number; // Engine RPM if available
  address?: string; // Reverse geocoded address
}

interface DrivingScore {
  overall: number; // 0-100
  speeding: number;
  acceleration: number;
  braking: number;
  turning: number;
  idling: number;
  trend: 'improving' | 'declining' | 'stable';
  previousScore?: number;
}

interface DrivingBehaviorReport {
  deviceId: string;
  deviceName: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: string;
    licensePlate?: string;
  };
  period: {
    startDate: string;
    endDate: string;
    totalTrips: number;
    totalDistance: number; // meters
    totalDuration: number; // seconds
  };
  score: DrivingScore;
  events: DrivingEvent[];
  patterns: {
    peakEventHours: number[]; // Hours of day with most events (0-23)
    commonEventTypes: Array<{ type: string; count: number; percentage: number }>;
    riskAreas: Array<{
      latitude: number;
      longitude: number;
      address?: string;
      eventCount: number;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  };
  recommendations: Array<{
    type: 'improvement' | 'caution' | 'praise';
    category: 'speed' | 'acceleration' | 'braking' | 'turns' | 'general';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

interface BehaviorFilters {
  deviceId?: string;
  startDate: string;
  endDate: string;
  eventTypes?: string[];
  severityLevels?: string[];
  minScore?: number;
  maxScore?: number;
}

function getEventTypeIcon(type: string, size = 4) {
  const className = `w-${size} h-${size}`;
  switch (type) {
    case 'hard_brake':
      return <Square className={`${className} text-red-500`} />;
    case 'hard_accel':
      return <TrendingUp className={`${className} text-yellow-500`} />;
    case 'speeding':
      return <Gauge className={`${className} text-red-600`} />;
    case 'sharp_turn':
      return <RotateCcw className={`${className} text-orange-500`} />;
    case 'idle_excessive':
      return <Timer className={`${className} text-blue-500`} />;
    case 'rapid_lane_change':
      return <Navigation className={`${className} text-purple-500`} />;
    default:
      return <AlertTriangle className={`${className} text-gray-500`} />;
  }
}

function getEventTypeLabel(type: string): string {
  switch (type) {
    case 'hard_brake':
      return 'Hard Braking';
    case 'hard_accel':
      return 'Hard Acceleration';
    case 'speeding':
      return 'Speeding';
    case 'sharp_turn':
      return 'Sharp Turn';
    case 'idle_excessive':
      return 'Excessive Idling';
    case 'rapid_lane_change':
      return 'Rapid Lane Change';
    default:
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-700';
    case 'high':
      return 'text-red-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-green-500';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Poor';
  return 'Critical';
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    case 'stable':
    default:
      return <Activity className="w-4 h-4 text-gray-600" />;
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  if (miles < 1) {
    return `${Math.round(meters)} m`;
  }
  return `${miles.toFixed(1)} mi`;
}

function getRecommendationIcon(type: string) {
  switch (type) {
    case 'improvement':
      return <Target className="w-4 h-4 text-blue-600" />;
    case 'caution':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case 'praise':
      return <Award className="w-4 h-4 text-green-600" />;
    default:
      return <Activity className="w-4 h-4 text-gray-600" />;
  }
}

function DrivingScoreCard({ score }: { score: DrivingScore }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Driving Safety Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getScoreColor(score.overall)}`}>
            {score.overall}
          </div>
          <div className="text-sm text-muted-foreground">
            {getScoreLabel(score.overall)}
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            {getTrendIcon(score.trend)}
            <span className="text-xs text-muted-foreground capitalize">
              {score.trend}
              {score.previousScore && (
                <span className="ml-1">
                  ({score.overall > score.previousScore ? '+' : ''}{score.overall - score.previousScore})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Speed Management</span>
              <span className={getScoreColor(score.speeding)}>{score.speeding}/100</span>
            </div>
            <Progress value={score.speeding} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Acceleration Control</span>
              <span className={getScoreColor(score.acceleration)}>{score.acceleration}/100</span>
            </div>
            <Progress value={score.acceleration} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Braking Smoothness</span>
              <span className={getScoreColor(score.braking)}>{score.braking}/100</span>
            </div>
            <Progress value={score.braking} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Cornering Safety</span>
              <span className={getScoreColor(score.turning)}>{score.turning}/100</span>
            </div>
            <Progress value={score.turning} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Idle Efficiency</span>
              <span className={getScoreColor(score.idling)}>{score.idling}/100</span>
            </div>
            <Progress value={score.idling} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DrivingBehavior() {
  const [filters, setFilters] = useState<BehaviorFilters>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    eventTypes: [],
    severityLevels: [],
  });

  // Fetch driving behavior reports
  const { data: reportsData, isLoading } = useQuery<{ success: boolean; data: DrivingBehaviorReport[] }>({
    queryKey: ["/api/bouncie/driving-behavior", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const res = await fetch(buildApiUrl(`/api/bouncie/driving-behavior?${params.toString()}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch driving behavior data");
      return res.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  const reports = reportsData?.data || [];

  // Calculate fleet-wide statistics
  const fleetStats = reports.reduce(
    (acc, report) => ({
      totalEvents: acc.totalEvents + report.events.length,
      avgScore: acc.avgScore + report.score.overall,
      totalDistance: acc.totalDistance + report.period.totalDistance,
      totalTrips: acc.totalTrips + report.period.totalTrips,
      riskEvents: acc.riskEvents + report.events.filter(e => e.severity === 'high' || e.severity === 'critical').length,
    }),
    { totalEvents: 0, avgScore: 0, totalDistance: 0, totalTrips: 0, riskEvents: 0 }
  );

  if (reports.length > 0) {
    fleetStats.avgScore = fleetStats.avgScore / reports.length;
  }

  const exportBehaviorData = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/bouncie/driving-behavior/export'), {
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
      a.download = `driving-behavior-${new Date().toISOString().split('T')[0]}.csv`;
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
            Driving Behavior Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-score">Min Score</Label>
              <Input
                id="min-score"
                type="number"
                placeholder="0"
                min="0"
                max="100"
                value={filters.minScore || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minScore: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-score">Max Score</Label>
              <Input
                id="max-score"
                type="number"
                placeholder="100"
                min="0"
                max="100"
                value={filters.maxScore || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  maxScore: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={exportBehaviorData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-sm text-muted-foreground">Vehicles Analyzed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${getScoreColor(fleetStats.avgScore)}`}>
              {Math.round(fleetStats.avgScore)}/100
            </div>
            <div className="text-sm text-muted-foreground">Fleet Avg Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{fleetStats.totalEvents}</div>
            <div className="text-sm text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{fleetStats.riskEvents}</div>
            <div className="text-sm text-muted-foreground">High-Risk Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatDistance(fleetStats.totalDistance)}</div>
            <div className="text-sm text-muted-foreground">Total Distance</div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Reports */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mr-3" />
          <span>Analyzing driving behavior...</span>
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Car className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">No driving data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adjust your filters or ensure vehicles have completed trips in the selected period
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <Card key={report.deviceId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      {report.deviceName}
                      {report.vehicleInfo && (
                        <Badge variant="outline">
                          {report.vehicleInfo.year} {report.vehicleInfo.make} {report.vehicleInfo.model}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDistance(report.period.totalDistance)} • {report.period.totalTrips} trips • {formatDuration(report.period.totalDuration)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Driving Score */}
                  <DrivingScoreCard score={report.score} />

                  {/* Event Patterns */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Event Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Common Events</h4>
                        {report.patterns.commonEventTypes.slice(0, 4).map((pattern, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {getEventTypeIcon(pattern.type)}
                              <span>{getEventTypeLabel(pattern.type)}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{pattern.count}</div>
                              <div className="text-xs text-muted-foreground">{pattern.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {report.patterns.peakEventHours.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Peak Risk Hours</h4>
                          <div className="flex flex-wrap gap-1">
                            {report.patterns.peakEventHours.map(hour => (
                              <Badge key={hour} variant="outline" className="text-xs">
                                {hour}:00-{hour + 1}:00
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {report.recommendations.slice(0, 4).map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          {getRecommendationIcon(rec.type)}
                          <div className="flex-1">
                            <div className={`font-medium ${
                              rec.type === 'improvement' ? 'text-blue-700' :
                              rec.type === 'caution' ? 'text-yellow-700' : 'text-green-700'
                            }`}>
                              {rec.message}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {rec.category} • {rec.priority} priority
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Events */}
                {report.events.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recent Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {report.events.slice(0, 8).map((event) => (
                          <div key={event.id} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getEventTypeIcon(event.eventType)}
                              
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm">{getEventTypeLabel(event.eventType)}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {event.details}
                                  <span className="ml-2">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                {event.address && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    📍 {event.address}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {event.speed && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(event.speed)} mph
                                </Badge>
                              )}
                              <Badge className={getSeverityBadgeColor(event.severity)}>
                                {event.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {report.events.length > 8 && (
                          <div className="text-center text-sm text-muted-foreground">
                            +{report.events.length - 8} more events
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}