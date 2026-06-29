import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Monitor,
  Laptop,
  Check,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Minus,
  BookOpen,
  Sparkles,
  Home,
  Award,
  Clock,
  TrendingUp,
  Plus,
  Play,
  CheckCircle,
  PlusCircle,
  LogOut,
  FolderOpen
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import { useAuth } from '../../AuthContext'
import * as api from '../../api'
import type { StudyCourse, StudyModule, StudyLesson } from '../../types'
import styles from './StudyPanel.module.css'

interface ProgressEntry {
  userId: number
  lessonId: number
  completed: number
  updatedAt: string
}

// ---------------------------------------------------------
// Simple client-side Python execution engine (transpiler)
// ---------------------------------------------------------
function transpilePythonToJS(code: string): string {
  let jsCode = '';
  const lines = code.split('\n');
  const indentStack: number[] = [0];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Calculate line indent
    let lineIndent = line.search(/\S/);
    if (lineIndent === -1) lineIndent = 0;

    // Check if indent decreased, close blocks
    while (lineIndent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsCode += '}\n';
    }

    // Replace print(...) with consoleLog(...)
    if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
      const content = trimmed.substring(6, trimmed.length - 1);
      jsCode += `consoleLog(${content});\n`;
    }
    // Handle variable assignments: x = 5
    else if (trimmed.includes('=') && !trimmed.includes('==') && !trimmed.includes('if ') && !trimmed.includes('while ') && !trimmed.includes('for ')) {
      const parts = trimmed.split('=');
      const varName = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      jsCode += `var ${varName} = ${val};\n`;
    }
    // Handle simple conditionals: if x == 5:
    else if (trimmed.startsWith('if ') && trimmed.endsWith(':')) {
      const condition = trimmed.substring(3, trimmed.length - 1);
      jsCode += `if (${condition}) {\n`;
      indentStack.push(lineIndent + 4);
    }
    // Handle simple loops: for i in range(5):
    else if (trimmed.startsWith('for ') && trimmed.includes(' in range(') && trimmed.endsWith(':')) {
      const loopVar = trimmed.split(' ')[1];
      const rangePart = trimmed.substring(trimmed.indexOf('range(') + 6, trimmed.length - 2);
      jsCode += `for (let ${loopVar} = 0; ${loopVar} < ${rangePart}; ${loopVar}++) {\n`;
      indentStack.push(lineIndent + 4);
    }
    // Fallback
    else {
      jsCode += `${trimmed};\n`;
    }
  }

  // Close any remaining blocks
  while (indentStack.length > 1) {
    indentStack.pop();
    jsCode += '}\n';
  }

  return jsCode;
}

function runPythonCode(code: string): string {
  let output = '';
  const consoleLog = (...args: any[]) => {
    output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n';
  };

  try {
    const jsCode = transpilePythonToJS(code);
    const fn = new Function('consoleLog', jsCode);
    fn(consoleLog);
    return output.trim() || 'Програма успішно виконана (без виводу).';
  } catch (err: any) {
    return `Помилка виконання:\n${err.message}`;
  }
}

// ---------------------------------------------------------
// Main Component
// ---------------------------------------------------------
export default function StudyPanel({ onExit }: { onExit: () => void }) {
  const { user } = useAuth()
  
  // Tabs: 'dashboard' | 'courses' | 'learning'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'courses' | 'learning'>('dashboard')
  
  // Courses and modules data
  const [courses, setCourses] = useState<StudyCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<StudyCourse | null>(null)
  const [modules, setModules] = useState<StudyModule[]>([])
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [expandedModules, setExpandedModules] = useState<number[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [selectedLesson, setSelectedLesson] = useState<StudyLesson | null>(null)
  
  // UI States
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [courseSwitcherOpen, setCourseSwitcherOpen] = useState(false)
  
  // Admin creations modals
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  
  const [createModuleModalOpen, setCreateModuleModalOpen] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  
  const [createLessonModalOpen, setCreateLessonModalOpen] = useState(false)
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<number | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonKind, setNewLessonKind] = useState<'training' | 'lesson' | 'task'>('training')
  const [newLessonContent, setNewLessonContent] = useState('')

  // Mini-IDE States
  const [code, setCode] = useState('# Пишіть ваш Python код тут\nprint("Привіт, NoteHub!")\n')
  const [terminalOutput, setTerminalOutput] = useState('Тут з\'явиться результат виконання коду...')

  // Dynamic stats states
  const [streak, setStreak] = useState(0)
  const [weeklySeconds, setWeeklySeconds] = useState(0)
  const [visits, setVisits] = useState<string[]>([])

  // Helper to format study duration (seconds) into Ukrainian text
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    return `${hours} год. ${minutes} хв.`
  }

  // Calculate percentage of 14-hour target (14 * 3600 = 50400 seconds)
  const durationPercentage = Math.min(100, Math.round((weeklySeconds / 50400) * 100))

  // Comment based on progress
  const getProgressComment = (totalSeconds: number) => {
    const hours = totalSeconds / 3600
    if (hours < 3) return 'Гарний старт! (Good start!)'
    if (hours < 7) return 'Продовжуйте в тому ж дусі!'
    if (hours < 14) return 'Чудовий прогрес!'
    return 'Ціль досягнута! Ви молодець! 🎉'
  }

  // Ukrainian day formatting for streak
  const formatStreakText = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) {
      return 'день поспіль'
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return 'дні поспіль'
    } else {
      return 'днів поспіль'
    }
  }

  // Compute current week's dates (Mon-Sun)
  const weekDayLabels = ['Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
  const currentWeekDates = useMemo(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
    const monday = new Date(today.setDate(diff))
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toLocaleDateString('sv')) // 'sv' format yields 'YYYY-MM-DD'
    }
    return dates
  }, [])

  // Fetch initial courses and progress
  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      api.fetchCourses(),
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([coursesData, progressData]: [StudyCourse[], ProgressEntry[]]) => {
        setCourses(coursesData)
        setProgress(progressData || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // Record visit and fetch stats
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const todayStr = new Date().toLocaleDateString('sv')

    // 1. Record today's visit
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ date: todayStr })
    })
      .then(() => {
        // 2. Fetch fresh stats
        return fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.streak !== undefined) setStreak(data.streak)
        if (data.weeklySeconds !== undefined) setWeeklySeconds(data.weeklySeconds)
        if (data.visits !== undefined) setVisits(data.visits)
      })
      .catch(console.error)
  }, [])

  // Study time tracking hook
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let localSeconds = 0

    const interval = setInterval(() => {
      // Only track if tab is active/visible
      if (document.visibilityState === 'visible') {
        localSeconds += 10
        setWeeklySeconds(prev => prev + 10)
      }
    }, 10000)

    // Sync study time to backend every 30 seconds
    const syncInterval = setInterval(() => {
      if (localSeconds > 0) {
        const today = new Date()
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(today.setDate(diff))
        const weekStart = monday.toLocaleDateString('sv')

        const secondsToSync = localSeconds
        localSeconds = 0

        fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/time`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ seconds: secondsToSync, weekStart })
        }).catch(console.error)
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      clearInterval(syncInterval)
      // Sync remaining seconds on unmount/exit
      if (localSeconds > 0) {
        const today = new Date()
        const day = today.getDay()
        const diff = today.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(today.setDate(diff))
        const weekStart = monday.toLocaleDateString('sv')

        fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/time`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ seconds: localSeconds, weekStart })
        }).catch(console.error)
      }
    }
  }, [])

  // Load modules for the selected course
  const loadCourseModules = async (courseId: number) => {
    setLoading(true)
    try {
      const modulesData = await api.fetchCourseModules(courseId)
      setModules(modulesData)
      if (modulesData.length > 0) {
        setExpandedModules([modulesData[0].id])
        if (modulesData[0].lessons.length > 0) {
          setSelectedLesson(modulesData[0].lessons[0])
          // Initialize code if it's a python course task
          if (modulesData[0].lessons[0].content.includes('python')) {
            setCode('# Пишіть ваш Python код тут\n')
          }
        } else {
          setSelectedLesson(null)
        }
      } else {
        setSelectedLesson(null)
        setModules([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCourse = async (course: StudyCourse) => {
    setSelectedCourse(course)
    await loadCourseModules(course.id)
    setActiveTab('learning')
    setCourseSwitcherOpen(false)
  }

  const toggleModule = (id: number) => {
    setExpandedModules((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    )
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey] === false ? true : false,
    }))
  }

  const isLessonCompleted = (lessonId: number) => {
    return progress.some((p) => p.lessonId === lessonId && p.completed === 1)
  }

  // Handle Python execution
  const handleRunCode = () => {
    setTerminalOutput('Запуск програми...\n')
    setTimeout(() => {
      const res = runPythonCode(code)
      setTerminalOutput(res)
    }, 300)
  }

  // Handle marking progress and going to the next block
  const handleCompleteAndNext = async () => {
    if (!selectedLesson || actionLoading) return
    setActionLoading(true)

    const token = localStorage.getItem('token')
    try {
      // Mark current as completed
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/study/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          completed: 1,
        }),
      })

      // Update local progress state
      setProgress((prev) => {
        const exists = prev.some((p) => p.lessonId === selectedLesson.id)
        if (exists) {
          return prev.map((p) =>
            p.lessonId === selectedLesson.id ? { ...p, completed: 1 } : p
          )
        } else {
          return [
            ...prev,
            {
              userId: user?.id || 0,
              lessonId: selectedLesson.id,
              completed: 1,
              updatedAt: new Date().toISOString(),
            },
          ]
        }
      })

      // Find next lesson
      const allLessons = modules.flatMap((m) => m.lessons)
      const currentIndex = allLessons.findIndex((l) => l.id === selectedLesson.id)

      if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
        const next = allLessons[currentIndex + 1]

        // Ensure the next module is expanded in the sidebar
        const nextModule = modules.find((m) => m.lessons.some((l) => l.id === next.id))
        if (nextModule && !expandedModules.includes(nextModule.id)) {
          setExpandedModules((prev) => [...prev, nextModule.id])
        }

        setSelectedLesson(next)
        // Reset terminal and code template
        setTerminalOutput('Тут з\'явиться результат виконання коду...')
        if (next.content.includes('python')) {
          setCode('# Пишіть ваш Python код тут\n')
        }
      } else {
        alert('Вітаємо! Ви пройшли всі модулі цього курсу!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // Admin Course Builder handlers
  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseTitle.trim()) return
    try {
      const course = await api.createCourse({
        title: newCourseTitle,
        description: newCourseDesc,
        code: newCourseCode
      })
      setCourses(prev => [...prev, course])
      setCreateCourseModalOpen(false)
      setNewCourseTitle('')
      setNewCourseDesc('')
      setNewCourseCode('')
    } catch (err) {
      console.error(err)
      alert('Помилка створення курсу')
    }
  }

  const handleCreateModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse || !newModuleTitle.trim()) return
    try {
      const mod = await api.createModule(selectedCourse.id, { title: newModuleTitle })
      mod.lessons = []
      setModules(prev => [...prev, mod])
      setCreateModuleModalOpen(false)
      setNewModuleTitle('')
    } catch (err) {
      console.error(err)
      alert('Помилка створення модуля')
    }
  }

  const handleCreateLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeModuleForLesson === null || !newLessonTitle.trim()) return
    try {
      const lesson = await api.createLesson(activeModuleForLesson, {
        title: newLessonTitle,
        kind: newLessonKind,
        content: newLessonContent
      })
      setModules(prev => prev.map(m => {
        if (m.id === activeModuleForLesson) {
          return { ...m, lessons: [...m.lessons, lesson] }
        }
        return m
      }))
      setCreateLessonModalOpen(false)
      setNewLessonTitle('')
      setNewLessonContent('')
    } catch (err) {
      console.error(err)
      alert('Помилка створення заняття')
    }
  }

  // Compute stats
  const totalCourseLessonsCount = modules.flatMap(m => m.lessons).length
  const completedCourseLessonsCount = modules.flatMap(m => m.lessons).filter(l => isLessonCompleted(l.id)).length

  if (loading && activeTab === 'learning') {
    return (
      <div className="flex h-screen w-screen bg-[#09090b] items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
          Завантаження курсу...
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen w-screen bg-[#09090b] text-[#a1a1aa] font-sans overflow-hidden ${styles.studyPanel}`}>
      
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#18181b] border-b border-[#27272a] shrink-0">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <img src="/FAVICONNOTE.png" className="w-8 h-8 rounded-lg object-contain" alt="Study Logo" />
            <span className="font-bold text-white text-base tracking-tight">NoteHub Study</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Home size={15} />
              Панель
            </button>
            <button 
              onClick={() => setActiveTab('courses')} 
              className={`transition-colors ${activeTab === 'courses' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Курси
            </button>
            <button className="text-gray-500 cursor-not-allowed">Консультації</button>
            <button className="text-gray-500 cursor-not-allowed">Вакансії</button>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-4">
          {activeTab === 'learning' && selectedCourse && (
            <div className="relative">
              <button 
                onClick={() => setCourseSwitcherOpen(!courseSwitcherOpen)}
                className="flex items-center gap-1 bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#3f3f46] transition-colors"
              >
                {selectedCourse.title}
                <ChevronDown size={14} />
              </button>
              {courseSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#18181b] border border-[#27272a] rounded-xl shadow-lg z-50 py-1.5">
                  {courses.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => handleSelectCourse(c)}
                      className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#27272a] hover:text-white"
                    >
                      {c.title}
                    </button>
                  ))}
                  <button 
                    onClick={() => setActiveTab('courses')}
                    className="w-full text-left px-4 py-2 text-xs text-[#c084fc] border-t border-[#27272a] hover:bg-[#27272a]"
                  >
                    Всі курси
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#fca5a5] hover:text-white border border-[#ef4444]/20 transition-all font-semibold"
          >
            <LogOut size={13} />
            NoteHub Pro
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            {/* Greeting Header */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Вітаємо, {user?.name || 'Студенте'}!</h2>
              <p className="text-gray-400 text-sm mt-1">Study without interruption and get achievements. You can do it!</p>
            </div>

            {/* Metric widgets block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Attendance Card */}
              <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                {/* Cat Mascot */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-2">
                    <span className="absolute -top-3 -right-2 bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow">
                      Good start!
                    </span>
                    {/* Purple SVG Cosmic Kitty */}
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      {/* Tail */}
                      <path d="M75,55 C85,55 90,45 85,38 C80,31 73,38 73,45" fill="none" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" />
                      {/* Body */}
                      <ellipse cx="50" cy="55" rx="25" ry="18" fill="#a855f7" />
                      <ellipse cx="50" cy="55" rx="15" ry="10" fill="#8b5cf6" />
                      {/* Head */}
                      <circle cx="35" cy="40" rx="15" ry="15" fill="#a855f7" />
                      {/* Ears */}
                      <polygon points="22,30 28,15 35,26" fill="#a855f7" />
                      <polygon points="40,26 48,15 52,30" fill="#a855f7" />
                      <polygon points="25,27 29,18 33,25" fill="#8b5cf6" />
                      <polygon points="42,25 46,18 49,27" fill="#8b5cf6" />
                      {/* Face features */}
                      <circle cx="28" cy="38" r="2" fill="#000" />
                      <circle cx="42" cy="38" r="2" fill="#000" />
                      <polygon points="34,42 36,42 35,44" fill="#000" />
                      {/* Whiskers */}
                      <line x1="20" y1="41" x2="12" y2="40" stroke="#000" strokeWidth="1" />
                      <line x1="20" y1="44" x2="11" y2="45" stroke="#000" strokeWidth="1" />
                      <line x1="48" y1="41" x2="56" y2="40" stroke="#000" strokeWidth="1" />
                      <line x1="48" y1="44" x2="57" y2="45" stroke="#000" strokeWidth="1" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-300">Don't upset your kitty!</span>
                </div>

                {/* 7-Day Checklist */}
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-sm font-bold text-white mb-4">Відвідуваність</span>
                  <div className="flex gap-2.5">
                    {currentWeekDates.map((dateStr, idx) => {
                      const visited = visits.includes(dateStr)
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 font-semibold">{weekDayLabels[idx]}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${visited ? 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]' : 'bg-transparent border-[#27272a] text-gray-600'}`}>
                            {visited ? <Check size={14} strokeWidth={3} /> : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button className="mt-5 text-xs border border-[#a855f7]/20 hover:border-[#a855f7]/50 hover:bg-[#a855f7]/5 text-[#c084fc] font-semibold px-4 py-2 rounded-xl transition-all">
                    Do not count the missed class
                  </button>
                </div>

                {/* Streak Metric */}
                <div className="w-full md:w-32 bg-[#27272a]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Серія занять</span>
                  <span className="text-4xl font-black text-white my-1">{streak}</span>
                  <span className="text-[11px] text-gray-300 font-medium">{formatStreakText(streak)}</span>
                </div>
              </div>

              {/* Weekly Hours Progress */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 flex flex-col justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 shrink-0">
                    <Clock size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Години навчання</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Students who study 14 hours a week definitely find work.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-white">
                    <span>{formatDuration(weeklySeconds)}</span>
                    <span className="text-gray-500">ціль: 14 год.</span>
                  </div>
                  <div className="w-full bg-[#27272a] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style={{ width: `${durationPercentage}%` }} />
                  </div>
                  <span className="text-[10px] text-[#c084fc] font-bold block">{getProgressComment(weeklySeconds)}</span>
                </div>
              </div>

            </div>

            {/* Specially For You and Quick Courses launcher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Offer Banner */}
              <div className="bg-gradient-to-br from-[#18181b] to-[#1c1917] border border-[#27272a] rounded-3xl p-6 flex justify-between items-center relative overflow-hidden">
                <div className="space-y-4 max-w-[60%]">
                  <h4 className="text-lg font-bold text-white leading-tight">Збільшіть шанси отримати роботу!</h4>
                  <p className="text-xs text-gray-400">Пройдіть додаткові консультації та заповніть резюме.</p>
                  <button className="bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
                    Детальніше
                  </button>
                </div>
                <div className="w-28 h-28 bg-[#a855f7]/10 rounded-full blur-[30px] absolute -right-6 -bottom-6" />
                {/* SVG Illustration */}
                <svg viewBox="0 0 100 100" className="w-24 h-24 text-[#a855f7]/20 shrink-0">
                  <rect x="20" y="20" width="60" height="60" rx="10" fill="currentColor" />
                  <circle cx="50" cy="45" r="10" fill="#18181b" />
                  <path d="M30,70 Q50,55 70,70" stroke="#18181b" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>

              {/* Fast Study Launcher */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-6 flex flex-col justify-between gap-6">
                <div>
                  <h4 className="text-base font-bold text-white">Почати навчання</h4>
                  <p className="text-xs text-gray-400 mt-1">Оберіть із доступних програм та почніть підвищувати рівень кваліфікації.</p>
                </div>
                <button 
                  onClick={() => setActiveTab('courses')}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 text-sm font-bold py-3.5 rounded-xl transition-all shadow-md"
                >
                  <FolderOpen size={16} />
                  Переглянути курси
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: COURSES LIST */}
        {activeTab === 'courses' && (
          <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Мої програми навчання</h2>
                <p className="text-gray-400 text-sm mt-1">Acquire additional skills and grow from junior to senior.</p>
              </div>
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setCreateCourseModalOpen(true)}
                  className="flex items-center gap-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                >
                  <Plus size={15} />
                  Новий курс
                </button>
              )}
            </div>

            {/* Courses grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div 
                  key={course.id} 
                  className="bg-[#18181b] border border-[#27272a] hover:border-[#a855f7]/30 rounded-3xl p-6 flex flex-col justify-between gap-6 transition-all duration-300 group hover:shadow-lg"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Курс</span>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#c084fc] transition-colors">{course.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{course.description}</p>
                  </div>

                  <button 
                    onClick={() => handleSelectCourse(course)}
                    className="w-full bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-bold py-3 rounded-xl border border-[#3f3f46] transition-colors"
                  >
                    Продовжити навчання
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: COURSE LEARNING WORKSPACE */}
        {activeTab === 'learning' && selectedCourse && (
          <div className="flex h-full w-full overflow-hidden relative">
            
            {/* Course modules sidebar */}
            <div className={`flex flex-col bg-[#18181b] border-r border-[#27272a] transition-all duration-300 shrink-0 ${isCollapsed ? 'w-16' : 'w-[340px]'}`}>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                {modules.map((mod, modIndex) => {
                  const isExpanded = expandedModules.includes(mod.id)
                  
                  // Separate trainings from tasks/lessons
                  const trainings = mod.lessons.filter(l => l.kind === 'training')
                  const otherLessons = mod.lessons.filter(l => l.kind !== 'training')

                  // Compute module completion colors
                  const totalLessons = mod.lessons.length
                  const completedLessons = mod.lessons.filter(l => isLessonCompleted(l.id)).length
                  const isActive = mod.lessons.some(l => l.id === selectedLesson?.id)

                  let statusColor = "text-gray-500"
                  if (totalLessons > 0) {
                    if (completedLessons === totalLessons) {
                      statusColor = "text-emerald-500"
                    } else if (completedLessons > 0 || isActive) {
                      statusColor = "text-yellow-500"
                    }
                  }

                  return (
                    <div key={mod.id} className="border border-[#27272a] rounded-2xl overflow-hidden bg-[#1e1e24]/10 mb-2">
                      <button
                        onClick={() => {
                          if (isCollapsed) setIsCollapsed(false)
                          toggleModule(mod.id)
                        }}
                        className={`w-full flex items-center justify-between p-3.5 hover:bg-[#27272a]/60 transition-all ${isExpanded ? 'bg-[#27272a]/30 border-b border-[#27272a]' : ''}`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <CheckCircle2 size={16} className={`shrink-0 ${statusColor}`} />
                          {!isCollapsed && (
                            <span className={`font-bold text-xs sm:text-[13px] text-left truncate ${isExpanded ? 'text-[#c084fc]' : 'text-gray-300'}`}>
                              {modIndex + 1}. {mod.title}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <div className="text-gray-500 shrink-0">
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </div>
                        )}
                      </button>

                      {isExpanded && !isCollapsed && (
                        <div className="p-2.5 bg-[#18181b] space-y-2">
                          {/* Training dropdown section */}
                          {trainings.length > 0 && (() => {
                            const secKey = `${mod.id}-trainings`
                            const isSecExpanded = expandedSections[secKey] !== false
                            return (
                              <div className="space-y-1">
                                <button 
                                  onClick={() => toggleSection(secKey)}
                                  className="w-full flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors py-1.5 px-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🕶️</span>
                                    <span>Training</span>
                                  </div>
                                  <Minus size={12} className="text-gray-600" />
                                </button>
                                
                                {isSecExpanded && (
                                  <div className="space-y-1 pl-1">
                                    {trainings.map(lesson => {
                                      const isSel = selectedLesson?.id === lesson.id
                                      return (
                                        <button
                                          key={lesson.id}
                                          onClick={() => setSelectedLesson(lesson)}
                                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-[13px] text-left transition-all ${isSel ? 'bg-[#27272a] text-white font-semibold' : 'text-gray-300 hover:text-white hover:bg-[#27272a]/30'}`}
                                        >
                                          <Check size={14} className="shrink-0 text-emerald-500" strokeWidth={3} />
                                          <span className="truncate">{lesson.title}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {/* Other types: lessons and tasks */}
                          {otherLessons.map(lesson => {
                            const isSel = selectedLesson?.id === lesson.id
                            const Icon = lesson.kind === 'task' ? Laptop : Monitor

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setSelectedLesson(lesson)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-[13px] text-left transition-all ${isSel ? 'bg-[#27272a] text-white font-semibold' : 'text-gray-300 hover:text-white hover:bg-[#27272a]/30'}`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <Icon size={14} className={lesson.kind === 'task' ? 'text-[#c084fc]' : 'text-blue-400'} />
                                  <span className="truncate">{lesson.title}</span>
                                </div>
                                <Check size={14} className="shrink-0 text-emerald-500" strokeWidth={3} />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Admin Module Creator Button */}
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => setCreateModuleModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 mt-4 border border-dashed border-[#27272a] hover:border-[#a855f7]/40 text-gray-500 hover:text-[#c084fc] rounded-xl text-xs transition-colors"
                  >
                    <Plus size={14} />
                    Додати модуль
                  </button>
                )}
              </div>

              {/* Collapse Button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-4 border-t border-[#27272a] flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[#27272a] transition-colors mt-auto shrink-0"
              >
                {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
                {!isCollapsed && <span className="text-xs font-semibold">Згорнути меню</span>}
              </button>
            </div>

            {/* Course Viewer Content Pane */}
            <div className="flex-1 flex overflow-hidden bg-[#09090b]">
              {selectedLesson ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Lesson Markdown text panel */}
                  <div className="flex-1 overflow-y-auto px-8 py-10 max-w-4xl mx-auto w-full custom-scrollbar">
                    {user?.role === 'admin' && (
                      <div className="mb-4 bg-[#a855f7]/10 border border-[#a855f7]/20 p-3 rounded-xl flex items-center justify-between text-xs text-[#c084fc]">
                        <span>Ви увійшли як Адміністратор.</span>
                        <button 
                          onClick={() => {
                            setActiveModuleForLesson(selectedLesson.moduleId)
                            setCreateLessonModalOpen(true)
                          }}
                          className="flex items-center gap-1 bg-[#a855f7] text-white font-bold px-3 py-1.5 rounded-lg"
                        >
                          <Plus size={12} />
                          Додати урок
                        </button>
                      </div>
                    )}

                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {selectedLesson.kind}
                    </span>
                    <h1 className="text-3xl font-black text-white mt-1 mb-8 tracking-tight">
                      {selectedLesson.title}
                    </h1>

                    <div
                      className="prose prose-invert prose-base max-w-none prose-p:text-gray-300 prose-p:leading-relaxed prose-headings:text-white prose-pre:bg-[#18181b] prose-pre:border prose-pre:border-[#27272a] prose-li:text-gray-300"
                      dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                    />

                    {/* Proceed Action Button */}
                    <div className="mt-16 pt-8 border-t border-[#27272a] flex justify-center">
                      <button
                        onClick={handleCompleteAndNext}
                        disabled={actionLoading}
                        className="w-full max-w-xl flex items-center justify-center gap-2 bg-[#a855f7] hover:bg-[#8b5cf6] text-white disabled:opacity-50 font-bold px-6 py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]"
                      >
                        <Sparkles size={16} className="text-yellow-300 animate-pulse shrink-0" />
                        <span className="text-sm tracking-wide uppercase">
                          {isLessonCompleted(selectedLesson.id) ? 'Наступний блок →' : 'Приступити до наступного блоку ✓'}
                        </span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <BookOpen size={48} className="mb-4 opacity-20" />
                  <p>Оберіть заняття з меню ліворуч, щоб розпочати навчання</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
      {/* ----------------- MODALS ----------------- */}

      {/* 1. Create Course Modal */}
      {createCourseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-[#27272a] w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Створити новий курс</h3>
            <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Назва курсу</label>
                <input 
                  type="text" 
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="напр., Python Developer"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Опис курсу</label>
                <textarea 
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  placeholder="Короткий опис напряму курсу..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7] h-20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Код курсу (ідентифікатор для IDE)</label>
                <input 
                  type="text" 
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  placeholder="напр., python або javascript"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setCreateCourseModalOpen(false)}
                  className="px-4 py-2 border border-[#27272a] text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold rounded-xl"
                >
                  Створити
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Module Modal */}
      {createModuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-[#27272a] w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Додати модуль</h3>
            <form onSubmit={handleCreateModuleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Назва модуля</label>
                <input 
                  type="text" 
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="напр., Модуль 1. Основи Python"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setCreateModuleModalOpen(false)}
                  className="px-4 py-2 border border-[#27272a] text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold rounded-xl"
                >
                  Додати
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Lesson Modal */}
      {createLessonModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-[#27272a] w-full max-w-xl rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Додати урок</h3>
            <form onSubmit={handleCreateLessonSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Назва уроку</label>
                  <input 
                    type="text" 
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="напр., Змінні та оператори"
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400">Тип уроку</label>
                  <select 
                    value={newLessonKind}
                    onChange={(e) => setNewLessonKind(e.target.value as any)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7]"
                  >
                    <option value="training">Конспект (Training)</option>
                    <option value="lesson">Лекція (Lesson)</option>
                    <option value="task">Практичне завдання (Task)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Контент (HTML підтримується)</label>
                <textarea 
                  value={newLessonContent}
                  onChange={(e) => setNewLessonContent(e.target.value)}
                  placeholder="Введіть вміст уроку в HTML..."
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#a855f7] h-40 font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setCreateLessonModalOpen(false)}
                  className="px-4 py-2 border border-[#27272a] text-xs text-gray-400 hover:text-white rounded-xl"
                >
                  Скасувати
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold rounded-xl"
                >
                  Створити урок
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Custom scrollbar styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      ` }} />
    </div>
  )
}
