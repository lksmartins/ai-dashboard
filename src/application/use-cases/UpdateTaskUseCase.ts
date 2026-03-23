import { ITaskRepository } from '@/domain/repositories/ITaskRepository'
import { Task } from '@/domain/entities/Task'

export interface UpdateTaskChanges {
  title?: string
  description?: string
  priority?: string
  repository?: string
  status?: string
}

export interface UpdateTaskInput {
  id: string
  changes: UpdateTaskChanges
}

export class UpdateTaskUseCase {
  constructor(private readonly tasks: ITaskRepository) {}

  async execute(input: UpdateTaskInput): Promise<Task> {
    const task = await this.tasks.findById(input.id)
    if (!task) throw new Error(`Task not found: ${input.id}`)

    const updated = task.update(input.changes)
    return this.tasks.update(updated)
  }
}
