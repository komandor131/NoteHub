import fs from 'node:fs'
import path from 'node:path'
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

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/tasks', (request, response) => {
  response.json(listTasks(1, toSearchParams(request)))
})

app.post('/api/tasks', (request, response) => {
  const task = createTask(1, normalizeTaskInput(request.body))
  response.status(201).json(task)
})

app.put('/api/tasks/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getTask(1, id)) {
    response.status(404).json({ error: 'Task not found' })
    return
  }
  response.json(updateTask(1, id, normalizeTaskInput(request.body)))
})

app.delete('/api/tasks/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getTask(1, id)) {
    response.status(404).json({ error: 'Task not found' })
    return
  }
  const attachments = listAttachments(1, 'task', id)
  deleteTask(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

app.get('/api/snippets', (request, response) => {
  response.json(listSnippets(1, toSearchParams(request)))
})

app.post('/api/snippets', (request, response) => {
  const snippet = createSnippet(1, normalizeSnippetInput(request.body))
  response.status(201).json(snippet)
})

app.put('/api/snippets/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSnippet(1, id)) {
    response.status(404).json({ error: 'Snippet not found' })
    return
  }
  response.json(updateSnippet(1, id, normalizeSnippetInput(request.body)))
})

app.delete('/api/snippets/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSnippet(1, id)) {
    response.status(404).json({ error: 'Snippet not found' })
    return
  }
  const attachments = listAttachments(1, 'snippet', id)
  deleteSnippet(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

app.get('/api/calendar', (request, response) => {
  response.json(listTasks(1, toSearchParams(request)))
})

app.get('/api/search', (request, response) => {
  const query = String(request.query.q ?? '').trim()
  response.json(query ? searchAll(1, query) : { tasks: [], snippets: [] })
})

app.get('/api/attachments', (request, response) => {
  const entityType = parseEntityType(request.query.entityType)
  const entityId = Number(request.query.entityId)
  response.json(listAttachments(1, entityType, Number.isFinite(entityId) ? entityId : undefined))
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
      ? getTask(1, entityId)
      : entityType === 'snippet'
        ? getSnippet(1, entityId)
        : entityType === 'goal'
          ? getGoal(1, entityId)
          : entityType === 'diary'
            ? getDiaryEntry(1, entityId)
            : entityType === 'project'
              ? getProject(1, entityId)
              : entityType === 'mindmap'
                ? getMindMap(1, entityId)
                : null

  if (!entityExists) {
    removeUploadedFile(request.file.filename)
    response.status(404).json({ error: 'Linked record not found' })
    return
  }

  const attachment = createAttachment(1, {
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
  const attachment = deleteAttachment(1, parseId(request.params.id))
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

app.listen(port, () => {
  console.log(`NoteHub API listening on http://localhost:${port}`)
})

// Balance
app.get('/api/balance', (_request, response) => {
  response.json({ amount: getBalance(1) })
})

app.put('/api/balance', (request, response) => {
  const amount = Number(request.body.amount)
  if (!Number.isFinite(amount)) {
    response.status(400).json({ error: 'amount is required and must be a number' })
    return
  }
  response.json(updateBalance(1, amount))
})

// Goals
app.get('/api/finance/goals', (_request, response) => {
  response.json(listGoals(1))
})

app.post('/api/finance/goals', (request, response) => {
  const goal = createGoal(1, normalizeGoalInput(request.body))
  response.status(201).json(goal)
})

app.put('/api/finance/goals/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getGoal(1, id)) {
    response.status(404).json({ error: 'Goal not found' })
    return
  }
  response.json(updateGoal(1, id, normalizeGoalInput(request.body)))
})

app.delete('/api/finance/goals/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getGoal(1, id)) {
    response.status(404).json({ error: 'Goal not found' })
    return
  }
  const attachments = listAttachments(1, 'goal', id)
  deleteGoal(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Diary
app.get('/api/diary', (_request, response) => {
  response.json(listDiaryEntries(1))
})

app.post('/api/diary', (request, response) => {
  const entry = createDiaryEntry(1, normalizeDiaryInput(request.body))
  response.status(201).json(entry)
})

app.put('/api/diary/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getDiaryEntry(1, id)) {
    response.status(404).json({ error: 'Diary entry not found' })
    return
  }
  response.json(updateDiaryEntry(1, id, normalizeDiaryInput(request.body)))
})

app.delete('/api/diary/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getDiaryEntry(1, id)) {
    response.status(404).json({ error: 'Diary entry not found' })
    return
  }
  const attachments = listAttachments(1, 'diary', id)
  deleteDiaryEntry(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Subscriptions
app.get('/api/subscriptions', (_request, response) => {
  response.json(listSubscriptions(1))
})

app.post('/api/subscriptions', (request, response) => {
  const sub = createSubscription(1, normalizeSubscriptionInput(request.body))
  response.status(201).json(sub)
})

app.put('/api/subscriptions/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSubscription(1, id)) {
    response.status(404).json({ error: 'Subscription not found' })
    return
  }
  response.json(updateSubscription(1, id, normalizeSubscriptionInput(request.body)))
})

app.delete('/api/subscriptions/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getSubscription(1, id)) {
    response.status(404).json({ error: 'Subscription not found' })
    return
  }
  deleteSubscription(1, id)
  response.status(204).end()
})

// Projects
app.get('/api/projects', (_request, response) => {
  response.json(listProjects(1))
})

app.post('/api/projects', (request, response) => {
  const project = createProject(1, normalizeProjectInput(request.body))
  response.status(201).json(project)
})

app.put('/api/projects/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getProject(1, id)) {
    response.status(404).json({ error: 'Project not found' })
    return
  }
  response.json(updateProject(1, id, normalizeProjectInput(request.body)))
})

app.delete('/api/projects/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getProject(1, id)) {
    response.status(404).json({ error: 'Project not found' })
    return
  }
  const attachments = listAttachments(1, 'project', id)
  deleteProject(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Habits
app.get('/api/habits', (_request, response) => {
  response.json(listHabits(1))
})

app.post('/api/habits', (request, response) => {
  const habit = createHabit(1, normalizeHabitInput(request.body))
  response.status(201).json(habit)
})

app.delete('/api/habits/:id', (request, response) => {
  const id = parseId(request.params.id)
  deleteHabit(1, id)
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
  response.json(toggleHabitLog(1, id, date, completed))
})

// Mind Maps
app.get('/api/mindmaps', (_request, response) => {
  response.json(listMindMaps(1))
})

app.get('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  const map = getMindMap(1, id)
  if (!map) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  response.json(map)
})

app.post('/api/mindmaps', (request, response) => {
  const map = createMindMap(1, normalizeMindMapInput(request.body))
  response.status(201).json(map)
})

app.put('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getMindMap(1, id)) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  response.json(updateMindMap(1, id, normalizeMindMapInput(request.body)))
})

app.delete('/api/mindmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getMindMap(1, id)) {
    response.status(404).json({ error: 'MindMap not found' })
    return
  }
  const attachments = listAttachments(1, 'mindmap', id)
  deleteMindMap(1, id)
  attachments.forEach((attachment) => removeUploadedFile(attachment.storedName))
  response.status(204).end()
})

// Roadmaps
app.get('/api/roadmaps', (_request, response) => {
  response.json(listRoadmaps(1))
})

app.get('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  const roadmap = getRoadmap(1, id)
  if (!roadmap) {
    response.status(404).json({ error: 'Roadmap not found' })
    return
  }
  response.json(roadmap)
})

app.post('/api/roadmaps', (request, response) => {
  const roadmap = createRoadmap(1, normalizeRoadmapInput(request.body))
  response.status(201).json(roadmap)
})

app.put('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getRoadmap(1, id)) {
    response.status(404).json({ error: 'Roadmap not found' })
    return 
  }
  response.json(updateRoadmap(1, id, normalizeRoadmapInput(request.body)))
})

app.delete('/api/roadmaps/:id', (request, response) => {
  const id = parseId(request.params.id)
  if (!getRoadmap(1, id)) {
    response.status(404).json({ error: 'Roadmap not found' })
    return
  }
  deleteRoadmap(1, id)
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


