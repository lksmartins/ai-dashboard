'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/infrastructure/appwrite/server'
import { Query } from 'node-appwrite'

export interface TaskLogData {
  id: string
  taskId: string
  message: string
  createdAt: string
  updatedAt: string
}

export async function triggerTaskRunner(): Promise<{ ok: boolean; error?: string; needsRefresh?: boolean }> {
  const runnerUrl = process.env.TASKS_PROCESSOR_URL
  if (!runnerUrl) {
    return { ok: false, error: 'TASKS_PROCESSOR_URL is not configured' }
  }

  const cookieStore = await cookies()
  const jwt = cookieStore.get('appwrite_jwt')?.value
  if (!jwt) {
    return { ok: false, needsRefresh: true, error: 'Session expired — refreshing…' }
  }

  let res: Response
  try {
    res = await fetch(`${runnerUrl}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Could not reach task runner: ${msg}` }
  }

  if (res.status === 409) return { ok: true } // already running — treat as success
  if (res.status === 401) return { ok: false, needsRefresh: true, error: 'Session expired — refreshing…' }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false, error: `Task runner returned ${res.status}: ${body}` }
  }

  return { ok: true }
}

export async function getTaskLogs(taskId: string): Promise<TaskLogData[]> {
  const { databases } = createAdminClient()
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!
  const collectionId = process.env.NEXT_PUBLIC_APPWRITE_TASK_LOGS_COLLECTION_ID!

  const response = await databases.listDocuments(databaseId, collectionId, [
    Query.equal('task_id', taskId),
    Query.orderAsc('$createdAt'),
  ])

  return response.documents.map(doc => ({
    id: doc.$id,
    taskId: doc['task_id'] as string,
    message: doc['message'] as string,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  }))
}
