import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  title: string;
  description: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: number[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goalTitle, goalDescription, targetDate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an expert project planner and task breakdown specialist. Your role is to analyze goals and create comprehensive, actionable task plans.

When given a goal, you must:
1. Break it down into clear, specific, actionable tasks
2. Estimate realistic time requirements for each task (in hours)
3. Assign appropriate priority levels (low, medium, high, critical)
4. Identify task dependencies (which tasks must be completed before others)
5. Order tasks logically based on dependencies and priority

Each task should:
- Have a clear, action-oriented title
- Include detailed description of what needs to be done
- Have realistic time estimate
- Be appropriately prioritized
- List any prerequisite tasks (by their order index)

Return your response as a JSON array of tasks with this structure:
{
  "tasks": [
    {
      "title": "Task name",
      "description": "Detailed description",
      "estimated_hours": 2.5,
      "priority": "high",
      "dependencies": [0, 1]
    }
  ]
}`;

    const userPrompt = `Goal: ${goalTitle}
${goalDescription ? `\nDescription: ${goalDescription}` : ''}
${targetDate ? `\nTarget Date: ${new Date(targetDate).toLocaleDateString()}` : ''}

Please break this goal down into a comprehensive task plan with estimated timelines and dependencies.`;

    console.log('Calling AI Gateway for task generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_task_plan',
              description: 'Create a comprehensive task breakdown for a goal',
              parameters: {
                type: 'object',
                properties: {
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Clear, action-oriented task title' },
                        description: { type: 'string', description: 'Detailed description of the task' },
                        estimated_hours: { type: 'number', description: 'Estimated hours to complete' },
                        priority: { 
                          type: 'string', 
                          enum: ['low', 'medium', 'high', 'critical'],
                          description: 'Task priority level'
                        },
                        dependencies: { 
                          type: 'array', 
                          items: { type: 'number' },
                          description: 'Array of task indices this task depends on'
                        }
                      },
                      required: ['title', 'description', 'estimated_hours', 'priority', 'dependencies'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['tasks'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_task_plan' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('AI Gateway request failed');
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const taskPlan = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ tasks: taskPlan.tasks }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-tasks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});