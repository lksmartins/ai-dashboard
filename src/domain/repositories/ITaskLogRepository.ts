import { TaskLog } from '../entities/TaskLog'

export interface ITaskLogRepository {
  findByTaskId(taskId: string): Promise<TaskLog[]>
}
