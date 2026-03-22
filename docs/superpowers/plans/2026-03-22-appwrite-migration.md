# Appwrite Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Supabase persistence with Appwrite — new repository implementations, fix 4 repository pattern violations, and remove all Supabase code.

**Architecture:** Clean Architecture with repository pattern. New Appwrite implementations drop into the DI container. Presentation hooks and server actions consume repositories via the DI container — no SDK calls outside of repository classes. Both `appwrite` (browser) and `node-appwrite` (server) SDKs are used.

**Tech Stack:** Next.js 16, TypeScript 5, `appwrite` (browser SDK), `node-appwrite` (server SDK), Appwrite Databases + Auth

---

## File Map

**Create:**
- `src/infrastructure/appwrite/client.ts` — browser SDK client/account/database factories
- `src/infrastructure/appwrite/server.ts` — server SDK session + admin client factories
- `src/infrastructure/repositories/AppwriteAuthRepository.ts`
- `src/infrastructure/repositories/AppwriteTaskRepository.ts`
- `src/infrastructure/repositories/AppwriteTaskLogRepository.ts`

**Modify:**
- `src/domain/entities/TaskPriority.ts` — add `HIGHEST`
- `src/domain/entities/Task.ts` — add `updatedAt` field
- `src/domain/entities/TaskLog.ts` — add `updatedAt` field
- `src/domain/repositories/IAuthRepository.ts` — add `getAccessToken()`, update `signInWithGitHub` signature
- `src/application/use-cases/SignInWithGitHubUseCase.ts` — pass through `failureTo`
- `src/infrastructure/di/container.ts` — swap Supabase → Appwrite
- `src/presentation/hooks/useTasks.ts` — use DI container + Appwrite browser client
- `src/presentation/hooks/useAuth.ts` — use IAuthRepository, remove Supabase
- `src/presentation/components/TaskLogDialog.tsx` — remove Supabase direct call
- `src/app/auth/actions.ts` — Appwrite server client
- `src/app/auth/callback/route.ts` — simple redirect
- `src/app/(dashboard)/layout.tsx` — Appwrite session client
- `package.json` — swap Supabase for Appwrite packages

**Delete:**
- `src/infrastructure/supabase/` (entire directory)
- `src/infrastructure/repositories/SupabaseTaskRepository.ts`
- `src/infrastructure/repositories/SupabaseTaskLogRepository.ts`
- `src/infrastructure/repositories/SupabaseAuthRepository.ts`

> **Note:** After Task 3, `SupabaseAuthRepository.ts` will have TypeScript errors (it won't implement the updated `IAuthRepository` interface). This is expected and intentional — it will be deleted in Task 12 before the final build.

---

## Task 1: Install Appwrite Packages

**Files:** `package.json`

- [ ] **Step 1: Uninstall Supabase packages and install Appwrite**

```bash
cd /home/lucas/projects/ai-dashboard
npm uninstall @supabase/supabase-js @supabase/ssr
npm install appwrite node-appwrite
```

Expected: both packages installed successfully, `node_modules/appwrite` and `node_modules/node-appwrite` exist.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap supabase for appwrite and node-appwrite"
```

---

## Task 2: Update Domain Entities

**Files:**
- Modify: `src/domain/entities/TaskPriority.ts`
- Modify: `src/domain/entities/Task.ts`
- Modify: `src/domain/entities/TaskLog.ts`

- [ ] **Step 1: Add `HIGHEST` to `TaskPriority`**

Replace the entire file content:

```ts
export class TaskPriority {
  static readonly HIGHEST = 'highest'
  static readonly HIGH = 'high'
  static readonly MEDIUM = 'medium'
  static readonly LOW = 'low'
}
```

- [ ] **Step 2: Add `updatedAt` to `Task` entity**

Replace the entire file:

```ts
import { TaskPriority } from './TaskPriority'
import { TaskStatus } from './TaskStatus'

export interface CreateTaskInput {
  title: string
  description: string
  priority: string
  repository: string
}

interface TaskProps {
  id: string
  title: string
  description: string
  priority: string
  repository: string
  status: string
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export class Task {
  private readonly props: TaskProps

  private constructor(props: TaskProps) {
    this.props = { ...props }
  }

  /** Creates a new pending task */
  static create(input: CreateTaskInput): Task {
    const now = new Date()
    return new Task({
      id: globalThis.crypto.randomUUID(),
      title: input.title,
      description: input.description,
      priority: input.priority,
      repository: input.repository,
      status: TaskStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    })
  }

  /** Reconstructs a Task from persisted data */
  static build(props: TaskProps): Task {
    return new Task(props)
  }

  get id(): string { return this.props.id }
  get title(): string { return this.props.title }
  get description(): string { return this.props.description }
  get priority(): string { return this.props.priority }
  get repository(): string { return this.props.repository }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get completedAt(): Date | null { return this.props.completedAt }
  get isPending(): boolean { return this.props.status === TaskStatus.PENDING }
  get isComplete(): boolean { return this.props.status === TaskStatus.COMPLETE }

  update(changes: Partial<Pick<TaskProps, 'title' | 'description' | 'priority' | 'repository'>>): Task {
    return new Task({ ...this.props, ...changes, updatedAt: new Date() })
  }

  complete(): Task {
    const now = new Date()
    return new Task({ ...this.props, status: TaskStatus.COMPLETE, completedAt: now, updatedAt: now })
  }

  toObject(): TaskProps {
    return { ...this.props }
  }
}
```

- [ ] **Step 3: Add `updatedAt` to `TaskLog` entity**

Replace the entire file:

```ts
interface TaskLogProps {
  id: string
  taskId: string
  message: string
  createdAt: Date
  updatedAt: Date
}

export class TaskLog {
  private readonly props: TaskLogProps

  private constructor(props: TaskLogProps) {
    this.props = { ...props }
  }

  static build(props: TaskLogProps): TaskLog {
    return new TaskLog(props)
  }

  get id(): string { return this.props.id }
  get taskId(): string { return this.props.taskId }
  get message(): string { return this.props.message }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toObject(): TaskLogProps {
    return { ...this.props }
  }
}
```

> Note: `TaskLog.create()` is removed — task logs are only created by the external AI server, never by the dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/domain/entities/
git commit -m "feat: add updatedAt to Task/TaskLog entities, add HIGHEST priority"
```

---

## Task 3: Update `IAuthRepository` Interface and `SignInWithGitHubUseCase`

**Files:**
- Modify: `src/domain/repositories/IAuthRepository.ts`
- Modify: `src/application/use-cases/SignInWithGitHubUseCase.ts`

> After this task, `SupabaseAuthRepository.ts` will have TypeScript errors because it doesn't implement the updated interface. This is expected — it will be deleted in Task 12.

- [ ] **Step 1: Update `IAuthRepository`**

Replace the entire file:

```ts
export interface AuthUser {
  id: string
  email: string | undefined
}

export interface IAuthRepository {
  getUser(): Promise<AuthUser | null>
  signInWithGitHub(redirectTo: string, failureTo: string): Promise<string>
  signOut(): Promise<void>
  getAccessToken(): Promise<string | null>
}
```

- [ ] **Step 2: Update `SignInWithGitHubUseCase`**

Replace the entire file:

```ts
import { IAuthRepository } from '@/domain/repositories/IAuthRepository'

export class SignInWithGitHubUseCase {
  constructor(private readonly auth: IAuthRepository) {}

  async execute(redirectTo: string, failureTo: string): Promise<string> {
    return this.auth.signInWithGitHub(redirectTo, failureTo)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domain/repositories/IAuthRepository.ts src/application/use-cases/SignInWithGitHubUseCase.ts
git commit -m "feat: extend IAuthRepository with getAccessToken and failureTo param"
```

---

## Task 4: Create Appwrite Browser Client

**Files:**
- Create: `src/infrastructure/appwrite/client.ts`

- [ ] **Step 1: Create the browser client module**

```ts
import { Client, Account, Databases } from 'appwrite'

export function createBrowserClient(): Client {
  return new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
}

export function createBrowserAccount(client: Client): Account {
  return new Account(client)
}

export function createBrowserDatabases(client: Client): Databases {
  return new Databases(client)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/appwrite/client.ts
git commit -m "feat: add Appwrite browser client factories"
```

---

## Task 5: Create Appwrite Server Client

**Files:**
- Create: `src/infrastructure/appwrite/server.ts`

- [ ] **Step 1: Create the server client module**

```ts
import { Client, Account, Databases } from 'node-appwrite'
import { cookies } from 'next/headers'

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.getAll().find(c => c.name.startsWith('a_session_'))

  if (sessionCookie) {
    client.setSession(sessionCookie.value)
  }

  return {
    account: new Account(client),
    databases: new Databases(client),
  }
}

export function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!)

  return {
    account: new Account(client),
    databases: new Databases(client),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/appwrite/server.ts
git commit -m "feat: add Appwrite server client factories (session + admin)"
```

---

## Task 6: Create `AppwriteAuthRepository`

**Files:**
- Create: `src/infrastructure/repositories/AppwriteAuthRepository.ts`

- [ ] **Step 1: Create the repository**

```ts
import { IAuthRepository, AuthUser } from '@/domain/repositories/IAuthRepository'

// Structural interface satisfied by both appwrite.Account and node-appwrite.Account
interface AccountService {
  get(): Promise<{ $id: string; email: string }>
  deleteSession(sessionId: string): Promise<object>
  getSession(sessionId: string): Promise<{ providerAccessToken: string }>
}

export class AppwriteAuthRepository implements IAuthRepository {
  constructor(private readonly account: AccountService) {}

  async getUser(): Promise<AuthUser | null> {
    try {
      const user = await this.account.get()
      return { id: user.$id, email: user.email }
    } catch {
      return null
    }
  }

  async signInWithGitHub(redirectTo: string, failureTo: string): Promise<string> {
    // createOAuth2Token is a node-appwrite server-side method that returns
    // a redirect URL string without triggering a browser redirect.
    // Only called from server actions — never from browser context.
    const account = this.account as unknown as {
      createOAuth2Token(provider: string, success: string, failure: string, scopes: string[]): Promise<string>
    }
    return account.createOAuth2Token('github', redirectTo, failureTo, ['repo'])
  }

  async signOut(): Promise<void> {
    try {
      await this.account.deleteSession('current')
    } catch {
      // session may already be gone
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const session = await this.account.getSession('current')
      return session.providerAccessToken ?? null
    } catch {
      return null
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/repositories/AppwriteAuthRepository.ts
git commit -m "feat: add AppwriteAuthRepository"
```

---

## Task 7: Create `AppwriteTaskRepository`

**Files:**
- Create: `src/infrastructure/repositories/AppwriteTaskRepository.ts`

- [ ] **Step 1: Create the repository**

```ts
import { Databases, ID, Query } from 'appwrite'
import { ITaskRepository } from '@/domain/repositories/ITaskRepository'
import { Task, CreateTaskInput } from '@/domain/entities/Task'

function toTask(doc: Record<string, unknown>): Task {
  return Task.build({
    id: doc.$id as string,
    title: doc.title as string,
    description: doc.description as string,
    priority: doc.priority as string,
    repository: doc.repository as string,
    status: doc.status as string,
    createdAt: new Date(doc.$createdAt as string),
    updatedAt: new Date(doc.$updatedAt as string),
    completedAt: doc.completedAt ? new Date(doc.completedAt as string) : null,
  })
}

export class AppwriteTaskRepository implements ITaskRepository {
  private readonly databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  private readonly collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!

  constructor(private readonly databases: Databases) {}

  async findAll(): Promise<Task[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      this.collectionId,
      [Query.orderDesc('$createdAt')]
    )
    return response.documents.map(doc => toTask(doc as unknown as Record<string, unknown>))
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const doc = await this.databases.getDocument(this.databaseId, this.collectionId, id)
      return toTask(doc as unknown as Record<string, unknown>)
    } catch {
      return null
    }
  }

  async save(input: CreateTaskInput): Promise<Task> {
    const doc = await this.databases.createDocument(
      this.databaseId,
      this.collectionId,
      ID.unique(),
      {
        title: input.title,
        description: input.description,
        priority: input.priority,
        repository: input.repository,
        status: 'pending',
        completedAt: null,
      }
    )
    return toTask(doc as unknown as Record<string, unknown>)
  }

  async update(task: Task): Promise<Task> {
    const obj = task.toObject()
    const doc = await this.databases.updateDocument(
      this.databaseId,
      this.collectionId,
      obj.id,
      {
        title: obj.title,
        description: obj.description,
        priority: obj.priority,
        repository: obj.repository,
        status: obj.status,
        completedAt: obj.completedAt ? obj.completedAt.toISOString() : null,
      }
    )
    return toTask(doc as unknown as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    await this.databases.deleteDocument(this.databaseId, this.collectionId, id)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/repositories/AppwriteTaskRepository.ts
git commit -m "feat: add AppwriteTaskRepository"
```

---

## Task 8: Create `AppwriteTaskLogRepository`

**Files:**
- Create: `src/infrastructure/repositories/AppwriteTaskLogRepository.ts`

- [ ] **Step 1: Create the repository**

```ts
import { Databases, Query } from 'appwrite'
import { ITaskLogRepository } from '@/domain/repositories/ITaskLogRepository'
import { TaskLog } from '@/domain/entities/TaskLog'

function toTaskLog(doc: Record<string, unknown>): TaskLog {
  return TaskLog.build({
    id: doc.$id as string,
    taskId: doc.taskId as string,
    message: doc.message as string,
    createdAt: new Date(doc.$createdAt as string),
    updatedAt: new Date(doc.$updatedAt as string),
  })
}

export class AppwriteTaskLogRepository implements ITaskLogRepository {
  private readonly databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  private readonly collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID!

  constructor(private readonly databases: Databases) {}

  async findByTaskId(taskId: string): Promise<TaskLog[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      this.collectionId,
      [
        Query.equal('taskId', taskId),
        Query.orderAsc('$createdAt'),
      ]
    )
    return response.documents.map(doc => toTaskLog(doc as unknown as Record<string, unknown>))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/repositories/AppwriteTaskLogRepository.ts
git commit -m "feat: add AppwriteTaskLogRepository"
```

---

## Task 9: Update DI Container

**Files:**
- Modify: `src/infrastructure/di/container.ts`

- [ ] **Step 1: Replace Supabase exports with Appwrite**

Replace the entire file:

```ts
import { AppwriteAuthRepository } from '@/infrastructure/repositories/AppwriteAuthRepository'
import { AppwriteTaskRepository } from '@/infrastructure/repositories/AppwriteTaskRepository'
import { AppwriteTaskLogRepository } from '@/infrastructure/repositories/AppwriteTaskLogRepository'

export const AUTH_REPOSITORY = AppwriteAuthRepository
export const TASK_REPOSITORY = AppwriteTaskRepository
export const TASK_LOG_REPOSITORY = AppwriteTaskLogRepository
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/di/container.ts
git commit -m "feat: switch DI container to Appwrite repositories"
```

---

## Task 10: Fix Server-Side Auth (actions + callback + layout)

**Files:**
- Modify: `src/app/auth/actions.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update `auth/actions.ts`**

Replace the entire file:

```ts
'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient, createSessionClient } from '@/infrastructure/appwrite/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { SignInWithGitHubUseCase } from '@/application/use-cases/SignInWithGitHubUseCase'
import { SignOutUseCase } from '@/application/use-cases/SignOutUseCase'

export async function signInWithGitHub() {
  const origin = (await headers()).get('origin')
  const { account } = createAdminClient()
  const authRepository = new AUTH_REPOSITORY(account)
  const url = await new SignInWithGitHubUseCase(authRepository).execute(
    `${origin}/auth/callback`,
    `${origin}/auth/login`,
  )
  redirect(url)
}

export async function signOut() {
  const { account } = await createSessionClient()
  const authRepository = new AUTH_REPOSITORY(account)
  await new SignOutUseCase(authRepository).execute()
  redirect('/auth/login')
}
```

- [ ] **Step 2: Update `auth/callback/route.ts`**

Replace the entire file:

```ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`)
}
```

- [ ] **Step 3: Update `(dashboard)/layout.tsx`**

Replace the entire file:

```ts
import { redirect } from 'next/navigation'
import { createSessionClient } from '@/infrastructure/appwrite/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { GetUserUseCase } from '@/application/use-cases/GetUserUseCase'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { account } = await createSessionClient()
  const authRepository = new AUTH_REPOSITORY(account)
  const user = await new GetUserUseCase(authRepository).execute()

  if (!user) redirect('/auth/login')

  return <>{children}</>
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/actions.ts src/app/auth/callback/route.ts src/app/(dashboard)/layout.tsx
git commit -m "feat: migrate server-side auth to Appwrite"
```

---

## Task 11: Fix Presentation Layer Violations

**Files:**
- Modify: `src/presentation/hooks/useTasks.ts`
- Modify: `src/presentation/hooks/useAuth.ts`
- Modify: `src/presentation/components/TaskLogDialog.tsx`

- [ ] **Step 1: Update `useTasks.ts`**

Replace the entire file:

```ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Task, CreateTaskInput } from '@/domain/entities/Task'
import { createBrowserClient, createBrowserDatabases } from '@/infrastructure/appwrite/client'
import { TASK_REPOSITORY } from '@/infrastructure/di/container'
import { GetTasksUseCase } from '@/application/use-cases/GetTasksUseCase'
import { CreateTaskUseCase } from '@/application/use-cases/CreateTaskUseCase'
import { UpdateTaskUseCase, UpdateTaskChanges } from '@/application/use-cases/UpdateTaskUseCase'
import { DeleteTaskUseCase } from '@/application/use-cases/DeleteTaskUseCase'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const repository = useMemo(
    () => new TASK_REPOSITORY(createBrowserDatabases(createBrowserClient())),
    []
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await new GetTasksUseCase(repository).execute()
      setTasks(result)
    } catch {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [repository])

  useEffect(() => { load() }, [load])

  const create = async (input: CreateTaskInput) => {
    const task = await new CreateTaskUseCase(repository).execute(input)
    setTasks(prev => [task, ...prev])
  }

  const update = async (id: string, changes: UpdateTaskChanges) => {
    const task = await new UpdateTaskUseCase(repository).execute({ id, changes })
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  const remove = async (id: string) => {
    await new DeleteTaskUseCase(repository).execute(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return { tasks, loading, error, create, update, remove, reload: load }
}
```

- [ ] **Step 2: Update `useAuth.ts`**

Replace the entire file:

```ts
'use client'

import { useState, useEffect } from 'react'
import { AuthUser } from '@/domain/repositories/IAuthRepository'
import { createBrowserClient, createBrowserAccount } from '@/infrastructure/appwrite/client'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const account = createBrowserAccount(createBrowserClient())
    const authRepository = new AUTH_REPOSITORY(account)

    Promise.all([
      authRepository.getUser(),
      authRepository.getAccessToken(),
    ]).then(([u, t]) => {
      setUser(u)
      setAccessToken(t)
      setLoading(false)
    })
  }, [])

  return { user, accessToken, loading }
}
```

- [ ] **Step 3: Update `TaskLogDialog.tsx`**

Replace only the import and client instantiation inside the `fetchLogs` function. The full updated file:

```ts
'use client'

import { useEffect, useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskLog } from '@/domain/entities/TaskLog'
import { createBrowserClient, createBrowserDatabases } from '@/infrastructure/appwrite/client'
import { TASK_LOG_REPOSITORY } from '@/infrastructure/di/container'
import { GetTaskLogsUseCase } from '@/application/use-cases/GetTaskLogsUseCase'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface TaskLogDialogProps {
  task: Task | null
  onClose: () => void
}

export default function TaskLogDialog({ task, onClose }: TaskLogDialogProps) {
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!task) return

    const fetchLogs = async () => {
      setLoading(true)
      const taskLogRepository = new TASK_LOG_REPOSITORY(createBrowserDatabases(createBrowserClient()))
      const result = await new GetTaskLogsUseCase(taskLogRepository).execute(task.id)
      setLogs(result)
      setLoading(false)
    }

    fetchLogs()
  }, [task])

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Logs — {task?.title}</DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && logs.length === 0 && (
          <p className="text-sm text-muted-foreground">No logs yet.</p>
        )}

        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="text-sm border-l-2 pl-3 py-1">
              <p className="text-xs text-muted-foreground mb-1">
                {log.createdAt.toLocaleString()}
              </p>
              <p>{log.message}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/presentation/hooks/useTasks.ts src/presentation/hooks/useAuth.ts src/presentation/components/TaskLogDialog.tsx
git commit -m "feat: migrate presentation layer to Appwrite (fix all repository violations)"
```

---

## Task 12: Delete Supabase Files and Verify Build

**Files:**
- Delete: `src/infrastructure/supabase/client.ts`
- Delete: `src/infrastructure/supabase/server.ts`
- Delete: `src/infrastructure/repositories/SupabaseTaskRepository.ts`
- Delete: `src/infrastructure/repositories/SupabaseTaskLogRepository.ts`
- Delete: `src/infrastructure/repositories/SupabaseAuthRepository.ts`

- [ ] **Step 1: Delete all Supabase infrastructure files**

```bash
rm -rf /home/lucas/projects/ai-dashboard/src/infrastructure/supabase
rm /home/lucas/projects/ai-dashboard/src/infrastructure/repositories/SupabaseTaskRepository.ts
rm /home/lucas/projects/ai-dashboard/src/infrastructure/repositories/SupabaseTaskLogRepository.ts
rm /home/lucas/projects/ai-dashboard/src/infrastructure/repositories/SupabaseAuthRepository.ts
```

- [ ] **Step 2: Run the build to verify no TypeScript errors**

```bash
cd /home/lucas/projects/ai-dashboard && npm run build
```

Expected: build completes successfully with no TypeScript errors. If errors appear, fix them before committing.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete Appwrite migration — remove all Supabase code"
```

---

## Completion Checklist

After all tasks are done, verify:

- [ ] `npm run build` passes with no errors
- [ ] No imports of `@supabase/supabase-js` or `@supabase/ssr` remain: `grep -r "supabase" src/ --include="*.ts" --include="*.tsx"`
- [ ] No direct `createClient()` calls outside of Appwrite factories: `grep -r "createClient" src/ --include="*.ts" --include="*.tsx"`
- [ ] All 5 Appwrite files exist: `ls src/infrastructure/appwrite/ src/infrastructure/repositories/Appwrite*.ts`
