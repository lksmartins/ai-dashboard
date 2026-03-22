import { Databases, ID, Query } from 'appwrite'
import { ITaskRepository } from '@/domain/repositories/ITaskRepository'
import { Task, CreateTaskInput } from '@/domain/entities/Task'

function toTask(doc: Record<string, unknown>): Task {
  return Task.build({
    id: doc.$id as string,
    title: doc.title as string,
    description: doc.description as string,
    priority: doc.priority as string,
    repository: doc.repository as string,
    status: doc.status as string,
    createdAt: new Date(doc.$createdAt as string),
    updatedAt: new Date(doc.$updatedAt as string),
    completedAt: doc.completedAt ? new Date(doc.completedAt as string) : null,
  })
}

export class AppwriteTaskRepository implements ITaskRepository {
  private readonly databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  private readonly collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!

  constructor(private readonly databases: Databases) {}

  async findAll(): Promise<Task[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      this.collectionId,
      [Query.orderDesc('$createdAt')]
    )
    return response.documents.map(doc => toTask(doc as unknown as Record<string, unknown>))
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const doc = await this.databases.getDocument(this.databaseId, this.collectionId, id)
      return toTask(doc as unknown as Record<string, unknown>)
    } catch {
      return null
    }
  }

  async save(input: CreateTaskInput): Promise<Task> {
    const doc = await this.databases.createDocument(
      this.databaseId,
      this.collectionId,
      ID.unique(),
      {
        title: input.title,
        description: input.description,
        priority: input.priority,
        repository: input.repository,
        status: 'pending',
        completedAt: null,
      }
    )
    return toTask(doc as unknown as Record<string, unknown>)
  }

  async update(task: Task): Promise<Task> {
    const obj = task.toObject()
    const doc = await this.databases.updateDocument(
      this.databaseId,
      this.collectionId,
      obj.id,
      {
        title: obj.title,
        description: obj.description,
        priority: obj.priority,
        repository: obj.repository,
        status: obj.status,
        completedAt: obj.completedAt ? obj.completedAt.toISOString() : null,
      }
    )
    return toTask(doc as unknown as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    await this.databases.deleteDocument(this.databaseId, this.collectionId, id)
  }
}
