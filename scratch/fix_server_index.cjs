const fs = require('fs');

const file = 'server/index.ts';
let content = fs.readFileSync(file, 'utf8');

// Find where app.post('/api/auth/register' starts
const marker = "app.post('/api/auth/register',";
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
  console.error('Could not find marker in server/index.ts');
  process.exit(1);
}

const topBlock = `import fs from 'node:fs'
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
    callback(null, \`\${Date.now()}-\${randomUUID()}\${extension}\`)
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

`;

const newContent = topBlock + content.slice(markerIndex);
fs.writeFileSync(file, newContent, 'utf8');
console.log('Successfully fixed server/index.ts top block!');
