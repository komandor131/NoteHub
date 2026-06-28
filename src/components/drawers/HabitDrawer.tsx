import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { Habit, HabitPayload } from '../../types'

interface HabitDrawerProps {
  open: boolean
  habit: Habit | null
  onClose: () => void
  onSubmit: (payload: HabitPayload) => Promise<void>
}

export default function HabitDrawer({
  open,
  habit,
  onClose,
  onSubmit,
}: HabitDrawerProps) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#a855f7')

  useEffect(() => {
    if (open) {
      setTitle('')
      setColor('#a855f7')
    }
  }, [open, habit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Будь ласка, введіть назву звички')
      return
    }
    void onSubmit({
      title: title.trim(),
      color,
    })
  }

  if (!open) return null

  const colors = ['#a855f7', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#6366f1', '#ec4899', '#14b8a6']

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <form className="drawer" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="drawer-header">
          <h2>Створити звичку</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="form-group">
            <label className="form-label">Назва звички</label>
            <input
              type="text"
              className="form-control"
              placeholder="Наприклад: Читати 20 хв, Пити воду, Спорт..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Оберіть колір акценту</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '2px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: color === c ? '0 0 8px ' + c : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Створити звичку
          </button>
        </div>
      </form>
    </div>
  )
}
