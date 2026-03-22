interface TaskLogProps {
  id: string
  taskId: string
  message: string
  createdAt: Date
  updatedAt: Date
}

export class TaskLog {
  private readonly props: TaskLogProps

  private constructor(props: TaskLogProps) {
    this.props = { ...props }
  }

  static build(props: TaskLogProps): TaskLog {
    return new TaskLog(props)
  }

  get id(): string { return this.props.id }
  get taskId(): string { return this.props.taskId }
  get message(): string { return this.props.message }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toObject(): TaskLogProps {
    return { ...this.props }
  }
}
