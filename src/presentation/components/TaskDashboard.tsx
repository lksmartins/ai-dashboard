'use client'

import { useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { useAuth } from '@/presentation/hooks/useAuth'
import { useTasks } from '@/presentation/hooks/useTasks'
import { useGitHubRepos } from '@/presentation/hooks/useGitHubRepos'
import Header from './Header'
import TaskList from './TaskList'
import TaskFormDialog from './TaskFormDialog'
import TaskLogDialog from './TaskLogDialog'
import { Button } from '@/components/ui/button'

export default function TaskDashboard() {
  const { accessToken } = useAuth()
  const { tasks, loading, error, create, update, remove } = useTasks()
  const { repos } = useGitHubRepos(accessToken)

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingLogsTask, setViewingLogsTask] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function openCreate() {
    setEditingTask(null)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setFormOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium">Tasks</h2>
          <Button onClick={openCreate}>New task</Button>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <TaskList
          tasks={tasks}
          loading={loading}
          onEdit={openEdit}
          onDelete={remove}
          onViewLogs={setViewingLogsTask}
        />
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
    </div>
  )
}
