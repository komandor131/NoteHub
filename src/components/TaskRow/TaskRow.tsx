import React from 'react'
import type { Task } from '../../types'
import { typeLabels, statusLabels, priorityLabels } from '../drawers/TaskDrawer'
import { formatTime, formatShortDate, taskDateKey } from '../../dateUtils'

interface TaskRowProps {
  task: Task
  onClick: () => void
}

export default function TaskRow({ task, onClick }: TaskRowProps) {
  return (
    <div
      className={`task-row ${task.status === 'done' ? 'done' : ''} ${task.priority}`}
      style={{ borderLeftColor: task.color }}
      onClick={onClick}
    >
      <span className="task-dot" style={{ background: task.color }} />
      <span>
        <strong>{task.title}</strong>
        {task.description ? <p className="desc">{task.description}</p> : null}
        <small>
          {typeLabels[task.type]} · {statusLabels[task.status]} · {priorityLabels[task.priority]}
        </small>
      </span>
      <span>{task.startAt ? formatTime(task.startAt) : formatShortDate(taskDateKey(task))}</span>
    </div>
  )
}
