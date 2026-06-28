import type {
  Task,
  Subscription,
  CalendarView,
  TaskFilters,
  Snippet,
  SnippetFilters,
  Project,
  MindMap,
  Roadmap,
  FinanceGoal,
  DiaryEntry,
  Habit,
  Attachment,
  TaskPayload,
  SnippetPayload,
  RoadmapPayload,
  ProjectPayload,
  FinanceGoalPayload,
  DiaryEntryPayload,
  SubscriptionPayload,
  HabitPayload,
  Section
} from './models'

// 1. CalendarPanel
export interface CalendarPanelProps {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  view: CalendarView
  filters: TaskFilters
  tags: string[]
  onDateChange: (date: string) => void
  onViewChange: (view: CalendarView) => void
  onFiltersChange: (filters: TaskFilters) => void
  onCreateTask: (dateKey?: string) => void
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}

// 2. TasksPanel
export interface TasksPanelProps {
  tasks: Task[]
  filters: TaskFilters
  tags: string[]
  onFiltersChange: (filters: TaskFilters) => void
  onCreateTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => Promise<void>
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
}

// 3. VaultPanel
export interface VaultPanelProps {
  snippets: Snippet[]
  allSnippets: Snippet[]
  selectedSnippet: Snippet | null
  selection: number | 'new' | null
  filters: SnippetFilters
  tags: string[]
  languages: string[]
  isFullscreenCode: boolean
  projects: Project[]
  quickSnippetProjectId: number | null
  onSelect: (selection: number | 'new' | null) => void
  onFiltersChange: (filters: SnippetFilters) => void
  onSave: (payload: SnippetPayload, file: File | null, snippet: Snippet | null) => Promise<void>
  onDelete: (snippet: Snippet) => Promise<void>
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
  setIsFullscreenCode: (fullscreen: boolean) => void
}

// 4. ProjectsPanel
export interface ProjectsPanelProps {
  projects: Project[]
  tasks: Task[]
  snippets: Snippet[]
  selectedProjectId: number | null
  onSelectProject: (id: number | null) => void
  onCreateProject: () => void
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => Promise<void>
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
  onQuickCreateTask: (projectId: number) => void
  onQuickCreateSnippet: (projectId: number) => void
  onSaveCanvas: (id: number, canvasData: string) => Promise<void>
  onUpdateTask: (id: number, payload: TaskPayload) => Promise<void>
  setSection: (section: Section) => void
  setSnippetSelection: (selection: number | 'new' | null) => void
  openEditTask: (task: Task) => void
  onRefreshData: () => Promise<void>
  onToggleProjectCompleted: (project: Project) => Promise<void>
}

// 5. MindMapsPanel
export interface MindMapsPanelProps {
  mindMaps: MindMap[]
  tasks: Task[]
  snippets: Snippet[]
  selectedMindMapId: number | null
  onSelectMindMap: (id: number | null) => void
  onCreateMindMap: () => void
  onDeleteMindMap: (id: number, title: string) => Promise<void>
  onSaveMindMap: (id: number, nodesData: string) => Promise<void>
  setSection: (section: Section) => void
  setSnippetSelection: (selection: number | 'new' | null) => void
  openEditTask: (task: Task) => void
  onRefreshData: () => Promise<void>
}

// 6. RoadmapsPanel
export interface RoadmapsPanelProps {
  roadmaps: Roadmap[]
  selectedRoadmapId: number | null
  onSelectRoadmap: (id: number | null) => void
  onCreateRoadmap: () => void
  onEditRoadmap: (roadmap: Roadmap) => void
  onDeleteRoadmap: (roadmap: Roadmap) => Promise<void>
  onSaveCanvas: (id: number, canvasData: string) => Promise<void>
}

// 7. FinancePanel
export interface FinancePanelProps {
  balance: number
  goals: FinanceGoal[]
  subscriptions: Subscription[]
  onChangeBalance: (amount: number) => Promise<void>
  onAdjustBalance: (offset: number) => Promise<void>
  onContribute: (goal: FinanceGoal) => Promise<void>
  onWithdraw: (goal: FinanceGoal) => Promise<void>
  onEditGoal: (goal: FinanceGoal) => void
  onDeleteGoal: (goal: FinanceGoal) => Promise<void>
  onEditSub: (sub: Subscription) => void
  onDeleteSub: (sub: Subscription) => Promise<void>
  onPaySub: (sub: Subscription) => Promise<void>
  onAddSub: () => void
}

// 8. DiaryPanel
export interface DiaryPanelProps {
  diarySearch: string
  setDiarySearch: (query: string) => void
  entries: DiaryEntry[]
  onEdit: (entry: DiaryEntry) => void
  onDelete: (entry: DiaryEntry) => Promise<void>
}

// 9. HabitsPanel
export interface HabitsPanelProps {
  habits: Habit[]
  onCreateHabit: () => void
  onToggleHabit: (id: number, date: string, completed: boolean) => Promise<void>
  onDeleteHabit: (id: number) => Promise<void>
}

// 10. FilesPanel
export interface FilesPanelProps {
  attachments: Attachment[]
  tasks: Task[]
  snippets: Snippet[]
  goals: FinanceGoal[]
  diaryEntries: DiaryEntry[]
  projects: Project[]
  onDeleteAttachment: (attachment: Attachment) => Promise<void>
}

// Drawers Form state types
export interface DrawerProps<T, P> {
  open: boolean
  editingItem: T | null
  onClose: () => void
  onSubmit: (payload: P, file: File | null) => Promise<void>
}
