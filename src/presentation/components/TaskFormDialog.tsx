'use client'

import { useCallback, useEffect, useState } from 'react'
import { Task, CreateTaskInput } from '@/domain/entities/Task'
import { TaskPriority } from '@/domain/entities/TaskPriority'
import { TaskStatus } from '@/domain/entities/TaskStatus'
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
  status: TaskStatus.PENDING,
}

const DRAFT_STORAGE_KEY = 'task-form-draft'

function loadDraft(): typeof emptyForm | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.title === 'string') return { ...emptyForm, ...parsed }
  } catch { /* ignore corrupt data */ }
  return null
}

function saveDraft(form: typeof emptyForm) {
  try {
    const { status, ...draft } = form
    void status
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch { /* storage full or unavailable */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_STORAGE_KEY) } catch { /* ignore */ }
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
        status: task.status,
      })
    } else {
      setForm(loadDraft() ?? emptyForm)
    }
  }, [task, open])

  const updateForm = useCallback(
    (updater: (prev: typeof emptyForm) => typeof emptyForm) => {
      setForm(prev => {
        const next = updater(prev)
        if (!task) saveDraft(next)
        return next
      })
    },
    [task],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (task) {
        await onUpdate(task.id, form)
      } else {
        await onCreate(form)
        clearDraft()
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
            onChange={e => updateForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={e => updateForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="max-h-[50dvh]"
          />

          <Select
            value={form.priority}
            onValueChange={(val) => { if (val) updateForm(f => ({ ...f, priority: val })) }}
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

          {task && (
            <Select
              value={form.status}
              onValueChange={(val) => { if (val) updateForm(f => ({ ...f, status: val })) }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TaskStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                <SelectItem value={TaskStatus.COMPLETE}>Complete</SelectItem>
              </SelectContent>
            </Select>
          )}

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
                          updateForm(f => ({ ...f, repository: val }))
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
