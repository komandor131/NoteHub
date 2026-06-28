import React, { useState, useEffect, type FormEvent } from 'react'
import { X, Upload, Save } from 'lucide-react'
import type { DiaryEntry, DiaryEntryPayload, DiaryFormState } from '../../types'
import { todayKey } from '../../dateUtils'
import AttachmentList from '../AttachmentList/AttachmentList'

interface DiaryDrawerProps {
  open: boolean
  entry: DiaryEntry | null
  onClose: () => void
  onSubmit: (payload: DiaryEntryPayload, file: File | null) => Promise<void>
}

export default function DiaryDrawer({
  open,
  entry,
  onClose,
  onSubmit,
}: DiaryDrawerProps) {
  const [form, setForm] = useState<DiaryFormState>({
    title: '',
    content: '',
    date: todayKey(),
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title,
        content: entry.content,
        date: entry.date,
      })
    } else {
      setForm({
        title: '',
        content: '',
        date: todayKey(),
      })
    }
    setFile(null)
  }, [entry, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(form, file)
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{entry ? 'Редагувати запис' : 'Створити запис'}</p>
            <h2>{entry ? entry.title : 'Запис у щоденнику'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Тема дня (Заголовок)</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Чудовий вечір, Продуктивний день"
              autoFocus
            />
          </label>
          <label className="wide">
            <span>Дата запису</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="wide">
            <span>Текст запису (Що сталося?)</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              required
              placeholder="Почніть писати тут ваші думки..."
            />
          </label>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Фото спогаду / дня
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Обрати фотографію'}</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={entry?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти запис
          </button>
        </div>
      </form>
    </div>
  )
}
