import type {
  Attachment,
  EntityType,
  SearchResult,
  Snippet,
  SnippetPayload,
  Task,
  TaskPayload,
  FinanceGoal,
  FinanceGoalPayload,
  DiaryEntry,
  DiaryEntryPayload,
  Subscription,
  SubscriptionPayload,
  Project,
  ProjectPayload,
  Habit,
  HabitPayload,
  MindMap,
  MindMapPayload,
  Roadmap,
  RoadmapPayload,
} from './types'

const jsonHeaders = {
  'Content-Type': 'application/json',
}

export async function fetchTasks(params?: URLSearchParams) {
  return request<Task[]>(`/api/tasks${queryString(params)}`)
}

export async function createTask(payload: TaskPayload) {
  return request<Task>('/api/tasks', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateTask(id: number, payload: TaskPayload) {
  return request<Task>(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteTask(id: number) {
  await request<void>(`/api/tasks/${id}`, { method: 'DELETE' })
}

export async function fetchSnippets(params?: URLSearchParams) {
  return request<Snippet[]>(`/api/snippets${queryString(params)}`)
}

export async function createSnippet(payload: SnippetPayload) {
  return request<Snippet>('/api/snippets', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateSnippet(id: number, payload: SnippetPayload) {
  return request<Snippet>(`/api/snippets/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteSnippet(id: number) {
  await request<void>(`/api/snippets/${id}`, { method: 'DELETE' })
}

export async function uploadAttachment(entityType: EntityType, entityId: number, file: File) {
  const data = new FormData()
  data.set('entityType', entityType)
  data.set('entityId', String(entityId))
  data.set('file', file)
  return request<Attachment>('/api/attachments', {
    method: 'POST',
    body: data,
  })
}

export async function deleteAttachment(id: number) {
  await request<void>(`/api/attachments/${id}`, { method: 'DELETE' })
}

export async function searchAll(query: string) {
  const params = new URLSearchParams({ q: query })
  return request<SearchResult>(`/api/search?${params.toString()}`)
}

export async function fetchBalance() {
  return request<{ amount: number }>('/api/balance')
}

export async function updateBalance(amount: number) {
  return request<{ amount: number }>('/api/balance', {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ amount }),
  })
}

export async function fetchGoals() {
  return request<FinanceGoal[]>('/api/finance/goals')
}

export async function createGoal(payload: FinanceGoalPayload) {
  return request<FinanceGoal>('/api/finance/goals', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateGoal(id: number, payload: FinanceGoalPayload) {
  return request<FinanceGoal>(`/api/finance/goals/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteGoal(id: number) {
  await request<void>(`/api/finance/goals/${id}`, { method: 'DELETE' })
}

export async function fetchDiaryEntries() {
  return request<DiaryEntry[]>('/api/diary')
}

export async function createDiaryEntry(payload: DiaryEntryPayload) {
  return request<DiaryEntry>('/api/diary', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateDiaryEntry(id: number, payload: DiaryEntryPayload) {
  return request<DiaryEntry>(`/api/diary/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteDiaryEntry(id: number) {
  await request<void>(`/api/diary/${id}`, { method: 'DELETE' })
}

export async function fetchSubscriptions() {
  return request<Subscription[]>('/api/subscriptions')
}

export async function createSubscription(payload: SubscriptionPayload) {
  return request<Subscription>('/api/subscriptions', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateSubscription(id: number, payload: SubscriptionPayload) {
  return request<Subscription>(`/api/subscriptions/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteSubscription(id: number) {
  await request<void>(`/api/subscriptions/${id}`, { method: 'DELETE' })
}

export async function fetchProjects() {
  return request<Project[]>('/api/projects')
}

export async function createProject(payload: ProjectPayload) {
  return request<Project>('/api/projects', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateProject(id: number, payload: ProjectPayload) {
  return request<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteProject(id: number) {
  await request<void>(`/api/projects/${id}`, { method: 'DELETE' })
}

export async function fetchHabits() {
  return request<Habit[]>('/api/habits')
}

export async function createHabit(payload: HabitPayload) {
  return request<Habit>('/api/habits', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteHabit(id: number) {
  await request<void>(`/api/habits/${id}`, { method: 'DELETE' })
}

export async function toggleHabit(id: number, date: string, completed: boolean) {
  return request<Habit>(`/api/habits/${id}/toggle`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ date, completed }),
  })
}


export let authToken = '';

export function setToken(token: string) {
  authToken = token;
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const fullUrl = url.startsWith('/api/') ? `${API_BASE}${url}` : url;
  const response = await fetch(fullUrl, { ...init, headers });
  if (response.status === 204) {
    return undefined as T
  }
  const payload = (await response.json()) as unknown
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Request failed'
    throw new Error(message)
  }
  return payload as T
}

function queryString(params: URLSearchParams | undefined) {
  const value = params?.toString()
  return value ? `?${value}` : ''
}

export async function loginApi(payload: any) {
  return request<any>('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function registerApi(payload: any) {
  return request<any>('/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function fetchMe() {
  return request<any>('/api/auth/me')
}

export async function logoutApi() {
  return request<void>('/api/auth/logout', { method: 'POST' })
}

export async function fetchMindMaps() {
  return request<MindMap[]>('/api/mindmaps')
}

export async function fetchMindMap(id: number) {
  return request<MindMap>(`/api/mindmaps/${id}`)
}

export async function createMindMap(payload: MindMapPayload) {
  return request<MindMap>('/api/mindmaps', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateMindMap(id: number, payload: MindMapPayload) {
  return request<MindMap>(`/api/mindmaps/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteMindMap(id: number) {
  await request<void>(`/api/mindmaps/${id}`, { method: 'DELETE' })
}

export async function fetchRoadmaps() {
  return request<Roadmap[]>('/api/roadmaps')
}

export async function fetchRoadmap(id: number) {
  return request<Roadmap>(`/api/roadmaps/${id}`)
}

export async function createRoadmap(payload: RoadmapPayload) {
  return request<Roadmap>('/api/roadmaps', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function updateRoadmap(id: number, payload: RoadmapPayload) {
  return request<Roadmap>(`/api/roadmaps/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  })
}

export async function deleteRoadmap(id: number) {
  await request<void>(`/api/roadmaps/${id}`, { method: 'DELETE' })
}
