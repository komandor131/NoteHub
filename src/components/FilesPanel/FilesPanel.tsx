import React from 'react'
import { Paperclip, FileText, Trash2 } from 'lucide-react'
import type { Attachment, Task, Snippet, FinanceGoal, DiaryEntry, Project, FilesPanelProps } from '../../types'
import EmptyState from '../EmptyState/EmptyState'
import styles from './FilesPanel.module.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function entityTitle(
  attachment: Attachment,
  tasks: Task[],
  snippets: Snippet[],
  goals: FinanceGoal[],
  diaryEntries: DiaryEntry[],
  projects: Project[]
) {
  if (attachment.entityType === 'task') {
    return `Задача: ${tasks.find((task) => task.id === attachment.entityId)?.title ?? 'Видалена задача'}`
  }
  if (attachment.entityType === 'snippet') {
    return `Код: ${snippets.find((snippet) => snippet.id === attachment.entityId)?.title ?? 'Видалений код'}`
  }
  if (attachment.entityType === 'goal') {
    return `Ціль: ${goals.find((g) => g.id === attachment.entityId)?.title ?? 'Видалена ціль'}`
  }
  if (attachment.entityType === 'diary') {
    return `Щоденник: ${diaryEntries.find((e) => e.id === attachment.entityId)?.title ?? 'Видалений запис'}`
  }
  if (attachment.entityType === 'project') {
    return `Проєкт: ${projects.find((p) => p.id === attachment.entityId)?.title ?? 'Видалений проєкт'}`
  }
  return 'Локальний файл'
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default function FilesPanel({
  attachments,
  tasks,
  snippets,
  goals,
  diaryEntries,
  projects,
  onDeleteAttachment,
}: FilesPanelProps) {
  return (
    <section className={`panel ${styles.filesPanel}`}>
      <div className="panel-header">
        <div>
          <p className="kicker">Вкладення</p>
          <h2>Бібліотека локальних файлів</h2>
        </div>
        <p className="muted">{attachments.length} файлів збережено у сховищі</p>
      </div>
      <div className="file-grid">
        {attachments.map((attachment) => (
          <article className="file-card" key={attachment.id}>
            <div className="file-icon">
              <Paperclip size={19} />
            </div>
            <div>
              <h3>{attachment.originalName}</h3>
              <p>{formatBytes(attachment.size)}</p>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                {entityTitle(attachment, tasks, snippets, goals, diaryEntries, projects)}
              </small>
            </div>
            <div className="row-actions">
              <a
                className="icon-btn"
                href={`${API_BASE}/uploads/${encodeURIComponent(attachment.storedName)}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Відкрити ${attachment.originalName}`}
              >
                <FileText size={17} />
              </a>
              <button
                className="icon-btn danger"
                type="button"
                onClick={() => void onDeleteAttachment(attachment)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
        {!attachments.length ? (
          <EmptyState
            icon={<Paperclip size={22} />}
            title="Немає завантажених файлів"
            text="Завантажуйте фото в щоденнику, фінансових цілях або планувальнику."
          />
        ) : null}
      </div>
    </section>
  )
}
