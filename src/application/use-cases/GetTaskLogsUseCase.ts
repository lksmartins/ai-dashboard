import { ITaskLogRepository } from '@/domain/repositories/ITaskLogRepository'
import { TaskLog } from '@/domain/entities/TaskLog'

export class GetTaskLogsUseCase {
  constructor(private readonly taskLogs: ITaskLogRepository) {}

  async execute(taskId: string): Promise<TaskLog[]> {
    return this.taskLogs.findByTaskId(taskId)
  }
}
