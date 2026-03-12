import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Car, 
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  Search,
  Calendar,
  ExternalLink
} from 'lucide-react';

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

interface IncompleteTasksCardProps {
  tasks: IncompleteTask[];
  onTaskComplete: (taskId: string) => void;
}

export function IncompleteTasksCard({ tasks, onTaskComplete }: IncompleteTasksCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const getTaskIcon = (type: string) => {
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

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'turo_message': return 'bg-blue-100 text-blue-800';
      case 'inspection': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string, isOverdue: boolean = false) => {
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-300';
    
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dateString: string) => {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `${Math.abs(diffDays)} days overdue`,
        color: 'text-red-600',
        isOverdue: true
      };
    } else if (diffDays === 0) {
      return {
        label: 'Due today',
        color: 'text-amber-600',
        isOverdue: false
      };
    } else if (diffDays === 1) {
      return {
        label: 'Due tomorrow',
        color: 'text-amber-600',
        isOverdue: false
      };
    } else {
      return {
        label: `Due in ${diffDays} days`,
        color: 'text-gray-600',
        isOverdue: false
      };
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.vehicleInfo && 
        `${task.vehicleInfo.make} ${task.vehicleInfo.model} ${task.vehicleInfo.licensePlate}`
          .toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  // Sort tasks: overdue first, then by priority, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Overdue tasks first
    if (a.overdue !== b.overdue) {
      return a.overdue ? -1 : 1;
    }
    
    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // Then by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const taskCounts = {
    total: tasks.length,
    overdue: tasks.filter(t => t.overdue).length,
    high: tasks.filter(t => t.priority === 'high').length,
    turo_message: tasks.filter(t => t.type === 'turo_message').length,
    inspection: tasks.filter(t => t.type === 'inspection').length,
    maintenance: tasks.filter(t => t.type === 'maintenance').length,
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <CheckCircle className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500">All tasks completed!</p>
        <p className="text-sm text-gray-400">Great work staying on top of everything</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks or vehicles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
          >
            All ({taskCounts.total})
          </Button>
          <Button
            variant={typeFilter === 'turo_message' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('turo_message')}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Messages ({taskCounts.turo_message})
          </Button>
          <Button
            variant={typeFilter === 'inspection' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('inspection')}
          >
            <Car className="h-4 w-4 mr-1" />
            Inspections ({taskCounts.inspection})
          </Button>
          <Button
            variant={typeFilter === 'maintenance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('maintenance')}
          >
            <Wrench className="h-4 w-4 mr-1" />
            Maintenance ({taskCounts.maintenance})
          </Button>
        </div>
      </div>

      {/* Priority Filter */}
      {taskCounts.overdue > 0 && (
        <div className="flex gap-2">
          <Button
            variant={priorityFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPriorityFilter('all')}
          >
            All Priorities
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-50"
            onClick={() => setPriorityFilter('high')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Overdue ({taskCounts.overdue})
          </Button>
        </div>
      )}

      {/* Tasks List */}
      <ScrollArea className="h-96">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No tasks match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const Icon = getTaskIcon(task.type);
              const dueInfo = formatDueDate(task.dueDate);

              return (
                <div 
                  key={task.id} 
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    task.overdue || dueInfo.isOverdue 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        task.overdue ? 'text-red-600' : 'text-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {task.title}
                        </h3>
                        {task.vehicleInfo && (
                          <p className="text-sm text-gray-500">
                            {task.vehicleInfo.make} {task.vehicleInfo.model} • {task.vehicleInfo.licensePlate}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 ml-4">
                      <Badge className={getTaskTypeColor(task.type)}>
                        {getTaskTypeLabel(task.type)}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority, task.overdue)}>
                        {task.overdue ? 'Overdue' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className={`flex items-center text-sm mb-3 ${dueInfo.color}`}>
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">{dueInfo.label}</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-500">
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onTaskComplete(task.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Task
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}