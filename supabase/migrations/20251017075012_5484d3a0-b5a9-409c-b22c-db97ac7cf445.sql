-- Create goals table to store user goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table to store AI-generated tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_dependencies table for managing task relationships
CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- Enable Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals table
CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tasks table (tasks belong to goals which belong to users)
CREATE POLICY "Users can view tasks for their goals"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks for their goals"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks for their goals"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks for their goals"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = tasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- RLS Policies for task_dependencies (inherit from tasks)
CREATE POLICY "Users can view task dependencies for their tasks"
  ON public.task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.goals ON goals.id = tasks.goal_id
      WHERE tasks.id = task_dependencies.task_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task dependencies for their tasks"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.goals ON goals.id = tasks.goal_id
      WHERE tasks.id = task_dependencies.task_id
      AND goals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task dependencies for their tasks"
  ON public.task_dependencies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.goals ON goals.id = tasks.goal_id
      WHERE tasks.id = task_dependencies.task_id
      AND goals.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);