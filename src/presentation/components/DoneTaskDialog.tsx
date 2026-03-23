'use client'

import { useEffect, useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskLog } from '@/domain/entities/TaskLog'
import { TaskPriority } from '@/domain/entities/TaskPriority'
import { createBrowserClient, createBrowserDatabases } from '@/infrastructure/appwrite/client'
import { TASK_LOG_REPOSITORY } from '@/infrastructure/di/container'
import { GetTaskLogsUseCase } from '@/application/use-cases/GetTaskLogsUseCase'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
}

interface DoneTaskDialogProps {
  task: Task | null
  onClose: () => void
}

export default function DoneTaskDialog({ task, onClose }: DoneTaskDialogProps) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.title}</DialogTitle>
        </DialogHeader>

        {task && (
          <div className="flex flex-col gap-4">
            {/* Task details */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
                <Badge variant="secondary">{task.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{task.repository}</p>
              <p className="text-sm text-muted-foreground">{task.description}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Created: {task.createdAt.toLocaleDateString()}</span>
                {task.completedAt && (
                  <span>Completed: {task.completedAt.toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Logs */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Activity logs
              </p>

              {loading && (
                <p className="text-sm text-muted-foreground">Loading logs...</p>
              )}

              {!loading && logs.length === 0 && (
                <p className="text-sm text-muted-foreground">No logs yet.</p>
              )}

              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="text-sm border-l-2 pl-3 py-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      {log.createdAt.toLocaleString()}
                    </p>
                    <p>{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
