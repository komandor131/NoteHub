import type { Task } from './types'

export const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
export const monthNames = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

export function todayKey() {
  return toDateKey(new Date())
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date: Date) {
  const next = new Date(date)
  const offset = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - offset)
  return next
}

export function getWeekDays(dateKey: string) {
  const start = startOfWeek(parseDateKey(dateKey))
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function getMonthCells(dateKey: string) {
  const source = parseDateKey(dateKey)
  const monthStart = new Date(source.getFullYear(), source.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === source.getMonth(),
      isToday: toDateKey(date) === todayKey(),
    }
  })
}

export function getCalendarTitle(dateKey: string) {
  const date = parseDateKey(dateKey)
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'short',
    day: 'numeric',
  }).format(parseDateKey(value))
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseDateKey(value))
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return 'Без часу'
  }
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatTime(value: string | null) {
  if (!value) {
    return ''
  }
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function shiftDate(dateKey: string, amount: number, unit: 'day' | 'week' | 'month') {
  const date = parseDateKey(dateKey)
  if (unit === 'month') {
    date.setMonth(date.getMonth() + amount)
  } else {
    date.setDate(date.getDate() + amount * (unit === 'week' ? 7 : 1))
  }
  return toDateKey(date)
}

export function taskDateKey(task: Task) {
  return task.startAt?.slice(0, 10) ?? task.dueDate ?? task.createdAt.slice(0, 10)
}

export function taskTouchesDay(task: Task, dateKey: string) {
  return [task.startAt?.slice(0, 10), task.endAt?.slice(0, 10), task.dueDate].includes(dateKey)
}

export function taskHour(task: Task) {
  if (!task.startAt) {
    return null
  }
  const hour = Number(task.startAt.slice(11, 13))
  return Number.isFinite(hour) ? hour : null
}
