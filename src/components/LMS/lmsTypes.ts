export interface LMSTopic {
  id: string
  title: string
  description?: string
  duration?: string
  isCompleted?: boolean
  hasContent?: boolean
  orderIndex: number
  kind?: 'theory' | 'practice' | 'quiz'
}

export interface LMSModule {
  id: string
  title: string
  description?: string
  orderIndex: number
  topics: LMSTopic[]
  isCompleted?: boolean
}

export interface LMSDiscipline {
  id: string
  title: string
  code?: string
  category: 'math' | 'cs' | 'english' | 'general' | 'other'
  description: string
  icon?: string
  mindMapId?: number
  modules: LMSModule[]
  totalTopics: number
  completedTopics: number
  hasMaterials: boolean // true for Math & Digital Tech, false for empty disciplines like English/Ukrainian
}

export interface LMSCourse {
  id: string
  title: string
  subtitle: string
  description: string
  category: string
  badge?: string
  progressPercent: number
  disciplines: LMSDiscipline[]
  isArchived?: boolean
}

export interface LMSLectureCallout {
  type: 'info' | 'warning' | 'tip' | 'note'
  title?: string
  content: string
}

export interface LMSLectureContent {
  id: string
  topicId: string
  title: string
  subtitle?: string
  readingTime?: string
  contentMarkdown: string
  callouts?: LMSLectureCallout[]
  keyTakeaways?: string[]
}
