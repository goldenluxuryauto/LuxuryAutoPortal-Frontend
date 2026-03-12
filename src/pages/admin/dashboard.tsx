import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Car,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock,
  Users,
  RefreshCw
} from 'lucide-react';
import { DashboardSummaryCard } from '@/components/dashboard/DashboardSummaryCard';
import { ActiveTripsList } from '@/components/dashboard/ActiveTripsList';
import { FleetStatusGrid } from '@/components/dashboard/FleetStatusGrid';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

interface DashboardSummary {
  totalVehicles: number;
  activeTrips: number;
  todayRevenue: number;
  pendingAlerts: number;
  fleetUtilization: number;
}

interface ActiveTrip {
  id: string;
  vehicleId: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
  };
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'upcoming' | 'ending_soon';
  startTime: string;
  endTime: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  revenue: number;
}

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

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>([]);
  const [fleetStatus, setFleetStatus] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [summaryResponse, tripsResponse, fleetResponse] = await Promise.all([
        fetch('/api/dashboard/summary'),
        fetch('/api/dashboard/active-trips'),
        fetch('/api/dashboard/fleet-status')
      ]);

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.data);
      }

      if (tripsResponse.ok) {
        const tripsData = await tripsResponse.json();
        setActiveTrips(tripsData.data);
      }

      if (fleetResponse.ok) {
        const fleetData = await fleetResponse.json();
        setFleetStatus(fleetData.data);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'ending_soon': return 'bg-yellow-500';
      case 'upcoming': return 'bg-blue-500';
      case 'rented': return 'bg-green-500';
      case 'available': return 'bg-gray-500';
      case 'maintenance': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time fleet and operations overview
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardSummaryCard
            title="Total Fleet"
            value={summary.totalVehicles.toString()}
            icon={Car}
            description="Vehicles in fleet"
            color="blue"
          />
          <DashboardSummaryCard
            title="Active Trips"
            value={summary.activeTrips.toString()}
            icon={Activity}
            description="Currently on road"
            color="green"
          />
          <DashboardSummaryCard
            title="Today's Revenue"
            value={`$${summary.todayRevenue.toLocaleString()}`}
            icon={DollarSign}
            description="Revenue today"
            color="green"
          />
          <DashboardSummaryCard
            title="Fleet Utilization"
            value={`${summary.fleetUtilization}%`}
            icon={TrendingUp}
            description="Vehicles in use"
            color={summary.fleetUtilization > 70 ? 'green' : summary.fleetUtilization > 40 ? 'yellow' : 'red'}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Trips */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Active Trips
              <Badge variant="secondary" className="ml-2">
                {activeTrips.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActiveTripsList trips={activeTrips} />
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Car className="h-5 w-5 mr-2" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FleetStatusGrid vehicles={fleetStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Revenue Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {summary && summary.pendingAlerts > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Pending Alerts
              <Badge variant="destructive" className="ml-2">
                {summary.pendingAlerts}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              You have {summary.pendingAlerts} pending alerts that require attention.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}