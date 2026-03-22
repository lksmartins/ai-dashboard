import { ITaskRepository } from '@/domain/repositories/ITaskRepository'
import { Task, CreateTaskInput } from '@/domain/entities/Task'

export class CreateTaskUseCase {
  constructor(private readonly tasks: ITaskRepository) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    return this.tasks.save(input)
  }
}
