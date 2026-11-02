import React, { useState, useMemo, useEffect } from 'react'
import type { Roadmap, MindMap } from '../../types'
import type { LMSDiscipline } from './lmsTypes'
import { parseRoadmapToDiscipline } from './lmsData'
import { fetchRoadmaps } from '../../api'
import LMSDisciplineView from './LMSDisciplineView'

interface LMSPortalProps {
  roadmaps?: Roadmap[]
  mindMaps?: MindMap[]
  onExit: () => void
  initialDisciplineId?: string
}

export const LMSPortal: React.FC<LMSPortalProps> = ({
  roadmaps: initialRoadmaps = [],
  onExit,
  initialDisciplineId,
}) => {
  const [roadmapsList, setRoadmapsList] = useState<Roadmap[]>(initialRoadmaps)

  // Fetch roadmaps if not provided
  useEffect(() => {
    if (initialRoadmaps && initialRoadmaps.length > 0) {
      setRoadmapsList(initialRoadmaps)
    } else {
      fetchRoadmaps()
        .then((data) => {
          if (Array.isArray(data)) setRoadmapsList(data)
        })
        .catch((err) => console.error('Failed to fetch roadmaps for LMS:', err))
    }
  }, [initialRoadmaps])

  // Convert real roadmaps into disciplines
  const disciplines = useMemo<LMSDiscipline[]>(() => {
    if (!roadmapsList || roadmapsList.length === 0) return []

    // Sort: Math roadmap first, then university, then others
    const sorted = [...roadmapsList].sort((a, b) => {
      const isMathA = a.title.toLowerCase().includes('математик') || a.id === 230
      const isMathB = b.title.toLowerCase().includes('математик') || b.id === 230
      if (isMathA && !isMathB) return -1
      if (!isMathA && isMathB) return 1
      return a.id - b.id
    })

    return sorted.map((rm) => parseRoadmapToDiscipline(rm))
  }, [roadmapsList])

  const defaultId = useMemo(() => {
    if (initialDisciplineId) return initialDisciplineId
    const math = disciplines.find((d) => d.hasMaterials)
    return math ? math.id : disciplines[0]?.id || '230'
  }, [disciplines, initialDisciplineId])

  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(defaultId)

  // Sync if defaultId changes
  useEffect(() => {
    if (!selectedDisciplineId && defaultId) {
      setSelectedDisciplineId(defaultId)
    }
  }, [defaultId, selectedDisciplineId])

  if (disciplines.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#9a9a9f', background: '#27272c', minHeight: '100vh' }}>
        Завантаження роадмап...
      </div>
    )
  }

  return (
    <LMSDisciplineView
      disciplines={disciplines}
      currentDisciplineId={selectedDisciplineId || disciplines[0].id}
      onSelectDiscipline={setSelectedDisciplineId}
      onExitToNoteHub={onExit}
    />
  )
}

export default LMSPortal
