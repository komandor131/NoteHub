import React, { useState, useEffect, type FormEvent } from 'react'
import { X, Upload, Save } from 'lucide-react'
import type { Task, Project, TaskPayload, TaskFormState, TaskType, TaskStatus, TaskPriority } from '../../types'
import AttachmentList from '../AttachmentList/AttachmentList'

export const taskTypeOptions: TaskType[] = ['task', 'event', 'deadline', 'note']
export const statusOptions: TaskStatus[] = ['todo', 'in-progress', 'done', 'archived']
export const priorityOptions: TaskPriority[] = ['low', 'medium', 'high']

export const typeLabels: Record<TaskType, string> = {
  task: 'Задача',
  event: 'Подія',
  deadline: 'Дедлайн',
  note: 'Нотатка',
}

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'Треба зробити',
  'in-progress': 'Виконується',
  done: 'Готово',
  archived: 'В архіві',
}

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
}

export function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function taskToForm(task: Task | null, defaultDate: string): TaskFormState {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      startAt: task.startAt ?? '',
      endAt: task.endAt ?? '',
      dueDate: task.dueDate ?? '',
      color: task.color,
      tagsText: task.tags.join(', '),
      projectId: task.projectId !== null ? String(task.projectId) : '',
    }
  }
  return {
    title: '',
    description: '',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    startAt: `${defaultDate}T09:00`,
    endAt: `${defaultDate}T10:00`,
    dueDate: defaultDate,
    color: '#a855f7',
    tagsText: '',
    projectId: '',
  }
}

export function taskPayload(form: TaskFormState): TaskPayload {
  return {
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    priority: form.priority,
    startAt: form.startAt || null,
    endAt: form.endAt || null,
    dueDate: form.dueDate || null,
    color: form.color,
    tags: splitTags(form.tagsText),
    projectId: form.projectId ? Number(form.projectId) : null,
  }
}

interface TaskDrawerProps {
  open: boolean
  task: Task | null
  defaultDate: string
  projects: Project[]
  onClose: () => void
  onSubmit: (payload: TaskPayload, file: File | null) => Promise<void>
}

export default function TaskDrawer({
  open,
  task,
  defaultDate,
  projects,
  onClose,
  onSubmit,
}: TaskDrawerProps) {
  const [form, setForm] = useState<TaskFormState>(taskToForm(task, defaultDate))
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    setForm(taskToForm(task, defaultDate))
    setFile(null)
  }, [defaultDate, task, open])

  if (!open) {
    return null
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(taskPayload(form), file)
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{task ? 'Редагувати план' : 'Створити план'}</p>
            <h2>{task ? task.title : 'Нова задача'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              autoFocus
            />
          </label>
          <label>
            <span>Проєкт</span>
            <select
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Без проєкту</option>
              {projects.map((proj) => (
                <option value={proj.id} key={proj.id}>
                  {proj.title} {proj.is_completed ? '(Завершено)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Тип</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as TaskType })}
            >
              {taskTypeOptions.map((type) => (
                <option value={type} key={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
            >
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Пріоритет</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as TaskPriority })
              }
            >
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Колір картки</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
            />
          </label>
          <label>
            <span>Початок</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            />
          </label>
          <label>
            <span>Кінець</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            />
          </label>
          <label>
            <span>Термін (Дедлайн)</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </label>
          <label className="wide">
            <span>Теги (через кому)</span>
            <input
              value={form.tagsText}
              onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              placeholder="робота, навчання, особисте"
            />
          </label>
          <label className="wide">
            <span>Опис</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={5}
            />
          </label>
        </div>

        <div className="upload-strip">
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={task?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти задачу
          </button>
        </div>
      </form>
    </div>
  )
}
