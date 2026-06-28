import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { Roadmap, RoadmapPayload } from '../../types'

interface RoadmapDrawerProps {
  open: boolean
  roadmap: Roadmap | null
  onClose: () => void
  onSubmit: (payload: RoadmapPayload) => Promise<void>
}

export default function RoadmapDrawer({
  open,
  roadmap,
  onClose,
  onSubmit,
}: RoadmapDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (roadmap) {
      setTitle(roadmap.title)
      setDescription(roadmap.description)
    } else {
      setTitle('')
      setDescription('')
    }
  }, [roadmap, open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Будь ласка, введіть назву роадмапу')
      return
    }
    void onSubmit({
      title: title.trim(),
      description: description.trim(),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="drawer-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {roadmap ? 'Редагувати опис роадмапу' : 'Створити навчальний роадмап'}
          </h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Назва роадмапу</label>
            <input
              type="text"
              className="form-control"
              placeholder="Наприклад: Python для початківців, Вступ до AI..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              style={{
                background: '#09090b',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                padding: '8px 12px',
                fontSize: '14px',
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Опис</label>
            <textarea
              className="form-control"
              placeholder="Опишіть цілі навчання або структуру курсу..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                background: '#09090b',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                padding: '8px 12px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div className="drawer-actions" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'transparent' }}>
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} style={{ marginRight: '6px' }} />
            Зберегти
          </button>
        </div>
      </form>
    </div>
  )
}
