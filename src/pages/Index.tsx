import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import GoalInput from '@/components/GoalInput';
import TaskList from '@/components/TaskList';

interface Task {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  order_index: number;
  goal_id: string;
}

interface TaskDependency {
  task_id: string;
  depends_on_task_id: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleGoalSubmit = async (goal: { title: string; description: string; targetDate?: Date }) => {
    if (!session?.user) return;

    setLoading(true);
    try {
      // Create goal in database
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: session.user.id,
          title: goal.title,
          description: goal.description,
          target_date: goal.targetDate?.toISOString(),
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Call AI function to generate tasks
      const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-tasks', {
        body: {
          goalTitle: goal.title,
          goalDescription: goal.description,
          targetDate: goal.targetDate?.toISOString(),
        }
      });

      if (aiError) throw aiError;

      // Insert tasks into database
      const tasksToInsert = aiData.tasks.map((task: any, index: number) => ({
        goal_id: goalData.id,
        title: task.title,
        description: task.description,
        estimated_hours: task.estimated_hours,
        priority: task.priority,
        order_index: index,
      }));

      const { data: insertedTasks, error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (tasksError) throw tasksError;

      // Insert dependencies
      const dependenciesToInsert: any[] = [];
      aiData.tasks.forEach((task: any, index: number) => {
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach((depIndex: number) => {
            if (insertedTasks && depIndex < insertedTasks.length) {
              dependenciesToInsert.push({
                task_id: insertedTasks[index].id,
                depends_on_task_id: insertedTasks[depIndex].id,
              });
            }
          });
        }
      });

      if (dependenciesToInsert.length > 0) {
        const { error: depsError } = await supabase
          .from('task_dependencies')
          .insert(dependenciesToInsert);

        if (depsError) throw depsError;
      }

      // Update UI
      setTasks(insertedTasks as Task[] || []);
      setDependencies(dependenciesToInsert);
      
      toast.success('Task plan generated successfully!');
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast.error(error.message || 'Failed to generate task plan');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-soft">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Smart Task Planner</h1>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <GoalInput onSubmit={handleGoalSubmit} loading={loading} />
          
          {tasks.length > 0 && (
            <TaskList tasks={tasks} dependencies={dependencies} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;