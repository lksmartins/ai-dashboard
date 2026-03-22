import { SupabaseClient } from '@supabase/supabase-js'
import { ITaskLogRepository } from '@/domain/repositories/ITaskLogRepository'
import { TaskLog } from '@/domain/entities/TaskLog'

function toTaskLog(row: Record<string, unknown>): TaskLog {
  return TaskLog.build({
    id: row.id as string,
    taskId: row.task_id as string,
    message: row.message as string,
    createdAt: new Date(row.created_at as string),
  })
}

export class SupabaseTaskLogRepository implements ITaskLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByTaskId(taskId: string): Promise<TaskLog[]> {
    const { data, error } = await this.client
      .from('task_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data.map(toTaskLog)
  }
}
