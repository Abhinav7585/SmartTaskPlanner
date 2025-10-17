import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalInputProps {
  onSubmit: (goal: { title: string; description: string; targetDate?: Date }) => void;
  loading?: boolean;
}

const GoalInput = ({ onSubmit, loading }: GoalInputProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      targetDate
    });
  };

  return (
    <Card className="border-border/50 shadow-medium hover:shadow-ai transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-soft">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">What's Your Goal?</CardTitle>
            <CardDescription>
              Describe your goal and let AI break it down into actionable tasks
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="goal-title" className="text-base font-medium">
              Goal Title *
            </Label>
            <Input
              id="goal-title"
              placeholder="e.g., Launch a mobile app in 8 weeks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description" className="text-base font-medium">
              Description
            </Label>
            <Textarea
              id="goal-description"
              placeholder="Add more context about your goal, requirements, or constraints..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="min-h-[100px] resize-none text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Target Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loading}
                  className={cn(
                    "w-full justify-start text-left font-normal text-base",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={setTargetDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-base h-12"
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                AI is planning your tasks...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Task Plan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default GoalInput;