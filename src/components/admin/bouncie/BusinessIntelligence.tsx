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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  MapPin,
  Car,
  DollarSign,
  Clock,
  Gauge,
  Fuel,
  Settings,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Target,
  Users,
  Route,
  Wrench,
  Activity,
  Award,
  Zap
} from "lucide-react";

interface FleetUtilizationData {
  vehicleId: string;
  vehicleName: string;
  make: string;
  model: string;
  year: string;
  licensePlate?: string;
  totalTrips: number;
  totalDistance: number; // miles
  totalDuration: number; // hours
  utilizationRate: number; // percentage (0-100)
  revenueGenerated: number; // dollars
  costPerMile: number;
  profitMargin: number;
  averageTripDistance: number;
  averageTripDuration: number;
  maintenanceScore: number; // 0-100
  efficiencyScore: number; // 0-100
  popularPickupLocations: Array<{
    location: string;
    count: number;
    percentage: number;
  }>;
  popularReturnLocations: Array<{
    location: string;
    count: number;
    percentage: number;
  }>;
  peakUsageHours: number[];
  monthlyTrends: Array<{
    month: string;
    trips: number;
    distance: number;
    revenue: number;
  }>;
}

interface CustomerLocationPattern {
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  category: 'airport' | 'hotel' | 'business' | 'residential' | 'tourist' | 'other';
  pickupCount: number;
  returnCount: number;
  totalCount: number;
  popularityScore: number;
  averageStayDuration: number; // hours
  peakUsageTimes: Array<{
    hour: number;
    count: number;
  }>;
  customerTypes: Array<{
    type: 'leisure' | 'business' | 'airport_transfer' | 'local';
    percentage: number;
  }>;
  seasonalTrends: Array<{
    season: 'spring' | 'summer' | 'fall' | 'winter';
    multiplier: number;
  }>;
}

interface VehiclePerformanceMetrics {
  vehicleId: string;
  vehicleName: string;
  totalMileage: number;
  averageMPG: number;
  maintenanceAlerts: Array<{
    type: 'oil_change' | 'tire_rotation' | 'brake_inspection' | 'general_service';
    severity: 'low' | 'medium' | 'high' | 'critical';
    dueDate: string;
    estimatedCost: number;
  }>;
  performanceMetrics: {
    fuelEfficiency: number; // mpg
    drivingScore: number; // 0-100
    wearRate: number; // miles per maintenance event
    reliabilityScore: number; // 0-100
    customerSatisfaction: number; // 0-100
  };
  costAnalysis: {
    fuelCostPerMile: number;
    maintenanceCostPerMile: number;
    totalOperatingCost: number;
    profitabilityIndex: number;
  };
  predictiveInsights: Array<{
    metric: string;
    prediction: string;
    confidence: number;
    timeframe: string;
  }>;
}

interface CostOptimizationInsight {
  category: 'fuel' | 'maintenance' | 'routing' | 'utilization' | 'customer';
  title: string;
  description: string;
  potentialSavings: {
    amount: number;
    timeframe: 'monthly' | 'yearly';
    confidence: number;
  };
  actionItems: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    effort: 'easy' | 'moderate' | 'complex';
    timeline: string;
  }>;
  metrics: {
    currentCost: number;
    optimizedCost: number;
    savingsPercentage: number;
  };
}

interface BusinessIntelligenceData {
  fleetUtilization: FleetUtilizationData[];
  customerPatterns: CustomerLocationPattern[];
  vehiclePerformance: VehiclePerformanceMetrics[];
  costOptimization: CostOptimizationInsight[];
  kpis: {
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    fleetUtilizationRate: number;
    averageRevenuePerVehicle: number;
    customerSatisfactionScore: number;
    fuelEfficiencyFleetAverage: number;
    maintenanceCostReduction: number;
  };
  trends: {
    revenueGrowth: number;
    utilizationImprovement: number;
    costReduction: number;
    efficiencyGains: number;
  };
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

function FleetUtilizationReport({ data }: { data: FleetUtilizationData[] }) {
  const [sortBy, setSortBy] = useState<'trips' | 'revenue' | 'efficiency'>('revenue');
  
  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'trips':
        return b.totalTrips - a.totalTrips;
      case 'efficiency':
        return b.efficiencyScore - a.efficiencyScore;
      case 'revenue':
      default:
        return b.revenueGenerated - a.revenueGenerated;
    }
  });

  const utilizationChartData = sortedData.slice(0, 10).map(vehicle => ({
    name: `${vehicle.make} ${vehicle.model}`,
    utilization: vehicle.utilizationRate,
    trips: vehicle.totalTrips,
    revenue: vehicle.revenueGenerated,
    efficiency: vehicle.efficiencyScore
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Fleet Utilization Analysis
          </CardTitle>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">By Revenue</SelectItem>
              <SelectItem value="trips">By Trip Count</SelectItem>
              <SelectItem value="efficiency">By Efficiency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Utilization Chart */}
          <div className="space-y-4">
            <h4 className="font-medium">Vehicle Utilization Rates</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performers */}
          <div className="space-y-4">
            <h4 className="font-medium">Top Performing Vehicles</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {sortedData.slice(0, 8).map((vehicle, index) => (
                <div key={vehicle.vehicleId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {vehicle.vehicleName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                      {vehicle.licensePlate && (
                        <span className="ml-2 font-mono">({vehicle.licensePlate})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{vehicle.totalTrips} trips</span>
                      <span>{vehicle.totalDistance.toFixed(0)} mi</span>
                      <span>${vehicle.revenueGenerated.toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      {vehicle.utilizationRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      utilization
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, v) => sum + v.totalTrips, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${data.reduce((sum, v) => sum + v.revenueGenerated, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(data.reduce((sum, v) => sum + v.utilizationRate, 0) / data.length).toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Utilization</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(data.reduce((sum, v) => sum + v.efficiencyScore, 0) / data.length).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Efficiency</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerLocationPatterns({ data }: { data: CustomerLocationPattern[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredData = categoryFilter === 'all' 
    ? data 
    : data.filter(pattern => pattern.category === categoryFilter);

  const locationChartData = filteredData
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 15)
    .map(pattern => ({
      name: pattern.location.address.split(',')[0], // First part of address
      pickups: pattern.pickupCount,
      returns: pattern.returnCount,
      total: pattern.totalCount,
      category: pattern.category
    }));

  const categoryData = data.reduce((acc, pattern) => {
    acc[pattern.category] = (acc[pattern.category] || 0) + pattern.totalCount;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([category, count]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: count,
    percentage: (count / data.reduce((sum, p) => sum + p.totalCount, 0) * 100).toFixed(1)
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Customer Location Patterns
          </CardTitle>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="airport">Airport</SelectItem>
              <SelectItem value="hotel">Hotel</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="tourist">Tourist</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Popular Locations */}
          <div className="space-y-4">
            <h4 className="font-medium">Most Popular Locations</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pickups" fill="#10b981" name="Pickups" />
                  <Bar dataKey="returns" fill="#3b82f6" name="Returns" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="space-y-4">
            <h4 className="font-medium">Location Category Distribution</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-4">Location Insights</h4>
          <div className="grid gap-3 max-h-60 overflow-y-auto">
            {filteredData.slice(0, 10).map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <div className="font-medium truncate max-w-xs">
                      {pattern.location.address}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pattern.category.charAt(0).toUpperCase() + pattern.category.slice(1)} • 
                      Score: {pattern.popularityScore}/100
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-green-600">{pattern.pickupCount}</div>
                    <div className="text-xs text-muted-foreground">Pickups</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-600">{pattern.returnCount}</div>
                    <div className="text-xs text-muted-foreground">Returns</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{pattern.totalCount}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VehiclePerformanceTracking({ data }: { data: VehiclePerformanceMetrics[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(data[0]?.vehicleId || '');
  
  const vehicle = data.find(v => v.vehicleId === selectedVehicle);
  
  if (!vehicle) return null;

  const performanceData = [
    { name: 'Fuel Efficiency', value: vehicle.performanceMetrics.fuelEfficiency, max: 35 },
    { name: 'Driving Score', value: vehicle.performanceMetrics.drivingScore, max: 100 },
    { name: 'Reliability', value: vehicle.performanceMetrics.reliabilityScore, max: 100 },
    { name: 'Customer Satisfaction', value: vehicle.performanceMetrics.customerSatisfaction, max: 100 }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Vehicle Performance Tracking
          </CardTitle>
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.map(vehicle => (
                <SelectItem key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.vehicleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="space-y-4">
            <h4 className="font-medium">Performance Metrics</h4>
            <div className="space-y-3">
              {performanceData.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{metric.name}</span>
                    <span className="font-medium">
                      {metric.value}{metric.name === 'Fuel Efficiency' ? ' mpg' : '/100'}
                    </span>
                  </div>
                  <Progress value={(metric.value / metric.max) * 100} className="h-2" />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-3">
              <h5 className="font-medium text-sm">Key Metrics</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{vehicle.totalMileage.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Miles</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{vehicle.averageMPG.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Avg MPG</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">${vehicle.costAnalysis.totalOperatingCost.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Operating Cost</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{vehicle.costAnalysis.profitabilityIndex.toFixed(1)}x</div>
                  <div className="text-xs text-muted-foreground">Profit Index</div>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Alerts */}
          <div className="space-y-4">
            <h4 className="font-medium">Maintenance Alerts</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {vehicle.maintenanceAlerts.map((alert, index) => (
                <div key={index} className={`p-3 border rounded-lg ${
                  alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'high' ? 'text-orange-600' :
                        alert.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <span className="font-medium text-sm">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <Badge variant={
                      alert.severity === 'critical' ? 'destructive' :
                      alert.severity === 'high' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Due: {new Date(alert.dueDate).toLocaleDateString()} • 
                    Est. Cost: ${alert.estimatedCost}
                  </div>
                </div>
              ))}
            </div>

            {/* Predictive Insights */}
            <div className="pt-4 border-t">
              <h5 className="font-medium text-sm mb-3">Predictive Insights</h5>
              <div className="space-y-2">
                {vehicle.predictiveInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <div className="font-medium">{insight.metric}</div>
                    <div className="text-muted-foreground">{insight.prediction}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs">Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                      <span className="text-xs">Timeline: {insight.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CostOptimizationInsights({ data }: { data: CostOptimizationInsight[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredInsights = categoryFilter === 'all' 
    ? data 
    : data.filter(insight => insight.category === categoryFilter);

  const totalPotentialSavings = data.reduce((sum, insight) => 
    sum + (insight.potentialSavings.timeframe === 'yearly' ? 
      insight.potentialSavings.amount : 
      insight.potentialSavings.amount * 12), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Cost Optimization Insights
          </CardTitle>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fuel">Fuel</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="routing">Routing</SelectItem>
              <SelectItem value="utilization">Utilization</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 border rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">
              ${totalPotentialSavings.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Annual Savings Potential</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{filteredInsights.length}</div>
            <div className="text-sm text-muted-foreground">Optimization Opportunities</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {filteredInsights.filter(i => i.actionItems.some(a => a.priority === 'high')).length}
            </div>
            <div className="text-sm text-muted-foreground">High Priority Items</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {(filteredInsights.reduce((sum, i) => sum + i.potentialSavings.confidence, 0) / filteredInsights.length * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {filteredInsights.map((insight, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize">
                      {insight.category}
                    </Badge>
                    <h4 className="font-medium">{insight.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    ${insight.potentialSavings.amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {insight.potentialSavings.timeframe} savings
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(insight.potentialSavings.confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Cost Analysis */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Cost Analysis</h5>
                  <div className="flex justify-between text-sm">
                    <span>Current Cost:</span>
                    <span>${insight.metrics.currentCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Optimized Cost:</span>
                    <span>${insight.metrics.optimizedCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Savings:</span>
                    <span className="text-green-600">
                      {insight.metrics.savingsPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={insight.metrics.savingsPercentage} className="h-2" />
                </div>

                {/* Action Items */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Action Items</h5>
                  <div className="space-y-1">
                    {insight.actionItems.slice(0, 3).map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{action.action}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant={
                            action.priority === 'high' ? 'destructive' :
                            action.priority === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {action.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {action.timeline}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessIntelligence() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: biData, isLoading } = useQuery<{ success: boolean; data: BusinessIntelligenceData }>({
    queryKey: ["/api/bouncie/business-intelligence", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange);
      const res = await fetch(buildApiUrl(`/api/bouncie/business-intelligence?${params.toString()}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch business intelligence data");
      return res.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  const exportData = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/bouncie/business-intelligence/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dateRange),
      });
      
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `business-intelligence-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-3" />
        <span>Loading business intelligence data...</span>
      </div>
    );
  }

  const data = biData?.data;
  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-medium">No business intelligence data available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ensure vehicles have completed trips in the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Business Intelligence Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ${data.kpis.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {data.trends.revenueGrowth > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {data.trends.revenueGrowth > 0 ? '+' : ''}{data.trends.revenueGrowth.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${data.kpis.netProfit.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className="text-xs text-muted-foreground mt-1">
              Margin: {((data.kpis.netProfit / data.kpis.totalRevenue) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data.kpis.fleetUtilizationRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Fleet Utilization</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {data.trends.utilizationImprovement > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {data.trends.utilizationImprovement > 0 ? '+' : ''}{data.trends.utilizationImprovement.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.kpis.customerSatisfactionScore.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Customer Score</div>
            <div className="text-xs text-muted-foreground mt-1">
              Out of 5.0
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports */}
      <FleetUtilizationReport data={data.fleetUtilization} />
      <CustomerLocationPatterns data={data.customerPatterns} />
      <VehiclePerformanceTracking data={data.vehiclePerformance} />
      <CostOptimizationInsights data={data.costOptimization} />
    </div>
  );
}