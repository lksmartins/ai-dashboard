# AI Dashboard

A frontend dashboard for managing AI-assisted development tasks across your GitHub repositories. Tasks are stored in Supabase and processed autonomously by a separate Claude AI server.

## Overview

This project is a **frontend-only** application. It provides a user-friendly interface to create, edit, delete, and monitor tasks. A separate Claude AI server independently reads and updates tasks via the Supabase API — this dashboard simply reflects the current state and lets the user manage the queue.

```
┌─────────────────────┐        ┌──────────────────────┐
│   AI Dashboard      │        │   Claude AI Server   │
│   (this project)    │        │   (separate server)  │
│                     │        │                      │
│  React + Vercel     │        │  Reads pending tasks │
│                     │   ┌──▶│  Works autonomously  │
│  CRUD tasks via     │   │    │  Marks complete      │
│  Supabase API       │   │    │  Writes logs         │
└────────┬────────────┘   │    └──────────────────────┘
         │                │
         ▼                │
┌─────────────────────────┴────┐
│         Supabase             │
│  Auth · PostgreSQL · API     │
└──────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hosting | [Vercel](https://vercel.com) |
| Frontend | [React](https://react.dev) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Authentication | [Supabase Auth](https://supabase.com/auth) (GitHub OAuth) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| GitHub Integration | GitHub OAuth + REST API |

## Features

- **Task Management** — Add, edit, and delete tasks with priority levels (high, medium, low)
- **GitHub Integration** — Authenticate with GitHub and select from your own repositories when creating a task
- **Live Task Queue** — View pending and completed tasks updated in real time as the AI server processes them
- **Activity Log** — Browse a full history of what the AI server did for each task
- **Authentication** — Secure login via Supabase Auth (GitHub OAuth)

## How It Works

1. **Sign in** — Authenticate with your GitHub account via Supabase Auth
2. **Create a task** — Provide a title, description, priority level, and pick a repo from your GitHub account
3. **Tasks are queued** — Saved to the Supabase `tasks` table with status `pending`
4. **AI processes tasks** — The separate Claude AI server polls Supabase hourly, works through tasks by priority, writes logs to `task_logs`, and marks tasks `complete`
5. **Review activity** — The dashboard reads from `task_logs` so you can see exactly what was done

## Task Priority Levels

| Priority | Description |
|----------|-------------|
| `high`   | Processed first — critical or time-sensitive work |
| `medium` | Standard priority |
| `low`    | Background tasks, processed last |

## Database Schema

### `tasks` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users` |
| `title` | `text` | Task title |
| `description` | `text` | Task details |
| `priority` | `text` | `high`, `medium`, or `low` |
| `repository` | `text` | GitHub repo (`owner/repo`) |
| `status` | `text` | `pending` or `complete` |
| `created_at` | `timestamptz` | Creation timestamp |
| `completed_at` | `timestamptz` | Completion timestamp (nullable) |

### `task_logs` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `task_id` | `uuid` | References `tasks.id` |
| `message` | `text` | Log entry written by the AI server |
| `created_at` | `timestamptz` | Log timestamp |

## Architecture

This project follows **Clean Architecture** principles with a strict separation of concerns across three layers. Code is written to **Clean Code** and **SOLID** standards throughout.

### Layers

```
src/
├── domain/                  # Enterprise business rules — no dependencies on outer layers
│   ├── entities/            # Core business objects (Task, TaskLog, User)
│   └── repositories/        # Repository interfaces (contracts only, no implementation)
│
├── application/             # Application business rules — orchestrates domain objects
│   ├── use-cases/           # One file per use case (CreateTask, DeleteTask, GetTasks…)
│   └── services/            # Application services (GitHubService…)
│
├── infrastructure/          # Frameworks, drivers, and external services
│   ├── repositories/        # Concrete Supabase implementations of domain repository interfaces
│   └── github/              # GitHub API client
│
└── presentation/            # React UI — components, pages, hooks
    ├── components/          # shadcn/ui-based components
    ├── pages/               # React pages
    └── hooks/               # Custom React hooks (call use-cases, not infra directly)
```

### Repository Pattern

All persistence interactions go through a repository. The **domain layer** defines the interface; the **infrastructure layer** provides the Supabase implementation. Application code depends only on the interface — never on Supabase directly.

```ts
// domain/repositories/ITaskRepository.ts
export interface ITaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  save(task: Task): Promise<void>;
  update(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
}
```

```ts
// infrastructure/repositories/SupabaseTaskRepository.ts
export class SupabaseTaskRepository implements ITaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(): Promise<Task[]> {
    const { data } = await this.client
      .from('tasks')
      .select('*')
      .order('priority');
    return data.map(toTaskEntity);
  }
  // ...
}
```

Use cases receive the repository through constructor injection, keeping them fully testable and decoupled from any database choice:

```ts
// application/use-cases/CreateTaskUseCase.ts
export class CreateTaskUseCase {
  constructor(private readonly tasks: ITaskRepository) {}

  async execute(input: CreateTaskInput): Promise<void> {
    const task = Task.create(input);
    await this.tasks.save(task);
  }
}
```

### Dependency Rule

Dependencies always point **inward**. Outer layers know about inner layers — inner layers never know about outer layers.

```
presentation  →  application  →  domain
infrastructure  →  application  →  domain
```

### SOLID Principles Applied

| Principle | Application |
|-----------|-------------|
| **S** — Single Responsibility | Each use case, repository, and component has one reason to change |
| **O** — Open/Closed | New repository backends can be added without modifying use cases |
| **L** — Liskov Substitution | Any `ITaskRepository` implementation is a valid drop-in |
| **I** — Interface Segregation | Repository interfaces are split by domain concern, not bundled together |
| **D** — Dependency Inversion | Use cases depend on `ITaskRepository`, never on `SupabaseTaskRepository` |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# GitHub OAuth is configured directly in the Supabase Auth dashboard — no extra env vars needed
```

## Getting Started

1. Clone the repository and install dependencies
   ```bash
   git clone https://github.com/your-username/ai-dashboard.git
   cd ai-dashboard
   npm install
   ```

2. Create a Supabase project and run the schema migrations

3. Enable GitHub as an OAuth provider in your Supabase Auth settings

4. Copy `.env.example` to `.env.local` and fill in your credentials

5. Run the development server
   ```bash
   npm run dev
   ```

6. Deploy to Vercel and add your environment variables in the Vercel dashboard
