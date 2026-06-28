import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Maximize2,
  Minus,
  Upload,
  ExternalLink,
  FileText,
  ListChecks,
  Code2,
  Repeat,
  GitBranch,
  X,
} from 'lucide-react'
import type {
  MindMap,
  Task,
  Snippet,
  MindMapNode,
  TaskStatus,
  Section,
  MindMapsPanelProps,
} from '../../types'
import { updateMindMap, updateTask, uploadAttachment } from '../../api'
import { getConnectionPoints, getBezierPath, computeInitialLayout } from '../../canvasUtils'
import { formatShortDate } from '../../dateUtils'
import styles from './MindMapsPanel.module.css'

export default function MindMapsPanel({
  mindMaps,
  tasks,
  snippets,
  selectedMindMapId,
  onSelectMindMap,
  onCreateMindMap,
  onDeleteMindMap,
  onSaveMindMap,
  setSection,
  setSnippetSelection,
  openEditTask,
  onRefreshData,
}: MindMapsPanelProps) {
  const mindMap = mindMaps.find((m) => m.id === selectedMindMapId) ?? null
  const [nodes, setNodes] = useState<MindMapNode[]>([])
  const [customLinks, setCustomLinks] = useState<Array<{ fromId: string; toId: string }>>([])

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null)

  // Panning & zooming states
  const [panX, setPanX] = useState(100)
  const [panY, setPanY] = useState(250)
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Node dragging states
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragNodeStart, setDragNodeStart] = useState({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 })

  const [mapTitle, setMapTitle] = useState('')

  // Synchronize state when mind map selection changes
  useEffect(() => {
    if (mindMap) {
      try {
        const parsed = JSON.parse(mindMap.nodes_data)
        let parsedNodes: MindMapNode[] = []
        let parsedLinks: Array<{ fromId: string; toId: string }> = []

        if (Array.isArray(parsed)) {
          parsedNodes = parsed
        } else if (parsed && typeof parsed === 'object') {
          parsedNodes = parsed.nodes || []
          parsedLinks = parsed.links || []
        }

        // Backwards compatibility / initial layout
        const needsLayout = parsedNodes.some((n) => n.x === undefined || n.y === undefined)
        if (needsLayout && parsedNodes.length > 0) {
          const coordsMap = computeInitialLayout(parsedNodes)
          const layoutedNodes = parsedNodes.map((n) => ({
            ...n,
            x: n.x !== undefined ? n.x : coordsMap[n.id]?.x !== undefined ? coordsMap[n.id].x : 0,
            y: n.y !== undefined ? n.y : coordsMap[n.id]?.y !== undefined ? coordsMap[n.id].y : 0,
          }))
          setNodes(layoutedNodes)
          setCustomLinks(parsedLinks)
          void onSaveMindMap(mindMap.id, JSON.stringify({ nodes: layoutedNodes, links: parsedLinks }))
        } else {
          setNodes(parsedNodes)
          setCustomLinks(parsedLinks)
        }
      } catch (e) {
        setNodes([])
        setCustomLinks([])
      }
      setSelectedNodeId(null)
      setLinkingSourceId(null)
      setPanX(100)
      setPanY(250)
      setScale(1)
      setMapTitle(mindMap.title)
    } else {
      setNodes([])
      setCustomLinks([])
      setSelectedNodeId(null)
      setLinkingSourceId(null)
      setMapTitle('')
    }
  }, [selectedMindMapId])

  // Synchronize map title if it updates elsewhere
  useEffect(() => {
    if (mindMap) {
      setMapTitle(mindMap.title)
    }
  }, [mindMap?.title])

  const saveNodesAndLinks = async (
    updatedNodes: MindMapNode[],
    updatedLinks: Array<{ fromId: string; toId: string }>
  ) => {
    setNodes(updatedNodes)
    setCustomLinks(updatedLinks)
    if (mindMap) {
      const payload = {
        nodes: updatedNodes,
        links: updatedLinks,
      }
      await onSaveMindMap(mindMap.id, JSON.stringify(payload))
    }
  }

  const handleTitleBlur = async () => {
    if (mindMap && mapTitle.trim() && mapTitle !== mindMap.title) {
      try {
        await updateMindMap(mindMap.id, {
          title: mapTitle.trim(),
          nodes_data: JSON.stringify({ nodes, links: customLinks }),
        })
        if (onRefreshData) {
          await onRefreshData()
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleToggleTask = async (task: Task, completed: boolean) => {
    const newStatus: TaskStatus = completed ? 'done' : 'todo'
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        type: task.type,
        status: newStatus,
        priority: task.priority,
        startAt: task.startAt,
        endAt: task.endAt,
        dueDate: task.dueDate,
        color: task.color,
        tags: task.tags,
        projectId: task.projectId,
      })
      if (onRefreshData) {
        await onRefreshData()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleImageUpload = async (nodeId: string, file: File) => {
    if (!selectedMindMapId) return
    try {
      const attachment = await uploadAttachment('mindmap', selectedMindMapId, file)
      const imageUrl = `/uploads/${attachment.storedName}`
      const updatedNodes = nodes.map((n) => {
        if (n.id === nodeId) {
          return { ...n, imageUrl }
        }
        return n
      })
      await saveNodesAndLinks(updatedNodes, customLinks)
    } catch (e) {
      console.error("Failed to upload image:", e)
    }
  }

  const handleAddChild = () => {
    if (!selectedNodeId) return
    const parent = nodes.find((n) => n.id === selectedNodeId)
    if (!parent) return

    const newId = `node_${Math.random().toString(36).substring(2, 9)}`
    const newNode: MindMapNode = {
      id: newId,
      parentId: selectedNodeId,
      type: 'text',
      title: '',
      text: '',
      x: (parent.x ?? 0) + 360,
      y: (parent.y ?? 0) + Math.round(Math.random() * 80 - 40),
    }

    const updated = nodes.map((n) => {
      if (n.id === selectedNodeId) {
        return { ...n, isCollapsed: false }
      }
      return n
    })

    void saveNodesAndLinks([...updated, newNode], customLinks)
    setSelectedNodeId(newId)
  }

  const handleDeleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find((n) => n.id === nodeId)
    if (!nodeToDelete || nodeToDelete.parentId === null) return

    const getDescendantIds = (id: string, currentNodes: MindMapNode[]): string[] => {
      const children = currentNodes.filter((n) => n.parentId === id)
      return [id, ...children.flatMap((child) => getDescendantIds(child.id, currentNodes))]
    }

    const idsToDelete = getDescendantIds(nodeId, nodes)
    const updatedNodes = nodes.filter((n) => !idsToDelete.includes(n.id))
    const updatedLinks = customLinks.filter(
      (l) => !idsToDelete.includes(l.fromId) && !idsToDelete.includes(l.toId)
    )

    void saveNodesAndLinks(updatedNodes, updatedLinks)

    if (selectedNodeId && idsToDelete.includes(selectedNodeId)) {
      setSelectedNodeId(null)
    }
  }

  const handleToggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = nodes.map((n) => {
      if (n.id === nodeId) {
        return { ...n, isCollapsed: !n.isCollapsed, visibleLimit: 3 }
      }
      return n
    })
    void saveNodesAndLinks(updated, customLinks)
  }

  const handleExpandMoreChildren = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const parentNode = nodes.find((n) => n.id === parentId)
    if (!parentNode) return
    const currentLimit = parentNode.visibleLimit || 3
    
    const nextLimit = currentLimit + 3
    
    const updated = nodes.map((n) => {
      if (n.id === parentId) {
        return { ...n, visibleLimit: nextLimit }
      }
      return n
    })
    void saveNodesAndLinks(updated, customLinks)
  }

  const handleUpdateNodeForId = (nodeId: string, fields: Partial<MindMapNode>) => {
    const updated = nodes.map((n) => {
      if (n.id === nodeId) {
        return { ...n, ...fields }
      }
      return n
    })
    void saveNodesAndLinks(updated, customLinks)
  }

  const handleUpdateNode = (fields: Partial<MindMapNode>) => {
    if (!selectedNodeId) return
    handleUpdateNodeForId(selectedNodeId, fields)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.mindmap-viewport-bg')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (linkingSourceId) return
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
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x)
      setPanY(e.clientY - dragStart.y)
    } else if (draggingNodeId) {
      const deltaX = (e.clientX - dragNodeStart.mouseX) / scale
      const deltaY = (e.clientY - dragNodeStart.mouseY) / scale
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === draggingNodeId) {
            return {
              ...n,
              x: Math.round(dragNodeStart.nodeX + deltaX),
              y: Math.round(dragNodeStart.nodeY + deltaY),
            }
          }
          return n
        })
      )
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (draggingNodeId) {
      void saveNodesAndLinks(nodes, customLinks)
      setDraggingNodeId(null)
    }
  }

  const handleNodeClick = (nodeId: string) => {
    if (linkingSourceId) {
      if (linkingSourceId === nodeId) return
      const exists = customLinks.some((l) => l.fromId === linkingSourceId && l.toId === nodeId)
      if (!exists) {
        const updatedLinks = [...customLinks, { fromId: linkingSourceId, toId: nodeId }]
        void saveNodesAndLinks(nodes, updatedLinks)
      }
      setLinkingSourceId(null)
    } else {
      setSelectedNodeId(nodeId)
    }
  }

  const handleDeleteLink = (fromId: string, toId: string) => {
    const updatedLinks = customLinks.filter((l) => !(l.fromId === fromId && l.toId === toId))
    void saveNodesAndLinks(nodes, updatedLinks)
  }

  const nodeWidth = 280
  const nodeHeight = 120

  const getVisibleNodes = () => {
    const visibleList: MindMapNode[] = []
    const visitedIds = new Set<string>()
    const root = nodes.find((n) => n.parentId === null)
    if (!root) return []

    const traverse = (nodeId: string) => {
      if (visitedIds.has(nodeId)) return
      visitedIds.add(nodeId)
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return
      
      visibleList.push(node)

      if (!node.isCollapsed) {
        const children = nodes.filter((n) => n.parentId === nodeId)
        const limit = node.visibleLimit || 3
        const visibleChildren = children.slice(0, limit)
        
        visibleChildren.forEach((child) => traverse(child.id))

        if (children.length > limit) {
          const lastVisibleChild = visibleChildren[visibleChildren.length - 1]
          const virtualId = `showmore-${node.id}`
          const virtualNode: MindMapNode = {
            id: virtualId,
            parentId: node.id,
            type: 'showmore' as any,
            title: `Показати ще (+${children.length - limit})`,
            text: '',
            x: lastVisibleChild ? (lastVisibleChild.x ?? (node.x ?? 0) + 360) : (node.x ?? 0) + 360,
            y: lastVisibleChild ? (lastVisibleChild.y ?? (node.y ?? 0)) + 140 : (node.y ?? 0),
          }
          visibleList.push(virtualNode)
        }
      }
    }
    traverse(root.id)
    return visibleList
  }

  const visibleNodes = useMemo(() => getVisibleNodes(), [nodes])

  const connections = useMemo(() => {
    const list: Array<{ id: string; parentId: string; childId: string; path: string; isSelected: boolean; isDashed?: boolean }> = []

    visibleNodes.forEach((node) => {
      if (node.parentId !== null) {
        const parent = nodes.find((n) => n.id === node.parentId)
        if (
          parent &&
          parent.x !== undefined &&
          parent.y !== undefined &&
          node.x !== undefined &&
          node.y !== undefined
        ) {
          const { p1, p2, orientation } = getConnectionPoints(
            parent.x,
            parent.y,
            nodeWidth,
            nodeHeight,
            node.x,
            node.y,
            nodeWidth,
            node.type === ('showmore' as any) ? 50 : nodeHeight
          )
          const path = getBezierPath(p1, p2, orientation)
          const isSelected = selectedNodeId === parent.id || selectedNodeId === node.id
          list.push({
            id: `hierarchy-${parent.id}-${node.id}`,
            parentId: parent.id,
            childId: node.id,
            path,
            isSelected,
            isDashed: node.type === ('showmore' as any),
          })
        }
      }
    })

    customLinks.forEach((link) => {
      const fromNode = nodes.find((n) => n.id === link.fromId)
      const toNode = nodes.find((n) => n.id === link.toId)

      const isFromVisible = visibleNodes.some((n) => n.id === link.fromId)
      const isToVisible = visibleNodes.some((n) => n.id === link.toId)

      if (
        isFromVisible &&
        isToVisible &&
        fromNode &&
        toNode &&
        fromNode.x !== undefined &&
        fromNode.y !== undefined &&
        toNode.x !== undefined &&
        toNode.y !== undefined
      ) {
        const { p1, p2, orientation } = getConnectionPoints(
          fromNode.x,
          fromNode.y,
          nodeWidth,
          nodeHeight,
          toNode.x,
          toNode.y,
          nodeWidth,
          nodeHeight
        )
        const path = getBezierPath(p1, p2, orientation)
        const isSelected = selectedNodeId === fromNode.id || selectedNodeId === toNode.id
        list.push({
          id: `custom-${link.fromId}-${link.toId}`,
          parentId: link.fromId,
          childId: link.toId,
          path,
          isSelected,
        })
      }
    })

    return list
  }, [visibleNodes, customLinks, selectedNodeId])

  const handleFitView = () => {
    if (visibleNodes.length === 0) return

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    visibleNodes.forEach((node) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })

    minX -= 60
    maxX += nodeWidth + 60
    minY -= 60
    maxY += nodeHeight + 60

    const treeWidth = maxX - minX
    const treeHeight = maxY - minY

    const viewport = document.getElementById('mindmap-viewport')
    const width = viewport?.clientWidth ?? 800
    const height = viewport?.clientHeight ?? 600

    const scaleX = width / treeWidth
    const scaleY = height / treeHeight
    const newScale = Math.max(0.4, Math.min(1.5, Math.min(scaleX, scaleY)))

    const newPanX = (width - treeWidth * newScale) / 2 - minX * newScale
    const newPanY = (height - treeHeight * newScale) / 2 - minY * newScale

    setScale(newScale)
    setPanX(newPanX)
    setPanY(newPanY)
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedNodeTask = selectedNode && selectedNode.type === 'note' && selectedNode.entityId ? tasks.find((t) => t.id === selectedNode.entityId) : null
  const isSelectedNodeDone = selectedNodeTask ? selectedNodeTask.status === 'done' : selectedNode ? !!selectedNode.isCompleted : false

  if (selectedMindMapId !== null && nodes.length === 0 && mindMap) {
    return (
      <div className={`mindmap-workspace ${styles.mindMapsPanel}`}>
        <div className="mindmap-workspace-header">
          <div className="mindmap-header-left">
            <button className="btn secondary" onClick={() => onSelectMindMap(null)}>
              <ChevronLeft size={16} /> Назад
            </button>
            <span className="panel-title">{mindMap.title}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
          <p className="node-placeholder-text">Карта порожня. Створіть кореневий вузол для початку.</p>
          <button
            className="btn primary"
            onClick={() => {
              const rootNode: MindMapNode = {
                id: 'root',
                parentId: null,
                type: 'text',
                title: '',
                text: '',
                x: 100,
                y: 100,
              }
              void saveNodesAndLinks([rootNode], [])
            }}
          >
            <Plus size={16} /> Створити кореневий вузол
          </button>
        </div>
      </div>
    )
  }

  if (selectedMindMapId !== null && mindMap) {
    return (
      <div className={`mindmap-workspace ${styles.mindMapsPanel}`}>
        <div className="mindmap-workspace-header">
          <div className="mindmap-header-left">
            <button className="btn secondary" onClick={() => onSelectMindMap(null)}>
              <ChevronLeft size={16} /> Назад
            </button>
            <input
              type="text"
              className="mindmap-title-input"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Назва інтелект-карти"
            />
          </div>

          <div className="zoom-controls">
            <button
              className="btn secondary"
              onClick={() => setScale((s) => Math.max(0.1, s - 0.1))}
              title="Зменшити масштаб"
            >
              <Minus size={14} />
            </button>
            <span className="zoom-badge">{Math.round(scale * 100)}%</span>
            <button
              className="btn secondary"
              onClick={() => setScale((s) => Math.min(4.0, s + 0.1))}
              title="Збільшити масштаб"
            >
              <Plus size={14} />
            </button>
            <button
              className="btn secondary"
              onClick={handleFitView}
              style={{ marginLeft: '8px' }}
              title="Вмістити на екрані"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        <div className="mindmap-workspace-body">
          <div
            id="mindmap-viewport"
            className="mindmap-canvas-area mindmap-viewport"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="mindmap-viewport-bg" />

            {linkingSourceId && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--surface)',
                  border: '1px solid var(--pink)',
                  boxShadow: '0 0 10px rgba(168, 85, 247, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                }}
              >
                <span>Оберіть цільовий вузол для створення стрілочки</span>
                <button
                  className="btn secondary compact"
                  onClick={() => setLinkingSourceId(null)}
                  style={{ padding: '2px 8px', fontSize: '11px' }}
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
                transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                transformOrigin: '0 0',
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              {/* Connection curves with arrowheads */}
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
                    id="arrowhead"
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
                    id="arrowhead-selected"
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
                {connections.map((conn) => (
                  <path
                    key={conn.id}
                    d={conn.path}
                    stroke={conn.isSelected ? '#a855f7' : '#3f3f46'}
                    strokeWidth={conn.isSelected ? 3 : 2}
                    strokeDasharray={conn.isDashed ? '4,4' : undefined}
                    fill="none"
                    markerEnd={conn.isDashed ? undefined : (conn.isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)')}
                    style={{ transition: 'stroke 0.15s ease, stroke-width 0.15s ease' }}
                  />
                ))}
              </svg>

              {/* Node cards */}
              {visibleNodes.map((node) => {
                const isSelected = selectedNodeId === node.id
                const isRoot = node.parentId === null
                const childrenCount = nodes.filter((n) => n.parentId === node.id).length
                const isLinkingTarget = linkingSourceId !== null && linkingSourceId !== node.id
                const task = node.type === 'note' && node.entityId ? tasks.find((t) => t.id === node.entityId) : null
                const isNodeDone = node.type === 'note' && task ? task.status === 'done' : !!node.isCompleted

                if (node.type === ('showmore' as any)) {
                  return (
                    <div
                      key={node.id}
                      className="mindmap-node showmore-node"
                      style={{
                        left: `${node.x ?? 0}px`,
                        top: `${node.y ?? 0}px`,
                        width: `${nodeWidth}px`,
                        height: '50px',
                        pointerEvents: 'auto',
                        border: '1px dashed var(--border)',
                        background: 'rgba(39, 39, 42, 0.6)',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (node.parentId) {
                          handleExpandMoreChildren(node.parentId, e)
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px', fontWeight: 600 }}>
                        <span>📂</span>
                        <span>{node.title}</span>
                      </div>
                    </div>
                  )
                }

                let nodeContent = null
                if (node.type === 'text') {
                  nodeContent = (
                    <div className="node-text-content">
                      <div className="node-title">{node.title || (isRoot ? 'Головна тема' : 'Новий вузол')}</div>
                      {node.text && <div className="node-desc">{node.text}</div>}
                    </div>
                  )
                } else if (node.type === 'image') {
                  nodeContent = (
                    <div className="node-image-content">
                      <div className="node-title">{node.title || 'Новий вузол'}</div>
                      <div className="node-image-container">
                        {node.imageUrl ? (
                          <img src={node.imageUrl} alt={node.title} className="node-image" />
                        ) : (
                          <div className="node-image-placeholder">
                            <Upload size={14} />
                            <span>Немає зображення</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                } else if (node.type === 'note') {
                  nodeContent = (
                    <div className="node-task-content">
                      <div className="node-task-row">
                        {task ? (
                          <>
                            <input
                              type="checkbox"
                              className="node-checkbox"
                              checked={task.status === 'done'}
                              onChange={(e) => handleToggleTask(task, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={`node-task-title ${task.status === 'done' ? 'completed' : ''}`}>
                              {task.title}
                            </span>
                            <button
                              className="node-link-btn"
                              title="Відкрити задачу"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditTask(task)
                              }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="node-placeholder-text">Задачу не обрано</span>
                        )}
                      </div>
                      {task && (
                        <div className="node-task-meta">
                          <span className={`node-priority-badge ${task.priority}`}>
                            {task.priority === 'high' ? 'Високий' : task.priority === 'medium' ? 'Середній' : 'Низький'}
                          </span>
                          <span className="node-type-badge">{task.type}</span>
                        </div>
                      )}
                    </div>
                  )
                } else if (node.type === 'code') {
                  const snippet = node.entityId ? snippets.find((s) => s.id === node.entityId) : null
                  nodeContent = (
                    <div className="node-code-content">
                      <div className="node-code-header-row">
                        <span className="node-code-title-text">{node.title || snippet?.title || 'Без назви'}</span>
                        {snippet && (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span className="node-code-badge">{snippet.language}</span>
                            <button
                              className="node-link-btn"
                              title="Відкрити у сховищі"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSection('vault')
                                setSnippetSelection(snippet.id)
                              }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {snippet ? (
                        <pre className="node-code-preview">
                          <code>{snippet.code}</code>
                        </pre>
                      ) : (
                        <span className="node-placeholder-text">Код не обрано</span>
                      )}
                    </div>
                  )
                }

                return (
                  <div
                    key={node.id}
                    className={`mindmap-node ${isSelected ? 'selected' : ''} ${isRoot ? 'root-node' : ''} ${isNodeDone ? 'completed' : ''}`}
                    style={{
                      left: `${node.x ?? 0}px`,
                      top: `${node.y ?? 0}px`,
                      width: `${nodeWidth}px`,
                      height: `${nodeHeight}px`,
                      pointerEvents: 'auto',
                      border: isLinkingTarget ? '2px dashed var(--pink)' : undefined,
                      boxShadow: isLinkingTarget ? '0 0 8px rgba(168, 85, 247, 0.2)' : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNodeClick(node.id)
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  >
                    <div className="node-header-icon-bar">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          className="node-checkbox"
                          style={{ margin: 0, width: '13px', height: '13px', cursor: 'pointer' }}
                          checked={isNodeDone}
                          onChange={async (e) => {
                            if (node.type === 'note' && task) {
                              await handleToggleTask(task, e.target.checked)
                            } else {
                              handleUpdateNodeForId(node.id, { isCompleted: e.target.checked })
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        {node.type === 'text' && <FileText size={12} className="node-type-icon text" />}
                        {node.type === 'image' && <Upload size={12} className="node-type-icon image" />}
                        {node.type === 'note' && <ListChecks size={12} className="node-type-icon note" />}
                        {node.type === 'code' && <Code2 size={12} className="node-type-icon code" />}
                        <span className="node-type-label">
                          {node.type === 'text' ? 'Текст' : node.type === 'image' ? 'Зображення' : node.type === 'note' ? 'Задача' : 'Код'}
                        </span>
                      </div>

                      <div className="node-actions-hover">
                        <button
                          className="node-action-icon-btn add"
                          title="Додати підвузол"
                          onClick={(e) => {
                            e.stopPropagation()
                            const newId = `node_${Math.random().toString(36).substring(2, 9)}`
                            const newNodes = [
                              ...nodes.map((n) => (n.id === node.id ? { ...n, isCollapsed: false } : n)),
                              {
                                id: newId,
                                parentId: node.id,
                                type: 'text',
                                title: '',
                                text: '',
                                x: (node.x ?? 0) + 360,
                                y: (node.y ?? 0) + Math.round(Math.random() * 80 - 40),
                              } as MindMapNode,
                            ]
                            void saveNodesAndLinks(newNodes, customLinks)
                            setSelectedNodeId(newId)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Plus size={10} />
                        </button>

                        <button
                          className={`node-action-icon-btn link ${linkingSourceId === node.id ? 'active' : ''}`}
                          title="Зв'язати з іншим вузлом"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLinkingSourceId(node.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            background: linkingSourceId === node.id ? 'var(--pink)' : undefined,
                            color: linkingSourceId === node.id ? '#ffffff' : undefined,
                          }}
                        >
                          <Repeat size={10} />
                        </button>

                        {!isRoot && (
                          <button
                            className="node-action-icon-btn delete"
                            title="Видалити вузол"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNode(node.id)
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {nodeContent}

                    {childrenCount > 0 && (
                      <button
                        className="node-toggle-btn"
                        onClick={(e) => handleToggleCollapse(node.id, e)}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={node.isCollapsed ? 'Розгорнути' : 'Згорнути'}
                      >
                        {node.isCollapsed ? childrenCount : '−'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mindmap-inspector">
            {selectedNode ? (
              <>
                <h3 className="inspector-title">Редагувати вузол</h3>

                <div className="inspector-section">
                  <label className="inspector-label">Тип вмісту</label>
                  <select
                    className="form-control"
                    value={selectedNode.type}
                    onChange={(e) => {
                      const newType = e.target.value as MindMapNode['type']
                      handleUpdateNode({
                        type: newType,
                        entityId: undefined,
                        imageUrl: undefined,
                      })
                    }}
                  >
                    <option value="text">Текст (Опис)</option>
                    <option value="image">Зображення / Фотографія</option>
                    <option value="note">Задача / Нотатка з NoteHub</option>
                    <option value="code">Код зі сховища</option>
                  </select>
                </div>

                <div className="inspector-section">
                  <label className="inspector-label">Заголовок вузла</label>
                  <input
                    type="text"
                    className="form-control"
                    value={selectedNode.title}
                    onChange={(e) => handleUpdateNode({ title: e.target.value })}
                    placeholder="Заголовок..."
                  />
                </div>

                <div className="inspector-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="inspector-node-completed"
                    className="node-checkbox"
                    checked={isSelectedNodeDone}
                    onChange={async (e) => {
                      if (selectedNode.type === 'note' && selectedNodeTask) {
                        await handleToggleTask(selectedNodeTask, e.target.checked)
                      } else {
                        handleUpdateNode({ isCompleted: e.target.checked })
                      }
                    }}
                  />
                  <label htmlFor="inspector-node-completed" style={{ fontSize: '12px', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                    Позначити як виконане завдання
                  </label>
                </div>

                {selectedNode.type === 'text' && (
                  <div className="inspector-section">
                    <label className="inspector-label">Опис / Нотатки</label>
                    <textarea
                      className="form-control"
                      value={selectedNode.text}
                      onChange={(e) => handleUpdateNode({ text: e.target.value })}
                      placeholder="Додатковий текст..."
                    />
                  </div>
                )}

                {selectedNode.type === 'image' && (
                  <>
                    <div className="inspector-section">
                      <label className="inspector-label">Посилання на фото (URL)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={selectedNode.imageUrl || ''}
                        onChange={(e) => handleUpdateNode({ imageUrl: e.target.value })}
                        placeholder="https://example.com/photo.jpg"
                      />
                    </div>

                    <div className="inspector-section">
                      <label className="inspector-label">Або завантажити локальний файл</label>
                      <input
                        type="file"
                        accept="image/*"
                        id="inspector-image-upload"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            void handleImageUpload(selectedNode.id, file)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => document.getElementById('inspector-image-upload')?.click()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Upload size={14} />
                        Обрати файл...
                      </button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'note' && (
                  <div className="inspector-section">
                    <label className="inspector-label">Оберіть задачу зі списку</label>
                    <select
                      className="form-control"
                      value={selectedNode.entityId || ''}
                      onChange={(e) => handleUpdateNode({ entityId: Number(e.target.value) || undefined })}
                    >
                      <option value="">-- Оберіть задачу --</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title} ({task.type === 'task' ? 'задача' : task.type === 'note' ? 'нотатка' : task.type === 'event' ? 'подія' : 'дедлайн'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedNode.type === 'code' && (
                  <div className="inspector-section">
                    <label className="inspector-label">Оберіть код зі сховища</label>
                    <select
                      className="form-control"
                      value={selectedNode.entityId || ''}
                      onChange={(e) => handleUpdateNode({ entityId: Number(e.target.value) || undefined })}
                    >
                      <option value="">-- Оберіть фрагмент --</option>
                      {snippets.map((snip) => (
                        <option key={snip.id} value={snip.id}>
                          {snip.title} ({snip.language})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom connections list in Inspector */}
                <div className="inspector-section">
                  <label className="inspector-label">Стрілочки зв'язків</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setLinkingSourceId(selectedNode.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '6px 12px',
                      }}
                    >
                      <Repeat size={12} />
                      Спрямувати нову стрілочку
                    </button>

                    {customLinks.filter((l) => l.fromId === selectedNode.id).length > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                          Вихідні стрілочки:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          {customLinks
                            .filter((l) => l.fromId === selectedNode.id)
                            .map((l) => {
                              const target = nodes.find((n) => n.id === l.toId)
                              return (
                                <div
                                  key={l.toId}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#09090b',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                  }}
                                >
                                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                    → {target?.title || 'Новий вузол'}
                                  </span>
                                  <button
                                    type="button"
                                    className="delete-card-btn"
                                    onClick={() => handleDeleteLink(l.fromId, l.toId)}
                                    title="Видалити зв'язок"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--muted)',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {customLinks.filter((l) => l.toId === selectedNode.id).length > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>
                          Вхідні стрілочки:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          {customLinks
                            .filter((l) => l.toId === selectedNode.id)
                            .map((l) => {
                              const source = nodes.find((n) => n.id === l.fromId)
                              return (
                                <div
                                  key={l.fromId}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#09090b',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                  }}
                                >
                                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                    ← {source?.title || 'Новий вузол'}
                                  </span>
                                  <button
                                    type="button"
                                    className="delete-card-btn"
                                    onClick={() => handleDeleteLink(l.fromId, l.toId)}
                                    title="Видалити зв'язок"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--muted)',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />

                <div className="inspector-section" style={{ gap: '10px' }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleAddChild}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Plus size={16} />
                    Додати підвузол
                  </button>
                  {selectedNode.parentId !== null && (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--danger)' }}
                    >
                      <Trash2 size={16} />
                      Видалити цей вузол
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted)', textAlign: 'center', gap: '12px' }}>
                <GitBranch size={32} style={{ opacity: 0.5 }} />
                <p style={{ fontSize: '13px' }}>Оберіть вузол на карті, щоб редагувати його або додати підвузли.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`mindmaps-container ${styles.mindMapsPanel}`}>
      <div className="panel-header">
        <div className="title-block">
          <GitBranch size={20} />
          <h2>Інтелект-карти</h2>
        </div>
        <button className="btn primary" onClick={onCreateMindMap}>
          <Plus size={16} />
          Створити карту
        </button>
      </div>

      <div className="mindmaps-grid">
        {mindMaps.map((map) => {
          let nodeCount = 0
          try {
            const parsed = JSON.parse(map.nodes_data)
            if (Array.isArray(parsed)) {
              nodeCount = parsed.length
            } else if (parsed && typeof parsed === 'object') {
              nodeCount = (parsed.nodes || []).length
            }
          } catch (e) {}

          return (
            <div key={map.id} className="mindmap-card" onClick={() => onSelectMindMap(map.id)}>
              <div className="mindmap-card-header">
                <GitBranch className="card-icon" size={24} />
                <button
                  className="delete-card-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onDeleteMindMap(map.id, map.title)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="mindmap-card-title">{map.title}</h3>
              <div className="mindmap-card-meta">
                <span>Вузлів: {nodeCount}</span>
                <span>Оновлено: {formatShortDate(map.updatedAt.slice(0, 10))}</span>
              </div>
            </div>
          )
        })}

        <div className="mindmap-card create-new" onClick={onCreateMindMap}>
          <Plus size={32} className="create-icon" />
          <span>Створити нову карту</span>
        </div>
      </div>
    </div>
  )
}

export function MindMapModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (title: string, description: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('Головна тема')

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('Головна тема')
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Будь ласка, введіть назву інтелект-карти')
      return
    }
    void onSubmit(title.trim(), description.trim())
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="drawer-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Створити інтелект-карту</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Назва карти</label>
            <input
              type="text"
              className="form-control"
              placeholder="Наприклад: План розробки, Ідеї для стартапу..."
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
            <label className="form-label">Опис / Головна тема</label>
            <input
              type="text"
              className="form-control"
              placeholder="Головна тема карти..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
        </div>

        <div className="drawer-actions" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'transparent' }}>
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} style={{ marginRight: '6px' }} />
            Створити карту
          </button>
        </div>
      </form>
    </div>
  )
}
