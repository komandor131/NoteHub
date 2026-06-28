import React from 'react'
import { Search } from 'lucide-react'
import type { TaskFilters } from '../../types'
import {
  taskTypeOptions,
  typeLabels,
  statusOptions,
  statusLabels,
  priorityOptions,
  priorityLabels,
} from '../drawers/TaskDrawer'

interface TaskFiltersBoxProps {
  filters: TaskFilters
  tags: string[]
  onChange: (filters: TaskFilters) => void
  compact?: boolean
}

export default function TaskFiltersBox({
  filters,
  tags,
  onChange,
  compact = false,
}: TaskFiltersBoxProps) {
  return (
    <div className={`filters ${compact ? 'compact' : ''}`}>
      <label className="search-box">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Фільтр задач..."
        />
      </label>
      <select
        value={filters.type}
        onChange={(event) => onChange({ ...filters, type: event.target.value as TaskFilters['type'] })}
      >
        <option value="all">Всі типи</option>
        {taskTypeOptions.map((type) => (
          <option value={type} key={type}>
            {typeLabels[type]}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value as TaskFilters['status'] })
        }
      >
        <option value="all">Всі статуси</option>
        {statusOptions.map((status) => (
          <option value={status} key={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <select
        value={filters.priority}
        onChange={(event) =>
          onChange({ ...filters, priority: event.target.value as TaskFilters['priority'] })
        }
      >
        <option value="all">Усі пріоритети</option>
        {priorityOptions.map((priority) => (
          <option value={priority} key={priority}>
            {priorityLabels[priority]}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => onChange({ ...filters, tag: event.target.value })}
      >
        <option value="all">Усі теги</option>
        {tags.map((tag) => (
          <option value={tag} key={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  )
}
