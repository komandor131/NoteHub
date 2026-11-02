import type { Roadmap } from '../../types'
import type { LMSDiscipline, LMSModule, LMSTopic } from './lmsTypes'

/**
 * Strips leading numbers, dots, and dashes from a string.
 * Example: "1.1.1 Середні тенденції" -> "Середні тенденції"
 * Example: "1.2 Теорія ймовірностей" -> "Теорія ймовірностей"
 */
export function cleanTitleText(title: string): string {
  if (!title) return ''
  return title.replace(/^[\d\.\s\-_]+/, '').trim()
}

/**
 * Parses any NoteHub Roadmap into an LMS Discipline.
 * Sourced directly from NoteHub's roadmap canvas_data.
 * - Modules: numbered with single number (e.g. "Модуль 1. Описова статистика")
 * - Topics: without numbers, just clean names (e.g. "Середні тенденції")
 */
export function parseRoadmapToDiscipline(roadmap: Roadmap): LMSDiscipline {
  let nodes: any[] = []
  try {
    const canvas = JSON.parse(roadmap.canvas_data || '{}')
    nodes = canvas.nodes || []
  } catch (err) {
    console.error(`Failed to parse roadmap canvas for #${roadmap.id} (${roadmap.title}):`, err)
  }

  const isMath =
    roadmap.title.toLowerCase().includes('математик') ||
    roadmap.id === 230 ||
    roadmap.title.startsWith('1.')

  // 1. Identify module nodes (top-level section nodes)
  let moduleNodes = nodes.filter((n) => {
    if (n.id === 'root') return false
    const parts = String(n.id).split('_')
    return parts.length === 2
  })

  // Fallback if ID scheme differs
  if (moduleNodes.length === 0) {
    moduleNodes = nodes.filter(
      (n) => n.id !== 'root' && (n.parentId === 'root' || !n.parentId)
    )
  }

  // Fallback if flat list
  if (moduleNodes.length === 0 && nodes.length > 1) {
    const candidateNodes = nodes.filter((n) => n.id !== 'root')
    const chunkSize = 6
    const modules: LMSModule[] = []

    for (let i = 0; i < candidateNodes.length; i += chunkSize) {
      const slice = candidateNodes.slice(i, i + chunkSize)
      const modIndex = Math.floor(i / chunkSize) + 1
      const cleanModName = cleanTitleText(slice[0]?.title || `Розділ ${modIndex}`)
      const topics: LMSTopic[] = slice.map((node, tIdx) => ({
        id: node.id,
        title: cleanTitleText(node.title),
        description: node.text || '',
        orderIndex: tIdx + 1,
        isCompleted: !!node.isCompleted,
        hasContent: isMath,
        kind: 'theory',
      }))

      if (isMath && modIndex % 3 === 0) {
        const clusterIdx = Math.floor(modIndex / 3)
        const startMod = clusterIdx * 3 - 2
        const endMod = clusterIdx * 3
        topics.push({
          id: `math_test_${clusterIdx}`,
          title: `🎯 Контрольний тест: Модулі ${startMod}–${endMod} (20 питань)`,
          description: `Підсумковий контрольний тест знань за попередні 3 модулі (${startMod}–${endMod}). 20 завдань • 20 балів.`,
          orderIndex: topics.length + 1,
          isCompleted: false,
          hasContent: true,
          kind: 'quiz',
        })
      }

      modules.push({
        id: `mod_${roadmap.id}_${modIndex}`,
        title: `Модуль ${modIndex}${cleanModName ? '. ' + cleanModName : ''}`,
        orderIndex: modIndex,
        topics,
        isCompleted: slice.every((n) => n.isCompleted),
      })
    }

    const allTopics = modules.flatMap((m) => m.topics)
    return {
      id: String(roadmap.id),
      title: roadmap.title,
      code: `RM-${roadmap.id}`,
      category: isMath ? 'math' : 'other',
      description: roadmap.description || '',
      modules,
      totalTopics: allTopics.length,
      completedTopics: allTopics.filter((t) => t.isCompleted).length,
      hasMaterials: isMath,
    }
  }

  // 2. Build structured modules with child topics
  const modules: LMSModule[] = moduleNodes.map((mNode, mIdx) => {
    const cleanModName = cleanTitleText(mNode.title)
    const subNodes = nodes.filter(
      (sn) => sn.id.startsWith(mNode.id + '_') && sn.id !== mNode.id
    )

    const topics: LMSTopic[] =
      subNodes.length > 0
        ? subNodes.map((sn, sIdx) => ({
            id: sn.id,
            title: cleanTitleText(sn.title),
            description: sn.text || '',
            orderIndex: sIdx + 1,
            isCompleted: !!sn.isCompleted,
            hasContent: isMath,
            kind: 'theory',
          }))
        : [
            {
              id: `${mNode.id}_topic_1`,
              title: cleanModName || mNode.title,
              description: mNode.text || '',
              orderIndex: 1,
              isCompleted: !!mNode.isCompleted,
              hasContent: isMath,
              kind: 'theory',
            },
          ]

    // Insert milestone checkpoint test after every 3 modules
    if (isMath && (mIdx + 1) % 3 === 0) {
      const clusterIdx = Math.floor((mIdx + 1) / 3)
      const startMod = clusterIdx * 3 - 2
      const endMod = clusterIdx * 3
      topics.push({
        id: `math_test_${clusterIdx}`,
        title: `Контрольний тест: Модулі ${startMod}–${endMod} (20 питань)`,
        description: `Підсумковий контрольний тест знань за попередні 3 модулі (${startMod}–${endMod}). 20 завдань • 20 балів.`,
        orderIndex: topics.length + 1,
        isCompleted: false,
        hasContent: true,
        kind: 'quiz',
      })
    }

    return {
      id: mNode.id,
      title: `Модуль ${mIdx + 1}${cleanModName ? '. ' + cleanModName : ''}`,
      description: mNode.text || '',
      orderIndex: mIdx + 1,
      topics,
      isCompleted: topics.length > 0 && topics.every((t) => t.isCompleted),
    }
  })

  const allTopics = modules.flatMap((m) => m.topics)
  const totalTopics = allTopics.length
  const completedTopics = allTopics.filter((t) => t.isCompleted).length

  return {
    id: String(roadmap.id),
    title: roadmap.title,
    code: `RM-${roadmap.id}`,
    category: isMath ? 'math' : 'other',
    description: roadmap.description || '',
    modules,
    totalTopics,
    completedTopics,
    hasMaterials: isMath,
  }
}
