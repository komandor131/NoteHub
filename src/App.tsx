import Editor from '@monaco-editor/react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  FileCode2,
  FileText,
  Filter,
  FolderOpen,
  ListChecks,
  Paperclip,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  Wallet,
  BookOpen,
  DollarSign,
  TrendingUp,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Repeat,
  Briefcase,
  ExternalLink,
  Target,
  GitBranch,
  Minus,
  Map,
} from 'lucide-react'



import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  createSnippet,
  createTask,
  deleteAttachment,
  deleteSnippet,
  deleteTask,
  fetchSnippets,
  fetchTasks,
  searchAll,
  updateSnippet,
  updateTask,
  uploadAttachment,
  fetchBalance,
  updateBalance,
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchDiaryEntries,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  fetchHabits,
  createHabit,
  deleteHabit,
  toggleHabit,
  fetchMindMaps,
  createMindMap,
  updateMindMap,
  deleteMindMap,
  fetchRoadmaps,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
} from './api'
import StudyPanel from './components/StudyPanel/StudyPanel'
import Auth from './Auth'
import { useAuth } from './AuthContext'

import CalendarPanel from './components/CalendarPanel/CalendarPanel'
import TasksPanel from './components/TasksPanel/TasksPanel'
import VaultPanel from './components/VaultPanel/VaultPanel'
import ProjectsPanel from './components/ProjectsPanel/ProjectsPanel'
import MindMapsPanel, { MindMapModal } from './components/MindMapsPanel/MindMapsPanel'
import RoadmapsPanel, { RoadmapDrawer } from './components/RoadmapsPanel/RoadmapsPanel'
import FinancePanel from './components/FinancePanel/FinancePanel'
import DiaryPanel from './components/DiaryPanel/DiaryPanel'
import HabitsPanel from './components/HabitsPanel/HabitsPanel'
import FilesPanel from './components/FilesPanel/FilesPanel'

import TaskDrawer from './components/drawers/TaskDrawer'
import GoalDrawer from './components/drawers/GoalDrawer'
import DiaryDrawer from './components/drawers/DiaryDrawer'
import SubscriptionDrawer from './components/drawers/SubscriptionDrawer'
import ProjectDrawer from './components/drawers/ProjectDrawer'
import HabitDrawer from './components/drawers/HabitDrawer'

import TaskFiltersBox from './components/TaskFiltersBox/TaskFiltersBox'
import SnippetFiltersBox from './components/SnippetFiltersBox/SnippetFiltersBox'
import TaskRow from './components/TaskRow/TaskRow'
import AttachmentList from './components/AttachmentList/AttachmentList'
import EmptyState from './components/EmptyState/EmptyState'


import {
  dayNames,
  formatDateTime,
  formatLongDate,
  formatShortDate,
  formatTime,
  getCalendarTitle,
  getMonthCells,
  getWeekDays,
  shiftDate,
  taskDateKey,
  taskHour,
  taskTouchesDay,
  todayKey,
  toDateKey,
} from './dateUtils'
import type {
  Attachment,
  CalendarView,
  SearchResult,
  Snippet,
  SnippetPayload,
  Task,
  TaskPayload,
  TaskPriority,
  TaskStatus,
  TaskType,
  FinanceGoal,
  FinanceGoalPayload,
  DiaryEntry,
  DiaryEntryPayload,
  Subscription,
  SubscriptionPayload,
  Project,
  ProjectPayload,
  ProjectLink,
  Habit,
  HabitPayload,
  MindMap,
  MindMapNode,
  Roadmap,
  RoadmapPayload,
  TaskFilters,
  SnippetFilters,
} from './types'

type Section = 'calendar' | 'tasks' | 'vault' | 'finance' | 'diary' | 'files' | 'projects' | 'habits' | 'mindmaps' | 'roadmaps' | 'study'
type SnippetSelection = number | 'new' | null















const navigation: Array<{ id: Section; label: string; icon: typeof CalendarDays }> = [
  { id: 'calendar', label: 'Календар', icon: CalendarDays },
  { id: 'tasks', label: 'Задачі', icon: ListChecks },
  { id: 'vault', label: 'Сховище коду', icon: Code2 },
  { id: 'mindmaps', label: 'Інтелект-карти', icon: GitBranch },
  { id: 'projects', label: 'Проєкти', icon: Briefcase },
  { id: 'roadmaps', label: 'Роадмапи', icon: Map },
  { id: 'habits', label: 'Звички', icon: Target },
  { id: 'finance', label: 'Фінанси', icon: Wallet },
  { id: 'diary', label: 'Щоденник', icon: BookOpen },
  { id: 'files', label: 'Файли', icon: FolderOpen },
  { id: 'study', label: 'NoteHub Study', icon: BookOpen },
]

function advancePaymentDate(dateStr: string, period: 'monthly' | 'weekly') {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    return dateStr
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  if (period === 'monthly') {
    date.setMonth(date.getMonth() + 1)
  } else {
    date.setDate(date.getDate() + 7)
  }
  return toDateKey(date)
}





function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [section, setSection] = useState<Section>('calendar')
  const [tasks, setTasks] = useState<Task[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [goals, setGoals] = useState<FinanceGoal[]>([])
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitDrawerOpen, setHabitDrawerOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [mindMaps, setMindMaps] = useState<MindMap[]>([])
  const [selectedMindMapId, setSelectedMindMapId] = useState<number | null>(null)
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null)
  const [roadmapDrawerOpen, setRoadmapDrawerOpen] = useState(false)
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null)
  const [quickSnippetProjectId, setQuickSnippetProjectId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [calendarView, setCalendarView] = useState<CalendarView>('month')
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    search: '',
    type: 'all',
    status: 'all',
    priority: 'all',
    tag: 'all',
  })
  const [snippetFilters, setSnippetFilters] = useState<SnippetFilters>({
    search: '',
    language: 'all',
    tag: 'all',
  })
  
  // Diary Filter
  const [diarySearch, setDiarySearch] = useState('')

  // Drawers & Modals
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | null>(null)
  
  const [diaryDrawerOpen, setDiaryDrawerOpen] = useState(false)
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null)

  const [subDrawerOpen, setSubDrawerOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)

  const [isFullscreenCode, setIsFullscreenCode] = useState(false)
  const [mindMapModalOpen, setMindMapModalOpen] = useState(false)

  const [snippetSelection, setSnippetSelection] = useState<SnippetSelection>(null)
  const [globalSearch, setGlobalSearch] = useState('')
  const [globalResults, setGlobalResults] = useState<SearchResult | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [taskData, snippetData, balanceData, goalsData, diaryData, subData, projectData, habitData, mindMapData, roadmapData] = await Promise.all([
        fetchTasks(),
        fetchSnippets(),
        fetchBalance(),
        fetchGoals(),
        fetchDiaryEntries(),
        fetchSubscriptions(),
        fetchProjects(),
        fetchHabits(),
        fetchMindMaps(),
        fetchRoadmaps(),
      ])
      setTasks(taskData)
      setSnippets(snippetData)
      setBalance(balanceData.amount)
      setGoals(goalsData)
      setDiaryEntries(diaryData)
      setSubscriptions(subData)
      setProjects(projectData)
      setHabits(habitData)
      setMindMaps(mindMapData)
      setRoadmaps(roadmapData)
      setError('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      void loadData()
    }
  }, [loadData, user])

  useEffect(() => {
    if (snippetSelection === 'new') {
      return
    }
    if (!snippets.length) {
      setSnippetSelection('new')
      return
    }
    const selectedExists =
      typeof snippetSelection === 'number' &&
      snippets.some((snippet) => snippet.id === snippetSelection)
    if (!selectedExists) {
      setSnippetSelection(snippets[0].id)
    }
  }, [snippetSelection, snippets])

  useEffect(() => {
    const query = globalSearch.trim()
    if (!query) {
      setGlobalResults(null)
      return
    }
    const timeout = window.setTimeout(() => {
      searchAll(query)
        .then(setGlobalResults)
        .catch((requestError) => setError(errorMessage(requestError)))
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [globalSearch])

  const taskTags = useMemo(() => uniqueTags(tasks), [tasks])
  const snippetTags = useMemo(() => uniqueTags(snippets), [snippets])
  const snippetLanguages = useMemo(
    () => [...new Set(snippets.map((snippet) => snippet.language))].sort(),
    [snippets],
  )

  const filteredTasks = useMemo(
    () => filterTasks(tasks, taskFilters),
    [taskFilters, tasks],
  )
  const filteredSnippets = useMemo(
    () => filterSnippets(snippets, snippetFilters),
    [snippetFilters, snippets],
  )
  
  const filteredDiaryEntries = useMemo(() => {
    const query = diarySearch.trim().toLowerCase()
    if (!query) return diaryEntries
    return diaryEntries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query),
    )
  }, [diaryEntries, diarySearch])

  const allAttachments = useMemo(
    () => [
      ...tasks.flatMap((task) => task.attachments),
      ...snippets.flatMap((snippet) => snippet.attachments),
      ...goals.flatMap((goal) => goal.attachments),
      ...diaryEntries.flatMap((entry) => entry.attachments),
      ...projects.flatMap((proj) => proj.attachments),
    ],
    [snippets, tasks, goals, diaryEntries, projects],
  )
  const selectedSnippet =
    typeof snippetSelection === 'number'
      ? snippets.find((snippet) => snippet.id === snippetSelection) ?? null
      : null

  // Task Actions
  const openNewTask = (dateKey = selectedDate) => {
    setSelectedDate(dateKey)
    setEditingTask(null)
    setTaskDrawerOpen(true)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskDrawerOpen(true)
  }

  const saveTask = async (payload: TaskPayload, file: File | null) => {
    try {
      const saved = editingTask && editingTask.id !== 0
        ? await updateTask(editingTask.id, payload)
        : await createTask(payload)
      if (file) {
        await uploadAttachment('task', saved.id, file)
      }
      
      // Auto-add new task inside a project workspace to its mind map canvas nodes
      if (saved.projectId) {
        const proj = projects.find((p) => p.id === saved.projectId)
        if (proj) {
          let canvasNodes: any[] = []
          let canvasEdges: any[] = []
          try {
            const parsed = JSON.parse(proj.canvas_data || '{}')
            canvasNodes = parsed.nodes || []
            canvasEdges = parsed.edges || []
          } catch (e) {
            // Ignore
          }
          const exists = canvasNodes.some((n: any) => n.type === 'task' && n.taskId === saved.id)
          if (!exists) {
            canvasNodes.push({
              id: String(Date.now()),
              x: 150 + Math.random() * 100,
              y: 150 + Math.random() * 100,
              title: saved.title,
              text: saved.description || '',
              type: 'task',
              taskId: saved.id,
            })
            await updateProject(proj.id, {
              title: proj.title,
              description: proj.description,
              repo_url: proj.repo_url,
              prod_url: proj.prod_url,
              tech_stack: proj.tech_stack,
              links: proj.links,
              canvas_data: JSON.stringify({ nodes: canvasNodes, edges: canvasEdges }),
              is_completed: proj.is_completed,
            })
          }
        }
      }

      setTaskDrawerOpen(false)
      setEditingTask(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeTask = async (task: Task) => {
    if (!window.confirm(`Видалити "${task.title}"?`)) {
      return
    }
    try {
      await deleteTask(task.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Snippet Actions
  const saveSnippet = async (
    payload: SnippetPayload,
    file: File | null,
    snippet: Snippet | null,
  ) => {
    try {
      const saved = snippet ? await updateSnippet(snippet.id, payload) : await createSnippet(payload)
      if (file) {
        await uploadAttachment('snippet', saved.id, file)
      }
      setSnippetSelection(saved.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeSnippet = async (snippet: Snippet) => {
    if (!window.confirm(`Видалити "${snippet.title}"?`)) {
      return
    }
    try {
      await deleteSnippet(snippet.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Balance Actions
  const changeBalance = async (newVal: number) => {
    try {
      await updateBalance(newVal)
      setBalance(newVal)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const adjustBalance = async (offset: number) => {
    await changeBalance(balance + offset)
  }

  // Goal Actions
  const openNewGoal = () => {
    setEditingGoal(null)
    setGoalDrawerOpen(true)
  }

  const openEditGoal = (goal: FinanceGoal) => {
    setEditingGoal(goal)
    setGoalDrawerOpen(true)
  }

  const saveGoal = async (payload: FinanceGoalPayload, file: File | null) => {
    try {
      const saved = editingGoal
        ? await updateGoal(editingGoal.id, payload)
        : await createGoal(payload)
      if (file) {
        await uploadAttachment('goal', saved.id, file)
      }
      setGoalDrawerOpen(false)
      setEditingGoal(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const contributeToGoal = async (goal: FinanceGoal) => {
    const amountStr = window.prompt(`Введіть суму внеску для "${goal.title}":`, '1000')
    if (amountStr === null) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      alert('Будь ласка, введіть коректну суму.')
      return
    }
    
    const deduct = window.confirm(`Списати ${amount.toLocaleString('uk-UA')} ₴ з основного балансу грошей?`)
    if (deduct && balance < amount) {
      alert('Недостатньо коштів на балансі!')
      return
    }

    try {
      const updatedSaved = goal.saved_amount + amount
      await updateGoal(goal.id, {
        title: goal.title,
        description: goal.description,
        target_amount: goal.target_amount,
        saved_amount: updatedSaved,
        target_date: goal.target_date,
      })
      if (deduct) {
        await updateBalance(balance - amount)
      }
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const withdrawFromGoal = async (goal: FinanceGoal) => {
    const amountStr = window.prompt(`Введіть суму зняття з цілі "${goal.title}":`, '500')
    if (amountStr === null) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > goal.saved_amount) {
      alert('Некоректна сума або недостатньо збережених коштів на цілі.')
      return
    }

    const addToBalance = window.confirm(`Додати ${amount.toLocaleString('uk-UA')} ₴ назад на основний баланс?`)

    try {
      await updateGoal(goal.id, {
        title: goal.title,
        description: goal.description,
        target_amount: goal.target_amount,
        saved_amount: goal.saved_amount - amount,
        target_date: goal.target_date,
      })
      if (addToBalance) {
        await updateBalance(balance + amount)
      }
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeGoal = async (goal: FinanceGoal) => {
    if (!window.confirm(`Видалити ціль "${goal.title}"?`)) {
      return
    }
    try {
      await deleteGoal(goal.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Subscription Actions
  const openNewSub = () => {
    setEditingSub(null)
    setSubDrawerOpen(true)
  }

  const openEditSub = (sub: Subscription) => {
    setEditingSub(sub)
    setSubDrawerOpen(true)
  }

  const saveSub = async (payload: SubscriptionPayload) => {
    try {
      if (editingSub) {
        await updateSubscription(editingSub.id, payload)
      } else {
        await createSubscription(payload)
      }
      setSubDrawerOpen(false)
      setEditingSub(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeSub = async (sub: Subscription) => {
    if (!window.confirm(`Видалити підписку "${sub.title}"?`)) {
      return
    }
    try {
      await deleteSubscription(sub.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handlePaySubscription = async (sub: Subscription) => {
    const confirmPay = window.confirm(
      `Сплатити підписку "${sub.title}" на суму ${sub.amount.toLocaleString('uk-UA')} ₴?\nЦе спише гроші з балансу і перенесе платіж на наступний період.`
    )
    if (!confirmPay) return

    if (balance < sub.amount) {
      alert('Недостатньо грошей на балансі!')
      return
    }

    try {
      const nextDate = advancePaymentDate(sub.next_payment_date, sub.period)
      await updateSubscription(sub.id, {
        title: sub.title,
        amount: sub.amount,
        period: sub.period,
        next_payment_date: nextDate,
        category: sub.category,
        color: sub.color,
      })
      await updateBalance(balance - sub.amount)
      await loadData()
      alert(`Успішно сплачено підписку "${sub.title}". Наступний платіж: ${nextDate}`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Diary Actions
  const openNewDiary = () => {
    setEditingDiary(null)
    setDiaryDrawerOpen(true)
  }

  const openEditDiary = (entry: DiaryEntry) => {
    setEditingDiary(entry)
    setDiaryDrawerOpen(true)
  }

  const saveDiary = async (payload: DiaryEntryPayload, file: File | null) => {
    try {
      const saved = editingDiary
        ? await updateDiaryEntry(editingDiary.id, payload)
        : await createDiaryEntry(payload)
      if (file) {
        await uploadAttachment('diary', saved.id, file)
      }
      setDiaryDrawerOpen(false)
      setEditingDiary(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeDiary = async (entry: DiaryEntry) => {
    if (!window.confirm(`Видалити запис "${entry.title}"?`)) {
      return
    }
    try {
      await deleteDiaryEntry(entry.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Attachment Actions
  const removeAttachment = async (attachment: Attachment) => {
    if (!window.confirm(`Видалити "${attachment.originalName}"?`)) {
      return
    }
    try {
      await deleteAttachment(attachment.id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Project Actions
  const openNewProject = () => {
    setEditingProject(null)
    setProjectDrawerOpen(true)
  }

  const openEditProject = (proj: Project) => {
    setEditingProject(proj)
    setProjectDrawerOpen(true)
  }

  const saveProject = async (payload: ProjectPayload, file: File | null) => {
    try {
      const saved = editingProject
        ? await updateProject(editingProject.id, payload)
        : await createProject(payload)
      if (file) {
        await uploadAttachment('project', saved.id, file)
      }
      setProjectDrawerOpen(false)
      setEditingProject(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeProject = async (proj: Project) => {
    if (
      !window.confirm(
        `Видалити проєкт "${proj.title}"? Це також відв'яже всі пов'язані задачі та фрагменти коду.`
      )
    ) {
      return
    }
    try {
      await deleteProject(proj.id)
      setSelectedProjectId(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handleQuickCreateTask = (projId: number) => {
    setEditingTask({
      id: 0,
      title: '',
      description: '',
      type: 'task',
      status: 'todo',
      priority: 'medium',
      startAt: null,
      endAt: null,
      dueDate: todayKey(),
      color: '#a855f7',
      tags: [],
      attachments: [],
      projectId: projId,
      createdAt: '',
      updatedAt: '',
    })
    setTaskDrawerOpen(true)
  }

  const handleQuickCreateSnippet = (projId: number) => {
    setQuickSnippetProjectId(projId)
    setSection('vault')
    setSnippetSelection('new')
  }

  const saveProjectCanvas = async (projectId: number, canvasData: string) => {
    try {
      const proj = projects.find((p) => p.id === projectId)
      if (!proj) return
      await updateProject(projectId, {
        title: proj.title,
        description: proj.description,
        repo_url: proj.repo_url,
        prod_url: proj.prod_url,
        tech_stack: proj.tech_stack,
        links: proj.links,
        canvas_data: canvasData,
        is_completed: proj.is_completed,
      })
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const toggleProjectCompleted = async (proj: Project) => {
    try {
      await updateProject(proj.id, {
        title: proj.title,
        description: proj.description,
        repo_url: proj.repo_url,
        prod_url: proj.prod_url,
        tech_stack: proj.tech_stack,
        links: proj.links,
        canvas_data: proj.canvas_data,
        is_completed: !proj.is_completed,
      })
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Roadmaps Actions
  const openNewRoadmap = () => {
    setEditingRoadmap(null)
    setRoadmapDrawerOpen(true)
  }

  const openEditRoadmap = (roadmap: Roadmap) => {
    setEditingRoadmap(roadmap)
    setRoadmapDrawerOpen(true)
  }

  const saveRoadmap = async (payload: RoadmapPayload) => {
    try {
      if (editingRoadmap) {
        await updateRoadmap(editingRoadmap.id, payload)
      } else {
        await createRoadmap(payload)
      }
      setRoadmapDrawerOpen(false)
      setEditingRoadmap(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeRoadmap = async (roadmap: Roadmap) => {
    if (!window.confirm(`Видалити роадмап "${roadmap.title}"?`)) {
      return
    }
    try {
      await deleteRoadmap(roadmap.id)
      setSelectedRoadmapId(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const saveRoadmapCanvas = async (roadmapId: number, canvasData: string) => {
    try {
      const roadmap = roadmaps.find((r) => r.id === roadmapId)
      if (!roadmap) return
      await updateRoadmap(roadmapId, {
        title: roadmap.title,
        description: roadmap.description,
        canvas_data: canvasData,
      })
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  // Habits Actions
  const openNewHabit = () => {
    setEditingHabit(null)
    setHabitDrawerOpen(true)
  }

  const saveHabit = async (payload: HabitPayload) => {
    try {
      await createHabit(payload)
      setHabitDrawerOpen(false)
      setEditingHabit(null)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const removeHabit = async (id: number) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю звичку?')) {
      return
    }
    try {
      await deleteHabit(id)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handleToggleHabit = async (id: number, date: string, completed: boolean) => {
    try {
      await toggleHabit(id, date, completed)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handleCreateMindMap = () => {
    setMindMapModalOpen(true)
  }

  const submitCreateMindMap = async (title: string, description: string) => {
    try {
      const defaultNodes: MindMapNode[] = [
        {
          id: 'root',
          parentId: null,
          type: 'text',
          title: title.trim(),
          text: description.trim() || 'Головна тема',
        },
      ]
      const newMap = await createMindMap({
        title: title.trim(),
        nodes_data: JSON.stringify(defaultNodes),
      })
      setSelectedMindMapId(newMap.id)
      setMindMapModalOpen(false)
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handleRemoveMindMap = async (id: number, title: string) => {
    if (!window.confirm(`Ви дійсно хочете видалити інтелект-карту "${title}"?`)) return
    try {
      await deleteMindMap(id)
      if (selectedMindMapId === id) {
        setSelectedMindMapId(null)
      }
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const handleSaveMindMap = async (id: number, nodesData: string) => {
    try {
      const map = mindMaps.find((m) => m.id === id)
      if (!map) return
      await updateMindMap(id, {
        title: map.title,
        nodes_data: nodesData,
      })
      await loadData()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1c1c1e] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (section === 'study') {
    return <StudyPanel onExit={() => setSection('calendar')} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">N</div>
          <div>
            <p className="brand-title">NoteHub Pro</p>
            <p className="brand-subtitle">Плани, фінанси та щоденник</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                type="button"
                className={`nav-item ${section === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => setSection(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button 
            type="button"
            className="nav-item" 
            style={{ color: 'var(--red)', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }} 
            onClick={logout}
          >
            <span>🚪</span>
            Вийти
          </button>
        </div>

        <div className="sidebar-stats">
          <Stat label="Задач" value={tasks.length} />
          <Stat label="Код" value={snippets.length} />
          <Stat label="Карт" value={mindMaps.length} />
          <Stat label="Проєктів" value={projects.length} />
          <Stat label="Цілей" value={goals.length} />
          <Stat label="Підписок" value={subscriptions.length} />
          <Stat label="Записів" value={diaryEntries.length} />
          <Stat label="Файлів" value={allAttachments.length} />
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>{sectionTitle(section)}</h1>
            <p>
              {loading
                ? 'Завантаження даних...'
                : `${tasks.length} задач, ${snippets.length} фрагментів коду, ${allAttachments.length} файлів`}
            </p>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Пошук усюди..."
              />
            </label>
            {section === 'mindmaps' && (
              <button className="btn primary" type="button" onClick={handleCreateMindMap}>
                <Plus size={16} />
                Нова карта
              </button>
            )}
            {section === 'projects' && (
              <button className="btn primary" type="button" onClick={openNewProject}>
                <Plus size={16} />
                Новий проєкт
              </button>
            )}
            {section === 'vault' && (
              <button className="btn secondary" type="button" onClick={() => setSnippetSelection('new')}>
                <Code2 size={16} />
                Новий код
              </button>
            )}
            {section === 'finance' && (
              <div className="row-actions">
                <button className="btn secondary" type="button" onClick={openNewSub}>
                  <Repeat size={14} />
                  Новий платіж
                </button>
                <button className="btn primary" type="button" onClick={openNewGoal}>
                  <Plus size={16} />
                  Додати ціль
                </button>
              </div>
            )}
            {section === 'diary' && (
              <button className="btn primary" type="button" onClick={openNewDiary}>
                <Plus size={16} />
                Новий запис
              </button>
            )}
            {section === 'habits' && (
              <button className="btn primary" type="button" onClick={openNewHabit}>
                <Plus size={16} />
                Нова звичка
              </button>
            )}
            {(section === 'calendar' || section === 'tasks') && (
              <button className="btn primary" type="button" onClick={() => openNewTask()}>
                <Plus size={16} />
                Задача
              </button>
            )}
          </div>
          {globalResults ? <GlobalResults results={globalResults} /> : null}
        </header>

        {error ? (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        ) : null}

        {section === 'calendar' ? (
          <CalendarPanel
            tasks={filteredTasks}
            subscriptions={subscriptions}
            selectedDate={selectedDate}
            view={calendarView}
            filters={taskFilters}
            tags={taskTags}
            onDateChange={setSelectedDate}
            onViewChange={setCalendarView}
            onFiltersChange={setTaskFilters}
            onCreateTask={openNewTask}
            onEditTask={openEditTask}
            onPaySub={handlePaySubscription}
          />
        ) : null}

        {section === 'tasks' ? (
          <TasksPanel
            tasks={filteredTasks}
            filters={taskFilters}
            tags={taskTags}
            onFiltersChange={setTaskFilters}
            onCreateTask={() => openNewTask()}
            onEditTask={openEditTask}
            onDeleteTask={removeTask}
            onDeleteAttachment={removeAttachment}
          />
        ) : null}

        {section === 'vault' ? (
          <VaultPanel
            snippets={filteredSnippets}
            allSnippets={snippets}
            selectedSnippet={selectedSnippet}
            selection={snippetSelection}
            filters={snippetFilters}
            tags={snippetTags}
            languages={snippetLanguages}
            isFullscreenCode={isFullscreenCode}
            projects={projects}
            quickSnippetProjectId={quickSnippetProjectId}
            onSelect={setSnippetSelection}
            onFiltersChange={setSnippetFilters}
            onSave={saveSnippet}
            onDelete={removeSnippet}
            onDeleteAttachment={removeAttachment}
            setIsFullscreenCode={setIsFullscreenCode}
          />
        ) : null}

        {section === 'projects' ? (
          <ProjectsPanel
            projects={projects}
            tasks={tasks}
            snippets={snippets}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={openNewProject}
            onEditProject={openEditProject}
            onDeleteProject={removeProject}
            onDeleteAttachment={removeAttachment}
            onQuickCreateTask={handleQuickCreateTask}
            onQuickCreateSnippet={handleQuickCreateSnippet}
            onSaveCanvas={saveProjectCanvas}
            onUpdateTask={async (id, payload) => {
              try {
                await updateTask(id, payload)
                await loadData()
              } catch (requestError) {
                setError(errorMessage(requestError))
              }
            }}
            setSection={setSection}
            setSnippetSelection={setSnippetSelection}
            openEditTask={openEditTask}
            onRefreshData={loadData}
            onToggleProjectCompleted={toggleProjectCompleted}
          />
        ) : null}

        {section === 'mindmaps' ? (
          <MindMapsPanel
            mindMaps={mindMaps}
            tasks={tasks}
            snippets={snippets}
            selectedMindMapId={selectedMindMapId}
            onSelectMindMap={setSelectedMindMapId}
            onCreateMindMap={handleCreateMindMap}
            onDeleteMindMap={handleRemoveMindMap}
            onSaveMindMap={handleSaveMindMap}
            setSection={setSection}
            setSnippetSelection={setSnippetSelection}
            openEditTask={openEditTask}
            onRefreshData={loadData}
          />
        ) : null}

        {section === 'roadmaps' ? (
          <RoadmapsPanel
            roadmaps={roadmaps}
            selectedRoadmapId={selectedRoadmapId}
            onSelectRoadmap={setSelectedRoadmapId}
            onCreateRoadmap={openNewRoadmap}
            onEditRoadmap={openEditRoadmap}
            onDeleteRoadmap={removeRoadmap}
            onSaveCanvas={saveRoadmapCanvas}
          />
        ) : null}

        {section === 'finance' ? (
          <FinancePanel
            balance={balance}
            goals={goals}
            subscriptions={subscriptions}
            onChangeBalance={changeBalance}
            onAdjustBalance={adjustBalance}
            onContribute={contributeToGoal}
            onWithdraw={withdrawFromGoal}
            onEditGoal={openEditGoal}
            onDeleteGoal={removeGoal}
            onEditSub={openEditSub}
            onDeleteSub={removeSub}
            onPaySub={handlePaySubscription}
            onAddSub={openNewSub}
          />
        ) : null}

        {section === 'diary' ? (
          <DiaryPanel
            diarySearch={diarySearch}
            setDiarySearch={setDiarySearch}
            entries={filteredDiaryEntries}
            onEdit={openEditDiary}
            onDelete={removeDiary}
          />
        ) : null}

        {section === 'habits' ? (
          <HabitsPanel
            habits={habits}
            onCreateHabit={openNewHabit}
            onToggleHabit={handleToggleHabit}
            onDeleteHabit={removeHabit}
          />
        ) : null}

        {section === 'files' ? (
          <FilesPanel
            attachments={allAttachments}
            tasks={tasks}
            snippets={snippets}
            goals={goals}
            diaryEntries={diaryEntries}
            projects={projects}
            onDeleteAttachment={removeAttachment}
          />
        ) : null}
      </main>

      <TaskDrawer
        open={taskDrawerOpen}
        task={editingTask}
        defaultDate={selectedDate}
        projects={projects}
        onClose={() => {
          setTaskDrawerOpen(false)
          setEditingTask(null)
        }}
        onSubmit={saveTask}
      />

      <ProjectDrawer
        open={projectDrawerOpen}
        project={editingProject}
        onClose={() => {
          setProjectDrawerOpen(false)
          setEditingProject(null)
        }}
        onSubmit={saveProject}
      />

      <RoadmapDrawer
        open={roadmapDrawerOpen}
        roadmap={editingRoadmap}
        onClose={() => {
          setRoadmapDrawerOpen(false)
          setEditingRoadmap(null)
        }}
        onSubmit={saveRoadmap}
      />

      <GoalDrawer
        open={goalDrawerOpen}
        goal={editingGoal}
        onClose={() => {
          setGoalDrawerOpen(false)
          setEditingGoal(null)
        }}
        onSubmit={saveGoal}
      />

      <DiaryDrawer
        open={diaryDrawerOpen}
        entry={editingDiary}
        onClose={() => {
          setDiaryDrawerOpen(false)
          setEditingDiary(null)
        }}
        onSubmit={saveDiary}
      />

      <SubscriptionDrawer
        open={subDrawerOpen}
        sub={editingSub}
        onClose={() => {
          setSubDrawerOpen(false)
          setEditingSub(null)
        }}
        onSubmit={saveSub}
      />

      <HabitDrawer
        open={habitDrawerOpen}
        habit={editingHabit}
        onClose={() => {
          setHabitDrawerOpen(false)
          setEditingHabit(null)
        }}
        onSubmit={saveHabit}
      />

      <MindMapModal
        open={mindMapModalOpen}
        onClose={() => setMindMapModalOpen(false)}
        onSubmit={submitCreateMindMap}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function GlobalResults({ results }: { results: any }) {
  return (
    <div className="global-results">
      <div>
        <ListChecks size={16} />
        <span>Знайдено задач: {results.tasks.length}</span>
      </div>
      <div>
        <Code2 size={16} />
        <span>Знайдено коду: {results.snippets.length}</span>
      </div>
    </div>
  )
}

function filterTasks(tasks: any[], filters: any) {
  const query = filters.search.trim().toLowerCase()
  return tasks.filter((task) => {
    const matchesQuery =
      !query ||
      `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query)
    const matchesType = filters.type === 'all' || task.type === filters.type
    const matchesStatus = filters.status === 'all' || task.status === filters.status
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority
    const matchesTag = filters.tag === 'all' || task.tags.includes(filters.tag)
    return matchesQuery && matchesType && matchesStatus && matchesPriority && matchesTag
  })
}

function filterSnippets(snippets: any[], filters: any) {
  const query = filters.search.trim().toLowerCase()
  return snippets.filter((snippet) => {
    const matchesQuery =
      !query ||
      `${snippet.title} ${snippet.language} ${snippet.explanation} ${snippet.code} ${snippet.tags.join(' ')}`
        .toLowerCase()
        .includes(query)
    const matchesLanguage = filters.language === 'all' || snippet.language === filters.language
    const matchesTag = filters.tag === 'all' || snippet.tags.includes(filters.tag)
    return matchesQuery && matchesLanguage && matchesTag
  })
}

function uniqueTags(items: Array<{ tags: string[] }>) {
  return [...new Set(items.flatMap((item) => item.tags))].sort()
}

function sectionTitle(section: any) {
  const titles: Record<string, string> = {
    calendar: 'Календар',
    tasks: 'Задачі та плани',
    vault: 'Сховище коду',
    finance: 'Фінансові цілі',
    diary: 'Особистий щоденник',
    files: 'Всі файли',
    projects: 'Проєкти та розробка',
    roadmaps: 'Роадмапи та плани навчання',
    habits: 'Звички та продуктивність',
    mindmaps: 'Інтелект-карти',
    study: 'NoteHub Study',
  }
  return titles[section]
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Щось пішло не так'
}

export default App;
