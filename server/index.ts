import fs from 'node:fs'
import path from 'node:path'
import {
  getStudyModules,
  getStudyProgress,
  submitHomework,
  getAdminHomeworks,
  saveStudyProgress,
} from './database.ts'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import {
  createAttachment,
  createSnippet,
  createTask,
  deleteAttachment,
  deleteSnippet,
  deleteTask,
  getSnippet,
  getTask,
  initDatabase,
  listAttachments,
  listSnippets,
  listTasks,
  normalizeSnippetInput,
  normalizeTaskInput,
  searchAll,
  updateSnippet,
  updateTask,
  type EntityType,
  getBalance,
  updateBalance,
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  listDiaryEntries,
  getDiaryEntry,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  normalizeGoalInput,
  normalizeDiaryInput,
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  normalizeSubscriptionInput,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  normalizeProjectInput,
  listHabits,
  createHabit,
  deleteHabit,
  toggleHabitLog,
  normalizeHabitInput,
  listMindMaps,
  getMindMap,
  createMindMap,
  updateMindMap,
  deleteMindMap,
  normalizeMindMapInput,
  listRoadmaps,
  getRoadmap,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
  normalizeRoadmapInput,
} from './database.ts'
import { mathNotes } from './mathNotes.ts'
import { authMiddleware } from './authMiddleware.ts'
import { registerUser, loginUser, logoutSession } from './database.ts'

const port = Number(process.env.PORT ?? 5174)
const uploadsDir = path.join(process.cwd(), 'uploads')
const app = express()

fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname)
    callback(null, `${Date.now()}-${randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
})

await initDatabase()

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadsDir))


app.post('/api/auth/register', (req, res) => {
  try {
    const result = registerUser(req.body)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/auth/login', (req, res) => {
  try {
    const result = loginUser(req.body)
    res.json(result)
  } catch (error: any) {
    res.status(401).json({ error: error.message })
  }
})

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next()
  }
  authMiddleware(req, res, next)
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    logoutSession(token)
  }
  res.status(204).end()
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/tasks', (request, response) => {
  response.json(listTasks(request.user!.id, toSearchParams(request)))
})

app.post('/api/tasks', (request, response) => {
  const task = createTask(request.user!.id, normalizeTaskInput(request.body))
  response.status(201).json(task)
})

app.put('/api/tasks/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getTask(request.user!.id, id)) {
    response.status(404).json({ error: 'Task not found' })
    return
  }
  response.json(updateTask(request.user!.id, id, normalizeTaskInput(request.body)))
})

app.delete('/api/tasks/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getTask(request.user!.id, id)) {
    response.status(404).json({ error: 'Task not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'task', id)
  deleteTask(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

app.get('/api/snippets', (request, response) => {
  response.json(listSnippets(request.user!.id, toSearchParams(request)))
})

app.post('/api/snippets', (request, response) => {
  const snippet = createSnippet(request.user!.id, normalizeSnippetInput(request.body))
  response.status(201).json(snippet)
})

app.put('/api/snippets/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSnippet(request.user!.id, id)) {
    response.status(404).json({ error: 'Snippet not found' })
    return
  }
  response.json(updateSnippet(request.user!.id, id, normalizeSnippetInput(request.body)))
})

app.delete('/api/snippets/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSnippet(request.user!.id, id)) {
    response.status(404).json({ error: 'Snippet not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'snippet', id)
  deleteSnippet(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

app.get('/api/calendar', (request, response) => {
  response.json(listTasks(request.user!.id, toSearchParams(request)))
})

app.get('/api/search', (request, response) => {
  const query = String(request.query.q ?? '').trim()
  response.json(query ? searchAll(request.user!.id, query) : { tasks: [], snippets: [] })
})

app.get('/api/attachments', (request, response) => {
  const entityType = parseEntityType(request.query.entityType)
  const entityId = Number(request.query.entityId)
  response.json(listAttachments(request.user!.id, entityType, Number.isFinite(entityId) ? entityId : undefined))
})

app.post('/api/attachments', upload.single('file'), (request, response) => {
  const entityType = parseEntityType(request.body.entityType)
  const entityId = Number(request.body.entityId)

  if (!request.file || !entityType || !Number.isFinite(entityId)) {
    removeUploadedFile(request.file?.filename)
    response.status(400).json({ error: 'file, entityType, and entityId are required' })
    return
  }

  const entityExists =
    entityType === 'task'
      ? getTask(request.user!.id, entityId)
      : entityType === 'snippet'
        ? getSnippet(request.user!.id, entityId)
        : entityType === 'goal'
          ? getGoal(request.user!.id, entityId)
          : entityType === 'diary'
            ? getDiaryEntry(request.user!.id, entityId)
            : entityType === 'project'
              ? getProject(request.user!.id, entityId)
              : entityType === 'mindmap'
                ? getMindMap(request.user!.id, entityId)
                : null

  if (!entityExists) {
    removeUploadedFile(request.file.filename)
    response.status(404).json({ error: 'Linked record not found' })
    return
  }

  const attachment = createAttachment(request.user!.id, {
    originalName: request.file.originalname,
    storedName: request.file.filename,
    mimeType: request.file.mimetype || 'application/octet-stream',
    size: request.file.size,
    entityType,
    entityId,
  })
  response.status(201).json(attachment)
})

app.delete('/api/attachments/:id', (request, response) => {
  const attachment = deleteAttachment(request.user!.id, parseId(request.params.id))
  if (!attachment) {
    response.status(404).json({ error: 'Attachment not found' })
    return
  }
  removeUploadedFile(attachment.storedName)
  response.status(204).end()
})

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  void _next
  const status = error.message.includes('required') ? 400 : 500
  response.status(status).json({ error: error.message })
})



// --- Study API ---
app.get('/api/study/modules', authMiddleware, (_req, res) => {
  try {
    res.json(getStudyModules())
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.get('/api/study/progress', authMiddleware, (req, res) => {
  try {
    res.json(getStudyProgress(req.user!.id))
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/progress', authMiddleware, (req, res) => {
  try {
    const { lessonId, completed } = req.body
    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' })
    }
    saveStudyProgress(req.user!.id, Number(lessonId), completed ? 1 : 0)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/homework', authMiddleware, (req, res) => {
  try {
    const { lesson_id, repository_url, live_url, comments } = req.body
    if (!lesson_id || !repository_url) {
      return res.status(400).json({ error: 'Lesson ID and Repository URL are required' })
    }
    submitHomework(req.user!.id, lesson_id, repository_url, live_url, comments)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.get('/api/study/admin/homeworks', authMiddleware, (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(getAdminHomeworks())
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.listen(port, () => {
  console.log(`NoteHub API listening on http://localhost:${port}`)
})

// Balance
app.get('/api/balance', (request, response) => {
  response.json({ amount: getBalance(request.user!.id) })
})

app.put('/api/balance', (request, response) => {
  const amount = Number(request.body.amount)
  if (!Number.isFinite(amount)) {
    response.status(400).json({ error: 'amount is required and must be a number' })
    return
  }
  response.json(updateBalance(request.user!.id, amount))
})

// Goals
app.get('/api/finance/goals', (request, response) => {
  response.json(listGoals(request.user!.id))
})

app.post('/api/finance/goals', (request, response) => {
  const goal = createGoal(request.user!.id, normalizeGoalInput(request.body))
  response.status(201).json(goal)
})

app.put('/api/finance/goals/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getGoal(request.user!.id, id)) {
    response.status(404).json({ error: 'Goal not found' })
    return
  }
  response.json(updateGoal(request.user!.id, id, normalizeGoalInput(request.body)))
})

app.delete('/api/finance/goals/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getGoal(request.user!.id, id)) {
    response.status(404).json({ error: 'Goal not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'goal', id)
  deleteGoal(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Diary
app.get('/api/diary', (request, response) => {
  response.json(listDiaryEntries(request.user!.id))
})

app.post('/api/diary', (request, response) => {
  const entry = createDiaryEntry(request.user!.id, normalizeDiaryInput(request.body))
  response.status(201).json(entry)
})

app.put('/api/diary/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getDiaryEntry(request.user!.id, id)) {
    response.status(404).json({ error: 'Diary entry not found' })
    return
  }
  response.json(updateDiaryEntry(request.user!.id, id, normalizeDiaryInput(request.body)))
})

app.delete('/api/diary/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getDiaryEntry(request.user!.id, id)) {
    response.status(404).json({ error: 'Diary entry not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'diary', id)
  deleteDiaryEntry(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Subscriptions
app.get('/api/subscriptions', (request, response) => {
  response.json(listSubscriptions(request.user!.id))
})

app.post('/api/subscriptions', (request, response) => {
  const sub = createSubscription(request.user!.id, normalizeSubscriptionInput(request.body))
  response.status(201).json(sub)
})

app.put('/api/subscriptions/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSubscription(request.user!.id, id)) {
    response.status(404).json({ error: 'Subscription not found' })
    return
  }
  response.json(updateSubscription(request.user!.id, id, normalizeSubscriptionInput(request.body)))
})

app.delete('/api/subscriptions/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSubscription(request.user!.id, id)) {
    response.status(404).json({ error: 'Subscription not found' })
    return
  }
  deleteSubscription(request.user!.id, id)
  response.status(204).end()
})

// Projects
app.get('/api/projects', (request, response) => {
  response.json(listProjects(request.user!.id))
})

app.post('/api/projects', (request, response) => {
  const project = createProject(request.user!.id, normalizeProjectInput(request.body))
  response.status(201).json(project)
})

app.put('/api/projects/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getProject(request.user!.id, id)) {
    response.status(404).json({ error: 'Project not found' })
    return
  }
  response.json(updateProject(request.user!.id, id, normalizeProjectInput(request.body)))
})

app.delete('/api/projects/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getProject(request.user!.id, id)) {
    response.status(404).json({ error: 'Project not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'project', id)
  deleteProject(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Habits
app.get('/api/habits', (request, response) => {
  response.json(listHabits(request.user!.id))
})

app.post('/api/habits', (request, response) => {
  const habit = createHabit(request.user!.id, normalizeHabitInput(request.body))
  response.status(201).json(habit)
})

app.delete('/api/habits/:id', (request, response) => {
  const id = parseId(request.params.id)
  deleteHabit(request.user!.id, id)
  response.status(204).end()
})

app.post('/api/habits/:id/toggle', (request, response) => {
  const id = parseId(request.params.id)
  const date = String(request.body.date).trim()
  const completed = Boolean(request.body.completed)
  if (!date) {
    response.status(400).json({ error: 'date is required' })
    return
  }
  response.json(toggleHabitLog(request.user!.id, id, date, completed))
})

// Mind Maps
app.get('/api/mindmaps', (request, response) => {
  response.json(listMindMaps(request.user!.id))
})

app.get('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  const map = getMindMap(request.user!.id, id)
  if (!map) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  response.json(map)
})

app.post('/api/mindmaps', (request, response) => {
  const map = createMindMap(request.user!.id, normalizeMindMapInput(request.body))
  response.status(201).json(map)
})

app.put('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getMindMap(request.user!.id, id)) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  response.json(updateMindMap(request.user!.id, id, normalizeMindMapInput(request.body)))
})

app.delete('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getMindMap(request.user!.id, id)) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  const attachments = listAttachments(request.user!.id, 'mindmap', id)
  deleteMindMap(request.user!.id, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Roadmaps
app.get('/api/roadmaps', (request, response) => {
  response.json(listRoadmaps(request.user!.id))
})

app.get('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  const roadmap = getRoadmap(request.user!.id, id)
  if (!roadmap) {
    response.status(404).json({ error: 'Roadmap not found' })
    return
  }
  response.json(roadmap)
})

app.post('/api/roadmaps', (request, response) => {
  const roadmap = createRoadmap(request.user!.id, normalizeRoadmapInput(request.body))
  response.status(201).json(roadmap)
})

app.put('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getRoadmap(request.user!.id, id)) {
    response.status(404).json({ error: 'Roadmap not found' })
    return 
  }
  response.json(updateRoadmap(request.user!.id, id, normalizeRoadmapInput(request.body)))
})

app.delete('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getRoadmap(request.user!.id, id)) {
    response.status(404).json({ error: 'Roadmap not found' })
    return
  }
  deleteRoadmap(request.user!.id, id)
  response.status(204).end()
})

app.get('/api/roadmaps/notes/:nodeId', (request, response) => {
  const { nodeId } = request.params
  let notes = mathNotes[nodeId] || null

  if (!notes && nodeId.endsWith('_4')) {
    notes = `## Практичний кейс та самоконтроль

### 1. Огляд кейсу
Цей розділ присвячено практичному застосуванню вивченого матеріалу на реальному прикладі. Розглянемо сценарій, де необхідно використати теоретичні знання для вирішення бізнес-задачі або оптимізації процесів.

### 2. Практичні завдання та кроки вирішення
1. **Збір та підготовка даних**: Визначення ключових вхідних параметрів та очищення вибірки.
2. **Аналітичний розрахунок**: Застосування відповідних формул та моделей для аналізу.
3. **Інтерпретація результатів**: Формулювання висновків та рекомендацій на основі розрахунків.

### 3. Контрольні запитання для самоперевірки
* Які основні обмеження має розглянутий метод у реальних умовах?
* Як зміниться результат, якщо вхідні параметри зміняться на 10%?
* Які потенційні помилки можуть виникнути при неправильній обробці пропущених значень?

---
> [!TIP]
> Спробуйте виконати це завдання самостійно, використовуючи шаблон та вивчені формули з попередніх підтем.`
  }

  response.json({ notes })
})

function parseId(value: string | undefined) {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    throw new Error('Valid numeric id is required')
  }
  return id
}

function parseEntityType(value: unknown): EntityType | undefined {
  return value === 'task' || value === 'snippet' || value === 'goal' || value === 'diary' || value === 'project' || value === 'mindmap' || value === 'roadmap' ? value : undefined
}

function toSearchParams(request: Request) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(request.query)) {
    if (typeof value === 'string') {
      params.set(key, value)
    }
  }
  return params
}

function removeUploadedFile(storedName: string | undefined) {
  if (!storedName) {
    return
  }
  const fullPath = path.join(uploadsDir, storedName)
  if (fullPath.startsWith(uploadsDir) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath)
  }
}

// Trigger restart 2


