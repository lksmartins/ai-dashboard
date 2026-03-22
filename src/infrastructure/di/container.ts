import { SupabaseAuthRepository } from '@/infrastructure/repositories/SupabaseAuthRepository'
import { SupabaseTaskRepository } from '@/infrastructure/repositories/SupabaseTaskRepository'
import { SupabaseTaskLogRepository } from '@/infrastructure/repositories/SupabaseTaskLogRepository'

export const AUTH_REPOSITORY = SupabaseAuthRepository
export const TASK_REPOSITORY = SupabaseTaskRepository
export const TASK_LOG_REPOSITORY = SupabaseTaskLogRepository
