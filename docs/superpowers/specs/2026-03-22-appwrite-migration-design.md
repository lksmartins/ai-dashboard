# Appwrite Migration Design

**Date:** 2026-03-22
**Status:** Approved

## Overview

Full migration of the persistence layer from Supabase to Appwrite. All three repository interfaces are retained; one method is added to `IAuthRepository` to expose the GitHub provider access token. Four repository pattern violations in the presentation layer are fixed. All Supabase code and dependencies are removed.

## Goals

1. All persistence goes through the repository pattern — no direct SDK calls from components, hooks, or server actions.
2. Create Appwrite implementations of all three repository interfaces.
3. Fix four existing repository pattern violations.
4. Remove all Supabase code and the `@supabase/*` dependencies.

## npm Packages

| Package | Purpose |
|---|---|
| `appwrite` | Browser/web SDK — client-side auth and database operations |
| `node-appwrite` | Node.js SDK — server components, server actions, API routes |

## Interface Changes

### `IAuthRepository` — changes

Add one method:
```ts
getAccessToken(): Promise<string | null>
```

Update `signInWithGitHub` to accept a failure URL:
```ts
signInWithGitHub(redirectTo: string, failureTo: string): Promise<string>
```

`getUser()` must return `null` (not throw) when no session exists. In Appwrite, `account.get()` throws a 401 exception for unauthenticated users — implementations must catch this and return `null`.

No other interface changes. `ITaskRepository` and `ITaskLogRepository` are unchanged.

## Domain Entity Changes

### `TaskPriority`
Add `HIGHEST = 'highest'` to match the actual priority enum used in the database.

### `Task` entity
Add `updatedAt: Date` to `TaskProps` and expose via getter. Update `Task.build()` accordingly.

### `TaskLog` entity
Add `updatedAt: Date` to `TaskLogProps` and expose via getter. Update `TaskLog.build()` accordingly. Note: task logs are append-only; `updatedAt` will equal `createdAt` in practice and is mapped purely for completeness from the Appwrite `$updatedAt` system field.

## New Infrastructure

### `src/infrastructure/appwrite/client.ts`
Browser-side client factories using the `appwrite` npm package. Exports:
- `createBrowserClient()` — returns a configured `Client` instance
- `createBrowserAccount(client)` — returns an `Account` instance
- `createBrowserDatabases(client)` — returns a `Databases` instance

Configured with `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID`.

### `src/infrastructure/appwrite/server.ts`
Server-side client factories using the `node-appwrite` npm package. Exports two factories:

- `createSessionClient()` — reads Next.js request cookies via `cookies()` from `next/headers`. Scans for any cookie whose name starts with `a_session_` (do not hard-code the derived name — it is implementation-specific and can drift across SDK versions). If no such cookie is found, returns `{ account, databases }` with an unauthenticated client (no session set) — callers rely on `getUser()` catching the resulting 401 and returning `null`. If a cookie is found, calls `client.setSession(cookieValue)`. Returns `{ account, databases }` in both cases.
- `createAdminClient()` — calls `client.setKey(APPWRITE_API_KEY)`. Returns `{ account, databases }`.

Both factories set `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID` on the client. The `NEXT_PUBLIC_` prefix makes these vars available on both browser and server — this is intentional.

### `AppwriteTaskRepository`
Implements `ITaskRepository`. **Browser-only** — instantiated in `useTasks.ts` using the `appwrite` browser SDK. Database: `NEXT_PUBLIC_APPWRITE_DATABASE_ID`. Collection: `NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID`.

Constructor accepts a `Databases` instance from the `appwrite` browser SDK.

Maps Appwrite document fields to `Task` entity:
- `$id` → `id`
- `$createdAt` → `createdAt` (system field — no custom attribute needed)
- `$updatedAt` → `updatedAt` (system field — no custom attribute needed)
- `completedAt`, `title`, `description`, `priority`, `repository`, `status` mapped by name

### `AppwriteAuthRepository`
Implements `IAuthRepository`. Used from both browser hooks and server actions/layouts.

To support both SDKs without casting to `any`, define a local structural interface inside this file:

```ts
interface AccountService {
  get(): Promise<{ $id: string; email: string }>
  deleteSession(sessionId: string): Promise<object>
  getSession(sessionId: string): Promise<{ providerAccessToken: string }>
}
```

Both `appwrite.Account` and `node-appwrite.Account` satisfy this structurally. Constructor typed as `AccountService`.

Method details:
- `getUser()` — calls `account.get()`; wraps in try/catch, returns `null` on any exception. Maps `$id` → `id`.
- `signInWithGitHub(redirectTo, failureTo)` — returns the Appwrite GitHub OAuth URL as a string.
  - **Server-side (server action):** use `node-appwrite` `account.createOAuth2Token(OAuthProvider.Github, redirectTo, failureTo, ['repo'])` (available in Appwrite SDK 14+ / Appwrite 1.5+), which returns a URL string without triggering a redirect. No session is needed — instantiate `AppwriteAuthRepository` with a plain unauthenticated `node-appwrite` client for the sign-in action.
  - **Browser-side:** not called from the browser — sign-in is always initiated from a server action.
  - The `repo` scope is required to obtain a `providerAccessToken` with permission to list GitHub repositories.

- `signOut()` — calls `account.deleteSession('current')`; wraps in try/catch.
- `getAccessToken()` — calls `account.getSession('current')` and returns `session.providerAccessToken`. Both `appwrite` and `node-appwrite` session models include `providerAccessToken` as a `string` field. This method is called browser-side only (from `useAuth.ts`), but is safe to call server-side — wraps in try/catch and returns `null` on any exception.

### `AppwriteTaskLogRepository`
Implements `ITaskLogRepository`. **Browser-only** — instantiated in `TaskLogDialog.tsx`. Uses the `appwrite` browser SDK.

Constructor accepts a `Databases` instance from the `appwrite` browser SDK. Database: `NEXT_PUBLIC_APPWRITE_DATABASE_ID`. Collection: `NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID`. Queries with `Query.equal('taskId', taskId)`, ordered by `$createdAt` ascending. Appwrite indexes `$createdAt` by default — no custom index needed for ordering on this system field.

Maps: `$id` → `id`; `taskId`, `message` by name; `$createdAt` → `createdAt`; `$updatedAt` → `updatedAt`.

The external AI server writes to `task_logs` using the `node-appwrite` admin client with `APPWRITE_API_KEY` — outside the scope of this migration.

## Repository Pattern Violations to Fix

### 1. `useTasks.ts`
**Fix:** remove Supabase import; use `TASK_REPOSITORY` from DI container; instantiate with `createBrowserDatabases(createBrowserClient())` from `src/infrastructure/appwrite/client.ts`.

### 2. `useAuth.ts`
**Fix:** remove Supabase import and subscription; rewrite to use `AUTH_REPOSITORY` from DI container with `createBrowserAccount(createBrowserClient())`. On mount, call `getUser()` and `getAccessToken()`. Appwrite has no real-time auth state subscription — use a single fetch on mount.

### 3. `TaskLogDialog.tsx`
**Fix:** remove `createClient()` Supabase import; instantiate `TASK_LOG_REPOSITORY` with `createBrowserDatabases(createBrowserClient())`.

### 4. `auth/callback/route.ts`
**Fix:** remove `supabase.auth.exchangeCodeForSession` call. Replace route body with `NextResponse.redirect('/')`. The route file must be kept — Appwrite redirects to `/auth/callback` as the registered success URL and the session is already established by Appwrite before reaching this route.

## Use Case Changes

### `SignInWithGitHubUseCase`
Add `failureTo: string` as a second parameter to `execute()` and pass it through to `authRepository.signInWithGitHub(redirectTo, failureTo)`.

## Sign-Out Flow

`src/app/auth/actions.ts` `signOut()` server action:
1. Calls `createSessionClient()` to get a session-scoped `account`
2. Instantiates `new AUTH_REPOSITORY(account)`
3. Calls `new SignOutUseCase(authRepository).execute()`
4. `redirect('/auth/login')`

`AppwriteAuthRepository.signOut()` calls `account.deleteSession('current')`.

## DI Container

`src/infrastructure/di/container.ts` — update (do not delete) to switch all exports to Appwrite implementations:

```ts
import { AppwriteAuthRepository } from '@/infrastructure/repositories/AppwriteAuthRepository'
import { AppwriteTaskRepository } from '@/infrastructure/repositories/AppwriteTaskRepository'
import { AppwriteTaskLogRepository } from '@/infrastructure/repositories/AppwriteTaskLogRepository'

export const AUTH_REPOSITORY = AppwriteAuthRepository
export const TASK_REPOSITORY = AppwriteTaskRepository
export const TASK_LOG_REPOSITORY = AppwriteTaskLogRepository
```

## Auth Flow (Post-Migration)

1. User hits `/auth/login` → clicks "Sign in with GitHub"
2. `src/app/auth/actions.ts` server action `signInWithGitHub()`:
   - Creates a plain unauthenticated `node-appwrite` client (no session required to build the OAuth URL)
   - Instantiates `new AUTH_REPOSITORY(account)`
   - Calls `new SignInWithGitHubUseCase(authRepository).execute(successUrl, failureUrl)` where `successUrl = {origin}/auth/callback` and `failureUrl = {origin}/auth/login`
   - `redirect(url)`
3. User authenticates with GitHub → Appwrite exchanges code, creates session, sets session cookie → redirects to `/auth/callback`
4. `/auth/callback` route redirects to `/` (session already established by Appwrite)
5. Dashboard layout at `src/app/(dashboard)/layout.tsx`:
   - Calls `createSessionClient()`
   - Instantiates `new AUTH_REPOSITORY(account)`
   - Calls `GetUserUseCase` → redirects to `/auth/login` if `null`

## Data Model

### `tasks` collection (Appwrite)

Custom attributes only — do **not** create `createdAt` or `updatedAt` custom attributes (use system fields `$createdAt` / `$updatedAt`):

| Attribute | Type | Notes |
|---|---|---|
| `title` | string | required |
| `description` | string | required |
| `priority` | string | enum: highest/high/medium/low |
| `repository` | string | owner/repo format |
| `status` | string | enum: pending/complete |
| `completedAt` | datetime | nullable |

**Appwrite collection permissions:** grant `read`, `create`, `update`, `delete` to role `users` (authenticated users). No public access. Server API key bypasses collection permissions entirely — no permission entry is needed for the API key. Exposing collection IDs via `NEXT_PUBLIC_` env vars is safe because Appwrite enforces permissions server-side regardless of whether IDs are known client-side.

### `task_logs` collection (Appwrite)

Custom attributes only:

| Attribute | Type | Notes |
|---|---|---|
| `taskId` | string | references tasks document `$id` |
| `message` | string | |

**Appwrite collection permissions:** grant `read` to role `users` only. Do not grant `create`, `update`, or `delete` to any role — the external AI server writes via API key, which bypasses collection permissions. Authenticated users cannot write logs.

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | public (browser + server) | Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | public (browser + server) | Appwrite project ID |
| `NEXT_PUBLIC_APPWRITE_DATABASE_ID` | public (browser + server) | Database ID — `NEXT_PUBLIC_` intentionally for dual-side access |
| `NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID` | public (browser + server) | Tasks collection ID |
| `NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID` | public (browser + server) | Task logs collection ID |
| `APPWRITE_API_KEY` | server-only | API key for elevated server operations |

## Files to Create

- `src/infrastructure/appwrite/client.ts`
- `src/infrastructure/appwrite/server.ts`
- `src/infrastructure/repositories/AppwriteTaskRepository.ts`
- `src/infrastructure/repositories/AppwriteAuthRepository.ts`
- `src/infrastructure/repositories/AppwriteTaskLogRepository.ts`

## Files to Update

- `src/domain/repositories/IAuthRepository.ts` — add `getAccessToken()`, add `failureTo` param to `signInWithGitHub`
- `src/domain/entities/TaskPriority.ts` — add `HIGHEST`
- `src/domain/entities/Task.ts` — add `updatedAt` field
- `src/domain/entities/TaskLog.ts` — add `updatedAt` field
- `src/application/use-cases/SignInWithGitHubUseCase.ts` — accept and pass through `failureTo` parameter
- `src/infrastructure/di/container.ts` — replace Supabase imports/exports with Appwrite
- `src/presentation/hooks/useTasks.ts` — use DI container + Appwrite browser client
- `src/presentation/hooks/useAuth.ts` — use `IAuthRepository`, remove Supabase subscription
- `src/presentation/components/TaskLogDialog.tsx` — use Appwrite browser client, remove Supabase import
- `src/app/auth/actions.ts` — replace Supabase server client with unauthenticated Appwrite client for sign-in; pass `failureTo`; replace Supabase session client for sign-out
- `src/app/auth/callback/route.ts` — replace session exchange with simple redirect
- `src/app/(dashboard)/layout.tsx` — replace Supabase server client with Appwrite session client
- `package.json` — uninstall `@supabase/supabase-js` and `@supabase/ssr`; install `appwrite` and `node-appwrite`

## Files to Delete

All Supabase files should be deleted **after** the Appwrite implementations are in place and the interface changes are complete, to avoid transient type errors:

- `src/infrastructure/supabase/` — entire directory
- `src/infrastructure/repositories/SupabaseTaskRepository.ts`
- `src/infrastructure/repositories/SupabaseTaskLogRepository.ts`
- `src/infrastructure/repositories/SupabaseAuthRepository.ts`
