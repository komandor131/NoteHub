import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Maximize2,
  Minimize2,
  ExternalLink,
  FileText,
  Check,
  BookOpen,
  X,
  GitBranch,
} from 'lucide-react'
import type { Roadmap, RoadmapPayload, RoadmapsPanelProps } from '../../types'
import { getConnectionPoints, getBezierPath } from '../../canvasUtils'
import MathContent from '../MathContent/MathContent'
import styles from './RoadmapsPanel.module.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function RoadmapsPanel({
  roadmaps,
  selectedRoadmapId,
  onSelectRoadmap,
  onCreateRoadmap,
  onEditRoadmap,
  onDeleteRoadmap,
  onSaveCanvas,
}: RoadmapsPanelProps) {
  const roadmap = roadmaps.find((r) => r.id === selectedRoadmapId) ?? null

  const [nodes, setNodes] = useState<Array<{
    id: string
    x: number
    y: number
    type: 'text'
    title: string
    text: string
    linkUrl?: string
    linkLabel?: string
    isCompleted?: boolean
  }>>([])
  const [edges, setEdges] = useState<Array<{ from: string; to: string }>>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeNotes, setActiveNotes] = useState<string | null>(null)
  const [activeNotesTitle, setActiveNotesTitle] = useState<string>('')
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
        setActiveNotes(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenNotes = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setActiveNotesTitle(node.title || 'Конспект')
    setIsLoadingNotes(true)
    try {
      const res = await fetch(`${API_BASE}/api/roadmaps/notes/${nodeId}`)
      const data = await res.json()
      if (data && data.notes) {
        setActiveNotes(data.notes)
      } else {
        setActiveNotes('Для цього кроку конспект ще не створено.')
      }
    } catch (err) {
      setActiveNotes('Помилка завантаження конспекту. Перевірте з\'єднання з сервером.')
    } finally {
      setIsLoadingNotes(false)
    }
  }

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

  // Node input editing states
  const [nodeTitle, setNodeTitle] = useState('')
  const [nodeText, setNodeText] = useState('')
  const [nodeLinkUrl, setNodeLinkUrl] = useState('')
  const [nodeLinkLabel, setNodeLinkLabel] = useState('')

  const nodeWidth = 260
  const nodeHeight = 130

  // Sync canvas with active roadmap
  useEffect(() => {
    if (roadmap) {
      if (roadmap.canvas_data) {
        try {
          const parsed = JSON.parse(roadmap.canvas_data)
          setNodes(parsed.nodes || [])
          setEdges(parsed.edges || [])
        } catch (e) {
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
    } else {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
    }
  }, [roadmap?.id])

  // Sync selected node fields to state
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find((n) => n.id === selectedNodeId)
      if (node) {
        setNodeTitle(node.title || '')
        setNodeText(node.text || '')
        setNodeLinkUrl(node.linkUrl || '')
        setNodeLinkLabel(node.linkLabel || '')
      }
    }
  }, [selectedNodeId, nodes])

  const autoSaveCanvas = async (updatedNodes: typeof nodes, updatedEdges: typeof edges) => {
    if (!roadmap) return
    const payload = JSON.stringify({ nodes: updatedNodes, edges: updatedEdges })
    await onSaveCanvas(roadmap.id, payload)
  }

  const handleAddNode = () => {
    if (!roadmap) return
    const newId = `node_${Date.now()}`
    const newNode = {
      id: newId,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      type: 'text' as const,
      title: 'Новий крок',
      text: 'Опис цього кроку навчання...',
      isCompleted: false,
    }
    const updatedNodes = [...nodes, newNode]
    setNodes(updatedNodes)
    setSelectedNodeId(newId)
    void autoSaveCanvas(updatedNodes, edges)
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

  const handleUpdateNode = () => {
    if (!selectedNodeId) return
    const updated = nodes.map((n) =>
      n.id === selectedNodeId
        ? {
            ...n,
            title: nodeTitle,
            text: nodeText,
            linkUrl: nodeLinkUrl,
            linkLabel: nodeLinkLabel,
          }
        : n
    )
    setNodes(updated)
    void autoSaveCanvas(updated, edges)
  }

  const handleToggleNodeCompleted = (nodeId: string) => {
    const updated = nodes.map((n) =>
      n.id === nodeId ? { ...n, isCompleted: !n.isCompleted } : n
    )
    setNodes(updated)
    void autoSaveCanvas(updated, edges)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('.canvas-viewport-bg') ||
      target.tagName === 'svg' ||
      target.classList.contains('canvas-container')
    ) {
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
      nodeX: node.x,
      nodeY: node.y,
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
      void autoSaveCanvas(nodes, edges)
      setDraggingNodeId(null)
    }
  }

  const handleNodeClick = (nodeId: string) => {
    if (isConnecting && connectingFromId) {
      if (connectingFromId !== nodeId) {
        const edgeExists = edges.some((edge) => edge.from === connectingFromId && edge.to === nodeId)
        if (!edgeExists) {
          const newEdges = [...edges, { from: connectingFromId, to: nodeId }]
          setEdges(newEdges)
          void autoSaveCanvas(nodes, newEdges)
        }
      }
      setConnectingFromId(null)
      setIsConnecting(false)
    } else {
      setSelectedNodeId(nodeId)
    }
  }

  const handleDeleteEdge = (fromId: string, toId: string) => {
    const updated = edges.filter((e) => !(e.from === fromId && e.to === toId))
    setEdges(updated)
    void autoSaveCanvas(nodes, updated)
  }

  const connections = useMemo(() => {
    const list: Array<{ id: string; from: string; to: string; path: string; isSelected: boolean }> = []
    edges.forEach((edge) => {
      const parent = nodes.find((n) => n.id === edge.from)
      const child = nodes.find((n) => n.id === edge.to)
      if (
        parent &&
        child &&
        parent.x !== undefined &&
        parent.y !== undefined &&
        child.x !== undefined &&
        child.y !== undefined
      ) {
        const { p1, p2, orientation } = getConnectionPoints(
          parent.x,
          parent.y,
          nodeWidth,
          nodeHeight,
          child.x,
          child.y,
          nodeWidth,
          nodeHeight
        )
        const path = getBezierPath(p1, p2, orientation)
        const isSelected = selectedNodeId === parent.id || selectedNodeId === child.id
        list.push({
          id: `${edge.from}-${edge.to}`,
          from: edge.from,
          to: edge.to,
          path,
          isSelected,
        })
      }
    })
    return list
  }, [edges, nodes, selectedNodeId])

  if (!roadmap) {
    return (
      <div className={`projects-grid-wrapper ${styles.roadmapsPanel}`}>
        <div className="panel" style={{ borderBottom: 0, borderRadius: '12px 12px 0 0' }}>
          <div className="panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <p className="kicker">Карти розвитку</p>
              <h2>Навчальні роадмапи ({roadmaps.length})</h2>
            </div>
            <button className="btn primary" type="button" onClick={onCreateRoadmap}>
              <Plus size={16} />
              Новий роадмап
            </button>
          </div>
        </div>

        <div className="projects-grid">
          {roadmaps.map((rm) => {
            let totalSteps = 0
            let completedSteps = 0
            try {
              const canvas = JSON.parse(rm.canvas_data || '{}')
              const canvasNodes = canvas.nodes || []
              totalSteps = canvasNodes.length
              completedSteps = canvasNodes.filter((n: any) => !!n.isCompleted).length
            } catch (e) {
              // ignore
            }
            const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

            return (
              <article
                className="project-card"
                key={rm.id}
                onClick={() => onSelectRoadmap(rm.id)}
                style={{
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}
              >
                <div>
                  <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <h3 className="project-card-title" style={{ margin: 0 }}>{rm.title}</h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="icon-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditRoadmap(rm)
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <FileText size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void onDeleteRoadmap(rm)
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="project-card-desc">{rm.description || 'Опис роадмапу відсутній.'}</p>
                </div>

                <div className="project-card-footer">
                  <div className="project-card-stats">
                    <span>Кроки: {completedSteps}/{totalSteps} ({progressPercent}%)</span>
                  </div>
                  <div className="project-progress-bar">
                    <div className="project-progress-fill" style={{ width: `${progressPercent}%`, background: 'var(--pink)' }} />
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
            onClick={onCreateRoadmap}
          >
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <Plus size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
              <strong>Створити роадмап</strong>
            </div>
          </article>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`project-workspace ${styles.roadmapsPanel}`}
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#09090b',
        margin: 0,
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      } : undefined}
    >
      <div className="panel project-workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="project-workspace-back"
          onClick={() => onSelectRoadmap(null)}
        >
          <ChevronLeft size={16} />
          Назад до всіх роадмапів
        </button>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' }}>🗺️ {roadmap.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn secondary" onClick={() => onEditRoadmap(roadmap)}>
            Редагувати опис
          </button>
          <button
            className="btn secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isFullscreen ? 'Згорнути' : 'На весь екран'}
          </button>
        </div>
      </div>

      <div
        style={isFullscreen ? {
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '20px',
          marginTop: '16px',
          flex: 1,
          minHeight: 0
        } : {
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '20px',
          marginTop: '16px'
        }}
      >
        {/* Canvas Area */}
        <div
          className="canvas-container"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={isFullscreen ? { height: '100%', minHeight: 'auto' } : undefined}
        >
          <div className="canvas-toolbar">
            <button
              type="button"
              className="btn secondary"
              style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px' }}
              onClick={handleAddNode}
            >
              <Plus size={14} style={{ marginRight: '4px' }} /> Додати крок
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', borderColor: isConnecting ? 'var(--pink)' : undefined }}
              onClick={() => {
                if (selectedNodeId) {
                  setIsConnecting(true)
                  setConnectingFromId(selectedNodeId)
                } else {
                  alert('Оберіть вузол для створення зв\'язку')
                }
              }}
            >
              <GitBranch size={14} style={{ marginRight: '4px' }} /> З'єднати крок
            </button>
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn secondary"
                style={{ width: '30px', height: '30px', minWidth: 0, padding: 0 }}
                onClick={() => setCanvasScale((s) => Math.max(0.4, s - 0.1))}
              >
                -
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ width: '30px', height: '30px', minWidth: 0, padding: 0 }}
                onClick={() => setCanvasScale(1)}
              >
                100%
              </button>
              <button
                type="button"
                className="btn secondary"
                style={{ width: '30px', height: '30px', minWidth: 0, padding: 0 }}
                onClick={() => setCanvasScale((s) => Math.min(2, s + 0.1))}
              >
                +
              </button>
            </div>
          </div>

          {isConnecting && (
            <div
              style={{
                position: 'absolute',
                top: '60px',
                left: '20px',
                zIndex: 10,
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Оберіть крок, з яким з'єднати</span>
              <button
                className="btn secondary compact"
                onClick={() => {
                  setIsConnecting(false)
                  setConnectingFromId(null)
                }}
                style={{ padding: '2px 6px', fontSize: '11px', minHeight: 0 }}
              >
                Скасувати
              </button>
            </div>
          )}

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
            {/* SVG Lines */}
            <svg
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
                  id="arrowhead-roadmap"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3f3f46" />
                </marker>
                <marker
                  id="arrowhead-roadmap-selected"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--pink)" />
                </marker>
              </defs>
              {connections.map((conn) => (
                <g key={conn.id}>
                  <path
                    d={conn.path}
                    stroke={conn.isSelected ? 'var(--pink)' : '#3f3f46'}
                    strokeWidth={conn.isSelected ? 3 : 2}
                    fill="none"
                    markerEnd={conn.isSelected ? 'url(#arrowhead-roadmap-selected)' : 'url(#arrowhead-roadmap)'}
                    style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease', pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Видалити зв\'язок між цими кроками?')) {
                        handleDeleteEdge(conn.from, conn.to)
                      }
                    }}
                  />
                </g>
              ))}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id
              const isCompleted = !!node.isCompleted

              return (
                <div
                  key={node.id}
                  className={`mindmap-node ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${nodeWidth}px`,
                    height: `${nodeHeight}px`,
                    pointerEvents: 'auto',
                    border: isSelected ? '2px solid var(--pink)' : '1px solid var(--border)',
                    boxShadow: isSelected ? '0 0 12px rgba(236, 72, 153, 0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--panel-bg)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNodeClick(node.id)
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%', overflow: 'hidden' }}>
                    <button
                      type="button"
                      className={`task-node-checkbox ${isCompleted ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleNodeCompleted(node.id)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {isCompleted && <Check size={10} />}
                    </button>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '13.5px',
                          fontWeight: 600,
                          color: '#ffffff',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.6 : 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {node.title || 'Без назви'}
                      </h4>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '11.5px',
                          color: 'var(--muted)',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {node.text}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    {node.linkUrl ? (
                      <a
                        href={node.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '11px',
                          color: 'var(--pink)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          textDecoration: 'none',
                          fontWeight: 500,
                          pointerEvents: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={10} />
                        <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {node.linkLabel || 'Ресурс'}
                        </span>
                      </a>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className="project-side-meta"
          style={isFullscreen ? {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            height: '100%',
            overflowY: 'auto'
          } : {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div className="project-section-card" style={{ padding: '16px' }}>
            <h3>Інспектор вузла</h3>
            {selectedNodeId ? (
              (() => {
                const node = nodes.find((n) => n.id === selectedNodeId)
                if (!node) return <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Вузол не знайдено</p>
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11.5px' }}>Назва кроку</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nodeTitle}
                        onChange={(e) => setNodeTitle(e.target.value)}
                        onBlur={handleUpdateNode}
                        style={{ background: '#09090b', border: '1px solid var(--border)', color: '#fff', fontSize: '13px', padding: '6px 10px', width: '100%', borderRadius: '6px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11.5px' }}>Опис кроку</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={nodeText}
                        onChange={(e) => setNodeText(e.target.value)}
                        onBlur={handleUpdateNode}
                        style={{ background: '#09090b', border: '1px solid var(--border)', color: '#fff', fontSize: '13px', padding: '6px 10px', width: '100%', borderRadius: '6px', resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11.5px' }}>Посилання на ресурс</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nodeLinkUrl}
                        onChange={(e) => setNodeLinkUrl(e.target.value)}
                        onBlur={handleUpdateNode}
                        placeholder="https://..."
                        style={{ background: '#09090b', border: '1px solid var(--border)', color: '#fff', fontSize: '13px', padding: '6px 10px', width: '100%', borderRadius: '6px' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11.5px' }}>Текст посилання</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nodeLinkLabel}
                        onChange={(e) => setNodeLinkLabel(e.target.value)}
                        onBlur={handleUpdateNode}
                        placeholder="Наприклад: Khan Academy"
                        style={{ background: '#09090b', border: '1px solid var(--border)', color: '#fff', fontSize: '13px', padding: '6px 10px', width: '100%', borderRadius: '6px' }}
                      />
                    </div>
                    {selectedNodeId && (
                      <button
                        type="button"
                        className="btn primary"
                        style={{ marginTop: '8px', minHeight: '32px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}
                        onClick={() => void handleOpenNotes(selectedNodeId)}
                      >
                        <BookOpen size={13} /> Читати конспект
                      </button>
                    )}
                    <button
                      className="btn secondary"
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)', marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
                      onClick={() => {
                        if (window.confirm('Видалити цей крок з карти?')) {
                          handleDeleteNode(selectedNodeId)
                        }
                      }}
                    >
                      <Trash2 size={12} style={{ marginRight: '6px' }} /> Видалити крок
                    </button>
                  </div>
                )
              })()
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '12.5px', margin: '12px 0 0', textAlign: 'center' }}>
                Оберіть крок на карті, щоб відредагувати його деталі або додати ресурси.
              </p>
            )}
          </div>
        </div>
      </div>

      {activeNotes !== null && (
        <div className="modal-backdrop" onClick={() => setActiveNotes(null)} style={{ zIndex: 10000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '650px',
              maxWidth: '95vw',
              height: '100%',
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#0c0c0e',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
          >
            <div className="drawer-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="kicker" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: 'var(--pink)', letterSpacing: '1.2px', fontWeight: 600 }}>Навчальний конспект</p>
                <h2 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600, color: '#ffffff', lineHeight: '1.4' }}>{activeNotesTitle}</h2>
              </div>
              <button className="icon-btn" onClick={() => setActiveNotes(null)} aria-label="Close notes" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body" style={{ padding: '24px 20px', flex: 1, overflowY: 'auto', background: '#09090b' }}>
              {isLoadingNotes ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  <span>Завантаження конспекту...</span>
                </div>
              ) : (
                <MathContent content={activeNotes} />
              )}
            </div>
            <div className="drawer-actions" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#0c0c0e' }}>
              <button className="btn secondary" style={{ width: '100%' }} onClick={() => setActiveNotes(null)}>
                Закрити конспект
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function RoadmapDrawer({
  open,
  roadmap,
  onClose,
  onSubmit,
}: {
  open: boolean
  roadmap: Roadmap | null
  onClose: () => void
  onSubmit: (payload: RoadmapPayload) => Promise<void>
}) {
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
