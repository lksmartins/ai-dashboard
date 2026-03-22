import { Task } from '@/domain/entities/Task'
import TaskCard from './TaskCard'

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onViewLogs: (task: Task) => void
}

export default function TaskList({ tasks, loading, onEdit, onDelete, onViewLogs }: TaskListProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tasks...</p>
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks yet. Create one to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewLogs={onViewLogs}
        />
      ))}
    </div>
  )
}
