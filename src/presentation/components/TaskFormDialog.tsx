'use client'

import { useEffect, useState } from 'react'
import { Task, CreateTaskInput } from '@/domain/entities/Task'
import { TaskPriority } from '@/domain/entities/TaskPriority'
import { GitHubRepo } from '@/application/services/IGitHubService'
import { UpdateTaskChanges } from '@/application/use-cases/UpdateTaskUseCase'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskFormDialogProps {
  open: boolean
  task: Task | null
  repos: GitHubRepo[]
  onClose: () => void
  onCreate: (input: CreateTaskInput) => Promise<void>
  onUpdate: (id: string, changes: UpdateTaskChanges) => Promise<void>
}

const emptyForm = {
  title: '',
  description: '',
  priority: TaskPriority.MEDIUM,
  repository: '',
}

export default function TaskFormDialog({
  open, task, repos, onClose, onCreate, onUpdate,
}: TaskFormDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [repoOpen, setRepoOpen] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        repository: task.repository,
      })
    } else {
      setForm(emptyForm)
    }
  }, [task, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (task) {
        await onUpdate(task.id, form)
      } else {
        await onCreate(form)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
          />

          <Select
            value={form.priority}
            onValueChange={(val) => { if (val) setForm(f => ({ ...f, priority: val })) }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
              <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
              <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={repoOpen} onOpenChange={setRepoOpen}>
            <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none">
              {form.repository || <span className="text-muted-foreground">Select repository...</span>}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
              <Command>
                <CommandInput placeholder="Search repositories..." />
                <CommandList>
                  <CommandEmpty>No repositories found.</CommandEmpty>
                  <CommandGroup>
                    {repos.map(repo => (
                      <CommandItem
                        key={repo.id}
                        value={repo.fullName}
                        onSelect={(val) => {
                          setForm(f => ({ ...f, repository: val }))
                          setRepoOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', form.repository === repo.fullName ? 'opacity-100' : 'opacity-0')} />
                        {repo.fullName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
