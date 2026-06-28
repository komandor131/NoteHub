import React, { useState, useEffect, type FormEvent } from 'react'
import { X, Upload, Save, Trash2, Plus } from 'lucide-react'
import type { Project, ProjectPayload, ProjectLink } from '../../types'
import AttachmentList from '../AttachmentList/AttachmentList'

interface ProjectDrawerProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onSubmit: (payload: ProjectPayload, file: File | null) => Promise<void>
}

export default function ProjectDrawer({
  open,
  project,
  onClose,
  onSubmit,
}: ProjectDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [prodUrl, setProdUrl] = useState('')
  const [techStackText, setTechStackText] = useState('')
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description)
      setRepoUrl(project.repo_url)
      setProdUrl(project.prod_url)
      setTechStackText(project.tech_stack.join(', '))
      setLinks(project.links)
      setIsCompleted(!!project.is_completed)
    } else {
      setTitle('')
      setDescription('')
      setRepoUrl('')
      setProdUrl('')
      setTechStackText('')
      setLinks([])
      setIsCompleted(false)
    }
    setFile(null)
  }, [project, open])

  if (!open) return null

  const handleAddLink = () => {
    setLinks([...links, { name: '', url: '' }])
  }

  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx))
  }

  const handleLinkChange = (idx: number, key: keyof ProjectLink, value: string) => {
    const updated = [...links]
    updated[idx] = { ...updated[idx], [key]: value }
    setLinks(updated)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const techStack = techStackText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    await onSubmit(
      {
        title,
        description,
        repo_url: repoUrl,
        prod_url: prodUrl,
        tech_stack: techStack,
        links: links.filter((l) => l.name && l.url),
        is_completed: isCompleted,
      },
      file
    )
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{project ? 'Редагувати проєкт' : 'Новий проєкт'}</p>
            <h2>{project ? project.title : 'Створити проєкт'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва проєкту</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Наприклад: NoteHub, E-commerce App"
              autoFocus
            />
          </label>

          <label className="wide">
            <span>Опис проєкту</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Короткий опис цілей та завдань проєкту..."
            />
          </label>

          <label>
            <span>Репозиторій (Git)</span>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
            />
          </label>

          <label>
            <span>Посилання на деплой</span>
            <input
              value={prodUrl}
              onChange={(e) => setProdUrl(e.target.value)}
              placeholder="https://my-app.vercel.app"
            />
          </label>

          <label className="wide">
            <span>Стек технологій (через кому)</span>
            <input
              value={techStackText}
              onChange={(e) => setTechStackText(e.target.value)}
              placeholder="React, TypeScript, SQLite, Express"
            />
          </label>

          <div className="wide" style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
              Додаткові корисні посилання (Figma, доки, ТЗ)
            </span>
            <div className="project-drawer-links-config">
              {links.map((link, idx) => (
                <div className="project-drawer-link-row" key={idx}>
                  <input
                    placeholder="Назва (напр. Figma)"
                    value={link.name}
                    onChange={(e) => handleLinkChange(idx, 'name', e.target.value)}
                    required
                  />
                  <input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                    required
                  />
                  <button className="icon-btn danger" type="button" onClick={() => handleRemoveLink(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className="btn secondary" type="button" style={{ width: 'fit-content' }} onClick={handleAddLink}>
                <Plus size={14} /> Додати посилання
              </button>
            </div>
          </div>

          <div className="wide" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="drawer-project-completed"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="drawer-project-completed" style={{ fontSize: '13px', margin: 0, cursor: 'pointer', userSelect: 'none' }}>
              Проєкт завершено (позначити як виконаний)
            </label>
          </div>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Макети / ТЗ / Файли проєкту
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={project?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти проєкт
          </button>
        </div>
      </form>
    </div>
  )
}
