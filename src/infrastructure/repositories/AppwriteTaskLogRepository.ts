import { Databases, Query } from 'appwrite'
import { ITaskLogRepository } from '@/domain/repositories/ITaskLogRepository'
import { TaskLog } from '@/domain/entities/TaskLog'

function toTaskLog(doc: Record<string, unknown>): TaskLog {
  return TaskLog.build({
    id: doc.$id as string,
    taskId: doc.task_id as string,
    message: doc.message as string,
    createdAt: new Date(doc.$createdAt as string),
    updatedAt: new Date(doc.$updatedAt as string),
  })
}

export class AppwriteTaskLogRepository implements ITaskLogRepository {
  private readonly databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  private readonly collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID!

  constructor(private readonly databases: Databases) {}

  async findByTaskId(taskId: string): Promise<TaskLog[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      this.collectionId,
      [
        Query.equal('task_id', taskId),
        Query.orderAsc('$createdAt'),
      ]
    )
    return response.documents.map(doc => toTaskLog(doc as unknown as Record<string, unknown>))
  }
}
