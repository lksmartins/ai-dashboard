'use client'

import { useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskStatus } from '@/domain/entities/TaskStatus'
import { useAuth } from '@/presentation/hooks/useAuth'
import { useTasks } from '@/presentation/hooks/useTasks'
import { useGitHubRepos } from '@/presentation/hooks/useGitHubRepos'
import { createBrowserAccount, createBrowserClient } from '@/infrastructure/appwrite/client'
import Header from './Header'
import TaskList from './TaskList'
import TaskFormDialog from './TaskFormDialog'
import TaskLogDialog from './TaskLogDialog'
import DoneTaskDialog from './DoneTaskDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TaskPriority } from '@/domain/entities/TaskPriority'

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
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

  async function runTasks() {
    setRunning(true)
    try {
      const account = createBrowserAccount(createBrowserClient())
      const { jwt } = await account.createJWT()
      await fetch('https://srv1469719.hstgr.cloud/ai-task-runner/run', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}` },
      })
    } finally {
      setRunning(false)
      window.location.reload()
    }
  }

  function openCreate() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  const doneStatuses = [TaskStatus.DONE, TaskStatus.COMPLETE]
  const pendingTasks = tasks.filter(t => !doneStatuses.includes(t.status))
  const doneTasks = tasks.filter(t => doneStatuses.includes(t.status))

  return (
    <div className="min-h-screen flex flex-col">
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
            <div className="flex justify-between">
              <Button variant="outline" onClick={runTasks} disabled={running}>
                {running ? 'Running…' : 'Run tasks'}
              </Button>
              <Button onClick={openCreate}>New task</Button>
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
