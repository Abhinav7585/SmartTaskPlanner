import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
}

interface TaskDependency {
  task_id: string;
  depends_on_task_id: string;
}

interface TaskListProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  onTaskStatusChange?: (taskId: string, newStatus: Task['status']) => void;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

const TaskList = ({ tasks, dependencies, onTaskStatusChange }: TaskListProps) => {
  const getDependencies = (taskId: string) => {
    return dependencies
      .filter(dep => dep.task_id === taskId)
      .map(dep => tasks.find(t => t.id === dep.depends_on_task_id))
      .filter(Boolean);
  };

  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Breakdown</h2>
          <p className="text-muted-foreground">
            {tasks.length} tasks • {tasks.filter(t => t.status === 'completed').length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0).toFixed(1)} hours total
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedTasks.map((task, index) => {
          const StatusIcon = statusIcons[task.status];
          const taskDeps = getDependencies(task.id);

          return (
            <Card 
              key={task.id}
              className={cn(
                "border-border/50 transition-all duration-300 hover:shadow-medium",
                task.status === 'completed' && "opacity-60"
              )}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full mt-1 flex-shrink-0",
                    task.status === 'completed' 
                      ? "bg-success/20 text-success" 
                      : "bg-primary/10 text-primary"
                  )}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <CardTitle className="text-lg leading-tight">
                        {index + 1}. {task.title}
                      </CardTitle>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={priorityColors[task.priority]} variant="secondary">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimated_hours}h
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">
                      {task.description}
                    </CardDescription>

                    {taskDeps.length > 0 && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">Depends on:</span>{' '}
                          {taskDeps.map((dep, i) => (
                            <span key={dep?.id}>
                              {dep?.title}
                              {i < taskDeps.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;