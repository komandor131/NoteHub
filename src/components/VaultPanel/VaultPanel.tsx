import React, { useState, useEffect, type FormEvent } from 'react'
import Editor from '@monaco-editor/react'
import {
  Plus,
  FileCode2,
  Code2,
  Trash2,
  Check,
  Copy,
  Maximize2,
  Save,
  Minimize2,
  Upload,
} from 'lucide-react'
import type { Snippet, Project, SnippetPayload, SnippetFilters, Attachment, SnippetFormState } from '../../types'
import SnippetFiltersBox from '../SnippetFiltersBox/SnippetFiltersBox'
import AttachmentList from '../AttachmentList/AttachmentList'
import EmptyState from '../EmptyState/EmptyState'
import { splitTags } from '../drawers/TaskDrawer'
import styles from './VaultPanel.module.css'

export const languageOptions = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'css',
  'html',
  'json',
  'python',
  'sql',
  'bash',
  'markdown',
]

export function snippetToForm(snippet: Snippet | null): SnippetFormState {
  if (snippet) {
    return {
      title: snippet.title,
      language: snippet.language,
      code: snippet.code,
      explanation: snippet.explanation,
      tagsText: snippet.tags.join(', '),
      projectId: snippet.projectId !== null ? String(snippet.projectId) : '',
    }
  }
  return {
    title: '',
    language: 'typescript',
    code: '',
    explanation: '',
    tagsText: '',
    projectId: '',
  }
}

export function snippetPayload(form: SnippetFormState): SnippetPayload {
  return {
    title: form.title,
    language: form.language,
    code: form.code,
    explanation: form.explanation,
    tags: splitTags(form.tagsText),
    projectId: form.projectId ? Number(form.projectId) : null,
  }
}

type SnippetSelection = number | 'new' | null

interface VaultPanelProps {
  snippets: Snippet[]
  allSnippets: Snippet[]
  selectedSnippet: Snippet | null
  selection: SnippetSelection
  filters: SnippetFilters
  tags: string[]
  languages: string[]
  isFullscreenCode: boolean
  projects: Project[]
  quickSnippetProjectId: number | null
  onSelect: (selection: SnippetSelection) => void
  onFiltersChange: (filters: SnippetFilters) => void
  onSave: (payload: SnippetPayload, file: File | null, snippet: Snippet | null) => Promise<void>
  onDelete: (snippet: Snippet) => Promise<void>
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
  setIsFullscreenCode: (v: boolean) => void
}

export default function VaultPanel({
  snippets,
  allSnippets,
  selectedSnippet,
  selection,
  filters,
  tags,
  languages,
  isFullscreenCode,
  projects,
  quickSnippetProjectId,
  onSelect,
  onFiltersChange,
  onSave,
  onDelete,
  onDeleteAttachment,
  setIsFullscreenCode,
}: VaultPanelProps) {
  const [form, setForm] = useState<SnippetFormState>(snippetToForm(selectedSnippet))
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (selection === 'new') {
      setForm({
        title: '',
        language: 'typescript',
        code: '',
        explanation: '',
        tagsText: '',
        projectId: quickSnippetProjectId ? String(quickSnippetProjectId) : '',
      })
    } else {
      setForm(snippetToForm(selectedSnippet))
    }
    setFile(null)
  }, [selectedSnippet, selection, quickSnippetProjectId])

  const isNew = selection === 'new'

  const submit = async (event?: FormEvent) => {
    if (event) event.preventDefault()
    await onSave(snippetPayload(form), file, isNew ? null : selectedSnippet)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(form.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Не вдалося скопіювати.')
    }
  }

  return (
    <section className={`vault-grid ${styles.vaultPanel}`}>
      <aside className="panel snippet-list-panel">
        <div className="panel-header compact">
          <div>
            <p className="kicker">Сховище коду</p>
            <h2>Фрагменти</h2>
          </div>
          <button className="icon-btn pink" type="button" onClick={() => onSelect('new')}>
            <Plus size={18} />
          </button>
        </div>
        <SnippetFiltersBox
          filters={filters}
          tags={tags}
          languages={languages}
          onChange={onFiltersChange}
        />
        <div className="snippet-list">
          {snippets.map((snippet) => (
            <button
              className={`snippet-row ${selectedSnippet?.id === snippet.id ? 'active' : ''}`}
              type="button"
              key={snippet.id}
              onClick={() => onSelect(snippet.id)}
            >
              <span className="snippet-row-icon">
                <FileCode2 size={17} />
              </span>
              <span>
                <strong>{snippet.title}</strong>
                <small>
                  {snippet.language} · {snippet.tags.join(', ') || 'без тегів'}
                </small>
              </span>
            </button>
          ))}
          {!snippets.length ? (
            <EmptyState
              icon={<Code2 size={22} />}
              title={allSnippets.length ? 'Нічого не знайдено' : 'База коду порожня'}
              text="Створіть свій перший фрагмент коду."
            />
          ) : null}
        </div>
      </aside>

      <form className="panel editor-panel" onSubmit={submit}>
        <div className="panel-header">
          <div>
            <p className="kicker">{isNew ? 'Нова картка коду' : 'Міні IDE'}</p>
            <h2>{isNew ? 'Створити код' : selectedSnippet?.title ?? 'Редактор коду'}</h2>
          </div>
          <div className="row-actions">
            {selectedSnippet ? (
              <button className="icon-btn danger" type="button" onClick={() => void onDelete(selectedSnippet)}>
                <Trash2 size={17} />
              </button>
            ) : null}
            <button className="btn secondary" type="button" onClick={copyToClipboard}>
              {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              {copied ? 'Скопійовано!' : 'Копіювати'}
            </button>
            <button className="btn secondary" type="button" onClick={() => setIsFullscreenCode(true)}>
              <Maximize2 size={14} />
              На весь екран
            </button>
            <button className="btn primary" type="submit">
              <Save size={16} />
              Зберегти
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Назва коду</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Мова</span>
            <select
              value={form.language}
              onChange={(event) => setForm({ ...form, language: event.target.value })}
            >
              {languageOptions.map((language) => (
                <option value={language} key={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Проєкт</span>
            <select
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Без проєкту</option>
              {projects.map((proj) => (
                <option value={proj.id} key={proj.id}>
                  {proj.title} {proj.is_completed ? '(Завершено)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Теги</span>
            <input
              value={form.tagsText}
              onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              placeholder="react, api, auth"
            />
          </label>
        </div>

        <div className="editor-frame">
          <Editor
            height="360px"
            language={form.language || 'typescript'}
            theme="vs-dark"
            value={form.code}
            onChange={(value) => setForm({ ...form, code: value ?? '' })}
            options={{
              automaticLayout: true,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>

        <label>
          <span>Пояснення / Нотатки</span>
          <textarea
            value={form.explanation}
            onChange={(event) => setForm({ ...form, explanation: event.target.value })}
            rows={5}
          />
        </label>

        <div className="upload-strip">
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList
            attachments={selectedSnippet?.attachments ?? []}
            onDelete={onDeleteAttachment}
          />
        </div>
      </form>

      {/* Fullscreen Code Editor Overlay */}
      {isFullscreenCode && (
        <div className="fullscreen-editor-backdrop">
          <div className="fullscreen-editor-header">
            <h3>{form.title || 'Редактор коду'} ({form.language})</h3>
            <div className="row-actions">
              <button className="btn secondary" type="button" onClick={copyToClipboard}>
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copied ? 'Скопійовано!' : 'Копіювати код'}
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  void submit()
                  setIsFullscreenCode(false)
                }}
              >
                <Save size={14} />
                Зберегти
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setIsFullscreenCode(false)}
                aria-label="Вийти з повного екрана"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>
          <div className="fullscreen-editor-body">
            <Editor
              height="100%"
              language={form.language || 'typescript'}
              theme="vs-dark"
              value={form.code}
              onChange={(value) => setForm({ ...form, code: value ?? '' })}
              options={{
                automaticLayout: true,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize: 16,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
