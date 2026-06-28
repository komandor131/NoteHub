import React from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock3, CalendarDays } from 'lucide-react'
import type { CalendarPanelProps, Task, Subscription, CalendarView } from '../../types'
import {
  dayNames,
  shiftDate,
  taskTouchesDay,
  formatLongDate,
  getCalendarTitle,
  getMonthCells,
  getWeekDays,
  toDateKey,
  taskHour,
  formatTime,
  formatShortDate,
  taskDateKey
} from '../../dateUtils'
import TaskFiltersBox from '../TaskFiltersBox/TaskFiltersBox'
import TaskRow from '../TaskRow/TaskRow'
import EmptyState from '../EmptyState/EmptyState'
import styles from './CalendarPanel.module.css'

const calendarViews: CalendarView[] = ['month', 'week', 'day']

export default function CalendarPanel({
  tasks,
  subscriptions,
  selectedDate,
  view,
  filters,
  tags,
  onDateChange,
  onViewChange,
  onFiltersChange,
  onCreateTask,
  onEditTask,
  onPaySub,
}: CalendarPanelProps) {
  const unit = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'
  const selectedTasks = tasks.filter((task) => taskTouchesDay(task, selectedDate))
  const selectedSubs = subscriptions.filter((sub) => sub.next_payment_date === selectedDate)

  return (
    <section className={`workspace-grid ${styles.calendarPanel}`}>
      <div className="panel calendar-panel">
        <div className="panel-header">
          <div>
            <p className="kicker">Планувальник</p>
            <h2>{view === 'day' ? formatLongDate(selectedDate) : getCalendarTitle(selectedDate)}</h2>
          </div>
          <div className="calendar-tools">
            <button
              className="icon-btn"
              type="button"
              onClick={() => onDateChange(shiftDate(selectedDate, -1, unit))}
              aria-label="Попередній період"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              className="date-control"
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
            <button
              className="icon-btn"
              type="button"
              onClick={() => onDateChange(shiftDate(selectedDate, 1, unit))}
              aria-label="Наступний період"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="segmented">
          {calendarViews.map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? 'active' : ''}
              onClick={() => onViewChange(item)}
            >
              {item === 'month' ? 'Місяць' : item === 'week' ? 'Тиждень' : 'День'}
            </button>
          ))}
        </div>

        {view === 'month' ? (
          <MonthCalendar
            tasks={tasks}
            subscriptions={subscriptions}
            selectedDate={selectedDate}
            onSelectDate={onDateChange}
            onCreateTask={onCreateTask}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}

        {view === 'week' ? (
          <WeekCalendar
            tasks={tasks}
            subscriptions={subscriptions}
            selectedDate={selectedDate}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}

        {view === 'day' ? (
          <DayCalendar
            tasks={selectedTasks}
            subscriptions={selectedSubs}
            selectedDate={selectedDate}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}
      </div>

      <aside className="panel side-panel">
        <div className="panel-header compact">
          <div>
            <p className="kicker">Обраний день</p>
            <h2>{formatLongDate(selectedDate)}</h2>
          </div>
          <button className="icon-btn pink" type="button" onClick={() => onCreateTask(selectedDate)}>
            <Plus size={18} />
          </button>
        </div>
        <TaskFiltersBox
          filters={filters}
          tags={tags}
          onChange={onFiltersChange}
          compact
        />
        <div className="agenda-list">
          {selectedSubs.map((sub) => (
            <button
              key={`side-sub-${sub.id}`}
              type="button"
              className="task-row"
              style={{ borderColor: sub.color }}
              onClick={() => void onPaySub(sub)}
            >
              <span className="task-dot" style={{ background: sub.color }} />
              <span>
                <strong>💸 {sub.title} ({sub.amount} ₴)</strong>
                <small>Регулярний платіж · Натисніть, щоб сплатити</small>
              </span>
            </button>
          ))}

          {selectedTasks.length ? (
            selectedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
            ))
          ) : null}

          {!selectedTasks.length && !selectedSubs.length ? (
            <EmptyState
              icon={<Clock3 size={22} />}
              title="Немає планів на цей день"
              text="Створіть задачу, або подивіться регулярні платежі."
            />
          ) : null}
        </div>
      </aside>
    </section>
  )
}

function MonthCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onSelectDate,
  onCreateTask,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onCreateTask: (date: string) => void
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const cells = getMonthCells(selectedDate)
  return (
    <div className="month-calendar">
      {dayNames.map((day) => (
        <div className="weekday" key={day}>
          {day}
        </div>
      ))}
      {cells.map((cell) => {
        const cellTasks = tasks.filter((task) => taskTouchesDay(task, cell.key))
        const cellSubs = subscriptions.filter((sub) => sub.next_payment_date === cell.key)
        return (
          <button
            type="button"
            className={`month-cell ${cell.inMonth ? '' : 'muted'} ${
              selectedDate === cell.key ? 'selected' : ''
            } ${cell.isToday ? 'today' : ''}`}
            key={cell.key}
            onClick={() => onSelectDate(cell.key)}
            onDoubleClick={() => onCreateTask(cell.key)}
          >
            <span className="cell-date">{cell.date.getDate()}</span>
            <span className="cell-stack">
              {cellSubs.map((sub) => (
                <span
                  className="calendar-sub-chip"
                  style={{ borderLeftColor: sub.color }}
                  key={`sub-${sub.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    void onPaySub(sub)
                  }}
                >
                  💸 {sub.title} ({sub.amount} ₴)
                </span>
              ))}

              {cellTasks.slice(0, 3).map((task) => (
                <span
                  className="calendar-chip"
                  style={{ borderLeftColor: task.color }}
                  key={task.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditTask(task)
                  }}
                >
                  {task.title}
                </span>
              ))}
              {cellTasks.length + cellSubs.length > 3 ? (
                <span className="more-count">ще +{cellTasks.length + cellSubs.length - 3}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function WeekCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const days = getWeekDays(selectedDate)
  const hours = Array.from({ length: 12 }, (_, index) => index + 8)

  return (
    <div className="week-calendar">
      <div className="week-corner" />
      {days.map((date) => {
        const key = toDateKey(date)
        return (
          <div className="week-day-head" key={key}>
            <span>{dayNames[(date.getDay() + 6) % 7]}</span>
            <strong>{date.getDate()}</strong>
          </div>
        )
      })}
      {hours.map((hour) => (
        <div className="week-row" key={hour}>
          <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
          {days.map((date) => {
            const key = toDateKey(date)
            const hourTasks = tasks.filter(
              (task) => taskTouchesDay(task, key) && taskHour(task) === hour,
            )
            const hourSubs = hour === 9 ? subscriptions.filter((sub) => sub.next_payment_date === key) : []
            return (
              <div className="week-slot" key={`${key}-${hour}`}>
                {hourSubs.map((sub) => (
                  <button
                    type="button"
                    className="week-task"
                    style={{ borderLeftColor: sub.color, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                    key={`sub-${sub.id}`}
                    onClick={() => void onPaySub(sub)}
                  >
                    💸 {sub.title} ({sub.amount} ₴)
                  </button>
                ))}
                {hourTasks.map((task) => (
                  <button
                    type="button"
                    className="week-task"
                    style={{ borderLeftColor: task.color }}
                    key={task.id}
                    onClick={() => onEditTask(task)}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function DayCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const hours = Array.from({ length: 14 }, (_, index) => index + 7)
  const untimed = tasks.filter((task) => taskHour(task) === null)

  return (
    <div className="day-calendar">
      <div className="day-title">
        <CalendarDays size={18} />
        <span>{formatLongDate(selectedDate)}</span>
      </div>

      {hours.map((hour) => {
        const hourTasks = tasks.filter((task) => taskHour(task) === hour)
        const hourSubs = hour === 9 ? subscriptions.filter((sub) => sub.next_payment_date === selectedDate) : []
        return (
          <div className="day-row" key={hour}>
            <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
            <div className="day-slot">
              {hourSubs.map((sub) => (
                <button
                  key={`day-sub-${sub.id}`}
                  type="button"
                  className="task-row"
                  style={{ borderColor: sub.color }}
                  onClick={() => void onPaySub(sub)}
                >
                  <span className="task-dot" style={{ background: sub.color }} />
                  <span>
                    <strong>💸 {sub.title} ({sub.amount} ₴)</strong>
                    <small>Регулярний платіж (9:00)</small>
                  </span>
                </button>
              ))}

              {hourTasks.map((task) => (
                <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
              ))}
            </div>
          </div>
        )
      })}
      {untimed.length ? (
        <div className="untimed-block">
          <p className="kicker">Без точного часу</p>
          {untimed.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
