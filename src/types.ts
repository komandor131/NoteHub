export type TaskType = 'task' | 'event' | 'deadline' | 'note'
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high'
export type CalendarView = 'month' | 'week' | 'day'
export type EntityType = 'task' | 'snippet' | 'goal' | 'diary' | 'project' | 'mindmap' | 'roadmap'

export interface Attachment {
  id: number
  originalName: string
  storedName: string
  mimeType: string
  size: number
  entityType: EntityType
  entityId: number
  createdAt: string
}

export interface Task {
  id: number
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startAt: string | null
  endAt: string | null
  dueDate: string | null
  color: string
  tags: string[]
  attachments: Attachment[]
  projectId: number | null
  createdAt: string
  updatedAt: string
}

export interface Snippet {
  id: number
  title: string
  language: string
  code: string
  explanation: string
  tags: string[]
  attachments: Attachment[]
  projectId: number | null
  createdAt: string
  updatedAt: string
}

export interface TaskPayload {
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startAt: string | null
  endAt: string | null
  dueDate: string | null
  color: string
  tags: string[]
  projectId?: number | null
}

export interface SnippetPayload {
  title: string
  language: string
  code: string
  explanation: string
  tags: string[]
  projectId?: number | null
}

export interface FinanceGoal {
  id: number
  title: string
  description: string
  target_amount: number
  saved_amount: number
  target_date: string | null
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface FinanceGoalPayload {
  title: string
  description: string
  target_amount: number
  saved_amount: number
  target_date: string | null
}

export interface DiaryEntry {
  id: number
  title: string
  content: string
  date: string
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface DiaryEntryPayload {
  title: string
  content: string
  date: string
}

export interface SearchResult {
  tasks: Task[]
  snippets: Snippet[]
}

export interface Subscription {
  id: number
  title: string
  amount: number
  period: 'monthly' | 'weekly'
  next_payment_date: string
  category: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionPayload {
  title: string
  amount: number
  period: 'monthly' | 'weekly'
  next_payment_date: string
  category: string
  color: string
}

export interface ProjectLink {
  name: string
  url: string
}

export interface Project {
  id: number
  title: string
  description: string
  repo_url: string
  prod_url: string
  tech_stack: string[]
  links: ProjectLink[]
  canvas_data: string
  is_completed: boolean
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface ProjectPayload {
  title: string
  description: string
  repo_url: string
  prod_url: string
  tech_stack: string[]
  links: ProjectLink[]
  canvas_data?: string
  is_completed?: boolean
}

export interface Roadmap {
  id: number
  title: string
  description: string
  canvas_data: string
  createdAt: string
  updatedAt: string
}

export interface RoadmapPayload {
  title: string
  description: string
  canvas_data?: string
}

export interface Habit {
  id: number
  title: string
  color: string
  createdAt: string
  updatedAt: string
  history: string[]
}

export interface HabitPayload {
  title: string
  color: string
}

export interface MindMapNode {
  id: string
  parentId: string | null
  type: 'text' | 'image' | 'note' | 'code'
  title: string
  text: string
  entityId?: number
  imageUrl?: string
  isCollapsed?: boolean
  isCompleted?: boolean
  visibleLimit?: number
  x?: number
  y?: number
}

export interface MindMap {
  id: number
  title: string
  nodes_data: string // JSON representation of MindMapNode[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

export interface MindMapPayload {
  title: string
  nodes_data: string
}
