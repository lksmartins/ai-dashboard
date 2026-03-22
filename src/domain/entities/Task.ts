import { TaskPriority } from './TaskPriority'
import { TaskStatus } from './TaskStatus'

export interface CreateTaskInput {
  title: string
  description: string
  priority: string
  repository: string
}

interface TaskProps {
  id: string
  title: string
  description: string
  priority: string
  repository: string
  status: string
  createdAt: Date
  completedAt: Date | null
}

export class Task {
  private readonly props: TaskProps

  private constructor(props: TaskProps) {
    this.props = { ...props }
  }

  /** Creates a new pending task */
  static create(input: CreateTaskInput): Task {
    return new Task({
      id: globalThis.crypto.randomUUID(),
      title: input.title,
      description: input.description,
      priority: input.priority,
      repository: input.repository,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      completedAt: null,
    })
  }

  /** Reconstructs a Task from persisted data */
  static build(props: TaskProps): Task {
    return new Task(props)
  }

  get id(): string { return this.props.id }
  get title(): string { return this.props.title }
  get description(): string { return this.props.description }
  get priority(): string { return this.props.priority }
  get repository(): string { return this.props.repository }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get completedAt(): Date | null { return this.props.completedAt }
  get isPending(): boolean { return this.props.status === TaskStatus.PENDING }
  get isComplete(): boolean { return this.props.status === TaskStatus.COMPLETE }

  update(changes: Partial<Pick<TaskProps, 'title' | 'description' | 'priority' | 'repository'>>): Task {
    return new Task({ ...this.props, ...changes })
  }

  complete(): Task {
    return new Task({ ...this.props, status: TaskStatus.COMPLETE, completedAt: new Date() })
  }

  toObject(): TaskProps {
    return { ...this.props }
  }
}
