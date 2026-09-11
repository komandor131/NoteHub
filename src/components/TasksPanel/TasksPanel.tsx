import React from 'react'
import { Plus, FileText, Trash2, Filter, ChevronLeft, ChevronRight, Play, CheckCircle2, Archive, RefreshCw } from 'lucide-react'
import type { Task, TaskFilters, Attachment, TaskPayload, TaskStatus } from '../../types'
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
  onUpdateTask?: (id: number, payload: TaskPayload) => Promise<void>
}

export function TaskMeta({ task }: { task: Task }) {
  return (
    <div className="meta-line">
      <span className={`task-badge-type ${task.type}`}>{typeLabels[task.type]}</span>
      <span className={`task-badge-priority ${task.priority}`}>{priorityLabels[task.priority]}</span>
      {task.dueDate && (
        <span className="task-badge-due">⏳ до {formatShortDate(task.dueDate)}</span>
      )}
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
  onUpdateTask,
}: TasksPanelProps) {
  const [viewMode, setViewMode] = React.useState<'grid' | 'kanban'>('grid')

  const moveTask = async (task: Task, newStatus: TaskStatus) => {
    if (onUpdateTask) {
      await onUpdateTask(task.id, {
        title: task.title,
        description: task.description || '',
        type: task.type,
        status: newStatus,
        priority: task.priority,
        projectId: task.projectId,
        tags: task.tags,
        color: task.color || '#a855f7',
        startAt: task.startAt,
        endAt: task.endAt,
        dueDate: task.dueDate,
      })
    }
  }

  const renderTaskCard = (task: Task, isCompact = false) => (
    <article className={`${styles.taskCard} ${isCompact ? styles.compactCard : ''}`} key={task.id}>
      <div className="task-card-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <TaskMeta task={task} />
          <h3 className={styles.taskTitle}>{task.title}</h3>
        </div>
        <div className="row-actions" style={{ flexShrink: 0 }}>
          <button className="icon-btn" type="button" onClick={() => onEditTask(task)} title="Редагувати">
            <FileText size={15} />
          </button>
          <button className="icon-btn danger" type="button" onClick={() => void onDeleteTask(task)} title="Видалити">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      
      {!isCompact && task.description && (
        <p className={styles.taskDesc}>{task.description}</p>
      )}

      <div className={styles.cardFooter}>
        <div className="tag-list">
          {task.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Shift Controls */}
        {onUpdateTask && (
          <div className={styles.shiftControls}>
            {task.status === 'todo' && (
              <button 
                type="button" 
                className={`${styles.shiftBtn} ${styles.btnStart}`} 
                onClick={() => moveTask(task, 'in-progress')}
                title="Почати роботу"
              >
                <Play size={11} fill="currentColor" />
                <span>Почати</span>
              </button>
            )}
            {task.status === 'in-progress' && (
              <>
                <button 
                  type="button" 
                  className={styles.shiftBtn} 
                  onClick={() => moveTask(task, 'todo')}
                  title="Відкласти назад"
                >
                  <ChevronLeft size={12} />
                  <span>Пауза</span>
                </button>
                <button 
                  type="button" 
                  className={`${styles.shiftBtn} ${styles.btnSuccess}`} 
                  onClick={() => moveTask(task, 'done')}
                  title="Позначити виконаною"
                >
                  <CheckCircle2 size={11} />
                  <span>Готово</span>
                </button>
              </>
            )}
            {task.status === 'done' && (
              <>
                <button 
                  type="button" 
                  className={styles.shiftBtn} 
                  onClick={() => moveTask(task, 'in-progress')}
                  title="Повернути в роботу"
                >
                  <ChevronLeft size={12} />
                  <span>Процес</span>
                </button>
                <button 
                  type="button" 
                  className={`${styles.shiftBtn} ${styles.btnArchive}`} 
                  onClick={() => moveTask(task, 'archived')}
                  title="Архівувати задачу"
                >
                  <Archive size={11} />
                  <span>Архів</span>
                </button>
              </>
            )}
            {task.status === 'archived' && (
              <button 
                type="button" 
                className={styles.shiftBtn} 
                onClick={() => moveTask(task, 'done')}
                title="Відновити з архіву"
              >
                <RefreshCw size={11} />
                <span>Відновити</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!isCompact && task.attachments && task.attachments.length > 0 && (
        <AttachmentList attachments={task.attachments} onDelete={onDeleteAttachment} />
      )}
    </article>
  )

  const columns = [
    { id: 'todo' as TaskStatus, title: 'Потрібно зробити', countColor: '#a855f7', glowColor: 'rgba(168, 85, 247, 0.15)' },
    { id: 'in-progress' as TaskStatus, title: 'У процесі', countColor: '#3b82f6', glowColor: 'rgba(59, 130, 246, 0.15)' },
    { id: 'done' as TaskStatus, title: 'Виконано', countColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.15)' },
    { id: 'archived' as TaskStatus, title: 'Архів', countColor: '#71717a', glowColor: 'rgba(113, 113, 122, 0.15)' },
  ]

  return (
    <section className={styles.tasksPanel}>
      <div className={styles.tasksHeader}>
        <div>
          <p className="kicker">База даних задач</p>
          <h2 className={styles.welcomeTitle}>Всі задачі та плани</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="segmented" style={{ margin: 0 }}>
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              type="button"
              onClick={() => setViewMode('grid')}
            >
              Плитка
            </button>
            <button
              className={viewMode === 'kanban' ? 'active' : ''}
              type="button"
              onClick={() => setViewMode('kanban')}
            >
              Канбан дошка
            </button>
          </div>

          <button className="btn primary" type="button" onClick={onCreateTask}>
            <Plus size={16} />
            Створити задачу
          </button>
        </div>
      </div>

      <TaskFiltersBox filters={filters} tags={tags} onChange={onFiltersChange} />

      {viewMode === 'grid' ? (
        <div className="task-board" style={{ padding: '20px 0 0' }}>
          {tasks.length ? (
            tasks.map((task) => renderTaskCard(task))
          ) : (
            <EmptyState
              icon={<Filter size={22} />}
              title="Задач не знайдено за такими фільтрами"
              text="Спробуйте змінити фільтри або створити нову задачу."
            />
          )}
        </div>
      ) : (
        <div className={styles.kanbanBoard}>
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id)
            return (
              <div 
                className={styles.kanbanColumn} 
                key={col.id}
                style={{ '--glow-color': col.glowColor } as React.CSSProperties}
              >
                <div className={styles.columnHeader}>
                  <div className="flex items-center gap-2">
                    <span 
                      className={styles.columnIndicator} 
                      style={{ background: col.countColor }}
                    />
                    <h4>{col.title}</h4>
                  </div>
                  <span 
                    className={styles.columnCount}
                    style={{ background: `rgba(255,255,255,0.05)`, color: col.countColor }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <div className={styles.columnContent}>
                  {colTasks.length ? (
                    colTasks.map((task) => renderTaskCard(task, true))
                  ) : (
                    <div className={styles.emptyColumn}>
                      <span>Немає задач</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
