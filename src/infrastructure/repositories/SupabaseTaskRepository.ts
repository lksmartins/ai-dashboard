import { SupabaseClient } from '@supabase/supabase-js'
import { ITaskRepository } from '@/domain/repositories/ITaskRepository'
import { Task, CreateTaskInput } from '@/domain/entities/Task'

function toTask(row: Record<string, unknown>): Task {
  return Task.build({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    priority: row.priority as string,
    repository: row.repository as string,
    status: row.status as string,
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
  })
}

export class SupabaseTaskRepository implements ITaskRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(): Promise<Task[]> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map(toTask)
  }

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return toTask(data)
  }

  async save(input: CreateTaskInput): Promise<Task> {
    const { data, error } = await this.client
      .from('tasks')
      .insert({
        title: input.title,
        description: input.description,
        priority: input.priority,
        repository: input.repository,
      })
      .select()
      .single()

    if (error) throw error
    return toTask(data)
  }

  async update(task: Task): Promise<Task> {
    const obj = task.toObject()

    const { data, error } = await this.client
      .from('tasks')
      .update({
        title: obj.title,
        description: obj.description,
        priority: obj.priority,
        repository: obj.repository,
        status: obj.status,
        completed_at: obj.completedAt,
      })
      .eq('id', obj.id)
      .select()
      .single()

    if (error) throw error
    return toTask(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
