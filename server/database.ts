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

  run(`
    CREATE TABLE IF NOT EXISTS study_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      code TEXT NOT NULL DEFAULT '',
      orderIndex INTEGER NOT NULL DEFAULT 0
    );
  `)

  try {
    run(`ALTER TABLE study_modules ADD COLUMN courseId INTEGER;`)
  } catch (e) {
    // Ignore error if column already exists
  }

  run(`
    CREATE TABLE IF NOT EXISTS study_visits (
      userId INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (userId, date)
    );
  `)

  run(`
    
    CREATE TABLE IF NOT EXISTS study_flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      roadmapId INTEGER,
      nodeId TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      mastery INTEGER DEFAULT 0,
      nextReviewDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      roadmapId INTEGER,
      nodeId TEXT,
      question TEXT NOT NULL,
      optionsJson TEXT NOT NULL,
      correctIndex INTEGER NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      date TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      topicsCompleted INTEGER DEFAULT 0,
      cardsReviewed INTEGER DEFAULT 0,
      quizzesPassed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_node_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      nodeId TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_time (
      userId INTEGER NOT NULL,
      weekStart TEXT NOT NULL,
      durationSeconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (userId, weekStart)
    );
  `)
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

export function seedIfEmpty(adminUserId: number) {
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

  // Delete the old single massive roadmap if present
  const oldMasterRoadmap = one<{ id: number }>(
    "SELECT id FROM roadmaps WHERE ownerId = ? AND title = 'Data Science & Data Analytics' LIMIT 1",
    [adminUserId],
    (row) => ({ id: numberValue(row.id) })
  )
  if (oldMasterRoadmap) {
    run('DELETE FROM roadmaps WHERE ownerId = ?', [adminUserId])
  }

  const roadmapCount = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM roadmaps WHERE ownerId = ?',
    [adminUserId],
    (row) => ({ count: numberValue(row.count) }),
  )
  if (!roadmapCount || roadmapCount.count < 20) {
    run('DELETE FROM roadmaps WHERE ownerId = ?', [adminUserId])
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

        const mathSuperSpecificSubsteps = {
  "1": [
    {
      "title": "Середні тенденції",
      "desc": "Середнє арифметичне, виважене середнє, геометричне та гармонійне середнє."
    },
    {
      "title": "Позиційні метрики",
      "desc": "Медіана, мода, квартилі (Q1, Q2, Q3), перцентилі та децилі."
    },
    {
      "title": "Метрики розсіювання",
      "desc": "Варіація, дисперсія (S²), стандартне відхилення (σ) та розмах (Range)."
    },
    {
      "title": "IQR та виявлення викидів",
      "desc": "Інтерквартильний розмах (IQR), виявлення викидів за правилом 3-х сигм та правилом Тьюкі (1.5 × IQR)."
    },
    {
      "title": "Форма розподілу",
      "desc": "Коефіцієнт асиметрії (Skewness) та ексцес (Kurtosis)."
    },
    {
      "title": "Графічний аналіз",
      "desc": "Побудова й читання Boxplot (ящик з вусами), гістограм та кумулятивних полігонів (Огіва)."
    },
    {
      "title": "Ручні розрахунки",
      "desc": "Покрокові ручні обчислення метрик розсіювання для згрупованих та незгрупованих вибірок."
    },
    {
      "title": "Аналітичний кейс",
      "desc": "Прикладний аналітичний розбір кейсу: оцінка доходів населення без викривлення середнім значенням."
    }
  ],
  "2": [
    {
      "title": "Простір подій",
      "desc": "Простір елементарних подій (Ω), дискретні та неперервні події, сумісні й несумісні події."
    },
    {
      "title": "Визначення ймовірності",
      "desc": "Класичне, статистичне та геометричне визначення ймовірності."
    },
    {
      "title": "Аксіоми Колмогорова",
      "desc": "Аксиоматика Колмогорова та фундаментальні властивості ймовірності."
    },
    {
      "title": "Правила додавання",
      "desc": "Правила додавання ймовірностей для залежних і незалежних подій."
    },
    {
      "title": "Умовна ймовірність",
      "desc": "Правило множення ймовірностей та умовна ймовірність P(A|B)."
    },
    {
      "title": "Повна ймовірність",
      "desc": "Формула повної ймовірності та побудова дерева подій."
    },
    {
      "title": "Теорема Байєса",
      "desc": "Формула Байєса: апріорна, апостеріорна ймовірність та правдоподібність (Likelihood)."
    },
    {
      "title": "Класичні парадокси",
      "desc": "Розв'язання ймовірнісних парадоксів: Монті Холла, днів народження та діагностичних тестів."
    }
  ],
  "3": [
    {
      "title": "Випадкові величини",
      "desc": "Випадкові величини (дискретні та неперервні), функція розподілу F(x) та щільність ймовірності f(x)."
    },
    {
      "title": "Дискретні розподіли",
      "desc": "Розподіли: Бернуллі, Біноміальний (n, p), Геометричний та Пуассона (λ)."
    },
    {
      "title": "Неперервні розподіли",
      "desc": "Рівномірний, Експоненціальний (показниковий) та їх математичне сподівання E[X] і дисперсія Var(X)."
    },
    {
      "title": "Нормальний розподіл",
      "desc": "Нормальний (Гауссівський) розподіл N(μ, σ²), функція Лапласа та z-оцінки (z = (x-μ)/σ)."
    },
    {
      "title": "Правило 3-х сигм",
      "desc": "Правило 68-95-99.7 (3 сигми) та робота з таблицями z-розподілу."
    },
    {
      "title": "Спеціальні розподіли",
      "desc": "t-розподіл Стьюдента, Хі-квадрат (χ²) та F-розподіл Фішера."
    },
    {
      "title": "Перетворення величин",
      "desc": "Перетворення випадкових величин та Логнормальний розподіл."
    },
    {
      "title": "Ручний розрахунок",
      "desc": "Практичний розрахунок ймовірностей потрапляння величини в інтервал за допомогою z-таблиць."
    }
  ],
  "4": [
    {
      "title": "Формулювання гіпотез",
      "desc": "Нульова гіпотеза (H₀), альтернативна гіпотеза (H₁) та рівень значущості (α)."
    },
    {
      "title": "Помилки I та II роду",
      "desc": "Помилки I роду (α, хибнопозитивні), помилки II роду (β, хибнонегативні) та потужність тесту (1-β)."
    },
    {
      "title": "P-value та критерії",
      "desc": "Статистичні критерії, критичні області та p-value: інтерпретація та межі застосування."
    },
    {
      "title": "Одновибіркові тести",
      "desc": "Одновибірковий та двовибірковий z-тест і t-тест Стьюдента для незалежних вибірок."
    },
    {
      "title": "Парний t-тест",
      "desc": "Парний t-тест для залежних (зв'язаних) спостережень."
    },
    {
      "title": "Критерій Хі-квадрат",
      "desc": "Критерій Хі-квадрат Пірсона (χ²) на незалежність ознак та відповідність розподілу (Goodness of Fit)."
    },
    {
      "title": "Ефект розміру",
      "desc": "Поняття ефекту розміру (Cohen's d) та розрахунок необхідного обсягу вибірки."
    },
    {
      "title": "Прийняття рішення",
      "desc": "Покроковий ручний алгоритм прийняття чи відхилення H₀ на конкретному експерименті."
    }
  ],
  "5": [
    {
      "title": "Векторні простори",
      "desc": "Поняття вектора в Rⁿ, геометрія векторів, векторні простори та підпростори."
    },
    {
      "title": "Операції з векторами",
      "desc": "Додавання векторів, множення на скаляр та лінійна комбінація векторів."
    },
    {
      "title": "Лінійна незалежність",
      "desc": "Лінійна залежність та лінійна незалежність векторів, колінеарність."
    },
    {
      "title": "Базис та розмірність",
      "desc": "Базис векторного простору, розмірність простору (Dimension) та системи координат."
    },
    {
      "title": "Скалярний добуток",
      "desc": "Скалярний добуток векторів a·b, кут між векторами та проекція вектора."
    },
    {
      "title": "Ортогональність",
      "desc": "Ортогональність векторів, ортонормований базис та процес Грама-Шмідта."
    },
    {
      "title": "Векторні норми",
      "desc": "L₁ норма (Манхеттенська), L₂ норма (Евклідова), L∞ норма та косинусна відстань."
    },
    {
      "title": "Геометричні задачі",
      "desc": "Розв'язання задач на знаходження кутів, відстаней і ортогональних проекцій."
    }
  ],
  "6": [
    {
      "title": "Типи матриць",
      "desc": "Матриці як лінійні оператори, типи матриць (квадратні, симетричні, одиничні, трикутні)."
    },
    {
      "title": "Матричні операції",
      "desc": "Операції над матрицями: транспонування (Aᵀ), додавання, множення матриць та їх властивості."
    },
    {
      "title": "Визначник (Детермінант)",
      "desc": "Визначник матриці det(A), його геометричний зміст як масштабування об'єму."
    },
    {
      "title": "Розклад Лапласа",
      "desc": "Мінори, алгебраїчні доповнення та обчислення детермінанта за допомогою розкладу Лапласа."
    },
    {
      "title": "СЛАР та метод Гаусса",
      "desc": "Системи лінійних алгебраїчних рівнянь (СЛАР), матрична форма Ax=b, метод Гаусса та Крамера."
    },
    {
      "title": "Обернена матриця",
      "desc": "Обернена матриця A⁻¹, умови існування (det(A)≠0), псевдообернена матриця Мура-Пенроуза."
    },
    {
      "title": "Ранг та Ядро",
      "desc": "Ранг матриці rank(A), ядро (Kernel) та образ (Image) лінійного оператора."
    },
    {
      "title": "Власні числа & SVD",
      "desc": "Власні числа (λ) та власні вектори (v), характеристичне рівняння, матричний розклад SVD."
    }
  ],
  "7": [
    {
      "title": "Границя та неперервність",
      "desc": "Поняття границі функції lim f(x), неперервність функції та точка розриву."
    },
    {
      "title": "Означення похідної",
      "desc": "Означення похідної як границі, геометричний зміст (кутовий коефіцієнт дотичної)."
    },
    {
      "title": "Фізичний зміст",
      "desc": "Фізичний зміст похідної (миттєва швидкість), похідні вищих порядків."
    },
    {
      "title": "Правила диференціювання",
      "desc": "Правила диференціювання: сума, добуток, частка та складна функція (Chain Rule)."
    },
    {
      "title": "Табличні похідні",
      "desc": "Таблиця основних похідних (степеневі, показникові, логарифмічні, тригонометричні)."
    },
    {
      "title": "Часткові похідні",
      "desc": "Часткові похідні для функцій багатьох змінних f(x, y), геометричний зміст."
    },
    {
      "title": "Поняття градієнта",
      "desc": "Поняття градієнта ∇f, напрям найшвидшого зростання функції та похідна за напрямком."
    },
    {
      "title": "Ручне диференціювання",
      "desc": "Покрокове диференціювання складних багатовимірних функцій на папері."
    }
  ],
  "8": [
    {
      "title": "Локальні екстремуми",
      "desc": "Екстремуми функції однієї змінної: необхідна (f'(x)=0) та достатня (f''(x)) умови мінімуму/максимуму."
    },
    {
      "title": "Опуклість та перегин",
      "desc": "Критичні точки, опуклість та увігнутість функцій, точки перегину."
    },
    {
      "title": "Опуклі функції",
      "desc": "Опуклі множини та опуклі функції (Convex Functions), унікальність глобального мінімуму."
    },
    {
      "title": "Матриця Гессе",
      "desc": "Матриця Гессе (Hessian Matrix) часткових похідних другого порядку та додатна визначеність."
    },
    {
      "title": "Градієнтний спуск",
      "desc": "Алгоритм градієнтного спуску: аналітична формула кроку x⁽ᵏ⁺¹⁾ = x⁽ᵏ⁾ - η∇f(x⁽ᵏ⁾)."
    },
    {
      "title": "Learning Rate",
      "desc": "Вибір швидкості навчання (Learning Rate η): згасання, вибух градієнта та осциляції."
    },
    {
      "title": "Стохастичний спуск",
      "desc": "Стохастичний градієнтний спуск (SGD) та міні-пакетний (Mini-batch) спуск у математичному розумінні."
    },
    {
      "title": "Ручна оптимізація",
      "desc": "Ручний розрахунок 3-х кроків градієнтного спуску для квадратичної функції втрат (MSE)."
    }
  ],
  "9": [
    {
      "title": "Баєсівська філософія",
      "desc": "Філософія баєсівської статистики проти частотної (Frequentist vs Bayesian approach)."
    },
    {
      "title": "Апріорний розподіл",
      "desc": "Апріорний розподіл (Prior distribution): суб'єктивні та необ'єктивні апріорні дані."
    },
    {
      "title": "Правдоподібність",
      "desc": "Функція правдоподібності (Likelihood Function) та апостеріорний розподіл (Posterior)."
    },
    {
      "title": "Спряжені розподіли",
      "desc": "Спряжені апріорні розподіли (Conjugate Priors): пара Бета-Біноміальний розподіл."
    },
    {
      "title": "Нормальна пара",
      "desc": "Спряжена пара Нормальний-Нормальний розподіли для оцінки середнього."
    },
    {
      "title": "Точкові оцінки MAP",
      "desc": "Точкові оцінки в баєсівській статистиці: Maximum A Posteriori (MAP) та Posterior Mean."
    },
    {
      "title": "Кредибільні інтервали",
      "desc": "Кредибільні інтервали (Credible Intervals) проти частотних довірчих інтервалів."
    },
    {
      "title": "Оновлення ймовірностей",
      "desc": "Ручний аналітичний розрахунок оновлення ймовірностей після отримання нових даних."
    }
  ],
  "10": [
    {
      "title": "Генеральна сукупність",
      "desc": "Генеральна сукупність (Population) та вибірка (Sample), репрезентативність вибірок."
    },
    {
      "title": "Вибіркові статистики",
      "desc": "Вибіркові статистики як випадкові величини: вибіркове середнє X̄ та вибіркова дисперсія S²."
    },
    {
      "title": "ЦГТ (CLT)",
      "desc": "Центральна Гранична Теорема (ЦГТ / CLT): зміст, умовності та значення для суми величин."
    },
    {
      "title": "Стандартна помилка",
      "desc": "Стандартна помилка середнього (Standard Error, SE = σ / √n)."
    },
    {
      "title": "Властивості оцінок",
      "desc": "Точкові оцінки параметрів: незміщеність, ефективність та спроможність оцінок."
    },
    {
      "title": "Довірчі інтервали",
      "desc": "Довірчі інтервали для середнього при відомій та невідомій дисперсії (Z- та t-інтервали)."
    },
    {
      "title": "Інтервали пропорцій",
      "desc": "Довірчі інтервали для пропорції (частки) та для різниці двох середніх."
    },
    {
      "title": "Ручна побудова інтервалів",
      "desc": "Ручна побудова 95% та 99% довірчих інтервалів для експериментальних вибіркових даних."
    }
  ],
  "11": [
    {
      "title": "Типи залежностей",
      "desc": "Залежність між випадковими величинами: функціональна, статистична та кореляційна."
    },
    {
      "title": "Коваріація",
      "desc": "Коваріація Cov(X,Y), геометричний зміст та залежність від одиниць вимірювання."
    },
    {
      "title": "Кореляція Пірсона",
      "desc": "Коефіцієнт кореляції Пірсона (r_xy): формула, властивості, межі (від -1 до +1) та лінійність."
    },
    {
      "title": "Перевірка значущості",
      "desc": "Перевірка значущості коефіцієнта кореляції Пірсона (t-тест для кореляції)."
    },
    {
      "title": "Кореляція Спірмена",
      "desc": "Рангова кореляція Спірмена (ρ): формула, стійкість до викидів та нелінійних монотонів."
    },
    {
      "title": "Кореляція Кендалла",
      "desc": "Рангова кореляція Кендалла (τ): парні узгоджені та неузгоджені значення."
    },
    {
      "title": "Часткова кореляція",
      "desc": "Часткова (Partial) та парціальна кореляція для усунення впливу третіх факторів."
    },
    {
      "title": "Correlation vs Causation",
      "desc": "Ілюзія причинності: різниця між correlation та causation, хибні кореляції."
    }
  ],
  "12": [
    {
      "title": "Концепція ANOVA",
      "desc": "Порівняння середніх декількох груп через аналіз міжгрупової та внутрішньогрупової дисперсій."
    },
    {
      "title": "Суми квадратів",
      "desc": "Загальна сума квадратів (SST), міжгрупова (SSB) та внутрішньогрупова (SSW) суми."
    },
    {
      "title": "Середні квадрати",
      "desc": "Число ступенів свободи (df) та середні квадрати (MSB, MSW)."
    },
    {
      "title": "F-критерій Фішера",
      "desc": "F-статистика Фішера: формула F = MSB / MSW та критичні значення F-розподілу."
    },
    {
      "title": "One-Way ANOVA",
      "desc": "Однофакторний дисперсійний аналіз: припущення нормальності та рівності дисперсій."
    },
    {
      "title": "Перевірка дисперсій",
      "desc": "Перевірка рівності дисперсій: критерій Бартлетта та критерій Левена."
    },
    {
      "title": "Пост-хок аналіз",
      "desc": "Апостеріорні порівняння за допомогою тестів Тьюкі (HSD) та Бонферроні."
    },
    {
      "title": "Two-Way ANOVA",
      "desc": "Двофакторний дисперсійний аналіз (Two-Way ANOVA) та аналіз взаємодії факторів."
    }
  ],
  "13": [
    {
      "title": "Парна регресія",
      "desc": "Рівняння прямої y = β₀ + β₁x + ε, регресійний залишок ε."
    },
    {
      "title": "Метод МНК (OLS)",
      "desc": "Метод найменших квадратів (OLS): математичне виведення оцінок β̂₀ та β̂₁."
    },
    {
      "title": "Коефіцієнт R²",
      "desc": "Коефіцієнт детермінації R²: частка поясненої дисперсії та скоригований R²_adj."
    },
    {
      "title": "Матрична регресія",
      "desc": "Багатовимірна лінійна регресія в матричній формі: β̂ = (XᵀX)⁻¹Xᵀy."
    },
    {
      "title": "Гаусс-Марков",
      "desc": "Теорема Гаусса-Маркова та умови оптимізації МНК (умови регулярності)."
    },
    {
      "title": "Аналіз залишків",
      "desc": "Нормальність розподілу залишків, гомоскедастичність та відсутність автокореляції."
    },
    {
      "title": "Мультиколінеарність",
      "desc": "Коефіцієнт інфляції дисперсії (VIF) та її вплив на стійкість оцінок."
    },
    {
      "title": "Логістична функція",
      "desc": "Сигмоїдна функція σ(z) = 1/(1+e⁻ᶻ), логарифмічна функція втрат (Log-Loss)."
    }
  ],
  "14": [
    {
      "title": "Самоінформація",
      "desc": "Поняття самоінформації події I(x) = -log₂ P(x) та одиниці виміру (біт, нат)."
    },
    {
      "title": "Ентропія Шеннона",
      "desc": "Ентропія H(X) = -∑ P(x) log₂ P(x) як міра невизначеності та хаосу розподілу."
    },
    {
      "title": "Умовна ентропія",
      "desc": "Спільна ентропія H(X, Y) та умовна ентропія H(Y|X)."
    },
    {
      "title": "Взаємна інформація",
      "desc": "Взаємна інформація (Mutual Information, I(X; Y)) для оцінки залежності ознак."
    },
    {
      "title": "Дивергенція KL",
      "desc": "Відстань Кульбака-Лейблера (KL-divergence): формула D_KL(P || Q) та асиметрія."
    },
    {
      "title": "Перехресна ентропія",
      "desc": "Cross-Entropy Loss: математичне формулювання для мультикласового розподілу."
    },
    {
      "title": "Information Gain",
      "desc": "Приріст інформації (Information Gain): зменшення ентропії при розщепленні даних."
    },
    {
      "title": "Ручний розрахунок ентропії",
      "desc": "Ручний розрахунок ентропії та Information Gain для бінарної вибірки."
    }
  ],
  "15": [
    {
      "title": "Випадкові процеси",
      "desc": "Випадкові процеси з дискретним та неперервним часом."
    },
    {
      "title": "Марковська властивість",
      "desc": "Відсутність пам'яті: P(Xₙ₊₁|Xₙ, ..., X₀) = P(Xₙ₊₁|Xₙ)."
    },
    {
      "title": "Ланцюги Маркова",
      "desc": "Однорідні ланцюги Маркова та їх властивості."
    },
    {
      "title": "Матриця переходів",
      "desc": "Матриця перехідних ймовірностей P = (p_ij) та граф станів."
    },
    {
      "title": "Чепмен-Колмогоров",
      "desc": "Рівняння Чепмена-Колмогорова для ймовірностей переходу за n кроків (P⁽ⁿ⁾ = Pⁿ)."
    },
    {
      "title": "Стаціонарний розподіл",
      "desc": "Стаціонарно-рівноважний розподіл ймовірностей π⃗ = π⃗P."
    },
    {
      "title": "Ергодичні ланцюги",
      "desc": "Ергодичні марковські ланцюги, поглинаючі стани та середній час до поглинання."
    },
    {
      "title": "Ручний розрахунок станів",
      "desc": "Ручне обчислення стаціонарного розподілу для системи з 3-х станів."
    }
  ],
  "16": [
    {
      "title": "Помилки обчислень",
      "desc": "Абсолютна та відносна помилка, округлення та нагромадження помилок."
    },
    {
      "title": "Метод бісекції",
      "desc": "Чисельне розв'язування рівнянь f(x)=0: метод ділення навпіл (бісекції)."
    },
    {
      "title": "Метод Ньютона",
      "desc": "Метод Хорд та Метод Ньютона (дотичних) для знаходження коренів рівнянь."
    },
    {
      "title": "Скінченні різниці",
      "desc": "Чисельне диференціювання: правобічні, лівобічні та центральні скінченні різниці."
    },
    {
      "title": "Чисельне інтегрування",
      "desc": "Метод прямокутників, метод трапецій та формула Сімпсона (парабол)."
    },
    {
      "title": "Інтерполяція Лагранжа",
      "desc": "Інтерполяційний багаточлен Лагранжа та сплайни."
    },
    {
      "title": "Ітераційні методи",
      "desc": "Розв'язування СЛАР: метод ітерацій (Якобі) та метод Зейделя."
    },
    {
      "title": "Метод трапецій",
      "desc": "Ручний обчислювальний алгоритм наближеного інтегрування функції методом трапецій."
    }
  ],
  "17": [
    {
      "title": "Структура графів",
      "desc": "Орієнтовані та неорієнтовані графи, зважені графи, вершини та ребра."
    },
    {
      "title": "Представлення графів",
      "desc": "Матриця суміжності (Adjacency Matrix) та матриця інцидентності."
    },
    {
      "title": "Ступінь вершини",
      "desc": "Ступінь вершини (Degree), Лема про рукостискання ∑ deg(v) = 2|E|."
    },
    {
      "title": "Шляхи та зв'язність",
      "desc": "Шляхи, цикли, зв'язність графа, компоненти зв'язності."
    },
    {
      "title": "Найкоротші шляхи",
      "desc": "Алгоритм Дейкстри та алгоритм Флойда-Уоршелла (математична логіка)."
    },
    {
      "title": "Ейлерові графи",
      "desc": "Ейлерові та Гамільтонові графи, задача про 7 кенігсберзьких мостів."
    },
    {
      "title": "Дерева та Остови",
      "desc": "Мінімальне остовне дерево (алгоритми Краскала та Прима)."
    },
    {
      "title": "Лапласіан графа",
      "desc": "Матричний лапласіан графа L = D - A, його властивості та власні значення."
    }
  ],
  "18": [
    {
      "title": "Точкові оцінки",
      "desc": "Точкова оцінка параметрів розподілу, поняття правдоподібності (Likelihood)."
    },
    {
      "title": "Функція правдоподібності",
      "desc": "Функція L(θ) та логарифмічна функція правдоподібності ln L(θ)."
    },
    {
      "title": "Принцип MLE",
      "desc": "Maximum Likelihood Estimation: необхідна умова ∂ ln L / ∂ θ = 0."
    },
    {
      "title": "MLE для нормального",
      "desc": "Аналітичне виведення MLE-оцінки для параметрів μ та σ² нормального розподілу."
    },
    {
      "title": "MLE для Пуассона",
      "desc": "Виведення MLE-оцінки для параметра p біноміального та λ Пуассона."
    },
    {
      "title": "Інформація Фішера",
      "desc": "Інформація Фішера I(θ) та її геометричний і статистичний зміст."
    },
    {
      "title": "Нерівність Рао-Крамера",
      "desc": "Нижня межа дисперсії незміщеної оцінки та ефективні оцінки."
    },
    {
      "title": "Ручне виведення MLE",
      "desc": "Покрокове ручне виведення оцінки максимальної правдоподібності для розподілу."
    }
  ],
  "19": [
    {
      "title": "Цензуровані дані",
      "desc": "Специфіка Time-to-Event даних, цензурування (правобічне, лівобічне, інтервальне)."
    },
    {
      "title": "Функція виживаності",
      "desc": "Функція виживаності S(t) = P(T > t), її властивості та графік кривої."
    },
    {
      "title": "Функція ризику",
      "desc": "Функція інтенсивності відмов / ризику (Hazard Function, h(t)) та кумулятивний ризик."
    },
    {
      "title": "Каплан-Майєр",
      "desc": "Непараметричний оцінювач Каплана-Майєра: Ŝ(t) = ∏ (1 - d_i / n_i)."
    },
    {
      "title": "Таблиці виживаності",
      "desc": "Побудова Life Tables та розрахунок медіани часу виживаності."
    },
    {
      "title": "Логранговий тест",
      "desc": "Log-Rank Test для порівняння двох або більше кривих виживаності."
    },
    {
      "title": "Модель Кокса",
      "desc": "Модель пропорційних ризиків Кокса: h(t|x) = h₀(t) exp(βᵀx)."
    },
    {
      "title": "Ручний Каплан-Майєр",
      "desc": "Ручний розрахунок виживаності Каплана-Майєра на вибірці з цензурованими даними."
    }
  ],
  "20": [
    {
      "title": "Стохастичні процеси",
      "desc": "Поняття стохастичного процесу як сімейства випадкових величин {X_t}."
    },
    {
      "title": "Броунівський рух",
      "desc": "Вінерівський процес W_t: властивості, незалежні нормальні прирости."
    },
    {
      "title": "Мартингали",
      "desc": "Поняття справедливої гри E[Xₙ₊₁ | X₁, ..., Xₙ] = Xₙ."
    },
    {
      "title": "Пуассонівський процес",
      "desc": "Властивості, інтенсивність λ, розподіл міжподійних інтервалів."
    },
    {
      "title": "СДР рівняння",
      "desc": "Концепція стохастичного диференціального рівняння: dX_t = μ dt + σ dW_t."
    },
    {
      "title": "Лема Іто",
      "desc": "Лема Іто (Ito's Lemma) для стохастичного диференціювання."
    },
    {
      "title": "Геометричний Броунівський",
      "desc": "Geometric Brownian Motion (GBM) як модель для динаміки цін."
    },
    {
      "title": "Монте-Карло",
      "desc": "Концепція моделювання методом Монте-Карло: генерація випадкових траєкторій."
    }
  ],
  "21": [
    {
      "title": "Переваги непараметрики",
      "desc": "Переваги непараметричної статистики при відсутності нормальності."
    },
    {
      "title": "Критерій знаків",
      "desc": "Sign Test для однієї вибірки та парних порівнянь."
    },
    {
      "title": "Критерій Уілкоксона",
      "desc": "Wilcoxon Signed-Rank Test для парних зв'язаних вибірок."
    },
    {
      "title": "Манн-Уітні (U-test)",
      "desc": "U-критерій Манна-Уітні для незалежних вибірок: ранжування та розрахунок U."
    },
    {
      "title": "Краскел-Уолліс",
      "desc": "Kruskal-Wallis Test як непараметричний аналог однофакторного ANOVA."
    },
    {
      "title": "Критерій Фрідмана",
      "desc": "Friedman Test для повторних вимірювань у кількох групах."
    },
    {
      "title": "Перевірка нормальності",
      "desc": "Критерій Колмогорова-Смірнова (K-S test) та критерій Шапіро-Уілка."
    },
    {
      "title": "Ручний U-тест",
      "desc": "Ручний розрахунок U-статистики Манна-Уітні на вибірках малої розмірності."
    }
  ],
  "22": [
    {
      "title": "Матриці відстаней",
      "desc": "Багатовимірні дані, матриці відстаней та схожості (Dissimilarity Matrix)."
    },
    {
      "title": "Мета MDS",
      "desc": "Візуалізація об'єктів у просторі зниженої розмірності (R² або R³)."
    },
    {
      "title": "Metric MDS (PCoA)",
      "desc": "Класичне багатовимірне шкалювання (Principal Coordinate Analysis)."
    },
    {
      "title": "Функція стресу",
      "desc": "Оцінка точності відображення: функція стресу (Kruskal's Stress Function)."
    },
    {
      "title": "Non-metric MDS",
      "desc": "Неметричне багатовимірне шкалювання: монотонні перетворення рангів."
    },
    {
      "title": "Алгоритм SMACOF",
      "desc": "Алгоритм мінімізації стресу (SMACOF algorithm - математична ідея)."
    },
    {
      "title": "MDS vs PCA",
      "desc": "Порівняння MDS з методом головних компонент (PCA) та збереження геометрії."
    },
    {
      "title": "Ручний MDS",
      "desc": "Ручна побудова 2D-конфігурації для 3-х об'єктів за заданою матрицею евклідових відстаней."
    }
  ],
  "23": [
    {
      "title": "Латентні фактори",
      "desc": "Приховані фактори, що пояснюють взаємозв'язки між багатьма змінними."
    },
    {
      "title": "Модель факторів",
      "desc": "Модель X = ΛF + ε, факторні навантаження (Λ) та специфічні фактори (ε)."
    },
    {
      "title": "Спільність",
      "desc": "Спільність (Communality) та специфічність (Uniqueness) змінних."
    },
    {
      "title": "Факторний аналіз vs PCA",
      "desc": "Відмінність факторного аналізу від методу головних компонент (PCA)."
    },
    {
      "title": "Методи виділення",
      "desc": "Метод головних факторів, метод максимальної правдоподібності."
    },
    {
      "title": "Обертання осей",
      "desc": "Ортогональне (Varimax) та косокутне (Promax) обертання для інтерпретації."
    },
    {
      "title": "Факторні оцінки",
      "desc": "Розрахунок факторних оцінок (Factor Scores) для спостережень."
    },
    {
      "title": "Конфірматорний аналіз",
      "desc": "Конфірматорний (підтверджувальний) факторний аналіз (CFA) та метрики Fit Indices."
    }
  ],
  "24": [
    {
      "title": "Компоненти ряду",
      "desc": "Часовий ряд Y_t, тренд (T_t), сезонність (S_t), циклічність (C_t), шум (ε_t)."
    },
    {
      "title": "Аддитивна & Мультиплікативна",
      "desc": "Аддитивна (Y=T+S+ε) та мультиплікативна (Y=T×S×ε) моделі."
    },
    {
      "title": "Стаціонарність",
      "desc": "Стаціонарність у широкому сенсі: постійне середнє, постійна дисперсія, автоковаріація."
    },
    {
      "title": "ACF та PACF",
      "desc": "Автокореляційна (ACF) та Часткова автокореляційна (PACF) функції."
    },
    {
      "title": "Тест ADF",
      "desc": "Розширений тест Дікі-Фуллера (ADF test) та нульова гіпотеза про одиничний корінь."
    },
    {
      "title": "Моделі AR(p)",
      "desc": "Моделі авторегресії AR(p) та оператор зсуву (Lag Operator)."
    },
    {
      "title": "Моделі MA(q) & ARIMA",
      "desc": "Моделі ковзного середнього MA(q) та інтегровані моделі ARIMA(p, d, q)."
    },
    {
      "title": "Ручна автокореляція",
      "desc": "Ручний розрахунок автокореляції першого порядку r₁ для короткого історичного ряду."
    }
  ],
  "25": [
    {
      "title": "Принципи експерименту",
      "desc": "Рандомізація, повторність (Replication) та блокування (Blocking)."
    },
    {
      "title": "Фактори та відгук",
      "desc": "Незалежні змінні (Фактори), рівні факторів (Levels) та відгук (Response)."
    },
    {
      "title": "Повний факторний план",
      "desc": "Повний факторний експеримент (2ᵏ, 3ᵏ designs): матриця планування."
    },
    {
      "title": "Дробний план",
      "desc": "Дробний факторний експеримент та роздільна здатність плану (Resolution)."
    },
    {
      "title": "Ефекти взаємодії",
      "desc": "Оцінка головних ефектів факторів та ефектів взаємодії факторів."
    },
    {
      "title": "Поверхня відгуку (RSM)",
      "desc": "Метод поверхні відгуку: центровані композиційні плани (CCD)."
    },
    {
      "title": "Латинські квадрати",
      "desc": "Рандомізовані блочні плани та латинські квадрати (Latin Squares)."
    },
    {
      "title": "Ручний розрахунок 2²",
      "desc": "Покроковий розрахунок ефекту 2-х факторів за допомогою ортогональної матриці 2²."
    }
  ],
  "26": [
    {
      "title": "Матриця виграшів",
      "desc": "Альтернативи, стани природи, матриця виграшів/втрат (Payoff Matrix)."
    },
    {
      "title": "EMV & EOL",
      "desc": "Очікувана грошова цінність (EMV) та очікувані втрати (EOL) в умовах ризику."
    },
    {
      "title": "Критерій Вальда",
      "desc": "Прийняття рішень в умовах невизначеності: Критерій Вальда (Максимін - песимізм)."
    },
    {
      "title": "Максимакс & Гурвіц",
      "desc": "Критерій Максимакс (оптимізм) та Критерій Гурвіца (коефіцієнт α)."
    },
    {
      "title": "Критерій Севіджа",
      "desc": "Мінімізація максимального жалю (Minimax Regret)."
    },
    {
      "title": "Дерева рішень",
      "desc": "Вузли рішень, вузли ймовірностей та зворотна індукція (Rollback technique)."
    },
    {
      "title": "Функція корисності",
      "desc": "Теорема корисності фон Неймана-Моргенштерна та функція корисності."
    },
    {
      "title": "Ручний розрахунок 3x3",
      "desc": "Ручний розрахунок оптимальної стратегії на матриці 3×3 за 4-ма критеріями."
    }
  ],
  "27": [
    {
      "title": "Постановка задачі",
      "desc": "Цільова функція min f(x), обмеження-рівності g_i(x)=0 та нерівності h_j(x)≤0."
    },
    {
      "title": "Множники Лагранжа",
      "desc": "Оптимізація рівносних обмежень: функція Лагранжа L(x, λ) = f(x) + ∑ λ_i g_i(x)."
    },
    {
      "title": "Умови KKT",
      "desc": "Оптимізація з обмеженнями-нерівностями: Умови Каруша-Куна-Такера (KKT Conditions)."
    },
    {
      "title": "Двоїстість",
      "desc": "Пряма (Primal) та двоїста (Dual) задачі, слабка та сильна двоїстість."
    },
    {
      "title": "Метод Ньютона-Рафсона",
      "desc": "Нелінійна оптимізація без обмежень: Метод Ньютона-Рафсона та BFGS."
    },
    {
      "title": "Градієнт з проекцією",
      "desc": "Градієнтні методи з проекцією для обмежених областей."
    },
    {
      "title": "Глобальна оптимізація",
      "desc": "Проблеми локальних мінімумів, метод імітації відпалу (Simulated Annealing)."
    },
    {
      "title": "Ручний Лагранжіан",
      "desc": "Ручний розрахунок мінімуму функції f(x, y) = x² + y² при обмеженні x + y = 1."
    }
  ],
  "28": [
    {
      "title": "Компоненти СМО",
      "desc": "Вхідний потік вимог, черга, обслуговуючі пристрої (канали)."
    },
    {
      "title": "Нотація Кендалла",
      "desc": "Позначення A/B/c/K/N: канали, потоки та розмір черги."
    },
    {
      "title": "СМО M/M/1",
      "desc": "Пуассонівський вхід з λ, експоненціальне обслуговування з μ."
    },
    {
      "title": "Завантаження ρ",
      "desc": "Коефіцієнт завантаження системи ρ = λ / μ та умова стаціонарності (ρ < 1)."
    },
    {
      "title": "Ймовірності станів",
      "desc": "Стаціонарні ймовірності станів системи P_k = (1 - ρ)ρ^k."
    },
    {
      "title": "Показники черги",
      "desc": "Середня довжина черги L_q, середня кількість у системі L, час очікування W_q."
    },
    {
      "title": "Формули Літтла",
      "desc": "Формули Літтла: L = λW та L_q = λW_q."
    },
    {
      "title": "СМО M/M/c",
      "desc": "Багатоканальні системи M/M/c (формула Ерланга-С) та ручний розрахунок для 2-х операторів."
    }
  ],
  "29": [
    {
      "title": "Межі кореляції",
      "desc": "Межі класичної кореляції Пірсона при аналізі нелінійних та важкохвостих даних."
    },
    {
      "title": "Поняття Копули",
      "desc": "Копула C(u₁, ..., u_d) як функція зв'язку маргінальних розподілів."
    },
    {
      "title": "Теорема Скляра",
      "desc": "Представлення F(x₁, ..., x_d) через копулу C(F₁(x₁), ..., F_d(x_d))."
    },
    {
      "title": "Гауссівська & t-копула",
      "desc": "Гауссівська та t-копула Стьюдента: параметризація через кореляційну матрицю."
    },
    {
      "title": "Архимедові копули",
      "desc": "Копули Клейтона, Гамбела, Френка та їх аналітичні генератори."
    },
    {
      "title": "Tail Dependence",
      "desc": "Залежність у хвостах (нижня λ_l та верхня λ_u) для екстремальних подій."
    },
    {
      "title": "Оцінювання копул",
      "desc": "Метод максимальної правдоподібності (IFM) та за допомогою τ Кендалла."
    },
    {
      "title": "Незалежна копула",
      "desc": "Ручний розрахунок значення незалежної копули C(u, v) = u·v для ймовірностей."
    }
  ],
  "30": [
    {
      "title": "Асимптотика",
      "desc": "Асимптотична нормальність та асимптотична ефективність оцінок."
    },
    {
      "title": "Метод Jackknife",
      "desc": "Повторні вибірки з виключенням одного елемента для зменшення зміщення."
    },
    {
      "title": "Метод Bootstrap",
      "desc": "Повторні вибірки з поверненням (Resampling) для оцінки дисперсії."
    },
    {
      "title": "Бутстреп-інтервали",
      "desc": "Перцентильний та BCa (bias-corrected and accelerated) довірчі інтервали."
    },
    {
      "title": "Робастність",
      "desc": "М-оцінки, урізане середнє (Trimmed Mean), винзоризація та точка зсуву."
    },
    {
      "title": "Множинні гіпотези",
      "desc": "Помилка сімейства (FWER), поправка Бонферроні та поправка Холма."
    },
    {
      "title": "Контроль FDR",
      "desc": "Частка хибних відкриттів (FDR) та процедура Бенджаміні-Хохберга."
    },
    {
      "title": "Ручний Bootstrap",
      "desc": "Ручний алгоритм генерації 3-х бутстреп-вибірок для обчислення SE середнього."
    }
  ]
};
  const existingRoadmaps = one<{ count: number }>(
    'SELECT COUNT(*) as count FROM roadmaps',
    [],
    (row) => ({ count: numberValue(row.count) }),
  );

  if (!existingRoadmaps || existingRoadmaps.count < 60) {
    run('DELETE FROM roadmaps');
    const tracks: Track[] = [];

    const tracksMetadata = [
      {
        id: "math",
        title: "1. Математика та статистика",
        text: "Фундаментальний блок, з якого починається весь ваш шлях. Тут ви навчитеся оперувати векторами й матрицями, будувати графіки функцій, рахувати похідні, працювати з частковими похідними та градієнтами, розуміти умовну ймовірність і теорему Байєса, а також проводити перевірку статистичних гіпотез (z-тести, t-тести, ANOVA). Оскільки це початковий блок, він не вимагає попередніх знань. Отримані знання стануть основою для розуміння алгоритмів машинного навчання, аналізу статистичної значущості в A/B тестах та роботи з векторними просторами в ембеддінгах нейромереж.",
        prefix: "math",
        steps: [
          'Описова статистика', 'Теорія ймовірностей', 'Розподіли ймовірностей', 'Перевірка гіпотез', 'Лінійна алгебра: Вектори', 'Матричні перетворення', 'Матанализ: Похідні', 'Оптимізація & Градієнт', 'Баєсівський аналіз', 'Статистичний висновок', 'Кореляційний аналіз', 'Дисперсійний аналіз (ANOVA)', 'Регресійні моделі', 'Теорія інформації', 'Марковські процеси', 'Чисельні методи', 'Теорія графів', 'Теорія оцінювання (MLE)', 'Аналіз виживаності', 'Стохастичне моделювання', 'Непараметричні тести', 'Багатовимірне шкалювання', 'Факторний аналіз', 'Аналіз часових рядів (математика)', 'Планування експериментів', 'Теорія прийняття рішень', 'Оптимізація функцій', 'Теорія черг', 'Копули та залежності', 'Сучасна математична статистика'
        ]
      },
      {
        id: "excel",
        title: "2. Excel для аналізу даних",
        text: "У цьому блоці ви навчитеся професійно працювати з електронними таблицями Excel, використовувати складні логічні, математичні та пошукові функції (VLOOKUP, INDEX/MATCH, XLOOKUP), створювати зведені таблиці (Pivot Tables) та будувати інтерактивні бізнес-дашборди. Знання з математики та статистики допоможуть вам швидко проводити первинний аналіз розподілу даних (середнє, медіана, стандартне відхилення) прямо в Excel та коректно вибирати типи графіків для візуалізації трендів.",
        prefix: "excel",
        steps: [
          'Інтерфейс та клітинки', 'Типи даних', 'Формули та посилання', 'Логічні функції (IF, AND, OR)', 'Математичні функції', 'Текстові функції', 'Функції дат та часу', 'ВПР та ГПР (VLOOKUP, HLOOKUP)', 'ІНДЕКС та ПОШУКПОЗ (INDEX & MATCH)', 'Сучасні XLOOKUP & FILTER', 'Сортування та фільтрація', 'Умовне форматування', 'Робота з дублікатами', 'Перевірка даних (Validation)', 'Зведені таблиці (Pivot Tables)', 'Розрахунки у зведених таблицях', 'Діаграми та графіки', 'Комбіновані діаграми', 'Спарклайни (Sparklines)', 'Робота з великими таблицями', 'Імпорт даних (CSV, Web)', 'Текстові стовпці (Text to Columns)', 'Power Query: Імпорт', 'Power Query: Перетворення', 'Power Pivot та DAX', 'Макроси та автоматизація', 'Спільна робота та захист', 'Пошук рішень (Solver)', 'Пакет аналізу (Analysis ToolPak)', 'Практичний дашборд в Excel'
        ]
      },
      {
        id: "sheets",
        title: "3. Google Sheets для аналізу даних",
        text: "Цей блок навчить вас працювати в хмарі Google Sheets, налаштовувати спільний доступ для командної роботи, автоматизувати рутину через Google Apps Script, імпортувати дані з веб-сторінок за допомогою IMPORTXML та створювати потужні аналітичні вибірки через функцію QUERY. Досвід роботи з Excel спростить вивчення формул, а знання математичної логіки допоможе будувати складні умовні оператори та структури масивів (ARRAYFORMULA) для обробки реальних даних.",
        prefix: "sheets",
        steps: [
          'Вступ до Sheets', 'Імпорт/Експорт даних', 'Сумісний доступ та коментарі', 'Базові формули', 'Функції FILTER & SORT', 'Функція QUERY (основи)', 'Функція QUERY (агрегація)', 'Функція QUERY (умови)', 'Робота з масивами (ARRAYFORMULA)', 'Функції IMPORTRANGE', 'Імпорт веб-даних (IMPORTXML)', 'Зведені таблиці в Sheets', 'Створення діаграм', 'Інтерактивні спадні списки', 'Захист діапазонів', 'Історія версій та відновлення', 'Макроси в Sheets', 'Google Apps Script (основи)', 'Apps Script: Автоматизація', 'Apps Script: Робота з API', 'Інтеграція з BigQuery', 'Робота з формами (Google Forms)', 'Сценарії очищення даних', 'Аналітичні плагіни', 'Сучасні функції Sheets AI', 'Налаштування фільтр-видів', 'Умовні правила Sheets', 'Розрахунок фінансових показників', 'Спільна звітність', 'Комплексний дашборд у Sheets'
        ]
      },
      {
        id: "python",
        title: "4. Програмування (Python)",
        text: "Ви опануєте мову Python з нуля: від базового синтаксису, функцій та структур даних (списки, словники) до об'єктно-орієнтованого програмування, асинхронності та аналітичних бібліотек NumPy й Pandas. Навички формул з Excel та Google Sheets дадуть вам розуміння алгоритмічного мислення та циклів, а знання векторної алгебри з першого блоку дозволять легко зрозуміти логіку багатовимірних масивів у NumPy та операцій над таблицями в Pandas.",
        prefix: "py",
        steps: [
          'Вступ та синтаксис', 'Змінні та типи даних', 'Умовні оператори', 'Цикли (for, while)', 'Списки та кортежі', 'Словники та множини', 'Функції та область видимості', 'Робота з файлами (I/O)', 'Обробка виключень', 'Імпорт модулів та пакетів', 'Регулярні вирази (re)', 'Віртуальні середовища (venv)', 'PIP та залежності', 'ООП: Класи та об’єкти', 'ООП: Успадкування та поліморфізм', 'ООП: Інкапсуляція та магічні методи', 'Декоратори в Python', 'Генератори та ітератори', 'Робота з датами (datetime)', 'Асинхронне програмування', 'Бібліотека Collections', 'Робота з JSON та API', 'Вступ до NumPy', 'Масиви та операції в NumPy', 'Вступ до Pandas', 'Pandas DataFrames', 'Очищення даних у Pandas', 'Групування та злиття в Pandas', 'Візуалізація з Matplotlib', 'Кращі практики та PEP 8'
        ]
      },
      {
        id: "sql",
        title: "5. Бази даних та SQL",
        text: "Ви навчитеся проектувати реляційні бази даних та писати складні SQL-запити: від базової фільтрації (WHERE, GROUP BY) до складання JOIN-ів, CTE (Common Table Expressions) та аналітичних віконних функцій. Досвід роботи з табличними процесорами (Excel, Sheets) та бібліотекою Pandas в Python допоможе вам миттєво зрозуміти концепцію зв'язків між таблицями й логіку агрегації даних, оскільки ви вже робили аналогічні операції в коді та інтефейсі.",
        prefix: "sql",
        steps: [
          'Основи СУБД', 'SELECT & FROM', 'Фільтрація з WHERE', 'Оператори порівняння та LIKE', 'Сортування ORDER BY', 'Агрегатні функції (SUM, AVG)', 'Групування GROUP BY', 'Фільтрація груп HAVING', 'Типи зв\'язків у БД', 'INNER JOIN', 'LEFT & RIGHT JOIN', 'FULL & CROSS JOIN', 'Підзапити (Subqueries)', 'Тимчасові таблиці (WITH CTE)', 'Віконні функції (ROW_NUMBER)', 'Віконні функції (LEAD, LAG, NTILE)', 'Оператори UNION & INTERSECT', 'Рядкові функції SQL', 'Робота з датами в SQL', 'Транзакції та ACID', 'Індексація та оптимізація', 'Створення таблиць (DDL)', 'Зміна даних (DML)', 'Перегляди (Views)', 'Збережені процедури', 'Бази даних NoSQL', 'Робота з PostgreSQL', 'Робота з MySQL/SQLite', 'Складні запити', 'Проектування схем даних'
        ]
      },
      {
        id: "ml",
        title: "6. Машинне навчання",
        text: "Ви навчитеся будувати класичні моделі машинного навчання для класифікації, регресії та кластеризації за допомогою бібліотеки Scikit-Learn. Математичний апарат (градієнтний спуск, матричні множення, теорія ймовірностей) допоможе вам глибоко зрозуміти математичну суть алгоритмів (лінійна регресія, дерева рішень, SVM), а навички програмування на Python та написання SQL-запитів дозволять самостійно діставати дані з баз, проводити Feature Engineering та будувати автоматизовані Pipelines.",
        prefix: "ml",
        steps: [
          'Вступ до ML', 'Лінійна регресія', 'Метрики регресії (MSE, R2)', 'Логістична регресія', 'Метрики класифікації (Precision, Recall)', 'ROC-AUC та PR криві', 'Дерева рішень (Decision Trees)', 'Метод найближчих сусідів (KNN)', 'Наївний баєсівський класифікатор', 'Опорні вектори (SVM)', 'Регуляризація (L1, L2)', 'Бейгінг та Випадковий ліс', 'Градієнтний бустинг (XGBoost)', 'Бустинг з LightGBM та CatBoost', 'Кластеризація (K-Means)', 'Ієрархічна кластеризація', 'Зменшення розмірності (PCA)', 'Метод t-SNE', 'Крос-валідація', 'Підбір гіперпараметрів (GridSearch)', 'Робота з дисбалансом класів', 'Feature Engineering', 'Feature Selection', 'Конвеєри (Sklearn Pipelines)', 'Стеккінг та Блендінг', 'Аналіз аномалій (Isolation Forest)', 'Напівконтрольоване навчання', 'Навчання з підкріпленням (основи)', 'Інтерпретація моделей (SHAP)', 'Розгортання базової моделі'
        ]
      },
      {
        id: "dl",
        title: "7. Глибоке навчання",
        text: "Цей блок занурить вас у світ штучних нейромереж: від багатошарових перцептронів до згорткових (CNN), рекурентних (RNN) мереж та архітектури Transformer на базі PyTorch та TensorFlow. Знання класичного машинного навчання з минулого блоку дадуть розуміння процесів навчання та валідації моделей, а міцні знання матаналізу (градієнтний спуск та зворотне поширення помилки) допоможуть зрозуміти, як саме навчаються параметри у глибоких мережах.",
        prefix: "dl",
        steps: [
          'Основи штучних нейромереж', 'Функції активації', 'Зворотне поширення помилки', 'Оптимізатори (Adam, RMSprop)', 'Функції втрат (Loss functions)', 'Вступ до PyTorch', 'Вступ до TensorFlow', 'Багатошаровий перцептрон (MLP)', 'Регуляризація: Dropout & Batch Normalization', 'Згорткові шари (Convolution)', 'Пулінг та архітектура CNN', 'Популярні CNN: ResNet, VGG', 'Трансферне навчання (Transfer Learning)', 'Рекурентні мережі (RNN)', 'Шари LSTM та GRU', 'Односпрямовані та двоспрямовані RNN', 'Механізм уваги (Attention)', 'Архітектура Transformer', 'Автокодувальники (Autoencoders)', 'Варіаційні автокодувальники (VAE)', 'Генеративно-змагальні мережі (GAN)', 'Оптимізація DL моделей', 'Робота з великими вагами моделей', 'Навчання на багатьох GPU', 'Квантизація та прунінг', 'Вступ до ембеддінгів', 'Глибоке RL (Deep Q-Networks)', 'Self-Supervised Learning', 'Графові нейромережі (GNN)', 'Сучасні тренди в Deep Learning'
        ]
      },
      {
        id: "nlp",
        title: "8. Обробка природної мови",
        text: "Ви навчитеся працювати з текстовими даними, проводити токенізацію, лематизацію, використовувати векторні представлення (Word2Vec, BERT) та створювати системи пошуку і класифікації текстів. Попередній досвід з глибокого навчання (особливо RNN та архітектура Transformer) є критично важливим для розуміння сучасних NLP-моделей та механізмів уваги, а навички програмування на Python дозволять вам впевнено працювати з бібліотеками Hugging Face та SpaCy.",
        prefix: "nlp",
        steps: [
          'Основи обробки тексту', 'Токенізація та лематизація', 'Видалення стоп-слів', 'Регулярні вирази для тексту', 'Модель мішка слів (Bag of Words)', 'Метрика TF-IDF', 'Моделі Word2Vec та FastText', 'Контекстні ембеддінги GloVe', 'Аналіз тональності (Sentiment)', 'Класифікація текстів', 'Розпізнавання сутностей (NER)', 'Виділення ключових слів', 'Тематичне моделювання (LDA)', 'Моделі послідовностей для NLP', 'Attention в тексті', 'Модель BERT', 'Родина моделей GPT (архітектура)', 'Токенізатори (BPE, WordPiece)', 'Fine-tuning мовних моделей', 'Генерація тексту та декодування', 'Машинний переклад (Seq2Seq)', 'Побудова запитально-відповідних систем', 'Векторні бази даних для тексту', 'Пошук та RAG архітектура', 'Метрики оцінки (BLEU, ROUGE)', 'Робота з бібліотекою Hugging Face', 'Бібліотека Spacy', 'Пакет NLTK', 'Аналіз діалогів та чат-боти', 'Масштабування NLP моделей'
        ]
      },
      {
        id: "cv",
        title: "9. Комп'ютерний зір (CV)",
        text: "Ви навчитеся обробляти зображення та відео, виявляти об'єкти на базі алгоритмів YOLO, проводити семантичну сегментацію (U-Net) та відстежувати рух. Базові знання матричних перетворень з лінійної алгебри допоможуть зрозуміти операції згортки та геометричні трансформації кадрів, а досвід роботи з фреймворками глибокого навчання (CNN архітектури) дозволить легко налаштовувати та навчати складні моделі для обробки візуального контенту.",
        prefix: "cv",
        steps: [
          'Основи цифрового зображення', 'Формати та кольорові простори', 'Бібліотека OpenCV', 'Фільтрація та розмиття зображень', 'Детекція меж (Canny Edge)', 'Геометричні перетворення', 'Аугментація зображень', 'Виділення ознак (SIFT, ORB)', 'Детекція об\'єктів (класика)', 'Згорткові мережі для CV', 'Класифікація зображень', 'Локалізація та Bounding Boxes', 'Детекція об\'єктів: YOLO', 'Детекція об\'єктів: SSD & R-CNN', 'Семантична сегментація (U-Net)', 'Інстанс-сегментація (Mask R-CNN)', 'Детекція ключових точок (Keypoints)', 'Розпізнавання облич', 'Трекінг об\'єктів (DeepSORT)', 'Оптичний потік (Optical Flow)', '3D Комп\'ютерний зір', 'CV в автономному транспорті', 'Генерація зображень (Diffusion)', 'CV на мобільних пристроях', 'Оптичне розпізнавання тексту (OCR)', 'Метрики CV (mAP, IoU)', 'Візуалізація карт уваги (Grad-CAM)', 'CV для медичних зображень', 'Super Resolution', 'Масштабування CV пайплайнів'
        ]
      },
      {
        id: "genai",
        title: "10. Генеративний ШІ та LLM",
        text: "У цьому блоці ви навчитеся розробляти ШІ-рішення з використанням великих мовних моделей (LLM): від Prompt Engineering та бібліотек LangChain / LlamaIndex до побудови RAG-систем (пошуку з використанням векторних баз даних) та автономних агентів. Знання NLP допоможуть вам ефективно працювати з токенізацією та ембеддінгами, а програмування на Python та розуміння архітектури Transformer дозволять інтегрувати LLM у реальні бізнес-додатки та сервіси.",
        prefix: "gen",
        steps: [
          'Вступ до Generative AI', 'Мовні моделі великого розміру (LLM)', 'Prompt Engineering: Основи', 'Few-shot & Zero-shot навчання', 'Chain of Thought', 'Prompt шаблони та безпека', 'Prompt Injection атаки', 'Введення до LangChain', 'LangChain агенти та ланцюжки', 'Бібліотека LlamaIndex', 'RAG (Retrieval-Augmented Generation)', 'Векторний пошук та індексація', 'Бази даних Pinecone / Chroma', 'Fine-tuning LLM (LoRA/QLoRA)', 'Навчання з підкріпленням (RLHF)', 'Оцінка відповідей LLM (Ragas)', 'Оптимізація контекстного вікна', 'Мультимодальний ШІ', 'Генерація коду за допомогою LLM', 'Автономні ШІ-агенти', 'Моделі генерації аудіо', 'Моделі генерації відео (Sora)', 'Локальний запуск LLM (Ollama)', 'Сервіси OpenAI / Anthropic API', 'Платформа Hugging Face Spaces', 'Контроль витрат на токени', 'ШІ помічники в розробці', 'ШІ-агенти для бізнесу', 'Правові аспекти та копірайт', 'Майбутнє штучного інтелекту'
        ]
      },
      {
        id: "de",
        title: "11. Data Engineering та Big Data",
        text: "Ви навчитеся проектувати масштабні сховища даних (DWH), будувати ETL/ELT процеси обробки даних, працювати з Apache Spark для розподілених обчислень та Airflow для оркестрації завдань. Знання SQL є фундаментальним для роботи з аналітичними базами даних (ClickHouse, Snowflake), а навички програмування на Python допоможуть писати складні Spark-додатки та сценарії Airflow для автоматизації потоків даних.",
        prefix: "de",
        steps: [
          'Вступ до Data Engineering', 'Архітектури сховищ (DWH)', 'Концепції ETL та ELT', 'Реляційні проти аналітичних БД', 'Колонкові бази даних (ClickHouse)', 'Вступ до Big Data', 'Екосистема Hadoop та HDFS', 'Формати зберігання (Parquet, Avro)', 'Вступ до Apache Spark', 'Spark RDD & DataFrames', 'Оптимізація Spark запитів', 'Пайплайни даних в Apache Airflow', 'Створення DAGs в Airflow', 'Оркестрація та моніторинг Airflow', 'Потокова обробка даних (Streaming)', 'Вступ до Apache Kafka', 'Kafka продюсери та консюмери', 'Spark Streaming & Kafka', 'Інструменти CDC (Debezium)', 'Очищення даних на масштабі', 'Data Lakehouse концепція', 'Технологія Delta Lake', 'Сховища даних Snowflake та Redshift', 'Моніторинг якості даних', 'Управління метаданими', 'Аналіз логів у реальному часі', 'Резервне копіювання даних', 'Безпека та маскування даних', 'Оптимізація ETL процесів', 'Сучасні DE стеки'
        ]
      },
      {
        id: "cloud",
        title: "12. Хмарні технології для Data Science",
        text: "Цей блок присвячений розгортанню інфраструктури в хмарах AWS, GCP та Azure: від налаштування IAM-допусків та віртуальних машин до використання безсерверних функцій і автоматизації інфраструктури через Terraform (IaC). Навички з Data Engineering та баз даних допоможуть вам зрозуміти специфіку хмарних сховищ даних (S3, Cloud Storage, BigQuery), а досвід програмування на Python дозволить впевнено писати безсерверні скрипти та інтегрувати хмарні API.",
        prefix: "cloud",
        steps: [
          'Вступ до хмарних технологій', 'Моделі сервісів (IaaS, PaaS, SaaS)', 'Хмара AWS: Огляд', 'Сервіс AWS EC2 для розрахунків', 'Сховище AWS S3 для датасетів', 'Бази даних в AWS (RDS, DynamoDB)', 'Безсерверні функції (AWS Lambda)', 'AWS IAM: Доступи та безпека', 'Моніторинг хмари (AWS CloudWatch)', 'Хмара Google Cloud (GCP): Огляд', 'Аналітика в GCP BigQuery', 'Машинне навчання в GCP Vertex AI', 'Сховище Google Cloud Storage', 'Безсерверні контейнери Cloud Run', 'Хмара Microsoft Azure: Огляд', 'Azure Blob Storage', 'Azure Databricks для аналітики', 'Керування витратами в хмарі', 'Гібридні хмари', 'Автоматизація з Terraform (IaC)', 'IaC конфігурації для DS', 'Резервування в хмарі', 'Хмарні бази даних NoSQL', 'Масштабування GPU інстансів', 'Аналіз мережевої безпеки в хмарі', 'Побудова хмарних пайплайнів', 'Хмарні реєстри контейнерів', 'Віртуальні приватні хмари (VPC)', 'Оптимізація витрат на GPU', 'Майбутнє хмарного аналізу'
        ]
      },
      {
        id: "mlops",
        title: "13. MLOps та автоматизація",
        text: "Ви навчитеся автоматизувати повний життєвий цикл ML-моделей: версіонувати дані та моделі за допомогою DVC та MLflow, упаковувати сервіси в Docker-контейнери, налаштовувати CI/CD пайплайни та розгортати API на FastAPI. Досвід роботи з моделями машинного/глибокого навчання є основою для їх деплою, хмарні технології допоможуть розгорнути сервіси у хмарі, а навички програмування на Python забезпечать розробку надійного бекенд-коду.",
        prefix: "ops",
        steps: [
          'Життєвий цикл ML моделей', 'Концепція MLOps', 'Технічний борг у ML', 'Логування з MLflow', 'MLflow Model Registry', 'Weights & Biases трекінг', 'Керування даними (DVC)', 'DVC пайплайни та відстеження', 'Хмарний DVC remote', 'Контейнеризація з Docker', 'Створення Dockerfile для ML', 'Docker GPU підтримка', 'Локальний запуск з Docker Compose', 'Створення API з FastAPI', 'Валідація з Pydantic у FastAPI', 'Unit тестування моделей', 'Batch Inference пайплайни', 'Real-time API деплой', 'Деплой на мобільні (TFLite, ONNX)', 'AWS SageMaker сервіси', 'GCP Vertex AI конвеєри', 'CI/CD з GitHub Actions', 'Автоматична збірка образів', 'GitOps концепції для моделей', 'Data Drift моніторинг', 'Concept Drift моніторинг', 'Логування прогнозів моделей', 'Автоматичне перенавчання', 'Shadow & Canary релізи', 'Масштабування MLOps рішень'
        ]
      },
      {
        id: "viz",
        title: "14. Візуалізація даних та BI",
        text: "Ви навчитеся створювати професійні бізнес-дашборди в системах Tableau, Power BI та Looker Studio, а також розробляти інтерактивні веб-додатки за допомогою Streamlit та Plotly. Знання з Excel та Google Sheets спростять вивчення інтерфейсу BI-систем, знання SQL дозволять підключатися до баз даних і оптимізувати швидкість запитів, а навички з продуктових метрик допоможуть відображати правильні KPI для бізнес-користувачів.",
        prefix: "bi",
        steps: [
          'Принципи дизайну дашбордів', 'Вибір правильного типу візуалізації', 'Вступ до BI систем', 'Tableau Desktop: Основи', 'Tableau: Підключення до даних', 'Tableau: Calculated Fields', 'Tableau: Параметри та фільтри', 'Tableau: Інтерактивні дашборди', 'Power BI Desktop: Основи', 'Power BI: Моделювання даних', 'Power BI: Вступ до мови DAX', 'Power BI: Створення звітів', 'Вступ до Looker Studio', 'Looker: Створення звітів', 'Візуалізація з Python (Seaborn)', 'Інтерактивна графіка з Plotly', 'Дашборди на Streamlit', 'Streamlit: Інтерактивні елементи', 'Розгортання Streamlit додатків', 'Вступ до Shiny на Python', 'BI аналітика реального часу', 'Аналіз поведінки користувачів на графіках', 'Створення звітів для менеджменту', 'Мобільна верстка дашбордів', 'Оптимізація швидкості BI звітів', 'Інтеграція дашбордів у веб-сайти', 'Геопросторова візуалізація (Maps)', 'Аналіз лійка продажів (Funnel)', 'Дашборди для фінансової звітності', 'Кращі практики презентації даних'
        ]
      },
      {
        id: "prod",
        title: "15. Продуктова аналітика та A/B тестування",
        text: "Ви навчитеся аналізувати роботу з продуктовими метриками (LTV, CAC, Retention, Churn) та проводити повний цикл A/B тестування: від формулювання гіпотез і розрахунку розміру вибірки до статистичного аналізу результатів. Фундаментальні знання математичної статистики (теорія гіпотез, p-value, непараметричні тести) дозволять приймати математично обґрунтовані рішення, а навички SQL та Python допоможуть самостійно вивантажувати та обробляти логи поведінки користувачів.",
        prefix: "pa",
        steps: [
          'Вступ до продуктової аналітики', 'Основні продуктові метрики (LTV, CAC)', 'Метрики залученості (DAU, MAU)', 'Когортний аналіз', 'Аналіз відтоку (Churn)', 'Метрики утримання (Retention)', 'Customer Journey Mapping', 'Лійки конверсії', 'Аналіз поведінки користувачів', 'Вступ до A/B тестування', 'Формулювання продуктових гіпотез', 'Вибір метрик для тесту', 'Визначення розміру вибірки', 'Статистична потужність тесту', 'MDE (Minimum Detectable Effect)', 'Аналіз результатів A/B тесту', 'Помилки першого та другого роду в A/B', 'Непараметричні критерії в A/B (Mann-Whitney)', 'Bootstrap для аналізу тестів', 'Проблема множинної перевірки гіпотез', 'AA-тестування та калібрування', 'Множинні порівняння (Bonferroni)', 'Сегментація результатів тесту', 'Байєсівське A/B тестування', 'Многорукі бандити (MAB)', 'Метрики залучення та віральності', 'Аналіз ціноутворення та еластичності', 'Метрики NPS та задоволеності', 'Аналіз відгуків та NPS', 'Побудова продуктового дашборду'
        ]
      },
      {
        id: "ts",
        title: "16. Аналіз часових рядів та прогнозування",
        text: "У цьому блоці ви навчитеся прогнозувати майбутні показники на основі історичних даних, використовуючи класичні статистичні моделі (ARIMA, Prophet), алгоритми машинного навчання та глибокі мережі (LSTM). Математичний аналіз та статистика допоможуть оцінити стаціонарність рядів та розрахувати інтервали невизначеності, а навички програмування на Python дозволять гнучко проводити Feature Engineering для часових зсувів (Lags).",
        prefix: "ts",
        steps: [
          'Вступ до часових рядів', 'Компоненти часового ряду', 'Стаціонарність часового ряду', 'Перевірка стаціонарності (ADF тест)', 'Автокореляція (ACF & PACF)', 'Модель авторегресії (AR)', 'Модель ковзного середнього (MA)', 'Моделі ARIMA', 'Моделі SARIMA', 'Прогнозування з експоненціальним згладжуванням', 'Модель Facebook Prophet', 'Прогнозування часових рядів за допомогою ML', 'Підготовка ознак для часових рядів (Lags)', 'Валідація часових рядів', 'Глибоке навчання для часових рядів (LSTM)', 'Модель NeuralProphet', 'Оцінка якості прогнозів (MAPE, RMSE)', 'Прогнозування попиту в ритейлі', 'Прогнозування фінансових ринків', 'Вплив свят та зовнішніх подій', 'Детекція аномалій у часових рядах', 'Векторна авторегресія (VAR)', 'Аналіз волатильності (ARCH/GARCH)', 'Прогнозування енергоспоживання', 'Пайплайни прогнозування у реальному часі', 'Мультимодальне прогнозування', 'Інструменти масштабування прогнозів', 'Коінтеграція та парний трейдинг', 'Прогнозування з інтервалами невизначеності', 'Сучасні тренди у прогнозуванні'
        ]
      },
      {
        id: "rec",
        title: "17. Рекомендаційні системи та пошук",
        text: "Ви навчитеся будувати персоналізовані рекомендаційні системи за допомогою методів матричної факторизації (SVD, ALS), контентної фільтрації, а також розробляти швидкий семантичний пошук. Знання лінійної алгебри (векторні простори, матричні розклади) є базою для рекомендаційних алгоритмів, а досвід з машинного та глибокого навчання (зокрема нейромереж та ембеддінгів) дозволить реалізовувати сучасні двоетапні моделі ранжування.",
        prefix: "rec",
        steps: [
          'Вступ до рекомендаційних систем', 'Типи рекомендацій', 'Колаборативна фільтрація (User-based)', 'Колаборативна фільтрація (Item-based)', 'Матрична факторизація (SVD, ALS)', 'Контентні рекомендації', 'Гібридні рекомендаційні системи', 'Нейромережеві рекомендації (NCF)', 'Двоетапні рекомендації', 'Моделі ранжування (Learning to Rank)', 'Метрики якості рекомендацій (NDCG)', 'Проблема холодного старту (Cold Start)', 'Оцінка рекомендацій в реальному часі', 'Вступ до пошукових систем', 'Текстовий пошук (BM25)', 'Семантичний пошук з векторними ембеддінгами', 'Implicit Feedback моделі', 'Рекламні рекомендації', 'Session-based рекомендації', 'Інструменти рекомендацій (implicit, LightFM)', 'Масштабування пошукових індексів (FAISS)', 'Оцінка рекомендацій в A/B тестах', 'Уникнення ефекту "бульбашки фільтрів"', 'Побудова новинної стрічки', 'Рекомендації відео та медіа', 'Крос-доменні рекомендації', 'Ранжування товарів у e-commerce', 'Персоналізований пошук', 'Графові рекомендації', 'Сучасні архітектури рекомендацій'
        ]
      },
      {
        id: "graph",
        title: "18. Графовий аналіз даних",
        text: "Ви навчитеся моделювати складні взаємозв'язки за допомогою графів, використовувати бібліотеку NetworkX, розраховувати метрики центральності (PageRank), працювати з графовими базами Neo4j та впроваджувати графові нейромережі (GNN). Знання лінійної алгебри допоможуть зрозуміти матриці суміжності та власні вектори, а навички з машинного навчання та баз даних дозволять використовувати графові ознаки для покращення прогнозів класичних моделей.",
        prefix: "graph",
        steps: [
          'Вступ до теорії графів', 'Представлення графів у коді', 'Бібліотека NetworkX на Python', 'Алгоритми пошуку (BFS, DFS)', 'Пошук найкоротших шляхів (Dijkstra)', 'Метрики центральності (Betweenness)', 'Центральність PageRank', 'Детекція спільнот (Community Detection)', 'Алгоритм Лувена (Louvain)', 'Вступ до Graph Data Science', 'Ембеддінги вузлів (Node2Vec, DeepWalk)', 'Вступ до графових нейромереж (GNN)', 'Шари GCN', 'Графові мережі уваги (GAT)', 'Передбачення зв\'язків (Link Prediction)', 'Класифікація вузлів (Node Classification)', 'Класифікація всього графу', 'Виявлення шахрайства за допомогою графів', 'Аналіз соціальних мереж', 'Рекомендації на грахах', 'Масштабування графових обчислень (DGL, PyG)', 'Графові бази даних (Neo4j)', 'Запити Cypher у Neo4j', 'Побудова графу знань (Knowledge Graph)', 'Графи знань для RAG систем', 'Аналіз біологічних мереж', 'Аналіз транспортних потоків', 'Детекція аномалій на грахах', 'Аналіз цитування та наукових зв\'язків', 'Сучасний стан Graph AI'
        ]
      },
      {
        id: "optim",
        title: "19. Оптимізація та дослідження операцій",
        text: "Ви навчитеся розв'язувати комплексні задачі планування, логістики, оптимального розподілу обмежених ресурсів та оптимізації портфелю за допомогою методів лінійного, цілочисельного та нелінійного програмування. Фундаментальні знання з матаналізу (множники Лагранжа, умови KKT, оптимізація функцій) допоможуть формалізувати обмеження задач, а програмування на Python дозволить розв'язувати ці моделі за допомогою бібліотек SciPy та Google OR-Tools.",
        prefix: "optim",
        steps: [
          'Вступ до дослідження операцій', 'Математичне моделювання проблем', 'Лінійне програмування (LP)', 'Симплекс-метод', 'Цілочисельне лінійне програмування (MILP)', 'Оптимізація з бібліотекою SciPy', 'Використання PuLP на Python', 'Нелінійне програмування (NLP)', 'Метод множників Лагранжа', 'Оптимізація без обмежень', 'Умови Каруша-Куна-Такера (KKT)', 'Опукла оптимізація (Convex)', 'Методи внутрішньої точки', 'Евристичні алгоритми (Генетичні)', 'Імітація відпалу (Simulated Annealing)', 'Мультикритеріальна оптимізація', 'Динамічне програмування', 'Задача комівояжера (TSP)', 'Оптимізація логістики та маршрутів (VRP)', 'Планування виробництва та ресурсів', 'Оптимізація портфелю активів', 'Стохастичне програмування', 'Керування запасами (Inventory)', 'Теорія розкладу (Scheduling)', 'Розрахунок оптимальних тарифів', 'Оптимізація ланцюгів постачання', 'Чисельні методи для великих задач', 'Аналіз чутливості рішень', 'Пакет розв\'язання Google OR-Tools', 'Сучасні проблеми дослідження операцій'
        ]
      },
      {
        id: "ethics",
        title: "20. Етика ШІ та управління даними",
        text: "Цей блок присвячений безпечному та етичному використанню ШІ: аналізу упередженості алгоритмів (Fairness), пояснювальному ШІ (LIME, SHAP), приватності даних (GDPR, Differential Privacy) та безпеці мовних моделей (Prompt Red Teaming). Знання машинного та глибокого навчання допоможуть проводити аудит рішень моделей, знання генеративного ШІ дозволять створювати системи захисту LLM від атак, а розуміння етичних норм забезпечить побудову відповідальних та прозорих ШІ-систем.",
        prefix: "ethics",
        steps: [
          'Вступ до етики ШІ', 'Упередженість алгоритмів (Algorithmic Bias)', 'Джерела дискримінації в даних', 'Метрики справедливості моделей (Fairness)', 'Методи зменшення упередженості (De-biasing)', 'Пояснювальний ШІ (XAI)', 'Методи LIME та SHAP', 'Прозорість та відтворюваність моделей', 'Конфіденциальність даних (Privacy)', 'Диференційна приватність (Differential Privacy)', 'Federated Learning', 'Захист персональних даних (GDPR, CCPA)', 'Законодавство про ШІ (EU AI Act)', 'Атаки на моделі (Adversarial Attacks)', 'Захист моделей від отруєння даних', 'Атаки на викрадення моделей (Inversion)', 'Інформаційна безпека ML пайплайнів', 'Екологічний след ШІ (Carbon footprint)', 'Вплив автоматизації на ринок праці', 'Дилеми автономних систем', 'Створення гайдлайнів відповідального ШІ', 'Документування моделей (Model Cards)', 'Аудит алгоритмів третіми сторонами', 'Ризики використання Generative AI', 'Боротьба з Deepfakes та дезінформацією', 'Управління даними (Data Governance)', 'Роль людини у конвеєрі прийняття рішень', 'Корпоративна етика використання ШІ', 'Безпека LLM (Prompt Red Teaming)', 'Перспективи безпечного штучного інтелекту'
        ]
      }
,
  {
    "id": "osint",
    "title": "21. OSINT та розвідка з відкритих джерел",
    "text": "У цьому блоці ви опануєте методології та інструменти розвідки з відкритих джерел (OSINT): геолокацію за супутниковими та земними фотознімками, витяг та аналіз метаданих (EXIF), моніторинг транспортних та морських трекерів (ADS-B, AIS), виявлення фейків та дезінформації, а також роботу з відкритими реєстрами та аналітику в Telegram/Social Media. Навички з Python, веб-скрейпінгу та аналізу тексту допоможуть вам автоматизувати збір розвідувальних даних та будувати карти взаємозв'язків.",
    "prefix": "osint",
    "steps": [
      "Вступ до OSINT та методологія",
      "Етика, правові норми та OPSEC",
      "Пошукові оператори (Google Dorks)",
      "Аналіз метаданих файлів (EXIF, ExifTool)",
      "Геолокація за фото та відео",
      "Розвідка в соціальних мережах (SOCMINT)",
      "Аналіз Telegram-каналів та чатів",
      "Відстеження повітряного руху (ADS-B Exchange, Flightradar24)",
      "Відстеження морських суден (AIS, MarineTraffic)",
      "Супутникові знімки високої роздільності (Sentinel, Planet)",
      "Робота з виявленням змін на супутникових знімках (Change Detection)",
      "Виявлення пожеж та теплових аномалій (FIRMS / NASA)",
      "Перевірка достовірності відео та зображень (Verification)",
      "Боротьба з дезінформацією та глибокими фейками (Deepfakes)",
      "Пошук у візуальних базах (Reverse Image Search, PimEyes)",
      "Автоматизація збору даних на Python (Scraping & APIs)",
      "Розвідка корпоративних реєстрів та доменів (WHOIS, DNS)",
      "Графовий аналіз зв'язків у OSINT (Maltego, SpiderFoot)",
      "Виявлення витоків даних та Dark Web",
      "Робота з геологічними та топографічними картами",
      "Геолокація за тінями та положенням сонця (SunCalc)",
      "Аналіз транспортної логістики з відкритих джерел",
      "Моніторинг радіочастотного спектру з відкритих WebSDR",
      "Архівування веб-сторінок (Wayback Machine, Archive.today)",
      "Створення інтерактивних OSINT-карт (OSM, Felt, QGIS)",
      "Автоматичне сповіщення про події (Webhooks & Bots)",
      "Використання LLM для узагальнення розвідувальних звітів",
      "Оцінка шкоди та супутникова аналітика збитків (BDA)",
      "Документування та стандарти звітності OSINT",
      "Підсумковий комплексний OSINT-кейс"
    ]
  },
  {
    "id": "gis",
    "title": "22. Геопросторова аналітика та GIS",
    "text": "Ви навчитеся обробляти просторові дані, супутникові знімки та векторні карти за допомогою QGIS, бібліотек GDAL, GeoPandas, Shapely та PostGIS. Ви опануєте розрахунки топографічних індексів (NDVI, NDWI), побудову цифрових моделей рельєфу (DEM/DTM), аналіз видимості (Viewshed Analysis) та розрахунок прохідності місцевості для військової техніки.",
    "prefix": "gis",
    "steps": [
      "Вступ до ГІС (GIS) та геопросторових даних",
      "Системи координат та проекції (EPSG, WGS84)",
      "Векторні дані (Points, Lines, Polygons)",
      "Растрові дані та супутникові канали",
      "Робота в середовищі QGIS",
      "Просторові бази даних (PostGIS / SpatiaLite)",
      "Бібліотека GeoPandas на Python",
      "Геометричні операції з Shapely та Fiona",
      "Робота з растрами через GDAL / Rasterio",
      "Цифрові моделі рельєфу (DEM, DTM, DSM)",
      "Розрахунок кутів нахилу та експозиції схилів (Slope, Aspect)",
      "Аналіз видимості та зон спостереження (Viewshed Analysis)",
      "Вегетаційні індекси (NDVI, EVI)",
      "Водні індекси та виявлення затоплень (NDWI)",
      "Аналіз прохідності території (Off-road Trafficability)",
      "Просторова інтерполяція (Kriging, IDW)",
      "Теплові карти та оцінка щільності (Kernel Density)",
      "Побудова оптимальних просторових маршрутів (Network Analysis)",
      "Виявлення аномалій на геоданих",
      "Супутникові радари Synthetic Aperture Radar (SAR)",
      "Обробка даних лідарного сканування (LiDAR)",
      "Автоматичне деформування та геометрична корекція",
      "Класифікація покрову землі (Land Cover Classification)",
      "Візуалізація карт на pydeck та Folium",
      "Геопросторові серверні веб-сервіси (WMS, WFS)",
      "Робота з платформою Google Earth Engine (GEE)",
      "Автоматизація ГІС-пайплайнів у коді",
      "Просторова прив'язка растрових карт (Georeferencing)",
      "Топографічний аналіз для планування операцій",
      "Комплексний геопросторовий аналітичний проект"
    ]
  },
  {
    "id": "uav_cv",
    "title": "23. Комп'ютерний зір для БПЛА",
    "text": "Блок присвячений адаптації алгоритмів комп'ютерного зору для задач аерозйомки та дронів. Ви навчитеся виявляти та класифікувати об'єкти на кадрах під довільними кутами (Oriented Bounding Boxes), працювати з оптичними та тепловізійними (IR) відеопотоками, застосовувати трекери об'єктів в умовах тремтіння камери та проводити автоматичний відбір ключових кадрів.",
    "prefix": "uav_cv",
    "steps": [
      "Особливості відеопотоку з аероплатформ",
      "Робота з RTSP / UDP відеопотоками з БПЛА",
      "Попередня обробка та стабілізація відео",
      "Орієнтовані обмежувальні рамки (Oriented Bounding Boxes - OBB)",
      "Детекція малорозмірних об'єктів з висоти",
      "Навчання YOLO на аерофотознімках (VisDrone dataset)",
      "Робота з тепловізійними зображеннями (Infrared / Thermal CV)",
      "Суміщення оптичного та тепловізійного каналів (Fusion)",
      "Відстеження об'єктів на відео з рухомої камери",
      "Алгоритми KCF, CSRT та DeepSORT для БПЛА",
      "Виявлення руху на аеровідео (Moving Object Detection)",
      "Сегментація маскування та прихованих об'єктів",
      "Детекція змін на місцевості з висоти (Aerial Change Detection)",
      "Розпізнавання типів транспортної та спецтехніки",
      "Оцінка координат об'єкта за кадром та телеметрією",
      "Робота з кутами камери (Yaw, Pitch, Roll) та геоприв'язка",
      "Детекція злітно-посадкових смуг та майданчиків",
      "Оцінка щільності та підрахунок скупчень",
      "Виявлення перешкод під час польоту (Obstacle Detection)",
      "Оптичний потік для оцінки власного руху (Visual Odometry)",
      "Детекція та розпізнавання номерних знаків/маркувань",
      "Автоматична якість кадру та видалення розмиття (Deblur)",
      "Генерація панорамних знімків з відеопотоку (Stitching)",
      "Оптимізація CNN для роботи в реальному часі на борту",
      "Робота з бібліотекою Ultralytics та OpenCV",
      "Synthetic Data generation для аерозйомки",
      "Захист моделей від зорових завад та бліків",
      "Метрики оцінки детекції з повітря (mAP@0.5:0.95)",
      "Побудова автономного конвеєра обробки кадру",
      "Фінальний проект детекції та супроводу об'єкта"
    ]
  },
  {
    "id": "autonav",
    "title": "24. Автономна навігація та робототехніка",
    "text": "Ви вивчите алгоритми та математику, які дозволяють роботам та БПЛА орієнтуватися у просторі без супутникової навігації (GPS-denied environment). Ви опануєте картографування та локалізацію SLAM, роботу з інерціальними датчиками (IMU), візуальну одометрію, плани побудови траєкторій та алгоритми уникнення зіткнень.",
    "prefix": "autonav",
    "steps": [
      "Вступ до автономної навігації та робототехніки",
      "Фізичні основи руху у 3D просторі (Kinematics)",
      "Робота з датчиками: Інерціальні вимірювальні блоки (IMU)",
      "Комплексування датчиків: Фільтр Калмана (KF, EKF)",
      "Проблема відсутності супутникового сигналу (GPS-denied)",
      "Концепція SLAM (Simultaneous Localization and Mapping)",
      "Visual SLAM: Використання монокулярних та стереокамер",
      "Visual-Inertial Odometry (VIO)",
      "Комп'ютерне стереобачення та картографування глибини",
      "Побудова карти сітки зайнятості (Occupancy Grid Maps)",
      "3D хмари точок (Point Clouds) та їх обробка (PCL)",
      "Планування шляху у просторі (Global Path Planning: A*, RRT)",
      "Локальне оминання перешкод (Local Obstacle Avoidance)",
      "Система керування польотом (Flight Controller Architecture)",
      "Протоколи зв'язку датчиків (Mink, MAVLink, CAN bus)",
      "Вступ до операційної системи роботів (ROS 2)",
      "Створення вузлів та топіків у ROS 2",
      "Симуляція роботів у Gazebo / Isaac Sim",
      "Моделювання аеродинаміки та фізики польоту",
      "Алгоритми точної посадки (Precision Landing)",
      "Навігація за орієнтирами та заздалегідь знятою картою",
      "Автономні наземні роботизовані комплекси (UGV)",
      "Робота з ультразвуковими та лідарними віддалемірами",
      "Контролери траєкторії (PID-регулятори)",
      "Робастне керування в умовах вітрових завад",
      "Поведінкові дерева (Behavior Trees) для роботів",
      "Алгоритми групової взаємодії (Swarm Intelligence)",
      "Оцінка стану батареї та безпечний повернення (RTL)",
      "Апаратні обчислювачі для бортових систем",
      "Підсумковий проект побудови автономного маршруту"
    ]
  },
  {
    "id": "sigint",
    "title": "25. Радіоелектронна розвідка та обробка сигналів",
    "text": "Блок присвячений цифровій обробці сигналів (DSP) та аналізу радіочастотного спектру. Ви навчитеся аналізувати радіосигнали, проводить спектральний аналіз (Швидке перетворення Фур'є - FFT), ідентифікувати види модуляції (AM, FM, PSK, FSK), визначати напрямок на джерело випромінювання (Пеленгація / Direction Finding) та декодувати цифрові радіопротоколи за допомогою SDR.",
    "prefix": "sigint",
    "steps": [
      "Вступ до радіоелектронної розвідки (SIGINT / COMINT)",
      "Природа електромагнітних хвиль та радіочастотний спектр",
      "Аналогові та цифрові сигнали у часові та частотній областях",
      "Швидке перетворення Фур'є (FFT) та спектрограми",
      "Дискретизація сигналів та теорема Котельникова-Найквіста",
      "Вступ до програмно-визначеного радіо (Software Defined Radio - SDR)",
      "Робота з пристроями RTL-SDR, HackRF, USRP",
      "Програмне середовище GNU Radio (Flowgraphs)",
      "Аналіз IQ-даних (In-phase & Quadrature signals)",
      "Види аналогової модуляції (AM, FM, SSB)",
      "Види цифрової модуляції (ASK, FSK, PSK, QAM)",
      "Автоматична класифікація видів модуляції за допомогою ML",
      "Виявлення радіосигналів на фоні шумів (Energy Detection)",
      "Фільтрація сигналів (FIR, IIR фільтри)",
      "Радіопеленгація та визначення кута приходу (AoA / DoA)",
      "Алгоритми пеленгації MUSIC та ESPRIT",
      "Триангуляція джерела випромінювання за кількома постами",
      "Вимірювання різниці часу приходу сигналу (TDOA)",
      "Аналіз широкосмугових сигналів та стрибкоподібного перелаштування (FHSS)",
      "Декодування цифрових радіопротоколів (DMR, P25, LoRA)",
      "Виявлення сигналів пунктів управління та відеопередавачів",
      "Аналіз спектральної щільності потужності (PSD)",
      "Автоматичний моніторинг радіоефіру та логування сплесків",
      "Видалення завад та адаптивна фільтрація",
      "Створення баз даних сигнатур радіовипромінювань",
      "Робота з аналізаторами спектру та осцилографами",
      "Виявлення радіомаяків та несанкціонованих передавачів",
      "Обробка аналогового та цифрового відеосигналу з ефіру",
      "Захист власного радіовипромінювання та маскування",
      "Підсумковий проект аналізу та пеленгації джерела сигналу"
    ]
  },
  {
    "id": "ew",
    "title": "26. Радіоелектронна боротьба (РЕБ)",
    "text": "Ви вивчите принципи та математичні моделі радіоелектронної боротьби (РЕБ/EW): придушення каналів зв'язку та навігації, створення навмисних радіозавад (Jammers), підміна супутникових сигналів (Spoofing), оцінку енергетичного бюджету радіолінії та алгоритми адаптивного захисту від завад.",
    "prefix": "ew",
    "steps": [
      "Філософія та задачі радіоелектронної боротьби (РЕБ / EW)",
      "Класифікація систем РЕБ: РЕП (Придушення) та РЕЗ (Захист)",
      "Математична модель поширення радіохвиль (Path Loss Models)",
      "Енергетичний бюджет радіолінії (Link Budget Calculation)",
      "Коефіцієнт підсилення антен та діаграми спрямованості",
      "Типи радіозавад: Загороджувальні, прицільні, ковзні",
      "Співвідношення сигнал/завада (Signal-to-Jamming Ratio - SJR)",
      "Придушення каналів супутникової навігації (GPS/GNSS Jamming)",
      "Імітаційні завади та підміна координат (GNSS Spoofing)",
      "Способи виявлення фактів супутникового спуфінгу",
      "Придушення каналів управління БПЛА (2.4 GHz, 5.8 GHz, ExpressLRS)",
      "Придушення аналогових та цифрових відеоканалів",
      "Адаптивні системи антенних решіток (CRPA - Controlled Radiation Pattern Antennas)",
      "Алгоритми цифрового формування променя (Digital Beamforming)",
      "Виявлення роботи завадових станцій протиповітряної оборони",
      "Спектральний аналіз динамічних завад у реальному часі",
      "Технології розширення спектру (DSSS, FHSS) для протидії РЕБ",
      "Псевдовипадкова перебудова робочої частоти (ППРЧ)",
      "Автоматичний вибір найменш зашумлених каналів зв'язку",
      "Оцінка ефективної площі розсіювання (ЕПР / RCS)",
      "Радіолокаційні завади та пасивні відбивачі (Дипольні завади)",
      "Моделювання станцій РЕБ у лабораторних середовищах",
      "Оцінка зони ефективного прикриття РЕБ",
      "Імпульсно-електромагнітна протидія",
      "Розрахунок теплового навантаження та живлення систем РЕБ",
      "Вплив РЕБ на власні системи зв'язку (Self-jamming / Electromagnetic Compatibility)",
      "Алгоритми захисту каналів передачі даних від викривлень",
      "Використання directional (спрямованих) антен для стійкості",
      "Моніторинг та оцінка результативності застосування РЕБ",
      "Підсумковий розрахунковий проект оцінки стійкості радіолінії"
    ]
  },
  {
    "id": "ballistics",
    "title": "27. Теорія балістики та прикладна математика",
    "text": "Блок присвячений фізико-математичному моделюванню балістичних процесів. Ви опануєте рівняння внутрішньої та зовнішньої балістики, розрахунок деривації, опір повітря (функції drag G1/G7), врахування метеорологічних поправок (вітер, температура, тиск), сили Коріоліса та побудову обчислювальних балістичних калькуляторів.",
    "prefix": "ballistics",
    "steps": [
      "Вступ до прикладної та математичної балістики",
      "Внутрішня балістика: Тиск порохових газів та початкова швидкість",
      "Проміжна та зовнішня балістика",
      "Сили, що діють на снаряд у польоті (Тяжіння, Опір повітря)",
      "Моделі закону опору повітря (Стандартні функції G1, G7)",
      "Балістичний коефіцієнт (BC) та коефіцієнт формы (Form Factor)",
      "Диференціальні рівняння руху матеріальної точки",
      "Чисельне інтегрування траєкторій (Метод Ейлера, Рунге-Кутти 4-го порядку)",
      "Вплив щільності повітря, температури та атмосферного тиску",
      "Врахування швидкості та напрямку вітру (Crosswind & Headwind)",
      "Вертикальні та горизонтальні балістичні поправки",
      "Гіроскопічна стабілізація та обертання снаряда",
      "Явище деривації (Дериваційний зсув)",
      "Вплив обертання Землі: Сила Коріоліса та Етвеша",
      "Кут піднесення та дальність стрільби",
      "Прямий постріл та максимальна висота траєкторії (Апогей)",
      "Термінальна балістика: Швидкість та кут зустрічі з ціллю",
      "Балістичні таблиці та алгоритми їх швидкого пошуку",
      "Розробка балістичного калькулятора на Python",
      "Розрахунок геодезичних відстаней та азимутів (Вінченті, Гаверсинус)",
      "Переведення кутових одиниць (Тисячні, MOA, Mils, Градуси)",
      "Врахування перевищення позиції цілі (Look Angle / Angle modified trajectory)",
      "Балістика керованих та корегованих боєприпасів",
      "Оцінка імовірнісного відхилення (Кругове імовірне відхилення - КВО / CEP)",
      "Аналіз еліпса розсіювання пострілів",
      "Врахування зносу ствола та температури заряду",
      "Автоматична корекція вогню за даними спостереження",
      "Калібрування балістичних моделей за даними реальних відстрілів",
      "Оптимізація обчислень для роботи на бортових комп'ютерах",
      "Підсумковий проект створення розрахункового балістичного модуля"
    ]
  },
  {
    "id": "uav_data",
    "title": "28. Аналіз даних з БПЛА та телеметрії",
    "text": "Ви навчитеся працювати з логами польотів, телеметричними даними сенсорів та протоколами польотних контролерів (PX4, ArduPilot). Блок охоплює аналіз часових рядів IMU, оцінку вібрацій, моніторинг енергоспоживання, детекцію відмов обладнання у повітрі та автоматизоване створення аналітичних звітів після польоту.",
    "prefix": "uav_data",
    "steps": [
      "Структура телеметричних даних БПЛА",
      "Протоколи та формати логів (MAVLink, ULog, Dataflash .bin)",
      "Парсинг польотних логів на Python (pyulog, pymavlink)",
      "Аналіз часових рядів датчиків (Акселерометр, Гіроскоп, Барометр)",
      "Аналіз вібрацій та спектральна оцінка (FFT логів)",
      "Налаштування та аналіз notch-фільтрів польотного контролера",
      "Моніторинг роботи батареї та розрахунок споживання струму",
      "Аналіз якості роботи GPS та супутникових сузір'їв (HDOP, VDOP)",
      "Оцінка точності утримання висоти та курсу",
      "Аналіз команд розрахунку проти реальної траєкторії (Setpoints vs Actual)",
      "Виявлення аномалій у польотних логах (Anomaly Detection)",
      "Детекція втрати зв'язку та спрацьовування захисних режимів (Failsafe)",
      "Автоматичний розрахунок пройденої відстані та ефективності польоту",
      "Побудова 3D траєкторій польоту на картах (KML, CZML, Cesium)",
      "Аналіз ефективності аеродинамічних поверхонь та моторів",
      "Прогнозування залишкового ресурсу компонентів (Predictive Maintenance)",
      "Створення автоматизованих дашбордів польотів (Streamlit/Dash)",
      "Збереження та індексація логів у базах даних (PostgreSQL, TimescaleDB)",
      "Виявлення збоїв сенсорів (Sensor Failure Detection)",
      "Порівняльний аналіз логів різних польотів та модифікацій",
      "Моніторинг температурних режимів регуляторів та двигунів",
      "Аналіз логів відеосигналу та якості зв'язку в польоті",
      "Автоматична генерація польотних звітів після посадки",
      "Інтеграція польотних логів з геопросторовими даними (GIS)",
      "Робота з хмарними платформами аналізу логів (FlightReview)",
      "Аналіз безпеки польотних завдань та дотримання польотного плану",
      "Оцінка впливу вітру на витрату енергії",
      "Виявлення моментів зовнішнього фізичного чи РЕБ впливу",
      "Захист та шифрування польотних логів",
      "Підсумковий проект побудови аналітичного середовища польотних логів"
    ]
  },
  {
    "id": "atr_ai",
    "title": "29. Штучний інтелект для розпізнавання цілей (ATR)",
    "text": "Ви опануєте методи створення систем автоматичного розпізнавання цілей (Automated Target Recognition - ATR) на базі мультиспектральних даних (оптика, ІЧ, SAR). Ви вивчите алгоритми комплексування даних з різних сенсорів (Sensor Fusion), боротьбу з помилковими спрацьовуваннями, оцінку ступеня впевненості моделей та захист ШІ від візуального маскування.",
    "prefix": "atr_ai",
    "steps": [
      "Вступ до автоматичного розпізнавання цілей (ATR)",
      "Особливості військових датасетів та специфіка класів",
      "Мультиспектральні дані (Visible, Thermal, SAR, Multispectral)",
      "Попередня обробка та вирівнювання кадрів з різних датчиків",
      "Комплексування даних на рівні пікселів (Pixel-level Sensor Fusion)",
      "Комплексування на рівні ознак (Feature-level Fusion)",
      "Комплексування на рівні рішень (Decision-level Fusion, Dempster-Shafer)",
      "Детекція цілей у складних умовах (Туман, Ніч, Дим)",
      "Боротьба з візуальним маскуванням та дезорієнтуючими сітками",
      "Детекція хибних макетів та хибних цілей (Decoy Detection)",
      "Класифікація стану об'єкта (Активний, Пошкоджений, Знешкоджений)",
      "Ієрархічні класифікатори (Категорія -> Тип -> Модель)",
      "Оцінка ракурсу та орієнтації об'єкта у просторі (Pose Estimation)",
      "Зменшення швидкості хибних тривог (False Alarm Rate - FAR)",
      "Калібрування ймовірностей та ступеня впевненості (Confidence Calibration)",
      "Специфіка обробки знімків радіолокаторів із синтезованою апертурою (SAR ATR)",
      "Виявлення змін на базі підходів Siamese Networks",
      "Оцінка пріоритетності знайдених цілей (Target Prioritization)",
      "Побудова систем реального часу з низькою затримкою (Low-latency ATR)",
      "Навчання моделей на синтетичних 3D рендерах (Unreal Engine / Blender)",
      "Довчання моделей в умовах обмеженої кількості реальних знімків (Few-shot)",
      "Бортова розвідка цілей на Edge-пристроях",
      "Оцінка стійкості моделей до завад та оптичного спотворення",
      "Інтерпретованість рішень моделей ATR (Grad-CAM, Saliency Maps)",
      "Формування формалізованого розвідувального сповіщення (Target Report)",
      "Інтеграція ATR з системами геопросторових карт",
      "Тестування на стійкість до Adversarial Attacks",
      "Неперервне донавчання моделей (Continual Learning)",
      "Стандарти оцінки систем ATR",
      "Підсумковий проект розробки мультиспектрального модулю ATR"
    ]
  },
  {
    "id": "cyber_intel",
    "title": "30. Кіберрозвідка та захист інфраструктури",
    "text": "Ви навчитеся аналізувати загрози інформаційній безпеці (Threat Intelligence), досліджувати шкідливе ПЗ, виявляти аномалії в мережевому трафіку, працювати з SIEM-системами, розслідувати кіберінциденти (Digital Forensics) та будувати системи захисту критичної інфраструктури.",
    "prefix": "cyber_intel",
    "steps": [
      "Вступ до кіберрозвідки (Threat Intelligence / CTI)",
      "Тактики, техніки та процедури зловмисників (MITRE ATT&CK Framework)",
      "Збір індикаторів компрометації (IoC: IP, Hashes, Domains)",
      "Формати обміну розвідувальними даними (STIX / TAXII)",
      "Аналіз мережевого трафіку (Wireshark, Tshark, Zeek)",
      "Виявлення аномалій у мережі (Network Intrusion Detection Systems - NIDS)",
      "Робота з аналізатором Suricata / Snort",
      "Моніторинг системних логів (SIEM: Elastic Stack, Splunk)",
      "Аналіз загроз для критичної інфраструктури (ICS / SCADA)",
      "Вступ до цифрової криміналістики (Digital Forensics)",
      "Аналіз дампів оперативної пам'яті (Volatility Framework)",
      "Дослідження командних серверів (C2 Infrastructure Tracking)",
      "Виявлення сканування мережі та підбору паролів",
      "Основи зворотної розробки (Reverse Engineering)",
      "Статичний та динамічний аналіз файлів (Cuckoo Sandbox)",
      "Написання правил сигнатур YARA",
      "Розвідка впевнених загроз (APT Groups)",
      "Захист веб-ресурсів та API (WAF, DDoS Protection)",
      "Виявлення витоків облікових даних та сесій",
      "Аналіз безпеки бездротових та радіомереж",
      "Концепція нульової довіри (Zero Trust Architecture)",
      "Автоматизація реагування на інциденти (SOAR)",
      "Аналіз безпеки прошивок пристроїв (Firmware Security)",
      "Захист хмарних середовищ (Cloud Security)",
      "Виявлення прихованих каналів витоку даних (Covert Channels)",
      "Моделювання загроз для складних систем (STRIDE model)",
      "Оцінка вразливостей (Vulnerability Assessment & CVE)",
      "Криміналістичний аналіз логів веб-серверів та баз даних",
      "Побудова Центру операцій безпеки (SOC)",
      "Підсумковий проект аналізу та курування інциденту безпеки"
    ]
  },
  {
    "id": "mil_logistics",
    "title": "31. Військова логістика та ланцюги постачання",
    "text": "Ви навчитеся застосовувати математичне моделювання, аналіз даних та дослідження операцій для оптимізації військової логістики: планування маршрутів доставки (VRP), керування складами та запасами, оптимізації витрат палива, ротації матеріально-технічних засобів та прогнозування потреб у матеріальному забезпеченні.",
    "prefix": "mil_logistics",
    "steps": [
      "Вступ до військової логістики та Supply Chain Management",
      "Особливості військових ланцюгів постачання в умовах невизначеності",
      "Моделювання потреб та нормування витрат (Supply Demand Forecasting)",
      "Задача комбінаторної оптимізації маршрутів (Vehicle Routing Problem - VRP)",
      "Врахування обмежень безпеки та прохідності при побудові маршрутів",
      "Оптимізація завантаження транспортних засобів (3D Container Packing Problem)",
      "Моделювання складових складських запасів (Safety Stock Calculation)",
      "Моделі управління запасами (EOQ, Min-Max Inventory)",
      "Оптимізація розташування розподільчих центрів та хабів (Facility Location)",
      "Аналіз ризиків вузлів ланцюга постачання (Supply Chain Bottlenecks)",
      "Моделювання витрат пально-мастильних матеріалів (ПММ)",
      "Автоматизація обліку майна та штрихкодування/RFID",
      "Прогнозування технічного обслуговування техніки (Fleet Maintenance ML)",
      "Графові моделі логістичних мереж",
      "Задача про максимальний потік у мережі (Max-Flow Min-Cut)",
      "Оптимізація мультимодальних перевезень (Залізниця, Авто, Авіа)",
      "Моніторинг логістичних колонів у реальному часі",
      "Розрахунок часу доставки з урахуванням ймовірнісних затримок",
      "Імітаційне моделювання логістичних процесів (AnyLogic / SimPy)",
      "Планування евакуації та медичної логістики (MedEvac Optimization)",
      "Розрахунок норми боєкомплекту та постачання боєприпасів",
      "Автоматичне формування логістичних нарядів та відомостей",
      "Побудова логістичних дашбордів у реальному часі",
      "Захист логістичних даних та запобігання витоку маршрутів",
      "Оптимізація використання людських ресурсів та ротацій",
      "Керування логістикою у критичних умовах пошкодження інфраструктури",
      "Використання безпілотних систем для доставки (Drone Delivery Logistics)",
      "Оцінка вартості та ефективності логістичних операцій",
      "Резервування та дублювання критичних маршрутів",
      "Підсумковий проект розрахунку логістичної карти забезпечення"
    ]
  },
  {
    "id": "c2_systems",
    "title": "32. Аналіз мереж та ситуаційна обізнаність (C2)",
    "text": "Ви опануєте архітектуру систем управління та зв'язку (Command and Control - C2), принципи формування єдиної карти оперативної обстановки (Common Operational Picture - COP), графовий аналіз тактичних мереж, інтеграцію даних з багатьох джерел та протоколи обміну обстановкою у реальному часі.",
    "prefix": "c2_systems",
    "steps": [
      "Концепція систем управління та зв'язку (C2 / C4ISR)",
      "Принципи формування єдиної карти обстановки (Common Operational Picture - COP)",
      "Формати та стандарти обміну обстановкою (MIL-STD-2525, APP-6, CoT)",
      "Відображення тактичних знаків та умовних позначень у коді",
      "Агрегація треків та повідомлень від багатьох спостерігачів",
      "Фільтрація дублікатів та дедуплікація спостережень у часі та просторі",
      "Графове моделювання структур підрозділів та зв'язку",
      "Аналіз мережевої зв'язності та стійкості штабних каналів",
      "Ієрархія доступів та розподіл прав перегляду карти",
      "Запити інформації у реальному часі через WebSocket / gRPC",
      "Інтеграція радарних та оптичних треків у C2 систему",
      "Геопросторова часова вісь (Timeline Analysis) для аналізу дій",
      "Автоматична детекція потенційних загроз та небезпечних зближень",
      "Створення сповіщень про події за геозонами (Geofencing Alerts)",
      "Оцінка балансу сил та засобів на напрямках (Correlation of Forces)",
      "Сценарії взаємодії між різними родами військ",
      "Низьколатентні протоколи синхронізації оперативної карти",
      "Робота C2 систем в умовах слабкого та нестабільного зв'язку",
      "Автономні локальні вузли (Edge C2 nodes) з подальшою синхронізацією",
      "Побудова теплових карт активності за історичними даними",
      "Визуальний аналіз зон контролю та сірих зон",
      "Інтеграція аналітики з даних OSINT та БПЛА в єдиний інтерфейс",
      "Оцінка часу реакції системи від виявлення до прийняття рішення",
      "Ергономіка та UX/UI розробка для оперативних чергових",
      "Захист C2 систем від кібератак та маніпуляції даними",
      "Резервування та розподілені бази даних для C2 (CRDT / Raft)",
      "Автоматична розсилка цілевказань (Target Distribution)",
      "Логування всіх дій та рішень для подальшого аналізу (After Action Review)",
      "Інтеграція з системами автоматизованого розрахунку вогню",
      "Підсумковий проект проектування модуля C2 карти"
    ]
  },
  {
    "id": "mil_crypto",
    "title": "33. Захищений зв'язок та криптографія",
    "text": "Ви вивчите принципи побудови захищених систем зв'язку та криптографічного захисту інформації в MilTech: симетричне та асиметричне шифрування, протоколи розподілу ключів, псевдовипадкову перебудову частоти (FHSS), захист від перехоплення та детекції (LPI/LPD) та стійкість до зламу.",
    "prefix": "mil_crypto",
    "steps": [
      "Вступ до криптографії та захищеного зв'язку",
      "Класичні та сучасні симетричні алгоритми (AES-256, ChaCha20)",
      "Асиметрична криптографія (RSA, ECC, Ed25519)",
      "Криптографічні хеш-функції (SHA-256, BLAKE3)",
      "Цифрові підписи та автентифікація повідомлень (HMAC)",
      "Управління криптографічними ключами (Key Management)",
      "Протоколи узгодження ключів (Diffie-Hellman, ECDH)",
      "Концепція Perfect Forward Secrecy (PFS)",
      "Захищені транспортні протоколи (TLS 1.3, Noise Protocol Framework)",
      "Принципи побудови VPN та шифрованих тунелів (WireGuard, IPsec)",
      "Низька ймовірність перехоплення (Low Probability of Intercept - LPI)",
      "Низька ймовірність виявлення (Low Probability of Detection - LPD)",
      "Псевдовипадкова перебудова робочої частоти (FHSS) у коді",
      "Пряме розширення спектру послідовністю (DSSS)",
      "Криптографічний захист каналів зв'язку БПЛА",
      "Захист від атак повторного відтворення (Replay Attack Prevention)",
      "Криптографія на обмежених апаратних ресурсах (Lightweight Crypto)",
      "Захист ключів у енергозалежній пам'яті (Secure Enclaves, TPM)",
      "Фізичне знищення ключів при загрозі захоплення (Zeroization)",
      "Захищене пріоритетне передавання даних (QoS & Encryption)",
      "Квантово-стійка криптографія (Post-Quantum Cryptography)",
      "Аналіз безпеки популярних тактичних протоколів зв'язку",
      "Шифрування мовних даних у реальному часі (Secure Voice / SRTP)",
      "Перевірка цілісності прошивок пристроїв за цифровим підписом",
      "Стеганографія та приховане передавання даних",
      "Бортові криптопроцесори та HSM модулі",
      "Тестування реалізацій криптографії на виток інформації по побічних каналах (Side-channel attacks)",
      "Захист сенсорних мереж (IoT / WSN security)",
      "Аудит коду криптографічних модулів",
      "Підсумковий проект створення шифрованого протоколу зв'язку"
    ]
  },
  {
    "id": "combat_sim",
    "title": "34. Моделювання та симуляція бойових дій",
    "text": "Ви навчитеся використовувати математичні та комп'ютерні моделі для симуляції тактичних сценаріїв: дифрівняння Ланчестера, агентне моделювання (Agent-Based Modeling), оцінку ефективності озброєння, моделювання уражень та аналіз імовірностей успіху операцій методом Монте-Карло.",
    "prefix": "combat_sim",
    "steps": [
      "Вступ до математичного моделювання військових дій",
      "Закони Ланчестера (Линейна та квадратна моделі)",
      "Диференціальні рівняння бойових втрат",
      "Врахування ефективності вогню, укриттів та маскування",
      "Вступ до агентного моделювання (Agent-Based Modeling - ABM)",
      "Створення симуляцій у середовищі MESA (Python) або NetLogo",
      "Правила поведінки агентів та прийняття рішень на полі бою",
      "Моделювання тактичного пересування підрозділів",
      "Оцінка імовірності ураження цілі (Probability of Kill - Pk)",
      "Моделювання протиборства двох сторін (Red vs Blue Simulation)",
      "Метод Монте-Карло для оцінки результатів операцій",
      "Моделювання роботи систем протиповітряної оборони (ППО)",
      "Симуляція масованих атак та виснаження засобів захисту",
      "Моделювання безпілотних роїв (Swarm Tactics Simulation)",
      "Врахування фактора часу, затримок зв'язку та некомплектності даних",
      "Моделювання інженерних загороджень та мінних полів",
      "Оцінка зону ураження та розлітання уламків (Blast & Fragmentation)",
      "Моделювання бойових дій у міських умовах (MOU)",
      "Використання графових моделей для аналізу тактичних рішень",
      "Стохастичні автомати та марківські ланцюги в симуляціях",
      "Калібрування симуляційних моделей за реальними історичними даними",
      "Візуалізація перебігу симуляцій 2D/3D",
      "Оцінка чутливості результатів до змінення параметрів (Sensitivity Analysis)",
      "Симуляція контрбатарейної боротьби",
      "Моделювання логістичного виснаження та поповнення",
      "Використання ігрових рушіїв (Unreal Engine / Unity) для симуляцій",
      "Оцінка ризиків та супутніх збитків (Collateral Damage Estimation)",
      "Підкріплення навчання (Reinforcement Learning) для пошуку тактик",
      "Гібридні числово-агентні моделі",
      "Підсумковий проект побудови симулятора тактичного епізоду"
    ]
  },
  {
    "id": "sensor_fusion",
    "title": "35. Аналіз сенсорів та Sensor Fusion",
    "text": "Ви вивчите математику та алгоритми об'єднання даних (Sensor Fusion) від багатьох різнорідних датчиків: радарів, оптичних камер, тепловізорів, акустичних сенсорів та інерціальних систем. Блок охоплює розширений фільтр Калмана (EKF, UKF), фільтри частинок (Particle Filters), співвіднесення спостережень (Data Association) та побудову високоточного трекінгу цілей.",
    "prefix": "sensor_fusion",
    "steps": [
      "Концепція Sensor Fusion (Синтез даних сенсорів)",
      "Класифікація сенсорів: Активні та пасивні, оптичні, радіо, акустичні",
      "Проблема неузгодженості частот та затримок відносно часу",
      "Синхронізація часових позначок (Timestamp Alignment)",
      "Просторова калібровка та суміщення систем координат сенсорів",
      "Лінійний фільтр Калмана (Kalman Filter - KF)",
      "Розширений фільтр Калмана (Extended Kalman Filter - EKF)",
      "Сигма-точковий фільтр Калмана (Unscented Kalman Filter - UKF)",
      "Фільтри частинок (Particle Filters / Sequential Monte Carlo)",
      "Проблема співвіднесення даних від багатьох сенсорів (Data Association)",
      "Алгоритм найближчого сусіда (Nearest Neighbor Data Association)",
      "Алгоритм глобального оптимального призначення (Hungarian Algorithm)",
      "Алгоритми Joint Probabilistic Data Association (JPDA)",
      "Багатогіпотезний трекінг цілей (Multiple Hypothesis Tracking - MHT)",
      "Об'єднання оптичного відео з даними радарів",
      "Об'єднання даних ІЧ-камери та лазерного віддалеміра",
      "Трекінг декількох цілей у реальному часі (Multi-Target Tracking)",
      "Моделювання динамики цілей (Constant Velocity, Constant Acceleration)",
      "Моделювання маневруючих цілей (Interacting Multiple Model - IMM)",
      "Оцінка точності та коваріаційної матриці помилок",
      "Виявлення та відсіювання аномальних вимірів (Outlier Rejection)",
      "Комплексування даних бортових та наземних сенсорів",
      "Оцінка надійності окремих сенсорів та відключення збійних",
      "Бортова реалізація Sensor Fusion на C++ / Python",
      "Використання бібліотек Robot Localization та FilterPy",
      "Fusion даних в умовах активних завад РЕБ",
      "Оцінка просторової роздільної здатності синтезованої карти",
      "Застосування Deep Learning для комплексування ознак",
      "Стандарти оцінки систем супроводу та комплексування",
      "Підсумковий проект створення модуля Sensor Fusion"
    ]
  },
  {
    "id": "acoustic_intel",
    "title": "36. Акустична розвідка та детекція",
    "text": "Ви навчитеся працювати з звуковими даними для задач детекції та локалізації: аналіз сигналів мікрофонних решіток, триангуляція пострілів та вибухів за різницею часу приходу хвилі (TDOA), спектрограмний аналіз звуків двигунів (БПЛА, техніка) та побудова акустичних сенсорних мереж.",
    "prefix": "acoustic_intel",
    "steps": [
      "Фізика звукових хвиль в атмосфері та акустичні датчики",
      "Оцифровка аудіосигналу: Частота дискретизації, квантування",
      "Цифрова обробка аудіо (DSP): Фільтрація шумів та луни",
      "Спектральний аналіз аудіо: STFT та Мел-спектрограми",
      "Детекція коротких імпульсних звуків (Постріли, Вибухи)",
      "Вимірювання різниці часу приходу сигналу (TDOA)",
      "Геометрія мікрофонних решіток (Linear, Circular, Planar Arrays)",
      "Алгоритми визначення напрямку на джерело звуку (GCC-PHAT)",
      "Триангуляція джерела вибуху за даними кількох акустичних постів",
      "Врахування швидкості звуку, температури та вітру в розрахунках",
      "Акустична детекція двигунів БПЛА (Shahed, FPV та ін.)",
      "Навчання CNN класифікаторів на Мел-спектрограмах аудіо",
      "Розпізнавання сигнатур звуків важкої техніки та гелікоптерів",
      "Придушення фонового шуму довкілля (Вітер, Дощ, Птахи)",
      "Акустичний аналіз ударних хвиль (Shockwaves) від кулеметів/снарядів",
      "Оцінка відстані до джерела за затримкою між спалахом та звуком",
      "Розробка автовизначника звукових подій на базі Librosa",
      "Робота з акустичними сенсорами на мікроконтролерах (ESP32, STM32)",
      "Мережева синхронізація часу мікрофонних постів (NTP / PTP)",
      "Оптимізація обчислень акустичного аналізу для низької енергозатратності",
      "Зниження сили хибних спрацьовувань акустичних систем",
      "Пасивна локалізація без випромінювання сигналів",
      "Оцінка траєкторії польоту об'єкта за ефектом Доплера",
      "Візуалізація акустичної обстановки на карті",
      "Захист мікрофонів від вітрових завад (Акустичний захист)",
      "Потоковий аналіз аудіо через WebSockets у реальному часі",
      "Виявлення акустичних завад та генераторів білого шуму",
      "Поєднання акустичних та оптичних датчиків спостереження",
      "Випробування та калібрування акустичних систем у полі",
      "Підсумковий проект розробки акустичного детектора подій"
    ]
  },
  {
    "id": "mil_meteo",
    "title": "37. Метеорологічні дані та аналіз умов",
    "text": "Ви вивчите вплив погодних та метеорологічних факторів на авіацію, розвідку та балістику. Блок охоплює аналіз вітрових профілів на різних висотах, роботу з метеомоделями (GFS, ECMWF), розрахунок вертикального градієнта температури, аналіз прохідності ґрунтів (Soil Trafficability) та прогнозування туману/хмарності.",
    "prefix": "mil_meteo",
    "steps": [
      "Роль метеорології у плануванні та виконанні операцій",
      "Основні метеоелементи: Тиск, Температура, Вологість, Вітер",
      "Атмосферні формати даних (GRIB2, NetCDF, METAR, TAF)",
      "Парсинг та обробка метеоданих на Python (xarray, cfgrib)",
      "Глобальні моделі прогнозу погоди (GFS, ECMWF, ICON)",
      "Розрахунок профілю вітру на висотах польоту БПЛА",
      "Ссув вітру (Wind Shear) та його вплив на стійкість апарата",
      "Оцінка турбулентності та висхідних/низхідних потоків",
      "Прогнозування обледеніння крила та датчиків у хмарах",
      "Розрахунок барометричної висоти та щільності повітря",
      "Вплив температури та вологості на дальність польоту та балістику",
      "Аналіз хмарності (Висота нижньої межі хмар - НГО)",
      "Прогнозування видимості (Туман, Серпанок, Опади)",
      "Вплив погоди на оптичні та тепловізійні камери (Atmospheric Attenuation)",
      "Прогнозування стану та прохідності ґрунтів (Soil Moisture & Trafficability)",
      "Моделювання розмокзання доріг та оเกутості території",
      "Оцінка впливу погодних умов на поширення радіохвиль",
      "Робота з даними метеорологічних радарів (Precipitation Radar)",
      "Виявлення фронтів та небезпечних явищ (Грози, Шквали)",
      "Розрахунок термічних вікон для роботи авіації",
      "Побудова метеорологічних оверлеїв на ГІС-картах",
      "Автоматичні метеостанції та інтеграція їхніх даних",
      "Оцінка теплового навантаження на операторів та техніку",
      "Використання супутникових даних для аналізу метеорології",
      "Розрахунок сонячної та місячної освітленості (Moon Phase, Twilight)",
      "Прогнозування штормових та екстремальних умов",
      "Автоматичне сповіщення про зміну метеоумов у зоні виконання завдань",
      "Метеорологічне забезпечення артилерійських розрахунків (Метеобюлетені)",
      "Оптимізація польотних завдань з урахуванням попутного вітру",
      "Підсумковий проект побудови метеорологічного аналітичного модуля"
    ]
  },
  {
    "id": "edge_ai",
    "title": "38. Деплой та Edge AI в польових умовах",
    "text": "Ви навчитеся розгортати та оптимізувати нейромережеві моделі для роботи безпосередньо на портативних обчислювачах (NVIDIA Jetson, Raspberry Pi, NPU) в умовах відсутності інтернету. Блок охоплює квантизацію ваг (INT8/FP16), прунінг, конвертацію в TensorRT/ONNX, оптимізацію енергоспоживання та захист моделей від зчитування.",
    "prefix": "edge_ai",
    "steps": [
      "Специфіка використання ШІ на автономних пристроях (Edge AI)",
      "Апаратні платформи: NVIDIA Jetson (Nano, Orin), Raspberry Pi, NPU",
      "Обмеження пам'яті, обчислювальної потужності та живлення",
      "Конвертація моделей у формат ONNX (Open Neural Network Exchange)",
      "Інференс з ONNX Runtime на C++ та Python",
      "Оптимізація моделей під NVIDIA Jetson за допомогою TensorRT",
      "Квантизація моделей (Post-Training Quantization INT8, FP16)",
      "Quantization-Aware Training (QAT) для збереження точності",
      "Свідчення ваг та видалення неактивних нейронів (Pruning)",
      "Дистиляція знань (Knowledge Distillation) для створення малих моделей",
      "Використання легких архітектур (MobileNet, ShuffleNet, YOLO-nano)",
      "Інференс моделей на мікроконтролерах (TensorFlow Lite for Microcontrollers)",
      "Оптимізація використання відеопам'яті (VRAM) на борту",
      "Керування тепловиділенням (Thermal Throttling) під навантаженням",
      "Апаратне прискорення обробки відео (NVDEC/NVENC, GStreamer)",
      "Побудова низьколатентних відеопайплайнів (DeepStream SDK)",
      "Запуск моделей в повністю ізольованому середовищі (Air-gapped deployment)",
      "Оновлення моделей у полі через локальні носії чи захищений канал",
      "Автоматичний перезапуск та відлагодження сервісів (Systemd, Watchdog)",
      "Контейнеризація Docker для ARM-архітектури (Docker ARM64)",
      "Захист ваг моделей від зчитування та зворотного інжинірингу",
      "Шифрування файлів моделей на носії (Model Encryption)",
      "Моніторинг завантаження CPU/GPU/NPU та споживання струму",
      "Тестування часу відгуку (Latency) та FPS в реальному часі",
      "Робота з камерами через CSI інтерфейс та MIPI протокол",
      "Апаратне сполучення з польотним контролером через UART / CAN",
      "Автоматична відмова від важких обчислень при розряді акумулятора",
      "Створення відтказостійкого завантажувача (Fail-safe Boot)",
      "Бенчмаркінг моделей на різних Edge-платформах",
      "Підсумковий проект деплою розпізнавача на Edge-пристрій"
    ]
  },
  {
    "id": "mil_devsecops",
    "title": "39. Безпека MilTech розробок та DevSecOps",
    "text": "Ви вивчите стандарти та інженерні практики розробки надійного та безпечного ПЗ для оборонних рішень (DevSecOps): суворі стандарти кодування, статичний та динамічний аналіз коду (SAST/DAST), перевірку залежностей (SCA), ізольовані конвеєри збірки (Air-gapped CI/CD) та аналіз безпеки прошивок.",
    "prefix": "mil_devsecops",
    "steps": [
      "Філософія DevSecOps в оборонній розробці",
      "Стандарти безпечного кодування (MISRA C/C++, SEI CERT)",
      "Автоматичний статичний аналіз коду (SAST: SonarQube, Semgrep)",
      "Динамічний аналіз та тестування (DAST)",
      "Аналіз сторонніх бібліотек та залежностей (SCA: Dependency-Check)",
      "Керування вразливостями та оновлення патчів",
      "Ізольовані середовища збірки без доступу до мережі (Air-gapped CI/CD)",
      "Створення безпечних Docker-образів (Hardened Base Images)",
      "Сканування контейнерів на вразливості (Trivy, Grype)",
      "Підпис збірних артефактів та бінарників (Cosign, GPG)",
      "Захист ланцюга постачання ПЗ (Software Supply Chain Security / SLSA)",
      "Формування специфікації матеріалів ПЗ (Software Bill of Materials - SBOM)",
      "Контроль доступів до сирцевого коду та секретів (GitLeaks, Vault)",
      "Аудит безпеки конфігурацій (Infrastructure as Code Scanning)",
      "Fuzzing тестування коду (AFL++, libFuzzer) для пошуку переповнень буфера",
      "Захист пам'яті у мовах C/C++ (AddressSanitizer, ASLR, DEP)",
      "Використання безпечних мов програмування (Rust для системного коду)",
      "Безпечна обробка та зберігання системних логів",
      "Ізоляція процесів у контейнерах (Seccomp, AppArmor, SELinux)",
      "Аудит безпеки прошивок пристроїв перед випуском",
      "Контроль версій та підпис коммітів (Signed Commits)",
      "Автоматизоване розгортання та перевірка цілісності на пристроях",
      "Процедура швидкого виправлення критичних вразливостей (Hotfix Process)",
      "Тестування на стійкість до відмови елементів життєдіяльності системи",
      "Рольовий доступ та суворе розділення обов'язків розробників (Least Privilege)",
      "Регулярні внутрішні рев'ю безпеки (Red Teaming / Blue Teaming)",
      "Документування архітектури безпеки та проходження атестацій",
      "Керування секретами та ключами в ізольованому конвеєрі",
      "Захист апаратних інтерфейсів відлагодження (JTAG Locking)",
      "Підсумковий проект проектування безпечного DevSecOps конвеєра"
    ]
  },
  {
    "id": "mil_pm",
    "title": "40. Управління MilTech проектами та інновації",
    "text": "Завершальний блок охоплює методологію управління проектами у сфері MilTech: швидке прототипування, збір та аналіз зворотного зв'язку від військових у польових умовах (User Feedback Loops), польові випробування, стандартизація випуску версій, оцінка ризиків та перетворення ідей у готові до застосування технологічні вироби.",
    "prefix": "mil_pm",
    "steps": [
      "Специфіка управління проектами у сфері MilTech",
      "Життєвий цикл розробки оборонного технологічного продукту",
      "Перетворення потреб військових у технічні вимоги (Requirements Engineering)",
      "Методології швидкого прототипування (Minimum Viable Product - MVP)",
      "Збір та систематизація зворотного зв'язку з фронту (Field Feedback Loops)",
      "Планування та проведення польових випробувань (Field Testing Protocol)",
      "Метрики надійності та відмовостійкості (MTBF - Mean Time Between Failures)",
      "Управління ризиками у MilTech розробках (Risk Assessment Matrix)",
      "Конфігураційне управління та версіонування апаратного/програмного забезпечення",
      "Стандарти документації користувача та інструкцій з експлуатації",
      "Навчання та підготовка операторів для використання нових систем",
      "Керування змінами вимог під час розробки (Change Management)",
      "Організація сервісного обслуговування та технічної підтримки",
      "Логістика ремонту та швидка заміна компонентів у полі",
      "Стандартизація та уніфікація комплектуючих (Модульність)",
      "Співпраця з науковими інститутами та військовими підрозділами",
      "Управління інтелектуальною власністю та патентами в оборонці",
      "Етичні та правові рамки використання оборонних технологій",
      "Оцінка вартості життєвого циклу продукту (Total Cost of Ownership)",
      "Масштабування серійного виробництва після прототипу",
      "Управління постачальниками та контроль якості комплектуючих",
      "Інтеграція виробу у вищі системи управління та зв'язку",
      "Оцінка бойової ефективності впровадженої технології",
      "Швидка адаптація ПЗ під нові умови протидії ворога",
      "Побудова довірчих відносин між розробниками та кінцевими користувачами",
      "Методи гнучкої розробки (Agile/Scrum) у строгих оборонних рамкаx",
      "Моніторинг світових трендів та інновацій у Defense Tech",
      "Підготовка презентаційних матеріалів та демо-днів",
      "Внутрішня культура безпеки та захист витоку інформації про продукт",
      "Фінальний проект створення концепції та плану запуску MilTech продукту"
    ]
  },
  {
    "id": "mil_intro",
    "title": "41. Вступ до військової справи та термінології",
    "text": "У цьому блоці ви вивчите основи військової справи, організаційно-штатну структуру підрозділів (від відділення до корпусу), поняття тактичного, оперативного та стратегічного рівнів, бойові статути, стандарти НАТО та базову військову термінологію, необхідну для аналітики.",
    "prefix": "mil_intro",
    "steps": [
      "Роди військ та види збройних сил",
      "Організаційно-штатна структура (ОШС)",
      "Ієрархія підрозділів (Відділення - Взвод - Рота)",
      "Батальйонно-тактичні групи (БТГр) та бригади",
      "Стратегічний, оперативний та тактичний рівні",
      "Бойові статути та керівні документи",
      "Класифікація бойових завдань",
      "Військові звання та структури командування",
      "Термінологія NATO (APP-6, Стандартизація)",
      "Військова абревіатура та умовні знання",
      "Основи тактичної обізнаності (SA)",
      "Штабні процедури та бойове управління",
      "Ролі та обов'язки посадових осіб",
      "Документообіг у військовій справі (Бойовий наказ, Розпорядження)",
      "Принцип єдиноначальності та децентралізоване командування (Mission Command)",
      "Театри воєнних дій (ТВД)",
      "Аналіз сили та складу угруповань",
      "Обізнаність про ситуацію на полі бою (COP)",
      "Сучасна класифікація конфліктів",
      "Основи військової етики та законодавства",
      "Міжнародне гуманітарне право (МГП)",
      "Закони та звичаї війни (Женевські конвенції)",
      "Розпізнавання комбатантів та цивільних",
      "Організація несення служби та варти",
      "Бойове чергування та оперативні зміни",
      "Логіка побудови пунктів управління",
      "Взаємодія між видами збройних сил",
      "Критерії оцінки боєздатності підрозділів",
      "Оцінка втрат та відновлення боєздатності",
      "Підсумковий аналітичний огляд військової структури"
    ]
  },
  {
    "id": "small_arms",
    "title": "42. Класифікація та аналіз піхотного озброєння",
    "text": "Ви вивчите види та класифікацію стрілецької зброї, піхотних гранатометів, ПТРК та ПЗРК, їхні калібри, тактико-технічні характеристики (ТТХ), ефективні дальності стрільби, засоби індивідуального бронезахисту та основи вогневої підготовки.",
    "prefix": "small_arms",
    "steps": [
      "Класифікація стрілецької зброї",
      "Основні військові калібри (5.45, 5.56, 7.62, 12.7, 14.5 мм)",
      "Автомати та штурмові гвинтівки (AK, AR-15, M4)",
      "Ручні та станкові кулемети (ПКМ, M240, Browning M2)",
      "Снайперська зброя та марксманські гвинтівки (SVD, Barrett)",
      "Пістолети та пістолети-кулемети",
      "Підствольні та ручні гранатомети (ГП-25, РПГ-7)",
      "Автоматичні станкові гранатомети (АГС-17, Mk 19)",
      "Переносні протитанкові ракетні комплекси (ПТРК: Стугна, Javelin, NLAW)",
      "Переносні зенітно-ракетні комплекси (ПЗРК: Ігла, Stinger, Piorun)",
      "Ручні гранати (Осколкові, Наступальні, Оборонні)",
      "Пехотні міномети та пристрої ближнього бою",
      "Оптичні, коліматорні та нічні приціли",
      "Тепловізійні прицільні комплекси",
      "Тактичні обвіси та глушники (ПБС)",
      "Балістика та ефективна дальність стрілецького вогню",
      "Вразливі зони та пробивна здатність набоїв",
      "Засоби індивідуального бронезахисту (Шоломи, Бронежилети, Плити)",
      "Класи захисту бронежилетів (NIJ, ДСТУ)",
      "Запаси боєприпасів піхотинця (БК) та норми видачі",
      "Обслуговування та чищення піхотного озброєння",
      "Затримки при стрільбі та їх усунення",
      "Принципи стрільби з закритих та відкритих позицій",
      "Стрільба по рухомих цілях та винос точки прицілювання",
      "Організація вогневих позицій піхоти",
      "Специфіка застосування зброї в міських умовах (CQB)",
      "Нічний бій та використання лазерних цілевказівників (PEQ)",
      "Правила безпеки при поводженні зі зброєю",
      "Аналіз тенденцій розвитку піхотного озброєння",
      "Підсумковий систематизований довідник піхотного зброєзнавства"
    ]
  },
  {
    "id": "artillery_weapons",
    "title": "43. Артилерійські системи та міномети",
    "text": "Опануєте класифікацію ствольної та реактивної артилерії, мінометів та САУ. Ви вивчите калібри (120мм, 122мм, 152мм, 155мм), типи боєприпасів (осколково-фугасні, касетні, керовані Excalibur), тактику застосування та оцінку зон ураження.",
    "prefix": "artillery_weapons",
    "steps": [
      "Класифікація артилерії (Буксована, САУ, РСЗВ, Міномети)",
      "Артилерійські калібри NATO та радянського стандарту (105, 120, 122, 152, 155 мм)",
      "Міномети калібрів 60, 82, 120 мм та їх характеристики",
      "Буксована ствольна артилерія (М777, Д-30, Гіацинт-Б)",
      "Самохідні артилерійські установки (САУ: CAESAR, PzH 2000, Krab, 2С1, 2С3)",
      "Реактивні системи залпового вогню (РСЗВ: Град, Ураган, Смерч, HIMARS, M270)",
      "Типи артилерійських боєприпасів (Осколково-фугасні, Касетні, Димові, Освітлювальні)",
      "Високоточні боєприпаси (Excalibur, Vulcano, Смельчак)",
      "Типи підривачів (Контактні, Дистанційні, Неконтактні радіопідривачі)",
      "Дальність стрільби та активні-реактивні снаряди (RAP)",
      "Артилерійська мінометна батарея та дивизіон (ОШС)",
      "Вогнева позиція артилерії (Прихована, Відкрита, Противовогневий маневр)",
      "Контрбатарейний маневр та прикриття позицій",
      "Знос артилерійських стволів та ресурси пострілів",
      "Таблиці стрільби та артилерійські поправки",
      "Зарядні порохові карти та вибір заряду",
      "Процедура підготовки вогневої позиції",
      "Розгортання та згортання артилерійських систем (Shoot-and-Scoot)",
      "Артилерійські радари та засоби розвідки",
      "Використання БПЛА для коригування вогню артилерії",
      "Оцінка ефективного радіуса ураження (Lethal Radius)",
      "Укриття артилерійських позицій (Капоніри, Маскувальні сітки)",
      "Типи артилерійських поранень та захист від них",
      "Логістика боєприпасів для артилерії (Транспортування, Зберігання)",
      "Особливості стрільби з закритих вогневих позицій (ЗВП)",
      "Стрільба прямою наводкою",
      "Оцінка витрати снарядів для знищення типових цілей",
      "Автоматизовані системи управління вогнем (СУВ / Кропива)",
      "Еволюція артилерії та концепція рою артилерії",
      "Підсумковий аналітичний огляд артилерійських систем"
    ]
  },
  {
    "id": "missiles_air_defense",
    "title": "44. Ракетне озброєння та системи ППО/ПРО",
    "text": "Ви навчитеся класифікувати крилаті, балістичні, зенітні та протикорабельні ракети. Опануєте принципи ешелонованої протиповітряної (ППО) та протиракетної (ПРО) оборони, роботу радарів, оптико-електронних та радіолокаційних головок самонаведення.",
    "prefix": "missiles_air_defense",
    "steps": [
      "Класифікація ракетного озброєння",
      "Крилаті ракети (Kalibr, Storm Shadow, Tomahawk) та їх принципи польоту",
      "Балістичні ракети (Iskander, ATACMS) та їх траєкторії",
      "Гіперзвукові ракети та виклики їх перехоплення",
      "Протикорабельні ракети (Neptune, Harpoon)",
      "Керовані авіаційні ракети (Повітря-Повітря, Повітря-Земля)",
      "Ешелонована система протиповітряної оборони (ППО)",
      "ППО малої дальності (SHORAD: Gepard, Avenger, Osa, C-RAM)",
      "ППО середньої дальності (NASAMS, IRIS-T, Buk, Hawk)",
      "ППО великої дальності та ПРО (Patriot, SAMP/T, S-300, S-400)",
      "Радіолокаційні станції виявлення та супроводу цілей",
      "Оптико-електронні та інфрачервоні головки самонаведення (ГСН)",
      "Радіолокаційні головки самонаведення (Активні, Напівактивні, Пасивні)",
      "Зони пуску, враження та dead zones систем ППО",
      "Протирадіолокаційні ракети (AGM-88 HARM)",
      "Засоби прориву ППО (Хибні цілі, РЕБ, Масований удар)",
      "Протиракетна оборона (ПРО) та перехоплення балістики",
      "Мобільні вогневі групи (МВГ) проти Шахедів/БПЛА",
      "Класифікація зенітних боєприпасів та підривачів",
      "Організація пунктів управління ППО та інтеграція радарів",
      "Мобільні та стаціонарні комплекси ППО",
      "Теплові сигнатури ракет та пастки (Flares / Chaff)",
      "Перехоплення цілей на надмалих висотах",
      "Оцінка ефективності ППО (Kill Ratio / Interception Rate)",
      "Логістика та перезаряджання зенітних ракетних комплексів",
      "Захист об'єктів критичної інфраструктури системами ППО",
      "Тактика використання системи Patriot проти балістики",
      "Автоматизовані системи сповіщення про повітряну тривогу",
      "Майбутнє систем ППО та лазерне зброя (Iron Beam)",
      "Підсумкова систематизація ракетного озброєння та ППО"
    ]
  },
  {
    "id": "armor_vehicles",
    "title": "45. Бронетехніка та важке озброєння",
    "text": "Ви вивчите види бронетехніки (ОБТ - танки, БМП, БТР, МРАП), типи броні (пасивна, динамічна, активний захист KAZ), танкове озброєння (ОБПС, кумулятивні снаряди), вразливі зони техніки та тактику застосування бронювальних груп.",
    "prefix": "armor_vehicles",
    "steps": [
      "Класифікація військової бронетехніки",
      "Основні бойові танки (ОБТ: Abrams, Leopard 2, Challenger 2, T-72, T-90)",
      "Озброєння та снаряди танків (ОБПС - Ломи, Кумулятивні, Фугасні)",
      "Бойові машини піхоти (БМП: Bradley, Marder, BMP-1/2/3)",
      "Бронетранспортери (БТР: Stryker, BTR-80, Rosomak)",
      "Машини з захистом від мін та засідок (MRAP: MaxxPro, Bushmaster)",
      "Броньовані розвідувальні машини (БРДМ) та легка броня",
      "Типи броні (Сталева, Композитна, Керамічна, Уранова)",
      "Динамічний захист (ДЗ: Контакт, Нож, Релікт)",
      "Комплексите активного захисту (КАЗ: Trophy, StrikeShield)",
      "Протикумулятивні решітки та захисні мангали проти FPV",
      "Компонування техніки та розташування боєкомплекту (Автомат заряджання vs Вибивні панелі)",
      "Системи управління вогнем та тепловізори танків",
      "Двигуни та ходова частина (Дизельні, Газотурбінні, Гусениці, Колеса)",
      "Мобільність, маса та тиск на ґрунт",
      "Вразливі зони бронетехніки (Борти, Корма, Дах, Гусениці)",
      "Засоби ураження бронетехніки (ПТРК, FPV, Дрони, Авіація, Міни)",
      "Ремонтно-евакуаційні машини (БРЕМ) та евакуація з поля бою",
      "Танкові підрозділи в обороні та наступі (ОШС)",
      "Тактика дій бронювальних груп у місті та на відкритій місцевості",
      "Взаємодія танків з піхотою та аеророзвідкою",
      "Подолання водних перешкод та мостоукладальники",
      "Маскування та зменшення теплової/радіолокаційної помітності техніки",
      "Запаси пального та хід без дозаправляння",
      "Засоби пожежогасіння всередині бронетехніки",
      "Ергономіка та екіпаж (3 чи 4 особи)",
      "Тренди розвитку танкобудування (Безпілотні вежі, Дрони на борту)",
      "Логістика транспортування важкої техніки (Трали, Залізниця)",
      "Оцінка втрат та відновлення бронетехніки",
      "Підсумковий систематичний довідник бронетанкової техніки"
    ]
  },
  {
    "id": "uav_tactics",
    "title": "46. Класифікація та тактика застосування БПЛА",
    "text": "Ви детально вивчите класифікацію БПЛА (мікрокоптери, FPV-камікадзе, розвідувальні крила, ударні апарати, морські БЕК), їхні канали зв'язку, частотні діапазони, бойове навантаження, тактику застосування на передньому краї та протидію.",
    "prefix": "uav_tactics",
    "steps": [
      "Класифікація безпілотних літальних апаратів (БПЛА)",
      "Мікро- та мультикоптери (Mavic, Autel) для тактичної розвідки",
      "FPV-дрони (Камікадзе та скиди): Комплектація та рами",
      "БПЛА літакового типу (Крила: Leleka, Shark, Poseidon, Орлан)",
      "Ударно-розвідувальні БПЛА (Bayraktar TB2, MQ-9 Reaper)",
      "Баражуючі боєприпаси (Lancet, Switchblade, Warmate)",
      "Далекобійні дрони-камікадзе (Shahed-136, Лютий)",
      "Морські безпілотні катери (БЕК: Magura V5, Sea Baby)",
      "Наземні роботизовані комплекси (UGV)",
      "Типи двигунів БПЛА (Електро, ДВЗ, Безколекторні)",
      "Акумулятори (LiPo, Li-Ion) та розрахунок часу польоту",
      "Канали зв'язку та управління (CRSF, ExpressLRS, Аналог, Цифра)",
      "Частотні діапазони БПЛА (433MHz, 868MHz, 915MHz, 1.2GHz, 2.4GHz, 5.8GHz)",
      "Корисне навантаження (Камери, Тепловізори, Скиди, Спектрометри)",
      "Боєприпаси для FPV та скидів (Кумулятивні, Осколкові, Термобаричні)",
      "Тактика застосування FPV-дронів на передньому краї",
      "Тактика використання розвідувальних крил для коригування артилерії",
      "Польоти в умовах активної роботи РЕБ (ППРЧ, Оптичний потік)",
      "Тактика нічного застосування БПЛА з тепловізорами",
      "Розрахунок екіпажу БПЛА: Пілот, Штурман, Технік, Зв'язківець",
      "Виносні антени, ретранслятори та щогли для збільшення дальності",
      "Організація пунктів управління та зльоту/посадки БПЛА",
      "Маскування та безпека позицій операторів БПЛА",
      "Протиповітряна оборона від БПЛА (Сітки, Дронобійки, Стрелецька зброя)",
      "Перехоплення БПЛА іншими БПЛА (Дрони-виправники/перехоплювачі)",
      "Логістика, ремонт та збірка БПЛА у польових умовах",
      "Програмне забезпечення для польотів (QGroundControl, Mission Planner)",
      "Аналіз збоїв та причин падіння БПЛА",
      "Еволюція та майбутнє автономних роїв БПЛА",
      "Підсумковий систематичний довідник безпілотних систем"
    ]
  },
  {
    "id": "topography",
    "title": "47. Військова топографія та орієнтування",
    "text": "Ви навчитеся читати топографічні карти, орієнтуватися за компасом, висотами, систем координат (MGRS, UTM, СК-42), вимірювати кути в тисячних, обчислювати азимути, оцінювати маскувальні властивості рельєфу та працювати з ГІС-картами (Кропива).",
    "prefix": "topography",
    "steps": [
      "Вступ до військової топографії",
      "Картографічні проекції та спотворення",
      "Номенклатура та масштаби топографічних карт",
      "Системи координат: СК-42, WGS-84, UTM, MGRS",
      "Читання рельєфу за горизонталями (Ізогіпсами)",
      "Оцінка крутизни схилів та висотних відміток",
      "Умовні знаки топографічних карт (Місцевість, Дороги, Гідрографія)",
      "Визначення координат об'єкта за картою",
      "Вимірювання відстаней на карті та курвіметр",
      "Орієнтування карти за компасом та орієнтирами",
      "Магнітний азимут та дійсний азимут",
      "Магнітне схилення та зближення меридіанів",
      "Пряма та обернена геодезичні задачі",
      "Орієнтування на місцевості без карти (Сонце, Зорі, Місцеві прикмети)",
      "Кутова система вимірювань: Тисячні (Формула тисячної)",
      "Прилади орієнтування: Компас Пастбіна, Буссоль, Лазерний дальномір",
      "Побудова профілю місцевості та оцінка взаємної видимості",
      "Визначення власного місця стояння (Засічки: Пряма, Обернена, Бокова)",
      "Орієнтування та рух за азимутами вночі та в лісі",
      "Особливості орієнтування в гірській та міській місцевості",
      "Супутникові навігатори (Garmin) та тактичні програми (AlpineQuest, ПК Кропива)",
      "Електронні топографічні карти та шари даних",
      "Топографічна прив'язка вогневих позицій та спостережних пунктів",
      "Складання карт-схем та карток вогню",
      "Оцінка маскувальних властивостей рельєфу",
      "Аналіз гідрографічної мережі (Фордування річок, Болота)",
      "Оцінка дорожньої мережі та мостів для важкої техніки",
      "Аналіз ґрунтового покриву та рослинності",
      "Використання дешифрованих аерофотознімків разом з картою",
      "Підсумковий практичний курс військової топографії"
    ]
  },
  {
    "id": "fortifications",
    "title": "48. Військова інженерія та фортифікація",
    "text": "Ви опануєте типи фортифікаційних споруд (окопи, бліндажі, ВОП/РОП, КСП), інженерні загородження (мінні поля, протитанкові рови, драконячі зуби), мінне озброєння (ПТМ, ПМН, МОН), засоби інженерної техніки та розмінування.",
    "prefix": "fortifications",
    "steps": [
      "Вступ до військово-інженерної справи",
      "Класифікація фортифікаційних споруд",
      "Окопи для стрільби (Лежачи, З коліна, Стоячи)",
      "Траншеї та ходи сполучення (Повний профіль, Бруствер)",
      "Вогневі позиції для кулеметів, АГС, ПТРК та мінометів",
      "Окопи для танків та БМП (Капоніри)",
      "Взводні та ротні опорні пункти (ВОП / РОП)",
      "Командно-спостережні пункти (КСП) та бліндажі",
      "Перекриття, перекриті щілини та перекриття бліндажів (Колоди, Габіони, Залізобетон)",
      "Споруди масового виробництва (Мобільні бункери, Капсули, Контейнери)",
      "Захист фортифікацій від артилерійських снарядів та авіабомб",
      "Фортифікаційне обладнання в міських умовах",
      "Інженерні загородження (Мінно-вибухові, Невибухові)",
      "Протитанкові мінні поля та міни (ТМ-62, ПТМ-3)",
      "Протипіхотні мінні поля та міни (ПМН, ПОМ, МОН-50/90, ОЗМ-72)",
      "Міни-пастки та сюрпризи",
      "Невибухові загородження: Драконячі зуби, Протитанкові рови, Їжаки, Дріт Єгоза",
      "Засоби встановлення мінних загороджень (Загороджувачі, Дистанційне мінування)",
      "Засоби подолання мінних загороджень (УР-77 Змій Горинич, Вибухові заряди)",
      "Інженерна техніка (ІМР, БАТ, Екскаватори, Шляхопрокладачі)",
      "Мостоукладальники (МТУ) та понтонно-мостові парки (ПМП)",
      "Водопостачання та польове облаштування позицій",
      "Маскування фортифікаційних споруд та хибні позиції",
      "Детекція та розвідка фортифікацій ворога на супутникових знімках",
      "Інженерна розвідка шляхів та мінних полів",
      "Правила розмінування та знешкодження ВНП (EOD / СДЯВ)",
      "Оцінка стійкості опорного пункту до тривалого штурму",
      "Фортифікація у зимовий та дощовий періоди (Дренаж, Водовідведення)",
      "Безпека праці при веденні інженерних робіт під вогнем",
      "Підсумковий аналітичний огляд військової фортифікації"
    ]
  },
  {
    "id": "tactical_medicine",
    "title": "49. Тактична медицина та евакуація (TCCC)",
    "text": "Ви вивчите стандарти надання домедичної допомоги в бойових умовах (TCCC): фази CUF, TFC, TACEVAC, алгоритм MARCH, зупинку кровотеч (турнікети, гемостатики), відновлення дихання, пневмоторакс, іммобілізацію та MedEvac.",
    "prefix": "tactical_medicine",
    "steps": [
      "Концепція тактичної медицини (TCCC / CMC)",
      "Три фази надання допомоги: Care Under Fire (CUF), Tactical Field Care (TFC), TACEVAC",
      "Основні причини превентивних смертей на полі бою",
      "Алгоритм оцінки та надання допомоги MARCH / PAWS",
      "Massive Bleeding (Масивна кровотеча): Турнікети (CAT, SOFTT-W)",
      "Правила та помилки накладання джгутів/турнікетів",
      "Тампонада рани (Гемостатичні бинти: QuikClot, Celox)",
      "Тиснучі пов'язки та бандижі (Israeli Bandage)",
      "Airway (Дихальні шляхи): Назофарингеальний повітропровід (NPA)",
      "Позиція порятунку та відновлення дихання",
      "Respiration (Дихання): Напружений пневмоторакс та декомпресійна голка",
      "Оклюзійні наліпки (Chest Seals) при проникаючих пораненнях грудей",
      "Circulating (Циркуляція): Оцінка шоку, пульсу та крововтрати",
      "Внутрішньокістковий та внутрішньовенний доступ (IV/IO)",
      "Застосування транексамової кислоти (TXA) та інфузійний розчин",
      "Hypothermia / Head (Гіпотермія / Голова): Попередження гіпотермії (Термоковдри)",
      "Оцінка черепно-мозкових травм (ЧМТ / Concussion)",
      "Eye Injuries: Захисні щитки для очей (Eye Shield)",
      "Analgesia (Знеболення): Окопний знеболювальний набір (Pill Pack)",
      "Antibiotics: Застосування антибіотиків при пораненнях",
      "Опіки, іммобілізація переломів та шинування (SAM Splint)",
      "Складання та заповнення картки пораненого (TCCC Card / DD Form 1380)",
      "Складання індивідуальної аптечки (IFAK)",
      "Комплектація рюкзака бойового медика (CLS / Medic Bag)",
      "Тактика переміщення пораненого у безпечну зону (Drag / Carry)",
      "Організація пунктів збору поранених (CCP)",
      "Медична евакуація (MedEvac / CasEvac) та запит 9-Line MEDEVAC",
      "Специфіка евакуації бронетехнікою та гелікоптерами",
      "Психологічна допомога при гострому стресі та контузії",
      "Підсумковий курс тактичної медицини та порятунку життя"
    ]
  },
  {
    "id": "reconnaissance",
    "title": "50. Військова розвідка та виявлення цілей",
    "text": "Ви опануєте методи ведення військової, повітряної, інженерної та радіоелектронної розвідки. Ви вивчите організацію спостережних пунктів (СП), демаскуючі ознаки цілей, розвідку боєм, засадні дії, цілевказання та оцінку BDA.",
    "prefix": "reconnaissance",
    "steps": [
      "Вступ до військової розвідки",
      "Види розвідки: Військова, Повітряна, Агентурна, Радіоелектронна, Інженерна, Артилерійська",
      "Принципи розвідки: Безперервність, Своєчасність, Активність, Достовірність",
      "Організація спостережних пунктів (СП / КСП)",
      "Оснащення спостережного пункту (Прилади спостереження, Тепловізори, Дальноміри)",
      "Методика ведення спостереження та сектори огляду",
      "Виявлення демаскуючих ознак цілей (Шум, Пил, Світло, Рух, Тіні, Відблиски)",
      "Спостереження за пересуванням техніки та живий сили ворога",
      "Складання картки сектору спостереження та журналу розвідки",
      "Розвідка боєм (Завдання, Ризики, Порядок проведення)",
      "Засідки та пошук (Напади, Захоплення полонених та документів)",
      "Рейдові дії розвідувальних груп у тилу ворога",
      "Глибинна розвідка (LRRP) та автономне виживання",
      "Опитування полонених та місцевого населення (HUMINT)",
      "Дешифрування аерофотознімків та супутникових даних",
      "Засоби технічної розвідки (Сенсори руху, Акустичні датчики, Радари)",
      "Розвідка інженерних загороджень та мінних полів",
      "Визначення координат цілей для ураження (Цілевказання)",
      "Складання картки цілі (Target Card) та оцінка її пріоритетності",
      "Передавання розвідувальних даних у реальному часі",
      "Взаємодія розвідки з артилерією та авіацією",
      "Маскування розвідувальних груп та шляхи відходу",
      "Специфіка розвідки в міських умовах",
      "Специфіка розвідки у лісі та гірській місцевості",
      "Протидія розвідці ворога (Контррозвідка та маскування)",
      "Використання тепловізорів та нічних приладів у розвідці",
      "Захист розвідувальних даних від перехоплення",
      "Оцінка результативності розвідувальних виходів",
      "Аналіз помилок при організації розвідувальних дій",
      "Підсумковий систематичний курс військової розвідки"
    ]
  },
  {
    "id": "air_operations",
    "title": "51. Авіація та повітряні операції",
    "text": "Ви вивчите види військової авіації (винищувальна, штурмова, армійські гелікоптери, ДРЛО), авіаційні засоби ураження (КАБ з УМПК, ракети Повітря-Повітря/Земля), тактику CAS, прорив ППО (SEAD) та авіаційне цілевказання (JTAC).",
    "prefix": "air_operations",
    "steps": [
      "Класифікація військової авіації",
      "Винищувальна авіація (F-16, Mirage 2000, Su-27, MiG-29) та завоевання переваги в повітрі",
      "Штурмова та бомбардувальна авіація (Su-25, Su-24, Su-34)",
      "Армійська авіація: Застосування гелікоптерів (Mi-8, Mi-24, AH-64 Apache, Ka-52)",
      "Транспортна та спеціальна авіація (Заправники, ДРЛО / AWACS Saab 340)",
      "Авіаційні засоби ураження: Некеровані ракети (НАР) та гармати",
      "Керовані авіабомби (КАБ) та модулі корекції (УМПК, JDAM, SDB)",
      "Ракети Повітря-Повітря (AIM-120 AMRAAM, AIM-9 Sidewinder, R-77)",
      "Ракети Повітря-Земля (AGM-65 Maverick, Brimstone)",
      "Тактика безпосередньої авіаційної підтримки (Close Air Support - CAS)",
      "Тактика прориву системи ПВО ворога (SEAD / DEAD)",
      "Польоти на гранично малих висотах (Нізьковисотний політ) для ухилення від радарів",
      "Авіаційна розвідка та цілевказання",
      "Взаємодія авіації з наземними навідниками (JTAC / FAC)",
      "Прицільні контейнери (Targeting Pods: LANTIRN, LITENING)",
      "Аеродромна мережа, злітно-посадкові смуги та оперативні аеродроми",
      "Підготовка літаків до вильоту та логістика авіаційного озброєння",
      "Засоби самозахисту літаків (Картриджі пасток, РЕБ контейнери Khibiny, ALQ-131)",
      "Повітряні бої: Далекий повітряний бій (BVR) та ближній бій (Dogfight)",
      "Застосування гелікоптерів для висадки десанту та евакуації",
      "Безпілотні літальні апарати у зв'язку з пілотованою авіацією (Manned-Unmanned Teaming)",
      "Аналіз збитків та ефективності авіаударів (BDA)",
      "Захист літаків на аеродромах (Укриття, ЖББ, Маскування)",
      "Засоби порятунку пілотів (Катапультні крісла, Рятувальні операції CSAR)",
      "Вплив погодних умов на застосування авіації",
      "Організація управління повітряним рухом у зоні бойових дій",
      "Аналіз авіаційних катастроф та бойових втрат",
      "Сучасні виклики та майбутнє бойової авіації",
      "Економіка авіаційних вильотів та ресурси планера",
      "Підсумковий аналітичний огляд військової авіації"
    ]
  },
  {
    "id": "naval_operations",
    "title": "52. Військово-морські сили та морські операції",
    "text": "Ви опануєте класифікацію надводних кораблів та підводних човнів, корабельне ракетне озброєння, протичовнову оборону, морські мінно-тральні операції, берегову оборону та застосування морських безпілотних катерів (БЕК).",
    "prefix": "naval_operations",
    "steps": [
      "Класифікація військово-морських сил",
      "Основні класи кораблів: Крейсери, Есмінці, Фрегати, Корвети",
      "Десантні кораблі та десантно-висадкові засоби",
      "Підводні човни (Атомні, Дизель-електричні, Носії крилатих ракет)",
      "Катерний склад: Ракетні, Патрульні, Штурмові катери",
      "Морські безпілотні апарати (БЕК: Камікадзе, Розвідувальні, Мінуючі)",
      "Морське ракетне озброєння та протикорабельні комплекси",
      "Корабельні системи ППО та артилерійські комплекси (Phalanx CIWS, AK-630)",
      "Протичовнова оборона (ПЧО / ASW): Сонари, Гідроакустичні буї, Торпеди",
      "Мінно-тральні операції: Морські міни, Тральщики, Безпілотні шукачі мін",
      "Берегова оборона та берегові ракетні комплекси (БРК)",
      "Морська десантна операція: Планування, Висадка, Захоплення плацдарму",
      "Блокада морських шляхів та захист цивільного судноплавства",
      "Морська розвідка та спостереження (Супутникові давачі, AIS, Радари)",
      "Тактика дій морської піхоти",
      "Організація пунктів базування та військово-морських баз (ВМБ)",
      "Захист баз від атаки морських та повітряних дронів (Бонові загородження, Сітки)",
      "Гідрографічне забезпечення морських операцій (Глибини, Течії, Припливи)",
      "Морська логістика та заправка у морі",
      "Бій у прибережній зоні (Littoral Warfare)",
      "Застосування морської авіації (Гелікоптери та літаки корабельного базування)",
      "Автономні підводні апарати (AUV / UUV)",
      "Рятувальні операції на морі (SAR)",
      "Морське право та статус нейтральних вод",
      "Бортові системи боротьби за живучість корабля (Пожежі, Пробоїни)",
      "Оцінка стійкості кораблів до влучання протикорабельних ракет",
      "Тактичні групи кораблів (Авіаносні, Ударні, Десантні)",
      "Еволюція морської війни під впливом БЕК",
      "Економічна та стратегічна роль блокування морів",
      "Підсумковий огляд військово-морських сил та операцій"
    ]
  },
  {
    "id": "infantry_tactics",
    "title": "53. Тактика піхотних та механізованих підрозділів",
    "text": "Ви вивчите тактику бойових груп (двійки, трійки), пересування під вогнем, зачистку траншей, штурмові дії, зачистку будівель у місті (CQB), тактику ведення засідок, нічний бій та взаємодію з танками та БПЛА.",
    "prefix": "infantry_tactics",
    "steps": [
      "Основи загальновійськового бою",
      "Організація та тактика бойових груп (Двійки, Трійки, Четвірки)",
      "Тактичне пересування піхоти (Перебежки, Переповзання, Стрибки)",
      "Порядок спішування з БМП/БТР та розгортання в бойовий порядок",
      "Тактика піхотного підрозділу в обороні",
      "Побудова системи вогню опорного пункту (Картки вогню)",
      "Тактика дій піхоти у наступі",
      "Атака переднього краю ворога та зачистка траншей",
      "Штурмові дії та робота штурмових груп (Assault Teams)",
      "Особливості ведення бою в міських умовах (CQB / FIBUA)",
      "Зачистка будівель, кімнат та підвалів",
      "Пересування вздовж вулиць та подолання відкритих ділянок у місті",
      "Тактика бою в лісі та зелених насадженнях",
      "Нічний бій: Організація спостереження та вогню",
      "Зустрічний бій та вихід з-під раптового вогню (Contact Drills)",
      "Організація та ведення засідок",
      "Відхід та відступ підкриттям димів та вогню",
      "Взаємодія піхоти з танками (Супровід, Захист від ПТРК/FPV)",
      "Взаємодія піхоти з аеророзвідкою та FPV-розрахунками",
      "Організація зв'язку всередині взводу/роти під час бою",
      "Керування вогнем підрозділу та цілевказання",
      "Забезпечення боєприпасами та ротація на позиціях",
      "Захист позицій від скидів з дронів та АГС/мінометів",
      "Організація спостереження та вартів у обороні",
      "Тактика дій при застосуванні ворожим авіаударів та артилерії",
      "Оцінка морально-психологічного стану підрозділу у бою",
      "Аналіз типових тактичних помилок піхоти",
      "Огляд сучасних бойових інструкцій та мануалів",
      "Роль сержантського складу у керуванні боєм (NCO Leadership)",
      "Підсумковий практичний курс тактики піхоти"
    ]
  },
  {
    "id": "fire_control",
    "title": "54. Управління вогнем та контрбатарейна боротьба",
    "text": "Ви навчитеся системному управлінню вогнем артилерії та мінометів (Kill Chain), виклику вогню (Call for Fire), коригуванню за даними БПЛА, роботі контрбатарейних радарів та використанню АСУВ (Кропива, Delta).",
    "prefix": "fire_control",
    "steps": [
      "Концепція управління вогнем (Fire Control Systems - FCS)",
      "Цикл ураження цілі (Kill Chain: Find, Fix, Track, Target, Engage, Assess)",
      "Процедура виклику вогню артилерії (Call for Fire - CFF)",
      "Формат передачі цілевказання (GRID, Азимут/Дальність, Перевищення)",
      "Робота артилерійського коригувальника (Forward Observer - FO)",
      "Коригування вогню за візуальними спостереженнями та БПЛА",
      "Методи пристрілювання: За вилкою, За виміряними відхиленнями",
      "Оцінка відхилення розривів (по дальності та напрямку)",
      "Перенесення вогню від пристріляної цілі",
      "Використання контрбатарейних радіолокаційних станцій (AN/TPQ, COBRA, Зоопарк)",
      "Автоматичне визначення вогневих позицій артилерії ворога за контрбатарейними радарами",
      "Тактика контрбатарейної боротьби (Counter-battery Warfare)",
      "Час від виявлення пострілу до вогневого ураження (Sensor-to-Shooter time)",
      "Автоматизовані системи управління вогнем (АСУВ: Kropyva, Delta, GIS Arta)",
      "Розрахунок вогневих завдань комп'ютерними програмами",
      "Управління вогнем мінометних батарей",
      "Управління вогнем РСЗВ та масовані вогневі нальоти",
      "Стрільба по рухомих цілях та колонах",
      "Розподіл цілей між вогневими засобами (Target Allocation)",
      "Контроль витрати боєприпасів при виконанні вогневих завдань",
      "Оцінка результатів вогневого ураження (Battle Damage Assessment - BDA)",
      "Придушення вогневих позицій протиповітряної оборони ворога (SEAD)",
      "Організація вогневих валів та загороджувального вогню (НЗВ, ПЗВ)",
      "Маскування та зміна вогневих позицій після виконання завдання",
      "Протидія контрбатарейній боротьбі ворога",
      "Аналіз помилок при коригуванні та розрахунках вогню",
      "Нічне коригування вогню з використанням тепловізорів",
      "Інтеграція FPV-дронів у систему вогневого ураження",
      "Майбутнє штучного інтелекту в автоматизації управління вогнем",
      "Підсумковий курс управління вогнем та контрбатарейної боротьби"
    ]
  },
  {
    "id": "camouflage_opsec",
    "title": "55. Військова маскувальна справа та OPSEC",
    "text": "Ви вивчите методи оптичного, теплового, радіолокаційного та радіомаскування позицій і техніки. Блок охоплює створення макетів і хибних цілей, світломаскування, а також правила оперативної безпеки (OPSEC) у коді та мережах.",
    "prefix": "camouflage_opsec",
    "steps": [
      "Вступ до військового маскування (Camouflage & Deception)",
      "Види розвідки ворога та відповідні види маскування (Оптичне, Теплове, Радіолокаційне, Акустичне)",
      "Демаскуючі ознаки позицій, техніки та особового складу",
      "Маскувальні сітки, костюми (Ghillie) та табельні засоби",
      "Термальне маскування: Накидки, намети та матеріали, що поглинають ІЧ-випромінювання",
      "Захист від огляду з БПЛА (Вертикальне маскування, Навіси, Перекриття)",
      "Радіолокаційне маскування та зменшення ЕПР (Покриття, Куточкові відбивачі)",
      "Світломаскування (Нічний режим, Червоне світло, Маскування фар)",
      "Радіомаскування та радіотиша (EMCON / Radio Silence)",
      "Маскування вогневих позицій артилерії та мінометів",
      "Маскування техніка на стоянках та в районах зосередження",
      "Маскування фортифікаційних споруд та брустверів",
      "Створення хибних позицій та хибних опорних пунктів",
      "Використання макетів військової техніки (Пневматичні, Дерев'яні, Металеві)",
      "Імітація теплових сигнатур техніки (Печі, Нагрівачі на макетах)",
      "Імітація радіовипромінювання (Хибні передавачі та маяки)",
      "Маскувальне фарбування техніки (Деформуючий камуфляж)",
      "Акустичне маскування та глушники",
      "Оперативна безпека (OPSEC): Захист інформації про плани та переміщення",
      "Контроль використання смартфонів та персональних пристроїв на фронті",
      "Захист від витоку геоданих у соціальних мережах та месенджерах",
      "Протидія витоку даних через фото/відеозйомку",
      "Перевірка власних позицій на демаскуючі ознаки з БПЛА",
      "Дисципліна пересування та виключення натоптаних стежок",
      "Маскування логістичних колонів та завантаження/розвантаження",
      "Використання димових завіс та аерозольних перешкод",
      "Дізінформаційні заходи на тактичному рівні",
      "Аналіз помилок у маскуванні, що призвели до ураження",
      "Перевірка ефективності маскування засобами розвідки",
      "Підсумковий практичний курс маскування та OPSEC"
    ]
  },
  {
    "id": "military_supply",
    "title": "56. Військове постачання та тилове забезпечення",
    "text": "Ви опануєте структуру військового тилу та класи постачання (I-V за НАТО), підвоз боєприпасів, ПММ, речового майна, продовольства, організацію польових складів, техзабезпечення та захист тилових колон.",
    "prefix": "military_supply",
    "steps": [
      "Класифікація військових матеріальних засобів (Класи постачання I-V)",
      "Класифікація постачання за стандартами NATO (Class I - V)",
      "Організація тилового забезпечення підрозділів",
      "Постачання продовольства та питної води (Сухі пайками, Польові кухні)",
      "Речове майно, екіпірування та білизна",
      "Забезпечення пально-мастильними матеріалами (ПММ / POL)",
      "Склади ПММ, заправники та безпека зберігання палива",
      "Забезпечення боєприпасами та вибуховими речовинами",
      "Облік, транспортування та складування боєприпасів",
      "Зберігання боєприпасів у польових умовах та захист від детонації",
      "Організація польових складів (Батальйонних, Бригадних)",
      "Логістика доставки на передній край (Доставка під вогнем, Нічні підвози)",
      "Використання легкого транспорту (Квадроцикли, Багі) для доставки",
      "Технічне забезпечення та ремонт військової техніки",
      "Польові ремонтні майстерні (ПАРМ) та евакуація зламаної техніки",
      "Забезпечення запчастинами та ротація агрегатів",
      "Забезпечення майном зв'язку та елементами живлення (Батареї, Генератори, Зарядні станції)",
      "Лазнево-пральне забезпечення та гігієна у польових умовах",
      "Медичне забезпечення та постачання ліків/аптечок",
      "Польове електропостачання та генераторне господарство",
      "Облік військового майна та списування втраченого майна",
      "Захист тилових колон та складів від ударів БПЛА та артилерії",
      "Організація охорони та оборони тилових об'єктів",
      "Інвентаризація та моніторинг залишків матеріальних засобів",
      "Норми добового забезпечення та розрахунок потреб підрозділу",
      "Логістична підтримка при передислокації підрозділу",
      "Особливості тилового забезпечення у зимовий період",
      "Використання цивільної інфраструктури для потреб тилу",
      "Економіка та облік ресурсів тилу",
      "Підсумковий аналітичний огляд тилового забезпечення"
    ]
  },
  {
    "id": "operational_art",
    "title": "57. Оперативне мистецтво та планування операцій",
    "text": "Ви вивчите алгоритми прийняття військових рішень (MDMP, TLP), аналіз факторів METT-TC та OAKOC, розробку варіантів дій (COA), формування бойових наказів (OPORD), планування взаємодії та аналіз дій після бою (AAR).",
    "prefix": "operational_art",
    "steps": [
      "Вступ до оперативного мистецтва та стратегії",
      "Взаємозв'язок тактики, оперативного мистецтва та стратегії",
      "Процес прийняття військових рішень (MDMP - Military Decision Making Process)",
      "Покроковий алгоритм TLP (Troop Leading Procedures) для малих підрозділів",
      "Аналіз факторів METT-TC (Mission, Enemy, Terrain, Troops, Time, Civilian)",
      "Аналіз противника (Order of Battle, Слабкі та сильні сторони)",
      "Аналіз місцевості за системою OAKOC (Obstacles, Avenues, Key Terrain, Observation, Cover)",
      "Розробка варіантів дій (COA - Course of Action Development)",
      "Порівняння та військова гра варіантів дій (COA Wargaming)",
      "Прийняття рішення командиром та формування задуму операції",
      "Складання бойового наказу (OPORD - Operation Order, 5 пунктів)",
      "Формування попереднього розпорядження (WARNORD) та виконаного наказу (FRAGORD)",
      "Визначення вирішальної точки (Decisive Point) та центру ваги (Center of Gravity)",
      "Синхронізація дій роду військ (Matrix of Synchronization)",
      "Планування вогневого ураження та артилерійської підтримки",
      "Планування повітряного простору та безпілотних операцій",
      "Планування інженерного забезпечення та маскування",
      "Планування зв'язку та управління (Annex K Signal)",
      "Планування тилового та медичного забезпечення",
      "Управління ризиками при плануванні операції (Risk Management)",
      "Організація взаємодії між суміжними підрозділами",
      "Проведення репетицій та опрацювання взаємодії (Rehearsals / ROC Drill)",
      "Управління ходом виконання операції та контроль виконання наказів",
      "Адаптація плану при зміні обстановки (Decision Points / Branch Plans)",
      "Аналіз проведеної операції (AAR - After Action Review)",
      "Оцінка досягнення операційних цілей (End State Evaluation)",
      "Особливості планування наступальних операцій",
      "Особливості планування оборонних операцій",
      "Особливості планування нестандартних та спеціальних операцій",
      "Підсумковий курс військового оперативного планування"
    ]
  },
  {
    "id": "military_comms",
    "title": "58. Військовий зв'язок та тактичні мережі",
    "text": "Ви опануєте засоби та радіозв'язок у війську: КХ/УКХ діапазони, цифровий тактичний зв'язок (Harris, Motorola), сіткові мережі MANET/Mesh, супутниковий зв'язок Starlink, дріт, радіодані та резервні плани зв'язку (PACE Plan).",
    "prefix": "military_comms",
    "steps": [
      "Вступ до військового зв'язку",
      "Ієрархія та класифікація тактичного зв'язку",
      "Короткохвильовий зв'язок (КХ / HF) для дальнього зв'язку",
      "Ультракороткохвильовий зв'язок (УКХ / VHF/UHF) для тактичної ланки",
      "Цифрові тактичні радіостанції (Motorola, Harris, Aselsan, Hytera)",
      "Режими роботи радіостанцій: Прямий канал (Direct/Simplex), Репітерний, Сітковий (Mesh)",
      "Тактичні сіткові мережі (MANET / Mesh Networks)",
      "Супутниковий зв'язок (Starlink, SATCOM) та його застосування на фронті",
      "Польовий дротовий зв'язок (ТА-57, П-274, Оптоволокно)",
      "Переваги та недоліки дротового зв'язку в умовах РЕБ",
      "Організація радіомереж та радіонапрямків у підрозділі",
      "Таблиці позывних, кодовані карти та радіодані",
      "Дисципліна ведення радіообміну та стандартні фрази (Prowords)",
      "Передавання координат та цілевказань по радіо",
      "Захист від перехоплення та прослуховування (Шифрування AES, Ключі)",
      "Захист від завад (ППРЧ / FHSS, Захищені канали)",
      "Виносні антени, щогли та коаксіальні кабелі",
      "Розрахунок дальності радіозв'язку та зон покриття (Radio Coverage Mapping)",
      "Забезпечення живленням засобів зв'язку (Акумулятори, Зарядні станції)",
      "Організація командно-штабних машин зв'язку (КШМ)",
      "Розгортання вузлів зв'язку пунктів управління",
      "Взаємодія різних систем зв'язку (Гейтвеї, Протокольні конвертери)",
      "Маскування антенного господарства від вогневого ураження",
      "Виявлення та усунення несправностей у мережах зв'язку",
      "Аварійний зв'язок та резервні канали (Pace Plan: Primary, Alternate, Contingency, Emergency)",
      "Захист командних радіомереж від витоку даних",
      "Особливості зв'язку під час штурмових дій та CQB",
      "Особливості зв'язку для розвідувальних груп у тилу",
      "Еволюція тактичного зв'язку під впливом цифрових технологій",
      "Підсумковий практичний курс військового зв'язку"
    ]
  },
  {
    "id": "psyops_info",
    "title": "59. Психологічні операції та інформаційна протидія",
    "text": "Ви вивчите методики інформаційно-психологічних операцій (ІПСО), аналіз ворожих наративів, протидію дезінформації, оцінку бойового стресу, морально-психологічне забезпечення (МПЗ) та формування інфо-стійкості.",
    "prefix": "psyops_info",
    "steps": [
      "Вступ до інформаційно-психологічних операцій (ІПСО / PsyOps)",
      "Цілі, завдання та рівні психологічних операцій",
      "Структура та канали поширення інформаційного впливу",
      "Цільові аудиторії (Ворожі війська, Цивільне населення ворога, Власні війська, Світова спільнота)",
      "Методи психологічного впливу: Деморалізація, Дезінформація, Паніка, Залякування",
      "Аналіз інформаційного середовища та моніторинг медіа",
      "Виявлення ворогових інформаційних кампаній та наративів",
      "Техніки створення дезінформації та маніпуляцій",
      "Використання соціальних мереж та месенджерів для ІПСО",
      "Листівки, гучномовці та засоби прямого психологічного впливу",
      "Психологічна протидія та контрпропаганда",
      "Підтримання морально-психологічного стану власних військ",
      "Профілактика панічних настроїв та чуток у підрозділах",
      "Робота з бойовим стресом, контузіями та посттравматичним синдромом (ПТСР)",
      "Формування стійкості (Resilience) особового складу",
      "Аналіз впливу втрат та негативних новин на боєздатність",
      "Захист від психологічних атак ворога в цифровому просторі",
      "Інформаційна гігієна та медіаграмотність для військових",
      "Роль офіцерів з морально-психологічного забезпечення (МПЗ)",
      "Стратегічні комунікації (StratCom) та зв'язки з громадськістю",
      "Фіксація та документування воєнних злочинів для інформаційного фронту",
      "Аналіз ботаферм, тролів та штучних мереж розповсюдження",
      "Використання глибоких фейків у психологічній війні",
      "Оцінка ефективності проведених психологічних операцій",
      "Етичні та правові межі застосування ІПСО",
      "Протидія ворожим схилянням до зради та дезертирства",
      "Організація дозвілля та психологічного розвантаження бійців",
      "Робота з родинами військовослужбовців",
      "Еволюція інформаційних війн у цифрову епоху",
      "Підсумковий огляд психологічних та інформаційних операцій"
    ]
  },
  {
    "id": "military_evolution",
    "title": "60. Сучасний досвід та еволюція військової справи",
    "text": "Завершальний блок присвячений аналізу сучасного досвіду ведення війни: мережево-центричним конфліктам, гібридним загрозам, еволюції застосування БПЛА, артилерії, РЕБ, ролі цивільних та дуальних технологій і ШІ.",
    "prefix": "military_evolution",
    "steps": [
      "Еволюція форм та способів ведення збройної боротьби",
      "Характер та особливості сучасних високоінтенсивних конфліктів",
      "Концепція мережево-центричної війни (Network-Centric Warfare)",
      "Концепція гібридної війни та сірих зон (Hybrid Warfare)",
      "Зміна ролі бронетехніки та артилерії під впливом масових БПЛА",
      "Революція безпілотних систем (Повітряних, Морських, Наземних)",
      "Трансформація системи протиповітряної оборони проти дешевих засобів ураження",
      "Роль космічної розвідки та супутникового зв'язку у сучасній війні",
      "Інформатизація поля бою та цифрові системи ситуаційної обізнаності",
      "Штучний інтелект та автоматизація в сучасних збройних силах",
      "Зміна тактики піхоти: Від великих з'єднань до мальних мобільних груп",
      "Роль високоточного зброї (PGM) у розмиванні тилу та фронту",
      "Еволюція радіоелектронної боротьби як постійного фактора ефіру",
      "Значення цивільних технологій (Dual-Use) у сучасній війні",
      "Роль волонтерського руху та краудсорсингу в забезпеченні армії",
      "Трансформація військово-промислового комплексу (ВПК) та швидке виробництво",
      "Логістичні виклики розтягнутих та прострілюваних ліній забезпечення",
      "Особливості вести бойових дій у щільно урбанізованій місцевості",
      "Проблема мінування території та масштабного розмінування",
      "Уроки та аналіз досвіду російсько-української війни",
      "Трансформація військової доктрини країн НАТО на основі нового досвіду",
      "Зміна підходів до навчання та підготовки військовослужбовців",
      "Значення гнучкості адаптації розробок у реальному часі (Fast Iteration Loops)",
      "Роль психологічної стійкості суспільства у тривалій війні виснаження",
      "Кіберпростір як повноцінний домен ведення бойових дій",
      "Проблеми стандартизації та сумісності зброї різних виробників",
      "Аналіз ефективності нових типів озброєнь",
      "Оцінка майбутніх загроз та перспективних військових технологій",
      "Роль аналітики даних у плануванні майбутніх збройних сил",
      "Підсумковий підсумковий синтез курсів військової справи"
    ]
  }    ];

    tracksMetadata.forEach((meta) => {
      const trackSteps: Step[] = [];
      meta.steps.forEach((stepName, stepIdx) => {
        const stepNumber = stepIdx + 1;
        const stepId = `${meta.prefix}_${stepNumber}`;
        const stepTitle = `${stepIdx + 1}. ${stepName}`;
        
        // Generate 8 substeps
        const substeps: Substep[] = [];
        let subtopicTemplates = [
          { title: "Теоретичний фундамент та концепції", desc: `Фундаментальні концепції, термінологія та теоретичні основи вивчення теми "${stepName}".` },
          { title: "Математичний апарат та формули", desc: `Математичні моделі, ключові формули, рівняння та розрахункові алгоритми для "${stepName}".` },
          { title: "Ключові інструменти та бібліотеки", desc: `Основний інструментарій, спеціалізовані фреймворки та бібліотеки (Python, SQL, хмари), що використовуються для "${stepName}".` },
          { title: "Практична реалізація та код", desc: `Покрокове написання коду, побудова конвеєрів обробки та практичне моделювання для "${stepName}".` },
          { title: "Бізнес-інтеграція та використання", desc: `Реальні кейси впровадження, інтерпретація отриманих результатів та бізнес-метрики для оцінки "${stepName}".` },
          { title: "Оптимізація та масштабування", desc: `Методи підвищення продуктивності обчислень, оптимізація пам'яті та робота з великими обсягами даних для "${stepName}".` },
          { title: "Типові помилки та підводні камені", desc: `Аналіз частих помилок при розробці, відлагодження коду та обробка виняткових сценаріїв для "${stepName}".` },
          { title: "Практичний кейс та тестування", desc: `Аналіз реального бізнес-сценарію, вирішення практичних задач та перевірка знань з теми "${stepName}".` }
        ];

        
        if (meta.prefix === "math") {
          const specificList = (mathSuperSpecificSubsteps as Record<number, Array<{ title: string; desc: string }>>)[stepNumber] || subtopicTemplates;
          subtopicTemplates = specificList.map((item: { title: string; desc: string }) => ({ title: item.title, desc: item.desc }));
        }


        subtopicTemplates.forEach((template, subIdx) => {
          const subNumber = subIdx + 1;
          const subId = `${stepId}_${subNumber}`;
          substeps.push({
            id: subId,
            title: `${subNumber}. ${template.title}`,
            text: template.desc
          });
        });

        trackSteps.push({
          id: stepId,
          title: stepTitle,
          text: `Детальний опис та вивчення теми "${stepName}", включаючи інструменти, алгоритми та найкращі інженерні практики.`,
          substeps: substeps
        });
      });

      tracks.push({
        id: meta.id,
        title: meta.title,
        text: meta.text,
        x: 0,
        steps: trackSteps
      });
    });

    tracks.forEach((track, trackIdx) => {
      const nodes: any[] = [];
      const edges: any[] = [];

      const trackNumber = trackIdx + 1;
      const trackTitleWithoutNumber = track.title.substring(track.title.indexOf(' ') + 1);
      let suffix = " для Data Science/Analytics/Engineering/ML Engineer/MLops";
      if (trackNumber > 40) {
        suffix = " для Military Science/Defense Knowledge/Tactical Domain";
      } else if (trackNumber > 20) {
        suffix = " для MilTech/OSINT/Defense Tech/Defense Analytics";
      }
      const dynamicTrackTitle = trackNumber + ". " + trackTitleWithoutNumber + suffix;

      // 1. Add root node for this roadmap
      nodes.push({
        id: "root",
        x: 800,
        y: 50,
        type: "text",
        title: dynamicTrackTitle,
        text: track.text
      });

      // 2. Iterate track steps
      track.steps.forEach((step, idx) => {
        const stepX = 800;
        const stepY = 250 + idx * 650;
        const stepNumber = idx + 1;
        const stepTitleWithoutNumber = step.title.substring(step.title.indexOf(' ') + 1);
        const dynamicStepTitle = trackNumber + "." + stepNumber + " " + stepTitleWithoutNumber;

        nodes.push({
          id: step.id,
          x: stepX,
          y: stepY,
          type: "text",
          title: dynamicStepTitle,
          text: step.text
        });
        
        // Connect to parent step
        if (idx === 0) {
          edges.push({ from: "root", to: step.id });
        } else {
          edges.push({ from: track.steps[idx - 1].id, to: step.id });
        }
        
        // Iterate substeps
        step.substeps.forEach((sub, subIdx) => {
          const subNumber = subIdx + 1;
          const subTitleWithoutNumber = sub.title.substring(sub.title.indexOf(' ') + 1);
          const dynamicSubTitle = trackNumber + "." + stepNumber + "." + subNumber + " " + subTitleWithoutNumber;

          // Layout substeps symmetrically on left and right sides
          let subX = 800;
          if (subIdx === 0) subX = 800 - 560;
          else if (subIdx === 1) subX = 800 - 280;
          else if (subIdx === 2) subX = 800 + 280;
          else if (subIdx === 3) subX = 800 + 560;
          else if (subIdx === 4) subX = 800 - 560;
          else if (subIdx === 5) subX = 800 - 280;
          else if (subIdx === 6) subX = 800 + 280;
          else if (subIdx === 7) subX = 800 + 560;

          // Symmetrical Row Y coordinate (4 in top row, 4 in bottom row)
          const isSecondRow = subIdx >= 4;
          const subY = stepY + (isSecondRow ? 100 : -100);

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

      createRoadmap(adminUserId, {
        title: dynamicTrackTitle,
        description: track.text,
        canvas_data: JSON.stringify({ nodes, edges }),
      });
    });
  }
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

export function run(statement: string, params?: BindParams) {
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

export function persist() {
  const data = ensureDb().export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

export function ensureDb() {
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

export function listRoadmaps(_userId: number) {
  // User explicitly requested roadmaps to be visible to all users
  const list = all<RoadmapRecord>('SELECT * FROM roadmaps', [], mapRoadmap)
  return list.sort((a, b) => {
    const matchA = a.title.match(/^\d+/)
    const matchB = b.title.match(/^\d+/)
    const numA = matchA ? parseInt(matchA[0], 10) : 999
    const numB = matchB ? parseInt(matchB[0], 10) : 999
    return numA - numB
  })
}

export function getRoadmap(_userId: number, id: number) {
  return one<RoadmapRecord>('SELECT * FROM roadmaps WHERE id = ?', [id], mapRoadmap)
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
  run('INSERT INTO auth_sessions (token, userId, createdAt) VALUES (?, ?, ?)', [token, user.id, new Date().toISOString()])
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

const predefinedLessonsContent: Record<string, string> = {
  "1. Що таке Python: історія, переваги та сфери застосування.": `<div class='lesson-section'>
<h2>БЛОК 1. ГЛИБОКА ТЕОРІЯ: Історія, Філософія та Еволюція Python</h2>
<p>Мова програмування Python має надзвичайно цікаву, багату та нетипову історію створення, яка кардинально відрізняє її від більшості інших популярних технологій. Вона з'явилася не як комерційний продукт гігантської корпорації з багатомільйонним бюджетом, не як результат академічних досліджень цілого університету, а як суто індивідуальний, майже домашній проект для хобі, створений голландським програмістом <strong>Гвідо ван Россумом</strong> (Guido van Rossum).</p>

<p>Щоб по-справжньому зрозуміти філософію, архітектуру та навіть деякі дивні особливості Python (наприклад, обов'язкові відступи або глобальне блокування інтерпретатора), необхідно зануритися в історичний контекст кінця вісімдесятих років минулого століття. Наприкінці 1980-х років Гвідо працював у Національному науково-дослідному інституті математики та інформатики (CWI) в Амстердамі. Його основна професійна діяльність була пов'язана із розробкою розподіленої операційної системи під назвою <code>Amoeba</code>.</p>

<p>Для адміністрування цієї складної системи, написання мережевих утиліт та автоматизації рутинних завдань розробникам була конче потрібна гнучка скриптова мова. Використовувати мову <code>C</code> (Сі) для таких задач було вкрай неефективно — вона була занадто низькорівневою, вимагала ручного управління пам'яттю (<code>malloc</code> та <code>free</code>), а також постійного перекомпілювання коду. З іншого боку, існуючі командні оболонки Unix (shell scripts) та мови на кшталт <code>awk</code> чи <code>Perl</code> (який тоді тільки зароджувався) не мали достатньої гнучкості, архітектурної чистоти та вбудованих структур даних для побудови великих, надійних систем.</p>

<h3>Вплив мови ABC</h3>
<p>До цього періоду Гвідо ван Россум також брав активну участь у створенні мови програмування <strong>ABC</strong>. Вона створювалася в CWI як навчальне середовище для людей без профільної технічної освіти: математиків, лінгвістів, аналітиків, учених. Метою ABC було замінити <code>BASIC</code>. Мова мала революційний для свого часу дизайн. Основні інновації ABC, які пізніше перейшли до Python:</p>

<ul>
  <li><code>Чистий синтаксис</code> — мова читалася майже як звичайна англійська мова, без зайвого синтаксичного шуму.</li>
  <li><code>Відсутність зайвих символів</code> — не було потреби використовувати фігурні дужки <code>{}</code> для блоків або крапки з комою <code>;</code> в кінці рядків.</li>
  <li><code>Обов'язкові відступи</code> — групування блоків коду відбувалося виключно за допомогою відступів (пробілів або табуляцій), що візуально дисциплінувало програмістів і змушувало їх писати ідеально читабельний код.</li>
</ul>

<p>Проте, незважаючи на елегантність, мова ABC мала суттєві архітектурні недоліки. Вона була занадто закритою та монолітною. Програмісти не мали інструментів для доступу до низькорівневих викликів операційної системи (файлової системи, мережевих сокетів). Вона не підтримувала динамічне розширення модулями, написаними на інших мовах, і страждала від серйозних проблем із швидкодією при роботі з великими обсягами даних. Гвідо ван Россум, маючи цей багатий досвід, вирішив створити власну мову, яка об'єднала б найкращі, найелегантніші концепції синтаксису ABC із міццю, швидкістю та розширюваністю системного програмування на <code>C</code>.</p>

<h3>Народження Python</h3>
<p>У грудні 1989 року, шукаючи цікавий проект для програмування під час різдвяних канікул (оскільки офіс CWI був закритий), Гвідо сів за написання інтерпретатора для нової мови. Назву було запозичено з його улюбленого британського комедійного скетч-шоу <em>Летючий цирк Монті Пайтона (Monty Python's Flying Circus)</em>. Автор хотів, щоб нова мова асоціювалася не лише з серйозним, суворим системним програмуванням, але й з легкістю, веселощами, креативністю та відсутністю зайвого академізму.</p>

<blockquote>
  ❗ <strong>Увага:</strong> Ніколи не використовуйте назву мови Python для позначення плазунів або змій у серйозних технічних текстах. Ця мова глибоко асоціюється з філософією простоти та швидкості розробки, а не з зоологією. Хоча на сучасному логотипі, затвердженому спільнотою, зображені дві змії, оригінальна назва є даниною поваги гумористичній групі. Розробників на Python часто називають <strong>Pythonistas</strong> (Пітоністи).
</blockquote>

<h3>Хронологія розвитку та війни зворотної сумісності</h3>
<p>Еволюція версій мови Python супроводжувалася серйозними змінами в її архітектурі. На відміну від багатьох інших мов, які бояться ламати сумісність старих програм, розробники Python завжди ставили чистоту архітектури вище за збереження спадщини (legacy). Кожен мажорний реліз приносив фундаментальні зміни у підкапотні механізми.</p>

<ul>
  <li><code>Python 1.0</code> — випущений у січні 1994 року. Це була перша стабільна версія. Вона принесла базові засоби функціонального програмування, багато з яких були запозичені з Lisp. Завдяки активним пропозиціям спільноти з'явилися такі інструменти як <code>lambda</code>, <code>map</code>, <code>filter</code> та <code>reduce</code>. У цей час Python почав набирати стрімку популярність серед вчених, математиків та системних адміністраторів завдяки вбудованій підтримці комплексних чисел та легкій роботі з файлами.</li>
  
  <li><code>Python 2.0</code> — випущений у жовтні 2000 року. Знаковий, переломний реліз. Було додано надзвичайно потужні <strong>спискові включення (list comprehensions)</strong>, запозичені з мови Haskell. Найголовнішою зміною під капотом став новий <strong>циклічний збирач сміття (Garbage Collector)</strong>, що нарешті навчився виявляти замкнені циклічні посилання в пам'яті (раніше використовувався лише підрахунок посилань). Також з'явилася початкова, хоч і недосконала, підтримка кодування <code>Unicode</code>. Ця версія зробила Python індустріальним стандартом.</li>
  
  <li><code>Python 3.0</code> — випущений у грудні 2008 року. Це найбільший, найамбітніший і найболючіший реліз в історії мови. Гвідо ван Россум вирішив піти на безпрецедентний крок: свідомо зламати зворотну сумісність (backwards compatibility). Головна мета — безжально очистити мову від накопичених за 15 років історичних помилок проектування, милиць та нелогічних конструкцій. Проект отримав кодову назву "Python 3000" або "Py3k".</li>
</ul>

<p>Перехід від версії 2 до версії 3 став справжнім випробуванням для всієї світової IT-спільноти. Він тривав більше 10 років (офіційна підтримка Python 2 завершилася лише 1 січня 2020 року). Мільйони рядків коду у великих компаніях (Google, Instagram, Dropbox) довелося переписувати вручну або за допомогою утиліти <code>2to3</code>. Що ж саме такого радикального змінилося у Python 3.0?</p>

<ol>
  <li><code>Рядки та Unicode (The Unicode Pain)</code> — у Python 2 існувало жорстке розділення на звичайні байтові рядки (ASCII) типу <code>str</code> та Unicode-рядки типу <code>unicode</code>. Спроба об'єднати або порівняти їх викликала сумнозвісну помилку <code>UnicodeDecodeError</code>. Це був кошмар для програмістів з неангломовних країн. У Python 3 справедливість було відновлено: абсолютно всі текстові рядки стали повноцінним Unicode (UTF-8) за замовчуванням, а для сирих бінарних даних, пакетів мережі та зображень з'явився окремий жорсткий тип <code>bytes</code>.</li>
  
  <li><code>Функція print()</code> — в Python 2 <code>print</code> був спеціальною інструкцією мови (statement), і писався як <code>print "Hello"</code>. Це створювало проблеми, якщо ви хотіли передати його як аргумент в іншу функцію (наприклад, у <code>map</code>) або перевизначити його поведінку. У Python 3 інструкцію скасували, і <code>print()</code> стала повноцінною вбудованою функцією. Це дозволило передавати її як об'єкт першого класу, а також надзвичайно гнучко налаштовувати розділювачі через аргумент <code>sep="|"</code> та символи закінчення рядка через <code>end=""</code>.</li>
  
  <li><code>Цілочисельне ділення</code> — це класична математична пастка Python 2. Якщо ви писали <code>5 / 2</code>, інтерпретатор бачив два цілих числа і застосовував цілочисельне ділення, повертаючи <code>2</code> (жорстко відкидаючи дробову частину .5). Це призводило до катастрофічних помилок у фінансових та наукових обчисленнях. У Python 3 оператор <code>/</code> завжди, за будь-яких умов, повертає дійсне число (<code>2.5</code>, тип <code>float</code>). А для тих випадків, коли програмісту дійсно потрібне цілочисельне ділення з відкиданням залишку, було введено спеціальний оператор <code>//</code>.</li>
  
  <li><code>Ліниві ітератори</code> — у Python 2 такі функції як <code>range()</code>, <code>dict.keys()</code>, <code>dict.values()</code>, <code>map()</code>, <code>filter()</code> миттєво створювали в оперативній пам'яті повноцінні списки. Якщо ви викликали <code>range(1_000_000)</code>, програма моментально виділяла мегабайти оперативної пам'яті під мільйон чисел. У Python 3 всі ці функції стали повертати ліниві ітератори (генератори), які обчислюють і видають наступне значення лише тоді, коли воно дійсно потрібно. Це колосально зменшило споживання пам'яті (Memory Footprint) і дозволило працювати з нескінченними або гігантськими послідовностями даних.</li>
</ol>

<p>Сьогодні Python продовжує активно розвиватися під керівництвом Python Steering Council. Сучасні версії (Python 3.10+) принесли такі революційні фічі як структурне зіставлення зразків (Structural Pattern Matching — <code>match/case</code>), потужні анотації типів, швидший парсер PEG, та постійні оптимізації швидкодії у проекті Faster CPython під керівництвом Марка Шеннона та Гвідо ван Россума. Python став незаперечним лідером у сфері машинного навчання, штучного інтелекту, веб-розробки та аналізу даних.</p>
</div><div class='lesson-section'>
<h2>БЛОК 2. ВНУТРІШНЯ АРХІТЕКТУРА CPYTHON: Шлях коду від тексту до процесора</h2>
<p>Більшість початківців вважає, що Python — це просто програма, яка читає текст і магічним чином його виконує. Але як Senior розробник, ви зобов'язані розуміти внутрішній устрій інтерпретатора. Без цього знання неможливо писати високопродуктивний код, оптимізувати використання оперативної пам'яті та уникати вузьких місць (bottlenecks) в архітектурі ваших додатків.</p>

<h3>2.1 Що таке CPython і чому існують альтернативи?</h3>
<p>Коли ви переходите на офіційний сайт <code>python.org</code> і натискаєте кнопку "Download", ви завантажуєте не абстрактний "Python". Ви завантажуєте конкретну програму, яка називається <strong>CPython</strong>. CPython — це так звана еталонна реалізація (reference implementation) мови Python, яка повністю написана на мові програмування <strong>C (Сі)</strong>. Саме розробники CPython визначають, як має працювати мова, які фічі додавати, і які стандарти затверджувати в документах PEP (Python Enhancement Proposals).</p>

<p>Однак специфікація мови Python є відкритою. Це означає, що будь-хто у світі може написати свій власний інтерпретатор, який читатиме код Python і виконуватиме його. Завдяки цьому виникли альтернативні реалізації, кожна з яких вирішує специфічні архітектурні або бізнес-задачі:</p>

<ul>
  <li><code>PyPy</code> — мабуть, найвідоміша альтернатива. Написана на самому Python (а точніше, на його підмножині RPython). Головна фішка PyPy — наявність вбудованого JIT-компілятора (Just-In-Time). Під час виконання вашої програми PyPy аналізує "гарячі ділянки" коду (наприклад, складні математичні цикли) і на льоту компілює їх у високооптимізований машинний код. Завдяки цьому чисті математичні алгоритми на PyPy можуть виконуватися в 3, 5 або навіть 10 разів швидше, ніж на стандартному CPython. Проте він споживає більше пам'яті на старті і має проблеми з сумісністю деяких C-розширень (наприклад, NumPy працює в ньому нестабільно або повільно).</li>
  
  <li><code>Jython</code> — унікальна реалізація мови Python для гігантської екосистеми Java. Jython компілює ваш Python-код не у свій власний байт-код, а безпосередньо у байт-код віртуальної машини Java (JVM). Це дозволяє вам у Python-скрипті писати <code>import java.util.ArrayList</code> і безшовно використовувати всю міць корпоративних Java-бібліотек. Проект наразі розвивається повільно і застряг на старих версіях Python, але свого часу здійснив революцію в інтеграції систем.</li>
  
  <li><code>IronPython</code> — аналог Jython, але створений Microsoft для платформи .NET та мови C#. Він компілює код Python у Common Intermediate Language (CIL), дозволяючи імпортувати класи з .NET Framework. Чудово підходить для написання макросів у Windows-додатках.</li>
  
  <li><code>MicroPython</code> та <code>CircuitPython</code> — надзвичайно оптимізовані, мінімалістичні версії Python, розроблені спеціально для роботи на мікроконтролерах (таких як Raspberry Pi Pico, ESP32, Arduino). Вони здатні повноцінно працювати на пристроях, які мають всього 256 кілобайт оперативної пам'яті та процесор частотою 100 МГц, керуючи при цьому сенсорами, моторами, дисплеями та підключаючись до Wi-Fi. Це зробило Python мовою №1 для прототипування в галузі Інтернету речей (IoT).</li>
</ul>

<h3>2.2 Життєвий цикл виконання коду в CPython</h3>
<p>Давайте розберемо під мікроскопом, що саме відбувається під капотом комп'ютера за ті мілісекунди, коли ви вводите команду <code>python main.py</code> у терміналі. Процес виконання ділиться на три складні фази, кожна з яких виконує свою специфічну роботу.</p>

<p><strong>Фаза 1: Лексичний аналіз (Tokenization) та Синтаксичний аналіз (Parsing)</strong></p>
<p>Насамперед, CPython відкриває ваш файл <code>main.py</code> і починає читати його як звичайний текст, символ за символом. Увімкнений Лексер (Lexical Analyzer) розбиває суцільний текст на найменші логічно значущі частинки — <strong>токени</strong> (tokens). Наприклад, рядок <code>x = 5 + 10</code> буде розбито на токени: ідентифікатор <code>x</code>, оператор присвоювання <code>=</code>, число <code>5</code>, оператор <code>+</code>, число <code>10</code>. На цьому ж етапі CPython перевіряє правильність ваших відступів.</p>

<p>Далі вступає в гру Парсер (Parser). Він бере потік токенів і починає будувати з них деревоподібну структуру даних, яка називається <strong>AST (Abstract Syntax Tree)</strong> — абстрактне синтаксичне дерево. AST відображає всю ієрархічну, граматичну логіку вашої програми у вигляді розгалужених вузлів пам'яті C. Якщо ви забули дужку, двокрапку або написали маячню, Парсер не зможе побудувати дерево і моментально викине <code>SyntaxError</code> (Синтаксична помилка). Важливо розуміти: на цьому етапі код ще НЕ виконується, відбувається лише перевірка граматики.</p>

<p><strong>Фаза 2: Компіляція у байт-код (Bytecode Compilation)</strong></p>
<p>CPython бере готове AST-дерево і передає його своєму вбудованому компілятору. Цей компілятор транслює громіздке AST у так званий <strong>байт-код (bytecode)</strong>. Байт-код — це набір дуже простих, низькорівневих, числових інструкцій, які вже зовсім не схожі на текст Python. Вони оптимізовані спеціально для віртуальної машини Python. Кожна команда байт-коду має довжину рівно в один або два байти (наприклад, число 100 може означати "завантажити змінну", число 23 — "додати два числа").</p>

<p>Байт-код повністю незалежний від платформи. Це означає, що байт-код, згенерований на комп'ютері з процесором Intel Core i7 під управлінням Windows, буде абсолютно ідентичним байт-коду, згенерованому на процесорі Apple M2 під macOS або на мікропроцесорі ARM під Linux. Цей згенерований байт-код упаковується в спеціальну C-структуру <code>PyCodeObject</code>. </p>

<p>Щоб не витрачати дорогоцінний час процесора на парсинг і компіляцію одного й того ж файлу при кожному запуску, CPython кешує (зберігає) цей згенерований байт-код на жорсткому диску. Ви напевно бачили файли з розширенням <code>.pyc</code> у прихованій директорії <code>__pycache__</code>. Це і є заморожені, серіалізовані об'єкти байт-коду. При наступному запуску CPython перевіряє мітку часу модифікації вихідного файлу <code>.py</code> і кешованого файлу <code>.pyc</code>. Якщо вихідний код не змінювався, етап компіляції повністю пропускається, що значно прискорює запуск програми.</p>

<p><strong>Фаза 3: Віртуальна машина Python (PVM - Python Virtual Machine)</strong></p>
<p>Сам по собі байт-код — це лише набір чисел. Фізичний процесор вашого комп'ютера (CPU) не вміє їх читати і не розуміє, що з ними робити. Тому CPython запускає останній, найголовніший компонент — <strong>PVM (Python Virtual Machine)</strong>.</p>

<p>PVM — це програмна емуляція мікропроцесора. Під капотом PVM — це гігантський, нескінченний цикл <code>while</code>, написаний на мові C (він знаходиться у файлі <code>ceval.c</code> у сирцях CPython). Цей цикл читає інструкції байт-коду одну за одною і викликає відповідні C-функції для їх виконання.</p>

<p>Важливо розуміти архітектуру PVM: це <strong>стекова віртуальна машина (Stack-based Virtual Machine)</strong>. На відміну від реальних фізичних процесорів (або віртуальних машин Lua та Dalvik), які використовують регістри пам'яті для зберігання проміжних даних, PVM використовує структуру даних "Стек" (LIFO - Last In, First Out). Всі математичні операції, виклики функцій та робота зі змінними відбуваються через додавання значень на вершину стеку (push) та зняття значень з вершини стеку (pop).</p>

<blockquote>
  ❗ <strong>Увага:</strong> Ніколи не плутайте байт-код Python з машинним кодом (Machine Code) процесора. Байт-код виконується виключно програмною віртуальною машиною PVM (інтерпретується крок за кроком). Саме через цей додатковий шар абстракції (емуляцію стекової машини) швидкість виконання чистого коду в класичному CPython у 10-100 разів нижча, ніж у скомпільованих мовах з прямою генерацією машинного коду, таких як C++, Rust або Go. Python виграє за рахунок швидкості написання коду розробником, а не за рахунок швидкості виконання мікропроцесором.
</blockquote>

<h3>2.3 Дослідження байт-коду на практиці за допомогою модуля dis</h3>
<p>Як Senior розробник, ви не повинні сліпо довіряти інтерпретатору. Іноді потрібно точно знати, у які інструкції перетворюється ваш код, щоб зрозуміти причини падіння продуктивності. Для цього в стандартній бібліотеці Python є геніальний модуль <code>dis</code> (від слова Disassembler).</p>

<p>Він дозволяє зазирнути всередину об'єкта функції та побачити, як саме PVM бачить наш код у форматі мнемонік (зрозумілих людині назв байт-кодових інструкцій).</p>

<pre><code class="language-python">
import dis

def calculate_magic(a, b):
    # Додаємо два аргументи, множимо на 10 і зберігаємо
    result = (a + b) * 10
    return result

# Виводимо детальний розбір байт-коду функції на екран
print("Аналіз байт-коду функції calculate_magic:")
dis.dis(calculate_magic)
</code></pre>

<p>Якщо ви виконаєте цей скрипт у своєму середовищі, результат дизасемблера буде виглядати приблизно так (формат виводу може трохи відрізнятися залежно від версії Python, наприклад у Python 3.11+ додалися нові оптимізуючі інструкції, але базова суть незмінна):</p>

<pre><code class="language-plaintext">
Аналіз байт-коду функції calculate_magic:
  4           0 LOAD_FAST                0 (a)
              2 LOAD_FAST                1 (b)
              4 BINARY_ADD
              6 LOAD_CONST               1 (10)
              8 BINARY_MULTIPLY
             10 STORE_FAST               2 (result)

  5          12 LOAD_FAST                2 (result)
             14 RETURN_VALUE
</code></pre>

<p>Що означає кожна колонка у цьому магічному виводі?</p>
<ul>
  <li><code>Перша колонка (4, 5)</code> — номер рядка у вихідному файлі <code>.py</code>. У нашому випадку математика відбувається на 4 рядку, а повернення значення — на 5-му.</li>
  <li><code>Друга колонка (0, 2, 4...)</code> — байтове зміщення (адреса) інструкції в пам'яті від початку блоку коду. Кожна інструкція в сучасних версіях Python займає рівно 2 байти, тому адреси йдуть з кроком у два.</li>
  <li><code>Третя колонка (LOAD_FAST, BINARY_ADD...)</code> — людська назва (мнемоніка) команди (opcode).</li>
  <li><code>Четверта колонка (0, 1, 2)</code> — числовий аргумент для команди (наприклад, індекс змінної у внутрішньому масиві імен).</li>
  <li><code>П'ята колонка (у дужках)</code> — розшифроване значення аргументу для вашої зручності.</li>
</ul>

<p>Давайте виконаємо <strong>покрокове трасування</strong> роботи PVM (Віртуальної машини) для цієї функції, уявивши себе процесором:</p>
<ol>
  <li><code>LOAD_FAST 0 (a)</code> — PVM бере значення локальної змінної <code>a</code> і кладе його (Push) на вершину порожнього стеку. Стек: <code>[a]</code></li>
  <li><code>LOAD_FAST 1 (b)</code> — PVM бере значення локальної змінної <code>b</code> і кладе його поверх попереднього. Стек: <code>[a, b]</code></li>
  <li><code>BINARY_ADD</code> — PVM бачить оператор додавання. Вона знімає (Pop) два верхніх значення зі стеку (це <code>a</code> та <code>b</code>), передає їх у C-функцію для додавання, і результат (назвемо його <code>temp1</code>) кладе назад на вершину стеку. Стек: <code>[temp1]</code></li>
  <li><code>LOAD_CONST 1 (10)</code> — PVM завантажує константу <code>10</code> на вершину стеку. Стек: <code>[temp1, 10]</code></li>
  <li><code>BINARY_MULTIPLY</code> — PVM знімає зі стеку два верхніх значення (це <code>10</code> та <code>temp1</code>), виконує множення і результат (<code>temp2</code>) кладе на стек. Стек: <code>[temp2]</code></li>
  <li><code>STORE_FAST 2 (result)</code> — PVM знімає верхнє значення зі стеку і зберігає (присвоює) його локальній змінній <code>result</code>. Стек тепер повністю порожній: <code>[]</code>. Рядок 4 виконано.</li>
  <li><code>LOAD_FAST 2 (result)</code> — Починається рядок 5 (return). PVM знову бере значення змінної <code>result</code> і кладе його на стек. Стек: <code>[result]</code></li>
  <li><code>RETURN_VALUE</code> — PVM знімає верхнє значення зі стеку і повертає його як остаточний результат роботи функції, завершуючи її виконання.</li>
</ol>

<p>Тепер ви точно знаєте, як Python працює на найнижчому рівні. Це розуміння допоможе вам у майбутньому писати код, який генерує менше інструкцій байт-коду, тим самим прискорюючи виконання ваших алгоритмів.</p>
</div><div class='lesson-section'>
<h2>БЛОК 3. ПАМ'ЯТЬ ТА МЕХАНІЗМИ GIL: Анатомія об'єктів та багатопоточність</h2>

<h3>3.1 Управління пам'яттю: PyObject та Лічильники посилань</h3>
<p>У мовах на кшталт C або C++, коли ви створюєте ціле число <code>int x = 42;</code>, компілятор виділяє рівно 4 байти оперативної пам'яті на швидкому стеку процесора, куди просто записується бінарне представлення числа 42. Нічого зайвого. Це дає феноменальну швидкість і економію пам'яті.</p>

<p>У мові Python все влаштовано кардинально інакше. Python дотримується філософії: <strong>"Абсолютно все є об'єктом"</strong>. Навіть просте число, рядок або булеве значення <code>True</code> — це не просто байти даних. Це повноцінна структура (об'єкт), виділена у повільнішій динамічній пам'яті (Heap, Купі). Під капотом CPython кожен об'єкт представлений фундаментальною структурою мови C під назвою <code>PyObject</code>.</p>

<p>Структура <code>PyObject</code> гарантовано має два обов'язкові поля в своїй основі (заголовку):</p>
<ul>
  <li><code>ob_refcnt</code> (Reference Count) — лічильник посилань. Це ціле число, яке постійно оновлюється і зберігає точну кількість змінних, списків або словників у вашій програмі, які зараз вказують на цей конкретний об'єкт пам'яті.</li>
  <li><code>ob_type</code> — вказівник на структуру типу об'єкта. Вона описує, до якого класу належить об'єкт (наприклад, <code>int</code>, <code>str</code>, <code>list</code>, <code>CustomClass</code>), і які методи (C-функції) можна над ним виконувати.</li>
</ul>

<p>Для зберігання числа <code>42</code> на 64-бітній системі CPython створює об'єкт типу <code>PyLongObject</code>, який важить щонайменше <strong>28 байтів</strong>! Це у 7 разів більше, ніж у мові C. Чому так багато? 8 байт йде на лічильник посилань <code>ob_refcnt</code>, ще 8 байт — на вказівник типу <code>ob_type</code>, 8 байт — на розмір числа (оскільки Python підтримує числа нескінченної довжини), і лише останні байти зберігають саме число 42. Це ціна, яку розробники платять за динамічну типізацію, зручність та відсутність переповнення цілих чисел (integer overflow).</p>

<p>Основним механізмом керування пам'яттю в CPython є <strong>Підрахунок посилань (Reference Counting)</strong>. Цей механізм працює надзвичайно просто та детерміновано:</p>
<ol>
  <li>Як тільки ви створюєте об'єкт (наприклад, <code>x = [1, 2, 3]</code>), CPython виділяє для нього пам'ять і встановлює лічильник <code>ob_refcnt = 1</code>.</li>
  <li>Якщо ви створите нове посилання на цей самий об'єкт (наприклад, <code>y = x</code> або додасте його в інший список <code>data.append(x)</code>), інтерпретатор збільшить лічильник (викличе C-макрос <code>Py_INCREF</code>). Тепер лічильник дорівнює 2.</li>
  <li>Коли змінна виходить за межі області видимості (наприклад, функція завершує роботу) або ви явно видаляєте її (<code>del y</code>), інтерпретатор зменшує лічильник (викличе макрос <code>Py_DECREF</code>).</li>
  <li>Як тільки лічильник <code>ob_refcnt</code> досягає нуля (0), це означає, що до об'єкта більше неможливо отримати доступ з жодної точки програми. CPython <strong>негайно, в ту ж мілісекунду</strong>, знищує об'єкт і звільняє його пам'ять назад в операційну систему або у власний пул пам'яті.</li>
</ol>

<p>Давайте подивимося на це в дії за допомогою модуля <code>sys</code>:</p>

<pre><code class="language-python">
import sys

# Створюємо масив даних. Пам'ять виділено, лічильник = 1.
my_data = {"key": "secret_value"}

# Дивимось кількість посилань за допомогою sys.getrefcount()
# Увага: функція поверне 2! Чому? 
# Тому що при передачі my_data як аргументу у функцію getrefcount, 
# під капотом створюється тимчасове локальне посилання всередині самої функції.
print("Початковий лічильник:", sys.getrefcount(my_data)) # Виведе 2

# Створюємо ще одне посилання на той самий об'єкт у пам'яті
reference_copy = my_data
print("Лічильник після копіювання:", sys.getrefcount(my_data)) # Тепер виведе 3

# Видаляємо одне посилання
del reference_copy
print("Лічильник після видалення:", sys.getrefcount(my_data)) # Знову виведе 2
</code></pre>

<h3>3.2 Збирач сміття (Garbage Collector) та Циклічні посилання</h3>
<p>Механізм підрахунку посилань працює неймовірно швидко та ефективно. Проте він має одну фатальну, критичну вразливість, через яку пам'ять може витікати (Memory Leak) — це <strong>циклічні посилання (Reference Cycles / Circular References)</strong>.</p>

<p>Уявіть класичну ситуацію: ви створюєте два об'єкти, наприклад, два списки: <code>A</code> та <code>B</code>. Ви кладете посилання на <code>B</code> всередину списку <code>A</code>, а посилання на <code>A</code> кладете всередину списку <code>B</code>. Виникає замкнене коло. Тепер, якщо ви видалите зовнішні змінні <code>A</code> та <code>B</code> (виконаєте <code>del A, B</code>), ви більше не зможете звернутися до цих списків з коду. Однак їхні внутрішні лічильники <code>ob_refcnt</code> ніколи не стануть нулем, бо вони тримають посилання один на одного! Підрахунок посилань тут безсилий, і ці об'єкти назавжди зависнуть у пам'яті як "острови-привиди".</p>

<pre><code class="language-python">
# Приклад створення циклічного посилання
list_a = []
list_b = []

# Зв'язуємо їх один з одним
list_a.append(list_b)
list_b.append(list_a)

# Видаляємо зовнішні змінні. 
# Лічильники падають до 1, але не до 0! Пам'ять "витікає".
del list_a
del list_b
</code></pre>

<p>Для боротьби з цим лихом у CPython паралельно працює другий механізм — <strong>Циклічний Збирач сміття (Cyclic Garbage Collector, модуль <code>gc</code>)</strong>. Він не працює постійно, оскільки це сильно гальмувало б програму. Він запускається періодично, коли кількість нових створених об'єктів перевищує певну межу (threshold).</p>

<p>GC у CPython використовує надсучасний <strong>алгоритм на основі поколінь (Generational GC)</strong>. Він базується на емпіричному спостереженні (Гіпотеза поколінь), що <em>більшість об'єктів вмирають молодими</em> (наприклад, локальні змінні всередині функції існують лише долі секунди). Всі об'єкти в системі діляться на 3 покоління:</p>
<ul>
  <li><strong>Покоління 0 (Generation 0):</strong> Всі нові об'єкти (списки, словники, класи) народжуються тут. Збирач сміття найчастіше сканує саме це покоління. Під час сканування GC шукає циклічні посилання, розриває їх і видаляє "мертві" об'єкти.</li>
  <li><strong>Покоління 1 (Generation 1):</strong> Ті об'єкти з Покоління 0, які вижили після чистки (тобто вони комусь потрібні), переводяться (promote) до Покоління 1. Воно сканується в 10 разів рідше.</li>
  <li><strong>Покоління 2 (Generation 2):</strong> Об'єкти-довгожителі (наприклад, кеші даних, підключення до БД, глобальні константи), які пережили чистку в Поколінні 1, потрапляють сюди. Це покоління сканується надзвичайно рідко, щоб не зупиняти роботу програми (зупинка програми на час роботи GC називається <em>Stop-the-World</em> паузою).</li>
</ul>

<h3>3.3 Глобальне блокування інтерпретатора (GIL - Global Interpreter Lock)</h3>
<p>Ми підійшли до найсуперечливішої, найбільш обговорюваної і найбільш критикованої теми у світі Python — <strong>GIL (Global Interpreter Lock)</strong>. Якщо ви коли-небудь чули, що "Python не підтримує справжню багатопоточність", то це саме через GIL.</p>

<p>GIL — це спеціальний м'ютекс (захисний замок на рівні мови С), який гарантує, що <strong>в будь-який момент мікрочасу лише ОДИН потік операційної системи (OS Thread) може виконувати байт-код Python в межах одного процесу</strong>.</p>

<p>Чому Гвідо ван Россум додав цього "монстра" у мову? Відповідь лежить у попередньому розділі — Підрахунок посилань. Уявіть, що у вас є два потоки (Thread A та Thread B), які одночасно намагаються видалити елемент зі списку. Вони обидва звертаються до поля <code>ob_refcnt</code> об'єкта. Без захисту виникає класичний стан перегонів (Race Condition). Потік A читає лічильник (наприклад, 2), потік B читає лічильник (2). Потік A зменшує його і записує 1. Потік B теж зменшує його і записує 1. Хоча лічильник мав би стати 0 і об'єкт мав би бути видалений! У гіршому випадку лічильник міг би обнулитися завчасно, і один потік почав би читати дані зі звільненої області пам'яті, що призвело б до миттєвого краху програми (Segmentation Fault) або вразливості безпеки.</p>

<p>Щоб вирішити цю проблему без шалених втрат продуктивності (якби на кожен об'єкт вішали окремий замок, програма працювала б у 3 рази повільніше), розробники пішли простим шляхом: вони повісили <strong>один гігантський замок (GIL)</strong> на весь інтерпретатор PVM.</p>

<blockquote>
  ❗ <strong>Критично важливо для Senior розробників:</strong> Через наявність GIL використання модуля <code>threading</code> у Python <strong>АБСОЛЮТНО НЕ ДАЄ</strong> прискорення для обчислювальних задач (CPU-bound) — таких як обробка відео, навчання нейромереж, складна математика чи парсинг величезних JSON. Якщо у вас 8-ядерний процесор, багатопотокова програма на Python завантажить лише 1 ядро на 100%, а інші 7 ядер будуть простоювати, оскільки потоки постійно битимуться за GIL і чекатимуть один одного в черзі.
</blockquote>

<p>Але чи означає це, що модуль <code>threading</code> марний? Зовсім ні! Потоки чудово підходять для задач вводу-виводу (<strong>I/O-bound</strong>): завантаження веб-сторінок через мережу, очікування відповіді від повільної бази даних, запис файлів на жорсткий диск. Хитрість полягає в тому, що коли потік Python звертається до операційної системи для виконання I/O операції (наприклад, <code>requests.get()</code> або <code>time.sleep()</code>), інтерпретатор <strong>навмисно відпускає (знімає) GIL</strong>. В цей час інші потоки можуть вільно захопити GIL і виконувати свій байт-код. Тому багатопотоковий веб-скрапер на Python працюватиме в десятки разів швидше за однопотоковий.</p>

<p>Якщо ж вам потрібно задіяти всі 8 ядер процесора для важкої математики, розробники Python створили модуль <code>multiprocessing</code>. Він не створює легковагові потоки, він створює повноцінні <strong>незалежні процеси операційної системи</strong>. Кожен такий процес отримує власну ізольовану пам'ять, власний копію інтерпретатора і, найголовніше, власний незалежний GIL. Це дозволяє досягти справжнього 100% паралелізму ціною вищого споживання оперативної пам'яті.</p>

<p><em>Історична довідка: У 2024 році було офіційно прийнято PEP 703 (Making the Global Interpreter Lock Optional). З версії Python 3.13 почалася епоха "NoGIL" (або Free-Threading). Спільнота почала колосальний процес з обережного видалення GIL з мови, що докорінно змінить багатопоточне програмування на Python у найближчі 5 років.</em></p>
</div><div class='lesson-section'>
<h2>БЛОК 4. ФІЛОСОФІЯ ДЗЕН, PEP 8 ТА АНТИПАТЕРНИ</h2>

<h3>4.1 Дзен Python (The Zen of Python - PEP 20)</h3>
<p>У світі Python існує унікальне явище — глибока філософія проектування, яка задокументована у вигляді вірша з 19 афоризмів. Він був написаний видатним розробником Тімом Пітерсом у 1999 році (саме він винайшов алгоритм сортування TimSort, який зараз використовується у Python, Java та V8). Цей звід правил відомий як <strong>Дзен Python</strong>. Щоб побачити його, достатньо відкрити консоль і виконати секретну пасхалку:</p>

<pre><code class="language-python">
import this
</code></pre>

<p>Як Senior розробник, ви повинні не просто знати ці правила, але й керуватися ними при архітектурному проектуванні додатків. Розглянемо найважливіші догми з глибоким аналізом:</p>

<p><strong>1. Beautiful is better than ugly (Красиве краще за потворне)</strong><br/>
Код читається набагато частіше, ніж пишеться. Відсутність зайвого синтаксичного шуму (дужок, крапок з комою), правильне іменування та дотримання PEP 8 роблять код естетично привабливим твором мистецтва. Якщо ваш код виглядає як "локшина" (spaghetti code), його неможливо підтримувати.</p>

<p><strong>2. Explicit is better than implicit (Явне краще за неявне)</strong><br/>
Це правило №1, яке відрізняє професійний код від аматорського. Ніколи не покладайтеся на приховану "магію" мови чи фреймворку. Завжди явно вказуйте, звідки походять дані та функції. Класичний приклад — імпорти.</p>

<pre><code class="language-python">
# ПОГАНО (Неявний імпорт "зірочкою" - Wildcard import)
# Цей підхід засмічує поточний простір імен сотнями невідомих змінних.
# Якщо станеться конфлікт імен, ви витратите години на відлагодження.
from math import *
from my_custom_lib import *

result = sqrt(25) + log10(100) # З якої бібліотеки прийшла sqrt? Неясно.

# ДОБРЕ (Явний імпорт)
# Кожен розробник, що читає код, моментально бачить джерело залежності.
import math
from my_custom_lib import calculate_tax

result = math.sqrt(25) + math.log10(100)
tax = calculate_tax(result)
</code></pre>

<p><strong>3. Flat is better than nested (Пласке краще за вкладене)</strong><br/>
Глибока вкладеність блоків <code>if-else</code> або циклів (так званий Arrow Anti-Pattern, коли код виглядає як вістря стріли, зсунуте вправо) катастрофічно погіршує читабельність. Людський мозок важко утримує в пам'яті більше трьох рівнів вкладеності логіки. Слід використовувати техніку "Раннього повернення" (Early Return) або Guard Clauses.</p>

<pre><code class="language-python">
# ПОГАНО (Arrow Anti-Pattern - 4 рівні вкладеності)
def process_payment(user, amount):
    if user is not None:
        if user.is_active:
            if user.balance >= amount:
                if not user.is_banned:
                    print("Оплата пройшла успішно")
                    user.balance -= amount
                    return True
                else:
                    raise Exception("Користувач заблокований")
            else:
                raise Exception("Недостатньо коштів")
        else:
            raise Exception("Акаунт не активований")
    else:
        raise Exception("Користувач не існує")

# ДОБРЕ (Guard Clauses - Пласка, лінійна структура коду)
def process_payment_pro(user, amount):
    # Спочатку відсікаємо всі помилкові сценарії на одному рівні
    if user is None:
        raise Exception("Користувач не існує")
    if not user.is_active:
        raise Exception("Акаунт не активований")
    if user.is_banned:
        raise Exception("Користувач заблокований")
    if user.balance < amount:
        raise Exception("Недостатньо коштів")
    
    # Якщо код дійшов сюди, ми впевнені, що все добре. 
    # Вкладеність нульова.
    print("Оплата пройшла успішно")
    user.balance -= amount
    return True
</code></pre>

<p><strong>4. Errors should never pass silently (Помилки ніколи не повинні проходити мовчки)</strong><br/>
Найнебезпечніше, що ви можете зробити у великому проекті — це обгорнути сумнівний код у блок <code>try...except</code> і проігнорувати виняток за допомогою інструкції <code>pass</code>. Якщо система має впасти, вона повинна впасти голосно і негайно (Fail Fast). Приховання помилок призводить до непередбачуваної поведінки системи через дні чи тижні, і знайти першопричину буде майже неможливо.</p>

<pre><code class="language-python">
# АБСОЛЮТНЕ ЗЛО (Silent failure)
try:
    load_critical_configuration_file()
except Exception:
    # Якщо конфіг не знайдено, програма продовжить працювати з дефолтними даними,
    # що може призвести до видалення бази даних у production!
    pass 
</code></pre>

<h3>4.2 Стандарти кодування PEP 8</h3>
<p>PEP 8 (Python Enhancement Proposal 8) — це біблія стилю написання коду. Її зобов'язаний знати напам'ять кожен розробник, що йде на співбесіду. До основних, найсуворіших правил належать:</p>
<ul>
  <li><code>Відступи (Indentation)</code> — категорично заборонено використовувати символи табуляції (Tab). Тільки пробіли. Рівно 4 пробіли на один рівень вкладеності. Змішування табів і пробілів викличе помилку <code>TabError</code> в Python 3.</li>
  <li><code>Довжина рядка</code> — максимальна довжина рядка коду не повинна перевищувати 79 символів (або 88 символів, якщо ви використовуєте сучасний автоформатер <code>Black</code>), а для коментарів і докстрінгів — 72 символи. Це дозволяє відкривати кілька файлів поруч на одному моніторі.</li>
  <li><code>Іменування змінних (Naming Conventions)</code>:
    <ul>
      <li>Функції, змінні, методи та атрибути пишуться у стилі <code>snake_case</code> (маленькі літери з підкресленням): <code>calculate_total_price()</code>.</li>
      <li>Класи пишуться у стилі <code>PascalCase</code> (або UpperCamelCase): <code>ShoppingCart</code>, <code>BaseDatabaseConnection</code>.</li>
      <li>Глобальні константи пишуться у стилі <code>UPPER_CASE_WITH_UNDERSCORES</code>: <code>MAX_RETRIES_COUNT = 5</code>, <code>PI = 3.1415</code>.</li>
      <li>Приватні внутрішні методи класу повинні починатися з одного підкреслення: <code>_internal_logic()</code>. Це сигнал іншим розробникам, що метод не є частиною публічного API.</li>
    </ul>
  </li>
  <li><code>Імпорти</code> — повинні завжди знаходитися на самому початку файлу (одразу після докстрінгу модуля) і бути розбиті на три окремі блоки, розділені пустими рядками:
    <ol>
      <li>Імпорти стандартної бібліотеки (<code>import os</code>, <code>import sys</code>).</li>
      <li>Імпорти сторонніх бібліотек (<code>import requests</code>, <code>import django</code>).</li>
      <li>Локальні імпорти вашого проекту (<code>from .models import User</code>).</li>
    </ol>
  </li>
</ul>

<h3>4.3 Легендарний Антипатерн: Мутабельні аргументи за замовчуванням</h3>
<p>Якщо ви спитаєте у Senior розробника, яка найпоширеніша і найнебезпечніша помилка, яку допускають мідли в Python, відповідь буде миттєвою: <strong>використання змінюваних (мутабельних) об'єктів як значень аргументів за замовчуванням</strong>.</p>

<p>Це класичне питання на будь-якій технічній співбесіді. Чому не можна писати <code>def func(my_list=[]):</code> ?</p>
<p>Справа в тому, що у мові Python значення аргументів за замовчуванням обчислюються (evaluated) <strong>лише один раз</strong> — у момент першого парсингу та компіляції функції (коли CPython створює об'єкт функції). Це означає, що список <code>[]</code> створюється в оперативній пам'яті один раз. Всі наступні виклики функції без передачі аргументу будуть використовувати посилання на <strong>цей самий єдиний список</strong> у пам'яті.</p>

<pre><code class="language-python">
# АНТИПАТЕРН: Мутабельний аргумент за замовчуванням
def append_to_list(value, item_list=[]):
    item_list.append(value)
    return item_list

# Перший виклик виглядає нормально
print(append_to_list(1)) # Виведе: [1]

# Другий виклик відбувається без передачі списку. 
# Очікується [2], але список ЗБЕРІГ свій стан з минулого разу!
print(append_to_list(2)) # Виведе: [1, 2] - Катастрофа в бізнес-логіці!

# Третій виклик додає дані до того ж глобального списку
print(append_to_list(3)) # Виведе: [1, 2, 3]

# ПРАВИЛЬНИЙ (ІДІОМАТИЧНИЙ) ПІДХІД
# Завжди використовуйте імутабельний None як маркер відсутності значення.
def append_to_list_safe(value, item_list=None):
    if item_list is None:
        item_list = [] # Створюємо НОВИЙ незалежний список при КОЖНОМУ виклику
    item_list.append(value)
    return item_list

print(append_to_list_safe(1)) # Виведе: [1]
print(append_to_list_safe(2)) # Виведе: [2] - Працює ідеально!
</code></pre>
</div><div class='lesson-section'>
<h2>БЛОК 5. ІНТЕРАКТИВНЕ ЗАВДАННЯ ДЛЯ МІНІ-IDE</h2>
<p>Теорія без практики не має сенсу. Настав час застосувати отримані знання про стандарти написання чистого коду (PEP 8) та правильне використання патернів проектування (наприклад, Guard Clauses).</p>

<h3>Завдання: Безпечний аналізатор користувачів</h3>
<p><strong>Умова:</strong> Вам потрібно написати функцію, яка аналізує профіль користувача і повертає статус доступу. Вимоги до коду суворі (відповідно до PEP 8):</p>
<ul>
  <li>Функція повинна називатися у стилі snake_case: <code>verify_user_access</code>.</li>
  <li>Вона приймає два параметри: <code>user_data</code> (словник з даними користувача) та <code>required_role</code> (рядок з назвою ролі, за замовчуванням має бути <code>None</code>).</li>
  <li>Щоб уникнути Arrow Anti-Pattern (надмірної вкладеності <code>if-else</code>), використовуйте техніку Guard Clauses (раннього повернення):
    <ul>
      <li>Якщо словник <code>user_data</code> порожній (не містить ключів), функція має миттєво повернути рядок <code>"Access Denied: Empty Data"</code>.</li>
      <li>Якщо в словнику немає ключа <code>"role"</code>, повернути <code>"Access Denied: No Role"</code>.</li>
      <li>Якщо <code>required_role</code> не дорівнює <code>None</code>, але роль користувача (<code>user_data["role"]</code>) не співпадає з <code>required_role</code>, повернути <code>"Access Denied: Wrong Role"</code>.</li>
      <li>Якщо всі перевірки пройдено успішно, функція має повернути рядок <code>"Access Granted"</code>.</li>
    </ul>
  </li>
</ul>

<p><strong>Стартовий код для редактора:</strong></p>
<pre><code class="language-python">
# Ваше завдання: реалізуйте функцію verify_user_access
# Не забувайте про Guard Clauses замість глибокої вкладеності!

def verify_user_access(user_data, required_role=None):
    # Перевірка 1: чи словник не пустий
    
    # Перевірка 2: чи існує ключ "role"
    
    # Перевірка 3: чи співпадають ролі (якщо required_role передано)
    
    # Успішний результат
    pass
</code></pre>

<p><strong>Очікуваний результат (Тести, які виконає система):</strong></p>
<ul>
  <li><code>verify_user_access({})</code> ➞ <code>"Access Denied: Empty Data"</code></li>
  <li><code>verify_user_access({"name": "Ivan"})</code> ➞ <code>"Access Denied: No Role"</code></li>
  <li><code>verify_user_access({"name": "Ivan", "role": "User"}, "Admin")</code> ➞ <code>"Access Denied: Wrong Role"</code></li>
  <li><code>verify_user_access({"name": "Admin", "role": "Admin"}, "Admin")</code> ➞ <code>"Access Granted"</code></li>
</ul>


<h2>БЛОК 6. ТЕСТИ ДЛЯ ПЕРЕВІРКИ ЗНАНЬ (QUIZ)</h2>
<p>Перевірте, наскільки глибоко ви засвоїли найскладніші концепції внутрішньої архітектури Python, пройшовши ці три запитання підвищеної складності.</p>

<div class="quiz-container" data-correct-index="2" data-explanation="Правильна відповідь: Збирання сміття на основі поколінь (Generational GC). Механізм підрахунку посилань неймовірно швидкий, але він фундаментально не здатний виявити циклічні посилання. Тільки періодичне сканування пам'яті за допомогою поколінь GC може розірвати замкнені графи посилань і звільнити оперативну пам'ять, запобігаючи витоку.">
  <p class="quiz-question">Питання 1 (Архітектура): Який саме підкапотний механізм CPython єдиний здатний вирішити проблему циклічних посилань (Reference Cycles), коли об'єкти посилаються один на одного і їхні лічильники ніколи не досягають нуля?</p>
  <div class="quiz-option" data-index="0">
    <input type="radio" name="test1" id="test1_opt0" />
    <label for="test1_opt0"><code>Глобальне блокування інтерпретатора (GIL)</code> — він зупиняє всі потоки і видаляє старі змінні.</label>
  </div>
  <div class="quiz-option" data-index="1">
    <input type="radio" name="test1" id="test1_opt1" />
    <label for="test1_opt1"><code>Базовий Підрахунок посилань (Reference Counting)</code> — як тільки посилання виходить за межі видимості, об'єкт видаляється.</label>
  </div>
  <div class="quiz-option" data-index="2">
    <input type="radio" name="test1" id="test1_opt2" />
    <label for="test1_opt2"><code>Збирач сміття на основі поколінь (Generational Garbage Collector)</code> — він аналізує графи об'єктів у трьох поколіннях. (ПРАВИЛЬНО)</label>
  </div>
  <div class="quiz-option" data-index="3">
    <input type="radio" name="test1" id="test1_opt3" />
    <label for="test1_opt3"><code>Компільований байт-код (Bytecode)</code> — оптимізатор вирізає непотрібні змінні ще на етапі створення AST-дерева.</label>
  </div>
  <button class="quiz-check-btn">Перевірити</button>
  <div class="quiz-feedback" style="display:none">
    <p class="quiz-feedback-text"></p>
  </div>
</div>
<br/>

<div class="quiz-container" data-correct-index="1" data-explanation="Правильна відповідь: Байт-код CPython не є машинним кодом. Це набір низькорівневих, проміжних числових інструкцій (наприклад LOAD_FAST), які не залежать від процесора комп'ютера. Вони виконуються програмною Віртуальною машиною Python (PVM), яка імітує роботу процесора.">
  <p class="quiz-question">Питання 2 (Трансляція коду): Що технічно являє собою байт-код (згенеровані файли .pyc) в екосистемі класичного CPython?</p>
  <div class="quiz-option" data-index="0">
    <input type="radio" name="test2" id="test2_opt0" />
    <label for="test2_opt0">Це повноцінний оптимізований <strong>машинний код (Machine Code)</strong>, складений з одиниць і нулів, який процесор комп'ютера виконує безпосередньо.</label>
  </div>
  <div class="quiz-option" data-index="1">
    <input type="radio" name="test2" id="test2_opt1" />
    <label for="test2_opt1">Це набір платформонезалежних низькорівневих інструкцій, які створені спеціально для <strong>Стекової Віртуальної машини Python (PVM)</strong>. (ПРАВИЛЬНО)</label>
  </div>
  <div class="quiz-option" data-index="2">
    <input type="radio" name="test2" id="test2_opt2" />
    <label for="test2_opt2">Це зашифрований вихідний код, який потрібен виключно для захисту інтелектуальної власності програміста від копіювання (Обфускація).</label>
  </div>
  <button class="quiz-check-btn">Перевірити</button>
  <div class="quiz-feedback" style="display:none">
    <p class="quiz-feedback-text"></p>
  </div>
</div>
<br/>

<div class="quiz-container" data-correct-index="0" data-explanation="Правильна відповідь: Значення за замовчуванням в Python обчислюються (compile-time) рівно один раз під час створення функції. Якщо ви передасте список, він збережеться в пам'яті як єдиний об'єкт. Всі наступні виклики функції без аргументу будуть змінювати цей глобально спільний список, створюючи хаос у даних.">
  <p class="quiz-question">Питання 3 (Антипатерни та PEP 8): Чому всі Senior розробники суворо забороняють використовувати змінювані (мутабельні) об'єкти, такі як списки <code>[]</code> або словники <code>{}</code>, як значення аргументів за замовчуванням (наприклад, <code>def func(my_list=[]):</code>)?</p>
  <div class="quiz-option" data-index="0">
    <input type="radio" name="test3" id="test3_opt0" />
    <label for="test3_opt0">Тому що такий список створюється в пам'яті лише один раз. Він зберігає свій стан між усіма викликами функції, що призводить до непомітного змішування даних. (ПРАВИЛЬНО)</label>
  </div>
  <div class="quiz-option" data-index="1">
    <input type="radio" name="test3" id="test3_opt1" />
    <label for="test3_opt1">Тому що сучасні версії Python відхиляють такий код і одразу викидають фатальну помилку <code>SyntaxError: Mutable default argument</code>.</label>
  </div>
  <div class="quiz-option" data-index="2">
    <input type="radio" name="test3" id="test3_opt2" />
    <label for="test3_opt2">Тому що механізм GIL заблокує доступ до цього списку з інших потоків (Threads) назавжди (Deadlock).</label>
  </div>
  <button class="quiz-check-btn">Перевірити</button>
  <div class="quiz-feedback" style="display:none">
    <p class="quiz-feedback-text"></p>
  </div>
</div>
</div>`
};

function seedStudyContent() {
  console.log('Seeding NoteHub Study content (Python Developer only)...')
  
  // Clean all study tables to prevent duplicates
  run('DELETE FROM study_lessons')
  run('DELETE FROM study_modules')
  run('DELETE FROM study_courses')

  // Seed Course 1: Python Developer
  run("INSERT INTO study_courses (id, title, description, code, orderIndex) VALUES (?, ?, ?, ?, ?)", [
    1,
    'Python Developer',
    "Опануйте мову програмування Python з нуля: від перших змінних до об'єктно-орієнтованого програмування, декораторів та регулярних виразів.",
    'python',
    0
  ]);

  const insertModule = db!.prepare('INSERT INTO study_modules (id, courseId, title, orderIndex) VALUES (?, ?, ?, ?)')
  const insertLesson = db!.prepare('INSERT INTO study_lessons (id, moduleId, title, kind, content, orderIndex) VALUES (?, ?, ?, ?, ?, ?)')

  const modulesData = [
  {
    title: "Модуль 1. Вступ до Python та налаштування середовища",
    lessons: [
      "1. Що таке Python: історія, переваги та сфери застосування."
    ],
    taskPrompt: "Напишіть функцію get_python_philosophy(), яка повертає рядок 'Beautiful is better than ugly.'"
  }
];

  let globalLessonId = 1
  for (const [mIdx, m] of modulesData.entries()) {
    const moduleId = mIdx + 1
    insertModule.run([moduleId, 1, m.title, mIdx])
    
    // Seed lessons/trainings
    let orderIndex = 0
    for (const lessonTitle of m.lessons) {
      let lessonContent = "<h2>" + lessonTitle + "</h2><p>У цьому розділі ми детально розберемо тему \"<strong>" + lessonTitle + "</strong>\".</p><p>Вивчіть синтаксичні конструкції та запустіть відповідний код у редакторі праворуч.</p>"
      if (predefinedLessonsContent[lessonTitle]) {
        lessonContent = predefinedLessonsContent[lessonTitle]
      }
      insertLesson.run([globalLessonId++, moduleId, lessonTitle, 'training', lessonContent, orderIndex++])
    }
    
    // Seed Task (Homework) at the end of the module
    const taskContent = "<h2>Домашнє завдання: " + m.title + "</h2><p>Будь ласка, виконайте наступне практичне завдання:</p><p>" + m.taskPrompt + "</p>"
    insertLesson.run([globalLessonId++, moduleId, 'Task', 'task', taskContent, orderIndex++])
  }
}

export function getCourses() {
  return all('SELECT * FROM study_courses ORDER BY orderIndex ASC', {}, (row) => row)
}

export function createCourse(input: { title: string; description: string; code: string }) {
  const title = requiredText(input.title, 'Title is required')
  const description = input.description || ''
  const code = input.code || ''
  
  const maxOrder = db!.prepare('SELECT MAX(orderIndex) as maxIdx FROM study_courses').getAsObject() as { maxIdx: number | null }
  const nextOrder = (maxOrder.maxIdx ?? -1) + 1
  
  run(
    'INSERT INTO study_courses (title, description, code, orderIndex) VALUES (?, ?, ?, ?)',
    [title, description, code, nextOrder]
  )
  
  const id = db!.prepare('SELECT last_insert_rowid() as id').getAsObject().id as number
  return { id, title, description, code, orderIndex: nextOrder }
}

export function getCourseModules(courseId: number) {
  const modules = all('SELECT * FROM study_modules WHERE courseId = ? ORDER BY orderIndex ASC', [courseId], (row) => row)
  const lessons = all('SELECT * FROM study_lessons ORDER BY orderIndex ASC', {}, (row) => row)
  
  return modules.map((m: any) => ({
    ...m,
    lessons: lessons.filter((l: any) => l.moduleId === m.id)
  }))
}

export function createModule(courseId: number, input: { title: string; description?: string }) {
  const title = requiredText(input.title, 'Title is required')
  const description = input.description || ''
  
  const maxOrder = db!.prepare('SELECT MAX(orderIndex) as maxIdx FROM study_modules WHERE courseId = ?').getAsObject([courseId]) as { maxIdx: number | null }
  const nextOrder = (maxOrder.maxIdx ?? -1) + 1
  
  run(
    'INSERT INTO study_modules (courseId, title, description, orderIndex) VALUES (?, ?, ?, ?)',
    [courseId, title, description, nextOrder]
  )
  
  const id = db!.prepare('SELECT last_insert_rowid() as id').getAsObject().id as number
  return { id, courseId, title, description, orderIndex: nextOrder }
}

export function createLesson(moduleId: number, input: { title: string; kind?: string; content?: string; homeworkPrompt?: string }) {
  const title = requiredText(input.title, 'Title is required')
  const kind = input.kind || 'lesson'
  const content = input.content || ''
  const homeworkPrompt = input.homeworkPrompt || ''
  
  const maxOrder = db!.prepare('SELECT MAX(orderIndex) as maxIdx FROM study_lessons WHERE moduleId = ?').getAsObject([moduleId]) as { maxIdx: number | null }
  const nextOrder = (maxOrder.maxIdx ?? -1) + 1
  
  run(
    'INSERT INTO study_lessons (moduleId, title, kind, content, homeworkPrompt, orderIndex) VALUES (?, ?, ?, ?, ?, ?)',
    [moduleId, title, kind, content, homeworkPrompt, nextOrder]
  )
  
  const id = db!.prepare('SELECT last_insert_rowid() as id').getAsObject().id as number
  return { id, moduleId, title, kind, content, homeworkPrompt, orderIndex: nextOrder }
}

export function getStudyModules() {
  return getCourseModules(1)
}

export function getStudyProgress(userId: number) {
  return all('SELECT * FROM study_progress WHERE userId = ?', [userId], (row) => ({
    userId: numberValue(row.userId),
    lessonId: numberValue(row.lessonId),
    completed: numberValue(row.completed),
    updatedAt: row.updatedAt
  }))
}

export function saveStudyProgress(userId: number, lessonId: number, completed: number) {
  const existing = one<{ userId: number }>('SELECT userId FROM study_progress WHERE userId = ? AND lessonId = ?', [userId, lessonId], (row) => ({ userId: numberValue(row.userId) }))
  if (existing) {
    run('UPDATE study_progress SET completed = ?, updatedAt = ? WHERE userId = ? AND lessonId = ?', [
      completed,
      new Date().toISOString(),
      userId,
      lessonId
    ])
  } else {
    run('INSERT INTO study_progress (userId, lessonId, completed, updatedAt) VALUES (?, ?, ?, ?)', [
      userId,
      lessonId,
      completed,
      new Date().toISOString()
    ])
  }
}

export function submitHomework(userId: number, lessonId: number, repositoryUrl: string, liveUrl: string, comments: string) {
  run('INSERT INTO homework_submissions (userId, lessonId, repositoryUrl, liveUrl, comments, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [
    userId,
    lessonId,
    repositoryUrl,
    liveUrl,
    comments || '',
    new Date().toISOString()
  ])
  
  saveStudyProgress(userId, lessonId, 1)
}

export function getAdminHomeworks() {
  return all(`
    SELECT h.*, u.email as user_email, l.title as lesson_title
    FROM homework_submissions h
    JOIN users u ON h.userId = u.id
    JOIN study_lessons l ON h.lessonId = l.id
    ORDER BY h.createdAt DESC
  `, {}, (row) => ({
    id: numberValue(row.id),
    userId: numberValue(row.userId),
    lessonId: numberValue(row.lessonId),
    repositoryUrl: row.repositoryUrl,
    liveUrl: row.liveUrl,
    comments: row.comments,
    createdAt: row.createdAt,
    user_email: row.user_email,
    lesson_title: row.lesson_title
  }))
}

export function getStudyStreak(userId: number): number {
  const visits = all(
    'SELECT date FROM study_visits WHERE userId = ? ORDER BY date DESC',
    [userId],
    (row) => row.date as string
  )
  if (visits.length === 0) return 0

  const todayStr = new Date().toLocaleDateString('sv')
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('sv')

  if (visits[0] !== todayStr && visits[0] !== yesterdayStr) {
    return 0
  }

  let streak = 0
  let checkDate = new Date(visits[0])
  const visitedSet = new Set(visits)

  while (true) {
    const dateStr = checkDate.toLocaleDateString('sv')
    if (visitedSet.has(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

export function recordStudyVisit(userId: number, date: string) {
  run('INSERT OR IGNORE INTO study_visits (userId, date) VALUES (?, ?)', [userId, date])
}

export function getStudyVisits(userId: number): string[] {
  return all('SELECT date FROM study_visits WHERE userId = ? ORDER BY date ASC', [userId], (row) => row.date as string)
}

export function addStudyTime(userId: number, seconds: number, weekStart: string) {
  const existing = one<{ userId: number }>('SELECT userId FROM study_time WHERE userId = ? AND weekStart = ?', [userId, weekStart], (row) => ({ userId: numberValue(row.userId) }))
  if (existing) {
    run('UPDATE study_time SET durationSeconds = durationSeconds + ? WHERE userId = ? AND weekStart = ?', [
      seconds,
      userId,
      weekStart
    ])
  } else {
    run('INSERT INTO study_time (userId, weekStart, durationSeconds) VALUES (?, ?, ?)', [
      userId,
      weekStart,
      seconds
    ])
  }
}

export function getStudyTime(userId: number, weekStart: string): number {
  const row = one<{ duration: number }>('SELECT durationSeconds FROM study_time WHERE userId = ? AND weekStart = ?', [userId, weekStart], (row) => ({ duration: numberValue(row.durationSeconds) }))
  return row ? row.duration : 0
}


// ==========================================
// Interactive Study & Flashcards & Quizzes
// ==========================================

export interface StudyFlashcardRecord {
  id: number
  ownerId: number
  roadmapId: number | null
  nodeId: string | null
  question: string
  answer: string
  mastery: number
  nextReviewDate: string | null
  createdAt: string
  updatedAt: string
}

export interface StudyQuizRecord {
  id: number
  ownerId: number
  roadmapId: number | null
  nodeId: string | null
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  createdAt: string
}

export interface StudyActivityRecord {
  date: string
  xp: number
  topicsCompleted: number
  cardsReviewed: number
  quizzesPassed: number
}

export function getNodeNotes(userId: number, nodeId: string): string | null {
  const row = one<{ notes: string }>(
    'SELECT notes FROM study_node_notes WHERE ownerId = ? AND nodeId = ?',
    [userId, nodeId],
    (r) => ({ notes: textValue(r.notes) })
  )
  return row ? row.notes : null
}

export function saveNodeNotes(userId: number, nodeId: string, notes: string): void {
  const now = new Date().toISOString()
  const existing = one<{ id: number }>(
    'SELECT id FROM study_node_notes WHERE ownerId = ? AND nodeId = ?',
    [userId, nodeId],
    (r) => ({ id: numberValue(r.id) })
  )
  if (existing) {
    run('UPDATE study_node_notes SET notes = ?, updatedAt = ? WHERE id = ?', [notes, now, existing.id])
  } else {
    run('INSERT INTO study_node_notes (ownerId, nodeId, notes, updatedAt) VALUES (?, ?, ?, ?)', [
      userId,
      nodeId,
      notes,
      now
    ])
  }
  logStudyActivity(userId, 'note_edit', 10)
  persist()
}

export function listFlashcards(userId: number, roadmapId?: number, nodeId?: string): StudyFlashcardRecord[] {
  let query = 'SELECT * FROM study_flashcards WHERE (ownerId = ? OR ownerId IS NULL)'
  const params: any[] = [userId]
  if (nodeId) {
    query += ' AND nodeId = ?'
    params.push(nodeId)
  } else if (roadmapId) {
    query += ' AND (roadmapId = ? OR nodeId LIKE ?)'
    params.push(roadmapId, `math_%`)
  }
  query += ' ORDER BY id DESC'
  return all(query, params, (row) => ({
    id: numberValue(row.id),
    ownerId: numberValue(row.ownerId),
    roadmapId: row.roadmapId ? numberValue(row.roadmapId) : null,
    nodeId: row.nodeId ? textValue(row.nodeId) : null,
    question: textValue(row.question),
    answer: textValue(row.answer),
    mastery: numberValue(row.mastery),
    nextReviewDate: row.nextReviewDate ? textValue(row.nextReviewDate) : null,
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt)
  }))
}

export function createFlashcard(
  userId: number,
  input: { roadmapId?: number; nodeId?: string; question: string; answer: string }
): StudyFlashcardRecord {
  const now = new Date().toISOString()
  run(
    'INSERT INTO study_flashcards (ownerId, roadmapId, nodeId, question, answer, mastery, nextReviewDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    [userId, input.roadmapId || null, input.nodeId || null, input.question, input.answer, now, now, now]
  )
  const id = lastInsertId()
  logStudyActivity(userId, 'flashcard_create', 15)
  persist()
  const list = listFlashcards(userId)
  return list.find((c) => c.id === id)!
}

export function reviewFlashcard(userId: number, id: number, rating: 'easy' | 'good' | 'hard'): void {
  const card = one<{ mastery: number }>('SELECT mastery FROM study_flashcards WHERE id = ?', [id], (r) => ({
    mastery: numberValue(r.mastery)
  }))
  let mastery = card ? card.mastery : 0
  let daysToAdd = 1
  let xp = 10

  if (rating === 'easy') {
    mastery = Math.min(5, mastery + 1)
    daysToAdd = mastery * 3 + 2
    xp = 15
  } else if (rating === 'good') {
    mastery = Math.min(5, mastery + 1)
    daysToAdd = Math.max(1, mastery * 2)
    xp = 10
  } else {
    mastery = Math.max(0, mastery - 1)
    daysToAdd = 1
    xp = 5
  }

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  const nextDateStr = nextDate.toISOString()

  run('UPDATE study_flashcards SET mastery = ?, nextReviewDate = ?, updatedAt = ? WHERE id = ?', [
    mastery,
    nextDateStr,
    new Date().toISOString(),
    id
  ])
  logStudyActivity(userId, 'flashcard_review', xp)
  persist()
}

export function deleteFlashcard(userId: number, id: number): void {
  run('DELETE FROM study_flashcards WHERE id = ? AND (ownerId = ? OR ownerId IS NULL)', [id, userId])
  persist()
}

export function listQuizzes(userId: number, nodeId?: string): StudyQuizRecord[] {
  let query = 'SELECT * FROM study_quizzes WHERE (ownerId = ? OR ownerId IS NULL)'
  const params: any[] = [userId]
  if (nodeId) {
    query += ' AND nodeId = ?'
    params.push(nodeId)
  }
  return all(query, params, (row) => {
    let options: string[] = []
    try {
      options = JSON.parse(textValue(row.optionsJson))
    } catch {
      options = []
    }
    return {
      id: numberValue(row.id),
      ownerId: numberValue(row.ownerId),
      roadmapId: row.roadmapId ? numberValue(row.roadmapId) : null,
      nodeId: row.nodeId ? textValue(row.nodeId) : null,
      question: textValue(row.question),
      options,
      correctIndex: numberValue(row.correctIndex),
      explanation: textValue(row.explanation),
      createdAt: textValue(row.createdAt)
    }
  })
}

export function logStudyActivity(
  userId: number,
  type: 'node_complete' | 'flashcard_review' | 'flashcard_create' | 'quiz_pass' | 'note_edit',
  xpAmount: number = 10
): void {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const existing = one<{ id: number; xp: number; topicsCompleted: number; cardsReviewed: number; quizzesPassed: number }>(
    'SELECT id, xp, topicsCompleted, cardsReviewed, quizzesPassed FROM study_activity WHERE ownerId = ? AND date = ?',
    [userId, today],
    (r) => ({
      id: numberValue(r.id),
      xp: numberValue(r.xp),
      topicsCompleted: numberValue(r.topicsCompleted),
      cardsReviewed: numberValue(r.cardsReviewed),
      quizzesPassed: numberValue(r.quizzesPassed)
    })
  )

  let topicInc = type === 'node_complete' ? 1 : 0
  let cardInc = type === 'flashcard_review' ? 1 : 0
  let quizInc = type === 'quiz_pass' ? 1 : 0

  if (existing) {
    run(
      'UPDATE study_activity SET xp = xp + ?, topicsCompleted = topicsCompleted + ?, cardsReviewed = cardsReviewed + ?, quizzesPassed = quizzesPassed + ? WHERE id = ?',
      [xpAmount, topicInc, cardInc, quizInc, existing.id]
    )
  } else {
    run(
      'INSERT INTO study_activity (ownerId, date, xp, topicsCompleted, cardsReviewed, quizzesPassed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, today, xpAmount, topicInc, cardInc, quizInc, now]
    )
  }
}

export function getStudyActivityStats(userId: number) {
  const records = all(
    'SELECT date, xp, topicsCompleted, cardsReviewed, quizzesPassed FROM study_activity WHERE ownerId = ? ORDER BY date ASC',
    [userId],
    (r) => ({
      date: textValue(r.date),
      xp: numberValue(r.xp),
      topicsCompleted: numberValue(r.topicsCompleted),
      cardsReviewed: numberValue(r.cardsReviewed),
      quizzesPassed: numberValue(r.quizzesPassed)
    })
  )

  const totalXp = records.reduce((sum, r) => sum + r.xp, 0)
  const totalTopics = records.reduce((sum, r) => sum + r.topicsCompleted, 0)
  const totalCards = records.reduce((sum, r) => sum + r.cardsReviewed, 0)
  const totalQuizzes = records.reduce((sum, r) => sum + r.quizzesPassed, 0)

  // Calculate streak
  const dates = new Set(records.filter((r) => r.xp > 0).map((r) => r.date))
  let streak = 0
  let check = new Date()
  const todayStr = check.toISOString().slice(0, 10)

  // If not studied today, check if studied yesterday to keep streak
  if (!dates.has(todayStr)) {
    check.setDate(check.getDate() - 1)
  }

  while (true) {
    const dStr = check.toISOString().slice(0, 10)
    if (dates.has(dStr)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate level: Level 1 = 0-100 XP, Level 2 = 100-300, etc.
  // Formula: level = Math.floor(Math.sqrt(totalXp / 50)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 60)) + 1)
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 60
  const nextLevelXp = Math.pow(level, 2) * 60
  const levelProgress = Math.min(100, Math.round(((totalXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp || 1)) * 100))

  return {
    records,
    totalXp,
    level,
    levelProgress,
    nextLevelXp,
    streak,
    totalTopics,
    totalCards,
    totalQuizzes
  }
}

export function seedDefaultStudyContent(adminUserId: number) {
  const cardCount = one<{ count: number }>('SELECT COUNT(*) as count FROM study_flashcards', [], (r) => ({
    count: numberValue(r.count)
  }))

  if (!cardCount || cardCount.count === 0) {
    const now = new Date().toISOString()
    const defaultCards = [
      {
        nodeId: 'math_1_1',
        question: 'Як обчислюється середнє арифметичне для вибірки ${x_1, x_2, \dots, x_n}$?',
        answer: '$$\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i$$\\Сума всіх спостережень, поділена на загальну кількість елементів у вибірці.'
      },
      {
        nodeId: 'math_1_1',
        question: 'У чому полягає різниця між середнім арифметичним та середнім геометричним?',
        answer: 'Середнє геометричне обчислюється як корінь $n$-го степеня з добутку елементів:$$\bar{x}_{geom} = \sqrt[n]{x_1 \cdot x_2 \cdot \dots \cdot x_n}$$Воно використовується для мультиплікативних процесів (темпи зростання, індекси).'
      },
      {
        nodeId: 'math_1_2',
        question: 'Що таке медіана і чому вона стійка (робастна) до викидів?',
        answer: 'Медіана ($Me$) — це значення, що ділить впорядкований ряд даних на дві рівні частини (50% зліва, 50% справа). Вона не залежить від екстремально великих чи малих значень у хвостах вибірки.'
      },
      {
        nodeId: 'math_1_3',
        question: 'Яка формула вибіркової дисперсії ($S^2$) і чому використовують $(n-1)$?',
        answer: '$$S^2 = \frac{1}{n - 1} \sum_{i=1}^{n} (x_i - \bar{x})^2$$\\Ділення на $(n-1)$ (поправка Бесселя) усуває статистичне зміщення при оцінці дисперсії генеральної сукупності за малою вибіркою.'
      },
      {
        nodeId: 'math_1_4',
        question: 'Як визначаються межі викидів за правилом Тьюкі (IQR)?',
        answer: 'Інтерквартильний розмах: $IQR = Q_3 - Q_1$.\\Нижня межа: $Q_1 - 1.5 \times IQR$\\Верхня межа: $Q_3 + 1.5 \times IQR$.\\Усе за цими межами вважається викидом.'
      },
      {
        nodeId: 'math_2_7',
        question: 'Напишіть формулу теореми Байєса та поясніть її складові.',
        answer: '$$P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$$\\* $P(A|B)$ — апостеріорна ймовірність\\* $P(A)$ — апріорна ймовірність\\* $P(B|A)$ — правдоподібність (Likelihood)\\* $P(B)$ — повна ймовірність події $B$.'
      },
      {
        nodeId: 'math_5_7',
        question: 'Чим відрізняється норма $L_1$ від норми $L_2$ для вектора $\vec{v} = (v_1, \dots, v_n)$?',
        answer: '* $L_1$ (Манхеттенська): $\|v\|_1 = \sum_{i=1}^n |v_i|$\\* $L_2$ (Евклідова): $\|v\|_2 = \sqrt{\sum_{i=1}^n v_i^2}$\\$L_1$ сприяє розрідженості ознак (Lasso), а $L_2$ обмежує великі ваги (Ridge).'
      }
    ]

    defaultCards.forEach((c) => {
      run(
        'INSERT INTO study_flashcards (ownerId, roadmapId, nodeId, question, answer, mastery, nextReviewDate, createdAt, updatedAt) VALUES (?, 1, ?, ?, ?, 0, ?, ?, ?)',
        [adminUserId, c.nodeId, c.question, c.answer, now, now, now]
      )
    })
  }

  const quizCount = one<{ count: number }>('SELECT COUNT(*) as count FROM study_quizzes', [], (r) => ({
    count: numberValue(r.count)
  }))

  if (!quizCount || quizCount.count === 0) {
    const now = new Date().toISOString()
    const defaultQuizzes = [
      {
        nodeId: 'math_1_1',
        question: 'Яка з наведених метрик найбільш чутлива до появи поодиноких екстремальних викидів у вибірці?',
        options: ['Медіана', 'Мода', 'Середнє арифметичне', 'Інтерквартильний розмах (IQR)'],
        correctIndex: 2,
        explanation: 'Середнє арифметичне включає кожне значення безпосередньо у суму, тому навіть один гігантський викид суттєво зміщує його вгору.'
      },
      {
        nodeId: 'math_1_3',
        question: 'Якщо дисперсія вибірки дорівнює 16, чому дорівнює стандартне відхилення (σ)?',
        options: ['256', '4', '8', '32'],
        correctIndex: 1,
        explanation: 'Стандартне відхилення є квадратним коренем з дисперсії: $\sigma = \sqrt{16} = 4$.'
      },
      {
        nodeId: 'math_1_4',
        question: 'За правилом Тьюкі спостереження вважається викидом, якщо воно лежить за межами інтервалу:',
        options: ['[Mean - σ, Mean + σ]', '[Q1 - 1.5×IQR, Q3 + 1.5×IQR]', '[Min, Max]', '[Q1 - 3×IQR, Q3 + 3×IQR]'],
        correctIndex: 1,
        explanation: 'Класичне правило Тьюкі визначає межі вусів ящика з вусами як $Q_1 - 1.5 \times IQR$ та $Q_3 + 1.5 \times IQR$.'
      },
      {
        nodeId: 'math_2_7',
        question: 'Що визначає апостеріорну ймовірність P(A|B) у формулі Байєса?',
        options: [
          'Ймовірність події A до отримання нових свідчень B',
          'Ймовірність події A після врахування нового свідчення B',
          'Ймовірність того, що події A та B ніколи не відбудуться',
          'Частку помилок I роду в експерименті'
        ],
        correctIndex: 1,
        explanation: 'Апостеріорна ймовірність $P(A|B)$ — це оновлена оцінка ймовірності гіпотези $A$ з урахуванням того, що спостереження $B$ уже відбулося.'
      }
    ]

    defaultQuizzes.forEach((q) => {
      run(
        'INSERT INTO study_quizzes (ownerId, roadmapId, nodeId, question, optionsJson, correctIndex, explanation, createdAt) VALUES (?, 1, ?, ?, ?, ?, ?, ?)',
        [adminUserId, q.nodeId, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, now]
      )
    })
  }
}
