'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Task, CreateTaskInput } from '@/domain/entities/Task'
import { createBrowserClient, createBrowserDatabases } from '@/infrastructure/appwrite/client'
import { TASK_REPOSITORY } from '@/infrastructure/di/container'
import { GetTasksUseCase } from '@/application/use-cases/GetTasksUseCase'
import { CreateTaskUseCase } from '@/application/use-cases/CreateTaskUseCase'
import { UpdateTaskUseCase, UpdateTaskChanges } from '@/application/use-cases/UpdateTaskUseCase'
import { DeleteTaskUseCase } from '@/application/use-cases/DeleteTaskUseCase'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const repository = useMemo(
    () => new TASK_REPOSITORY(createBrowserDatabases(createBrowserClient())),
    []
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await new GetTasksUseCase(repository).execute()
      setTasks(result)
    } catch {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [repository])

  useEffect(() => { load() }, [load])

  const create = async (input: CreateTaskInput) => {
    const task = await new CreateTaskUseCase(repository).execute(input)
    setTasks(prev => [task, ...prev])
  }

  const update = async (id: string, changes: UpdateTaskChanges) => {
    const task = await new UpdateTaskUseCase(repository).execute({ id, changes })
    setTasks(prev => prev.map(t => t.id === id ? task : t))
  }

  const remove = async (id: string) => {
    await new DeleteTaskUseCase(repository).execute(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return { tasks, loading, error, create, update, remove, reload: load }
}
