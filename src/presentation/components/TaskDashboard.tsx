'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskStatus } from '@/domain/entities/TaskStatus'
import { useAuth } from '@/presentation/hooks/useAuth'
import { useTasks } from '@/presentation/hooks/useTasks'
import { useGitHubRepos } from '@/presentation/hooks/useGitHubRepos'
import { useSearchParams } from 'next/navigation'
import { triggerTaskRunner } from '@/app/(dashboard)/actions'
import Header from './Header'
import TaskList from './TaskList'
import TaskFormDialog from './TaskFormDialog'
import TaskLogDialog from './TaskLogDialog'
import DoneTaskDialog from './DoneTaskDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskPriority } from '@/domain/entities/TaskPriority'

type SortField = 'status' | 'priority' | 'createdAt'

const STATUS_ORDER: Record<string, number> = {
  [TaskStatus.PENDING]: 0,
  [TaskStatus.DONE]: 1,
  [TaskStatus.COMPLETE]: 2,
}

const PRIORITY_ORDER: Record<string, number> = {
  [TaskPriority.HIGHEST]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
}

function compareBy(a: Task, b: Task, field: SortField): number {
  switch (field) {
    case 'status':
      return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
    case 'priority':
      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    case 'createdAt':
      return b.createdAt.getTime() - a.createdAt.getTime()
  }
}

const SORT_CHAINS: Record<SortField, SortField[]> = {
  status: ['status', 'priority', 'createdAt'],
  priority: ['priority', 'status', 'createdAt'],
  createdAt: ['createdAt', 'status', 'priority'],
}

function sortTasks(tasks: Task[], primary: SortField): Task[] {
  const chain = SORT_CHAINS[primary]
  return [...tasks].sort((a, b) => {
    for (const field of chain) {
      const cmp = compareBy(a, b, field)
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
}

function AutoRunTrigger({ onRun }: { onRun: () => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('autoRun') === '1') {
      window.history.replaceState({}, '', '/')
      onRun()
    }
  }, [searchParams, onRun])
  return null
}

export default function TaskDashboard() {
  const { accessToken } = useAuth()
  const { tasks, loading, error, create, update, remove } = useTasks()
  const { repos } = useGitHubRepos(accessToken)

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingLogsTask, setViewingLogsTask] = useState<Task | null>(null)
  const [viewingDoneTask, setViewingDoneTask] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortField>('status')

  const runTasks = useCallback(async () => {
    setRunning(true)
    setRunError(null)
    try {
      const result = await triggerTaskRunner()
      if (!result.ok) {
        if (result.needsRefresh) {
          window.location.href = '/auth/refresh?autoRun=1'
          return
        }
        setRunError(result.error ?? 'Unknown error')
        return
      }
      window.location.reload()
    } finally {
      setRunning(false)
    }
  }, [])

  function openCreate() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  const doneStatuses = [TaskStatus.DONE, TaskStatus.COMPLETE]
  const pendingTasks = useMemo(
    () => sortTasks(tasks.filter(t => !doneStatuses.includes(t.status)), sortBy),
    [tasks, sortBy]
  )
  const doneTasks = useMemo(
    () => sortTasks(tasks.filter(t => doneStatuses.includes(t.status)), sortBy),
    [tasks, sortBy]
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Suspense><AutoRunTrigger onRun={runTasks} /></Suspense>
      <Header />
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <Tabs defaultValue="tasks">
          <div className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="tasks">
                Tasks
                {!loading && pendingTasks.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{pendingTasks.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="done">
                Done
                {!loading && doneTasks.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-60">{doneTasks.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={runTasks} disabled={running}>
                    {running ? 'Running…' : 'Run tasks'}
                  </Button>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="createdAt">Created at</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openCreate}>New task</Button>
              </div>
              {runError && (
                <p className="text-sm text-destructive">{runError}</p>
              )}
            </div>
          </div>

          <TabsContent value="tasks">
            <TaskList
              tasks={pendingTasks}
              loading={loading}
              onEdit={openEdit}
              onDelete={remove}
              onViewLogs={setViewingLogsTask}
            />
          </TabsContent>

          <TabsContent value="done">
            {loading && (
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            )}

            {!loading && doneTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
            )}

            {!loading && doneTasks.length > 0 && (
              <div className="flex flex-col gap-4">
                {doneTasks.map(task => (
                  <button
                    key={task.id}
                    className="text-left w-full"
                    onClick={() => setViewingDoneTask(task)}
                  >
                    <Card className="hover:ring-foreground/20 transition-all cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1 min-w-0">
                            <p className="text-base font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.repository}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                          </div>
                        </div>
                        {task.completedAt && (
                          <p className="text-xs text-muted-foreground mt-3">
                            Completed {task.completedAt.toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <TaskFormDialog
        open={formOpen}
        task={editingTask}
        repos={repos}
        onClose={() => setFormOpen(false)}
        onCreate={create}
        onUpdate={update}
      />

      <TaskLogDialog
        task={viewingLogsTask}
        onClose={() => setViewingLogsTask(null)}
      />

      <DoneTaskDialog
        task={viewingDoneTask}
        onClose={() => setViewingDoneTask(null)}
      />
    </div>
  )
}
