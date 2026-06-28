import React, { useState, useEffect, type FormEvent } from 'react'
import { X, Save } from 'lucide-react'
import type { Subscription, SubscriptionPayload, SubscriptionFormState } from '../../types'
import { todayKey } from '../../dateUtils'

interface SubscriptionDrawerProps {
  open: boolean
  sub: Subscription | null
  onClose: () => void
  onSubmit: (payload: SubscriptionPayload) => Promise<void>
}

export default function SubscriptionDrawer({
  open,
  sub,
  onClose,
  onSubmit,
}: SubscriptionDrawerProps) {
  const [form, setForm] = useState<SubscriptionFormState>({
    title: '',
    amount: '200',
    period: 'monthly',
    next_payment_date: todayKey(),
    category: 'Розваги',
    color: '#a855f7',
  })

  useEffect(() => {
    if (sub) {
      setForm({
        title: sub.title,
        amount: String(sub.amount),
        period: sub.period,
        next_payment_date: sub.next_payment_date,
        category: sub.category,
        color: sub.color,
      })
    } else {
      setForm({
        title: '',
        amount: '200',
        period: 'monthly',
        next_payment_date: todayKey(),
        category: 'Розваги',
        color: '#a855f7',
      })
    }
  }, [sub, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: form.title,
      amount: parseFloat(form.amount) || 0,
      period: form.period,
      next_payment_date: form.next_payment_date,
      category: form.category,
      color: form.color,
    })
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{sub ? 'Редагувати платіж' : 'Новий регулярний платіж'}</p>
            <h2>{sub ? sub.title : 'Регулярний платіж'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва підписки / платежу</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Netflix, Оренда, Spotify"
              autoFocus
            />
          </label>
          <label>
            <span>Сума платежу (₴)</span>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Періодичність</span>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as 'monthly' | 'weekly' })}
            >
              <option value="monthly">Щомісяця</option>
              <option value="weekly">Щотижня</option>
            </select>
          </label>
          <label>
            <span>Дата наступної оплати</span>
            <input
              type="date"
              value={form.next_payment_date}
              onChange={(e) => setForm({ ...form, next_payment_date: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Категорія</span>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Розваги, Послуги, Оренда"
            />
          </label>
          <label>
            <span>Колір картки</span>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </label>
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти платіж
          </button>
        </div>
      </form>
    </div>
  )
}
