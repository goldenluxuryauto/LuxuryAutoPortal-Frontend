import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardSummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export function DashboardSummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  color = 'blue',
  trend
}: DashboardSummaryCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          accent: 'border-blue-200'
        };
      case 'green':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          accent: 'border-green-200'
        };
      case 'yellow':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          accent: 'border-yellow-200'
        };
      case 'red':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          accent: 'border-red-200'
        };
      default:
        return {
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          accent: 'border-gray-200'
        };
    }
  };

  const colorClasses = getColorClasses(color);

  return (
    <Card className={`${colorClasses.accent} hover:shadow-md transition-shadow`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${colorClasses.iconBg}`}>
                <Icon className={`h-6 w-6 ${colorClasses.iconColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {value}
                </p>
                {description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
          {trend && (
            <div className="text-right">
              <div className={`flex items-center ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="text-sm font-medium">
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {trend.label}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}