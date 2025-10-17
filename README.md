# Smart Task Planner

**A small AI-powered service that breaks high-level goals into actionable tasks, timelines, and dependencies.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [API Design](#api-design)
5. [LLM Usage & Prompting](#llm-usage--prompting)
6. [Timeline & Dependency Logic](#timeline--dependency-logic)
7. [Data Model (Optional DB)](#data-model-optional-db)
8. [Setup & Run (Developer)](#setup--run-developer)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Contributing](#contributing)
12. [License](#license)

---

## Project Overview

Smart Task Planner accepts a user goal (for example: "Launch a product in 2 weeks") and returns a structured plan containing:

* Task list (milestones + subtasks)
* Dependencies between tasks
* Suggested start & end dates
* Estimated effort or priority

The service uses an LLM as the reasoning layer to generate plans, and a backend API to accept goals and persist or deliver plans. A lightweight frontend can be optionally included to submit goals and view plans.

## Features

* Convert free-form goals into actionable tasks
* Suggest realistic timelines based on goal constraints
* Determine task dependencies and critical path
* Persist plans (optional DB) and retrieve/edit them
* Extensible prompt templates to tune plan style and granularity

## Architecture

```
[Frontend (optional)] <---> [Backend API] <---> [LLM Provider]
                                    |
                                    +--> [Database (optional)]
```

**Components:**

* **Frontend (Optional):** Single-page app (React) that submits goals and visualizes plans (Gantt-style or list view).
* **Backend API:** REST API (Node.js/Express or Python/FastAPI) that receives goals, formats LLM prompts, validates responses, applies timeline heuristics, and returns plans.
* **LLM Provider:** Any compatble LLM (OpenAI, local LLM) used to convert goals to tasks.
* **Database (Optional):** MongoDB/Postgres to store plans, tasks, and user metadata.

## API Design

### Endpoints (suggested)

#### `POST /api/v1/plans`

Create a plan from a goal.

**Request body** (JSON):

```json
{
  "goal": "Launch MVP in 3 weeks",
  "start_date": "2025-10-20",        
  "constraints": {
    "team_size": 3,
    "exclude_weekends": true
  },
  "granularity": "detailed" // or "high-level"
}
```

**Response** (JSON):

```json
{
  "plan_id": "uuid",
  "goal": "Launch MVP in 3 weeks",
  "start_date": "2025-10-20",
  "tasks": [
    {
      "id": "t1",
      "title": "Define MVP scope",
      "description": "List the core features...",
      "start_date": "2025-10-20",
      "end_date": "2025-10-21",
      "dependencies": [],
      "estimate_hours": 8,
      "assignee": null
    }
  ],
  "metadata": {
    "created_at": "2025-10-17T10:00:00Z",
    "llm_model": "gpt-5-thinking-mini",
    "confidence": 0.85
  }
}
```

#### `GET /api/v1/plans/:id`

Retrieve saved plan.

#### `PUT /api/v1/plans/:id`

Update plan (edit tasks, timelines, etc.)

#### `DELETE /api/v1/plans/:id`

Remove a plan.

## LLM Usage & Prompting

This project treats the LLM as a reasoning engine that maps goal -> tasks. Keep prompts structured and restrictive so responses are machine-parseable.

**Prompt Template (example):**

> "You are an expert project planner. Break down the goal below into a JSON array `tasks` where each task has: id, title, description, duration_days, earliest_start_offset_days, dependencies (array of ids), priority (1-5). Use the `constraints` and `granularity` fields. Output only valid JSON. Goal: {{goal}}. Constraints: {{constraints}}. Start date: {{start_date}}. Granularity: {{granularity}}."

**Best practices:**

* Force a JSON-only output to simplify parsing and validation.
* Use temperature=0–0.3 for deterministic outputs.
* Ask the model to include confidence or rationale section optionally.
* For safety, always validate and sanitize the model output before storing or displaying.

## Timeline & Dependency Logic

The LLM suggests task durations and offsets. The backend applies deterministic rules to convert offsets into calendar dates and enforce constraints (team size, weekends, working hours):

1. **Offset → Dates:** Task `start_date` = `goal.start_date` + `earliest_start_offset_days` adjusted for weekends if `exclude_weekends=true`.
2. **Dependency enforcement:** For each task, final `start_date` = max(own calculated start_date, max(end_date of dependencies)).
3. **Critical path detection:** Use topo-sort + longest-path on DAG (weights = duration) to compute critical path and overall project end date.
4. **Effort balancing (optional):** If `team_size` provided, distribute tasks across team members by effort and available days.

## Data Model (Optional DB)

A minimal document model (Mongo) example:

```json
Plan {
  _id: ObjectId,
  goal: String,
  start_date: Date,
  constraints: Object,
  tasks: [
    { id: String, title: String, description: String, start_date: Date, end_date: Date, dependencies: [String], estimate_hours: Number, assignee: String }
  ],
  created_at: Date,
  updated_at: Date,
  llm_meta: { model: String, prompt: String }
}
```

Relational schema (Postgres) would split `plans` and `tasks` into two tables with a foreign key from tasks → plans.

## Setup & Run (Developer)

### Prerequisites

* Node.js >= 18 or Python 3.10+
* npm / pip
* (Optional) Docker & docker-compose
* LLM provider API key (set in env)

### Environment variables (example)

```
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-5-thinking-mini
DATABASE_URL=mongodb://localhost:27017/smarttask
PORT=4000
```

### Quick start (Node.js example)

1. `git clone <repo>`
2. `cd smart-task-planner`
3. `npm install`
4. `cp .env.example .env` and fill in credentials
5. `npm run dev`

### Docker (optional)

A `docker-compose.yml` may include the backend service and a database service. Use `docker-compose up --build`.

## Testing

* Unit tests for timeline arithmetic and dependency resolution.
* Integration test that mocks LLM responses and validates JSON parsing + date assignment.
* End-to-end test that hits `POST /api/v1/plans` with sample goals and asserts plan validity.

## Example flow & sample prompt

**Input:**

```
goal: "Publish a landing page and collect signups in 10 days"
start_date: 2025-10-20
constraints: { team_size: 2, exclude_weekends: true }
```

**Prompt to LLM:**

> "Break down the goal into JSON tasks with ids, titles, descriptions, durations (in days), earliest_start_offset (days), and dependencies. Return only JSON."

**Backend post-processing:**

* Convert durations → end dates
* Apply `exclude_weekends` calendar logic
* Ensure dependency start after dependent task ends
* Compute final project end date and mark critical path

## Frontend (Optional)

A minimal React frontend could:

* Accept goal, start date, constraints, and granularity
* Call `POST /api/v1/plans`
* Show the plan: list view and optional Gantt chart (use recharts or a lightweight Gantt library)
* Allow editing and saving back via `PUT /api/v1/plans/:id`

## Security & Safety

* Validate & sanitize all user input.
* Rate-limit plan generation (LLM calls can be costly).
* Do not log API keys or model prompts containing secrets.
* Normalize or reject LLM outputs that are missing required fields.

## Extensions & Improvements

* User accounts and multi-user workspace
* Recurring goals & templates
* Cost estimation and resource leveling
* Integration with calendar apps (Google Calendar) and task managers (Asana, Trello)
* Add a local LLM fallback for offline use

## Contributing

1. Fork the repo
2. Create a feature branch `feature/my-feature`
3. Open a PR with clear description and tests

## License

MIT © Your Name

---

If you'd like, I can also:

* Generate a working example backend (Express + OpenAI) scaffold
* Add sample frontend React component with Tailwind + Gantt preview
* Create Postman collection for the API

Tell me which of those you'd like next.
