import { Task } from '@/domain/entities/Task'
import { TaskPriority } from '@/domain/entities/TaskPriority'
import { TaskStatus } from '@/domain/entities/TaskStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const priorityVariant: Record<string, 'destructive' | 'default' | 'secondary'> = {
  [TaskPriority.HIGH]: 'destructive',
  [TaskPriority.MEDIUM]: 'default',
  [TaskPriority.LOW]: 'secondary',
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onViewLogs: (task: Task) => void
}

export default function TaskCard({ task, onEdit, onDelete, onViewLogs }: TaskCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium">{task.title}</CardTitle>
          <div className="flex gap-2 shrink-0">
            <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
            <Badge variant={task.status === TaskStatus.COMPLETE ? 'secondary' : 'outline'}>
              {task.status}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{task.repository}</p>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {task.description}
        </p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {task.createdAt.toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onViewLogs(task)}>
              Logs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
