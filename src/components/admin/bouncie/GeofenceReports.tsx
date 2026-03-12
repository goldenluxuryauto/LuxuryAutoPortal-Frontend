import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Target,
  MapPin,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Clock,
  Car,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Settings,
  Plane,
  Building,
  Home,
  ShoppingCart
} from "lucide-react";

interface Geofence {
  id: string;
  name: string;
  description?: string;
  type: 'circle' | 'polygon';
  centerLatitude?: number;
  centerLongitude?: number;
  radius?: number; // meters
  polygonPoints?: Array<{ latitude: number; longitude: number }>;
  isActive: boolean;
  notifyEnter: boolean;
  notifyExit: boolean;
  createdAt: string;
  updatedAt: string;
  category?: 'airport' | 'depot' | 'customer' | 'service' | 'restricted' | 'other';
}

interface GeofenceEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  geofenceId: string;
  geofenceName: string;
  violationType: 'enter' | 'exit';
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
  processed: boolean;
  duration?: number; // seconds spent inside (for exit events)
}

interface GeofenceReport {
  geofence: Geofence;
  events: GeofenceEvent[];
  statistics: {
    totalEnters: number;
    totalExits: number;
    averageDuration: number; // seconds
    uniqueVehicles: number;
    lastActivity?: string;
  };
}

interface GeofenceDialogProps {
  geofence: Geofence | null;
  onClose: () => void;
  onSave: (geofence: Partial<Geofence>) => void;
}

function GeofenceDialog({ geofence, onClose, onSave }: GeofenceDialogProps) {
  const [formData, setFormData] = useState<Partial<Geofence>>({
    name: geofence?.name || '',
    description: geofence?.description || '',
    type: geofence?.type || 'circle',
    centerLatitude: geofence?.centerLatitude || 40.7608,
    centerLongitude: geofence?.centerLongitude || -111.8910,
    radius: geofence?.radius || 1000,
    isActive: geofence?.isActive ?? true,
    notifyEnter: geofence?.notifyEnter ?? true,
    notifyExit: geofence?.notifyExit ?? true,
    category: geofence?.category || 'other',
  });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'airport':
        return <Plane className="w-4 h-4" />;
      case 'depot':
        return <Building className="w-4 h-4" />;
      case 'customer':
        return <Home className="w-4 h-4" />;
      case 'service':
        return <Settings className="w-4 h-4" />;
      case 'restricted':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={!!geofence || geofence === null} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {geofence ? 'Edit Geofence' : 'Create New Geofence'}
          </DialogTitle>
          <DialogDescription>
            Define a geographical area for monitoring vehicle entry and exit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Geofence Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Salt Lake Airport"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of the area"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airport">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    Airport
                  </div>
                </SelectItem>
                <SelectItem value="depot">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Depot/Garage
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Customer Location
                  </div>
                </SelectItem>
                <SelectItem value="service">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Service Area
                  </div>
                </SelectItem>
                <SelectItem value="restricted">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Restricted Zone
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Other
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={formData.centerLatitude}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  centerLatitude: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={formData.centerLongitude}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  centerLongitude: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="radius">Radius (meters)</Label>
            <Input
              id="radius"
              type="number"
              value={formData.radius}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                radius: parseInt(e.target.value) || 0 
              }))}
            />
            <div className="text-xs text-muted-foreground">
              {formData.radius && `${(formData.radius * 0.000621371).toFixed(2)} miles`}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active</Label>
                <div className="text-sm text-muted-foreground">
                  Monitor vehicles in this area
                </div>
              </div>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-enter">Notify on Enter</Label>
                <div className="text-sm text-muted-foreground">
                  Send alerts when vehicles enter
                </div>
              </div>
              <Switch
                id="notify-enter"
                checked={formData.notifyEnter}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyEnter: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-exit">Notify on Exit</Label>
                <div className="text-sm text-muted-foreground">
                  Send alerts when vehicles exit
                </div>
              </div>
              <Switch
                id="notify-exit"
                checked={formData.notifyExit}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notifyExit: checked }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            {geofence ? 'Update' : 'Create'} Geofence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

function getEventTypeColor(type: 'enter' | 'exit'): string {
  return type === 'enter' ? 'text-green-600' : 'text-red-600';
}

function getEventTypeBadge(type: 'enter' | 'exit'): string {
  return type === 'enter' ? 
    'bg-green-100 text-green-800 border-green-200' : 
    'bg-red-100 text-red-800 border-red-200';
}

export function GeofenceReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: 'all',
    activeOnly: true,
  });

  // Fetch geofences
  const { data: geofencesData } = useQuery<{ success: boolean; data: Geofence[] }>({
    queryKey: ["/api/bouncie/geofences"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/geofences"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch geofences");
      return res.json();
    },
  });

  // Fetch geofence reports with filters
  const { data: reportsData, isLoading } = useQuery<{ success: boolean; data: GeofenceReport[] }>({
    queryKey: ["/api/bouncie/geofence-reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== 'all') {
          params.append(key, value.toString());
        }
      });

      const res = await fetch(buildApiUrl(`/api/bouncie/geofence-reports?${params.toString()}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch geofence reports");
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Create/update geofence
  const createGeofenceMutation = useMutation({
    mutationFn: async (geofenceData: Partial<Geofence>) => {
      const res = await fetch(buildApiUrl("/api/bouncie/geofences"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(geofenceData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create geofence");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofence-reports"] });
      toast({ title: "Success", description: "Geofence created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Geofence> & { id: string }) => {
      const res = await fetch(buildApiUrl(`/api/bouncie/geofences/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update geofence");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofence-reports"] });
      toast({ title: "Success", description: "Geofence updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(buildApiUrl(`/api/bouncie/geofences/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete geofence");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofence-reports"] });
      toast({ title: "Success", description: "Geofence deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const geofences = geofencesData?.data || [];
  const reports = reportsData?.data || [];

  const handleCreateGeofence = () => {
    setSelectedGeofence(null);
    setIsDialogOpen(true);
  };

  const handleEditGeofence = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    setIsDialogOpen(true);
  };

  const handleSaveGeofence = (geofenceData: Partial<Geofence>) => {
    if (selectedGeofence) {
      updateGeofenceMutation.mutate({ ...geofenceData, id: selectedGeofence.id });
    } else {
      createGeofenceMutation.mutate(geofenceData);
    }
  };

  const handleDeleteGeofence = (geofence: Geofence) => {
    if (confirm(`Delete geofence "${geofence.name}"? This action cannot be undone.`)) {
      deleteGeofenceMutation.mutate(geofence.id);
    }
  };

  const exportReports = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/bouncie/geofence-reports/export'), {
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
      a.download = `geofence-reports-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'airport':
        return <Plane className="w-4 h-4" />;
      case 'depot':
        return <Building className="w-4 h-4" />;
      case 'customer':
        return <Home className="w-4 h-4" />;
      case 'service':
        return <Settings className="w-4 h-4" />;
      case 'restricted':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  // Calculate summary statistics
  const totalEvents = reports.reduce((sum, report) => sum + report.events.length, 0);
  const totalEnters = reports.reduce((sum, report) => sum + report.statistics.totalEnters, 0);
  const totalExits = reports.reduce((sum, report) => sum + report.statistics.totalExits, 0);
  const avgDuration = reports.reduce((sum, report) => sum + report.statistics.averageDuration, 0) / reports.length || 0;

  return (
    <div className="space-y-6">
      {/* Filters & Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Geofence Reports
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateGeofence}>
                <Plus className="w-4 h-4 mr-2" />
                Create Geofence
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="airport">Airport</SelectItem>
                  <SelectItem value="depot">Depot/Garage</SelectItem>
                  <SelectItem value="customer">Customer Location</SelectItem>
                  <SelectItem value="service">Service Area</SelectItem>
                  <SelectItem value="restricted">Restricted Zone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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

            <div className="flex items-end space-x-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active-only"
                  checked={filters.activeOnly}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, activeOnly: checked }))}
                />
                <Label htmlFor="active-only" className="text-sm">Active only</Label>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bouncie/geofence-reports"] })}
                disabled={isLoading}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={exportReports}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-sm text-muted-foreground">Active Geofences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalEnters}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{totalExits}</div>
            <div className="text-sm text-muted-foreground">Total Exits</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <div className="text-sm text-muted-foreground">Avg Duration</div>
          </CardContent>
        </Card>
      </div>

      {/* Geofence Reports */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-3" />
            <span>Loading geofence reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No geofence activity</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create geofences or adjust your filters to see activity reports
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.geofence.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(report.geofence.category || 'other')}
                      <CardTitle className="text-lg">{report.geofence.name}</CardTitle>
                      {!report.geofence.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {report.geofence.description && (
                      <p className="text-sm text-muted-foreground">{report.geofence.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditGeofence(report.geofence)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteGeofence(report.geofence)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{report.statistics.totalEnters}</div>
                    <div className="text-xs text-muted-foreground">Entries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{report.statistics.totalExits}</div>
                    <div className="text-xs text-muted-foreground">Exits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatDuration(report.statistics.averageDuration)}</div>
                    <div className="text-xs text-muted-foreground">Avg Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{report.statistics.uniqueVehicles}</div>
                    <div className="text-xs text-muted-foreground">Unique Vehicles</div>
                  </div>
                </div>

                {/* Recent Events */}
                {report.events.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Activity</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {report.events.slice(0, 10).map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              event.violationType === 'enter' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            
                            <div>
                              <div className="font-medium text-sm">{event.deviceName}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString()}
                                {event.speed && ` • ${Math.round(event.speed)} mph`}
                                {event.duration && ` • ${formatDuration(event.duration)} inside`}
                              </div>
                            </div>
                          </div>
                          
                          <Badge className={getEventTypeBadge(event.violationType)}>
                            {event.violationType === 'enter' ? 'Entered' : 'Exited'}
                          </Badge>
                        </div>
                      ))}
                      {report.events.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground">
                          +{report.events.length - 10} more events
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No activity in the selected time period
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Geofence Dialog */}
      {isDialogOpen && (
        <GeofenceDialog
          geofence={selectedGeofence}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedGeofence(null);
          }}
          onSave={handleSaveGeofence}
        />
      )}
    </div>
  );
}