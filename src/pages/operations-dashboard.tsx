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
  Calendar,
  Clock,
  AlertTriangle,
  MessageSquare,
  Car,
  Wrench,
  PlayCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { NewsMediaCarousel } from '@/components/dashboard/NewsMediaCarousel';
import { UpcomingTripsCard } from '@/components/dashboard/UpcomingTripsCard';
import { IncompleteTasksCard } from '@/components/dashboard/IncompleteTasksCard';

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

interface IncompleteTask {
  id: string;
  type: 'turo_message' | 'inspection' | 'maintenance';
  title: string;
  vehicleInfo?: {
    make: string;
    model: string;
    licensePlate: string;
  };
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  overdue: boolean;
}

interface NewsMediaItem {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

export default function OperationsDashboard() {
  const [upcomingStartTrips, setUpcomingStartTrips] = useState<UpcomingTrip[]>([]);
  const [upcomingEndTrips, setUpcomingEndTrips] = useState<UpcomingTrip[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<IncompleteTask[]>([]);
  const [newsMedia, setNewsMedia] = useState<NewsMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [startTripsResponse, endTripsResponse, tasksResponse, newsResponse] = await Promise.all([
        fetch('/api/operations/upcoming-start-trips'),
        fetch('/api/operations/upcoming-end-trips'),
        fetch('/api/operations/incomplete-tasks'),
        fetch('/api/operations/news-media')
      ]);

      if (startTripsResponse.ok) {
        const startTripsData = await startTripsResponse.json();
        setUpcomingStartTrips(startTripsData.data || []);
      }

      if (endTripsResponse.ok) {
        const endTripsData = await endTripsResponse.json();
        setUpcomingEndTrips(endTripsData.data || []);
      }

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setIncompleteTasks(tasksData.data || []);
      }

      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        setNewsMedia(newsData.data || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching operations dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'turo_message': return MessageSquare;
      case 'inspection': return Car;
      case 'maintenance': return Wrench;
      default: return AlertTriangle;
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'turo_message': return 'Turo Message';
      case 'inspection': return 'Car Inspection';
      case 'maintenance': return 'Maintenance';
      default: return 'Task';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const highPriorityTasks = incompleteTasks.filter(task => task.priority === 'high' || task.overdue);
  const totalIncompleteTasks = incompleteTasks.length;

  if (loading && upcomingStartTrips.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Loading operations dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Trip management and task tracking
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

      {/* Alert Summary */}
      {(highPriorityTasks.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">
              {highPriorityTasks.length} high priority tasks require immediate attention
            </span>
          </div>
        </div>
      )}

      {/* News & Media Carousel */}
      {newsMedia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlayCircle className="h-5 w-5 mr-2" />
              Company News & Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NewsMediaCarousel items={newsMedia} />
          </CardContent>
        </Card>
      )}

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Trip Starts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600" />
                Upcoming Trip Starts
              </div>
              <Badge variant="secondary">
                {upcomingStartTrips.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingTripsCard 
              trips={upcomingStartTrips} 
              type="start"
              emptyMessage="No upcoming trip starts"
            />
          </CardContent>
        </Card>

        {/* Upcoming Trip Ends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Upcoming Trip Ends
              </div>
              <Badge variant="secondary">
                {upcomingEndTrips.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingTripsCard 
              trips={upcomingEndTrips} 
              type="end"
              emptyMessage="No upcoming trip ends"
            />
          </CardContent>
        </Card>
      </div>

      {/* Incomplete Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
              Incomplete Tasks
            </div>
            <div className="flex items-center space-x-2">
              {highPriorityTasks.length > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {highPriorityTasks.length} Urgent
                </Badge>
              )}
              <Badge variant="secondary">
                {totalIncompleteTasks} Total
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IncompleteTasksCard 
            tasks={incompleteTasks}
            onTaskComplete={(taskId) => {
              setIncompleteTasks(prev => prev.filter(task => task.id !== taskId));
            }}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium">Turo Messages</p>
                  <p className="text-sm text-gray-500">Check inbox</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="font-medium">Vehicle Inspections</p>
                  <p className="text-sm text-gray-500">Schedule checks</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Wrench className="h-8 w-8 text-amber-600 mr-3" />
                <div>
                  <p className="font-medium">Maintenance</p>
                  <p className="text-sm text-gray-500">Track repairs</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}