import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface RevenueMetrics {
  totalRevenue: number;
  dailyRevenue: number[];
  averageTripValue: number;
  topPerformingVehicles: {
    vehicleId: string;
    make: string;
    model: string;
    revenue: number;
    tripCount: number;
  }[];
  revenueByPeriod: {
    date: string;
    revenue: number;
    tripCount: number;
  }[];
}

export function RevenueChart() {
  const [revenueData, setRevenueData] = useState<RevenueMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  const fetchRevenueData = async (period: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/revenue-metrics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.data);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData(selectedPeriod);
  }, [selectedPeriod]);

  const periodOptions = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex space-x-2">
            {periodOptions.map((option, index) => (
              <div key={index} className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load revenue data</p>
      </div>
    );
  }

  // Calculate trend
  const recentRevenue = revenueData.revenueByPeriod.slice(-7);
  const currentWeekTotal = recentRevenue.reduce((sum, day) => sum + day.revenue, 0);
  const previousWeekTotal = revenueData.revenueByPeriod.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0);
  const trendPercentage = previousWeekTotal > 0 ? ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) * 100 : 0;
  const isPositiveTrend = trendPercentage >= 0;

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...revenueData.revenueByPeriod.map(d => d.revenue));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-lg font-semibold">
              {formatCurrency(revenueData.totalRevenue)}
            </span>
          </div>
          <div className={`flex items-center ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
            {isPositiveTrend ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
            <span className="text-sm font-medium">
              {isPositiveTrend ? '+' : ''}{trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedPeriod === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-1">
                {revenueData.revenueByPeriod.map((day, index) => {
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                      <div 
                        className="bg-blue-500 rounded-t w-full min-h-[4px] transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${formatDate(day.date)}: ${formatCurrency(day.revenue)}`}
                      ></div>
                      <span className="text-xs text-gray-500 transform -rotate-45 origin-top">
                        {formatDate(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats and Top Vehicles */}
        <div className="space-y-4">
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Average Trip Value</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(revenueData.averageTripValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Trips</p>
                <p className="text-xl font-semibold">
                  {revenueData.revenueByPeriod.reduce((sum, day) => sum + day.tripCount, 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Vehicles */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueData.topPerformingVehicles.slice(0, 5).map((vehicle, index) => (
                  <div key={vehicle.vehicleId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle.tripCount} trips
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(vehicle.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}