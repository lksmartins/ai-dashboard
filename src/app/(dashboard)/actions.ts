'use server'

import { createAdminClient } from '@/infrastructure/appwrite/server'
import { Query } from 'node-appwrite'

export interface TaskLogData {
  id: string
  taskId: string
  message: string
  createdAt: string
  updatedAt: string
}

export async function getTaskLogs(taskId: string): Promise<TaskLogData[]> {
  const { databases } = createAdminClient()
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID!

  const response = await databases.listDocuments(databaseId, collectionId, [
    Query.equal('taskId', taskId),
    Query.orderAsc('$createdAt'),
  ])

  return response.documents.map(doc => ({
    id: doc.$id,
    taskId: doc['taskId'] as string,
    message: doc['message'] as string,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  }))
}
