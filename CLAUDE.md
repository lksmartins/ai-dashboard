# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js with Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured. There is no `npm test` command.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

This app follows **Clean Architecture** with strict layer separation. The dependency rule: inner layers never import from outer layers.

```
Presentation → Application → Domain ← Infrastructure
```

| Layer | Path | Responsibility |
|-------|------|----------------|
| Domain | `src/domain/` | Entities and repository interfaces — no framework dependencies |
| Application | `src/application/` | Use cases (one file = one operation), service interfaces |
| Infrastructure | `src/infrastructure/` | Supabase repositories, GitHub API client, DI container |
| Presentation | `src/presentation/` | React components, custom hooks |
| Next.js App | `src/app/` | Routing, server actions, OAuth callback |

**Key patterns:**
- All persistence goes through repository interfaces (`ITaskRepository`, `IAuthRepository`, `ITaskLogRepository`) — never call Supabase directly from components or use cases
- Use cases are instantiated with concrete repositories from `src/infrastructure/di/container.ts`
- `src/infrastructure/supabase/client.ts` = browser client; `server.ts` = server-side client (cookies)
- `src/components/ui/` = shadcn/ui components (do not modify structure)

## What This App Does

A task management dashboard where users create tasks linked to GitHub repos. A separate Claude AI server (not in this repo) reads tasks from Supabase and processes them autonomously, writing results to `task_logs`. The dashboard displays task status and activity logs.

**Auth flow:** GitHub OAuth via Supabase → callback at `/auth/callback` → session stored in cookies → `(dashboard)/layout.tsx` guards protected routes via `GetUserUseCase`.

**Task logs:** Written by the external AI server using the Supabase service role key (insert-only for non-authenticated users). The dashboard reads them via `GetTaskLogsUseCase`.

## Database

Schema is in `supabase/schema.sql`. Two tables: `tasks` and `task_logs`. RLS is enabled — authenticated users own all task operations; `task_logs` inserts require service role.

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
