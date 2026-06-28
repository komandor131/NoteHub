import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  ChevronLeft,
  Check,
  Code2,
  Copy,
  Maximize2,
  Minus,
  ExternalLink,
  Upload,
  Save,
} from 'lucide-react'
import type {
  Project,
  Task,
  Snippet,
  Attachment,
  TaskPayload,
  Section,
  ProjectsPanelProps
} from '../../types'
import { uploadAttachment } from '../../api'
import AttachmentList from '../AttachmentList/AttachmentList'
import EmptyState from '../EmptyState/EmptyState'
import { getConnectionPoints, getBezierPath } from '../../canvasUtils'
import { priorityLabels, statusLabels } from '../drawers/TaskDrawer'
import { formatShortDate } from '../../dateUtils'
import styles from './ProjectsPanel.module.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type SnippetSelection = number | 'new' | null

export default function ProjectsPanel({
  projects,
  tasks,
  snippets,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onDeleteAttachment,
  onQuickCreateTask,
  onQuickCreateSnippet,
  onSaveCanvas,
  onUpdateTask,
  setSection,
  setSnippetSelection,
  openEditTask,
  onRefreshData,
  onToggleProjectCompleted,
}: ProjectsPanelProps) {
  const project = projects.find((p) => p.id === selectedProjectId) ?? null

  const [activeTab, setActiveTab] = useState<'workspace' | 'mindmap'>('workspace')
  const [projectFilter, setProjectFilter] = useState<'active' | 'completed' | 'all'>('all')
  const [nodes, setNodes] = useState<Array<{
    id: string
    x: number
    y: number
    title: string
    text: string
    type: 'text' | 'task' | 'snippet'
    taskId?: number
    snippetId?: number
    isCompleted?: boolean
    imageUrl?: string
    linkUrl?: string
    linkLabel?: string
    fileId?: number
  }>>([])
  const [edges, setEdges] = useState<Array<{ from: string; to: string }>>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)

  // Panning & zooming states
  const [canvasPanX, setCanvasPanX] = useState(100)
  const [canvasPanY, setCanvasPanY] = useState(100)
  const [canvasScale, setCanvasScale] = useState(1)
  const [isCanvasDragging, setIsCanvasDragging] = useState(false)
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 })

  // Node dragging states
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragNodeStart, setDragNodeStart] = useState({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 })

  const getNodeDimensions = (node: any) => {
    const type = node.type || 'text'
    if (type === 'task') return { w: 250, h: 120 }
    if (type === 'snippet') return { w: 300, h: 170 }
    
    let height = 100
    if (node.imageUrl) height += 80
    if (node.linkUrl) height += 20
    if (node.fileId) height += 25
    return { w: 220, h: height }
  }

  const [showTaskDropdown, setShowTaskDropdown] = useState(false)
  const [showSnippetDropdown, setShowSnippetDropdown] = useState(false)

  // Sync canvas with project
  useEffect(() => {
    if (project) {
      if (project.canvas_data) {
        try {
          const parsed = JSON.parse(project.canvas_data)
          const mappedNodes = (parsed.nodes || []).map((n: any) => ({
            id: n.id,
            x: n.x,
            y: n.y,
            title: n.title || '',
            text: n.text || '',
            type: n.type || 'text',
            taskId: n.taskId,
            snippetId: n.snippetId,
            isCompleted: !!n.isCompleted,
            imageUrl: n.imageUrl,
            linkUrl: n.linkUrl,
            linkLabel: n.linkLabel,
            fileId: n.fileId,
          }))
          setNodes(mappedNodes)
          setEdges(parsed.edges || [])
        } catch (err) {
          setNodes([])
          setEdges([])
        }
      } else {
        setNodes([])
        setEdges([])
      }
      setSelectedNodeId(null)
      setIsConnecting(false)
      setConnectingFromId(null)
      setCanvasPanX(100)
      setCanvasPanY(100)
      setCanvasScale(1)
      setIsCanvasDragging(false)
      setDraggingNodeId(null)
    } else {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
      setIsConnecting(false)
      setConnectingFromId(null)
    }
  }, [project?.id])

  const autoSaveCanvas = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    if (!project) return
    const payload = JSON.stringify({ nodes: updatedNodes, edges: updatedEdges })
    await onSaveCanvas(project.id, payload)
  }

  const handleAddTextNode = () => {
    if (!project) return
    const newId = String(Date.now())
    const newNode = {
      id: newId,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      title: '',
      text: '',
      type: 'text' as const,
      isCompleted: false,
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    setSelectedNodeId(newId)
    void autoSaveCanvas(updated, edges)
  }

  const handleAddTaskNode = (taskId: number) => {
    if (!project) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const newId = String(Date.now())
    const newNode = {
      id: newId,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      title: task.title,
      text: task.description || '',
      type: 'task' as const,
      taskId,
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    setSelectedNodeId(newId)
    void autoSaveCanvas(updated, edges)
    setShowTaskDropdown(false)
  }

  const handleAddSnippetNode = (snippetId: number) => {
    if (!project) return
    const snippet = snippets.find((s) => s.id === snippetId)
    if (!snippet) return
    const newId = String(Date.now())
    const newNode = {
      id: newId,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      title: snippet.title,
      text: snippet.explanation || '',
      type: 'snippet' as const,
      snippetId,
    }
    const updated = [...nodes, newNode]
    setNodes(updated)
    setSelectedNodeId(newId)
    void autoSaveCanvas(updated, edges)
    setShowSnippetDropdown(false)
  }

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = nodes.filter((n) => n.id !== nodeId)
    const updatedEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId)
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
    if (connectingFromId === nodeId) {
      setConnectingFromId(null)
      setIsConnecting(false)
    }
    void autoSaveCanvas(updatedNodes, updatedEdges)
  }

  const handleUpdateNodeDetails = (nodeId: string, title: string, text: string) => {
    const updated = nodes.map((n) => (n.id === nodeId ? { ...n, title, text } : n))
    setNodes(updated)
  }

  const handleNodeBlur = () => {
    void autoSaveCanvas(nodes, edges)
  }

  const handleToggleNodeCompleted = async (nodeId: string) => {
    const nodeItem = nodes.find((n) => n.id === nodeId)
    if (!nodeItem) return

    if (nodeItem.type === 'task' && nodeItem.taskId) {
      const task = tasks.find((t) => t.id === nodeItem.taskId)
      if (task) {
        const nextStatus = task.status === 'done' ? 'todo' : 'done'
        await onUpdateTask(task.id, {
          title: task.title,
          description: task.description,
          type: task.type,
          status: nextStatus,
          priority: task.priority,
          startAt: task.startAt,
          endAt: task.endAt,
          dueDate: task.dueDate,
          color: task.color,
          tags: task.tags,
          projectId: task.projectId,
        })
      }
    } else {
      const updated = nodes.map((n) =>
        n.id === nodeId ? { ...n, isCompleted: !n.isCompleted } : n
      )
      setNodes(updated)
      void autoSaveCanvas(updated, edges)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.canvas-viewport-bg') || target.tagName === 'svg' || target.classList.contains('canvas-container')) {
      setIsCanvasDragging(true)
      setCanvasDragStart({ x: e.clientX - canvasPanX, y: e.clientY - canvasPanY })
    }
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (isConnecting) return
    e.stopPropagation()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    setDraggingNodeId(nodeId)
    setDragNodeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x ?? 0,
      nodeY: node.y ?? 0,
    })
    setSelectedNodeId(nodeId)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isCanvasDragging) {
      setCanvasPanX(e.clientX - canvasDragStart.x)
      setCanvasPanY(e.clientY - canvasDragStart.y)
    } else if (draggingNodeId) {
      const deltaX = (e.clientX - dragNodeStart.mouseX) / canvasScale
      const deltaY = (e.clientY - dragNodeStart.mouseY) / canvasScale
      let newX = dragNodeStart.nodeX + deltaX
      let newY = dragNodeStart.nodeY + deltaY

      newX = Math.max(0, newX)
      newY = Math.max(0, newY)

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      )
    }
  }

  const handleCanvasMouseUp = () => {
    if (isCanvasDragging) {
      setIsCanvasDragging(false)
    }
    if (draggingNodeId) {
      setDraggingNodeId(null)
      void autoSaveCanvas(nodes, edges)
    }
  }

  const handleFitCanvasView = () => {
    if (nodes.length === 0) return

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    nodes.forEach((node) => {
      const dims = getNodeDimensions(node)
      const x = node.x ?? 0
      const y = node.y ?? 0
      if (x < minX) minX = x
      if (x + dims.w > maxX) maxX = x + dims.w
      if (y < minY) minY = y
      if (y + dims.h > maxY) maxY = y + dims.h
    })

    minX -= 60
    maxX += 60
    minY -= 60
    maxY += 60

    const treeWidth = maxX - minX
    const treeHeight = maxY - minY

    const container = document.querySelector('.canvas-container')
    const width = container?.clientWidth ?? 800
    const height = container?.clientHeight ?? 600

    const scaleX = width / treeWidth
    const scaleY = height / treeHeight
    const newScale = Math.max(0.4, Math.min(1.5, Math.min(scaleX, scaleY)))

    const newPanX = (width - treeWidth * newScale) / 2 - minX * newScale
    const newPanY = (height - treeHeight * newScale) / 2 - minY * newScale

    setCanvasScale(newScale)
    setCanvasPanX(newPanX)
    setCanvasPanY(newPanY)
  }

  const handleStartConnection = () => {
    setIsConnecting(true)
    setConnectingFromId(null)
  }

  const handleDeleteEdge = (fromId: string, toId: string) => {
    const updated = edges.filter((e) => !(e.from === fromId && e.to === toId))
    setEdges(updated)
    void autoSaveCanvas(nodes, updated)
  }

  if (!project) {
    const filteredProjects = projects.filter((proj) => {
      if (projectFilter === 'active') return !proj.is_completed
      if (projectFilter === 'completed') return proj.is_completed
      return true
    })

    return (
      <div className={`projects-grid-wrapper ${styles.projectsPanel}`}>
        <div className="panel" style={{ borderBottom: 0, borderRadius: '12px 12px 0 0' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <p className="kicker">Робочі області</p>
              <h2>Мої проєкти ({filteredProjects.length})</h2>
            </div>
            <button className="btn primary" type="button" onClick={onCreateProject}>
              <Plus size={16} />
              Новий проєкт
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'var(--panel-bg)', borderBottom: '1px solid var(--border)' }}>
            <button
              className={`btn ${projectFilter === 'all' ? 'primary' : 'secondary'}`}
              type="button"
              style={{ fontSize: '12px', minHeight: '30px', padding: '0 12px' }}
              onClick={() => setProjectFilter('all')}
            >
              Всі ({projects.length})
            </button>
            <button
              className={`btn ${projectFilter === 'completed' ? 'primary' : 'secondary'}`}
              type="button"
              style={{ fontSize: '12px', minHeight: '30px', padding: '0 12px' }}
              onClick={() => setProjectFilter('completed')}
            >
              Завершені ({projects.filter(p => p.is_completed).length})
            </button>
          </div>
        </div>

        <div className="projects-grid">
          {filteredProjects.map((proj) => {
            const projTasks = tasks.filter((t) => t.projectId === proj.id)
            let canvasTasksCount = 0
            let canvasCompletedCount = 0
            try {
              const canvas = JSON.parse(proj.canvas_data || '{}')
              const canvasNodes = canvas.nodes || []
              const canvasEdges = canvas.edges || []
              const connectedNodeIds = new Set(canvasEdges.flatMap((edge: any) => [edge.from, edge.to]))
              const connectedCanvasTasks = canvasNodes.filter((node: any) => node.type === 'text' && connectedNodeIds.has(node.id))
              canvasTasksCount = connectedCanvasTasks.length
              canvasCompletedCount = connectedCanvasTasks.filter((n: any) => !!n.isCompleted).length
            } catch (e) {
              // Ignore
            }

            const totalTasks = projTasks.length + canvasTasksCount
            const completedTasks = projTasks.filter((t) => t.status === 'done').length + canvasCompletedCount
            const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            return (
              <article
                className={`project-card ${proj.is_completed ? 'completed' : ''}`}
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                style={{
                  opacity: proj.is_completed ? 0.6 : 1,
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  border: proj.is_completed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                }}
              >
                <div>
                  <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <h3 className="project-card-title" style={{ textDecoration: proj.is_completed ? 'line-through' : 'none', margin: 0 }}>{proj.title}</h3>
                    {proj.is_completed && (
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        ✓ Завершено
                      </span>
                    )}
                  </div>
                  <p className="project-card-desc">{proj.description || 'Опис проєкту відсутній.'}</p>
                </div>

                <div className="project-card-footer">
                  <div className="tech-stack-pills">
                    {proj.tech_stack.slice(0, 4).map((tech) => (
                      <span className="tech-pill" key={tech}>
                        {tech}
                      </span>
                    ))}
                    {proj.tech_stack.length > 4 && (
                      <span className="tech-pill">+{proj.tech_stack.length - 4}</span>
                    )}
                  </div>

                  <div className="project-card-stats">
                    <span>Задачі: {completedTasks}/{totalTasks} ({taskPercent}%)</span>
                    <span>Код: {snippets.filter((s) => s.projectId === proj.id).length}</span>
                  </div>
                  <div className="project-progress-bar">
                    <div className="project-progress-fill" style={{ width: `${taskPercent}%` }} />
                  </div>
                </div>
              </article>
            )
          })}

          <article
            className="project-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderStyle: 'dashed',
              background: 'transparent',
            }}
            onClick={onCreateProject}
          >
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <Plus size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
              <strong>Створити проєкт</strong>
            </div>
          </article>
        </div>
      </div>
    )
  }

  const projTasks = tasks.filter((t) => t.projectId === project.id)
  const projSnippets = snippets.filter((s) => s.projectId === project.id)

  return (
    <div className={`project-workspace ${styles.projectsPanel}`}>
      <div className="panel project-workspace-header">
        <button
          className="project-workspace-back"
          onClick={() => onSelectProject(null)}
        >
          <ChevronLeft size={16} />
          Назад до всіх проєктів
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'workspace' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setActiveTab('workspace')}
          >
            📋 Робоча область
          </button>
          <button
            className={`btn ${activeTab === 'mindmap' ? 'primary' : 'secondary'}`}
            type="button"
            onClick={() => setActiveTab('mindmap')}
          >
            🗺️ Інтелект-карта
          </button>
        </div>
        <div className="row-actions">
          <button className="btn secondary" onClick={() => onEditProject(project)}>
            Редагувати проєкт
          </button>
          <button className="btn secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => onDeleteProject(project)}>
            Видалити проєкт
          </button>
        </div>
      </div>

      {activeTab === 'workspace' ? (
        <div className="project-workspace-container">
          <div className="project-main-flow">
            <div className="project-section-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px' }}>
                <input
                  type="checkbox"
                  checked={!!project.is_completed}
                  onChange={() => void onToggleProjectCompleted(project)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  title="Позначити проєкт як завершений"
                />
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#ffffff', textDecoration: project.is_completed ? 'line-through' : 'none' }}>
                  {project.title}
                </h1>
                {project.is_completed && (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    ✓ Завершено
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>
                {project.description || 'Опис відсутній.'}
              </p>

              <div className="tech-stack-pills" style={{ marginTop: '12px' }}>
                {project.tech_stack.map((tech) => (
                  <span className="tech-pill" style={{ fontSize: '11px', padding: '3px 8px' }} key={tech}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="project-section-card">
              {(() => {
                const connectedNodeIds = new Set(edges.flatMap((edge) => [edge.from, edge.to]))
                const connectedCanvasTasks = nodes.filter((node) => node.type === 'text' && connectedNodeIds.has(node.id))
                return (
                  <>
                    <h3>
                      <span>📋 Задачі проєкту ({projTasks.length + connectedCanvasTasks.length})</span>
                      <button className="btn secondary" style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }} onClick={() => onQuickCreateTask(project.id)}>
                        <Plus size={12} /> Додати задачу
                      </button>
                    </h3>

                    <div style={{ display: 'grid', gap: '8px' }}>
                      {projTasks.map((task) => (
                        <div
                          key={task.id}
                          className="project-link-item"
                          style={{ background: '#09090b', padding: '8px 12px', opacity: task.status === 'done' ? 0.6 : 1 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className={`task-node-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                              onClick={async (e) => {
                                e.stopPropagation()
                                const nextStatus = task.status === 'done' ? 'todo' : 'done'
                                await onUpdateTask(task.id, {
                                  title: task.title,
                                  description: task.description,
                                  type: task.type,
                                  status: nextStatus,
                                  priority: task.priority,
                                  startAt: task.startAt,
                                  endAt: task.endAt,
                                  dueDate: task.dueDate,
                                  color: task.color,
                                  tags: task.tags,
                                  projectId: task.projectId,
                                })
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {task.status === 'done' && <Check size={10} />}
                            </button>
                            <span className="task-dot" style={{ background: task.color, margin: 0, width: '8px', height: '8px' }} />
                            <span style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--muted)' : '#ffffff', fontWeight: 500 }}>
                              {task.title}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', background: '#18181b', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            {statusLabels[task.status]}
                          </span>
                        </div>
                      ))}

                      {connectedCanvasTasks.map((node) => (
                        <div
                          key={node.id}
                          className="project-link-item"
                          style={{ background: '#09090b', padding: '8px 12px', opacity: node.isCompleted ? 0.6 : 1 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className={`task-node-checkbox ${node.isCompleted ? 'checked' : ''}`}
                              onClick={async (e) => {
                                e.stopPropagation()
                                const updated = nodes.map((n) => n.id === node.id ? { ...n, isCompleted: !n.isCompleted } : n)
                                setNodes(updated)
                                void autoSaveCanvas(updated, edges)
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {node.isCompleted && <Check size={10} />}
                            </button>
                            <span style={{ textDecoration: node.isCompleted ? 'line-through' : 'none', color: node.isCompleted ? 'var(--muted)' : '#ffffff', fontWeight: 500 }}>
                              {node.title || 'Нова нотатка'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', background: '#18181b', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            🗺️ Карта
                          </span>
                        </div>
                      ))}

                      {!projTasks.length && !connectedCanvasTasks.length && (
                        <p style={{ color: 'var(--muted)', fontSize: '12.5px', margin: 0, textAlign: 'center', padding: '12px' }}>
                          Немає пов'язаних задач. Створіть задачу або з'єднайте нотатки на карті.
                        </p>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="project-section-card">
              <h3>
                <span>💻 Фрагменти коду ({projSnippets.length})</span>
                <button className="btn secondary" style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }} onClick={() => onQuickCreateSnippet(project.id)}>
                  <Plus size={12} /> Створити код
                </button>
              </h3>

              <div style={{ display: 'grid', gap: '8px' }}>
                {projSnippets.map((snip) => (
                  <div key={snip.id} className="project-link-item">
                    <span style={{ fontWeight: 500, color: '#ffffff' }}>{snip.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', background: '#18181b', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      {snip.language}
                    </span>
                  </div>
                ))}
                {!projSnippets.length && (
                  <p style={{ color: 'var(--muted)', fontSize: '12.5px', margin: 0, textAlign: 'center', padding: '12px' }}>
                    Немає пов'язаного коду. Збережіть корисні фрагменти для цього проєкту.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="project-side-meta">
            <div className="project-section-card">
              <h3>Ресурси</h3>
              <div className="project-links-list">
                {project.repo_url && (
                  <div className="project-link-item">
                    <a href={project.repo_url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px' }}>
                      🐙 Репозиторій
                    </a>
                    <ExternalLink size={12} className="muted" />
                  </div>
                )}
                {project.prod_url && (
                  <div className="project-link-item">
                    <a href={project.prod_url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px' }}>
                      🚀 Деплой / Продакшн
                    </a>
                    <ExternalLink size={12} className="muted" />
                  </div>
                )}

                {project.links.map((link, idx) => (
                  <div className="project-link-item" key={idx}>
                    <a href={link.url} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px' }}>
                      🔗 {link.name}
                    </a>
                    <ExternalLink size={12} className="muted" />
                  </div>
                ))}

                {!project.repo_url && !project.prod_url && !project.links.length && (
                  <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
                    Посилання на ресурси відсутні.
                  </p>
                )}
              </div>
            </div>

            <div className="project-section-card">
              <h3>Файли проєкту</h3>
              <AttachmentList attachments={project.attachments} onDelete={onDeleteAttachment} />
              {!project.attachments.length && (
                <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
                  Немає прикріплених файлів.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginTop: '16px' }}>
          {/* Canvas Container */}
          <div
            className="canvas-container"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div className="canvas-toolbar">
              <button
                type="button"
                className="btn secondary"
                style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                onClick={handleAddTextNode}
              >
                <Plus size={14} /> Нотатка
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                  onClick={() => {
                    setShowTaskDropdown(!showTaskDropdown)
                    setShowSnippetDropdown(false)
                  }}
                >
                  <Plus size={14} /> Задача
                </button>
                {showTaskDropdown && (
                  <>
                    <div className="dropdown-overlay-transparent" onClick={() => setShowTaskDropdown(false)} />
                    <div className="canvas-dropdown-menu">
                      <div className="dropdown-header">Задачі проєкту</div>
                      {tasks.filter((t) => t.projectId === project.id).length > 0 ? (
                        tasks
                          .filter((t) => t.projectId === project.id)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleAddTaskNode(t.id)}
                            >
                              <span className="task-dot" style={{ background: t.color, margin: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                            </button>
                          ))
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                          Немає задач у проєкті
                        </div>
                      )}
                      
                      <div className="dropdown-header">Інші задачі</div>
                      {tasks.filter((t) => t.projectId !== project.id).length > 0 ? (
                        tasks
                          .filter((t) => t.projectId !== project.id)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleAddTaskNode(t.id)}
                            >
                              <span className="task-dot" style={{ background: t.color, margin: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                            </button>
                          ))
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                          Немає інших задач
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                  onClick={() => {
                    setShowSnippetDropdown(!showSnippetDropdown)
                    setShowTaskDropdown(false)
                  }}
                >
                  <Plus size={14} /> Код
                </button>
                {showSnippetDropdown && (
                  <>
                    <div className="dropdown-overlay-transparent" onClick={() => setShowSnippetDropdown(false)} />
                    <div className="canvas-dropdown-menu">
                      <div className="dropdown-header">Код проєкту</div>
                      {snippets.filter((s) => s.projectId === project.id).length > 0 ? (
                        snippets
                          .filter((s) => s.projectId === project.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleAddSnippetNode(s.id)}
                            >
                              <Code2 size={12} style={{ color: 'var(--pink)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                            </button>
                          ))
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                          Немає коду у проєкті
                        </div>
                      )}

                      <div className="dropdown-header">Інші фрагменти</div>
                      {snippets.filter((s) => s.projectId !== project.id).length > 0 ? (
                        snippets
                          .filter((s) => s.projectId !== project.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => handleAddSnippetNode(s.id)}
                            >
                              <Code2 size={12} style={{ color: 'var(--pink)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                            </button>
                          ))
                      ) : (
                        <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                          Немає інших фрагментів
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                className={`btn secondary ${isConnecting ? 'primary' : ''}`}
                style={{ minHeight: '30px', padding: '0 8px', fontSize: '12px' }}
                onClick={handleStartConnection}
              >
                🔗 З'єднати
              </button>
            </div>

            <div className="canvas-viewport-bg" />

            <div
              style={{
                position: 'absolute',
                width: '5000px',
                height: '5000px',
                transform: `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasScale})`,
                transformOrigin: '0 0',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <svg
                className="canvas-svg"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '5000px',
                  height: '5000px',
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a855f7" />
                  </marker>
                </defs>
              {edges.map((edge, idx) => {
                const fromNode = nodes.find((n) => n.id === edge.from)
                const toNode = nodes.find((n) => n.id === edge.to)
                if (!fromNode || !toNode) return null

                const dimFrom = getNodeDimensions(fromNode)
                const dimTo = getNodeDimensions(toNode)
                const { p1, p2, orientation } = getConnectionPoints(
                  fromNode.x,
                  fromNode.y,
                  dimFrom.w,
                  dimFrom.h,
                  toNode.x,
                  toNode.y,
                  dimTo.w,
                  dimTo.h
                )
                const path = getBezierPath(p1, p2, orientation)

                return (
                  <g key={idx}>
                    <path
                      d={path}
                      fill="none"
                      stroke="var(--pink)"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                      style={{ opacity: 0.8 }}
                    />
                    <foreignObject
                      x={(p1.x + p2.x) / 2 - 14}
                      y={(p1.y + p2.y) / 2 - 14}
                      width="28"
                      height="28"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteEdge(edge.from, edge.to)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#27272a',
                          border: '1px solid var(--border)',
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title="Видалити зв'язок"
                      >
                        ✕
                      </button>
                    </foreignObject>
                  </g>
                )
              })}
            </svg>

            {nodes.map((node) => {
              const task = node.taskId ? tasks.find((t) => t.id === node.taskId) : null
              const snippet = node.snippetId ? snippets.find((s) => s.id === node.snippetId) : null
              const isCompleted = node.type === 'task' ? (task ? task.status === 'done' : false) : !!node.isCompleted
              const taskColor = task ? task.color : '#a855f7'
              const dims = getNodeDimensions(node)

              return (
                <div
                  key={node.id}
                  className={`canvas-node ${node.type}-node ${selectedNodeId === node.id ? 'selected' : ''} ${draggingNodeId === node.id ? 'dragging' : ''} ${isCompleted ? 'completed' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: `${dims.w}px`,
                    height: `${dims.h}px`,
                    pointerEvents: 'auto',
                    ...(node.type === 'task' ? { '--task-color': taskColor } as React.CSSProperties : {}),
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    if (isConnecting) {
                      e.stopPropagation()
                      if (!connectingFromId) {
                        setConnectingFromId(node.id)
                      } else if (connectingFromId !== node.id) {
                        const edgeExists = edges.some((edge) => edge.from === connectingFromId && edge.to === node.id)
                        if (!edgeExists) {
                          const newEdges = [...edges, { from: connectingFromId, to: node.id }]
                          setEdges(newEdges)
                          void autoSaveCanvas(nodes, newEdges)
                        }
                        setConnectingFromId(null)
                        setIsConnecting(false)
                      }
                    }
                  }}
                >
                  <div className="canvas-node-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                      <button
                        type="button"
                        className={`task-node-checkbox ${isCompleted ? 'checked' : ''}`}
                        onClick={async (e) => {
                          e.stopPropagation()
                          await handleToggleNodeCompleted(node.id)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {isCompleted && <Check size={10} />}
                      </button>
                      <div
                        className="canvas-node-title"
                        style={{
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.6 : 1,
                          color: node.type === 'text' && !node.title ? 'var(--muted)' : '#ffffff'
                        }}
                      >
                        {node.type === 'task' ? (
                          task ? task.title : '⚠️ Задача видалена'
                        ) : node.type === 'snippet' ? (
                          snippet ? snippet.title : '⚠️ Код видалено'
                        ) : (
                          node.title || 'Нова нотатка'
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isConnecting && connectingFromId === node.id ? 'var(--danger)' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                  <div className="canvas-node-content">
                    {node.type === 'task' ? (
                      task ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
                          <div style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', gap: '6px' }}>
                            <span style={{ color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--pink-strong)' : 'var(--muted)', fontWeight: 600 }}>
                              {priorityLabels[task.priority]}
                            </span>
                            {task.dueDate && <span>До {formatShortDate(task.dueDate)}</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.description || 'Без опису...'}
                          </div>
                          {task.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', overflow: 'hidden', maxHeight: '18px' }}>
                              {task.tags.slice(0, 2).map((tag) => (
                                <span className="tag" key={tag} style={{ fontSize: '9px', padding: '0 4px', minHeight: '16px' }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>Пов'язана задача більше не існує.</span>
                      )
                    ) : node.type === 'snippet' ? (
                      snippet ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="tech-pill" style={{ fontSize: '9px', padding: '1px 4px' }}>{snippet.language}</span>
                            <span style={{ fontSize: '9px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                              {snippet.tags.slice(0, 2).join(', ')}
                            </span>
                          </div>
                          <pre className="canvas-code-preview">{snippet.code}</pre>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>Пов'язаний код більше не існує.</span>
                      )
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <span style={{ color: node.text ? 'var(--text)' : 'var(--muted)' }}>
                          {node.text ? (node.text.length > 80 ? node.text.substring(0, 77) + '...' : node.text) : 'Опис нотатки...'}
                        </span>
                        
                        {node.imageUrl && (
                          <div className="canvas-node-image" style={{ marginTop: '6px', maxHeight: '55px', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            <img src={node.imageUrl} alt={node.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                          </div>
                        )}

                        {node.linkUrl && (
                          <div style={{ marginTop: '4px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span>🔗</span>
                            <a
                              href={node.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--pink)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              {node.linkLabel || node.linkUrl}
                            </a>
                          </div>
                        )}

                        {node.fileId && (() => {
                          const att = project.attachments.find((a) => a.id === node.fileId)
                          if (!att) return null
                          return (
                            <div style={{ marginTop: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#27272a', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', color: 'var(--muted)' }} title={att.originalName}>
                                📎 {att.originalName}
                              </span>
                              <a
                                href={`${API_BASE}/uploads/${att.storedName}`}
                                download={att.originalName}
                                style={{ color: 'var(--pink)', fontWeight: 600, flexShrink: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                Зав.
                              </a>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            </div>

            {/* Floating Zoom Controls at Bottom-Right */}
            <div className="canvas-zoom-controls">
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={handleFitCanvasView}
                title="Вмістити на екрані"
              >
                <Maximize2 size={14} />
              </button>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={() => setCanvasScale((s) => Math.min(4.0, s + 0.1))}
                title="Збільшити масштаб"
              >
                <Plus size={14} />
              </button>
              <span className="canvas-zoom-badge">{Math.round(canvasScale * 100)}%</span>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={() => setCanvasScale((s) => Math.max(0.1, s - 0.1))}
                title="Зменшити масштаб"
              >
                <Minus size={14} />
              </button>
            </div>

            <div className="canvas-instructions">
              {isConnecting ? (
                <span style={{ color: 'var(--pink-strong)' }}>
                  {connectingFromId ? 'Оберіть ЦІЛЬОВИЙ вузол для з\'єднання' : 'Оберіть ПОЧАТКОВИЙ вузол для з\'єднання'}
                </span>
              ) : (
                <span>Перетягуйте вузли. Клікніть на вузол для редагування.</span>
              )}
            </div>
          </div>

          {/* Inspector Panel */}
          <div className="project-section-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              Інспектор вузлів
            </h3>
            {selectedNodeId ? (
              (() => {
                const node = nodes.find((n) => n.id === selectedNodeId)
                if (!node) return null

                if (node.type === 'task') {
                  const task = tasks.find((t) => t.id === node.taskId)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Тип: Задача (Зовнішній зв'язок)
                      </div>
                      {task ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Назва задачі</label>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', background: '#09090b', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              {task.title}
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Статус</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="task-dot" style={{ background: task.color }} />
                              <span style={{ fontSize: '13px' }}>{statusLabels[task.status]}</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Пріоритет</label>
                            <div style={{ fontSize: '13px' }}>{priorityLabels[task.priority]}</div>
                          </div>
                          {task.description && (
                            <div className="form-group">
                              <label className="form-label">Опис</label>
                              <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', background: '#09090b', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                {task.description}
                              </div>
                            </div>
                          )}
                          <button
                            className="btn secondary"
                            type="button"
                            style={{ marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                            onClick={() => {
                              setSection('tasks')
                              openEditTask(task)
                            }}
                          >
                            ✏️ Редагувати задачу
                          </button>
                        </>
                      ) : (
                        <div style={{ color: 'var(--danger)', fontSize: '13px' }}>
                          Пов'язана задача не знайдена (можливо, видалена).
                        </div>
                      )}
                      <button
                        className="btn secondary"
                        type="button"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                        onClick={() => handleDeleteNode(selectedNodeId)}
                      >
                        <Trash2 size={14} /> Прибрати з карти
                      </button>
                    </div>
                  )
                }

                if (node.type === 'snippet') {
                  const snippet = snippets.find((s) => s.id === node.snippetId)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Тип: Фрагмент коду (Зовнішній зв'язок)
                      </div>
                      {snippet ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Назва коду</label>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', background: '#09090b', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              {snippet.title}
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Мова програмування</label>
                            <div>
                              <span className="tech-pill">{snippet.language}</span>
                            </div>
                          </div>
                          {snippet.explanation && (
                            <div className="form-group">
                              <label className="form-label">Пояснення</label>
                              <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', background: '#09090b', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                {snippet.explanation}
                              </div>
                            </div>
                          )}
                          <button
                            className="btn secondary"
                            type="button"
                            style={{ marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                            onClick={() => {
                              setSection('vault')
                              setSnippetSelection(snippet.id)
                            }}
                          >
                            ✏️ Відкрити в сховищі
                          </button>
                        </>
                      ) : (
                        <div style={{ color: 'var(--danger)', fontSize: '13px' }}>
                          Пов'язаний код не знайдено (можливо, видалено).
                        </div>
                      )}
                      <button
                        className="btn secondary"
                        type="button"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                        onClick={() => handleDeleteNode(selectedNodeId)}
                      >
                        <Trash2 size={14} /> Прибрати з карти
                      </button>
                    </div>
                  )
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Тип: Нотатка (Власна картка)
                    </div>
                    <div className="form-group">
                      <label className="form-label">Назва нотатки</label>
                      <input
                        type="text"
                        className="form-control"
                        value={node.title}
                        placeholder="Нова нотатка"
                        onChange={(e) => handleUpdateNodeDetails(selectedNodeId, e.target.value, node.text)}
                        onBlur={handleNodeBlur}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Вміст нотатки</label>
                      <textarea
                        className="form-control"
                        style={{ height: '100px', resize: 'vertical' }}
                        value={node.text}
                        placeholder="Опис нотатки..."
                        onChange={(e) => handleUpdateNodeDetails(selectedNodeId, node.title, e.target.value)}
                        onBlur={handleNodeBlur}
                      />
                    </div>

                    {/* PHOTO ATTACHMENT */}
                    <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <label className="form-label">Фотографія картки</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={node.imageUrl || ''}
                          placeholder="Вставте URL фото..."
                          onChange={(e) => {
                            const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, imageUrl: e.target.value } : n)
                            setNodes(updated)
                          }}
                          onBlur={handleNodeBlur}
                          style={{ flex: 1 }}
                        />
                        <label className="btn secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', padding: 0, flexShrink: 0 }} title="Завантажити з ПК">
                          <Upload size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  const att = await uploadAttachment('project', project.id, file)
                                  const imageUrl = `${API_BASE}/uploads/${att.storedName}`
                                  const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, imageUrl } : n)
                                  setNodes(updated)
                                  await autoSaveCanvas(updated, edges)
                                  if (onRefreshData) {
                                    await onRefreshData()
                                  }
                                } catch (err) {
                                  console.error("Failed to upload image:", err)
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                      {node.imageUrl && (
                        <button
                          type="button"
                          className="btn secondary compact"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '10px', padding: '2px 6px', minHeight: 'auto' }}
                          onClick={() => {
                            const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, imageUrl: undefined } : n)
                            setNodes(updated)
                            void autoSaveCanvas(updated, edges)
                          }}
                        >
                          Прибрати photo
                        </button>
                      )}
                    </div>

                    {/* HYPERLINK ATTACHMENT */}
                    <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <label className="form-label">Гіперпосилання</label>
                      <input
                        type="text"
                        className="form-control"
                        value={node.linkUrl || ''}
                        placeholder="https://..."
                        onChange={(e) => {
                          const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, linkUrl: e.target.value } : n)
                          setNodes(updated)
                        }}
                        onBlur={handleNodeBlur}
                        style={{ marginBottom: '6px' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={node.linkLabel || ''}
                        placeholder="Назва посилання..."
                        onChange={(e) => {
                          const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, linkLabel: e.target.value } : n)
                          setNodes(updated)
                        }}
                        onBlur={handleNodeBlur}
                        style={{ marginBottom: '6px' }}
                      />
                      {(node.linkUrl || node.linkLabel) && (
                        <button
                          type="button"
                          className="btn secondary compact"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '10px', padding: '2px 6px', minHeight: 'auto' }}
                          onClick={() => {
                            const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, linkUrl: undefined, linkLabel: undefined } : n)
                            setNodes(updated)
                            void autoSaveCanvas(updated, edges)
                          }}
                        >
                          Видалити посилання
                        </button>
                      )}
                    </div>

                    {/* FILE ATTACHMENT */}
                    <div className="form-group" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginBottom: '8px' }}>
                      <label className="form-label">Прикріплений файл проєкту</label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <select
                           className="form-control"
                           value={node.fileId || ''}
                           onChange={(e) => {
                             const val = e.target.value ? Number(e.target.value) : undefined
                             const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, fileId: val } : n)
                             setNodes(updated)
                             void autoSaveCanvas(updated, edges)
                           }}
                           style={{ flex: 1 }}
                        >
                          <option value="">-- Оберіть файл --</option>
                          {project.attachments.map((att) => (
                            <option key={att.id} value={att.id}>
                              {att.originalName}
                            </option>
                          ))}
                        </select>
                        <label className="btn secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', padding: 0, flexShrink: 0 }} title="Завантажити новий файл до проєкту">
                          <Upload size={14} />
                          <input
                            type="file"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                try {
                                  const att = await uploadAttachment('project', project.id, file)
                                  const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, fileId: att.id } : n)
                                  setNodes(updated)
                                  await autoSaveCanvas(updated, edges)
                                  if (onRefreshData) {
                                    await onRefreshData()
                                  }
                                } catch (err) {
                                  console.error("Failed to upload attachment:", err)
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                      {node.fileId && (
                        <button
                          type="button"
                          className="btn secondary compact"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: '10px', padding: '2px 6px', minHeight: 'auto' }}
                          onClick={() => {
                            const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, fileId: undefined } : n)
                            setNodes(updated)
                            void autoSaveCanvas(updated, edges)
                          }}
                        >
                          Відв'язати файл
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <input
                        type="checkbox"
                        id="inspector-project-node-completed"
                        className="node-checkbox"
                        checked={!!node.isCompleted}
                        onChange={(e) => {
                          const updated = nodes.map((n) => n.id === selectedNodeId ? { ...n, isCompleted: e.target.checked } : n)
                          setNodes(updated)
                          void autoSaveCanvas(updated, edges)
                        }}
                        style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                      />
                      <label htmlFor="inspector-project-node-completed" style={{ fontSize: '12.5px', cursor: 'pointer', userSelect: 'none', margin: 0, color: 'var(--text)' }}>
                        Позначити задачу як виконану
                      </label>
                    </div>
                    <button
                      className="btn secondary"
                      type="button"
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                      onClick={() => handleDeleteNode(selectedNodeId)}
                    >
                      <Trash2 size={14} /> Видалити вузол
                    </button>
                  </div>
                )
              })()
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', margin: 'auto 0' }}>
                Оберіть вузол на карті, щоб редагувати його властивості.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
