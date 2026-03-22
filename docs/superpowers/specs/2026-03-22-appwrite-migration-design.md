# Appwrite Migration Design

**Date:** 2026-03-22
**Status:** Approved

## Overview

Full migration of the persistence layer from Supabase to Appwrite. All three repository interfaces are retained; one method is added to `IAuthRepository` to expose the GitHub provider access token. Three repository pattern violations in the presentation layer are fixed. All Supabase code and dependencies are removed.

## Goals

1. All persistence goes through the repository pattern — no direct SDK calls from components, hooks, or server actions.
2. Create Appwrite implementations of all three repository interfaces.
3. Fix three existing violations of the repository pattern.
4. Remove all Supabase code and the `@supabase/*` dependencies.

## Interface Changes

### `IAuthRepository` — add one method

```ts
getAccessToken(): Promise<string | null>
```

`useAuth.ts` currently reads `session.provider_token` directly from the Supabase client. This method exposes the GitHub OAuth access token through the repository interface instead.

No other interface changes. `ITaskRepository` and `ITaskLogRepository` are unchanged.

## Domain Entity Changes

### `TaskPriority`
Add `HIGHEST = 'highest'` to match the actual priority enum used in the database.

### `Task` entity
Add `updatedAt: Date` to `TaskProps` and expose via getter. Update `Task.build()` accordingly.

### `TaskLog` entity
Add `updatedAt: Date` to `TaskLogProps` and expose via getter. Update `TaskLog.build()` accordingly.

## New Infrastructure

### `src/infrastructure/appwrite/client.ts`
Browser-side Appwrite client using `@appwrite.io/sdk` (web SDK). Uses `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID`.

### `src/infrastructure/appwrite/server.ts`
Server-side Appwrite client using the Node.js SDK with session cookie support for SSR. Uses the same public env vars plus `APPWRITE_API_KEY` for elevated operations (inserting task logs).

### `AppwriteTaskRepository`
Implements `ITaskRepository`. Uses the Appwrite Databases service. Collection: `APPWRITE_TASKS_COLLECTION_ID` in `APPWRITE_DATABASE_ID`. Maps Appwrite documents (`$id`, `$createdAt`, `$updatedAt`) to `Task` entities.

### `AppwriteAuthRepository`
Implements `IAuthRepository`. Uses the Appwrite Account service.

- `getUser()` — calls `account.get()`
- `signInWithGitHub(redirectTo)` — constructs and returns the Appwrite OAuth2 URL (`{endpoint}/account/sessions/oauth2/github?project={projectId}&success={redirectTo}`)
- `signOut()` — calls `account.deleteSession('current')`
- `getAccessToken()` — calls `account.getSession('current')` and returns `session.providerAccessToken`

### `AppwriteTaskLogRepository`
Implements `ITaskLogRepository`. Uses the Appwrite Databases service with the API key client (server-side). Collection: `APPWRITE_TASK_LOGS_COLLECTION_ID`. Queries with `taskId` equal filter, ordered by `createdAt` ascending.

## Repository Pattern Violations to Fix

### 1. `useTasks.ts`
**Current:** imports `SupabaseTaskRepository` directly and instantiates it with `createClient()`.
**Fix:** import `TASK_REPOSITORY` from the DI container and `createBrowserClient` from `src/infrastructure/appwrite/client.ts`.

### 2. `useAuth.ts`
**Current:** calls `createClient()` directly, reads `session.provider_token`, subscribes to `auth.onAuthStateChange`.
**Fix:** rewrite to use `AUTH_REPOSITORY` from DI container. Poll or re-fetch auth state using `getUser()` and `getAccessToken()` from `IAuthRepository`. Remove Supabase auth subscription (Appwrite does not have an equivalent real-time auth subscription in the same form; use an effect on mount instead).

### 3. `auth/callback/route.ts`
**Current:** calls `supabase.auth.exchangeCodeForSession(code)` directly.
**Fix:** Appwrite handles the OAuth code exchange itself before redirecting to the success URL. The callback route is no longer needed for session exchange — replace it with a simple redirect to `/` (or remove it entirely if the success URL points directly to `/`).

## DI Container

`src/infrastructure/di/container.ts` switches all three exports to the Appwrite implementations:

```ts
export const AUTH_REPOSITORY = AppwriteAuthRepository
export const TASK_REPOSITORY = AppwriteTaskRepository
export const TASK_LOG_REPOSITORY = AppwriteTaskLogRepository
```

Consumers (`useAuth`, `useTasks`, server actions, layouts) stay unchanged in how they import from the container.

## Auth Flow (Post-Migration)

1. User hits `/auth/login` → clicks "Sign in with GitHub"
2. Server action `signInWithGitHub()` calls `AppwriteAuthRepository.signInWithGitHub(successUrl)` → returns Appwrite OAuth URL → Next.js `redirect(url)`
3. User authenticates with GitHub → Appwrite exchanges code, creates session, sets session cookie → redirects to success URL (`/auth/callback`)
4. `/auth/callback` route confirms session and redirects to `/`
5. Dashboard layout calls `GetUserUseCase` via `AppwriteAuthRepository.getUser()` — protected route works as before

## Data Model

### `tasks` collection (Appwrite)

| Attribute | Type | Notes |
|---|---|---|
| `title` | string | required |
| `description` | string | required |
| `priority` | string | enum: highest/high/medium/low |
| `repository` | string | owner/repo format |
| `status` | string | enum: pending/complete |
| `createdAt` | datetime | |
| `completedAt` | datetime | nullable |
| `updatedAt` | datetime | |

System fields `$id`, `$createdAt`, `$updatedAt` used by mapper.

### `task_logs` collection (Appwrite)

| Attribute | Type | Notes |
|---|---|---|
| `taskId` | string | references tasks document `$id` |
| `message` | string | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

**Permissions:** `task_logs` inserts require the server API key (same pattern as current Supabase service role key).

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | public | Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | public | Appwrite project ID |
| `APPWRITE_DATABASE_ID` | server | Database ID |
| `APPWRITE_TASKS_COLLECTION_ID` | server | Tasks collection ID |
| `APPWRITE_TASK_LOGS_COLLECTION_ID` | server | Task logs collection ID |
| `APPWRITE_API_KEY` | server | API key for elevated server operations |

## Removals

- `src/infrastructure/supabase/` — entire directory deleted
- `src/infrastructure/repositories/SupabaseTaskRepository.ts`
- `src/infrastructure/repositories/SupabaseTaskLogRepository.ts`
- `src/infrastructure/repositories/SupabaseAuthRepository.ts`
- `@supabase/supabase-js` and `@supabase/ssr` npm packages removed
