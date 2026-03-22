'use client'

import { useEffect, useState } from 'react'
import { Task } from '@/domain/entities/Task'
import { TaskLog } from '@/domain/entities/TaskLog'
import { createClient } from '@/infrastructure/supabase/client'
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
      const client = createClient()
      const taskLogRepository = new TASK_LOG_REPOSITORY(client)
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
