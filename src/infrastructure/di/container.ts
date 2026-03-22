import { AppwriteAuthRepository } from '@/infrastructure/repositories/AppwriteAuthRepository'
import { AppwriteTaskRepository } from '@/infrastructure/repositories/AppwriteTaskRepository'
import { AppwriteTaskLogRepository } from '@/infrastructure/repositories/AppwriteTaskLogRepository'

export const AUTH_REPOSITORY = AppwriteAuthRepository
export const TASK_REPOSITORY = AppwriteTaskRepository
export const TASK_LOG_REPOSITORY = AppwriteTaskLogRepository
