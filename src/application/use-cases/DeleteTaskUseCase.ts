import { ITaskRepository } from '@/domain/repositories/ITaskRepository'

export class DeleteTaskUseCase {
  constructor(private readonly tasks: ITaskRepository) {}

  async execute(id: string): Promise<void> {
    return this.tasks.delete(id)
  }
}
