import fs from 'node:fs'
import path from 'node:path'
import {
  getStudyModules,
  getStudyProgress,
  submitHomework,
  getAdminHomeworks,
  saveStudyProgress,
  getCourses,
  createCourse,
  getCourseModules,
  createModule,
  createLesson,
  recordStudyVisit,
  getStudyVisits,
  addStudyTime,
  getStudyTime,
  getStudyStreak,
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
  getNodeNotes,
  saveNodeNotes,
  listFlashcards,
  createFlashcard,
  deleteFlashcard,
  reviewFlashcard,
  listQuizzes,
  getStudyActivityStats,
  logStudyActivity,
  seedDefaultStudyContent,
  registerUser,
  loginUser,
  logoutSession,
} from './database.ts'
import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { mathNotes } from './mathNotes.ts'
import { authMiddleware } from './authMiddleware.ts'

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
seedDefaultStudyContent(1)

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
app.get('/api/study/courses', authMiddleware, (_req, res) => {
  try {
    res.json(getCourses())
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/courses', authMiddleware, (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' })
    }
    const course = createCourse(req.body)
    res.json(course)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/study/courses/:id/modules', authMiddleware, (req, res) => {
  try {
    const courseId = Number(req.params.id)
    res.json(getCourseModules(courseId))
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/courses/:id/modules', authMiddleware, (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' })
    }
    const courseId = Number(req.params.id)
    const mod = createModule(courseId, req.body)
    res.json(mod)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/study/modules/:id/lessons', authMiddleware, (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' })
    }
    const moduleId = Number(req.params.id)
    const lesson = createLesson(moduleId, req.body)
    res.json(lesson)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
})

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

app.get('/api/study/stats', authMiddleware, (req, res) => {
  try {
    const userId = req.user!.id
    const streak = getStudyStreak(userId)
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const weekStart = monday.toLocaleDateString('sv')
    
    const weeklySeconds = getStudyTime(userId, weekStart)
    const visits = getStudyVisits(userId)
    
    res.json({ streak, weeklySeconds, visits })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/visit', authMiddleware, (req, res) => {
  try {
    const { date } = req.body
    if (!date) {
      return res.status(400).json({ error: 'Date is required' })
    }
    recordStudyVisit(req.user!.id, date)
    const streak = getStudyStreak(req.user!.id)
    res.json({ success: true, streak })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/study/time', authMiddleware, (req, res) => {
  try {
    const { seconds, weekStart } = req.body
    if (typeof seconds !== 'number' || !weekStart) {
      return res.status(400).json({ error: 'seconds and weekStart are required' })
    }
    addStudyTime(req.user!.id, seconds, weekStart)
    const weeklySeconds = getStudyTime(req.user!.id, weekStart)
    res.json({ success: true, weeklySeconds })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Serve static assets in production if built
const distDir = path.join(process.cwd(), 'dist')
if (fs.existsSync(distDir)) {
  console.log(`Serving static files from: ${distDir}`)
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next()
    }
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

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

function findNoteKey(nodeId: string): string | null {
  if (mathNotes[nodeId]) return nodeId

  const allKeys = Object.keys(mathNotes)
  const parts = nodeId.split('_')
  if (parts.length === 3) {
    const [prefix, num1, num2] = parts
    const regex = new RegExp(`^${prefix}_${num1}_[a-zA-Z0-9_]+_${num2}$`)
    const match = allKeys.find((k) => regex.test(k))
    if (match) return match
  }
  if (parts.length === 2) {
    const [prefix, num1] = parts
    const regex = new RegExp(`^${prefix}_${num1}_[a-zA-Z0-9_]+$`)
    const match = allKeys.find((k) => regex.test(k) && !k.endsWith('_1') && !k.endsWith('_2') && !k.endsWith('_3') && !k.endsWith('_4'))
    if (match) return match
  }
  return null
}

app.get('/api/roadmaps/notes/:nodeId', (request, response) => {
  const { nodeId } = request.params
  const userId = request.user ? request.user.id : 1
  let notes = getNodeNotes(userId, nodeId)

  if (!notes) {
    const mappedKey = findNoteKey(nodeId)
    if (mappedKey && mathNotes[mappedKey]) {
      notes = mathNotes[mappedKey]
    } else {
      notes = mathNotes[nodeId] || null
    }
  }

  if (!notes) {
    notes = `## Навчальний конспект теми

### 1. 📖 Концептуальна основа та вступ
Цей розділ присвячено комплексному аналізу теми. Розуміння цієї концепції є базовим для прийняття рішень та оптимізації алгоритмів у сучасних аналітичних та інженерних системах.

### 2. 📐 Математичний опис та ключові залежності
Основне математичне формулювання:
$$\\mathcal{F}(x) = \\frac{1}{n} \\sum_{i=1}^{n} w_i \\cdot \\Big( x_i - \\mu \\Big) + \\epsilon$$

* $x_i$ — вхідні спостереження вибірки
* $w_i$ — нормалізовані вагові коефіцієнти
* $\\mu$ — математичне сподівання або центр розподілу
* $\\epsilon$ залишковий шум спостереження

### 3. ✍️ Покроковий алгоритм розрахунку
1. **Підготовка та валідація даних**: Очищення від екстремальних викидів та перевірка повноти спостережень.
2. **Аналітичний розрахунок**: Поетапне підставлення значень у формулу з фіксацією проміжних результатів.
3. **Інтерпретація метрик**: Порівняння з референтними значеннями та формулювання висновків.

---
> [!TIP]
> **Лайфхак для запам'ятовування**: Проводьте асоціацію з фізичним процесом або життєвим розподілом. Розуміння фізичного змісту дозволяє миттєво відтворювати формулу без заучування.

> [!WARNING]
> **Пастка початківців**: Ніколи не обчислюйте параметри на необроблених сирих даних без попередньої оцінки форми розподілу та викидів!

---
*Конспект можна доповнювати власними коментарями, додавати формули LaTeX та зберігати персональні розбори від ШІ-Викладача!*`
  }

  response.json({ notes })
})

app.put('/api/roadmaps/notes/:nodeId', (request, response) => {
  const { nodeId } = request.params
  const userId = request.user ? request.user.id : 1
  const { notes } = request.body
  if (typeof notes !== 'string') {
    response.status(400).json({ error: 'Notes string is required' })
    return
  }
  saveNodeNotes(userId, nodeId, notes)
  response.json({ success: true, notes })
})

// Flashcards API
app.get('/api/study/flashcards', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const roadmapId = request.query.roadmapId ? Number(request.query.roadmapId) : undefined
  const nodeId = request.query.nodeId ? String(request.query.nodeId) : undefined
  response.json(listFlashcards(userId, roadmapId, nodeId))
})

app.post('/api/study/flashcards', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { roadmapId, nodeId, question, answer } = request.body
  if (!question || !answer) {
    response.status(400).json({ error: 'Question and answer are required' })
    return
  }
  const card = createFlashcard(userId, { roadmapId, nodeId, question, answer })
  response.status(201).json(card)
})

app.post('/api/study/flashcards/:id/review', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const id = parseId(request.params.id)
  const { rating } = request.body
  if (rating !== 'easy' && rating !== 'good' && rating !== 'hard') {
    response.status(400).json({ error: 'Invalid rating. Expected easy, good, or hard' })
    return
  }
  reviewFlashcard(userId, id, rating)
  response.json({ success: true })
})

app.delete('/api/study/flashcards/:id', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const id = parseId(request.params.id)
  deleteFlashcard(userId, id)
  response.status(204).end()
})

// Quizzes API
app.get('/api/study/quizzes', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const nodeId = request.query.nodeId ? String(request.query.nodeId) : undefined
  response.json(listQuizzes(userId, nodeId))
})

app.post('/api/study/quizzes/submit', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { score, total } = request.body
  const passed = score >= Math.ceil(total * 0.6)
  const xpEarned = score * 15 + (passed ? 30 : 5)
  logStudyActivity(userId, 'quiz_pass', xpEarned)
  response.json({ success: true, xpEarned, passed })
})

// Activity & Gamification API
app.get('/api/study/activity', (request, response) => {
  const userId = request.user ? request.user.id : 1
  response.json(getStudyActivityStats(userId))
})

app.post('/api/study/activity/log', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { type, xp } = request.body
  logStudyActivity(userId, type || 'node_complete', xp || 20)
  response.json({ success: true })
})

// Built-in AI Study Assistant API
app.post('/api/study/ai-tutor', (request, response) => {
  const { topicTitle, userMessage, actionType } = request.body
  const cleanTitle = (topicTitle || 'Обрана тема').replace(/^\d+(\.\d+)*\s*/, '')

  let reply = ''

  if (actionType === 'explain') {
    reply = `### 💡 Пояснення теми: **${cleanTitle}**

Уявімо цю концепцію на простому прикладі:

1. **Суть концепції**: Це ключовий інструмент, який дозволяє узагальнювати дані або прогнозувати поведінку складної системи.
2. **Чому це важливо**: Без розуміння цього механізму неможливо коректно інтерпретувати розрахунки та оцінювати похибки у практичних завданнях.

> [!TIP]
> Спробуйте сформулювати своїми словами: як би ви пояснили цю концепцію іншій людині?`
  } else if (actionType === 'formulas') {
    reply = `### 📐 Ключові математичні формули: **${cleanTitle}**

Базове математичне формулювання:
$$\\text{Метрика} = \\frac{1}{n} \\sum_{i=1}^{n} \\Big( x_i - \\mu \\Big)^2$$

* $x_i$ — $i$-те значення у вибірці
* $\\mu$ — середнє значення
* $n$ — кількість спостережень

> [!IMPORTANT]
> Зверніть увагу на розмірність: для отримання базових одиниць часто береться квадратний корінь $\\sigma = \\sqrt{\\text{Дисперсія}}$.`
  } else if (actionType === 'example') {
    reply = `### ✍️ Покроковий приклад розрахунку на числах

Візьмемо простий набір спостережень:
$$\\mathcal{D} = \\{ 4, 7, 8, 11, 15 \\}$$

1. **Крок 1**: Рахуємо суму елементів:
   $$\\sum = 4 + 7 + 8 + 11 + 15 = 45$$
2. **Крок 2**: Кількість елементів $n = 5$.
3. **Крок 3**: Обчислюємо середнє:
   $$\\bar{x} = \\frac{45}{5} = 9$$
4. **Крок 4**: Рахуємо відхилення від середнього:
   $$(4-9)^2 = 25, \\quad (7-9)^2 = 4, \\quad (8-9)^2 = 1, \\quad (11-9)^2 = 4, \\quad (15-9)^2 = 36$$
   $$\\text{Сума квадратів} = 25 + 4 + 1 + 4 + 36 = 70$$
   $$S^2 = \\frac{70}{5 - 1} = 17.5$$

Результат отримано вручну без сторонніх калькуляторів!`
  } else if (actionType === 'task') {
    reply = `### ❓ Практична задача для самоперевірки

**Умова задачі:**
Дано вибірку результатів спостережень:
$$\\mathcal{X} = \\{ 10, 12, 14, 16, 18, 20 \\}$$

**Завдання:**
1. Знайдіть медіану ($Me$) та середнє арифметичне ($\\bar{x}$).
2. Визначте, як зміниться результат, якщо останнє число $20$ замінити на викид $200$.

*Напишіть вашу відповідь у чат, і я перевірю хід розрахунків!* 🚀`
  } else {
    reply = `Чудове запитання щодо теми **${cleanTitle}**!

Розглянемо це поетапно:
1. За наданим запитом: *${userMessage || 'Поясни детальніше'}*
2. Головне правило тут полягає у послідовному аналізі вхідних параметрів та застосуванні формули без поспіху.

Чи бажаєте розібрати конкретний числовий приклад чи подивитися на практичне застосування в реальних проєктах?`
  }

  response.json({ reply })
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







