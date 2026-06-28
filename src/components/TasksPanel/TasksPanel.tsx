import React from 'react'
import { Plus, FileText, Trash2, Filter } from 'lucide-react'
import type { Task, TaskFilters, Attachment } from '../../types'
import TaskFiltersBox from '../TaskFiltersBox/TaskFiltersBox'
import AttachmentList from '../AttachmentList/AttachmentList'
import EmptyState from '../EmptyState/EmptyState'
import { typeLabels, priorityLabels } from '../drawers/TaskDrawer'
import { formatTime, formatShortDate, taskDateKey } from '../../dateUtils'
import styles from './TasksPanel.module.css'

interface TasksPanelProps {
  tasks: Task[]
  filters: TaskFilters
  tags: string[]
  onFiltersChange: (filters: TaskFilters) => void
  onCreateTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => Promise<void>
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
}

export function TaskMeta({ task }: { task: Task }) {
  return (
    <div className="meta-line">
      <span>{typeLabels[task.type]}</span>
      <span>{priorityLabels[task.priority]}</span>
      <span>{task.startAt ? formatTime(task.startAt) : formatShortDate(taskDateKey(task))}</span>
    </div>
  )
}

export default function TasksPanel({
  tasks,
  filters,
  tags,
  onFiltersChange,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onDeleteAttachment,
}: TasksPanelProps) {
  return (
    <section className={`panel ${styles.tasksPanel}`}>
      <div className="panel-header">
        <div>
          <p className="kicker">База даних задач</p>
          <h2>Всі задачі та плани</h2>
        </div>
        <button className="btn primary" type="button" onClick={onCreateTask}>
          <Plus size={16} />
          Створити задачу
        </button>
      </div>
      <TaskFiltersBox filters={filters} tags={tags} onChange={onFiltersChange} />
      <div className="task-board">
        {tasks.length ? (
          tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-card-header">
                <div>
                  <TaskMeta task={task} />
                  <h3>{task.title}</h3>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" type="button" onClick={() => onEditTask(task)}>
                    <FileText size={17} />
                  </button>
                  <button className="icon-btn danger" type="button" onClick={() => void onDeleteTask(task)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <p>{task.description || 'Опис відсутній.'}</p>
              <div className="tag-list">
                {task.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <AttachmentList attachments={task.attachments} onDelete={onDeleteAttachment} />
            </article>
          ))
        ) : (
          <EmptyState
            icon={<Filter size={22} />}
            title="Задач не знайдено за такими фільтрами"
            text="Спробуйте змінити фільтри або створити нову задачу."
          />
        )}
      </div>
    </section>
  )
}
