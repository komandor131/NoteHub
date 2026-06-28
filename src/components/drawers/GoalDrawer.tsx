import React, { useState, useEffect, type FormEvent } from 'react'
import { X, Upload, Save } from 'lucide-react'
import type { FinanceGoal, FinanceGoalPayload, GoalFormState } from '../../types'
import { todayKey } from '../../dateUtils'
import AttachmentList from '../AttachmentList/AttachmentList'

interface GoalDrawerProps {
  open: boolean
  goal: FinanceGoal | null
  onClose: () => void
  onSubmit: (payload: FinanceGoalPayload, file: File | null) => Promise<void>
}

export default function GoalDrawer({
  open,
  goal,
  onClose,
  onSubmit,
}: GoalDrawerProps) {
  const [form, setForm] = useState<GoalFormState>({
    title: '',
    description: '',
    target_amount: '5000',
    saved_amount: '0',
    target_date: todayKey(),
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (goal) {
      setForm({
        title: goal.title,
        description: goal.description,
        target_amount: String(goal.target_amount),
        saved_amount: String(goal.saved_amount),
        target_date: goal.target_date || '',
      })
    } else {
      setForm({
        title: '',
        description: '',
        target_amount: '5000',
        saved_amount: '0',
        target_date: todayKey(),
      })
    }
    setFile(null)
  }, [goal, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(
      {
        title: form.title,
        description: form.description,
        target_amount: parseFloat(form.target_amount) || 0,
        saved_amount: parseFloat(form.saved_amount) || 0,
        target_date: form.target_date || null,
      },
      file
    )
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{goal ? 'Редагувати ціль' : 'Нова ціль'}</p>
            <h2>{goal ? goal.title : 'Створити ціль'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва речі / Бажання</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Новий телефон, Кросівки"
              autoFocus
            />
          </label>
          <label>
            <span>Скільки потрібно (₴)</span>
            <input
              type="number"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Скільки вже є (₴)</span>
            <input
              type="number"
              value={form.saved_amount}
              onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
              required
            />
          </label>
          <label className="wide">
            <span>Коли потрібно (Дата цілі)</span>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Навіщо це мені (Опис цілі)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Опишіть чому ви хочете це купити..."
            />
          </label>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Фото речі
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Обрати photo речі'}</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={goal?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти ціль
          </button>
        </div>
      </form>
    </div>
  )
}
