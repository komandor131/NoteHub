export const getConnectionPoints = (
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
) => {
  const cx1 = x1 + w1 / 2
  const cy1 = y1 + h1 / 2
  const cx2 = x2 + w2 / 2
  const cy2 = y2 + h2 / 2

  let p1 = { x: cx1, y: cy1 }
  let p2 = { x: cx2, y: cy2 }
  let orientation: 'horizontal' | 'vertical' = 'horizontal'

  if (cx2 > cx1 + w1 / 2 + w2 / 2) {
    p1 = { x: x1 + w1, y: cy1 }
    p2 = { x: x2, y: cy2 }
    orientation = 'horizontal'
  } else if (cx2 < cx1 - w1 / 2 - w2 / 2) {
    p1 = { x: x1, y: cy1 }
    p2 = { x: x2 + w2, y: cy2 }
    orientation = 'horizontal'
  } else {
    if (cy2 > cy1) {
      p1 = { x: cx1, y: y1 + h1 }
      p2 = { x: cx2, y: y2 }
      orientation = 'vertical'
    } else {
      p1 = { x: cx1, y: y1 }
      p2 = { x: cx2, y: y2 + h2 }
      orientation = 'vertical'
    }
  }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > 15) {
    p2.x -= (dx / dist) * 10
    p2.y -= (dy / dist) * 10
  }

  return { p1, p2, orientation }
}

export const getBezierPath = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  orientation: 'horizontal' | 'vertical'
) => {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  if (orientation === 'horizontal') {
    const cx = Math.max(60, Math.abs(dx) / 2, Math.abs(dy) * 0.25)
    return `M ${p1.x} ${p1.y} C ${p1.x + (dx > 0 ? cx : -cx)} ${p1.y}, ${p2.x - (dx > 0 ? cx : -cx)} ${p2.y}, ${p2.x} ${p2.y}`
  } else {
    const cy = Math.max(60, Math.abs(dy) / 2, Math.abs(dx) * 0.25)
    return `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + (dy > 0 ? cy : -cy)}, ${p2.x} ${p2.y - (dy > 0 ? cy : -cy)}, ${p2.x} ${p2.y}`
  }
}

export const computeInitialLayout = (
  nodesList: Array<{ id: string; parentId: string | null; isCollapsed?: boolean; x?: number; y?: number }>
): Record<string, { x: number; y: number }> => {
  const coordsMap: Record<string, { x: number; y: number }> = {}
  const nodeHeight = 120
  const levelSpacing = 360
  const nodeSpacingY = 180

  const getChildren = (id: string) => nodesList.filter((n) => n.parentId === id)

  const getSubtreeLeafCount = (id: string): number => {
    const node = nodesList.find((n) => n.id === id)
    if (!node || node.isCollapsed) return 1
    const children = getChildren(id)
    if (children.length === 0) return 1
    return children.reduce((sum, child) => sum + getSubtreeLeafCount(child.id), 0)
  }

  const layoutNode = (id: string, level: number, startY: number) => {
    const node = nodesList.find((n) => n.id === id)
    if (!node) return

    const x = level * levelSpacing
    const leafCount = getSubtreeLeafCount(id)
    const subtreeHeight = leafCount * nodeSpacingY
    const y = startY + subtreeHeight / 2

    coordsMap[id] = { x, y: y - nodeHeight / 2 }

    if (!node.isCollapsed) {
      const children = getChildren(id)
      let currentY = startY
      children.forEach((child) => {
        layoutNode(child.id, level + 1, currentY)
        currentY += getSubtreeLeafCount(child.id) * nodeSpacingY
      })
    }
  }

  const root = nodesList.find((n) => n.parentId === null)
  if (root) {
    layoutNode(root.id, 0, 0)
  }
  return coordsMap
}

