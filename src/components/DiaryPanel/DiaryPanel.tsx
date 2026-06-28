import React from 'react'
import { Search, FileText, Trash2, BookOpen } from 'lucide-react'
import type { DiaryPanelProps } from '../../types'
import { monthNames } from '../../dateUtils'
import EmptyState from '../EmptyState/EmptyState'
import styles from './DiaryPanel.module.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function DiaryPanel({
  diarySearch,
  setDiarySearch,
  entries,
  onEdit,
  onDelete,
}: DiaryPanelProps) {
  return (
    <div className={`diary-wrapper ${styles.diaryPanel}`}>
      <div className="panel filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', borderBottom: 0 }}>
        <label className="search-box" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            value={diarySearch}
            onChange={(e) => setDiarySearch(e.target.value)}
            placeholder="Шукати запис у щоденнику..."
          />
        </label>
      </div>

      <div className="diary-timeline">
        {entries.map((entry) => {
          // parse date key
          const parts = entry.date.split('-')
          const day = parts[2] || ''
          const monthText = parts[1] ? monthNames[parseInt(parts[1], 10) - 1]?.slice(0, 3) : ''

          // find images
          const imageAttachments = entry.attachments.filter(
            (a) => a.mimeType.startsWith('image/')
          )

          return (
            <article className="diary-card" key={entry.id}>
              <div className="diary-side-date">
                <strong>{day}</strong>
                <span>{monthText}</span>
              </div>

              <div className="diary-content-block">
                <div className="diary-card-header">
                  <h3>{entry.title}</h3>
                  <div className="row-actions">
                    <button className="icon-btn" type="button" onClick={() => onEdit(entry)}>
                      <FileText size={15} />
                    </button>
                    <button className="icon-btn danger" type="button" onClick={() => void onDelete(entry)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="diary-card-body">{entry.content}</div>

                {imageAttachments.length > 0 && (
                  <div className="diary-attachments">
                    {imageAttachments.map((img) => (
                      <a
                        key={img.id}
                        className="diary-attachment-preview"
                        href={`${API_BASE}/uploads/${encodeURIComponent(img.storedName)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`${API_BASE}/uploads/${encodeURIComponent(img.storedName)}`}
                          alt={img.originalName}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {!entries.length && (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="Щоденник порожній"
            text="Напишіть про те, як пройшов ваш день, додайте спогади та фото."
          />
        )}
      </div>
    </div>
  )
}
