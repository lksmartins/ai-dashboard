'use client'

import { useEffect, useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskLog } from '@/domain/entities/TaskLog'
import { getTaskLogs } from '@/app/(dashboard)/actions'
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!task) return

    const fetchLogs = async () => {
      setLoading(true)
      setLogs([])
      setError(null)
      try {
        const result = await getTaskLogs(task.id)
        setLogs(result.map(d => TaskLog.build({
          id: d.id,
          taskId: d.taskId,
          message: d.message,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        })))
      } catch {
        setError('Failed to load logs.')
      } finally {
        setLoading(false)
      }
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

        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!loading && !error && logs.length === 0 && (
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
