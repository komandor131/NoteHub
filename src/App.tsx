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
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { marked } from 'marked'
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

// MathContent component to render LaTeX and Markdown
function MathContent({ content }: { content: string }) {
  const html = useMemo(() => {
    if (!content) return '';

    const mathBlocks: string[] = [];
    const mathInlines: string[] = [];

    // 1. Replace block math $$ ... $$
    let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const placeholder = `MATHBLOCKXYZ${mathBlocks.length}XYZ`;
      mathBlocks.push(math);
      return placeholder;
    });

    // 2. Replace inline math $ ... $
    processed = processed.replace(/\$([\s\S]*?)\$/g, (_, math) => {
      const placeholder = `MATHINLINEXYZ${mathInlines.length}XYZ`;
      mathInlines.push(math);
      return placeholder;
    });

    // 3. Render Markdown to HTML using marked
    let htmlContent = marked.parse(processed) as string;

    // 4. Post-process GitHub Alerts
    htmlContent = htmlContent.replace(/<blockquote>\s*<p>\[!(\w+)\](?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi, (_, type, body) => {
      let color = '#3b82f6';
      let title = 'ℹ️ Примітка';
      if (type === 'WARNING') { color = '#ef4444'; title = '⚠️ Увага'; }
      else if (type === 'IMPORTANT') { color = 'var(--pink)'; title = '📝 Важливо'; }
      else if (type === 'TIP') { color = '#10b981'; title = '💡 Корисна порада'; }
      
      return `<div class="alert-box alert-${type.toLowerCase()}" style="margin: 18px 0; padding: 16px; border-left: 4px solid ${color}; background: rgba(255, 255, 255, 0.015); border-radius: 8px; font-size: 13.5px; lineHeight: 1.55;">
        <strong style="display: block; margin-bottom: 6px; color: ${color}; font-weight: 600;">${title}</strong>
        <div style="color: #cccccc;">${body.trim()}</div>
      </div>`;
    });

    // 5. Restore block math
    mathBlocks.forEach((math, index) => {
      try {
        const rendered = katex.renderToString(math, { displayMode: true, throwOnError: false });
        const wrapped = `<p>MATHBLOCKXYZ${index}XYZ</p>`;
        if (htmlContent.includes(wrapped)) {
          htmlContent = htmlContent.replace(wrapped, rendered);
        } else {
          htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, rendered);
        }
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHBLOCKXYZ${index}XYZ`, `<pre>${math}</pre>`);
      }
    });

    // 6. Restore inline math
    mathInlines.forEach((math, index) => {
      try {
        const rendered = katex.renderToString(math, { displayMode: false, throwOnError: false });
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, rendered);
      } catch (e) {
        htmlContent = htmlContent.replace(`MATHINLINEXYZ${index}XYZ`, `<code>${math}</code>`);
      }
    });

    return htmlContent;
  }, [content]);

  if (!content) return null;

  return (
    <div 
      className="math-notes-content" 
      style={{ 
        color: '#cccccc', 
        fontSize: '13.5px', 
        lineHeight: '1.6',
      }} 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
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
} from './types'

type Section = 'calendar' | 'tasks' | 'vault' | 'finance' | 'diary' | 'files' | 'projects' | 'habits' | 'mindmaps' | 'roadmaps'
type SnippetSelection = number | 'new' | null

interface TaskFilters {
  search: string
  type: 'all' | TaskType
  status: 'all' | TaskStatus
  priority: 'all' | TaskPriority
  tag: 'all' | string
}

interface SnippetFilters {
  search: string
  language: 'all' | string
  tag: 'all' | string
}

interface TaskFormState {
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  startAt: string
  endAt: string
  dueDate: string
  color: string
  tagsText: string
  projectId: string
}

interface SnippetFormState {
  title: string
  language: string
  code: string
  explanation: string
  tagsText: string
  projectId: string
}

interface GoalFormState {
  title: string
  description: string
  target_amount: string
  saved_amount: string
  target_date: string
}

interface DiaryFormState {
  title: string
  content: string
  date: string
}

interface SubscriptionFormState {
  title: string
  amount: string
  period: 'monthly' | 'weekly'
  next_payment_date: string
  category: string
  color: string
}

const taskTypeOptions: TaskType[] = ['task', 'event', 'deadline', 'note']
const statusOptions: TaskStatus[] = ['todo', 'in-progress', 'done', 'archived']
const priorityOptions: TaskPriority[] = ['low', 'medium', 'high']
const calendarViews: CalendarView[] = ['month', 'week', 'day']
const languageOptions = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'css',
  'html',
  'json',
  'python',
  'sql',
  'bash',
]

const typeLabels: Record<TaskType, string> = {
  task: 'Задача',
  event: 'Подія',
  deadline: 'Дедлайн',
  note: 'Нотатка',
}

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Треба зробити',
  'in-progress': 'Виконується',
  done: 'Готово',
  archived: 'В архіві',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Низький',
  medium: 'Середній',
  high: 'Високий',
}

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

const getConnectionPoints = (
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

const getBezierPath = (
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

function App() {
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
    void loadData()
  }, [loadData])

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

function CalendarPanel({
  tasks,
  subscriptions,
  selectedDate,
  view,
  filters,
  tags,
  onDateChange,
  onViewChange,
  onFiltersChange,
  onCreateTask,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  view: CalendarView
  filters: TaskFilters
  tags: string[]
  onDateChange: (date: string) => void
  onViewChange: (view: CalendarView) => void
  onFiltersChange: (filters: TaskFilters) => void
  onCreateTask: (date: string) => void
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const unit = view === 'month' ? 'month' : view === 'week' ? 'week' : 'day'
  const selectedTasks = tasks.filter((task) => taskTouchesDay(task, selectedDate))
  const selectedSubs = subscriptions.filter((sub) => sub.next_payment_date === selectedDate)

  return (
    <section className="workspace-grid">
      <div className="panel calendar-panel">
        <div className="panel-header">
          <div>
            <p className="kicker">Планувальник</p>
            <h2>{view === 'day' ? formatLongDate(selectedDate) : getCalendarTitle(selectedDate)}</h2>
          </div>
          <div className="calendar-tools">
            <button
              className="icon-btn"
              type="button"
              onClick={() => onDateChange(shiftDate(selectedDate, -1, unit))}
              aria-label="Попередній період"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              className="date-control"
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
            />
            <button
              className="icon-btn"
              type="button"
              onClick={() => onDateChange(shiftDate(selectedDate, 1, unit))}
              aria-label="Наступний період"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="segmented">
          {calendarViews.map((item) => (
            <button
              key={item}
              type="button"
              className={view === item ? 'active' : ''}
              onClick={() => onViewChange(item)}
            >
              {item === 'month' ? 'Місяць' : item === 'week' ? 'Тиждень' : 'День'}
            </button>
          ))}
        </div>

        {view === 'month' ? (
          <MonthCalendar
            tasks={tasks}
            subscriptions={subscriptions}
            selectedDate={selectedDate}
            onSelectDate={onDateChange}
            onCreateTask={onCreateTask}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}

        {view === 'week' ? (
          <WeekCalendar
            tasks={tasks}
            subscriptions={subscriptions}
            selectedDate={selectedDate}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}

        {view === 'day' ? (
          <DayCalendar
            tasks={selectedTasks}
            subscriptions={selectedSubs}
            selectedDate={selectedDate}
            onEditTask={onEditTask}
            onPaySub={onPaySub}
          />
        ) : null}
      </div>

      <aside className="panel side-panel">
        <div className="panel-header compact">
          <div>
            <p className="kicker">Обраний день</p>
            <h2>{formatLongDate(selectedDate)}</h2>
          </div>
          <button className="icon-btn pink" type="button" onClick={() => onCreateTask(selectedDate)}>
            <Plus size={18} />
          </button>
        </div>
        <TaskFiltersBox
          filters={filters}
          tags={tags}
          onChange={onFiltersChange}
          compact
        />
        <div className="agenda-list">
          {selectedSubs.map((sub) => (
            <button
              key={`side-sub-${sub.id}`}
              type="button"
              className="task-row"
              style={{ borderColor: sub.color }}
              onClick={() => void onPaySub(sub)}
            >
              <span className="task-dot" style={{ background: sub.color }} />
              <span>
                <strong>💸 {sub.title} ({sub.amount} ₴)</strong>
                <small>Регулярний платіж · Натисніть, щоб сплатити</small>
              </span>
            </button>
          ))}

          {selectedTasks.length ? (
            selectedTasks.map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
            ))
          ) : null}

          {!selectedTasks.length && !selectedSubs.length ? (
            <EmptyState
              icon={<Clock3 size={22} />}
              title="Немає планів на цей день"
              text="Створіть задачу, або подивіться регулярні платежі."
            />
          ) : null}
        </div>
      </aside>
    </section>
  )
}

function MonthCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onSelectDate,
  onCreateTask,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onCreateTask: (date: string) => void
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const cells = getMonthCells(selectedDate)
  return (
    <div className="month-calendar">
      {dayNames.map((day) => (
        <div className="weekday" key={day}>
          {day}
        </div>
      ))}
      {cells.map((cell) => {
        const cellTasks = tasks.filter((task) => taskTouchesDay(task, cell.key))
        const cellSubs = subscriptions.filter((sub) => sub.next_payment_date === cell.key)
        return (
          <button
            type="button"
            className={`month-cell ${cell.inMonth ? '' : 'muted'} ${
              selectedDate === cell.key ? 'selected' : ''
            } ${cell.isToday ? 'today' : ''}`}
            key={cell.key}
            onClick={() => onSelectDate(cell.key)}
            onDoubleClick={() => onCreateTask(cell.key)}
          >
            <span className="cell-date">{cell.date.getDate()}</span>
            <span className="cell-stack">
              {cellSubs.map((sub) => (
                <span
                  className="calendar-sub-chip"
                  style={{ borderLeftColor: sub.color }}
                  key={`sub-${sub.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    void onPaySub(sub)
                  }}
                >
                  💸 {sub.title} ({sub.amount} ₴)
                </span>
              ))}

              {cellTasks.slice(0, 3).map((task) => (
                <span
                  className="calendar-chip"
                  style={{ borderLeftColor: task.color }}
                  key={task.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditTask(task)
                  }}
                >
                  {task.title}
                </span>
              ))}
              {cellTasks.length + cellSubs.length > 3 ? (
                <span className="more-count">ще +{cellTasks.length + cellSubs.length - 3}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function WeekCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const days = getWeekDays(selectedDate)
  const hours = Array.from({ length: 12 }, (_, index) => index + 8)

  return (
    <div className="week-calendar">
      <div className="week-corner" />
      {days.map((date) => {
        const key = toDateKey(date)
        return (
          <div className="week-day-head" key={key}>
            <span>{dayNames[(date.getDay() + 6) % 7]}</span>
            <strong>{date.getDate()}</strong>
          </div>
        )
      })}
      {hours.map((hour) => (
        <div className="week-row" key={hour}>
          <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
          {days.map((date) => {
            const key = toDateKey(date)
            const hourTasks = tasks.filter(
              (task) => taskTouchesDay(task, key) && taskHour(task) === hour,
            )
            const hourSubs = hour === 9 ? subscriptions.filter((sub) => sub.next_payment_date === key) : []
            return (
              <div className="week-slot" key={`${key}-${hour}`}>
                {hourSubs.map((sub) => (
                  <button
                    type="button"
                    className="week-task"
                    style={{ borderLeftColor: sub.color, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
                    key={`sub-${sub.id}`}
                    onClick={() => void onPaySub(sub)}
                  >
                    💸 {sub.title} ({sub.amount} ₴)
                  </button>
                ))}
                {hourTasks.map((task) => (
                  <button
                    type="button"
                    className="week-task"
                    style={{ borderLeftColor: task.color }}
                    key={task.id}
                    onClick={() => onEditTask(task)}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function DayCalendar({
  tasks,
  subscriptions,
  selectedDate,
  onEditTask,
  onPaySub,
}: {
  tasks: Task[]
  subscriptions: Subscription[]
  selectedDate: string
  onEditTask: (task: Task) => void
  onPaySub: (sub: Subscription) => Promise<void>
}) {
  const hours = Array.from({ length: 14 }, (_, index) => index + 7)
  const untimed = tasks.filter((task) => taskHour(task) === null)

  return (
    <div className="day-calendar">
      <div className="day-title">
        <CalendarDays size={18} />
        <span>{formatLongDate(selectedDate)}</span>
      </div>

      {hours.map((hour) => {
        const hourTasks = tasks.filter((task) => taskHour(task) === hour)
        const hourSubs = hour === 9 ? subscriptions.filter((sub) => sub.next_payment_date === selectedDate) : []
        return (
          <div className="day-row" key={hour}>
            <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
            <div className="day-slot">
              {hourSubs.map((sub) => (
                <button
                  key={`day-sub-${sub.id}`}
                  type="button"
                  className="task-row"
                  style={{ borderColor: sub.color }}
                  onClick={() => void onPaySub(sub)}
                >
                  <span className="task-dot" style={{ background: sub.color }} />
                  <span>
                    <strong>💸 {sub.title} ({sub.amount} ₴)</strong>
                    <small>Регулярний платіж (9:00)</small>
                  </span>
                </button>
              ))}

              {hourTasks.map((task) => (
                <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
              ))}
            </div>
          </div>
        )
      })}
      {untimed.length ? (
        <div className="untimed-block">
          <p className="kicker">Без точного часу</p>
          {untimed.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onEditTask(task)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function TasksPanel({
  tasks,
  filters,
  tags,
  onFiltersChange,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onDeleteAttachment,
}: {
  tasks: Task[]
  filters: TaskFilters
  tags: string[]
  onFiltersChange: (filters: TaskFilters) => void
  onCreateTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDeleteAttachment: (attachment: Attachment) => void
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="kicker">База даних задач</p>
          <h2>Всі задачі та плани</h2>
        </div>
        <button className="btn primary" type="button" onClick={onCreateTask}>
          <Plus size={16} />
          Створити задачу
        </button>
      </div>
      <TaskFiltersBox filters={filters} tags={tags} onChange={onFiltersChange} />
      <div className="task-board">
        {tasks.length ? (
          tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-card-header">
                <div>
                  <TaskMeta task={task} />
                  <h3>{task.title}</h3>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" type="button" onClick={() => onEditTask(task)}>
                    <FileText size={17} />
                  </button>
                  <button className="icon-btn danger" type="button" onClick={() => onDeleteTask(task)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <p>{task.description || 'Опис відсутній.'}</p>
              <div className="tag-list">
                {task.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <AttachmentList attachments={task.attachments} onDelete={onDeleteAttachment} />
            </article>
          ))
        ) : (
          <EmptyState
            icon={<Filter size={22} />}
            title="Задач не знайдено за такими фільтрами"
            text="Спробуйте змінити фільтри або створити нову задачу."
          />
        )}
      </div>
    </section>
  )
}

function VaultPanel({
  snippets,
  allSnippets,
  selectedSnippet,
  selection,
  filters,
  tags,
  languages,
  isFullscreenCode,
  projects,
  quickSnippetProjectId,
  onSelect,
  onFiltersChange,
  onSave,
  onDelete,
  onDeleteAttachment,
  setIsFullscreenCode,
}: {
  snippets: Snippet[]
  allSnippets: Snippet[]
  selectedSnippet: Snippet | null
  selection: SnippetSelection
  filters: SnippetFilters
  tags: string[]
  languages: string[]
  isFullscreenCode: boolean
  projects: Project[]
  quickSnippetProjectId: number | null
  onSelect: (selection: SnippetSelection) => void
  onFiltersChange: (filters: SnippetFilters) => void
  onSave: (payload: SnippetPayload, file: File | null, snippet: Snippet | null) => Promise<void>
  onDelete: (snippet: Snippet) => void
  onDeleteAttachment: (attachment: Attachment) => void
  setIsFullscreenCode: (v: boolean) => void
}) {
  const [form, setForm] = useState<SnippetFormState>(snippetToForm(selectedSnippet))
  const [file, setFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (selection === 'new') {
      setForm({
        title: '',
        language: 'typescript',
        code: '',
        explanation: '',
        tagsText: '',
        projectId: quickSnippetProjectId ? String(quickSnippetProjectId) : '',
      })
    } else {
      setForm(snippetToForm(selectedSnippet))
    }
    setFile(null)
  }, [selectedSnippet, selection, quickSnippetProjectId])

  const isNew = selection === 'new'

  const submit = async (event?: FormEvent) => {
    if (event) event.preventDefault()
    await onSave(snippetPayload(form), file, isNew ? null : selectedSnippet)
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(form.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Не вдалося скопіювати.')
    }
  }

  return (
    <section className="vault-grid">
      <aside className="panel snippet-list-panel">
        <div className="panel-header compact">
          <div>
            <p className="kicker">Сховище коду</p>
            <h2>Фрагменти</h2>
          </div>
          <button className="icon-btn pink" type="button" onClick={() => onSelect('new')}>
            <Plus size={18} />
          </button>
        </div>
        <SnippetFiltersBox
          filters={filters}
          tags={tags}
          languages={languages}
          onChange={onFiltersChange}
        />
        <div className="snippet-list">
          {snippets.map((snippet) => (
            <button
              className={`snippet-row ${selectedSnippet?.id === snippet.id ? 'active' : ''}`}
              type="button"
              key={snippet.id}
              onClick={() => onSelect(snippet.id)}
            >
              <span className="snippet-row-icon">
                <FileCode2 size={17} />
              </span>
              <span>
                <strong>{snippet.title}</strong>
                <small>
                  {snippet.language} · {snippet.tags.join(', ') || 'без тегів'}
                </small>
              </span>
            </button>
          ))}
          {!snippets.length ? (
            <EmptyState
              icon={<Code2 size={22} />}
              title={allSnippets.length ? 'Нічого не знайдено' : 'База коду порожня'}
              text="Створіть свій перший фрагмент коду."
            />
          ) : null}
        </div>
      </aside>

      <form className="panel editor-panel" onSubmit={submit}>
        <div className="panel-header">
          <div>
            <p className="kicker">{isNew ? 'Нова картка коду' : 'Міні IDE'}</p>
            <h2>{isNew ? 'Створити код' : selectedSnippet?.title ?? 'Редактор коду'}</h2>
          </div>
          <div className="row-actions">
            {selectedSnippet ? (
              <button className="icon-btn danger" type="button" onClick={() => onDelete(selectedSnippet)}>
                <Trash2 size={17} />
              </button>
            ) : null}
            <button className="btn secondary" type="button" onClick={copyToClipboard}>
              {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              {copied ? 'Скопійовано!' : 'Копіювати'}
            </button>
            <button className="btn secondary" type="button" onClick={() => setIsFullscreenCode(true)}>
              <Maximize2 size={14} />
              На весь екран
            </button>
            <button className="btn primary" type="submit">
              <Save size={16} />
              Зберегти
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>Назва коду</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Мова</span>
            <select
              value={form.language}
              onChange={(event) => setForm({ ...form, language: event.target.value })}
            >
              {languageOptions.map((language) => (
                <option value={language} key={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Проєкт</span>
            <select
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Без проєкту</option>
              {projects.map((proj) => (
                <option value={proj.id} key={proj.id}>
                  {proj.title} {proj.is_completed ? '(Завершено)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Теги</span>
            <input
              value={form.tagsText}
              onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              placeholder="react, api, auth"
            />
          </label>
        </div>

        <div className="editor-frame">
          <Editor
            height="360px"
            language={form.language || 'typescript'}
            theme="vs-dark"
            value={form.code}
            onChange={(value) => setForm({ ...form, code: value ?? '' })}
            options={{
              automaticLayout: true,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </div>

        <label>
          <span>Пояснення / Нотатки</span>
          <textarea
            value={form.explanation}
            onChange={(event) => setForm({ ...form, explanation: event.target.value })}
            rows={5}
          />
        </label>

        <div className="upload-strip">
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList
            attachments={selectedSnippet?.attachments ?? []}
            onDelete={onDeleteAttachment}
          />
        </div>
      </form>

      {/* Fullscreen Code Editor Overlay */}
      {isFullscreenCode && (
        <div className="fullscreen-editor-backdrop">
          <div className="fullscreen-editor-header">
            <h3>{form.title || 'Редактор коду'} ({form.language})</h3>
            <div className="row-actions">
              <button className="btn secondary" type="button" onClick={copyToClipboard}>
                {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                {copied ? 'Скопійовано!' : 'Копіювати код'}
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  void submit()
                  setIsFullscreenCode(false)
                }}
              >
                <Save size={14} />
                Зберегти
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={() => setIsFullscreenCode(false)}
                aria-label="Вийти з повного екрана"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>
          <div className="fullscreen-editor-body">
            <Editor
              height="100%"
              language={form.language || 'typescript'}
              theme="vs-dark"
              value={form.code}
              onChange={(value) => setForm({ ...form, code: value ?? '' })}
              options={{
                automaticLayout: true,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize: 16,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}

function FinancePanel({
  balance,
  goals,
  subscriptions,
  onChangeBalance,
  onAdjustBalance,
  onContribute,
  onWithdraw,
  onEditGoal,
  onDeleteGoal,
  onEditSub,
  onDeleteSub,
  onPaySub,
  onAddSub,
}: {
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
}) {
  const [balanceEditOpen, setBalanceEditOpen] = useState(false)
  const [customBalanceInput, setCustomBalanceInput] = useState(String(balance))
  
  // Finance Sub-tab
  const [activeFinanceTab, setActiveFinanceTab] = useState<'goals' | 'calculators'>('goals')
  
  // Financial Calculator States
  const [monthlySavingsInput, setMonthlySavingsInput] = useState('3000')
  const [principalInput, setPrincipalInput] = useState('10000')
  const [monthlyAddInput, setMonthlyAddInput] = useState('2000')
  const [interestInput, setInterestInput] = useState('12')
  const [yearsInput, setYearsInput] = useState('5')

  // Target Cost Split Calculator States
  const [splitCostInput, setSplitCostInput] = useState('12000')
  const [splitMonthlyInput, setSplitMonthlyInput] = useState('1000')
  const [splitMonthsInput, setSplitMonthsInput] = useState('12')
  const [splitCalcMode, setSplitCalcMode] = useState<'time' | 'amount'>('time')

  useEffect(() => {
    setCustomBalanceInput(String(balance))
  }, [balance])

  const handleBalanceSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(customBalanceInput)
    if (isNaN(parsed)) {
      alert('Будь ласка, введіть коректну суму.')
      return
    }
    void onChangeBalance(parsed)
    setBalanceEditOpen(false)
  }

  return (
    <div className="finance-wrapper">
      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-amount-display">
          <h3>Мій гаманець</h3>
          {balanceEditOpen ? (
            <form onSubmit={handleBalanceSubmit} className="row-actions" style={{ marginTop: '8px' }}>
              <input
                className="date-control"
                style={{ width: '160px', height: '36px' }}
                value={customBalanceInput}
                onChange={(e) => setCustomBalanceInput(e.target.value)}
                autoFocus
              />
              <button className="btn primary" type="submit" style={{ minHeight: '36px', padding: '0 12px' }}>
                Так
              </button>
              <button
                className="btn secondary"
                type="button"
                style={{ minHeight: '36px', padding: '0 12px' }}
                onClick={() => setBalanceEditOpen(false)}
              >
                Скасувати
              </button>
            </form>
          ) : (
            <div className="row-actions" style={{ gap: '14px' }}>
              <p className="balance-amount">{balance.toLocaleString('uk-UA')} ₴</p>
              <button
                className="btn secondary"
                style={{ minHeight: '28px', padding: '0 8px', fontSize: '12px' }}
                onClick={() => setBalanceEditOpen(true)}
              >
                Редагувати
              </button>
            </div>
          )}
          <p className="brand-subtitle" style={{ color: 'var(--muted)' }}>Поточний баланс грошей на даний момент</p>
        </div>

        <div className="balance-actions-block">
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Швидкі операції
          </span>
          <div className="balance-presets">
            <button className="balance-preset-btn" onClick={() => onAdjustBalance(100)}>+100 ₴</button>
            <button className="balance-preset-btn" onClick={() => onAdjustBalance(500)}>+500 ₴</button>
            <button className="balance-preset-btn" onClick={() => onAdjustBalance(1000)}>+1 000 ₴</button>
            <button className="balance-preset-btn" onClick={() => onAdjustBalance(-500)}>-500 ₴</button>
            <button className="balance-preset-btn" onClick={() => onAdjustBalance(-1000)}>-1 000 ₴</button>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '24px', marginBottom: '16px' }}>
        <button
          className={`btn ${activeFinanceTab === 'goals' ? 'primary' : 'secondary'}`}
          type="button"
          onClick={() => setActiveFinanceTab('goals')}
        >
          🎯 Цілі та регулярні платежі
        </button>
        <button
          className={`btn ${activeFinanceTab === 'calculators' ? 'primary' : 'secondary'}`}
          type="button"
          onClick={() => setActiveFinanceTab('calculators')}
        >
          🧮 Фінансовий аналіз та калькулятори
        </button>
      </div>

      {activeFinanceTab === 'goals' && (
        <div className="workspace-grid" style={{ marginTop: '16px' }}>
          {/* Left Side: Savings Goals */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <TrendingUp size={18} className="pink" />
              Цілі заощаджень (Бажання)
            </h2>
            
            <div className="finance-goals-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {goals.map((goal) => {
                const photoAttachment = goal.attachments.find(
                  (a) => a.mimeType.startsWith('image/')
                )
                const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100)) : 0

                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-img-container" style={{ height: '140px' }}>
                      {photoAttachment ? (
                        <img
                          className="goal-img"
                          src={`/uploads/${encodeURIComponent(photoAttachment.storedName)}`}
                          alt={goal.title}
                        />
                      ) : (
                        <div className="goal-no-img">
                          <DollarSign size={24} />
                          <span>Немає фото</span>
                        </div>
                      )}
                    </div>

                    <div className="goal-info">
                      <h3>{goal.title}</h3>
                      <p className="goal-desc">{goal.description || 'Опис цілі відсутній.'}</p>
                    </div>

                    <div className="goal-progress-section">
                      <div className="goal-progress-labels">
                        <span className="saved">{goal.saved_amount.toLocaleString('uk-UA')} ₴</span>
                        <span className="target">{goal.target_amount.toLocaleString('uk-UA')} ₴ ({percent}%)</span>
                      </div>
                      <div className="goal-progress-track">
                        <div className="goal-progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="goal-meta">
                      <span>{goal.target_date ? `До: ${formatShortDate(goal.target_date)}` : 'Термін не вказано'}</span>
                      <div className="row-actions" style={{ gap: '4px' }}>
                        <button className="icon-btn" style={{ width: '28px', height: '28px' }} type="button" onClick={() => onEditGoal(goal)}>
                          <FileText size={13} />
                        </button>
                        <button className="icon-btn danger" style={{ width: '28px', height: '28px' }} type="button" onClick={() => onDeleteGoal(goal)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="goal-card-actions">
                      <button className="btn primary" style={{ flex: 1, minHeight: '30px' }} onClick={() => onContribute(goal)}>
                        Внести накопичення
                      </button>
                      <button className="btn secondary" style={{ minHeight: '30px' }} onClick={() => onWithdraw(goal)}>
                        Зняти
                      </button>
                    </div>
                  </article>
                )
              })}

              {!goals.length && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <EmptyState
                    icon={<Wallet size={20} />}
                    title="Немає цілей заощадження"
                    text="Створіть ціль, вкажіть суму, завантажте фото речі та відстежуйте свій прогрес."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Recurring Payments */}
          <aside className="panel" style={{ padding: '20px' }}>
            <div className="panel-header compact" style={{ padding: '0 0 12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={16} className="pink" />
                Регулярні платежі
              </h2>
              <button className="icon-btn pink" style={{ width: '28px', height: '28px' }} onClick={onAddSub}>
                <Plus size={16} />
              </button>
            </div>

            <div className="subscriptions-list-container">
              {subscriptions.map((sub) => (
                <div className="subscription-row-card" key={sub.id}>
                  <div className="subscription-left">
                    <div className="subscription-icon-box" style={{ color: sub.color }}>
                      💸
                    </div>
                    <div className="subscription-details">
                      <h4>{sub.title}</h4>
                      <p>
                        {sub.period === 'weekly' ? 'Щотижня' : 'Щомісяця'} · {formatShortDate(sub.next_payment_date)}
                      </p>
                    </div>
                  </div>

                  <div className="subscription-right">
                    <div className="subscription-cost">{sub.amount} ₴</div>
                    <div className="row-actions" style={{ gap: '2px' }}>
                      <button
                        className="btn primary"
                        style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }}
                        onClick={() => void onPaySub(sub)}
                      >
                        Сплатити
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => onEditSub(sub)}
                      >
                        <FileText size={12} />
                      </button>
                      <button
                        className="icon-btn danger"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => void onDeleteSub(sub)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!subscriptions.length && (
                <EmptyState
                  icon={<Repeat size={18} />}
                  title="Немає підписок"
                  text="Додайте регулярні витрати (Netflix, оренду), щоб вони виводились на календар."
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {activeFinanceTab === 'calculators' && (
        <div className="finance-split-grid" style={{ marginTop: '16px' }}>
          {/* Left Column: Target Cost Splitter & Goal Forecast Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Target Cost Split Calculator */}
            <div className="financial-projection-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="pink" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                  Калькулятор планування цілі
                </h3>
              </div>
              
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                Швидко розбийте вартість великої покупки на частини, щоб зрозуміти, скільки потрібно відкладати або скільки часу це займе.
              </p>

              <div className="form-group">
                <label className="form-label">Вартість покупки / цілі (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={splitCostInput}
                  onChange={(e) => setSplitCostInput(e.target.value)}
                  placeholder="Наприклад: 12000"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', background: '#09090b', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className={`btn ${splitCalcMode === 'time' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, minHeight: '30px', fontSize: '11px', padding: '0 4px' }}
                  onClick={() => setSplitCalcMode('time')}
                >
                  📅 Розрахувати час
                </button>
                <button
                  type="button"
                  className={`btn ${splitCalcMode === 'amount' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, minHeight: '30px', fontSize: '11px', padding: '0 4px' }}
                  onClick={() => setSplitCalcMode('amount')}
                >
                  💰 Розрахувати суму
                </button>
              </div>

              {splitCalcMode === 'time' ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Щомісячний внесок (₴)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={splitMonthlyInput}
                      onChange={(e) => setSplitMonthlyInput(e.target.value)}
                      placeholder="Наприклад: 1000"
                    />
                  </div>
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Час накопичення</span>
                    <strong style={{ fontSize: '18px', color: 'var(--pink-strong)' }}>
                      {(() => {
                        const cost = parseFloat(splitCostInput) || 0
                        const monthly = parseFloat(splitMonthlyInput) || 1
                        const months = Math.ceil(cost / monthly)
                        return `${months} ${months === 1 ? 'місяць' : [2, 3, 4].includes(months % 10) && ![12, 13, 14].includes(months % 100) ? 'місяці' : 'місяців'}`
                      })()}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      ({((parseFloat(splitCostInput) || 0) / (parseFloat(splitMonthlyInput) || 1) / 12).toFixed(1)} р.)
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Бажаний термін (місяців)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={splitMonthsInput}
                      onChange={(e) => setSplitMonthsInput(e.target.value)}
                      placeholder="Наприклад: 12"
                    />
                  </div>
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Потрібно відкладати на місяць</span>
                    <strong style={{ fontSize: '18px', color: 'var(--pink-strong)' }}>
                      {(() => {
                        const cost = parseFloat(splitCostInput) || 0
                        const months = parseInt(splitMonthsInput) || 1
                        return Math.round(cost / months).toLocaleString('uk-UA')
                      })()} ₴
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      ({Math.round((parseFloat(splitCostInput) || 0) / (parseInt(splitMonthsInput) || 1) / 4.3).toLocaleString('uk-UA')} ₴ на тиждень)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Goal Savings Timeline Estimator */}
            <div className="financial-projection-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="pink" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                  Прогнозатор досягнення цілей
                </h3>
              </div>
              
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                Вкажіть вашу заплановану щомісячну суму заощадження. Система розрахує приблизний графік досягнення ваших активних цілей.
              </p>

              <div className="form-group">
                <label className="form-label">Щомісячне заощадження (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={monthlySavingsInput}
                  onChange={(e) => setMonthlySavingsInput(e.target.value)}
                  placeholder="Сума заощаджень"
                />
              </div>

              <div style={{ display: 'grid', gap: '10px', marginTop: '4px' }}>
                {(() => {
                  const monthlyRate = parseFloat(monthlySavingsInput) || 1
                  let accumulatedRemaining = 0
                  const uncompletedGoals = goals.filter((g) => g.saved_amount < g.target_amount)
                  
                  if (!uncompletedGoals.length) {
                    return (
                      <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '16px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                        Усі ваші цілі вже досягнуто!
                      </p>
                    )
                  }

                  return uncompletedGoals.map((goal) => {
                    const remaining = goal.target_amount - goal.saved_amount
                    accumulatedRemaining += remaining
                    const months = accumulatedRemaining / monthlyRate
                    
                    const targetDate = new Date()
                    targetDate.setMonth(targetDate.getMonth() + Math.ceil(months))
                    const formattedDate = targetDate.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' })

                    return (
                      <div className="projection-timeline-item" key={goal.id}>
                        <div>
                          <div className="projection-timeline-title">{goal.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            Залишилось накопичити: {remaining.toLocaleString('uk-UA')} ₴
                          </div>
                        </div>
                        <div className="projection-timeline-time" title={`${Math.ceil(months)} міс.`}>
                          {formattedDate}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>

          {/* Right Column: Compound Interest Calculator */}
          <div className="financial-projection-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Wallet size={18} className="pink" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                Калькулятор складних відсотків
              </h3>
            </div>

            <div className="projection-input-group">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Початковий капітал (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Поповнення / міс. (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={monthlyAddInput}
                  onChange={(e) => setMonthlyAddInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Річна ставка (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Період (років)</label>
                <input
                  type="number"
                  className="form-control"
                  value={yearsInput}
                  onChange={(e) => setYearsInput(e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            {(() => {
              const p = parseFloat(principalInput) || 0
              const pmt = parseFloat(monthlyAddInput) || 0
              const annualRate = parseFloat(interestInput) || 0
              const r = annualRate / 100 / 12
              const years = Math.min(10, Math.max(1, parseInt(yearsInput) || 1))

              const yearlyData: Array<{ year: number; principal: number; balance: number }> = []
              let currentBalance = p
              let currentPrincipal = p

              for (let y = 1; y <= years; y++) {
                for (let m = 0; m < 12; m++) {
                  currentBalance = currentBalance * (1 + r) + pmt
                  currentPrincipal += pmt
                }
                yearlyData.push({
                  year: y,
                  principal: Math.round(currentPrincipal),
                  balance: Math.round(currentBalance),
                })
              }

              const maxVal = yearlyData.length ? Math.max(...yearlyData.map((d) => d.balance)) : 1

              return (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="projection-bar-chart">
                    {yearlyData.map((data) => {
                      const prcHeight = (data.principal / maxVal) * 100
                      const balHeight = (data.balance / maxVal) * 100

                      return (
                        <div className="projection-bar-pair" key={data.year}>
                          <div className="projection-bar-pair-columns">
                            <div
                              className="projection-bar principal"
                              style={{ height: `${prcHeight}%` }}
                              data-value={`${data.principal.toLocaleString('uk-UA')} ₴`}
                            />
                            <div
                              className="projection-bar compound"
                              style={{ height: `${balHeight}%` }}
                              data-value={`${data.balance.toLocaleString('uk-UA')} ₴`}
                            />
                          </div>
                          <span className="projection-bar-label">{data.year} р.</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="projection-chart-legend">
                    <div className="projection-legend-item">
                      <div className="projection-legend-color principal" style={{ background: '#71717a' }} />
                      <span>Вкладений капітал</span>
                    </div>
                    <div className="projection-legend-item">
                      <div className="projection-legend-color compound" style={{ background: 'var(--pink)' }} />
                      <span>Баланс з відсотками</span>
                    </div>
                  </div>

                  {yearlyData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Разом інвестовано</span>
                        <strong style={{ fontSize: '15px', color: '#ffffff' }}>
                          {yearlyData[yearlyData.length - 1].principal.toLocaleString('uk-UA')} ₴
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Кінцева сума</span>
                        <strong style={{ fontSize: '15px', color: 'var(--pink-strong)' }}>
                          {yearlyData[yearlyData.length - 1].balance.toLocaleString('uk-UA')} ₴
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function DiaryPanel({
  diarySearch,
  setDiarySearch,
  entries,
  onEdit,
  onDelete,
}: {
  diarySearch: string
  setDiarySearch: (v: string) => void
  entries: DiaryEntry[]
  onEdit: (entry: DiaryEntry) => void
  onDelete: (entry: DiaryEntry) => Promise<void>
}) {
  return (
    <div className="diary-wrapper">
      <div className="panel filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', borderBottom: 0 }}>
        <label className="search-box" style={{ flex: 1 }}>
          <Search size={16} />
          <input
            value={diarySearch}
            onChange={(e) => setDiarySearch(e.target.value)}
            placeholder="Шукати запис у щоденнику..."
          />
        </label>
      </div>

      <div className="diary-timeline">
        {entries.map((entry) => {
          // parse date key
          const parts = entry.date.split('-')
          const day = parts[2] || ''
          const monthText = parts[1] ? monthNames[parseInt(parts[1], 10) - 1]?.slice(0, 3) : ''

          // find images
          const imageAttachments = entry.attachments.filter(
            (a) => a.mimeType.startsWith('image/')
          )

          return (
            <article className="diary-card" key={entry.id}>
              <div className="diary-side-date">
                <strong>{day}</strong>
                <span>{monthText}</span>
              </div>

              <div className="diary-content-block">
                <div className="diary-card-header">
                  <h3>{entry.title}</h3>
                  <div className="row-actions">
                    <button className="icon-btn" type="button" onClick={() => onEdit(entry)}>
                      <FileText size={15} />
                    </button>
                    <button className="icon-btn danger" type="button" onClick={() => onDelete(entry)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="diary-card-body">{entry.content}</div>

                {imageAttachments.length > 0 && (
                  <div className="diary-attachments">
                    {imageAttachments.map((img) => (
                      <a
                        key={img.id}
                        className="diary-attachment-preview"
                        href={`/uploads/${encodeURIComponent(img.storedName)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={`/uploads/${encodeURIComponent(img.storedName)}`}
                          alt={img.originalName}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {!entries.length && (
          <EmptyState
            icon={<BookOpen size={24} />}
            title="Щоденник порожній"
            text="Напишіть про те, як пройшов ваш день, додайте спогади та фото."
          />
        )}
      </div>
    </div>
  )
}

function FilesPanel({
  attachments,
  tasks,
  snippets,
  goals,
  diaryEntries,
  projects,
  onDeleteAttachment,
}: {
  attachments: Attachment[]
  tasks: Task[]
  snippets: Snippet[]
  goals: FinanceGoal[]
  diaryEntries: DiaryEntry[]
  projects: Project[]
  onDeleteAttachment: (attachment: Attachment) => void
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="kicker">Вкладення</p>
          <h2>Бібліотека локальних файлів</h2>
        </div>
        <p className="muted">{attachments.length} файлів збережено у сховищі</p>
      </div>
      <div className="file-grid">
        {attachments.map((attachment) => (
          <article className="file-card" key={attachment.id}>
            <div className="file-icon">
              <Paperclip size={19} />
            </div>
            <div>
              <h3>{attachment.originalName}</h3>
              <p>{formatBytes(attachment.size)}</p>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                {entityTitle(attachment, tasks, snippets, goals, diaryEntries, projects)}
              </small>
            </div>
            <div className="row-actions">
              <a
                className="icon-btn"
                href={`/uploads/${encodeURIComponent(attachment.storedName)}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Відкрити ${attachment.originalName}`}
              >
                <FileText size={17} />
              </a>
              <button
                className="icon-btn danger"
                type="button"
                onClick={() => onDeleteAttachment(attachment)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
        {!attachments.length ? (
          <EmptyState
            icon={<Paperclip size={22} />}
            title="Немає завантажених файлів"
            text="Завантажуйте фото в щоденнику, фінансових цілях або планувальнику."
          />
        ) : null}
      </div>
    </section>
  )
}

function TaskDrawer({
  open,
  task,
  defaultDate,
  projects,
  onClose,
  onSubmit,
}: {
  open: boolean
  task: Task | null
  defaultDate: string
  projects: Project[]
  onClose: () => void
  onSubmit: (payload: TaskPayload, file: File | null) => Promise<void>
}) {
  const [form, setForm] = useState<TaskFormState>(taskToForm(task, defaultDate))
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    setForm(taskToForm(task, defaultDate))
    setFile(null)
  }, [defaultDate, task, open])

  if (!open) {
    return null
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await onSubmit(taskPayload(form), file)
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{task ? 'Редагувати план' : 'Створити план'}</p>
            <h2>{task ? task.title : 'Нова задача'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              autoFocus
            />
          </label>
          <label>
            <span>Проєкт</span>
            <select
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            >
              <option value="">Без проєкту</option>
              {projects.map((proj) => (
                <option value={proj.id} key={proj.id}>
                  {proj.title} {proj.is_completed ? '(Завершено)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Тип</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as TaskType })}
            >
              {taskTypeOptions.map((type) => (
                <option value={type} key={type}>
                  {typeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Статус</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
            >
              {statusOptions.map((status) => (
                <option value={status} key={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Пріоритет</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as TaskPriority })
              }
            >
              {priorityOptions.map((priority) => (
                <option value={priority} key={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Колір картки</span>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm({ ...form, color: event.target.value })}
            />
          </label>
          <label>
            <span>Початок</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            />
          </label>
          <label>
            <span>Кінець</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            />
          </label>
          <label>
            <span>Термін (Дедлайн)</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </label>
          <label className="wide">
            <span>Теги (через кому)</span>
            <input
              value={form.tagsText}
              onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
              placeholder="робота, навчання, особисте"
            />
          </label>
          <label className="wide">
            <span>Опис</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={5}
            />
          </label>
        </div>

        <div className="upload-strip">
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={task?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти задачу
          </button>
        </div>
      </form>
    </div>
  )
}

function GoalDrawer({
  open,
  goal,
  onClose,
  onSubmit,
}: {
  open: boolean
  goal: FinanceGoal | null
  onClose: () => void
  onSubmit: (payload: FinanceGoalPayload, file: File | null) => Promise<void>
}) {
  const [form, setForm] = useState<GoalFormState>({
    title: '',
    description: '',
    target_amount: '5000',
    saved_amount: '0',
    target_date: todayKey(),
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (goal) {
      setForm({
        title: goal.title,
        description: goal.description,
        target_amount: String(goal.target_amount),
        saved_amount: String(goal.saved_amount),
        target_date: goal.target_date || '',
      })
    } else {
      setForm({
        title: '',
        description: '',
        target_amount: '5000',
        saved_amount: '0',
        target_date: todayKey(),
      })
    }
    setFile(null)
  }, [goal, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(
      {
        title: form.title,
        description: form.description,
        target_amount: parseFloat(form.target_amount) || 0,
        saved_amount: parseFloat(form.saved_amount) || 0,
        target_date: form.target_date || null,
      },
      file
    )
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{goal ? 'Редагувати ціль' : 'Нова ціль'}</p>
            <h2>{goal ? goal.title : 'Створити ціль'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва речі / Бажання</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Новий телефон, Кросівки"
              autoFocus
            />
          </label>
          <label>
            <span>Скільки потрібно (₴)</span>
            <input
              type="number"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Скільки вже є (₴)</span>
            <input
              type="number"
              value={form.saved_amount}
              onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
              required
            />
          </label>
          <label className="wide">
            <span>Коли потрібно (Дата цілі)</span>
            <input
              type="date"
              value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Навіщо це мені (Опис цілі)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="Опишіть чому ви хочете це купити..."
            />
          </label>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Фото речі
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Обрати photo речі'}</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={goal?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти ціль
          </button>
        </div>
      </form>
    </div>
  )
}

function DiaryDrawer({
  open,
  entry,
  onClose,
  onSubmit,
}: {
  open: boolean
  entry: DiaryEntry | null
  onClose: () => void
  onSubmit: (payload: DiaryEntryPayload, file: File | null) => Promise<void>
}) {
  const [form, setForm] = useState<DiaryFormState>({
    title: '',
    content: '',
    date: todayKey(),
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title,
        content: entry.content,
        date: entry.date,
      })
    } else {
      setForm({
        title: '',
        content: '',
        date: todayKey(),
      })
    }
    setFile(null)
  }, [entry, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit(form, file)
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{entry ? 'Редагувати запис' : 'Створити запис'}</p>
            <h2>{entry ? entry.title : 'Запис у щоденнику'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Тема дня (Заголовок)</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Чудовий вечір, Продуктивний день"
              autoFocus
            />
          </label>
          <label className="wide">
            <span>Дата запису</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="wide">
            <span>Текст запису (Що сталося?)</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={8}
              required
              placeholder="Почніть писати тут ваші думки..."
            />
          </label>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Фото спогаду / дня
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Обрати фотографію'}</span>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={entry?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти запис
          </button>
        </div>
      </form>
    </div>
  )
}

function SubscriptionDrawer({
  open,
  sub,
  onClose,
  onSubmit,
}: {
  open: boolean
  sub: Subscription | null
  onClose: () => void
  onSubmit: (payload: SubscriptionPayload) => Promise<void>
}) {
  const [form, setForm] = useState<SubscriptionFormState>({
    title: '',
    amount: '200',
    period: 'monthly',
    next_payment_date: todayKey(),
    category: 'Розваги',
    color: '#a855f7',
  })

  useEffect(() => {
    if (sub) {
      setForm({
        title: sub.title,
        amount: String(sub.amount),
        period: sub.period,
        next_payment_date: sub.next_payment_date,
        category: sub.category,
        color: sub.color,
      })
    } else {
      setForm({
        title: '',
        amount: '200',
        period: 'monthly',
        next_payment_date: todayKey(),
        category: 'Розваги',
        color: '#a855f7',
      })
    }
  }, [sub, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: form.title,
      amount: parseFloat(form.amount) || 0,
      period: form.period,
      next_payment_date: form.next_payment_date,
      category: form.category,
      color: form.color,
    })
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{sub ? 'Редагувати платіж' : 'Новий регулярний платіж'}</p>
            <h2>{sub ? sub.title : 'Регулярний платіж'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва підписки / платежу</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Наприклад: Netflix, Оренда, Spotify"
              autoFocus
            />
          </label>
          <label>
            <span>Сума платежу (₴)</span>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Періодичність</span>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as 'monthly' | 'weekly' })}
            >
              <option value="monthly">Щомісяця</option>
              <option value="weekly">Щотижня</option>
            </select>
          </label>
          <label>
            <span>Дата наступної оплати</span>
            <input
              type="date"
              value={form.next_payment_date}
              onChange={(e) => setForm({ ...form, next_payment_date: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Категорія</span>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Розваги, Послуги, Оренда"
            />
          </label>
          <label>
            <span>Колір картки</span>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </label>
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти платіж
          </button>
        </div>
      </form>
    </div>
  )
}

function TaskFiltersBox({
  filters,
  tags,
  onChange,
  compact = false,
}: {
  filters: TaskFilters
  tags: string[]
  onChange: (filters: TaskFilters) => void
  compact?: boolean
}) {
  return (
    <div className={`filters ${compact ? 'compact' : ''}`}>
      <label className="search-box">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Фільтр задач..."
        />
      </label>
      <select
        value={filters.type}
        onChange={(event) => onChange({ ...filters, type: event.target.value as TaskFilters['type'] })}
      >
        <option value="all">Всі типи</option>
        {taskTypeOptions.map((type) => (
          <option value={type} key={type}>
            {typeLabels[type]}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value as TaskFilters['status'] })
        }
      >
        <option value="all">Всі статуси</option>
        {statusOptions.map((status) => (
          <option value={status} key={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <select
        value={filters.priority}
        onChange={(event) =>
          onChange({ ...filters, priority: event.target.value as TaskFilters['priority'] })
        }
      >
        <option value="all">Усі пріоритети</option>
        {priorityOptions.map((priority) => (
          <option value={priority} key={priority}>
            {priorityLabels[priority]}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => onChange({ ...filters, tag: event.target.value })}
      >
        <option value="all">Усі теги</option>
        {tags.map((tag) => (
          <option value={tag} key={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  )
}

function SnippetFiltersBox({
  filters,
  tags,
  languages,
  onChange,
}: {
  filters: SnippetFilters
  tags: string[]
  languages: string[]
  onChange: (filters: SnippetFilters) => void
}) {
  return (
    <div className="filters compact">
      <label className="search-box">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Пошук коду..."
        />
      </label>
      <select
        value={filters.language}
        onChange={(event) => onChange({ ...filters, language: event.target.value })}
      >
        <option value="all">Усі мови</option>
        {languages.map((language) => (
          <option value={language} key={language}>
            {language}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => onChange({ ...filters, tag: event.target.value })}
      >
        <option value="all">Усі теги</option>
        {tags.map((tag) => (
          <option value={tag} key={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  )
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button type="button" className="task-row" onClick={onClick}>
      <span className="task-dot" style={{ background: task.color, color: task.color }} />
      <span>
        <strong>{task.title}</strong>
        <small>
          {taskScheduleLabel(task)} · {statusLabels[task.status]}
        </small>
      </span>
    </button>
  )
}

function TaskMeta({ task }: { task: Task }) {
  return (
    <div className="meta-line">
      <span>{typeLabels[task.type]}</span>
      <span>{priorityLabels[task.priority]}</span>
      <span>{task.startAt ? formatTime(task.startAt) : formatShortDate(taskDateKey(task))}</span>
    </div>
  )
}

function AttachmentList({
  attachments,
  onDelete,
}: {
  attachments: Attachment[]
  onDelete?: (attachment: Attachment) => void
}) {
  if (!attachments.length) {
    return null
  }
  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <span className="attachment-pill" key={attachment.id}>
          <a href={`/uploads/${encodeURIComponent(attachment.storedName)}`} target="_blank" rel="noreferrer">
            <Paperclip size={14} />
            {attachment.originalName}
          </a>
          {onDelete ? (
            <button type="button" onClick={() => onDelete(attachment)} aria-label="Delete attachment">
              <X size={13} />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
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

function GlobalResults({ results }: { results: SearchResult }) {
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

function filterTasks(tasks: Task[], filters: TaskFilters) {
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

function filterSnippets(snippets: Snippet[], filters: SnippetFilters) {
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

function taskToForm(task: Task | null, defaultDate: string): TaskFormState {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      startAt: task.startAt ?? '',
      endAt: task.endAt ?? '',
      dueDate: task.dueDate ?? '',
      color: task.color,
      tagsText: task.tags.join(', '),
      projectId: task.projectId !== null ? String(task.projectId) : '',
    }
  }
  return {
    title: '',
    description: '',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    startAt: `${defaultDate}T09:00`,
    endAt: `${defaultDate}T10:00`,
    dueDate: defaultDate,
    color: '#a855f7',
    tagsText: '',
    projectId: '',
  }
}

function taskPayload(form: TaskFormState): TaskPayload {
  return {
    title: form.title,
    description: form.description,
    type: form.type,
    status: form.status,
    priority: form.priority,
    startAt: form.startAt || null,
    endAt: form.endAt || null,
    dueDate: form.dueDate || null,
    color: form.color,
    tags: splitTags(form.tagsText),
    projectId: form.projectId ? Number(form.projectId) : null,
  }
}

function snippetToForm(snippet: Snippet | null): SnippetFormState {
  if (snippet) {
    return {
      title: snippet.title,
      language: snippet.language,
      code: snippet.code,
      explanation: snippet.explanation,
      tagsText: snippet.tags.join(', '),
      projectId: snippet.projectId !== null ? String(snippet.projectId) : '',
    }
  }
  return {
    title: '',
    language: 'typescript',
    code: '',
    explanation: '',
    tagsText: '',
    projectId: '',
  }
}

function snippetPayload(form: SnippetFormState): SnippetPayload {
  return {
    title: form.title,
    language: form.language,
    code: form.code,
    explanation: form.explanation,
    tags: splitTags(form.tagsText),
    projectId: form.projectId ? Number(form.projectId) : null,
  }
}

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function sectionTitle(section: Section) {
  const titles: Record<Section, string> = {
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
  }
  return titles[section]
}

function entityTitle(
  attachment: Attachment,
  tasks: Task[],
  snippets: Snippet[],
  goals: FinanceGoal[],
  diaryEntries: DiaryEntry[],
  projects: Project[]
) {
  if (attachment.entityType === 'task') {
    return `Задача: ${tasks.find((task) => task.id === attachment.entityId)?.title ?? 'Видалена задача'}`
  }
  if (attachment.entityType === 'snippet') {
    return `Код: ${snippets.find((snippet) => snippet.id === attachment.entityId)?.title ?? 'Видалений код'}`
  }
  if (attachment.entityType === 'goal') {
    return `Ціль: ${goals.find((g) => g.id === attachment.entityId)?.title ?? 'Видалена ціль'}`
  }
  if (attachment.entityType === 'diary') {
    return `Щоденник: ${diaryEntries.find((e) => e.id === attachment.entityId)?.title ?? 'Видалений запис'}`
  }
  if (attachment.entityType === 'project') {
    return `Проєкт: ${projects.find((p) => p.id === attachment.entityId)?.title ?? 'Видалений проєкт'}`
  }
  return 'Локальний файл'
}

function taskScheduleLabel(task: Task) {
  if (task.startAt) {
    return formatDateTime(task.startAt)
  }
  if (task.dueDate) {
    return `До ${formatShortDate(task.dueDate)}`
  }
  return 'Без дати'
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

const monthNames = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Щось пішло не так'
}

function ProjectsPanel({
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
}: {
  projects: Project[]
  tasks: Task[]
  snippets: Snippet[]
  selectedProjectId: number | null
  onSelectProject: (id: number | null) => void
  onCreateProject: () => void
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onDeleteAttachment: (attachment: Attachment) => void
  onQuickCreateTask: (projectId: number) => void
  onQuickCreateSnippet: (projectId: number) => void
  onSaveCanvas: (projectId: number, canvasData: string) => Promise<void>
  onUpdateTask: (id: number, payload: TaskPayload) => Promise<void>
  setSection: (section: Section) => void
  setSnippetSelection: (id: SnippetSelection) => void
  openEditTask: (task: Task) => void
  onRefreshData?: () => Promise<void>
  onToggleProjectCompleted: (project: Project) => Promise<void>
}) {
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

  // getBezierPath is now defined globally

  if (!project) {
    const filteredProjects = projects.filter((proj) => {
      if (projectFilter === 'active') return !proj.is_completed
      if (projectFilter === 'completed') return proj.is_completed
      return true
    })

    return (
      <div className="projects-grid-wrapper">
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
    <div className="project-workspace">
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
                  onChange={() => onToggleProjectCompleted(project)}
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
                                href={`/uploads/${att.storedName}`}
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
                                  const imageUrl = `/uploads/${att.storedName}`
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
                          Прибрати фото
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

function ProjectDrawer({
  open,
  project,
  onClose,
  onSubmit,
}: {
  open: boolean
  project: Project | null
  onClose: () => void
  onSubmit: (payload: ProjectPayload, file: File | null) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [prodUrl, setProdUrl] = useState('')
  const [techStackText, setTechStackText] = useState('')
  const [links, setLinks] = useState<ProjectLink[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description)
      setRepoUrl(project.repo_url)
      setProdUrl(project.prod_url)
      setTechStackText(project.tech_stack.join(', '))
      setLinks(project.links)
      setIsCompleted(!!project.is_completed)
    } else {
      setTitle('')
      setDescription('')
      setRepoUrl('')
      setProdUrl('')
      setTechStackText('')
      setLinks([])
      setIsCompleted(false)
    }
    setFile(null)
  }, [project, open])

  if (!open) return null

  const handleAddLink = () => {
    setLinks([...links, { name: '', url: '' }])
  }

  const handleRemoveLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx))
  }

  const handleLinkChange = (idx: number, key: keyof ProjectLink, value: string) => {
    const updated = [...links]
    updated[idx] = { ...updated[idx], [key]: value }
    setLinks(updated)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const techStack = techStackText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    await onSubmit(
      {
        title,
        description,
        repo_url: repoUrl,
        prod_url: prodUrl,
        tech_stack: techStack,
        links: links.filter((l) => l.name && l.url),
        is_completed: isCompleted,
      },
      file
    )
  }

  return (
    <div className="drawer-backdrop">
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-header">
          <div>
            <p className="kicker">{project ? 'Редагувати проєкт' : 'Новий проєкт'}</p>
            <h2>{project ? project.title : 'Створити проєкт'}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Закрити">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="wide">
            <span>Назва проєкту</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Наприклад: NoteHub, E-commerce App"
              autoFocus
            />
          </label>

          <label className="wide">
            <span>Опис проєкту</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Короткий опис цілей та завдань проєкту..."
            />
          </label>

          <label>
            <span>Репозиторій (Git)</span>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
            />
          </label>

          <label>
            <span>Посилання на деплой</span>
            <input
              value={prodUrl}
              onChange={(e) => setProdUrl(e.target.value)}
              placeholder="https://my-app.vercel.app"
            />
          </label>

          <label className="wide">
            <span>Стек технологій (через кому)</span>
            <input
              value={techStackText}
              onChange={(e) => setTechStackText(e.target.value)}
              placeholder="React, TypeScript, SQLite, Express"
            />
          </label>

          <div className="wide" style={{ marginTop: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
              Додаткові корисні посилання (Figma, доки, ТЗ)
            </span>
            <div className="project-drawer-links-config">
              {links.map((link, idx) => (
                <div className="project-drawer-link-row" key={idx}>
                  <input
                    placeholder="Назва (напр. Figma)"
                    value={link.name}
                    onChange={(e) => handleLinkChange(idx, 'name', e.target.value)}
                    required
                  />
                  <input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                    required
                  />
                  <button className="icon-btn danger" type="button" onClick={() => handleRemoveLink(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button className="btn secondary" type="button" style={{ width: 'fit-content' }} onClick={handleAddLink}>
                <Plus size={14} /> Додати посилання
              </button>
            </div>
          </div>

          <div className="wide" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="drawer-project-completed"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="drawer-project-completed" style={{ fontSize: '13px', margin: 0, cursor: 'pointer', userSelect: 'none' }}>
              Проєкт завершено (позначити як виконаний)
            </label>
          </div>
        </div>

        <div className="upload-strip">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Макети / ТЗ / Файли проєкту
          </span>
          <label className="file-picker">
            <Upload size={17} />
            <span>{file ? file.name : 'Прикріпити файл'}</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <AttachmentList attachments={project?.attachments ?? []} />
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Зберегти проєкт
          </button>
        </div>
      </form>
    </div>
  )
}

function HabitsPanel({
  habits,
  onCreateHabit,
  onToggleHabit,
  onDeleteHabit,
}: {
  habits: Habit[]
  onCreateHabit: () => void
  onToggleHabit: (id: number, date: string, completed: boolean) => Promise<void>
  onDeleteHabit: (id: number) => Promise<void>
}) {
  const past7Days = useMemo(() => {
    const list = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      list.push({
        dateStr: toDateKey(d),
        label: d.toLocaleDateString('uk-UA', { weekday: 'short' }),
        dayNum: d.getDate(),
      })
    }
    return list
  }, [])

  const monthCells = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const list = []
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d)
      list.push({
        dateStr: toDateKey(date),
        dayNum: d,
      })
    }
    return list
  }, [])

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('uk-UA', { month: 'long' })
  }, [])

  const calculateStreaks = (history: string[]) => {
    if (!history || !history.length) return { current: 0, max: 0 }
    const sorted = [...new Set(history)].sort()
    
    let maxStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null
    let tempStreak = 0

    for (const dStr of sorted) {
      const d = new Date(dStr)
      if (lastDate === null) {
        tempStreak = 1
      } else {
        const diffTime = Math.abs(d.getTime() - lastDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          tempStreak++
        } else if (diffDays > 1) {
          tempStreak = 1
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak
      }
      lastDate = d
    }

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    
    const todayStr = toDateKey(today)
    const yesterdayStr = toDateKey(yesterday)
    
    const hasToday = history.includes(todayStr)
    const hasYesterday = history.includes(yesterdayStr)
    
    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? today : yesterday
      currentStreak = 0
      while (true) {
        const checkStr = toDateKey(checkDate)
        if (history.includes(checkStr)) {
          currentStreak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
    } else {
      currentStreak = 0
    }

    return { current: currentStreak, max: Math.max(maxStreak, currentStreak) }
  }

  return (
    <div className="habits-wrapper">
      <div className="habits-grid">
        {habits.map((habit) => {
          const { current, max } = calculateStreaks(habit.history)
          const style = { '--accent-color': habit.color } as React.CSSProperties

          return (
            <article className="habit-card" key={habit.id} style={style}>
              <div className="habit-header">
                <div className="habit-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: habit.color }} />
                    <h3 className="habit-title">{habit.title}</h3>
                  </div>
                  <div className="habit-streak" style={{ color: habit.color }}>
                    🔥 Поточна серія: {current} | Рекорд: {max} днів
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  style={{ width: '28px', height: '28px' }}
                  onClick={() => void onDeleteHabit(habit.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* 7 Day Checklist */}
              <div>
                <span className="habit-heatmap-title" style={{ fontSize: '10px', marginBottom: '6px', display: 'block' }}>
                  Останні 7 днів
                </span>
                <div className="habit-checklist-7day">
                  {past7Days.map((day) => {
                    const isChecked = habit.history.includes(day.dateStr)
                    return (
                      <div className="habit-day-col" key={day.dateStr}>
                        <span className="habit-day-label">{day.label}</span>
                        <button
                          type="button"
                          className={`habit-checkbox ${isChecked ? 'checked' : ''}`}
                          onClick={() => void onToggleHabit(habit.id, day.dateStr, !isChecked)}
                        >
                          {isChecked && <Check size={14} />}
                        </button>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 500 }}>
                          {day.dayNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Month Heatmap */}
              <div className="habit-heatmap-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="habit-heatmap-title">Календар за {currentMonthName}</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    Виконано: {habit.history.filter((d) => d.startsWith(toDateKey(new Date()).substring(0, 7))).length} дн.
                  </span>
                </div>
                <div className="habit-heatmap-grid">
                  {monthCells.map((cell) => {
                    const isCompleted = habit.history.includes(cell.dateStr)
                    return (
                      <div
                        key={cell.dateStr}
                        className={`habit-heatmap-cell ${isCompleted ? 'completed' : ''}`}
                        data-date={`${cell.dayNum} ${currentMonthName}: ${isCompleted ? 'Виконано' : 'Не відмічено'}`}
                      />
                    )
                  })}
                </div>
              </div>
            </article>
          )
        })}

        {!habits.length && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 0' }}>
            <EmptyState
              icon={<Target size={24} />}
              title="Немає звичок для відстеження"
              text="Створіть свою першу щоденну звичку, виберіть для неї яскравий колір та відзначайте її виконання кожен день!"
            />
            <button className="btn primary" type="button" onClick={onCreateHabit}>
              <Plus size={16} />
              Створити першу звичку
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function HabitDrawer({
  open,
  habit,
  onClose,
  onSubmit,
}: {
  open: boolean
  habit: Habit | null
  onClose: () => void
  onSubmit: (payload: HabitPayload) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#a855f7')

  useEffect(() => {
    if (open) {
      setTitle('')
      setColor('#a855f7')
    }
  }, [open, habit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Будь ласка, введіть назву звички')
      return
    }
    void onSubmit({
      title: title.trim(),
      color,
    })
  }

  if (!open) return null

  const colors = ['#a855f7', '#10b981', '#0ea5e9', '#f59e0b', '#f43f5e', '#6366f1', '#ec4899', '#14b8a6']

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <form className="drawer" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="drawer-header">
          <h2>Створити звичку</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="form-group">
            <label className="form-label">Назва звички</label>
            <input
              type="text"
              className="form-control"
              placeholder="Наприклад: Читати 20 хв, Пити воду, Спорт..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Оберіть колір акценту</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '2px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: color === c ? '0 0 8px ' + c : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Скасувати
          </button>
          <button className="btn primary" type="submit">
            <Save size={16} />
            Створити звичку
          </button>
        </div>
      </form>
    </div>
  )
}

interface MindMapsPanelProps {
  mindMaps: MindMap[]
  tasks: Task[]
  snippets: Snippet[]
  selectedMindMapId: number | null
  onSelectMindMap: (id: number | null) => void
  onCreateMindMap: () => void
  onDeleteMindMap: (id: number, title: string) => Promise<void>
  onSaveMindMap: (id: number, nodesData: string) => Promise<void>
  setSection: (section: Section) => void
  setSnippetSelection: (selection: SnippetSelection) => void
  openEditTask: (task: Task) => void
  onRefreshData?: () => Promise<void>
}

const computeInitialLayout = (nodesList: MindMapNode[]): Record<string, { x: number; y: number }> => {
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

// Connection helpers moved to global scope

function MindMapsPanel({
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
  const mindMap = mindMaps.find((m) => m.id === selectedMindMapId)
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
      <div className="mindmap-workspace">
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
      <div className="mindmap-workspace">
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
                      placeholder="Додатковий text..."
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
    <div className="mindmaps-container">
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

function MindMapModal({
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


function RoadmapsPanel({
  roadmaps,
  selectedRoadmapId,
  onSelectRoadmap,
  onCreateRoadmap,
  onEditRoadmap,
  onDeleteRoadmap,
  onSaveCanvas,
}: {
  roadmaps: Roadmap[]
  selectedRoadmapId: number | null
  onSelectRoadmap: (id: number | null) => void
  onCreateRoadmap: () => void
  onEditRoadmap: (roadmap: Roadmap) => void
  onDeleteRoadmap: (roadmap: Roadmap) => void
  onSaveCanvas: (id: number, canvasData: string) => Promise<void>
}) {
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
      const res = await fetch(`/api/roadmaps/notes/${nodeId}`)
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
      <div className="projects-grid-wrapper">
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
                      >
                        <FileText size={15} />
                      </button>
                      <button
                        className="icon-btn danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteRoadmap(rm)
                        }}
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
      className="project-workspace"
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

function RoadmapDrawer({
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

export default App

