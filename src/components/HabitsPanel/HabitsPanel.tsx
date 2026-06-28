import React, { useMemo } from 'react'
import { Trash2, Check, Target, Plus } from 'lucide-react'
import type { Habit, HabitsPanelProps } from '../../types'
import { toDateKey } from '../../dateUtils'
import EmptyState from '../EmptyState/EmptyState'
import styles from './HabitsPanel.module.css'

export default function HabitsPanel({
  habits,
  onCreateHabit,
  onToggleHabit,
  onDeleteHabit,
}: HabitsPanelProps) {
  const past7Days = useMemo(() => {
    const list = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      list.push({
        dateStr: toDateKey(d),
        label: d.toLocaleDateString('uk-UA', { weekday: 'short' }),
        dayNum: d.getDate(),
      })
    }
    return list
  }, [])

  const monthCells = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const list = []
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      list.push({
        dateStr: toDateKey(date),
        dayNum: d,
      })
    }
    return list
  }, [])

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('uk-UA', { month: 'long' })
  }, [])

  const calculateStreaks = (history: string[]) => {
    if (!history || !history.length) return { current: 0, max: 0 }
    const sorted = [...new Set(history)].sort()
    
    let maxStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null
    let tempStreak = 0

    for (const dStr of sorted) {
      const d = new Date(dStr)
      if (lastDate === null) {
        tempStreak = 1
      } else {
        const diffTime = Math.abs(d.getTime() - lastDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else if (diffDays > 1) {
          tempStreak = 1
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak
      }
      lastDate = d
    }

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    
    const todayStr = toDateKey(today)
    const yesterdayStr = toDateKey(yesterday)
    
    const hasToday = history.includes(todayStr)
    const hasYesterday = history.includes(yesterdayStr)
    
    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? today : yesterday
      currentStreak = 0
      while (true) {
        const checkStr = toDateKey(checkDate)
        if (history.includes(checkStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    } else {
      currentStreak = 0
    }

    return { current: currentStreak, max: Math.max(maxStreak, currentStreak) }
  }

  return (
    <div className={`habits-wrapper ${styles.habitsPanel}`}>
      <div className="habits-grid">
        {habits.map((habit) => {
          const { current, max } = calculateStreaks(habit.history)
          const style = { '--accent-color': habit.color } as React.CSSProperties

          return (
            <article className="habit-card" key={habit.id} style={style}>
              <div className="habit-header">
                <div className="habit-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: habit.color }} />
                    <h3 className="habit-title">{habit.title}</h3>
                  </div>
                  <div className="habit-streak" style={{ color: habit.color }}>
                    🔥 Поточна серія: {current} | Рекорд: {max} днів
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  style={{ width: '28px', height: '28px' }}
                  onClick={() => void onDeleteHabit(habit.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* 7 Day Checklist */}
              <div>
                <span className="habit-heatmap-title" style={{ fontSize: '10px', marginBottom: '6px', display: 'block' }}>
                  Останні 7 днів
                </span>
                <div className="habit-checklist-7day">
                  {past7Days.map((day) => {
                    const isChecked = habit.history.includes(day.dateStr)
                    return (
                      <div className="habit-day-col" key={day.dateStr}>
                        <span className="habit-day-label">{day.label}</span>
                        <button
                          type="button"
                          className={`habit-checkbox ${isChecked ? 'checked' : ''}`}
                          onClick={() => void onToggleHabit(habit.id, day.dateStr, !isChecked)}
                        >
                          {isChecked && <Check size={14} />}
                        </button>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>
                          {day.dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Month Heatmap */}
              <div className="habit-heatmap-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="habit-heatmap-title">Календар за {currentMonthName}</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    Виконано: {habit.history.filter((d) => d.startsWith(toDateKey(new Date()).substring(0, 7))).length} дн.
                  </span>
                </div>
                <div className="habit-heatmap-grid">
                  {monthCells.map((cell) => {
                    const isCompleted = habit.history.includes(cell.dateStr)
                    return (
                      <div
                        key={cell.dateStr}
                        className={`habit-heatmap-cell ${isCompleted ? 'completed' : ''}`}
                        data-date={`${cell.dayNum} ${currentMonthName}: ${isCompleted ? 'Виконано' : 'Не відмічено'}`}
                      />
                    )
                  })}
                </div>
              </div>
            </article>
          )
        })}

        {!habits.length && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
            <EmptyState
              icon={<Target size={24} />}
              title="Немає звичок для відстеження"
              text="Створіть свою першу щоденну звичку, виберіть для неї яскравий колір та відзначайте її виконання кожен день!"
            />
            <button className="btn primary" type="button" onClick={onCreateHabit}>
              <Plus size={16} />
              Створити першу звичку
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
