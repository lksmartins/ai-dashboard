import { Task, CreateTaskInput } from '../entities/Task'

export interface ITaskRepository {
  findAll(): Promise<Task[]>
  findById(id: string): Promise<Task | null>
  save(input: CreateTaskInput): Promise<Task>
  update(task: Task): Promise<Task>
  delete(id: string): Promise<void>
}
