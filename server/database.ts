import fs from 'node:fs'
import path from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import initSqlJs, {
  type BindParams,
  type Database,
  type SqlJsStatic,
  type SqlValue,
} from 'sql.js'

export type EntityType = 'task' | 'snippet' | 'goal' | 'diary' | 'project' | 'mindmap' | 'roadmap'
export type UserRole = 'admin' | 'user'
export type TaskType = 'task' | 'event' | 'deadline' | 'note'
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface UserRecord {
  id: number
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

interface StoredUserRecord extends UserRecord {
  passwordHash: string
  passwordSalt: string
}

export interface AuthResult {
  user: UserRecord
  token: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface StudyLessonRecord {
  id: number
  moduleId: number
  title: string
  kind: 'program' | 'lesson' | 'practice'
  content: string
  homeworkPrompt: string
  orderIndex: number
  completed: boolean
  submission: HomeworkSubmissionRecord | null
}

export interface StudyModuleRecord {
  id: number
  title: string
  description: string
  orderIndex: number
  lessons: StudyLessonRecord[]
}

export interface HomeworkSubmissionRecord {
  id: number
  lessonId: number
  userId: number
  userName: string
  userEmail: string
  moduleTitle: string
  lessonTitle: string
  answer: string
  status: 'submitted' | 'reviewed' | 'needs-work'
  feedback: string
  createdAt: string
  updatedAt: string
}

export interface MindMapRecord {
  id: number
  title: string
  nodes_data: string
  attachments: AttachmentRecord[]
  createdAt: string
  updatedAt: string
}

export interface MindMapInput {
  title: string
  nodes_data: string
}

export interface BalanceRecord {
  amount: number
}

export interface FinanceGoalRecord {
  id: number
  title: string
  description: string
  target_amount: number
  saved_amount: number
  target_date: string | null
  attachments: AttachmentRecord[]
  createdAt: string
  updatedAt: string
}

export interface FinanceGoalInput {
  title: string
  description: string
  target_amount: number
  saved_amount: number
  target_date: string | null
}

export interface DiaryEntryRecord {
  id: number
  title: string
  content: string
  date: string
  attachments: AttachmentRecord[]
  createdAt: string
  updatedAt: string
}

export interface DiaryEntryInput {
  title: string
  content: string
  date: string
}

export interface SubscriptionRecord {
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

export interface SubscriptionInput {
  title: string
  amount: number
  period: 'monthly' | 'weekly'
  next_payment_date: string
  category: string
  color: string
}

export interface AttachmentRecord {
  id: number
  originalName: string
  storedName: string
  mimeType: string
  size: number
  entityType: EntityType
  entityId: number
  createdAt: string
}

export interface ProjectRecord {
  id: number
  title: string
  description: string
  repo_url: string
  prod_url: string
  tech_stack: string[]
  links: { name: string; url: string }[]
  canvas_data: string
  is_completed: boolean
  attachments: AttachmentRecord[]
  createdAt: string
  updatedAt: string
}

export interface ProjectInput {
  title: string
  description: string
  repo_url: string
  prod_url: string
  tech_stack: string[]
  links: { name: string; url: string }[]
  canvas_data?: string
  is_completed?: boolean
}

export interface RoadmapRecord {
  id: number
  title: string
  description: string
  canvas_data: string
  createdAt: string
  updatedAt: string
}

export interface RoadmapInput {
  title: string
  description: string
  canvas_data?: string
}

export interface HabitRecord {
  id: number
  title: string
  color: string
  createdAt: string
  updatedAt: string
  history: string[]
}

export interface HabitInput {
  title: string
  color: string
}

export interface TaskRecord {
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
  attachments: AttachmentRecord[]
  projectId: number | null
  createdAt: string
  updatedAt: string
}

export interface SnippetRecord {
  id: number
  title: string
  language: string
  code: string
  explanation: string
  tags: string[]
  attachments: AttachmentRecord[]
  projectId: number | null
  createdAt: string
  updatedAt: string
}

export interface TaskInput {
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

export interface SnippetInput {
  title: string
  language: string
  code: string
  explanation: string
  tags: string[]
  projectId?: number | null
}

type Row = Record<string, SqlValue>

const dataDir = path.join(process.cwd(), 'database')
const dbPath = path.join(dataDir, 'notehub.sqlite')
const taskTypes = new Set<TaskType>(['task', 'event', 'deadline', 'note'])
const statuses = new Set<TaskStatus>(['todo', 'in-progress', 'done', 'archived'])
const priorities = new Set<TaskPriority>(['low', 'medium', 'high'])


let sql: SqlJsStatic | null = null
let db: Database | null = null

export async function initDatabase() {
  fs.mkdirSync(dataDir, { recursive: true })
  sql = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  })

  const source = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined
  db = source ? new sql.Database(source) : new sql.Database()
  migrate()
  const admin = seedDefaultUsers()
  claimUnownedRecords(admin.id)
  seedIfEmpty(admin.id)
  seedStudyContent()
  persist()
}

export function registerUser(input: RegisterInput): AuthResult {
  const name = requiredText(input.name, 'Name is required')
  const email = normalizeEmail(input.email)
  const password = validatePassword(input.password)
  if (findUserByEmail(email)) {
    throw new Error('User with this email already exists')
  }

  const now = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)
  run(
    `INSERT INTO users (name, email, passwordHash, passwordSalt, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, passwordHash, salt, 'user', now, now],
  )
  const user = getUserById(lastInsertId())
  if (!user) {
    throw new Error('User could not be created')
  }
  return createSession(user)
}

export function loginUser(input: LoginInput): AuthResult {
  const email = normalizeEmail(input.email)
  const password = validatePassword(input.password)
  const user = findStoredUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    throw new Error('Invalid email or password')
  }
  return createSession(user)
}

export function getUserBySessionToken(token: string) {
  const normalized = token.trim()
  if (!normalized) {
    return null
  }
  return one<UserRecord>(
    `SELECT users.* FROM auth_sessions
      JOIN users ON users.id = auth_sessions.userId
      WHERE auth_sessions.token = ?`,
    [normalized],
    mapUser,
  )
}

export function logoutSession(token: string) {
  run('DELETE FROM auth_sessions WHERE token = ?', [token])
  persist()
}

export function listUsers() {
  return all<UserRecord>('SELECT * FROM users ORDER BY createdAt ASC', [], mapUser)
}

export function listTasks(userId: number, filters: URLSearchParams = new URLSearchParams()) {
  let tasks = all<TaskRecord>(
    `SELECT * FROM tasks WHERE ownerId = ? ORDER BY COALESCE(startAt, dueDate, createdAt) ASC`,
    [userId],
    mapTask,
  )

  const query = filters.get('q')?.trim().toLowerCase()
  const type = filters.get('type')
  const status = filters.get('status')
  const priority = filters.get('priority')
  const tag = filters.get('tag')?.trim().toLowerCase()
  const from = filters.get('from')
  const to = filters.get('to')

  if (query) {
    tasks = tasks.filter((task) =>
      `${task.title} ${task.description} ${task.tags.join(' ')}`
        .toLowerCase()
        .includes(query),
    )
  }
  if (type && taskTypes.has(type as TaskType)) {
    tasks = tasks.filter((task) => task.type === type)
  }
  if (status && statuses.has(status as TaskStatus)) {
    tasks = tasks.filter((task) => task.status === status)
  }
  if (priority && priorities.has(priority as TaskPriority)) {
    tasks = tasks.filter((task) => task.priority === priority)
  }
  if (tag) {
    tasks = tasks.filter((task) => task.tags.some((item) => item.toLowerCase() === tag))
  }
  if (from || to) {
    tasks = tasks.filter((task) => taskTouchesRange(task, from, to))
  }

  return tasks
}

export function getTask(userId: number, id: number) {
  return one<TaskRecord>('SELECT * FROM tasks WHERE id = ? AND ownerId = ?', [id, userId], mapTask)
}

export function createTask(userId: number, input: TaskInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO tasks
      (ownerId, title, description, type, status, priority, startAt, endAt, dueDate, color, projectId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.title,
      input.description,
      input.type,
      input.status,
      input.priority,
      input.startAt,
      input.endAt,
      input.dueDate,
      input.color,
      input.projectId ?? null,
      now,
      now,
    ],
  )
  const id = lastInsertId()
  replaceTags('task', id, input.tags)
  persist()
  return getTask(userId, id)
}

export function updateTask(userId: number, id: number, input: TaskInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE tasks
      SET title = ?, description = ?, type = ?, status = ?, priority = ?, startAt = ?,
          endAt = ?, dueDate = ?, color = ?, projectId = ?, updatedAt = ?
      WHERE id = ? AND ownerId = ?`,
    [
      input.title,
      input.description,
      input.type,
      input.status,
      input.priority,
      input.startAt,
      input.endAt,
      input.dueDate,
      input.color,
      input.projectId ?? null,
      now,
      id,
      userId,
    ],
  )
  replaceTags('task', id, input.tags)
  persist()
  return getTask(userId, id)
}

export function deleteTask(userId: number, id: number) {
  deleteEntityAttachments(userId, 'task', id)
  run('DELETE FROM task_tags WHERE taskId = ?', [id])
  run('DELETE FROM tasks WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

export function listSnippets(userId: number, filters: URLSearchParams = new URLSearchParams()) {
  let snippets = all<SnippetRecord>(
    'SELECT * FROM snippets WHERE ownerId = ? ORDER BY updatedAt DESC',
    [userId],
    mapSnippet,
  )
  const query = filters.get('q')?.trim().toLowerCase()
  const language = filters.get('language')?.trim().toLowerCase()
  const tag = filters.get('tag')?.trim().toLowerCase()

  if (query) {
    snippets = snippets.filter((snippet) =>
      `${snippet.title} ${snippet.language} ${snippet.explanation} ${snippet.code} ${snippet.tags.join(' ')}`
        .toLowerCase()
        .includes(query),
    )
  }
  if (language) {
    snippets = snippets.filter((snippet) => snippet.language.toLowerCase() === language)
  }
  if (tag) {
    snippets = snippets.filter((snippet) =>
      snippet.tags.some((item) => item.toLowerCase() === tag),
    )
  }

  return snippets
}

export function getSnippet(userId: number, id: number) {
  return one<SnippetRecord>('SELECT * FROM snippets WHERE id = ? AND ownerId = ?', [id, userId], mapSnippet)
}

export function createSnippet(userId: number, input: SnippetInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO snippets (ownerId, title, language, code, explanation, projectId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, input.title, input.language, input.code, input.explanation, input.projectId ?? null, now, now],
  )
  const id = lastInsertId()
  replaceTags('snippet', id, input.tags)
  persist()
  return getSnippet(userId, id)
}

export function updateSnippet(userId: number, id: number, input: SnippetInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE snippets
      SET title = ?, language = ?, code = ?, explanation = ?, projectId = ?, updatedAt = ?
      WHERE id = ? AND ownerId = ?`,
    [input.title, input.language, input.code, input.explanation, input.projectId ?? null, now, id, userId],
  )
  replaceTags('snippet', id, input.tags)
  persist()
  return getSnippet(userId, id)
}

export function deleteSnippet(userId: number, id: number) {
  deleteEntityAttachments(userId, 'snippet', id)
  run('DELETE FROM snippet_tags WHERE snippetId = ?', [id])
  run('DELETE FROM snippets WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

export function listAttachments(userId: number, entityType?: EntityType, entityId?: number) {
  if (entityType && Number.isFinite(entityId)) {
    return all<AttachmentRecord>(
      'SELECT * FROM attachments WHERE ownerId = ? AND entityType = ? AND entityId = ? ORDER BY createdAt DESC',
      [userId, entityType, entityId ?? 0],
      mapAttachment,
    )
  }
  return all<AttachmentRecord>(
    'SELECT * FROM attachments WHERE ownerId = ? ORDER BY createdAt DESC',
    [userId],
    mapAttachment,
  )
}

export function getAttachment(userId: number, id: number) {
  return one<AttachmentRecord>('SELECT * FROM attachments WHERE id = ? AND ownerId = ?', [id, userId], mapAttachment)
}

export function createAttachment(userId: number, input: Omit<AttachmentRecord, 'id' | 'createdAt'>) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO attachments
      (ownerId, originalName, storedName, mimeType, size, entityType, entityId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.originalName,
      input.storedName,
      input.mimeType,
      input.size,
      input.entityType,
      input.entityId,
      now,
    ],
  )
  const id = lastInsertId()
  persist()
  return getAttachment(userId, id)
}

export function deleteAttachment(userId: number, id: number) {
  const attachment = getAttachment(userId, id)
  if (!attachment) {
    return null
  }
  run('DELETE FROM attachments WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
  return attachment
}

export function searchAll(userId: number, query: string) {
  const params = new URLSearchParams({ q: query })
  return {
    tasks: listTasks(userId, params),
    snippets: listSnippets(userId, params),
  }
}

export function normalizeTaskInput(body: unknown): TaskInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Task title is required'),
    description: optionalText(object.description),
    type: enumValue(object.type, taskTypes, 'task'),
    status: enumValue(object.status, statuses, 'todo'),
    priority: enumValue(object.priority, priorities, 'medium'),
    startAt: optionalDateText(object.startAt),
    endAt: optionalDateText(object.endAt),
    dueDate: optionalDateText(object.dueDate),
    color: optionalText(object.color) || '#FF4FA3',
    tags: normalizeTags(object.tags),
    projectId: object.projectId !== null && object.projectId !== undefined && object.projectId !== '' ? Number(object.projectId) : null,
  }
}

export function normalizeSnippetInput(body: unknown): SnippetInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Snippet title is required'),
    language: optionalText(object.language) || 'typescript',
    code: optionalText(object.code),
    explanation: optionalText(object.explanation),
    tags: normalizeTags(object.tags),
    projectId: object.projectId !== null && object.projectId !== undefined && object.projectId !== '' ? Number(object.projectId) : null,
  }
}

function migrate() {
  run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      passwordSalt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS user_balances (
      userId INTEGER PRIMARY KEY,
      amount REAL NOT NULL DEFAULT 0.0
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS study_modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      orderIndex INTEGER NOT NULL DEFAULT 0
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS study_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      moduleId INTEGER NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'lesson',
      content TEXT NOT NULL DEFAULT '',
      homeworkPrompt TEXT NOT NULL DEFAULT '',
      orderIndex INTEGER NOT NULL DEFAULT 0
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS study_progress (
      userId INTEGER NOT NULL,
      lessonId INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (userId, lessonId)
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS homework_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      lessonId INTEGER NOT NULL,
      answer TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      feedback TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      startAt TEXT,
      endAt TEXT,
      dueDate TEXT,
      color TEXT NOT NULL,
      projectId INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT '',
      projectId INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      taskId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (taskId, tagId)
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS snippet_tags (
      snippetId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (snippetId, tagId)
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      entityType TEXT NOT NULL,
      entityId INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS balance (
      id INTEGER PRIMARY KEY DEFAULT 1,
      amount REAL NOT NULL DEFAULT 0.0
    );
  `)
  run(`
    INSERT OR IGNORE INTO balance (id, amount) VALUES (1, 0.0);
  `)
  run(`
    CREATE TABLE IF NOT EXISTS finance_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      target_amount REAL NOT NULL,
      saved_amount REAL NOT NULL DEFAULT 0.0,
      target_date TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      next_payment_date TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
  run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      repo_url TEXT NOT NULL DEFAULT '',
      prod_url TEXT NOT NULL DEFAULT '',
      tech_stack TEXT NOT NULL DEFAULT '',
      links TEXT NOT NULL DEFAULT '',
      canvas_data TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)

  run(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#a855f7',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)

  run(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      habitId INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (habitId, date)
    );
  `)

  run(`
    CREATE TABLE IF NOT EXISTS mindmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      nodes_data TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)

  run(`
    CREATE TABLE IF NOT EXISTS roadmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      canvas_data TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)

  // Safely alter existing tables to add columns if they don't exist
  try {
    run(`ALTER TABLE tasks ADD COLUMN projectId INTEGER;`)
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    run(`ALTER TABLE snippets ADD COLUMN projectId INTEGER;`)
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    run(`ALTER TABLE projects ADD COLUMN canvas_data TEXT DEFAULT '{}';`)
  } catch (e) {
    // Ignore error if column already exists
  }

  try {
    run(`ALTER TABLE projects ADD COLUMN is_completed INTEGER DEFAULT 0;`)
  } catch (e) {
    // Ignore error if column already exists
  }

  for (const table of [
    'tasks',
    'snippets',
    'attachments',
    'finance_goals',
    'diary_entries',
    'subscriptions',
    'projects',
    'habits',
    'mindmaps',
    'roadmaps',
  ]) {
    addColumnIfMissing(table, 'ownerId', 'INTEGER')
  }
}

function seedDefaultUsers() {
  const adminEmail = normalizeEmail(process.env.NOTEHUB_ADMIN_EMAIL || 'admin@notehub.local')
  const adminPassword = process.env.NOTEHUB_ADMIN_PASSWORD || 'admin12345'
  const admin = findStoredUserByEmail(adminEmail)
  if (admin) {
    return admin
  }

  const now = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  run(
    `INSERT INTO users (name, email, passwordHash, passwordSalt, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      process.env.NOTEHUB_ADMIN_NAME || 'NoteHub Admin',
      adminEmail,
      hashPassword(adminPassword, salt),
      salt,
      'admin',
      now,
      now,
    ],
  )
  return findStoredUserByEmail(adminEmail) ?? {
    id: lastInsertId(),
    name: 'NoteHub Admin',
    email: adminEmail,
    role: 'admin',
    passwordHash: '',
    passwordSalt: '',
    createdAt: now,
    updatedAt: now,
  }
}

function claimUnownedRecords(adminUserId: number) {
  for (const table of [
    'tasks',
    'snippets',
    'attachments',
    'finance_goals',
    'diary_entries',
    'subscriptions',
    'projects',
    'habits',
    'mindmaps',
    'roadmaps',
  ]) {
    run(`UPDATE ${table} SET ownerId = ? WHERE ownerId IS NULL OR ownerId = 0`, [adminUserId])
  }
  run('INSERT OR IGNORE INTO user_balances (userId, amount) VALUES (?, COALESCE((SELECT amount FROM balance WHERE id = 1), 0.0))', [
    adminUserId,
  ])
}

function seedIfEmpty(adminUserId: number) {
  const existing = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM tasks WHERE ownerId = ?',
    [adminUserId],
    (row) => ({ count: numberValue(row.count) }),
  )

  const today = new Date()
  const yyyyMmDd = today.toISOString().slice(0, 10)

  if (!existing || existing.count === 0) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowKey = tomorrow.toISOString().slice(0, 10)

    createTask(adminUserId, {
      title: 'Запланувати тиждень',
      description: 'Перевірити календар, дедлайни і важливі нотатки.',
      type: 'task',
      status: 'in-progress',
      priority: 'high',
      startAt: `${yyyyMmDd}T09:30`,
      endAt: `${yyyyMmDd}T10:15`,
      dueDate: yyyyMmDd,
      color: '#FF4FA3',
      tags: ['planning', 'focus'],
    })
    createTask(adminUserId, {
      title: 'Дедлайн по UI',
      description: 'Завершити перший вигляд панелі задач і сховища коду.',
      type: 'deadline',
      status: 'todo',
      priority: 'high',
      startAt: null,
      endAt: null,
      dueDate: tomorrowKey,
      color: '#0B0B0F',
      tags: ['design'],
    })
    createSnippet(adminUserId, {
      title: 'Express async route wrapper',
      language: 'typescript',
      code: `const route = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next)
}`,
      explanation: 'Small helper for forwarding async Express errors to error middleware.',
      tags: ['express', 'api'],
    })
  }

  const subCount = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM subscriptions WHERE ownerId = ?',
    [adminUserId],
    (row) => ({ count: numberValue(row.count) }),
  )
  if (!subCount || subCount.count === 0) {
    createSubscription(adminUserId, {
      title: 'Netflix Premium',
      amount: 400,
      period: 'monthly',
      next_payment_date: yyyyMmDd,
      category: 'Розваги',
      color: '#ef4444',
    })
    createSubscription(adminUserId, {
      title: 'Spotify Family',
      amount: 150,
      period: 'monthly',
      next_payment_date: yyyyMmDd,
      category: 'Музика',
      color: '#1db954',
    })
  }

  const existingRoadmap = one<{ id: number; canvas_data: string }>(
    'SELECT id, canvas_data FROM roadmaps WHERE ownerId = ? LIMIT 1',
    [adminUserId],
    (row) => ({ id: numberValue(row.id), canvas_data: textValue(row.canvas_data) }),
  )
  if (existingRoadmap && (!existingRoadmap.canvas_data.includes('"excel"') || !existingRoadmap.canvas_data.includes('"sheets"') || !existingRoadmap.canvas_data.includes('"y":22200'))) {
    run('DELETE FROM roadmaps WHERE id = ? AND ownerId = ?', [existingRoadmap.id, adminUserId])
  }

  const roadmapCount = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM roadmaps WHERE ownerId = ?',
    [adminUserId],
    (row) => ({ count: numberValue(row.count) }),
  )
  if (!roadmapCount || roadmapCount.count === 0) {
    interface Substep {
      id: string
      title: string
      text: string
    }
    interface Step {
      id: string
      title: string
      text: string
      linkUrl?: string
      linkLabel?: string
      substeps: Substep[]
    }
    interface Track {
      id: string
      title: string
      text: string
      x: number
      y?: number
      steps: Step[]
    }

    const tracks: Track[] = [
      {
        id: "math",
        title: "1. Математика та статистика",
        text: "Фундамент для аналізу даних, статистичних тестів та машинного навчання.",
        x: 300,
        steps: [
          {
            id: "math_1_desc",
            title: "1.1 Описова статистика",
            text: "Міри центральної тенденції (середнє, медіана, мода) та міри розсіювання (дисперсія, стандартне відхилення).",
            linkUrl: "https://www.khanacademy.org/math/statistics-probability",
            linkLabel: "Khan Academy Stats",
            substeps: [
              { id: "math_1_desc_1", title: "1.1.1 Міри центру", text: "Розрахунок середнього, медіани та моди. Робота з виваженим середнім для різних типів даних." },
              { id: "math_1_desc_2", title: "1.1.2 Міри розсіювання", text: "Дисперсія, стандартне відхилення, розмах (range) та інтерквартильний розмах (IQR)." },
              { id: "math_1_desc_3", title: "1.1.3 Форма розподілу", text: "Асиметрія (skewness), ексцес (kurtosis) та квантилі розподілу. Діаграма ящик з вусами." }
            ]
          },
          {
            id: "math_2_prob",
            title: "1.2 Теорія ймовірностей",
            text: "Основні поняття, умовна ймовірність, незалежні події та ключова теорема Байєса.",
            linkUrl: "https://www.khanacademy.org/math/statistics-probability/probability-library",
            linkLabel: "Probability Course",
            substeps: [
              { id: "math_2_prob_1", title: "1.2.1 Базові ймовірності", text: "Простір елементарних подій, правила додавання та множення ймовірностей." },
              { id: "math_2_prob_2", title: "1.2.2 Умовна ймовірність", text: "Залежні події, формула повної ймовірності та дерево рішень для ймовірностей." },
              { id: "math_2_prob_3", title: "1.2.3 Теорема Байєса", text: "Формула Байєса. Апріорна, ліклігуд (правдопобібність) та апостеріорна ймовірність." }
            ]
          },
          {
            id: "math_3_dist",
            title: "1.3 Розподіли ймовірностей",
            text: "Вивчіть: нормальний розподіл (z-score, правило 68-95-99.7), біноміальний, Пуассона та експоненціальний розподіли.",
            linkUrl: "https://www.khanacademy.org/math/ap-statistics/random-variables-ap",
            linkLabel: "Random Variables Guide",
            substeps: [
              { id: "math_3_dist_1", title: "1.3.1 Дискретні розподіли", text: "Рівномірний, біноміальний розподіл Бернуллі, геометричний та розподіл Пуассона." },
              { id: "math_3_dist_2", title: "1.3.2 Нормальний розподіл", text: "Властивості дзвоноподібної кривої, стандартний нормальний розподіл та робота із z-оцінками." },
              { id: "math_3_dist_3", title: "1.3.3 Інші безперервні", text: "Експоненціальний, логнормальний, розподіл Стьюдента (t-розподіл), F-розподіл." }
            ]
          },
          {
            id: "math_4_hyp",
            title: "1.4 Перевірка гіпотез",
            text: "Формулювання H0 та H1, p-value, помилки I та II роду, t-тести, Z-тести, критерій Хі-квадрат та ANOVA.",
            linkUrl: "https://www.khanacademy.org/math/ap-statistics/tests-significance-ap",
            linkLabel: "Hypothesis Testing",
            substeps: [
              { id: "math_4_hyp_1", title: "1.4.1 Статистичні гіпотези", text: "Формулювання нульової H0 та альтернативної H1 гіпотез, статистична потужність та помилки 1 і 2 роду." },
              { id: "math_4_hyp_2", title: "1.4.2 t-тести та Z-тести", text: "Одновибіркові, двовибіркові незалежні та парні тести для перевірки рівності середніх." },
              { id: "math_4_hyp_3", title: "1.4.3 ANOVA та Хі-квадрат", text: "Дисперсійний аналіз (ANOVA) для кількох груп, тест незалежності Хі-квадрат та критерій згоди." }
            ]
          },
          {
            id: "math_5_la_vec",
            title: "1.5 Лінійна алгебра: Вектори",
            text: "Вектори, операції над ними, скалярний добуток, матриці, додавання та множення матриць.",
            linkUrl: "https://www.coursera.org/specializations/mathematics-machine-learning",
            linkLabel: "Math for ML Specialization",
            substeps: [
              { id: "math_5_la_vec_1", title: "1.5.1 Векторний простір", text: "Лінійна незалежність векторів, колінеарність, базис векторного простору." },
              { id: "math_5_la_vec_2", title: "1.5.2 Операції з векторами", text: "Додавання, множення на скаляр, скалярний добуток (dot product), косинусна відстань." },
              { id: "math_5_la_vec_3", title: "1.5.3 Норми векторів", text: "L1 норма (манхеттенська), L2 норма (евклідова), відстані Мінковського." }
            ]
          },
          {
            id: "math_6_la_trans",
            title: "1.6 Матричні перетворення",
            text: "Визначники (determinants), обернені матриці, лінійні перетворення, власні значення та власні вектори (eigenvalues).",
            linkUrl: "https://www.3blue1brown.com/topics/linear-algebra",
            linkLabel: "Essence of Linear Algebra",
            substeps: [
              { id: "math_6_la_trans_1", title: "1.6.1 Матричні операції", text: "Транспонування, множення матриць, детермінант матриці та його геометричний зміст." },
              { id: "math_6_la_trans_2", title: "1.6.2 Системи рівнянь", text: "Розв'язання систем лінійних рівнянь (СЛАР), метод Гаусса, обернена матриця та псевдообернена." },
              { id: "math_6_la_trans_3", title: "1.6.3 Власні значення & SVD", text: "Власні значення та власні вектори, матричний розклад SVD та його роль у PCA." }
            ]
          },
          {
            id: "math_7_calc_deriv",
            title: "1.7 Матанализ: Похідні",
            text: "Розуміння швидкості зміни функцій, похідні, правила диференціювання та часткові похідні.",
            linkUrl: "https://www.khanacademy.org/math/calculus-1",
            linkLabel: "Calculus 1 on Khan Academy",
            substeps: [
              { id: "math_7_calc_deriv_1", title: "1.7.1 Границі та похідна", text: "Границя функції, геометричний зміст похідної як кутового коефіцієнта дотичної." },
              { id: "math_7_calc_deriv_2", title: "1.7.2 Правила похідних", text: "Диференціювання суми, добутку, частки, складної функції (chain rule)." },
              { id: "math_7_calc_deriv_3", title: "1.7.3 Часткові похідні", text: "Похідна функції багатьох змінних по окремим координатам. Поняття градієнта." }
            ]
          },
          {
            id: "math_8_calc_optim",
            title: "1.8 Оптимізація & Градієнт",
            text: "Знаходження екстремумів функцій багатьох змінних, градієнт та концепція градієнтного спуску.",
            linkUrl: "https://www.khanacademy.org/math/multivariable-calculus",
            linkLabel: "Multivariable Calculus",
            substeps: [
              { id: "math_8_calc_optim_1", title: "1.8.1 Пошук екстремумів", text: "Знаходження точок локального мінімуму та максимуму за допомогою першої та другої похідних." },
              { id: "math_8_calc_optim_2", title: "1.8.2 Градієнтний спуск", text: "Алгоритм оновлення ваг у напрямку антиградієнта, швидкість навчання (learning rate)." },
              { id: "math_8_calc_optim_3", title: "1.8.3 Оптимізатори SGD", text: "Стохастичний градієнтний спуск (SGD), концепції Momentum, RMSprop, Adam." }
            ]
          },
          {
            id: "math_9_bayes",
            title: "1.9 Баєсівський аналіз",
            text: "Апріорні та апостеріорні ймовірності, баєсівське оновлення знань та порівняння з частотним підходом.",
            linkUrl: "https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2014/",
            linkLabel: "MIT Introduction to Stats",
            substeps: [
              { id: "math_9_bayes_1", title: "1.9.1 Баєсівське оновлення", text: "Як змінюються наші апріорні переконання після отримання нових даних (обчислення апостеріорного розподілу)." },
              { id: "math_9_bayes_2", title: "1.9.2 Спряжені апріорні", text: "Conjugate priors. Beta-Binomial та Normal-Normal моделі для аналітичного розрахунку." },
              { id: "math_9_bayes_3", title: "1.9.3 MCMC методи", text: "Monte Carlo Markov Chain. Ознайомлення з алгоритмом Метрополіса-Гастінгса та Gibbs sampling." }
            ]
          },
          {
            id: "math_10_stat_inf",
            title: "1.10 Статистичний висновок",
            text: "Центральна гранична теорема, довірчі інтервали, ресемплінг, бутстреп та статистична значущість.",
            linkUrl: "https://www.coursera.org/specializations/statistics",
            linkLabel: "Statistics Specialization",
            substeps: [
              { id: "math_10_stat_inf_1", title: "1.10.1 Центральна гранична", text: "Доведення та застосування ЦГТ: чому розподіл середніх вибірки прагне до нормального." },
              { id: "math_10_stat_inf_2", title: "1.10.2 Довірчі інтервали", text: "Формулая розрахунку інтервалів для середнього вибірки (Margin of Error, z-interval, t-interval)." },
              { id: "math_10_stat_inf_3", title: "1.10.3 Ресемплінг", text: "Концепція Bootstrap та Jackknife. Непараметричні перестановочні тести для малих вибірок." }
            ]
          }
        ]
      },
      {
        id: "excel",
        title: "2. Excel для аналізу даних",
        text: "Табличні процесори для первинної обробки, очищення, агрегації та візуалізації даних.",
        x: 1500,
        steps: [
          {
            id: "excel_1_intro",
            title: "2.1 Інтерфейс та типи даних",
            text: "Знайомство з робочим середовищем, налаштування стрічки меню та введення даних.",
            linkUrl: "https://support.microsoft.com/en-us/excel",
            linkLabel: "Excel Help Center",
            substeps: [
              { id: "excel_1_intro_1", title: "2.1.1 Робота зі стрічкою та клітинками", text: "Панель швидкого доступу, гарячі клавіші для навігації, адресація клітинок та діапазонів." },
              { id: "excel_1_intro_2", title: "2.1.2 Типи даних (числа, текст, дати)", text: "Форматування чисел, відсотків, валюти та робота із серіями дат і часу." },
              { id: "excel_1_intro_3", title: "2.1.3 Гарячі клавіші та автозаповнення", text: "Використання маркерів автозаповнення, гарячі клавіші копіювання, вставки, спеціальної вставки." }
            ]
          },
          {
            id: "excel_2_formulas",
            title: "2.2 Базові формули та посилання",
            text: "Використання основних математичних функцій та керування типами посилань.",
            linkUrl: "https://support.microsoft.com/en-us/office/excel-functions-by-category-5f91f4e9-7b42-46d2-9bd1-63f02579c0fc",
            linkLabel: "Excel Functions Ref",
            substeps: [
              { id: "excel_2_formulas_1", title: "2.2.1 Математичні функції (SUM, AVERAGE, COUNT)", text: "Базові агрегаційні формули для швидкого підрахунку сум, середніх значень та кількості." },
              { id: "excel_2_formulas_2", title: "2.2.2 Абсолютні та відносні посилання ($A$1)", text: "Розуміння різниці при перетягуванні формул. Заморожування стовпців і рядків." },
              { id: "excel_2_formulas_3", title: "2.2.3 Текстові функції (LEFT, RIGHT, CONCAT)", text: "Об'єднання та виділення підрядків, зміна регістру тексту, обробка текстових файлів." }
            ]
          },
          {
            id: "excel_3_logical",
            title: "2.3 Логічні функції та розгалуження",
            text: "Створення складних умовних розрахунків за допомогою булевої логіки.",
            linkUrl: "https://support.microsoft.com/en-us/office/logical-functions-reference-e64e7c3e-209b-44f7-972d-495034b8b60b",
            linkLabel: "Logical Functions Guide",
            substeps: [
              { id: "excel_3_logical_1", title: "2.3.1 Логічний IF та вкладені умови", text: "Створення розгалужень у розрахунках. Вкладені конструкції IF та функція IFS." },
              { id: "excel_3_logical_2", title: "2.3.2 Булеві оператори AND, OR, NOT", text: "Комбінування кількох умов для фільтрації та обчислень в одному виразі." },
              { id: "excel_3_logical_3", title: "2.3.3 Умовне агрегування (SUMIF, COUNTIF, AVERAGEIF)", text: "Розрахунок агрегацій тільки для рядків, що відповідають певному критерію." }
            ]
          },
          {
            id: "excel_4_lookup",
            title: "2.4 Функції пошуку та зв'язування",
            text: "З'єднання даних з різних таблиць за ключовими ідентифікаторами.",
            linkUrl: "https://support.microsoft.com/en-us/office/lookup-and-reference-functions-reference-8aa21a3a-b56a-4055-8257-3ec89df6b941",
            linkLabel: "Lookup Functions Ref",
            substeps: [
              { id: "excel_4_lookup_1", title: "2.4.1 Функція VLOOKUP (вертикальний пошук)", text: "Пошук значень у першому стовпці та вибірка з сусідніх стовпців. Обмеження VLOOKUP." },
              { id: "excel_4_lookup_2", title: "2.4.2 Покращений пошук XLOOKUP", text: "Сучасний гнучкий пошук вліво та вправо без обмежень розташування ключового стовпця." },
              { id: "excel_4_lookup_3", title: "2.4.3 Комбінація INDEX та MATCH", text: "Двовимірний динамічний пошук по рядках та стовпцях, підвищення швидкодії великих книг." }
            ]
          },
          {
            id: "excel_5_cleaning",
            title: "2.5 Очищення та підготовка даних",
            text: "Попередня обробка брудних даних перед аналізом та побудовою моделей.",
            linkUrl: "https://support.microsoft.com/en-us/office/clean-data-in-excel-db526a0b-1188-466d-88ec-8f7743d57b28",
            linkLabel: "Data Cleaning Excel",
            substeps: [
              { id: "excel_5_cleaning_1", title: "2.5.1 Видалення дублікатів та зайвих пробілів (TRIM)", text: "Очищення текстових полів від невидимих символів, подвійних пробілів та повторів." },
              { id: "excel_5_cleaning_2", title: "2.5.2 Поділ тексту по стовпцях (Text to Columns)", text: "Розбиття текстових рядків за роздільниками (кома, табуляція) на окремі стовпці." },
              { id: "excel_5_cleaning_3", title: "2.5.3 Робота з пропущеними значеннями (IFERROR)", text: "Перехоплення помилок типу #N/A, #VALUE! та заміна їх на нейтральні значення або нулі." }
            ]
          },
          {
            id: "excel_6_pivots",
            title: "2.6 Зведені таблиці (Pivot Tables)",
            text: "Інструмент швидкої агрегації та багатовимірного аналізу даних без написання формул.",
            linkUrl: "https://support.microsoft.com/en-us/office/create-a-pivot-table-to-analyze-worksheet-data-a9a84538-b7a1-409d-83e7-e76e19193b25",
            linkLabel: "Pivot Tables Tutorial",
            substeps: [
              { id: "excel_6_pivots_1", title: "2.6.1 Створення зведених таблиць", text: "Підготовка структури джерела даних, перетягування полів у рядки, стовпці, значення." },
              { id: "excel_6_pivots_2", title: "2.6.2 Групування, сортування та фільтрація", text: "Групування дат по місяцях та роках, числових діапазонів, сортування результатів." },
              { id: "excel_6_pivots_3", title: "2.6.3 Розрахункові поля та обчислення", text: "Додавання власних математичних формул безпосередньо всередину структури зведеної таблиці." }
            ]
          },
          {
            id: "excel_7_powerquery",
            title: "2.7 Інструмент Power Query",
            text: "Побудова автоматизованих сценаріїв імпорту та очищення даних (ETL в Excel).",
            linkUrl: "https://support.microsoft.com/en-us/office/about-power-query-in-excel-7104fbee-9e62-4cae-94d1-955c333c1fa7",
            linkLabel: "Power Query Guide",
            substeps: [
              { id: "excel_7_powerquery_1", title: "2.7.1 Імпорт даних з різних джерел", text: "Підключення до файлів CSV, баз даних SQL, веб-сторінок та папок із файлами." },
              { id: "excel_7_powerquery_2", title: "2.7.2 Трансформація та об'єднання запитів", text: "Об'єднання (Merge) та додавання (Append) запитів, скасування згортання стовпців (Unpivot)." },
              { id: "excel_7_powerquery_3", title: "2.7.3 Збереження та оновлення запитів", text: "Завантаження результатів на лист або в модель даних Power Pivot, налаштування автооновлення." }
            ]
          },
          {
            id: "excel_8_charts",
            title: "2.8 Візуалізація даних (Дашборди)",
            text: "Побудова інтерактивних графіків для презентації результатів аналізу.",
            linkUrl: "https://support.microsoft.com/en-us/office/create-a-chart-from-start-to-finish-0b84b378-c7db-4ce5-aa1c-ea1d86d6360b",
            linkLabel: "Charts in Excel",
            substeps: [
              { id: "excel_8_charts_1", title: "2.8.1 Створення діаграм (стовпчикові, лінійні, кругові)", text: "Вибір оптимального типу візуалізації, додавання ліній тренду, налаштування осей." },
              { id: "excel_8_charts_2", title: "2.8.2 Динамічні зрізи (Slicers) та часові шкали", text: "Створення інтерактивних пультів керування для фільтрації звітів в один клік." },
              { id: "excel_8_charts_3", title: "2.8.3 Умовне форматування (Conditional Formatting)", text: "Автоматичне фарбування клітинок за правилами, гістограми, кольорові шкали." }
            ]
          },
          {
            id: "excel_9_analysis",
            title: "2.9 Статистичний аналіз (Analysis Toolpak)",
            text: "Використання вбудованої надбудови для проведення наукових розрахунків та моделювання.",
            linkUrl: "https://support.microsoft.com/en-us/office/use-the-analysis-toolpak-to-perform-complex-data-analysis-6c67cc28-a3d5-4787-ab89-4d7c13aa674a",
            linkLabel: "Analysis Toolpak",
            substeps: [
              { id: "excel_9_analysis_1", title: "2.9.1 Описова статистика в Excel", text: "Швидкий генератор зведеного статистичного звіту (дисперсія, ексцес, асиметрія)." },
              { id: "excel_9_analysis_2", title: "2.9.2 Кореляційний та регресійний аналіз", text: "Розрахунок матриці кореляцій, побудова лінійної регресії та виведення R-квадрату." },
              { id: "excel_9_analysis_3", title: "2.9.3 Аналіз «Що-якщо» (Goal Seek, Scenario Manager)", text: "Пошук цільового значення формули шляхом перебору параметрів, робота з диспетчером сценаріїв." }
            ]
          },
          {
            id: "excel_10_macros",
            title: "2.10 Автоматизація та макроси",
            text: "Основи оптимізації рутинної роботи за допомогою коду VBA.",
            linkUrl: "https://support.microsoft.com/en-us/office/quick-start-create-a-macro-9e20cb06-17f8-4eb4-b97f-a548c5a4d339",
            linkLabel: "Excel Macros Guide",
            substeps: [
              { id: "excel_10_macros_1", title: "2.10.1 Запис макросів (Macro Recorder)", text: "Автоматичний запис послідовності дій користувача та перегляд згенерованого коду." },
              { id: "excel_10_macros_2", title: "2.10.2 Основи програмування на VBA", text: "Знайомство з редактором VBA, оголошення змінних, цикли, умовні оператори в коді." },
              { id: "excel_10_macros_3", title: "2.10.3 Створення користувацьких функцій (UDF)", text: "Написання власних формул для розрахунків, які не передбачені стандартними інструментами Excel." }
            ]
          }
        ]
      },
      {
        id: "sheets",
        title: "3. Google Sheets для аналізу даних",
        text: "Хмарні таблиці для колаборації, автоматизації за допомогою Apps Script та швидкої аналітики.",
        x: 2700,
        steps: [
          {
            id: "sheets_1_intro",
            title: "3.1 Вступ до Google Sheets",
            text: "Робота з хмарним інтерфейсом, налаштування спільного доступу, сумісність та імпорт/експорт.",
            linkUrl: "https://support.google.com/docs/answer/6000292",
            linkLabel: "Довідка Google Sheets",
            substeps: [
              { id: "sheets_1_intro_1", title: "3.1.1 Хмарний інтерфейс", text: "Огляд меню, налаштування доступу для читання/редагування, робота в реальному часі." },
              { id: "sheets_1_intro_2", title: "3.1.2 Імпорт та експорт", text: "Перенесення файлів Excel (.xlsx), CSV, TSV та робота з ними без втрати форматування." },
              { id: "sheets_1_intro_3", title: "3.1.3 Історія версій", text: "Перегляд історії змін, відновлення попередніх копій документа, атрибуція правок авторам." }
            ]
          },
          {
            id: "sheets_2_formulas",
            title: "3.2 Розрахунки та формули",
            text: "Базові оператори, прості математичні функції та логіка посилань на клітинки.",
            linkUrl: "https://support.google.com/docs/table/25273",
            linkLabel: "Список функцій Google",
            substeps: [
              { id: "sheets_2_formulas_1", title: "3.2.1 Базові оператори", text: "Додавання, віднімання, множення, ділення, дужки для пріоритетів та комбінування." },
              { id: "sheets_2_formulas_2", title: "3.2.2 Агрегування", text: "Використання функцій SUM, AVERAGE, COUNT, COUNTA для швидкого підсумку числових масивів." },
              { id: "sheets_2_formulas_3", title: "3.2.3 Логіка посилань", text: "Використання знаку долара ($) для створення абсолютних, відносних та змішаних посилань." }
            ]
          },
          {
            id: "sheets_3_logic",
            title: "3.3 Логічні функції",
            text: "Умовні розгалуження, обробка помилок та перевірка логічних виразів.",
            linkUrl: "https://support.google.com/docs/answer/3093364",
            linkLabel: "Функція IF",
            substeps: [
              { id: "sheets_3_logic_1", title: "3.3.1 Функція IF та IFS", text: "Базові умовні конструкції для створення розгалужених обчислень на основі критеріїв." },
              { id: "sheets_3_logic_2", title: "3.3.2 Складні умови", text: "Використання логічних зв'язок AND, OR та заперечення NOT для перевірки кількох ознак." },
              { id: "sheets_3_logic_3", title: "3.3.3 Обробка помилок", text: "Виправлення візуального вигляду звітів за допомогою IFERROR та IFNA при виникненні помилок ділення чи пошуку." }
            ]
          },
          {
            id: "sheets_4_lookup",
            title: "3.4 Пошук та злиття даних",
            text: "Вертикальний та горизонтальний пошук, індекси та сучасний XLOOKUP.",
            linkUrl: "https://support.google.com/docs/answer/3093318",
            linkLabel: "Пошук в Sheets",
            substeps: [
              { id: "sheets_4_lookup_1", title: "3.4.1 VLOOKUP та HLOOKUP", text: "Співставлення даних по ключовому стовпцю або рядку з точним або приблизним пошуком." },
              { id: "sheets_4_lookup_2", title: "3.4.2 INDEX та MATCH", text: "Більш гнучка альтернатива VLOOKUP для пошуку по лівих стовпцях та з динамічним визначенням індексів." },
              { id: "sheets_4_lookup_3", title: "3.4.3 Функція XLOOKUP", text: "Сучасний універсальний пошук без обмежень на розташування стовпців, із вбудованою обробкою відсутності значень." }
            ]
          },
          {
            id: "sheets_5_text",
            title: "3.5 Текст та дати",
            text: "Очищення текстових записів та аналіз часових рядів за допомогою вбудованих функцій.",
            linkUrl: "https://support.google.com/docs/answer/3094207",
            linkLabel: "Робота з датами",
            substeps: [
              { id: "sheets_5_text_1", title: "3.5.1 Очищення тексту", text: "Видалення зайвих пробілів (TRIM), зміна регістру (LOWER, UPPER) та вилучення символів (MID, LEFT, RIGHT)." },
              { id: "sheets_5_text_2", title: "3.5.2 Маніпуляції з рядками", text: "Розділення тексту по делімітеру (SPLIT), об'єднання клітинок (CONCATENATE) та робота з TEXTJOIN." },
              { id: "sheets_5_text_3", title: "3.5.3 Розрахунки з датами", text: "Різниця між датами в днях/місяцях/роках через DATEDIF, додавання робочих днів, функції TODAY та NOW." }
            ]
          },
          {
            id: "sheets_6_web",
            title: "3.6 Специфічні функції Sheets",
            text: "Зв'язок між документами та імпорт фінансових чи веб-даних безпосередньо в таблицю.",
            linkUrl: "https://support.google.com/docs/answer/3093340",
            linkLabel: "IMPORTRANGE Guide",
            substeps: [
              { id: "sheets_6_web_1", title: "3.6.1 Зв'язок таблиць", text: "Використання IMPORTRANGE для динамічного завантаження діапазонів даних з однієї Google-таблиці в іншу." },
              { id: "sheets_6_web_2", title: "3.6.2 GOOGLEFINANCE", text: "Отримання поточних або історичних курсів валют та акцій безпосередньо з Google Finance API." },
              { id: "sheets_6_web_3", title: "3.6.3 Веб-імпорт", text: "Парсинг таблиць та списків з HTML-сторінок за допомогою IMPORTHTML, а також XML/RSS стрічок через IMPORTXML." }
            ]
          },
          {
            id: "sheets_7_array",
            title: "3.7 Динамічні фільтри та QUERY",
            text: "Потужні інструменти обробки масивів та вибірки даних на основі мови SQL-подібних запитів.",
            linkUrl: "https://support.google.com/docs/answer/3093343",
            linkLabel: "QUERY Function",
            substeps: [
              { id: "sheets_7_array_1", title: "3.7.1 Функція FILTER", text: "Створення динамічних фільтрованих підмножин даних на основі одного чи кількох критеріїв відбору." },
              { id: "sheets_7_array_2", title: "3.7.2 UNIQUE та SORT", text: "Отримання списку унікальних значень з діапазону та динамічне сортування за декількома стовпцями." },
              { id: "sheets_7_array_3", title: "3.7.3 Функція QUERY", text: "Написання SQL-подібних запитів (SELECT, WHERE, GROUP BY, ORDER BY) для глибокого аналізу табличних масивів." }
            ]
          },
          {
            id: "sheets_8_advanced",
            title: "3.8 Зведені таблиці",
            text: "Багатовимірна агрегація великих обсягів даних для побудови звітів.",
            linkUrl: "https://support.google.com/docs/answer/7572895",
            linkLabel: "Pivot Tables Sheets",
            substeps: [
              { id: "sheets_8_advanced_1", title: "3.8.1 Створення Pivot Tables", text: "Налаштування рядків, стовпців, значень та фільтрів для агрегації інформації." },
              { id: "sheets_8_advanced_2", title: "3.8.2 Обчислювальні поля", text: "Додавання кастомних формул всередину зведеної таблиці для створення нових бізнес-метрик." },
              { id: "sheets_8_advanced_3", title: "3.8.3 Групування & Зрізи", text: "Групування числових значень та дат за інтервалами (місяці, квартали), інтерактивні зрізи для користувачів." }
            ]
          },
          {
            id: "sheets_9_visual",
            title: "3.9 Візуалізація та дашборди",
            text: "Побудова графіків та інформаційних панелей безпосередньо на аркуші.",
            linkUrl: "https://support.google.com/docs/answer/190718",
            linkLabel: "Charts Tutorial",
            substeps: [
              { id: "sheets_9_visual_1", title: "3.9.1 Побудова діаграм", text: "Створення стовпчастих, кругових, лінійних, спадних та географічних діаграм та їх налаштування." },
              { id: "sheets_9_visual_2", title: "3.9.2 Функція SPARKLINE", text: "Побудова компактних мікро-графіків (лінійних чи барів) прямо всередині однієї комірки для відображення трендів." },
              { id: "sheets_9_visual_3", title: "3.9.3 Умовне форматування", text: "Налаштування правил фарбування клітинок за шкалою кольорів або умовними правилами для KPI панелей." }
            ]
          },
          {
            id: "sheets_10_script",
            title: "3.10 Автоматизація та Apps Script",
            text: "Використання JavaScript-подібного середовища для автоматизації рутинних задач та розширення можливостей.",
            linkUrl: "https://developers.google.com/apps-script/guides/sheets",
            linkLabel: "Apps Script Docs",
            substeps: [
              { id: "sheets_10_script_1", title: "3.10.1 Запис макросів", text: "Автоматичний запис послідовності дій користувача та перегляд згенерованого коду." },
              { id: "sheets_10_script_2", title: "3.10.2 Вступ до Google Apps Script (JavaScript)", text: "Низькорівневий та високорівневий скриптинг, написання UDF функцій." },
              { id: "sheets_10_script_3", title: "3.10.3 Сценарії інтеграції", text: "Тригери Google Forms, робота з поштою GmailApp, вивантаження PDF на Google Drive." }
            ]
          }
        ]
      },
      {
        id: "python",
        title: "3. Програмування (Python)",
        text: "Опануйте основну мову програмування в індустрії Data Science.",
        x: 2700,
        steps: [
          {
            id: "py_1_basics",
            title: "2.1 Синтаксис Python",
            text: "Змінні, типи даних, умовні конструкції (if-else), цикли (for, while) та робота з консоллю.",
            linkUrl: "https://www.learnpython.org/",
            linkLabel: "LearnPython Interactive",
            substeps: [
              { id: "py_1_basics_1", title: "2.1.1 Змінні & Типи", text: "Числа (int, float), рядки (str), булеві (bool). Перетворення типів." },
              { id: "py_1_basics_2", title: "2.1.2 Умовні конструкції", text: "Розгалуження коду за допомогою if, elif, else та логічних операторів and, or, not." },
              { id: "py_1_basics_3", title: "2.1.3 Цикли", text: "Цикли for для ітерації, цикли while, керуючі оператори break, continue, pass." }
            ]
          },
          {
            id: "py_2_ds",
            title: "2.2 Вбудовані структури",
            text: "Списки (lists), кортежі (tuples), словники (dicts) та множини (sets). Зрізи та спискові включення (list comprehensions).",
            linkUrl: "https://docs.python.org/3/tutorial/datastructures.html",
            linkLabel: "Python Data Structures",
            substeps: [
              { id: "py_2_ds_1", title: "2.2.1 Списки & Кортежі", text: "Робота з індексами, зрізи (slices), методи списків. Чому tuple незмінний." },
              { id: "py_2_ds_2", title: "2.2.2 Словники & Множини", text: "Ключі та значення у dict, швидкий пошук. Унікальні елементи в set, операції об'єднання." },
              { id: "py_2_ds_3", title: "2.2.3 List Comprehensions", text: "Створення списків та словників у один рядок за допомогою генераторів." }
            ]
          },
          {
            id: "py_3_funcs",
            title: "2.3 Функції та модулі",
            text: "Оголошення функцій, аргументи (*args, **kwargs), лямбда-вирази, імпорт бібліотек та створення власних модулів.",
            linkUrl: "https://realpython.com/defining-your-own-python-function/",
            linkLabel: "Real Python Functions",
            substeps: [
              { id: "py_3_funcs_1", title: "2.3.1 Визначення функцій", text: "Синтаксис def, повернення значень return, локальні та глобальні змінні." },
              { id: "py_3_funcs_2", title: "2.3.2 Гнучкі аргументи", text: "Передача довільної кількості позиційних (*args) та іменованих (**kwargs) аргументів." },
              { id: "py_3_funcs_3", title: "2.3.3 Модулі & Pip", text: "Імпорт бібліотек (import math), встановлення пакетів через pip." }
            ]
          },
          {
            id: "py_4_oop",
            title: "2.4 Об'єктно-орієнтоване",
            text: "Класи, об'єкти, методи, конструктор __init__, принципи ООП: наслідування, інкапсуляція та поліморфізм.",
            linkUrl: "https://realpython.com/python3-object-oriented-programming/",
            linkLabel: "Real Python OOP Guide",
            substeps: [
              { id: "py_4_oop_1", title: "2.4.1 Класи & Об'єкти", text: "Створення класів, атрибути класу та об'єкта, спеціальний метод __init__." },
              { id: "py_4_oop_2", title: "2.4.2 Наслідування", text: "Створення дочірніх класів, перевизначення методів, виклик батьківського класу через super()." },
              { id: "py_4_oop_3", title: "2.4.3 Інкапсуляція & Поліморф", text: "Приватні та захищені атрибути, єдиний інтерфейс для різних об'єктів." }
            ]
          },
          {
            id: "py_5_numpy",
            title: "2.5 NumPy для розрахунків",
            text: "Масиви ndarray, векторні операції, matrix multiplication, індексування, зрізи та генерація випадкових чисел.",
            linkUrl: "https://numpy.org/doc/stable/user/absolute_beginners.html",
            linkLabel: "NumPy Beginner's Guide",
            substeps: [
              { id: "py_5_numpy_1", title: "2.5.1 ndarray масиви", text: "Ініціалізація масивів, типи даних, зміна форми масиву (reshape)." },
              { id: "py_5_numpy_2", title: "2.5.2 Векторизація", text: "Математичні операції без циклів (broadcasting), matrix multiplication (np.dot або @)." },
              { id: "py_5_numpy_3", title: "2.5.3 Індексація & Random", text: "Складна фільтрація за умовами, генерування випадкових розподілів (np.random)." }
            ]
          },
          {
            id: "py_6_pandas_basics",
            title: "2.6 Pandas DataFrame & Series",
            text: "Створення та завантаження DataFrame (з CSV, Excel), базовий аналіз, індексування (.loc, .iloc) та вибірка даних.",
            linkUrl: "https://pandas.pydata.org/docs/user_guide/10min.html",
            linkLabel: "Pandas 10min Guide",
            substeps: [
              { id: "py_6_pandas_basics_1", title: "2.6.1 Структури Pandas", text: "Різниця між одновимірною Series та двовимірною DataFrame. Створення з dict та list." },
              { id: "py_6_pandas_basics_2", title: "2.6.2 Імпорт даних", text: "Читання файлів за допомогою pd.read_csv, read_excel, швидкий огляд." },
              { id: "py_6_pandas_basics_3", title: "2.6.3 loc & iloc", text: "Індексна вибірка за мітками (.loc) та цілими числами (.iloc). Фільтрація рядків." }
            ]
          },
          {
            id: "py_7_pandas_clean",
            title: "2.7 Очищення даних у Pandas",
            text: "Обробка пропущених значень (isna, fillna, dropna), видалення дублікатів, заміна типів даних та фільтрація викидів.",
            linkUrl: "https://realpython.com/python-data-cleaning/",
            linkLabel: "Data Cleaning Tutorial",
            substeps: [
              { id: "py_7_pandas_clean_1", title: "2.7.1 Пропущені значення", text: "Пошук null-значень, видалення (dropna), заповнення середнім або медіаною (fillna)." },
              { id: "py_7_pandas_clean_2", title: "2.7.2 Дублікати & Типи", text: "Видалення рядків-дублікатів (drop_duplicates), приведення колонок до числових типів та дат." },
              { id: "py_7_pandas_clean_3", title: "2.7.3 Викиди & Рядки", text: "Виявлення та фільтрація викидів (outliers), робота з текстовими рядками." }
            ]
          },
          {
            id: "py_8_pandas_agg",
            title: "2.8 Групування & Об'єднання",
            text: "Агрегація за допомогою .groupby(), об'єднання таблиць (concat, merge, join), зведені таблиці (pivot tables).",
            linkUrl: "https://pandas.pydata.org/docs/user_guide/groupby.html",
            linkLabel: "Pandas GroupBy Guide",
            substeps: [
              { id: "py_8_pandas_agg_1", title: "2.8.1 GroupBy & Agg", text: "Групування даних за категоріями, застосування функцій агрегації (sum, mean, .agg())." },
              { id: "py_8_pandas_agg_2", title: "2.8.2 Merge & Concat", text: "Аналог SQL JOIN: об'єднання DataFrame по спільним колонкам (merge). Вертикальна склейка." },
              { id: "py_8_pandas_agg_3", title: "2.8.3 Pivot tables", text: "Створення зведених таблиць для багатовимірного аналізу даних за допомогою .pivot_table()." }
            ]
          },
          {
            id: "py_9_viz_matplotlib",
            title: "2.9 Matplotlib & Seaborn",
            text: "Створення лінійних графіків, гістограм, діаграм розсіювання (scatter plot), ящиків з вусами (boxplot). Кастомізація графіків.",
            linkUrl: "https://seaborn.pydata.org/tutorial.html",
            linkLabel: "Seaborn Tutorial",
            substeps: [
              { id: "py_9_viz_matplotlib_1", title: "2.9.1 Matplotlib basics", text: "Побудова лінійних графіків (plt.plot), гістограм. Налаштування осей, легенди." },
              { id: "py_9_viz_matplotlib_2", title: "2.9.2 Seaborn статистичний", text: "Створення красивих діаграм розсіювання, boxplot, щільності розподілу (KDE plot)." },
              { id: "py_9_viz_matplotlib_3", title: "2.9.3 Теплові карти", text: "Візуалізація кореляції ознак за допомогою теплової матриці (sns.heatmap)." }
            ]
          },
          {
            id: "py_10_scraping",
            title: "2.10 Web Scraping & API",
            text: "Робота з API через requests та парсинг веб-сторінок за допомогою BeautifulSoup. Обробка JSON-відповідей.",
            linkUrl: "https://realpython.com/beautiful-soup-web-scraper-python/",
            linkLabel: "Web Scraping Guide",
            substeps: [
              { id: "py_10_scraping_1", title: "2.10.1 Запити HTTP", text: "Відправка GET/POST запитів за допомогою бібліотеки requests, обробка статус-кодів." },
              { id: "py_10_scraping_2", title: "2.10.2 Парсинг HTML", text: "Аналіз веб-сторінок за допомогою BeautifulSoup, пошук тегів, класів." },
              { id: "py_10_scraping_3", title: "2.10.3 Робота з JSON", text: "Взаємодія з публічними REST API, парсинг JSON-структур у списки та словники." }
            ]
          }
        ]
      },
      {
        id: "sql",
        title: "4. Бази даних та SQL",
        text: "Навчіться діставати, фільтрувати та трансформувати дані з реляційних баз.",
        x: 3900,
        steps: [
          {
            id: "sql_1_intro",
            title: "3.1 Основи SQL запитів",
            text: "Концепція реляційних БД, базовий синтаксис SQL: оператори SELECT, FROM та фільтрація через WHERE.",
            linkUrl: "https://sqlzoo.net/",
            linkLabel: "SQLZoo Interactive",
            substeps: [
              { id: "sql_1_intro_1", title: "3.1.1 Реляційна концепція", text: "Таблиці, рядки, стовпці. Зв'язки один-до-багатьох та багато-до-багатьох." },
              { id: "sql_1_intro_2", title: "3.1.2 SELECT & FROM", text: "Вибір конкретних стовпців з таблиці, використання аліасів (AS)." },
              { id: "sql_1_intro_3", title: "3.1.3 Базовий WHERE", text: "Фільтрація за допомогою рівності, нерівності, операторів порівняння (>, <, !=)." }
            ]
          },
          {
            id: "sql_2_filter",
            title: "3.2 Сортування & Фільтри",
            text: "Використання операторів ORDER BY, LIMIT, DISTINCT, логічних зв'язок (AND, OR, NOT) та пошуку шаблонів (LIKE, IN, BETWEEN).",
            linkUrl: "https://www.w3schools.com/sql/default.asp",
            linkLabel: "W3Schools SQL Tutorial",
            substeps: [
              { id: "sql_2_filter_1", title: "3.2.1 Логічні зв'язки", text: "Комбінування кількох умов фільтрації за допомогою AND, OR, дужок." },
              { id: "sql_2_filter_2", title: "3.2.2 Сортування & Ліміт", text: "Сортування за зростанням (ASC) та спаданням (DESC). Обмеження вибірки (LIMIT/OFFSET)." },
              { id: "sql_2_filter_3", title: "3.2.3 LIKE, IN, BETWEEN", text: "Пошук за текстовим шаблоном (% та _), вибір зі списку значень (IN), діапазони чисел (BETWEEN)." }
            ]
          },
          {
            id: "sql_3_joins",
            title: "3.3 Об'єднання таблиць (JOIN)",
            text: "Зв'язки між таблицями (Primary/Foreign Key). Operator INNER JOIN, LEFT JOIN, RIGHT JOIN та FULL OUTER JOIN.",
            linkUrl: "https://sqlbolt.com/",
            linkLabel: "SQLBolt Interactive Lessons",
            substeps: [
              { id: "sql_3_joins_1", title: "3.3.1 Ключі таблиць", text: "Розуміння первинних (Primary Key) та зовнішніх (Foreign Key) ключів." },
              { id: "sql_3_joins_2", title: "3.3.2 INNER vs LEFT JOIN", text: "Об'єднання тільки співпадаючих рядків проти збереження всіх рядків з лівої таблиці." },
              { id: "sql_3_joins_3", title: "3.3.3 FULL JOIN & Self JOIN", text: "Повне об'єднання обох таблиць. Об'єднання таблиці самої з собою для порівняння рядків." }
            ]
          },
          {
            id: "sql_4_aggr",
            title: "3.4 Агрегація & Групування",
            text: "Агрегатні функції (COUNT, SUM, AVG, MIN, MAX), групування GROUP BY та фільтрація згрупованих результатів через HAVING.",
            linkUrl: "https://sqlbolt.com/lesson/select_queries_with_aggregates",
            linkLabel: "SQL Aggregations Guide",
            substeps: [
              { id: "sql_4_aggr_1", title: "3.4.1 Агрегатні функції", text: "Розрахунок кількості (COUNT), суми (SUM), середнього (AVG), мінімуму/максимуму." },
              { id: "sql_4_aggr_2", title: "3.4.2 GROUP BY", text: "Групування рядків за категоріальним стовпцем для проведення обчислень." },
              { id: "sql_4_aggr_3", title: "3.4.3 HAVING фільтр", text: "Різниця між WHERE (фільтрує до групування) та HAVING (фільтрує після групування)." }
            ]
          },
          {
            id: "sql_5_subqueries",
            title: "3.5 Підзапити & CTE",
            text: "Написання вкладених підзапитів та робота з тимчасовими таблицями за допомогою WITH (Common Table Expressions - CTE).",
            linkUrl: "https://mode.com/sql-tutorial/sql-subqueries/",
            linkLabel: "Subqueries Tutorial",
            substeps: [
              { id: "sql_5_subqueries_1", title: "3.5.1 Вкладені запити", text: "Використання підзапитів у WHERE та у FROM." },
              { id: "sql_5_subqueries_2", title: "3.5.2 CTE (WITH clause)", text: "Оголошення тимчасових іменованих таблиць для підвищення читабельності складного SQL коду." },
              { id: "sql_5_subqueries_3", title: "3.5.3 Рекурсивні CTE", text: "Побудова ієрархічних запитів (наприклад, структура компанії, дерево категорій)." }
            ]
          },
          {
            id: "sql_6_window",
            title: "3.6 Віконні функції SQL",
            text: "Аналітичні віконні функції: ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG та агрегація з OVER (PARTITION BY).",
            linkUrl: "https://mode.com/sql-tutorial/sql-window-functions/",
            linkLabel: "Window Functions Guide",
            substeps: [
              { id: "sql_6_window_1", title: "3.6.1 Ранжування", text: "Присвоєння порядкових номерів рядкам у межах групи (ROW_NUMBER, RANK, DENSE_RANK)." },
              { id: "sql_6_window_2", title: "3.6.2 LEAD & LAG", text: "Отримання значення з наступного (LEAD) або попереднього (LAG) рядка без JOIN." },
              { id: "sql_6_window_3", title: "3.6.3 Наростаючий підсумок", text: "Агрегація (SUM, AVG) з використанням вікна OVER та PARTITION BY / ORDER BY." }
            ]
          },
          {
            id: "sql_7_ddl_dml",
            title: "3.7 Створення таблиць & DDL",
            text: "Вивчіть DDL (CREATE TABLE, ALTER, DROP) та DML (INSERT INTO, UPDATE, DELETE). Робота з обмеженнями (Constraints).",
            linkUrl: "https://www.postgresqltutorial.com/",
            linkLabel: "PostgreSQL Tutorial",
            substeps: [
              { id: "sql_7_ddl_dml_1", title: "3.7.1 Структура таблиці", text: "Створення таблиць за допомогою CREATE TABLE, типи даних (INT, VARCHAR, TIMESTAMP)." },
              { id: "sql_7_ddl_dml_2", title: "3.7.2 Обмеження полів", text: "Застосування NOT NULL, UNIQUE, CHECK, DEFAULT та каскадних зовнішніх ключів." },
              { id: "sql_7_ddl_dml_3", title: "3.7.3 Зміна даних (DML)", text: "Вставка нових рядків (INSERT INTO), оновлення значень (UPDATE) та видалення рядків (DELETE)." }
            ]
          },
          {
            id: "sql_8_indexes",
            title: "3.8 Оптимізація запитів",
            text: "Як працюють індекси, перегляд плану виконання запиту через EXPLAIN та базові кроки для оптимізації повільного коду SQL.",
            linkUrl: "https://use-the-index-luke.com/",
            linkLabel: "Use The Index, Luke!",
            substeps: [
              { id: "sql_8_indexes_1", title: "3.8.1 Індекси (B-Tree)", text: "Як індексація прискорює пошук даних, коли її слід застосовувати, а коли ні." },
              { id: "sql_8_indexes_2", title: "3.8.2 EXPLAIN ANALYZE", text: "Читання плану виконання запиту, пошук етапів сканування всієї таблиці (Table Scan)." },
              { id: "sql_8_indexes_3", title: "3.8.3 Кращі практики SQL", text: "Уникнення SELECT *, мінімізація підзапитів у циклі, правильне групування та фільтрація." }
            ]
          },
          {
            id: "sql_9_nosql",
            title: "3.9 NoSQL бази даних",
            text: "Концепція нереляційних БД. Ознайомлення з документо-орієнтованими БД на прикладі MongoDB та синтаксису запитів.",
            linkUrl: "https://www.mongodb.com/developer/languages/javascript/mongodb-tutorial-beginners/",
            linkLabel: "MongoDB Beginner Guide",
            substeps: [
              { id: "sql_9_nosql_1", title: "3.9.1 SQL vs NoSQL", text: "Чому виникли NoSQL БД, концепція горизонтального масштабування та гнучкої схеми." },
              { id: "sql_9_nosql_2", title: "3.9.2 Документо-орієнтовані", text: "Формат збереження JSON/BSON. Робота з колекціями на прикладі MongoDB." },
              { id: "sql_9_nosql_3", title: "3.9.3 Запити в MongoDB", text: "Синтаксис пошуку find(), фільтрація за полями, вкладені об'єкти та базові агрегації." }
            ]
          },
          {
            id: "sql_10_etl",
            title: "3.10 ETL процеси",
            text: "Основи Extract, Transform, Load (ETL). Перенесення даних з транзакційних систем у аналітичні сховища (Data Warehouse).",
            linkUrl: "https://www.databricks.com/glossary/extract-transform-load",
            linkLabel: "ETL Concepts Guide",
            substeps: [
              { id: "sql_10_etl_1", title: "3.10.1 Extraction (Вилучення)", text: "Підключення до джерел даних (API, БД, лог-файли), інкрементальне завантаження змін." },
              { id: "sql_10_etl_2", title: "3.10.2 Transformation", text: "Валідація, дедуплікація, агрегація та збагачення даних за допомогою коду Python / Pandas." },
              { id: "sql_10_etl_3", title: "3.10.3 Loading (Завантаження)", text: "Запис перетворених даних у аналітичне сховище (DWH) або Data Lake." }
            ]
          }
        ]
      },
      {
        id: "ml",
        title: "5. Машинне навчання",
        text: "Навчіться будувати прогностичні моделі на основі статистичних алгоритмів.",
        x: 5100,
        steps: [
          {
            id: "ml_1_intro",
            title: "4.1 Концепції ML",
            text: "Різниця між класичним програмуванням та ML. Навчання з учителем (Supervised) та без учителя (Unsupervised).",
            linkUrl: "https://scikit-learn.org/stable/tutorial/index.html",
            linkLabel: "Scikit-Learn Tutorial",
            substeps: [
              { id: "ml_1_intro_1", title: "4.1.1 Типи навчання", text: "Концепції Supervised (регресія, класифікація) та Unsupervised (кластеризація)." },
              { id: "ml_1_intro_2", title: "4.1.2 Scikit-Learn API", text: "Архітектурний підхід fit-predict/fit-transform у Scikit-Learn фреймворку." },
              { id: "ml_1_intro_3", title: "4.1.3 Перенавчання", text: "Проблема Overfitting та Underfitting, компроміс зміщення-дисперсії (Bias-Variance tradeoff)." }
            ]
          },
          {
            id: "ml_2_regression",
            title: "4.2 Лінійна регресія",
            text: "Математика лінійної регресії, метод найменших квадратів, регуляризація L1/L2 (Ridge, Lasso).",
            linkUrl: "https://machinelearningmastery.com/linear-regression-for-machine-learning/",
            linkLabel: "Linear Regression Guide",
            substeps: [
              { id: "ml_2_regression_1", title: "4.2.1 Проста лінійна", text: "Знаходження коефієнтів методом найменших квадратів (OLS). Розрахунок лінії регресії." },
              { id: "ml_2_regression_2", title: "4.2.2 Мультиколінеарність", text: "Проблема залежності ознак, розрахунок коефіцієнта інфляції дисперсії (VIF)." },
              { id: "ml_2_regression_3", title: "4.2.3 L1/L2 Регуляризація", text: "Боротьба з перенавчанням: Lasso (L1) для відбору ознак, Ridge (L2) для обмеження великих коефіцієнтів." }
            ]
          },
          {
            id: "ml_3_classification",
            title: "4.3 Classification",
            text: "Логістична регресія, робота з порогом класифікації, метрики, метод K-найближчих сусідів (KNN).",
            linkUrl: "https://developers.google.com/machine-learning/crash-course/classification/video-lecture",
            linkLabel: "Google ML Classification",
            substeps: [
              { id: "ml_3_classification_1", title: "4.3.1 Логістична регресія", text: "Використання сигмоїди для прогнозування ймовірностей належності до класу." },
              { id: "ml_3_classification_2", title: "4.3.2 KNN класифікатор", text: "Метричний алгоритм: класифікація на основі голосування K найближчих сусідів." },
              { id: "ml_3_classification_3", title: "4.3.3 Поріг класифікації", text: "Зміна порогу прийняття рішення (класичний 0.5) для балансу точності/повноти." }
            ]
          },
          {
            id: "ml_4_trees",
            title: "4.4 Дерева рішень",
            text: "Алгоритми побудови дерев (ID3, CART), концепція ентропії та індексу Джині. Випадковий ліс (Random Forest) як ансамбль.",
            linkUrl: "https://realpython.com/k-means-clustering-python/",
            linkLabel: "Decision Trees Guide",
            substeps: [
              { id: "ml_4_trees_1", title: "4.4.1 CART алгоритм", text: "Як дерево ділить простір ознак: математика ентропії та критерію Джині." },
              { id: "ml_4_trees_2", title: "4.4.2 Обмеження дерев", text: "Схильність до перенавчання, регуляризація дерев (глибина, мінімальна кількість об'єктів у листі)." },
              { id: "ml_4_trees_3", title: "4.4.3 Random Forest", text: "Створення ансамблю дерев за допомогою беггінгу (Bootstrap Aggregating) та випадкових підпросторів." }
            ]
          },
          {
            id: "ml_5_boosting",
            title: "4.5 Бустинг (Boosting)",
            text: "Методологія градієнтного бустингу. Огляд найпопулярніших бібліотек: XGBoost, LightGBM та CatBoost.",
            linkUrl: "https://machinelearningmastery.com/gentle-introduction-gradient-boosting-algorithm-machine-learning/",
            linkLabel: "Gradient Boosting Intro",
            substeps: [
              { id: "ml_5_boosting_1", title: "4.5.1 Концепція бустингу", text: "Послідовне навчання моделей, де кожне наступне дерево виправляє помилки попередніх." },
              { id: "ml_5_boosting_2", title: "4.5.2 XGBoost & LightGBM", text: "Екстремальний градієнтний бустинг, оптимізація швидкості обчислень через гістограми в LightGBM." },
              { id: "ml_5_boosting_3", title: "4.5.3 CatBoost", text: "Бібліотека: вбудована обробка категоріальних ознак, стійкість до перенавчання." }
            ]
          },
          {
            id: "ml_6_eval_metrics",
            title: "4.6 Метрики оцінки моделей",
            text: "Регресія: MAE, MSE, RMSE, R-squared. Класифікація: Accuracy, Precision, Recall, F1-Score, ROC-AUC та Confusion Matrix.",
            linkUrl: "https://machinelearningmastery.com/metrics-evaluate-machine-learning-algorithms-python/",
            linkLabel: "Guide to ML Metrics",
            substeps: [
              { id: "ml_6_eval_metrics_1", title: "4.6.1 Метрики регресії", text: "Розрахунок MAE (стійка до викидів), MSE, RMSE (штрафує великі помилки) та R2." },
              { id: "ml_6_eval_metrics_2", title: "4.6.2 Точність & Повнота", text: "Confusion Matrix: істинні та хибні результати. Precision, Recall, F1-Score (середнє гармонійне)." },
              { id: "ml_6_eval_metrics_3", title: "4.6.3 ROC-AUC крива", text: "Побудова кривої True Positive Rate проти False Positive Rate, оцінка якості класифікатора." }
            ]
          },
          {
            id: "ml_7_preprocessing",
            title: "4.7 Підготовка ознак",
            text: "Масштабування (StandardScaler, MinMaxScaler), кодування категорій (One-Hot, Target), робота з пропущеними фічами.",
            linkUrl: "https://scikit-learn.org/stable/modules/preprocessing.html",
            linkLabel: "Feature Preprocessing",
            substeps: [
              { id: "ml_7_preprocessing_1", title: "4.7.1 Нормалізація значень", text: "Приведення ознак до одого масштабу: стандартизація (mean=0, std=1) та масштабування (0-1)." },
              { id: "ml_7_preprocessing_2", title: "4.7.2 Кодування категорій", text: "One-Hot Encoding для номінальних змінних, Label / Target encoding з уникненням витоку даних." },
              { id: "ml_7_preprocessing_3", title: "4.7.3 Data Leakage", text: "Як запобігти витоку інформації з тестової вибірки під час підготовки даних (fit тільки на train)." }
            ]
          },
          {
            id: "ml_8_val_tuning",
            title: "4.8 Валідація & Тюнінг",
            text: "Крос-валідація (K-Fold), пошук оптимальних гіперпараметрів за допомогою GridSearch, RandomSearch та Optuna.",
            linkUrl: "https://optuna.org/",
            linkLabel: "Optuna Optimization Tool",
            substeps: [
              { id: "ml_8_val_tuning_1", title: "4.8.1 K-Fold крос-валідація", text: "Розбиття вибірки на K частин для отримання об'єктивної оцінки якості моделі." },
              { id: "ml_8_val_tuning_2", title: "4.8.2 Grid & Random Search", text: "Перебір сітки параметрів моделі. Випадковий пошук як швидша альтернатива." },
              { id: "ml_8_val_tuning_3", title: "4.8.3 Оптимізація з Optuna", text: "Використання алгоритмів байєсівської оптимізації для інтелектуального підбору параметрів." }
            ]
          },
          {
            id: "ml_9_clustering",
            title: "4.9 Кластеризація",
            text: "Навчання без учителя. Алгоритм K-Means, вибір кількості кластерів (метод ліктя, силует) та алгоритм DBSCAN.",
            linkUrl: "https://scikit-learn.org/stable/modules/clustering.html",
            linkLabel: "Clustering Algorithms",
            substeps: [
              { id: "ml_9_clustering_1", title: "4.9.1 K-Means алгоритм", text: "Мінімізація внутрішньокластерної відстані, оновлення центроїдів кластерів." },
              { id: "ml_9_clustering_2", title: "4.9.2 Оцінка кластерів", text: "Вибір кількості кластерів: метод ліктя (WCSS) та аналіз силуетних коефіцієнтів." },
              { id: "ml_9_clustering_3", title: "4.9.3 Щільнісний DBSCAN", text: "Кластеризація на основі щільності точок. Автоматичне визначення шумів (викидів)." }
            ]
          },
          {
            id: "ml_10_dim_reduction",
            title: "4.10 Зниження розмірності",
            text: "Проблема великої розмірності даних. Метод головних компонентів (PCA) та алгоритм t-SNE для візуалізації.",
            linkUrl: "https://towardsdatascience.com/pca-using-python-scikit-learn-e653f8989e60",
            linkLabel: "PCA Guide with Python",
            substeps: [
              { id: "ml_10_dim_reduction_1", title: "4.10.1 Curse of Dimensionality", text: "Чому велика кількість ознак погіршує роботу алгоритмів класичного ML." },
              { id: "ml_10_dim_reduction_2", title: "4.10.2 Метод PCA", text: "Проекція даних на нові некорельовані осі (головні компоненти) із збереженням максимуму дисперсії." },
              { id: "ml_10_dim_reduction_3", title: "4.10.3 t-SNE & UMAP", text: "Нелінійні алгоритми зниження розмірності для красивої 2D/3D візуалізації кластерів." }
            ]
          }
        ]
      },
      {
        id: "dl_cv",
        title: "6. Глибоке навчання & Комп'ютерний зір",
        text: "Глибоке навчання, згорткові нейромережі та задачі комп'ютерного зору (CV).",
        x: 6300,
        steps: [
          {
            id: "dl_1_intro",
            title: "5.1 Глибоке навчання (DL)",
            text: "Основи штучних нейронних мереж (Perceptron), шари мережі, функції активації (ReLU, Sigmoid), Backpropagation.",
            linkUrl: "https://www.deeplearning.ai/",
            linkLabel: "DeepLearning.AI courses",
            substeps: [
              { id: "dl_1_intro_1", title: "5.1.1 Штучний нейрон", text: "Модель штучного нейрона, зважена сума, зсув (bias), нелінійна функція активації." },
              { id: "dl_1_intro_2", title: "5.1.2 Багатошаровий перцептрон", text: "Вхідний, приховані та вихідний шари. Повнов'язані шари (Dense layers)." },
              { id: "dl_1_intro_3", title: "5.1.3 Backpropagation", text: "Алгоритм зворотного поширення помилки за допомогою обчислення градієнтів складних функцій." }
            ]
          },
          {
            id: "dl_2_pytorch",
            title: "5.2 Фреймворки PyTorch",
            text: "Знайомство з PyTorch або TensorFlow. Створення архітектури нейромережі, визначення Loss-функції та оптимізатора.",
            linkUrl: "https://pytorch.org/tutorials/",
            linkLabel: "PyTorch Official Tutorials",
            substeps: [
              { id: "dl_2_pytorch_1", title: "5.2.1 Тензори в PyTorch", text: "Операції з тензорами, перенесення обчислень на GPU / CUDA." },
              { id: "dl_2_pytorch_2", title: "5.2.2 nn.Module структура", text: "Оголошення шарів мережі у конструкторі та прописування прямого ходу (forward)." },
              { id: "dl_2_pytorch_3", title: "5.2.3 Тренувальний цикл", text: "Написання циклу навчання: кроки forward, розрахунок Loss, backward, крок оптимізатора." }
            ]
          },
          {
            id: "dl_3_cv",
            title: "5.3 Комп'ютерний зір (CV)",
            text: "Згорткові нейронні мережі (CNN) для обробки зображень. Задачі класифікації зображень та детекції об'єктів.",
            linkUrl: "https://opencv.org/",
            linkLabel: "OpenCV Library Guide",
            substeps: [
              { id: "dl_3_cv_1", title: "5.3.1 Convolutional layers", text: "Робота шару згортки (фільтри, ядра), шари субдискретизації (MaxPooling)." },
              { id: "dl_3_cv_2", title: "5.3.2 Популярні CNN", text: "Архітектури ResNet (residual connections), VGG, огляд трансферного навчання (Transfer Learning)." },
              { id: "dl_3_cv_3", title: "5.3.3 Object Detection", text: "Різниця між класифікацією та детекцією (bounding boxes). Алгоритми сімейства YOLO." }
            ]
          },
          {
            id: "dl_4_segmentation",
            title: "5.4 Сегментація зображень",
            text: "Попіксельна класифікація об'єктів на зображеннях, архітектури та метрики оцінки.",
            linkUrl: "https://towardsdatascience.com/semantic-segmentation-with-u-net-585a9df61c77",
            linkLabel: "Semantic Segmentation Guide",
            substeps: [
              { id: "dl_4_segmentation_1", title: "5.4.1 Semantic Segmentation", text: "Класифікація кожного пікселя на зображенні. Огляд класичної архітектури U-Net." },
              { id: "dl_4_segmentation_2", title: "5.4.2 Instance Segmentation", text: "Виявлення меж окремих об'єктів на зображенні за допомогою архітектур типу Mask R-CNN." },
              { id: "dl_4_segmentation_3", title: "5.4.3 Метрики сегментації", text: "Оцінка якості роботи моделей: IoU та Dice." }
            ]
          },
          {
            id: "dl_5_transfer",
            title: "5.5 Transfer Learning",
            text: "Використання передтренованих важких моделей для специфічних бізнес-задач із меншим обсягом даних.",
            linkUrl: "https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html",
            linkLabel: "PyTorch Transfer Learning Guide",
            substeps: [
              { id: "dl_5_transfer_1", title: "5.5.1 Pretrained моделі", text: "Огляд готових ваг моделей, навчених на ImageNet." },
              { id: "dl_5_transfer_2", title: "5.5.2 Fine-Tuning шарів", text: "Методи заморожування перших шарів мережі та донавчання лише вихідних класифікаційних шарів." },
              { id: "dl_5_transfer_3", title: "5.5.3 Аугментація даних", text: "Методи штучного збільшення вибірки через Albumentations." }
            ]
          },
          {
            id: "dl_6_generative",
            title: "5.6 Генеративні моделі в CV",
            text: "Створення та генерація реалістичних зображень за допомогою нейронних мереж.",
            linkUrl: "https://towardsdatascience.com/understanding-generative-adversarial-networks-gans-cd6e46518b5b",
            linkLabel: "Generative Models Overview",
            substeps: [
              { id: "dl_6_generative_1", title: "5.6.1 Автоенкодери (VAE)", text: "Архітектура стиснення даних у латентний простір та відновлення зображень (Decoder)." },
              { id: "dl_6_generative_2", title: "5.6.2 GANs (ГАН мережі)", text: "Суперництво Генератора та Дискримінатора для отримання високоякісних фото." },
              { id: "dl_6_generative_3", title: "5.6.3 Дифузійні моделі", text: "Концепції додавання та прибирання шуму для генерації контенту (Stable Diffusion)." }
            ]
          },
          {
            id: "dl_7_opt",
            title: "5.7 Оптимізація моделей CV",
            text: "Методи стиснення та прискорення інференсу нейронних мереж для розгортання на продакшені.",
            linkUrl: "https://pytorch.org/docs/stable/quantization.html",
            linkLabel: "Model Quantization Guide",
            substeps: [
              { id: "dl_7_opt_1", title: "5.7.1 Квантизація", text: "Зниження розрядності ваг моделей (перехід від FP32 до INT8) для прискорення обчислень." },
              { id: "dl_7_opt_2", title: "5.7.2 Дистиляція моделей", text: "Перенесення знань від важкої моделі (Teacher) до легкої та швидкої моделі (Student)." },
              { id: "dl_7_opt_3", title: "5.7.3 Прунінг (Pruning)", text: "Видалення нульових та найменш значущих ваг нейромережі без серйозної втрати якості." }
            ]
          },
          {
            id: "dl_8_opencv",
            title: "5.8 Робота з OpenCV",
            text: "Класична обробка зображень та відеопотоку без важких нейромережевих моделей.",
            linkUrl: "https://docs.opencv.org/4.x/d9/df8/tutorial_root.html",
            linkLabel: "OpenCV Official Tutorials",
            substeps: [
              { id: "dl_8_opencv_1", title: "5.8.1 Обробка зображень", text: "Фільтри розмиття (Gaussian Blur), виявлення меж Кенні." },
              { id: "dl_8_opencv_2", title: "5.8.2 Колірні простори", text: "Перетворення зображення між колірними просторами HSV, RGB, Grayscale." },
              { id: "dl_8_opencv_3", title: "5.8.3 Обробка відео", text: "Читання відеопотоку з камери в реальному часі, трекінг контурів та об'єктів." }
            ]
          },
          {
            id: "dl_9_face",
            title: "5.9 Face Recognition",
            text: "Системи розпізнавання та верифікації облич на зображеннях.",
            linkUrl: "https://towardsdatascience.com/face-recognition-for-beginners-a7a9bd38ef0a",
            linkLabel: "Face Recognition Guide",
            substeps: [
              { id: "dl_9_face_1", title: "5.9.1 Детекція облич", text: "Визначення координат обличчя на фото за допомогою алгоритмів MTCNN, RetinaFace." },
              { id: "dl_9_face_2", title: "5.9.2 Ембеддінги облич", text: "Побудова низьковимірних векторів обличчя за допомогою моделей FaceNet або ArcFace." },
              { id: "dl_9_face_3", title: "5.9.3 Верифікація облич", text: "Порівняння векторів за допомогою косинусної схожості для підтвердження особи." }
            ]
          },
          {
            id: "dl_10_deploy",
            title: "5.10 CV проекти та деплой",
            text: "Створення демонстраційного веб-сервісу та оптимізація під швидкий інференс.",
            linkUrl: "https://onnxruntime.ai/docs/",
            linkLabel: "ONNX Runtime Documentation",
            substeps: [
              { id: "dl_10_deploy_1", title: "5.10.1 Streamlit демо", text: "Розробка простого та інтерактивного інтерфейсу для обробки картинок на Python." },
              { id: "dl_10_deploy_2", title: "5.10.2 ONNX експорт", text: "Перетворення нейромереж із PyTorch у формат ONNX для незалежного та швидкого виконання." },
              { id: "dl_10_deploy_3", title: "5.10.3 Хмарний деплой", text: "Запуск веб-сервісу розпізнавання картинок на базі Docker та хмарних серверів." }
            ]
          }
        ]
      },
      {
        id: "gen_ai",
        title: "7. Обробка природної мови & Генеративний ШІ",
        text: "Аналіз текстів, великі мовні моделі (LLM), архітектура Transformers та RAG системи.",
        x: 7500,
        steps: [
          {
            id: "nlp_1_basics",
            title: "6.1 Обробка тексту (NLP)",
            text: "Перетворення сирого тексту в числовий вигляд для аналізу алгоритмами.",
            linkUrl: "https://huggingface.co/learn/nlp-course",
            linkLabel: "Hugging Face NLP Course",
            substeps: [
              { id: "nlp_1_basics_1", title: "6.1.1 Токенізація", text: "Основи розбиття тексту на токени та субтокени: алгоритми BPE, WordPiece." },
              { id: "nlp_1_basics_2", title: "6.1.2 Текстові ознаки", text: "Створення ознак за допомогою Bag of Words, розрахунок важливості слів через TF-IDF." },
              { id: "nlp_1_basics_3", title: "6.1.3 Векторні ембеддінги", text: "Концепції векторного представлення слів: дистрибутивна семантика Word2Vec, GloVe." }
            ]
          },
          {
            id: "nlp_2_rnn",
            title: "6.2 Рекурентні мережі (RNN)",
            text: "Архітектури нейромереж, спеціально розроблені для обробки послідовностей та контексту.",
            linkUrl: "https://colah.github.io/posts/2015-08-Understanding-LSTMs/",
            linkLabel: "Understanding LSTMs",
            substeps: [
              { id: "nlp_2_rnn_1", title: "6.2.1 RNN архітектура", text: "Поняття послідовної обробки та передачі прихованого стану (hidden state) між кроками." },
              { id: "nlp_2_rnn_2", title: "6.2.2 LSTM & GRU", text: "Подолання проблеми затухання градієнта завдяки механізмам фільтрації інформації (gates)." },
              { id: "nlp_2_rnn_3", title: "6.2.3 Seq2Seq моделі", text: "Архітектура Encoder-Decoder для задач перекладу та механізм уваги (Attention)." }
            ]
          },
          {
            id: "nlp_3_trans",
            title: "6.3 Архітектура Transformers",
            text: "Сучасний стандарт побудови моделей обробки природної мови на основі механізму Self-Attention.",
            linkUrl: "https://jalammar.github.io/illustrated-transformer/",
            linkLabel: "The Illustrated Transformer",
            substeps: [
              { id: "nlp_3_trans_1", title: "6.3.1 Self-Attention", text: "Математичний опис механізму внутрішньої уваги (Query, Key, Value) та Multi-Head Attention." },
              { id: "nlp_3_trans_2", title: "6.3.2 Encoder-Decoder", text: "Повна структура оригінальної моделі Transformer з паралельною обробкою слів." },
              { id: "nlp_3_trans_3", title: "6.3.3 Positional Encoding", text: "Методи збереження інформації про порядок слів у реченні за допомогою синусоїдальних ембеддінгів." }
            ]
          },
          {
            id: "nlp_4_bert",
            title: "6.4 Моделі BERT та GPT",
            text: "Створення та застосування великих попередньо навчених мовних моделей.",
            linkUrl: "https://huggingface.co/docs/transformers/model_doc/bert",
            linkLabel: "BERT Documentation",
            substeps: [
              { id: "nlp_4_bert_1", title: "6.4.1 BERT (Encoder)", text: "Двонаправлене кодування тексту та навчання на задачах передбачення маскованих слів (Masked LM)." },
              { id: "nlp_4_bert_2", title: "6.4.2 GPT (Decoder)", text: "Односпрямоване авторегресійне декодування для генерації зв'язного та логічного тексту." },
              { id: "nlp_4_bert_3", title: "6.4.3 Hugging Face", text: "Робота з бібліотекою Transformers, завантаження моделей та запуск токенізаторів." }
            ]
          },
          {
            id: "nlp_5_prompt",
            title: "6.5 Prompt Engineering",
            text: "Мистецтво правильного формулювання інструкцій та запитів до готових великих мовних моделей (LLMs).",
            linkUrl: "https://www.promptingguide.ai/",
            linkLabel: "Prompt Engineering Guide",
            substeps: [
              { id: "nlp_5_prompt_1", title: "6.5.1 Базовий промптинг", text: "Приклади Zero-shot та Few-shot промптингу для кращих результатів." },
              { id: "nlp_5_prompt_2", title: "6.5.2 Advanced Prompting", text: "Концепції ланцюжків міркувань (Chain-of-Thought) та фреймворку логіка-дія (ReAct)." },
              { id: "nlp_5_prompt_3", title: "6.5.3 Оптимізація запитів", text: "Систематизація промптів, тестування на валідаційних вибірках та логування результатів." }
            ]
          },
          {
            id: "nlp_6_tuning",
            title: "6.6 Донавчання LLM (Fine-Tuning)",
            text: "Методологія адаптації загальних мовних моделей під вузькоспеціалізовані доменні задачі.",
            linkUrl: "https://github.com/tloen/alpaca-lora",
            linkLabel: "LoRA Fine-Tuning Guide",
            substeps: [
              { id: "nlp_6_tuning_1", title: "6.6.1 Instruction Tuning", text: "Навчання моделей слідувати формату інструкцій (на прикладі датасету Alpaca)." },
              { id: "nlp_6_tuning_2", title: "6.6.2 PEFT & LoRA", text: "Ефективне донавчання моделей за допомогою адаптерів низького рангу (LoRA) для збереження пам'яті." },
              { id: "nlp_6_tuning_3", title: "6.6.3 Alignment & DPO", text: "Вирівнювання відповідей моделей з людськими цінностями через навчання з підкріпленням (RLHF / DPO)." }
            ]
          },
          {
            id: "nlp_7_rag",
            title: "6.7 RAG системи",
            text: "Retrieval-Augmented Generation: поєднання генеративних властивостей LLM з надійністю пошуку по базах знань.",
            linkUrl: "https://python.langchain.com/v0.2/docs/tutorials/rag/",
            linkLabel: "LangChain RAG Tutorial",
            substeps: [
              { id: "nlp_7_rag_1", title: "6.7.1 Векторні бази", text: "Зберігання та семантичний пошук по текстах за допомогою ChromaDB, Pinecone чи FAISS." },
              { id: "nlp_7_rag_2", title: "6.7.2 Chunking & Embedding", text: "Стратегії розбиття великих документів на змістовні частини (chunks) та перетворення їх у вектори." },
              { id: "nlp_7_rag_3", title: "6.7.3 Додатковий пошук", text: "Техніки покращення пошуку: гібридний пошук (Dense + Sparse), переранжування результатів (Reranking)." }
            ]
          },
          {
            id: "nlp_8_agents",
            title: "6.8 LLM фреймворки (Orchestration)",
            text: "Розробка додатків та автономних агентів за допомогою оркестраторів мовних моделей.",
            linkUrl: "https://www.deeplearning.ai/short-courses/ai-agents-in-langchain/",
            linkLabel: "AI Agents Course",
            substeps: [
              { id: "nlp_8_agents_1", title: "6.8.1 LangChain & LlamaIndex", text: "Порівняння фреймворків, побудова ланцюжків (chains) та індексація приватних документів." },
              { id: "nlp_8_agents_2", title: "6.8.2 Автономні агенти", text: "Створення агентів, здатних самостійно обирати потрібний інструмент (інтернет-пошук, калькулятор)." },
              { id: "nlp_8_agents_3", title: "6.8.3 Пам'ять агентів", text: "Налаштування зберігання контексту бесіди (Window Memory, Summary Memory) для чат-ботів." }
            ]
          },
          {
            id: "nlp_9_eval",
            title: "6.9 Оцінка якості LLM",
            text: "Методи тестування та автоматичного вимірювання релевантності та безпеки відповідей моделей.",
            linkUrl: "https://docs.ragas.io/en/stable/",
            linkLabel: "Ragas Framework Docs",
            substeps: [
              { id: "nlp_9_eval_1", title: "6.9.1 Метрики BLEU & ROUGE", text: "Класична послова порівняльна оцінка згенерованого тексту з еталонним." },
              { id: "nlp_9_eval_2", title: "6.9.2 LLM-as-a-Judge", text: "Оцінка відповідей моделей за допомогою потужніших моделей (наприклад, GPT-4)." },
              { id: "nlp_9_eval_3", title: "6.9.3 Оцінка RAG систем", text: "Розрахунок метрик відповідності контексту (context relevance) та вірогідності відповідей (faithfulness)." }
            ]
          },
          {
            id: "nlp_10_deploy",
            title: "6.10 Деплоймент LLM",
            text: "Оптимізований запуск та обслуговування великих мовних моделей на серверах.",
            linkUrl: "https://github.com/vllm-project/vllm",
            linkLabel: "vLLM Github Project",
            substeps: [
              { id: "nlp_10_deploy_1", title: "6.10.1 Локальні моделі", text: "Запуск моделей у форматі GGUF локально на звичайних комп'ютерах через Ollama." },
              { id: "nlp_10_deploy_2", title: "6.10.2 Сервери інференсу", text: "Швидкий паралельний запуск інференсу з оптимізацією пам'яті (vLLM PagedAttention)." },
              { id: "nlp_10_deploy_3", title: "6.10.3 API обгортки", text: "Створення OpenAI-сумісних REST API ендпоінтів для інтеграції у комерційні додатки." }
            ]
          }
        ]
      },
      {
        id: "data_eng",
        title: "8. Data Engineering & Big Data",
        text: "Обробка величезних масивів інформації, оркестрація та потокова передача даних.",
        x: 8700,
        steps: [
          {
            id: "de_1_intro",
            title: "7.1 Архітектура сховищ (DWH)",
            text: "Концепції OLAP vs OLTP, побудова сховищ даних (DWH) та озер даних (Data Lake).",
            linkUrl: "https://www.databricks.com/glossary/extract-transform-load",
            linkLabel: "Lakehouse Architecture Guide",
            substeps: [
              { id: "de_1_intro_1", title: "7.1.1 OLAP vs OLTP", text: "Різниця між транзакційними системами та аналітичними сховищами даних." },
              { id: "de_1_intro_2", title: "7.1.2 Data Lakehouse", text: "Поєднання гнучкості Data Lake з надійністю та ACID-транзакціями сховищ (Delta Lake)." },
              { id: "de_1_intro_3", title: "7.1.3 Формати зберігання", text: "Стовпчикові формати Apache Parquet, ORC та рядкові формати Avro, JSON." }
            ]
          },
          {
            id: "de_2_spark",
            title: "7.2 Apache Spark & PySpark",
            text: "Обробка великих даних у розподіленій оперативній пам'яті.",
            linkUrl: "https://spark.apache.org/docs/latest/api/python/index.html",
            linkLabel: "PySpark Documentation",
            substeps: [
              { id: "de_2_spark_1", title: "7.2.1 Spark Driver & Worker", text: "Концепція розподіленої обробки, Master/Worker вузли, RDD (Resilient Distributed Datasets)." },
              { id: "de_2_spark_2", title: "7.2.2 PySpark DataFrame", text: "Робота з DataFrame API, перетворення даних на великих кластерах за допомогою Python." },
              { id: "de_2_spark_3", title: "7.2.3 Оптимізація Spark", text: "Широкі та вузькі трансформації, shuffling, partitioning та кешування даних." }
            ]
          },
          {
            id: "de_3_airflow",
            title: "7.3 Apache Airflow",
            text: "Оркестрація пайплайнів обробки даних (Data Pipelines orchestration).",
            linkUrl: "https://airflow.apache.org/docs/",
            linkLabel: "Airflow Documentation",
            substeps: [
              { id: "de_3_airflow_1", title: "7.3.1 DAG концепція", text: "Створення направлених ациклічних графів (DAG) на Python, оператори BashOperator, PythonOperator." },
              { id: "de_3_airflow_2", title: "7.3.2 Scheduling & Triggers", text: "Запуск пайплайнів за розкладом (cron), обробка пропущених періодів (backfill)." },
              { id: "de_3_airflow_3", title: "7.3.3 Sensor & Task Flow", text: "Очікування завершення інших процесів (Sensors), передача даних між тасками (XCom)." }
            ]
          },
          {
            id: "de_4_kafka",
            title: "7.4 Потокова Kafka (Streaming)",
            text: "Обробка потокових даних у реальному часі (Real-time stream processing).",
            linkUrl: "https://kafka.apache.org/documentation/",
            linkLabel: "Apache Kafka Docs",
            substeps: [
              { id: "de_4_kafka_1", title: "7.4.1 Pub/Sub архітектура", text: "Концепції Producers, Consumers, Topics, Messages у брокері повідомлень Kafka." },
              { id: "de_4_kafka_2", title: "7.4.2 Партиції & Реплікація", text: "Горизонтальне масштабування топіків за допомогою Partitioning, збереження копій (Replication Factor)." },
              { id: "de_4_kafka_3", title: "7.4.3 Spark Streaming", text: "Інтеграція Kafka зі Spark для мікро-пакетної обробки стрімів у реальному часі." }
            ]
          },
          {
            id: "de_5_dbt",
            title: "7.5 dbt (data build tool)",
            text: "Сучасний T-етап (Transformation) в ETL процесах за допомогою SQL.",
            linkUrl: "https://docs.getdbt.com/",
            linkLabel: "dbt Documentation",
            substeps: [
              { id: "de_5_dbt_1", title: "7.5.1 Моделювання dbt", text: "Написання SQL-запитів (SELECT) як моделей, матеріалізація у вигляді View чи Table." },
              { id: "de_5_dbt_2", title: "7.5.2 Тестування dbt", text: "Опис та запуск тестів даних: перевірки унікальності, NOT NULL, відповідності значень." },
              { id: "de_5_dbt_3", title: "7.5.3 Документування", text: "Автоматична генерація графів походження даних (Data Lineage) та опису колонок." }
            ]
          },
          {
            id: "de_6_hadoop",
            title: "7.6 Концепції Big Data",
            text: "Розподілене зберігання та обробка гігабайтних об'ємів даних.",
            linkUrl: "https://hadoop.apache.org/",
            linkLabel: "Apache Hadoop Official Site",
            substeps: [
              { id: "de_6_hadoop_1", title: "7.6.1 HDFS сховище", text: "Архітектура NameNode та DataNode, блочне зберігання великих файлів." },
              { id: "de_6_hadoop_2", title: "7.6.2 Hive & Trino SQL", text: "Використання SQL-подібного синтаксису для швидких аналітичних запитів поверх Data Lakes." },
              { id: "de_6_hadoop_3", title: "7.6.3 NoSQL великі дані", text: "Принципи роботи розподілених баз даних з високою швидкістю запису (Cassandra, HBase)." }
            ]
          },
          {
            id: "de_7_docker",
            title: "7.7 Контейнеризація у DE",
            text: "Управління залежностями та середовищем виконання аналітичних скриптів.",
            linkUrl: "https://docs.docker.com/get-started/",
            linkLabel: "Docker Getting Started",
            substeps: [
              { id: "de_7_docker_1", title: "7.7.1 Docker у DE", text: "Створення ізольованих контейнерів для локальних інструментів Airflow, Spark." },
              { id: "de_7_docker_2", title: "7.7.2 Compose сценарії", text: "Спільний запуск взаємопов'язаних систем (база даних, оркестратор, сховище)." },
              { id: "de_7_docker_3", title: "7.7.3 Kubernetes основи", text: "Ознайомлення з оркестрацією контейнерів для великих хмарних пайплайнів обробки." }
            ]
          },
          {
            id: "de_8_cloud",
            title: "7.8 Хмарні сховища та DWH",
            text: "Використання серверлес хмарних рішень для аналізу гігабайтних датасетів.",
            linkUrl: "https://cloud.google.com/bigquery",
            linkLabel: "Google BigQuery Guide",
            substeps: [
              { id: "de_8_cloud_1", title: "7.8.1 Google BigQuery", text: "Колоночне сховище для миттєвих аналітичних запитів за допомогою SQL." },
              { id: "de_8_cloud_2", title: "7.8.2 Snowflake сховище", text: "Архітектура хмарного сховища з динамічним виділенням обчислювальних ресурсів." },
              { id: "de_8_cloud_3", title: "7.8.3 AWS Redshift", text: "Класичне хмарне DWH рішення від Amazon для великих об'ємів даних." }
            ]
          },
          {
            id: "de_9_quality",
            title: "7.9 Якість даних (Data Quality)",
            text: "Автоматична перевірка коректності та свіжості інформації в сховищах.",
            linkUrl: "https://greatexpectations.io/",
            linkLabel: "Great Expectations Docs",
            substeps: [
              { id: "de_9_quality_1", title: "7.9.1 Авто-тести даних", text: "Налаштування правил перевірки значень у колонках за допомогою Great Expectations." },
              { id: "de_9_quality_2", title: "7.9.2 Data Lineage", text: "Картування життєвого циклу походження даних від першоджерела до кінцевого звіту." },
              { id: "de_9_quality_3", title: "7.9.3 Моніторинг свіжості", text: "Налаштування сповіщень про запізнення або неповні об'єми завантажених даних." }
            ]
          },
          {
            id: "de_10_cicd",
            title: "7.10 Побудова наскрізного ETL",
            text: "Проектування інтегрованого ланцюжка обробки від API до дашборду.",
            linkUrl: "https://github.com/features/actions",
            linkLabel: "GitHub Actions Documentation",
            substeps: [
              { id: "de_10_cicd_1", title: "7.10.1 Дизайн ETL пайплайну", text: "Проектування архітектури перенесення даних з транзакційної БД у хмару." },
              { id: "de_10_cicd_2", title: "7.10.2 CDC технології", text: "Захоплення змін у реляційних БД у реальному часі (Change Data Capture / Debezium)." },
              { id: "de_10_cicd_3", title: "7.10.3 CI/CD процеси", text: "Автоматичне розгортання та тестування нових Airflow DAG і моделей dbt на GitHub." }
            ]
          }
        ]
      },
      {
        id: "viz_bi",
        title: "9. Візуалізація даних та BI",
        text: "Побудова інтерактивних дашбордів та передача бізнес-інсайтів за допомогою графіків.",
        x: 9900,
        steps: [
          {
            id: "bi_1_basics",
            title: "8.1 Основи Business Intelligence",
            text: "Концепції бізнес-аналітики, життєвий цикл звітів та безпека даних.",
            linkUrl: "https://www.coursera.org/specializations/key-business-metrics-tableau",
            linkLabel: "Business Metrics Specialization",
            substeps: [
              { id: "bi_1_basics_1", title: "8.1.1 Роль BI в бізнесі", text: "Визначення метрик та ключових показників ефективності (KPIs)." },
              { id: "bi_1_basics_2", title: "8.1.2 Життєвий цикл звіту", text: "Етапи розробки: збір вимог, підготовка даних, прототипування." },
              { id: "bi_1_basics_3", title: "8.1.3 Безпека даних", text: "Рольовий доступ до звітів (Row-Level Security) для захисту конфіденційності." }
            ]
          },
          {
            id: "bi_2_powerbi",
            title: "8.2 MS Power BI Desktop",
            text: "Імпорт даних, побудова моделей та обчислення аналітичних показників.",
            linkUrl: "https://learn.microsoft.com/en-us/power-bi/",
            linkLabel: "Power BI Learn",
            substeps: [
              { id: "bi_2_powerbi_1", title: "8.2.1 Power Query", text: "Імпорт даних з баз, об'єднання запитів, кроки трансформації колонок." },
              { id: "bi_2_powerbi_2", title: "8.2.2 Моделювання даних", text: "Створення зв'язків між таблицями (схема зірка). Налаштування напрямків фільтрації." },
              { id: "bi_2_powerbi_3", title: "8.2.3 Візуалізації", text: "Побудова інтерактивних чартів, налаштування крос-фільтрації." }
            ]
          },
          {
            id: "bi_3_dax",
            title: "8.3 Обчислення на DAX",
            text: "Написання формул аналізу даних для розрахунку складних показників.",
            linkUrl: "https://learn.microsoft.com/en-us/dax/",
            linkLabel: "DAX Reference Guide",
            substeps: [
              { id: "bi_3_dax_1", title: "8.3.1 Measures vs Columns", text: "Різниця між мірами (measures) та стовпцями (columns). Контекст рядка." },
              { id: "bi_3_dax_2", title: "8.3.2 CALCULATE функція", text: "Ключова функція зміни контексту фільтрації для проведення вибіркових розрахунків." },
              { id: "bi_3_dax_3", title: "8.3.3 Time Intelligence", text: "Аналіз часових періодів: порівняння з минулим роком, накопичувальні підсумки (YTD, MTD)." }
            ]
          },
          {
            id: "bi_4_service",
            title: "8.4 Power BI Service & Admin",
            text: "Спільна робота, публікація дашбордів та налаштування оновлень.",
            linkUrl: "https://learn.microsoft.com/en-us/power-bi/service-gateway-getting-started",
            linkLabel: "Power BI Gateway Guide",
            substeps: [
              { id: "bi_4_service_1", title: "8.4.1 Workspaces & Apps", text: "Організація спільного простору розробників та кінцевих бізнес-користувачів." },
              { id: "bi_4_service_2", title: "8.4.2 Gateway оновлення", text: "Налаштування автоматичного оновлення баз даних через шлюз (Gateway)." },
              { id: "bi_4_service_3", title: "8.4.3 Панелі керування", text: "Створення єдиного інформаційного табло (Dashboard) з різних звітів." }
            ]
          },
          {
            id: "bi_5_tableau",
            title: "8.5 Tableau Desktop basics",
            text: "Створення звітів та інтерактивних карт у Tableau.",
            linkUrl: "https://www.tableau.com/learn/training",
            linkLabel: "Tableau Training Resources",
            substeps: [
              { id: "bi_5_tableau_1", title: "8.5.1 Tableau Marks Card", text: "Керування кольором, розміром, текстом та формою точок візуалізації." },
              { id: "bi_5_tableau_2", title: "8.5.2 Tableau Extracts", text: "Робота з локальними копіями даних (Hyper extracts) для швидкодії." },
              { id: "bi_5_tableau_3", title: "8.5.3 Dashboards Tableau", text: "Створення інтерактивних панелей керування з використанням Tableau Actions." }
            ]
          },
          {
            id: "bi_6_lod",
            title: "8.6 Просунуті обчислення Tableau",
            text: "Написання формул незалежно від поточного візуального контексту.",
            linkUrl: "https://help.tableau.com/current/pro/desktop/en-us/calculations_calculatedfields_lod.htm",
            linkLabel: "Tableau LOD Guide",
            substeps: [
              { id: "bi_6_lod_1", title: "8.6.1 LOD Expressions", text: "Використання FIXED, INCLUDE, EXCLUDE виразів." },
              { id: "bi_6_lod_2", title: "8.6.2 Табличні розрахунки", text: "Обчислення наростаючих підсумків, відсотків від загального безпосередньо у вікні." },
              { id: "bi_6_lod_3", title: "8.6.3 Параметри & Сети", text: "Побудова динамічних фільтрів та підсвічування обраних груп даних (Sets)." }
            ]
          },
          {
            id: "bi_7_storytelling",
            title: "8.7 Мистецтво Data Storytelling",
            text: "Мистецтво презентації даних бізнес-користувачам та клієнтам.",
            linkUrl: "https://www.storytellingwithdata.com/",
            linkLabel: "Storytelling with Data",
            substeps: [
              { id: "bi_7_storytelling_1", title: "8.7.1 Психологія кольору", text: "Використання кольорів для керування увагою, контрастні акценти." },
              { id: "bi_7_storytelling_2", title: "8.7.2 Вибір графіків", text: "Правила вибору типу візуалізації: коли доцільний Bar chart, а коли Scatter plot." },
              { id: "bi_7_storytelling_3", title: "8.7.3 Чистка графіків", text: "Зменшення когнітивного навантаження: прибирання зайвих ліній сітки." }
            ]
          },
          {
            id: "bi_8_prototype",
            title: "8.8 Прототипування дашбордів",
            text: "Етапи збору бізнес-вимог та створення ескізів до написання коду.",
            linkUrl: "https://www.figma.com/",
            linkLabel: "Figma Platform",
            substeps: [
              { id: "bi_8_prototype_1", title: "8.8.1 Wireframing", text: "Створення чорно-білих макетів звітів у Figma для узгодження логіки з користувачем." },
              { id: "bi_8_prototype_2", title: "8.8.2 Співбесіди з бізнесом", text: "Виявлення ключових бізнес-запитань, на які має відповісти дашборд." },
              { id: "bi_8_prototype_3", title: "8.8.3 UX тестування", text: "Ітеративні перевірки зручності використання кнопок, зрізів та фільтрів дашборду." }
            ]
          },
          {
            id: "bi_9_looker",
            title: "8.9 Інші BI інструменти",
            text: "Ознайомлення з альтернативними аналітичними платформами на ринку.",
            linkUrl: "https://lookerstudio.google.com/",
            linkLabel: "Google Looker Studio",
            substeps: [
              { id: "bi_9_looker_1", title: "8.9.1 Looker Studio", text: "Швидке створення простих безкоштовних звітів з Google Analytics / BigQuery." },
              { id: "bi_9_looker_2", title: "8.9.2 Apache Superset", text: "Огляд потужного open-source BI-інструменту для дослідження великих даних." },
              { id: "bi_9_looker_3", title: "8.9.3 Metabase", text: "Інструмент для швидкого надання доступу до SQL-звітів нетехнічним користувачам." }
            ]
          },
          {
            id: "bi_10_engineering",
            title: "8.10 BI як інженерна дисципліна",
            text: "Застосування практик розробки програмного забезпечення до побудови звітності.",
            linkUrl: "https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview",
            linkLabel: "Power BI Developer Projects",
            substeps: [
              { id: "bi_10_engineering_1", title: "8.10.1 Версіонування звітів", text: "Зберігання розшифрованих кодів звітів (.pbip) у Git для відстеження змін." },
              { id: "bi_10_engineering_2", title: "8.10.2 Оптимізація перформансу", text: "Зменшення затримок за допомогою Performance Analyzer, прискорення повільних розрахунків." },
              { id: "bi_10_engineering_3", title: "8.10.3 Словник даних", text: "Створення централізованого глосарію розрахованих бізнес-метрик." }
            ]
          }
        ]
      },
      {
        id: "prod_analytics",
        title: "10. Продуктова аналітика & A/B тестування",
        text: "Аналіз поведінки користувачів, розрахунок метрик утримання та проведення A/B тестувань.",
        x: 11100,
        steps: [
          {
            id: "pa_1_metrics",
            title: "9.1 Продуктові метрики",
            text: "Аналіз життєвого циклу клієнта та фінансових метрик продукту.",
            linkUrl: "https://amplitude.com/blog/product-analytics-guide",
            linkLabel: "Amplitude Analytics Guide",
            substeps: [
              { id: "pa_1_metrics_1", title: "9.1.1 Воронка AARRR", text: "Етапи взаємодії: Acquisition, Activation, Retention, Referral, Revenue." },
              { id: "pa_1_metrics_2", title: "9.1.2 Залученість (Engagement)", text: "DAU, MAU, Stickiness Ratio, розрахунок LTV та CAC." },
              { id: "pa_1_metrics_3", title: "9.1.3 Фінансові метрики", text: "MRR, ARR, Churn Rate, ARPU." }
            ]
          },
          {
            id: "pa_2_churn",
            title: "9.2 Залученість та відтік",
            text: "Аналіз активності користувачів та причин відмови від використання продукту.",
            linkUrl: "https://mixpanel.com/blog/churn-rate-formula-analysis/",
            linkLabel: "Mixpanel Churn Guide",
            substeps: [
              { id: "pa_2_churn_1", title: "9.2.1 Розрахунок Churn", text: "Метрики відтоку клієнтів (Customer Churn) та доходів (Revenue Churn)." },
              { id: "pa_2_churn_2", title: "9.2.2 Метрики активації", text: "Пошук ключового етапу взаємодії (Aha! moment) для залучення користувачів." },
              { id: "pa_2_churn_3", title: "9.2.3 LTV/CAC пропорція", text: "Аналіз рентабельності маркетингу: ідеальні пропорції окупності трафіку." }
            ]
          },
          {
            id: "pa_3_cohort",
            title: "9.3 Когортний аналіз",
            text: "Глибоке дослідження лояльності користувачів та відтоку.",
            linkUrl: "https://amplitude.com/blog/cohort-analysis",
            linkLabel: "Amplitude Cohort Guide",
            substeps: [
              { id: "pa_3_cohort_1", title: "9.3.1 Створення когорт", text: "Групування користувачів за датою першої дії або за специфічною поведінкою." },
              { id: "pa_3_cohort_2", title: "9.3.2 Матриці Retention", text: "Побудова сіток утримання користувачів по тижнях (N-day, Unbounded)." },
              { id: "pa_3_cohort_3", title: "9.3.3 Churn Analysis", text: "Визначення точок відтоку користувачів з продукту, дослідження лояльності." }
            ]
          },
          {
            id: "pa_4_ab",
            title: "9.4 Основи A/B тестування",
            text: "Дизайн та аналіз результатів наукових спліт-тестів.",
            linkUrl: "https://towardsdatascience.com/the-art-of-a-b-testing-5a106e69fdc6",
            linkLabel: "A/B Testing Guide",
            substeps: [
              { id: "pa_4_ab_1", title: "9.4.1 Суть спліт-тестів", text: "Чому A/B тести є золотим стандартом каузального аналізу в бізнесі." },
              { id: "pa_4_ab_2", title: "9.4.2 Дизайн експерименту", text: "Формулювання перевіряємої гіпотези, вибір цільової метрики (conversion, revenue)." },
              { id: "pa_4_ab_3", title: "9.4.3 Охоронні метрики", text: "Guardrail metrics для запобігання погіршенню технічних показників (затримка, помилки)." }
            ]
          },
          {
            id: "pa_5_sample",
            title: "9.5 Розрахунок вибірки",
            text: "Визначення тривалості тесту та кількості користувачів для надійності результатів.",
            linkUrl: "https://www.evanmiller.org/ab-testing/sample-size.html",
            linkLabel: "Evan Miller's Sample Size Calculator",
            substeps: [
              { id: "pa_5_sample_1", title: "9.5.1 Статистичні помилки", text: "Контроль помилок 1-го роду (альфа) та 2-го роду (бета), розрахунок статистичної потужності." },
              { id: "pa_5_sample_2", title: "9.5.2 MDE параметр", text: "Визначення мінімального бізнес-значущого ефекту (Minimum Detectable Effect)." },
              { id: "pa_5_sample_3", title: "9.5.3 Розрахунок об'єму", text: "Розрахунок необхідної вибірки за допомогою Python-бібліотеки statsmodels." }
            ]
          },
          {
            id: "pa_6_split",
            title: "9.6 Спліт-системи та A/A тестування",
            text: "Методологія поділу трафіку та перевірки надійності систем тестування.",
            linkUrl: "https://towardsdatascience.com/how-to-implement-a-b-testing-splitting-logic-3b56a42247fb",
            linkLabel: "A/B Splitting Logic",
            substeps: [
              { id: "pa_6_split_1", title: "9.6.1 Рандомізація юзерів", text: "Розподіл користувачів по групах за допомогою хешування (md5) з використанням солі (salt)." },
              { id: "pa_6_split_2", title: "9.6.2 A/A тестування", text: "Перевірка рівності груп та відсутності внутрішнього зміщення в системі сплітування." },
              { id: "pa_6_split_3", title: "9.6.3 SRM тестування", text: "Виявлення розбіжності розподілу трафіку (Sample Ratio Mismatch) через критерій Хі-квадрат." }
            ]
          },
          {
            id: "pa_7_analysis",
            title: "9.7 Аналіз результатів тесту",
            text: "Застосування математичної статистики для оцінки експериментів.",
            linkUrl: "https://towardsdatascience.com/statistical-tests-for-a-b-testing-c9da3fa55b8b",
            linkLabel: "Statistical Tests in A/B",
            substeps: [
              { id: "pa_7_analysis_1", title: "9.7.1 Критерії для конверсій", text: "Застосування Proportion Z-test та критерію Хі-квадрат для дискретних конверсій." },
              { id: "pa_7_analysis_2", title: "9.7.2 Критерії для чеків", text: "t-тест Стьюдента та непараметричний тест Манна-Вітні для оцінки середніх доходів." },
              { id: "pa_7_analysis_3", title: "9.7.3 Bootstrap в A/B", text: "Використання бутстреп ресемплінгу для порівняння медіанних та складно-обчислюваних метрик." }
            ]
          },
          {
            id: "pa_8_advanced_ab",
            title: "9.8 Просунутий дизайн A/B",
            text: "Боротьба з типовими проблемами та складними сценаріями експериментів.",
            linkUrl: "https://towardsdatascience.com/peeking-problem-in-a-b-testing-c9233f2e1a3b",
            linkLabel: "The Peeking Problem Explained",
            substeps: [
              { id: "pa_8_advanced_ab_1", title: "9.8.1 Проблема підглядання", text: "Чому не можна зупиняти тест раніше розрахованого терміну." },
              { id: "pa_8_advanced_ab_2", title: "9.8.2 Множинні порівняння", text: "Застосування поправки Бонферроні для усунення накопичення статистичної помилки." },
              { id: "pa_8_advanced_ab_3", title: "9.8.3 Мережеві ефекти", text: "Специфіка тестування соціальних мереж / месенджерів (кластерна рандомізація)." }
            ]
          },
          {
            id: "pa_9_amplitude",
            title: "9.9 Продуктова аналітика в Amplitude",
            text: "Використання готових платформ аналізу поведінки користувачів.",
            linkUrl: "https://help.amplitude.com/hc/en-us/articles/360032734131-Amplitude-User-Manual",
            linkLabel: "Amplitude User Manual",
            substeps: [
              { id: "pa_9_amplitude_1", title: "9.9.1 Події & Властивості", text: "Налаштування Event tracking плану, робота з User properties та Event properties." },
              { id: "pa_9_amplitude_2", title: "9.9.2 Аналіз воронок", text: "Побудова крокових конверсій (funnel analysis) та виявлення точок найбільшого відтоку." },
              { id: "pa_9_amplitude_3", title: "9.9.3 Сегментація юзерів", text: "Порівняльний аналіз поведінкових категорій (платформи, країни, поведінка)." }
            ]
          },
          {
            id: "pa_10_api",
            title: "9.10 Робота з Mixpanel API",
            text: "Автоматизація вивантаження продуктових метрик та інтеграція даних.",
            linkUrl: "https://www.mixpanel.com/docs/",
            linkLabel: "Mixpanel API Documentation",
            substeps: [
              { id: "pa_10_api_1", title: "9.10.1 Експорт сирих подій", text: "Використання Mixpanel / Amplitude API для вивантаження логів клікстріму в хмару." },
              { id: "pa_10_api_2", title: "9.10.2 Моделювання відтоку", text: "Створення Python-пайплайнів для передбачення схильності користувача до відтоку." },
              { id: "pa_10_api_3", title: "9.10.3 Робота з SDK", text: "Інтеграція SDK аналітичних інструментів у клієнтський JavaScript/Python код." }
            ]
          }
        ]
      },
      {
        id: "recsys",
        title: "11. Рекомендаційні системи та пошук",
        text: "Персоналізація контенту, матричний розклад, векторний пошук та пошукові рушії.",
        x: 12300,
        steps: [
          {
            id: "rec_1_intro",
            title: "10.1 Вступ до рекомендацій",
            text: "Роль рекомендацій у бізнесі, типи фідбеку та проблема холодного старту.",
            linkUrl: "https://towardsdatascience.com/introduction-to-recommender-systems-6c6658d04e65",
            linkLabel: "Intro to RecSys",
            substeps: [
              { id: "rec_1_intro_1", title: "10.1.1 Роль рекомендацій", text: "Як рекомендаційні системи утримують користувачів (на прикладі Netflix, Spotify)." },
              { id: "rec_1_intro_2", title: "10.1.2 Explicit vs Implicit", text: "Різниця між прямими оцінками (лайки, рейтинги) та непрямими діями (кліки, час)." },
              { id: "rec_1_intro_3", title: "10.1.3 Холодний старт", text: "Методології підбору контенту для абсолютно нових користувачів та товарів." }
            ]
          },
          {
            id: "rec_2_cf",
            title: "10.2 Колаборативна фільтрація (CF)",
            text: "Класичний підхід пошуку рекомендацій на основі перехресних інтересів груп користувачів.",
            linkUrl: "https://realpython.com/build-recommendation-engine-collaborative-filtering/",
            linkLabel: "Collaborative Filtering Guide",
            substeps: [
              { id: "rec_2_cf_1", title: "10.2.1 User-Based CF", text: "Рекомендація товарів, які сподобалися користувачам зі схожою історією оцінок." },
              { id: "rec_2_cf_2", title: "10.2.2 Item-Based CF", text: "Знаходження схожих між собою товарів на основі збігів оцінок користувачів." },
              { id: "rec_2_cf_3", title: "10.2.3 Міри схожості", text: "Обчислення близькості векторів: косинусна відстань, кореляція Пірсона." }
            ]
          },
          {
            id: "rec_3_matrix",
            title: "10.3 Матричний розклад",
            text: "Концепції побудови латентних факторів для стиснення матриці взаємодій користувач-товар.",
            linkUrl: "https://towardsdatascience.com/singular-value-decomposition-svd-in-recommender-systems-for-beginners-6204c2b9a7ec",
            linkLabel: "SVD for RecSys",
            substeps: [
              { id: "rec_3_matrix_1", title: "10.3.1 SVD розклад", text: "Сингулярний матричний розклад для відновлення пропущених оцінок користувачів." },
              { id: "rec_3_matrix_2", title: "10.3.2 ALS алгоритм", text: "Навчання моделей на неявних (implicit) даних за допомогою методу змінних найменших квадратів." },
              { id: "rec_3_matrix_3", title: "10.3.3 Латентні фічі", text: "Інтерпретація прихованих векторів характеристик товарів та вподобань користувачів." }
            ]
          },
          {
            id: "rec_4_content",
            title: "10.4 Content-Based рекомендації",
            text: "Побудова рекомендацій виключно на основі описів та властивостей самих товарів.",
            linkUrl: "https://towardsdatascience.com/content-based-recommender-systems-99a23588f11",
            linkLabel: "Content-Based RecSys",
            substeps: [
              { id: "rec_4_content_1", title: "10.4.1 Профілі товарів", text: "Опис контенту у вигляді векторів (категорії, теги, текстові описи через TF-IDF)." },
              { id: "rec_4_content_2", title: "10.4.2 Профілі користувача", text: "Усереднений вектор інтересів користувача на основі товарів, з якими він взаємодіяв." },
              { id: "rec_4_content_3", title: "10.4.3 Схожість профілів", text: "Розрахунок близькості профілю інтересів користувача та характеристик нових товарів." }
            ]
          },
          {
            id: "rec_5_two_stage",
            title: "10.5 Двоетапна архітектура",
            text: "Проектування промислових рекомендаційних систем великого масштабу.",
            linkUrl: "https://towardsdatascience.com/system-design-for-recommender-systems-7e1e695bbfbd",
            linkLabel: "RecSys System Design",
            substeps: [
              { id: "rec_5_two_stage_1", title: "10.5.1 Candidate Generation", text: "Етап відбору (Retrieval): швидкий пошук топ-100 кандидатів за допомогою легких моделей." },
              { id: "rec_5_two_stage_2", title: "10.5.2 Ranking етап", text: "Фінальне сортування відібраних кандидатів за допомогою важких ML моделей (наприклад, CatBoost)." },
              { id: "rec_5_two_stage_3", title: "10.5.3 Бізнес-фільтрація", text: "Прибирання дублікатів, виключення купленого контенту, підмішування випадкових новинок." }
            ]
          },
          {
            id: "rec_6_deep",
            title: "10.6 Глибоке навчання в RecSys",
            text: "Застосування нейронних мереж для кращого моделювання нелінійних зв'язків.",
            linkUrl: "https://towardsdatascience.com/deep-learning-for-recommender-systems-a-general-overview-25032d8471b",
            linkLabel: "Deep Learning RecSys Overview",
            substeps: [
              { id: "rec_6_deep_1", title: "10.6.1 Neural CF", text: "Заміна класичного скалярного добутку векторів багатошаровим перцептроном." },
              { id: "rec_6_deep_2", title: "10.6.2 Wide & Deep", text: "Спільне навчання лінійних моделей для запам'ятовування та глибоких мереж для узагальнення." },
              { id: "rec_6_deep_3", title: "10.6.3 Two-Tower архітектура", text: "Створення окремих мереж для ембеддінгів користувачів (User Tower) та товарів (Item Tower)." }
            ]
          },
          {
            id: "rec_7_vector",
            title: "10.7 Векторний пошук (Vector Search)",
            text: "Миттєве знаходження схожих об'єктів у багатовимірному просторі ембеддінгів.",
            linkUrl: "https://github.com/facebookresearch/faiss",
            linkLabel: "FAISS GitHub Repository",
            substeps: [
              { id: "rec_7_vector_1", title: "10.7.1 Наближені сусіди", text: "Концепції Approximate Nearest Neighbors (ANN) для прискорення точного пошуку KNN." },
              { id: "rec_7_vector_2", title: "10.7.2 FAISS бібліотека", text: "Створення швидких індексів векторів та пошук за косинусною відстанню на GPU від Facebook." },
              { id: "rec_7_vector_3", title: "10.7.3 HNSW граф пошуку", text: "Графовий підхід побудови зв'язків між векторами для швидкого крокування до найближчого." }
            ]
          },
          {
            id: "rec_8_metrics",
            title: "10.8 Метрики якості рекомендацій",
            text: "Розрахунок спеціальних офлайн-метрики для оцінки якості сортування рекомендацій.",
            linkUrl: "https://towardsdatascience.com/evaluation-metrics-for-recommender-systems-df56c6611093",
            linkLabel: "Evaluation Metrics Guide",
            substeps: [
              { id: "rec_8_metrics_1", title: "10.8.1 Precision & Recall", text: "Метрики оцінки долі релевантних товарів серед запропонованих у топ-K списку." },
              { id: "rec_8_metrics_2", title: "10.8.2 MAP & NDCG", text: "Розрахунок точності ранжування з урахуванням позиції рекомендації (NDCG штрафує за помилки вгорі)." },
              { id: "rec_8_metrics_3", title: "10.8.3 Diversity & Novelty", text: "Метрики оцінки різноманітності рекомендацій та долі пропонування невідомих новинок." }
            ]
          },
          {
            id: "rec_9_search",
            title: "10.9 Пошукові системи (Search)",
            text: "Основи текстового пошуку, побудова індексів та ранжування BM25.",
            linkUrl: "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html",
            linkLabel: "Elasticsearch Reference",
            substeps: [
              { id: "rec_9_search_1", title: "10.9.1 Інвертований індекс", text: "Концепція швидкого текстового пошуку за словами-ключами (Inverted Index)." },
              { id: "rec_9_search_2", title: "10.9.2 Alg BM25", text: "Формула розрахунку релевантності тексту на основі частоти слова в документі та довжини тексту." },
              { id: "rec_9_search_3", title: "10.9.3 Elasticsearch сервер", text: "Запуск локального Elasticsearch сервера, індексація документів та побудова DSL запитів." }
            ]
          },
          {
            id: "rec_10_hybrid",
            title: "10.10 Гібридний пошук & LLM",
            text: "Поєднання класичного клювого пошуку з нейромережевими моделями.",
            linkUrl: "https://www.sbert.net/",
            linkLabel: "Sentence Transformers Site",
            substeps: [
              { id: "rec_10_hybrid_1", title: "10.10.1 Dense Retrieval", text: "Пошук за сенсом речень (semantic search) за допомогою моделей Sentence Transformers." },
              { id: "rec_10_hybrid_2", title: "10.10.2 Hybrid Search", text: "Об'єднання оцінок BM25 та векторного косинусного пошуку за допомогою Reciprocal Rank Fusion." },
              { id: "rec_10_hybrid_3", title: "10.10.3 Learning to Rank", text: "Збір кліків та зворотного зв'язку користувачів для навчання моделей ранжування (LTR)." }
            ]
          }
        ]
      },
      {
        id: "mlops_prod",
        title: "12. MLOps, Деплой & Хмарні технології",
        text: "Життєвий цикл моделей машинного навчання, пакування в Docker, FastAPI та моніторинг.",
        x: 13500,
        steps: [
          {
            id: "ops_1_intro",
            title: "11.1 Основи MLOps",
            text: "Управління життєвим циклом моделей, зрілість процесів та технічний борг у ML.",
            linkUrl: "https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-in-machine-learning",
            linkLabel: "MLOps by Google Cloud",
            substeps: [
              { id: "ops_1_intro_1", title: "11.1.1 Retrieval & Lifecycle", text: "Етапи: збір даних, експерименти, тренування, тестування, деплой та моніторинг." },
              { id: "ops_1_intro_2", title: "11.1.2 Technical Debt", text: "Прихований технічний борг у системах штучного інтелекту: залежність від даних, спагеті-код." },
              { id: "ops_1_intro_3", title: "11.1.3 Рівні MLOps", text: "Класифікація рівнів автоматизації (MLOps Level 0, 1, 2) від ручного деплою до повного CI/CD." }
            ]
          },
          {
            id: "ops_2_tracking",
            title: "11.2 Логування та Трекінг",
            text: "Інструменти трекінгу експериментів, параметрів та збереження ваг моделей.",
            linkUrl: "https://mlflow.org/docs/latest/index.html",
            linkLabel: "MLflow Documentation",
            substeps: [
              { id: "ops_2_tracking_1", title: "11.2.1 Логування з MLflow", text: "Запис гіперпараметрів, значень втрат та метрик під час тренування моделей у реальному часі." },
              { id: "ops_2_tracking_2", title: "11.2.2 Реєстр моделей", text: "Версіонування моделей (Model Registry), переведення станів моделей (Staging, Production)." },
              { id: "ops_2_tracking_3", title: "11.2.3 Альтернативні сервіси", text: "Огляд хмарної інтерактивної платформи Weights & Biases (W&B) для візуалізації тренувань." }
            ]
          },
          {
            id: "ops_3_dvc",
            title: "11.3 Керування даними (DVC)",
            text: "Контроль версій великих файлів датасетів та ваг моделей без завантаження у Git.",
            linkUrl: "https://dvc.org/doc",
            linkLabel: "DVC Documentation",
            substeps: [
              { id: "ops_3_dvc_1", title: "11.3.1 Синтаксис DVC", text: "Ініціалізація DVC, додавання великих файлів, створення конфігурацій (.dvc)." },
              { id: "ops_3_dvc_2", title: "11.3.2 Пайплайни DVC", text: "Визначення залежностей між кодом та даними за допомогою dvc.yaml сценаріїв." },
              { id: "ops_3_dvc_3", title: "11.3.3 Хмарний remote", text: "Налаштування хмарного бакету AWS S3 / Google Cloud Storage для зберігання даних DVC." }
            ]
          },
          {
            id: "ops_4_docker",
            title: "11.4 Контейнеризація (Docker)",
            text: "Пакування коду моделей та системного середовища для стабільного запуску на серверах.",
            linkUrl: "https://docs.docker.com/reference/",
            linkLabel: "Docker Reference Guide",
            substeps: [
              { id: "ops_4_docker_1", title: "11.4.1 Dockerfile для ML", text: "Написання інструкцій збірки, встановлення pip вимог та оптимізація ваги образу." },
              { id: "ops_4_docker_2", title: "11.4.2 GPU Docker", text: "Використання офіційних образів з підтримкою CUDA від NVIDIA для GPU обчислень." },
              { id: "ops_4_docker_3", title: "11.4.3 Compose сценарії", text: "Спільний локальний запуск Docker контейнерів API моделі, бази даних та реєстру." }
            ]
          },
          {
            id: "ops_5_api",
            title: "11.5 Створення API (FastAPI)",
            text: "Створення веб-сервісів для прийому вхідних ознак та повернення передбачень.",
            linkUrl: "https://fastapi.tiangolo.com/tutorial/",
            linkLabel: "FastAPI Tutorial",
            substeps: [
              { id: "ops_5_api_1", title: "11.5.1 Створення FastAPI", text: "Асинхронні ендпоінти, використання Pydantic для суворої валідації вхідних JSON." },
              { id: "ops_5_api_2", title: "11.5.2 Завантаження моделей", text: "Завантаження ваг моделей (.pkl / .onnx) в оперативну пам'ять один раз при старті сервісу." },
              { id: "ops_5_api_3", title: "11.5.3 Unit тести API", text: "Написання тестів на Python з бібліотекою pytest для перевірки статус-кодів та відповідей." }
            ]
          },
          {
            id: "ops_6_deploy",
            title: "11.6 Деплоймент моделей",
            text: "Методології розгортання передбачень у промислових системах.",
            linkUrl: "https://onnxruntime.ai/docs/",
            linkLabel: "ONNX Runtime Documentation",
            substeps: [
              { id: "ops_6_deploy_1", title: "11.6.1 Batch Inference", text: "Періодичний розрахунок передбачень за розкладом для всієї бази клієнтів (через Airflow)." },
              { id: "ops_6_deploy_2", title: "11.6.2 Real-time API", text: "Миттєве передбачення за запитом користувача з мінімальною затримкою (FastAPI)." },
              { id: "ops_6_deploy_3", title: "11.6.3 Edge deployment", text: "Компіляція моделей під пристрої користувачів (ONNX Runtime, CoreML, TensorFlow Lite)." }
            ]
          },
          {
            id: "ops_7_cloud",
            title: "11.7 Хмарна інфраструктура",
            text: "Використання хмарних платформ для спрощення розробки та масштабування моделей.",
            linkUrl: "https://aws.amazon.com/sagemaker/",
            linkLabel: "AWS SageMaker Guide",
            substeps: [
              { id: "ops_7_cloud_1", title: "11.7.1 AWS SageMaker", text: "Хмарне тренування моделей, реєстр моделей та серверлес деплоймент від Amazon." },
              { id: "ops_7_cloud_2", title: "11.7.2 GCP Vertex AI", text: "Аналогічні хмарні інструменти від Google для керування повним життєвим циклом ML." },
              { id: "ops_7_cloud_3", title: "11.7.3 Azure Machine Learning", text: "Хмарна платформа Microsoft Azure для швидкої інтеграції та побудови конвеєрів." }
            ]
          },
          {
            id: "ops_8_cicd",
            title: "11.8 CI/CD для ML",
            text: "Автоматизація тестування коду, збірки образів та деплою моделей.",
            linkUrl: "https://github.com/actions",
            linkLabel: "GitHub Actions Platform",
            substeps: [
              { id: "ops_8_cicd_1", title: "11.8.1 Автоматичні тести", text: "Запуск лінтерів, перевірки типів та pytest юніт-тестів при кожному коміті на GitHub." },
              { id: "ops_8_cicd_2", title: "11.8.2 Docker Registry", text: "Автоматична збірка Docker образу та пуш у реєстр (Docker Hub / AWS ECR)." },
              { id: "ops_8_cicd_3", title: "11.8.3 GitOps концепція", text: "Автоматичний деплой нової версії моделі при зміні конфігураційного файлу в Git." }
            ]
          },
          {
            id: "ops_9_monitoring",
            title: "11.9 Моніторинг моделей",
            text: "Аналіз стабільності передбачень моделей після запуску в реальний світ.",
            linkUrl: "https://evidentlyai.com/docs",
            linkLabel: "Evidently AI Monitoring",
            substeps: [
              { id: "ops_9_monitoring_1", title: "11.9.1 Data Drift", text: "Виявлення зсуву розподілу вхідних ознак з часом за допомогою розрахунку PSI." },
              { id: "ops_9_monitoring_2", title: "11.9.2 Concept Drift", text: "Виявлення зміни зв'язку між ознаками та реальними значеннями у часі." },
              { id: "ops_9_monitoring_3", title: "11.9.3 Логування передбачень", text: "Постійне логування вхідних запитів та передбачень сервісу в бази даних для аналізу." }
            ]
          },
          {
            id: "ops_10_retraining",
            title: "11.10 Додаткове навчання",
            text: "Стратегії автоматичного оновлення моделей на нових даних.",
            linkUrl: "https://towardsdatascience.com/machine-learning-deployment-strategies-shadow-vs-canary-b952f4477de",
            linkLabel: "ML Deployment Strategies",
            substeps: [
              { id: "ops_10_retraining_1", title: "11.10.1 Тригери оновлення", text: "Запуск перенавчання моделей за розкладом чи при фіксації критичного Data Drift." },
              { id: "ops_10_retraining_2", title: "11.10.2 Шаблони оновлення", text: "Оцінка перенавчання з нуля на новому вікні даних проти донавчання існуючих ваг." },
              { id: "ops_10_retraining_3", title: "11.10.3 Shadow & Canary", text: "Стратегії розгортання моделей: тіньовий запуск (shadow) та порційне тестування трафіку (canary)." }
            ]
          }
        ]
      }
    ];

    const nodes: any[] = [];
    const edges: any[] = [];

    // Center root node horizontally above the first row (at x = 1200, y = 50)
    nodes.push({
      id: "root",
      x: 1200,
      y: 50,
      type: "text",
      title: "Data Science & Analytics Master Roadmap",
      text: "Максимальна навчальна програма для повного опанування Data Science та аналітики даних з нуля.",
      linkUrl: "https://roadmap.sh/data-analyst",
      linkLabel: "Ресурс roadmap.sh"
    });

    tracks.forEach((track, trackIdx) => {
      // Calculate coordinates dynamically in a 3-column grid
      const col = trackIdx % 3;
      const row = Math.floor(trackIdx / 3);
      track.x = 600 + col * 1600;
      track.y = 200 + row * 5500;

      // Renumber track title dynamically (e.g. "3. Google Sheets...")
      const trackNumber = trackIdx + 1;
      const trackTitleWithoutNumber = track.title.replace(/^[\d\.]+\s*/, '');
      const dynamicTrackTitle = `${trackNumber}. ${trackTitleWithoutNumber}`;

      // Add main track parent node
      nodes.push({
        id: track.id,
        x: track.x,
        y: track.y,
        type: "text",
        title: dynamicTrackTitle,
        text: track.text
      });
      
      // Connect to root if first track, otherwise connect track headers sequentially
      if (trackIdx === 0) {
        edges.push({ from: "root", to: track.id });
      } else {
        edges.push({ from: tracks[trackIdx - 1].id, to: track.id });
      }
      
      // Iterate track steps
      track.steps.forEach((step, idx) => {
        const stepY = (track.y || 200) + 200 + idx * 450;
        const stepNumber = idx + 1;
        const stepTitleWithoutNumber = step.title.replace(/^[\d\.]+\s*/, '');
        const dynamicStepTitle = `${trackNumber}.${stepNumber} ${stepTitleWithoutNumber}`;

        nodes.push({
          id: step.id,
          x: track.x,
          y: stepY,
          type: "text",
          title: dynamicStepTitle,
          text: step.text,
          linkUrl: step.linkUrl,
          linkLabel: step.linkLabel
        });
        
        // Connect to parent step
        if (idx === 0) {
          edges.push({ from: track.id, to: step.id });
        } else {
          edges.push({ from: track.steps[idx - 1].id, to: step.id });
        }
        
        // Dynamically add a 4th substep if it only has 3
        const substeps = [...step.substeps];
        if (substeps.length === 3) {
          const subId = `${step.id}_4`;
          const subTitle = `Практичний кейс та тестування`;
          const subText = `Аналіз реального бізнес-сценарію, вирішення практичних задач та перевірка знань з теми.`;
          substeps.push({ id: subId, title: subTitle, text: subText });
        }

        // Iterate substeps
        substeps.forEach((sub, subIdx) => {
          const subNumber = subIdx + 1;
          const subTitleWithoutNumber = sub.title.replace(/^[\d\.]+\s*/, '');
          const dynamicSubTitle = `${trackNumber}.${stepNumber}.${subNumber} ${subTitleWithoutNumber}`;

          // Layout substeps horizontally and symmetrically below the main step
          let subX = track.x;
          if (subIdx === 0) subX = track.x - 480;
          else if (subIdx === 1) subX = track.x - 160;
          else if (subIdx === 2) subX = track.x + 160;
          else if (subIdx === 3) subX = track.x + 480;
          const subY = stepY + 220;
          
          nodes.push({
            id: sub.id,
            x: subX,
            y: subY,
            type: "text",
            title: dynamicSubTitle,
            text: sub.text
          });
          
          // Connect substep to the main step
          edges.push({ from: step.id, to: sub.id });
        });
      });
    });

    createRoadmap(adminUserId, {
      title: "Data Science & Data Analytics",
      description: "Комплексна навчальна програма для опанування Data Science та аналітики даних з нуля.",
      canvas_data: JSON.stringify({ nodes, edges }),
    });
  }
}

function mapTask(row: Row): TaskRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  return {
    id,
    title: textValue(row.title),
    description: textValue(row.description),
    type: enumValue(row.type, taskTypes, 'task'),
    status: enumValue(row.status, statuses, 'todo'),
    priority: enumValue(row.priority, priorities, 'medium'),
    startAt: nullableText(row.startAt),
    endAt: nullableText(row.endAt),
    dueDate: nullableText(row.dueDate),
    color: textValue(row.color) || '#FF4FA3',
    tags: getTags('task', id),
    attachments: listAttachments(ownerId, 'task', id),
    projectId: row.projectId !== null && row.projectId !== undefined ? numberValue(row.projectId) : null,
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

function mapSnippet(row: Row): SnippetRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  return {
    id,
    title: textValue(row.title),
    language: textValue(row.language) || 'typescript',
    code: textValue(row.code),
    explanation: textValue(row.explanation),
    tags: getTags('snippet', id),
    attachments: listAttachments(ownerId, 'snippet', id),
    projectId: row.projectId !== null && row.projectId !== undefined ? numberValue(row.projectId) : null,
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

function mapAttachment(row: Row): AttachmentRecord {
  const rawType = textValue(row.entityType)
  const entityType: EntityType =
    rawType === 'snippet'
      ? 'snippet'
      : rawType === 'goal'
        ? 'goal'
        : rawType === 'diary'
          ? 'diary'
          : rawType === 'project'
            ? 'project'
            : rawType === 'mindmap'
              ? 'mindmap'
              : rawType === 'roadmap'
                ? 'roadmap'
                : 'task'
  return {
    id: numberValue(row.id),
    originalName: textValue(row.originalName),
    storedName: textValue(row.storedName),
    mimeType: textValue(row.mimeType),
    size: numberValue(row.size),
    entityType,
    entityId: numberValue(row.entityId),
    createdAt: textValue(row.createdAt),
  }
}

function getTags(entityType: EntityType, entityId: number) {
  const table = entityType === 'task' ? 'task_tags' : 'snippet_tags'
  const idColumn = entityType === 'task' ? 'taskId' : 'snippetId'
  return all<string>(
    `SELECT tags.name FROM tags
      JOIN ${table} ON ${table}.tagId = tags.id
      WHERE ${table}.${idColumn} = ?
      ORDER BY tags.name ASC`,
    [entityId],
    (row) => textValue(row.name),
  )
}

function replaceTags(entityType: EntityType, entityId: number, tags: string[]) {
  const table = entityType === 'task' ? 'task_tags' : 'snippet_tags'
  const idColumn = entityType === 'task' ? 'taskId' : 'snippetId'
  run(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [entityId])

  for (const tag of tags) {
    run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [tag])
    const tagRecord = one<{ id: number }>(
      'SELECT id FROM tags WHERE name = ?',
      [tag],
      (row) => ({ id: numberValue(row.id) }),
    )
    if (tagRecord) {
      run(`INSERT OR IGNORE INTO ${table} (${idColumn}, tagId) VALUES (?, ?)`, [
        entityId,
        tagRecord.id,
      ])
    }
  }
}

function deleteEntityAttachments(userId: number, entityType: EntityType, entityId: number) {
  run('DELETE FROM attachments WHERE ownerId = ? AND entityType = ? AND entityId = ?', [
    userId,
    entityType,
    entityId,
  ])
}

function taskTouchesRange(task: TaskRecord, from: string | null | undefined, to: string | null | undefined) {
  const dates = [task.startAt?.slice(0, 10), task.endAt?.slice(0, 10), task.dueDate].filter(
    Boolean,
  ) as string[]
  if (dates.length === 0) {
    return true
  }
  return dates.some((date) => {
    if (from && date < from) {
      return false
    }
    if (to && date > to) {
      return false
    }
    return true
  })
}

function run(statement: string, params?: BindParams) {
  ensureDb().run(statement, params)
}

function all<T>(statement: string, params: BindParams, mapper: (row: Row) => T) {
  const prepared = ensureDb().prepare(statement)
  const output: T[] = []
  try {
    prepared.bind(params)
    while (prepared.step()) {
      output.push(mapper(prepared.getAsObject() as Row))
    }
  } finally {
    prepared.free()
  }
  return output
}

function one<T>(statement: string, params: BindParams, mapper: (row: Row) => T) {
  return all(statement, params, mapper)[0] ?? null
}

function lastInsertId() {
  const row = one<{ id: number }>('SELECT last_insert_rowid() as id', [], (item) => ({
    id: numberValue(item.id),
  }))
  return row?.id ?? 0
}

function persist() {
  const data = ensureDb().export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

function ensureDb() {
  if (!db) {
    throw new Error('Database has not been initialized')
  }
  return db
}

function asObject(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function requiredText(value: unknown, message: string) {
  const normalized = optionalText(value)
  if (!normalized) {
    throw new Error(message)
  }
  return normalized
}

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalDateText(value: unknown) {
  const normalized = optionalText(value)
  return normalized || null
}

function nullableText(value: SqlValue) {
  return typeof value === 'string' && value.trim() ? value : null
}

function textValue(value: SqlValue) {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, fallback: T) {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback
}

function normalizeTags(value: unknown) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const tags: string[] = []
  const seen = new Set<string>()

  for (const item of raw) {
    const tag = typeof item === 'string' ? item.trim() : ''
    const key = tag.toLowerCase()
    if (tag && !seen.has(key)) {
      tags.push(tag)
      seen.add(key)
    }
  }

  return tags.slice(0, 12)
}

export function getBalance(userId: number): number {
  run('INSERT OR IGNORE INTO user_balances (userId, amount) VALUES (?, 0.0)', [userId])
  const row = one<{ amount: number }>('SELECT amount FROM user_balances WHERE userId = ?', [userId], (r) => ({
    amount: numberValue(r.amount),
  }))
  return row?.amount ?? 0
}

export function updateBalance(userId: number, amount: number) {
  run('INSERT OR IGNORE INTO user_balances (userId, amount) VALUES (?, 0.0)', [userId])
  run('UPDATE user_balances SET amount = ? WHERE userId = ?', [amount, userId])
  persist()
  return { amount }
}

export function listGoals(userId: number) {
  return all<FinanceGoalRecord>(
    'SELECT * FROM finance_goals WHERE ownerId = ? ORDER BY createdAt DESC',
    [userId],
    mapGoal
  )
}

export function getGoal(userId: number, id: number) {
  return one<FinanceGoalRecord>('SELECT * FROM finance_goals WHERE id = ? AND ownerId = ?', [id, userId], mapGoal)
}

export function createGoal(userId: number, input: FinanceGoalInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO finance_goals (ownerId, title, description, target_amount, saved_amount, target_date, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.title,
      input.description,
      input.target_amount,
      input.saved_amount,
      input.target_date,
      now,
      now,
    ]
  )
  const id = lastInsertId()
  persist()
  return getGoal(userId, id)
}

export function updateGoal(userId: number, id: number, input: FinanceGoalInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE finance_goals
     SET title = ?, description = ?, target_amount = ?, saved_amount = ?, target_date = ?, updatedAt = ?
     WHERE id = ? AND ownerId = ?`,
    [
      input.title,
      input.description,
      input.target_amount,
      input.saved_amount,
      input.target_date,
      now,
      id,
      userId,
    ]
  )
  persist()
  return getGoal(userId, id)
}

export function deleteGoal(userId: number, id: number) {
  deleteEntityAttachments(userId, 'goal', id)
  run('DELETE FROM finance_goals WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

export function listDiaryEntries(userId: number) {
  return all<DiaryEntryRecord>(
    'SELECT * FROM diary_entries WHERE ownerId = ? ORDER BY date DESC, createdAt DESC',
    [userId],
    mapDiaryEntry
  )
}

export function getDiaryEntry(userId: number, id: number) {
  return one<DiaryEntryRecord>('SELECT * FROM diary_entries WHERE id = ? AND ownerId = ?', [id, userId], mapDiaryEntry)
}

export function createDiaryEntry(userId: number, input: DiaryEntryInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO diary_entries (ownerId, title, content, date, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, input.title, input.content, input.date, now, now]
  )
  const id = lastInsertId()
  persist()
  return getDiaryEntry(userId, id)
}

export function updateDiaryEntry(userId: number, id: number, input: DiaryEntryInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE diary_entries
     SET title = ?, content = ?, date = ?, updatedAt = ?
     WHERE id = ? AND ownerId = ?`,
    [input.title, input.content, input.date, now, id, userId]
  )
  persist()
  return getDiaryEntry(userId, id)
}

export function deleteDiaryEntry(userId: number, id: number) {
  deleteEntityAttachments(userId, 'diary', id)
  run('DELETE FROM diary_entries WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

function mapGoal(row: Row): FinanceGoalRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  return {
    id,
    title: textValue(row.title),
    description: textValue(row.description),
    target_amount: numberValue(row.target_amount),
    saved_amount: numberValue(row.saved_amount),
    target_date: nullableText(row.target_date),
    attachments: listAttachments(ownerId, 'goal', id),
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

function mapDiaryEntry(row: Row): DiaryEntryRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  return {
    id,
    title: textValue(row.title),
    content: textValue(row.content),
    date: textValue(row.date),
    attachments: listAttachments(ownerId, 'diary', id),
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

export function normalizeGoalInput(body: unknown): FinanceGoalInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Goal title is required'),
    description: optionalText(object.description),
    target_amount: numberValue(object.target_amount),
    saved_amount: numberValue(object.saved_amount),
    target_date: optionalDateText(object.target_date),
  }
}

export function normalizeDiaryInput(body: unknown): DiaryEntryInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Diary entry title is required'),
    content: optionalText(object.content),
    date: requiredText(object.date, 'Diary date is required'),
  }
}

export function listSubscriptions(userId: number) {
  return all<SubscriptionRecord>(
    'SELECT * FROM subscriptions WHERE ownerId = ? ORDER BY next_payment_date ASC, title ASC',
    [userId],
    mapSubscription
  )
}

export function getSubscription(userId: number, id: number) {
  return one<SubscriptionRecord>('SELECT * FROM subscriptions WHERE id = ? AND ownerId = ?', [id, userId], mapSubscription)
}

export function createSubscription(userId: number, input: SubscriptionInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO subscriptions (ownerId, title, amount, period, next_payment_date, category, color, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.title,
      input.amount,
      input.period,
      input.next_payment_date,
      input.category,
      input.color,
      now,
      now,
    ]
  )
  const id = lastInsertId()
  persist()
  return getSubscription(userId, id)
}

export function updateSubscription(userId: number, id: number, input: SubscriptionInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE subscriptions
     SET title = ?, amount = ?, period = ?, next_payment_date = ?, category = ?, color = ?, updatedAt = ?
     WHERE id = ? AND ownerId = ?`,
    [
      input.title,
      input.amount,
      input.period,
      input.next_payment_date,
      input.category,
      input.color,
      now,
      id,
      userId,
    ]
  )
  persist()
  return getSubscription(userId, id)
}

export function deleteSubscription(userId: number, id: number) {
  run('DELETE FROM subscriptions WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

function mapSubscription(row: Row): SubscriptionRecord {
  const id = numberValue(row.id)
  const rawPeriod = textValue(row.period)
  const period: 'monthly' | 'weekly' = rawPeriod === 'weekly' ? 'weekly' : 'monthly'
  return {
    id,
    title: textValue(row.title),
    amount: numberValue(row.amount),
    period,
    next_payment_date: textValue(row.next_payment_date),
    category: textValue(row.category),
    color: textValue(row.color) || '#a855f7',
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

export function normalizeSubscriptionInput(body: unknown): SubscriptionInput {
  const object = asObject(body)
  const rawPeriod = optionalText(object.period)
  const period: 'monthly' | 'weekly' = rawPeriod === 'weekly' ? 'weekly' : 'monthly'
  return {
    title: requiredText(object.title, 'Subscription title is required'),
    amount: numberValue(object.amount),
    period,
    next_payment_date: requiredText(object.next_payment_date, 'Next payment date is required'),
    category: optionalText(object.category) || 'Загальні',
    color: optionalText(object.color) || '#a855f7',
  }
}

export function listProjects(userId: number) {
  return all<ProjectRecord>('SELECT * FROM projects WHERE ownerId = ? ORDER BY title ASC', [userId], mapProject)
}

export function getProject(userId: number, id: number) {
  return one<ProjectRecord>('SELECT * FROM projects WHERE id = ? AND ownerId = ?', [id, userId], mapProject)
}

export function createProject(userId: number, input: ProjectInput) {
  const now = new Date().toISOString()
  run(
    `INSERT INTO projects (ownerId, title, description, repo_url, prod_url, tech_stack, links, canvas_data, is_completed, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.title,
      input.description,
      input.repo_url,
      input.prod_url,
      JSON.stringify(input.tech_stack),
      JSON.stringify(input.links),
      input.canvas_data || '{}',
      input.is_completed ? 1 : 0,
      now,
      now,
    ],
  )
  const id = lastInsertId()
  persist()
  return getProject(userId, id)
}

export function updateProject(userId: number, id: number, input: ProjectInput) {
  const now = new Date().toISOString()
  run(
    `UPDATE projects
      SET title = ?, description = ?, repo_url = ?, prod_url = ?, tech_stack = ?, links = ?, canvas_data = ?, is_completed = ?, updatedAt = ?
      WHERE id = ? AND ownerId = ?`,
    [
      input.title,
      input.description,
      input.repo_url,
      input.prod_url,
      JSON.stringify(input.tech_stack),
      JSON.stringify(input.links),
      input.canvas_data || '{}',
      input.is_completed ? 1 : 0,
      now,
      id,
      userId,
    ],
  )
  persist()
  return getProject(userId, id)
}

export function deleteProject(userId: number, id: number) {
  deleteEntityAttachments(userId, 'project', id)
  run('UPDATE tasks SET projectId = NULL WHERE projectId = ? AND ownerId = ?', [id, userId])
  run('UPDATE snippets SET projectId = NULL WHERE projectId = ? AND ownerId = ?', [id, userId])
  run('DELETE FROM projects WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

function mapProject(row: Row): ProjectRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  let tech_stack: string[] = []
  try {
    const rawStack = textValue(row.tech_stack)
    if (rawStack.startsWith('[')) {
      tech_stack = JSON.parse(rawStack)
    } else if (rawStack) {
      tech_stack = rawStack.split(',').map((s) => s.trim()).filter(Boolean)
    }
  } catch (e) {
    // Ignore
  }

  let links: { name: string; url: string }[] = []
  try {
    const rawLinks = textValue(row.links)
    if (rawLinks.startsWith('[')) {
      links = JSON.parse(rawLinks)
    }
  } catch (e) {
    // Ignore
  }

  return {
    id,
    title: textValue(row.title),
    description: textValue(row.description),
    repo_url: textValue(row.repo_url),
    prod_url: textValue(row.prod_url),
    tech_stack,
    links,
    canvas_data: textValue(row.canvas_data) || '{}',
    is_completed: row.is_completed !== null && row.is_completed !== undefined ? Boolean(numberValue(row.is_completed)) : false,
    attachments: listAttachments(ownerId, 'project', id),
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

export function normalizeProjectInput(body: unknown): ProjectInput {
  const object = asObject(body)
  
  let tech_stack: string[] = []
  if (Array.isArray(object.tech_stack)) {
    tech_stack = object.tech_stack.map((item) => String(item).trim()).filter(Boolean)
  } else if (typeof object.tech_stack === 'string') {
    tech_stack = object.tech_stack.split(',').map((s) => s.trim()).filter(Boolean)
  }

  let links: { name: string; url: string }[] = []
  if (Array.isArray(object.links)) {
    links = object.links
      .map((item) => {
        const o = asObject(item)
        return {
          name: optionalText(o.name),
          url: optionalText(o.url),
        }
      })
      .filter((l) => l.name && l.url)
  }

  return {
    title: requiredText(object.title, 'Project title is required'),
    description: optionalText(object.description),
    repo_url: optionalText(object.repo_url),
    prod_url: optionalText(object.prod_url),
    tech_stack,
    links,
    canvas_data: typeof object.canvas_data === 'string' ? object.canvas_data.trim() : '{}',
    is_completed: object.is_completed !== undefined ? Boolean(object.is_completed) : false,
  }
}

export function listHabits(userId: number) {
  const habits = all<{ id: number; title: string; color: string; createdAt: string; updatedAt: string }>(
    'SELECT * FROM habits WHERE ownerId = ? ORDER BY title ASC',
    [userId],
    (row) => ({
      id: numberValue(row.id),
      title: textValue(row.title),
      color: textValue(row.color) || '#a855f7',
      createdAt: textValue(row.createdAt),
      updatedAt: textValue(row.updatedAt),
    })
  )

  return habits.map((h) => {
    const history = all<string>(
      'SELECT date FROM habit_logs WHERE habitId = ? ORDER BY date DESC',
      [h.id],
      (row) => textValue(row.date)
    )
    return {
      ...h,
      history,
    }
  })
}

export function createHabit(userId: number, input: HabitInput) {
  const now = new Date().toISOString()
  run(
    'INSERT INTO habits (ownerId, title, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [userId, input.title, input.color, now, now]
  )
  const id = lastInsertId()
  persist()
  return {
    id,
    title: input.title,
    color: input.color,
    createdAt: now,
    updatedAt: now,
    history: [],
  }
}

export function deleteHabit(userId: number, id: number) {
  run('DELETE FROM habit_logs WHERE habitId IN (SELECT id FROM habits WHERE id = ? AND ownerId = ?)', [id, userId])
  run('DELETE FROM habits WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

export function toggleHabitLog(userId: number, habitId: number, date: string, completed: boolean) {
  const habit = one<{ id: number }>(
    'SELECT id FROM habits WHERE id = ? AND ownerId = ?',
    [habitId, userId],
    (row) => ({ id: numberValue(row.id) }),
  )
  if (!habit) {
    throw new Error('Habit not found')
  }
  if (completed) {
    run('INSERT OR IGNORE INTO habit_logs (habitId, date) VALUES (?, ?)', [habitId, date])
  } else {
    run('DELETE FROM habit_logs WHERE habitId = ? AND date = ?', [habitId, date])
  }
  persist()
  return { habitId, date, completed }
}

export function normalizeHabitInput(body: unknown): HabitInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Habit title is required'),
    color: optionalText(object.color) || '#a855f7',
  }
}

export function listMindMaps(userId: number) {
  return all<MindMapRecord>('SELECT * FROM mindmaps WHERE ownerId = ? ORDER BY title ASC', [userId], mapMindMap)
}

export function getMindMap(userId: number, id: number) {
  return one<MindMapRecord>('SELECT * FROM mindmaps WHERE id = ? AND ownerId = ?', [id, userId], mapMindMap)
}

export function createMindMap(userId: number, input: MindMapInput) {
  const now = new Date().toISOString()
  run(
    'INSERT INTO mindmaps (ownerId, title, nodes_data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [userId, input.title, input.nodes_data || '[]', now, now]
  )
  const id = lastInsertId()
  persist()
  return getMindMap(userId, id)
}

export function updateMindMap(userId: number, id: number, input: MindMapInput) {
  const now = new Date().toISOString()
  run(
    'UPDATE mindmaps SET title = ?, nodes_data = ?, updatedAt = ? WHERE id = ? AND ownerId = ?',
    [input.title, input.nodes_data, now, id, userId]
  )
  persist()
  return getMindMap(userId, id)
}

export function deleteMindMap(userId: number, id: number) {
  deleteEntityAttachments(userId, 'mindmap', id)
  run('DELETE FROM mindmaps WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

function mapMindMap(row: Row): MindMapRecord {
  const id = numberValue(row.id)
  const ownerId = numberValue(row.ownerId)
  return {
    id,
    title: textValue(row.title),
    nodes_data: textValue(row.nodes_data) || '[]',
    attachments: listAttachments(ownerId, 'mindmap', id),
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

export function normalizeMindMapInput(body: unknown): MindMapInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'MindMap title is required'),
    nodes_data: typeof object.nodes_data === 'string' ? object.nodes_data.trim() : '[]',
  }
}

export function listRoadmaps(userId: number) {
  return all<RoadmapRecord>('SELECT * FROM roadmaps WHERE ownerId = ? ORDER BY title ASC', [userId], mapRoadmap)
}

export function getRoadmap(userId: number, id: number) {
  return one<RoadmapRecord>('SELECT * FROM roadmaps WHERE id = ? AND ownerId = ?', [id, userId], mapRoadmap)
}

export function createRoadmap(userId: number, input: RoadmapInput) {
  const now = new Date().toISOString()
  run(
    'INSERT INTO roadmaps (ownerId, title, description, canvas_data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, input.title, input.description, input.canvas_data || '{}', now, now]
  )
  const id = lastInsertId()
  persist()
  return getRoadmap(userId, id)
}

export function updateRoadmap(userId: number, id: number, input: RoadmapInput) {
  const now = new Date().toISOString()
  run(
    'UPDATE roadmaps SET title = ?, description = ?, canvas_data = ?, updatedAt = ? WHERE id = ? AND ownerId = ?',
    [input.title, input.description, input.canvas_data || '{}', now, id, userId]
  )
  persist()
  return getRoadmap(userId, id)
}

export function deleteRoadmap(userId: number, id: number) {
  run('DELETE FROM roadmaps WHERE id = ? AND ownerId = ?', [id, userId])
  persist()
}

function mapRoadmap(row: Row): RoadmapRecord {
  return {
    id: numberValue(row.id),
    title: textValue(row.title),
    description: textValue(row.description),
    canvas_data: textValue(row.canvas_data) || '{}',
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

export function normalizeRoadmapInput(body: unknown): RoadmapInput {
  const object = asObject(body)
  return {
    title: requiredText(object.title, 'Roadmap title is required'),
    description: optionalText(object.description),
    canvas_data: typeof object.canvas_data === 'string' ? object.canvas_data.trim() : '{}',
  }
}

export function addColumnIfMissing(table: string, column: string, type: string) {
  try {
    run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`)
  } catch (e) {
    // Ignore error
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function validatePassword(password: string) {
  if (password.length < 6) throw new Error('Password too short')
  return password
}

function findUserByEmail(email: string) {
  return one<UserRecord>('SELECT * FROM users WHERE email = ?', [email], mapUser)
}

function findStoredUserByEmail(email: string) {
  return one<StoredUserRecord>('SELECT * FROM users WHERE email = ?', [email], (row) => ({
    ...mapUser(row),
    passwordHash: String(row.passwordHash),
    passwordSalt: String(row.passwordSalt),
  }))
}

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 64).toString('hex')
}

function verifyPassword(password: string, salt: string, hash: string) {
  return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(password, salt, 64))
}

function getUserById(id: number) {
  return one<UserRecord>('SELECT * FROM users WHERE id = ?', [id], mapUser)
}

function createSession(user: UserRecord): AuthResult {
  const token = randomBytes(32).toString('hex')
  run('INSERT INTO auth_sessions (token, userId) VALUES (?, ?)', [token, user.id])
  persist()
  return { user, token }
}

function mapUser(row: Row): UserRecord {
  return {
    id: numberValue(row.id),
    name: textValue(row.name),
    email: textValue(row.email),
    role: enumValue(row.role, new Set<UserRole>(['admin', 'user']), 'user') as UserRole,
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt),
  }
}

function seedStudyContent() {
  // Mocked for now
}
