import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Wallet,
  Flame,
  Sparkles,
  Plus,
  ChevronRight,
  Code2,
  FileText,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  FolderOpen,
  PlusCircle,
  Briefcase,
  Target
} from 'lucide-react'
import type { Task, Project, Snippet, Attachment, Habit, FinanceGoal, Subscription, UserRecord } from '../../types'
import { formatTime, formatShortDate, toDateKey } from '../../dateUtils'
import styles from './DashboardPanel.module.css'
import StudyAnalyticsWidget from '../Study/StudyAnalyticsWidget'

interface DashboardPanelProps {
  user: UserRecord | null
  tasks: Task[]
  projects: Project[]
  snippets: Snippet[]
  attachments: Attachment[]
  habits: Habit[]
  goals: FinanceGoal[]
  subscriptions: Subscription[]
  balance: number
  setSection: (section: any) => void
  openNewTask: () => void
  openNewProject: () => void
  openNewDiary: () => void
  openNewHabit: () => void
  openNewSub: () => void
  onToggleTask: (task: Task) => Promise<void>
  onEditTask: (task: Task) => void
}

export default function DashboardPanel({
  user,
  tasks,
  projects,
  snippets,
  attachments,
  habits,
  goals,
  subscriptions,
  balance,
  setSection,
  openNewTask,
  openNewProject,
  openNewDiary,
  openNewHabit,
  openNewSub,
  onToggleTask,
  onEditTask,
}: DashboardPanelProps) {
  const [greeting, setGreeting] = useState('Вітаємо')
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hour = now.getHours()
      if (hour >= 5 && hour < 12) {
        setGreeting('Доброго ранку')
      } else if (hour >= 12 && hour < 18) {
        setGreeting('Доброго дня')
      } else if (hour >= 18 && hour < 23) {
        setGreeting('Доброго вечора')
      } else {
        setGreeting('Доброї ночі')
      }
      
      setTimeStr(now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }))
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const todayStr = toDateKey(new Date())
  const todayTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    const taskDate = t.startAt ? t.startAt.substring(0, 10) : (t.endAt ? t.endAt.substring(0, 10) : '');
    return taskDate === todayStr || taskDate === '';
  })
  
  const incompleteTasksCount = tasks.filter((t) => t.status !== 'done').length
  const activeProjectsCount = projects.filter((p) => !p.is_completed).length

  // Calculate habit completion for today
  const todayHabitsCount = habits.length
  const todayCompletedHabitsCount = habits.filter((h) => h.history.includes(todayStr)).length
  const habitsPercent = todayHabitsCount > 0 ? Math.round((todayCompletedHabitsCount / todayHabitsCount) * 100) : 0

  // Calculate active savings target
  const activeGoals = goals.filter((g) => g.saved_amount < g.target_amount)
  const totalSaved = goals.reduce((acc, curr) => acc + curr.saved_amount, 0)
  const totalTarget = goals.reduce((acc, curr) => acc + curr.target_amount, 0)
  const financeGoalPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  // Get recent snippets & files
  const recentSnippets = snippets.slice(0, 3)
  const recentFiles = attachments.slice(0, 3)

  // Calendar dates for weekly preview (current week)
  const getWeekDays = () => {
    const current = new Date()
    const week = []
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(current.setDate(diff + i))
      week.push({
        dateStr: toDateKey(d),
        dayName: d.toLocaleDateString('uk-UA', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: toDateKey(d) === todayStr
      })
    }
    return week
  }

  const weekDays = getWeekDays()

  return (
    <section className={styles.dashboardPanel}>
      <div className={styles.headerBlock}>
        <div>
          <p className="kicker">{greeting}, {user?.name || 'користувач'}! ✨</p>
          <div className="flex items-baseline gap-3">
            <h2 className={styles.welcomeTitle}>Огляд вашого робочого столу</h2>
            <span className={styles.timeBadge}>{timeStr}</span>
          </div>
        </div>
        <div className={styles.dateLabel}>
          {new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Grid: Quick stats cards */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statsCard} ${styles.tasksCard}`} onClick={() => setSection('tasks')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><ListTodo size={20} /></span>
            <span className={styles.badge}>Задачі</span>
          </div>
          <div className={styles.cardBody}>
            <h3>{incompleteTasksCount}</h3>
            <p>активних планів / задач</p>
          </div>
          <div className={styles.cardFooter}>
            Переглянути список <ChevronRight size={14} />
          </div>
        </div>

        <div className={`${styles.statsCard} ${styles.projectsCard}`} onClick={() => setSection('projects')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Briefcase size={20} /></span>
            <span className={styles.badge}>Проєкти</span>
          </div>
          <div className={styles.cardBody}>
            <h3>{activeProjectsCount}</h3>
            <p>проєктів у роботі</p>
          </div>
          <div className={styles.cardFooter}>
            Управління проєктами <ChevronRight size={14} />
          </div>
        </div>

        <div className={`${styles.statsCard} ${styles.financeCard}`} onClick={() => setSection('finance')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Wallet size={20} /></span>
            <span className={styles.badge}>Баланс</span>
          </div>
          <div className={styles.cardBody}>
            <h3>{balance.toLocaleString('uk-UA')} ₴</h3>
            <p>накопичено {financeGoalPercent}% від цілей</p>
          </div>
          <div className={styles.cardFooter}>
            Перейти до фінансів <ChevronRight size={14} />
          </div>
        </div>

        <div className={`${styles.statsCard} ${styles.habitsCard}`} onClick={() => setSection('habits')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Target size={20} /></span>
            <span className={styles.badge}>Звички</span>
          </div>
          <div className={styles.cardBody}>
            <h3>{habitsPercent}%</h3>
            <p>{todayCompletedHabitsCount} з {todayHabitsCount} виконано сьогодні</p>
          </div>
          <div className={styles.cardFooter}>
            Трекер звичок <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* Study & Learning Analytics */}
      <StudyAnalyticsWidget />

      {/* Quick Action row */}
      <div className={styles.actionSection}>
        <h4 className={styles.sectionLabel}>Швидкі дії</h4>
        <div className={styles.actionRow}>
          <button className="btn primary" onClick={openNewTask}>
            <Plus size={16} />
            Додати задачу
          </button>
          <button className="btn secondary" onClick={openNewProject}>
            <PlusCircle size={16} />
            Новий проєкт
          </button>
          <button className="btn secondary" onClick={openNewHabit}>
            <Flame size={16} />
            Нова звичка
          </button>
          <button className="btn secondary" onClick={openNewSub}>
            <Wallet size={16} />
            Додати підписку
          </button>
        </div>
      </div>

      {/* Main split grid */}
      <div className={styles.mainSplit}>
        {/* Left Column: Today's agenda list */}
        <div className={styles.splitColumn}>
          <div className={styles.panelHeader}>
            <h3>Сьогоднішня адженда</h3>
            <span className={styles.countBadge}>{todayTasks.length}</span>
          </div>
          <div className={`${styles.cardList} scrollable`}>
            {todayTasks.length ? (
              todayTasks.map((task) => {
                const isCompleted = task.status === 'done'
                return (
                  <div
                    key={task.id}
                    className={`${styles.agendaRow} ${isCompleted ? styles.completedRow : ''}`}
                    style={{ borderLeft: `3px solid ${task.color || 'var(--border)'}` }}
                  >
                    <button
                      type="button"
                      className={styles.rowCheckbox}
                      onClick={() => void onToggleTask(task)}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-purple-400" />
                      ) : (
                        <Circle size={18} className="text-gray-500" />
                      )}
                    </button>
                    <div className={styles.rowInfo} onClick={() => onEditTask(task)}>
                      <p className={styles.rowTitle}>{task.title}</p>
                      {task.description && (
                        <p className={styles.rowDesc}>{task.description}</p>
                      )}
                      <div className={styles.rowMeta}>
                        <span className={`${styles.priorityBadge} ${styles[task.priority]}`}>
                          {task.priority === 'high' ? 'Високий' : task.priority === 'medium' ? 'Середній' : 'Низький'}
                        </span>
                        {task.startAt && (
                          <span className={styles.rowTime}>{formatTime(task.startAt)}</span>
                        )}
                      </div>
                    </div>
                    <button className={styles.arrowBtn} onClick={() => onEditTask(task)}>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                )
              })
            ) : (
              <div className={styles.emptyContainer}>
                <Calendar size={32} className="text-gray-600 mb-2" />
                <p className={styles.emptyTitle}>План на сьогодні вільний</p>
                <p className={styles.emptyText}>Додайте нову задачу або відпочиньте.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent work & mini-calendar */}
        <div className={styles.splitColumn}>
          {/* Mini Calendar strip */}
          <div className={styles.miniCalendarCard}>
            <h4>Тижневий трекер</h4>
            <div className={styles.weekStrip}>
              {weekDays.map((day) => {
                const dayTasksCount = tasks.filter((t) => {
                  const taskDate = t.startAt ? t.startAt.substring(0, 10) : (t.endAt ? t.endAt.substring(0, 10) : '');
                  return taskDate === day.dateStr;
                }).length
                return (
                  <div key={day.dateStr} className={`${styles.weekDay} ${day.isToday ? styles.today : ''}`}>
                    <span className={styles.weekDayName}>{day.dayName}</span>
                    <span className={styles.weekDayNum}>{day.dayNum}</span>
                    {dayTasksCount > 0 && (
                      <span className={styles.weekTasksIndicator} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Code Snippets */}
          <div className={styles.recentSection}>
            <div className={styles.panelHeader}>
              <h3>Останні сніпети</h3>
              <button className={styles.linkBtn} onClick={() => setSection('vault')}>
                Усі сніпети <ChevronRight size={14} />
              </button>
            </div>
            <div className={styles.recentList}>
              {recentSnippets.length ? (
                recentSnippets.map((snip) => (
                  <div key={snip.id} className={styles.recentRow} onClick={() => setSection('vault')}>
                    <span className={styles.recentIcon}><Code2 size={15} /></span>
                    <div className={styles.recentInfo}>
                      <span className={styles.recentName}>{snip.title}</span>
                      <span className={styles.recentMeta}>{snip.language}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noneLabel}>Немає збережених сніпетів</p>
              )}
            </div>
          </div>

          {/* Recent Files */}
          <div className={styles.recentSection}>
            <div className={styles.panelHeader}>
              <h3>Останні файли</h3>
              <button className={styles.linkBtn} onClick={() => setSection('files')}>
                Усі файли <ChevronRight size={14} />
              </button>
            </div>
            <div className={styles.recentList}>
              {recentFiles.length ? (
                recentFiles.map((file) => (
                  <div key={file.id} className={styles.recentRow} onClick={() => setSection('files')}>
                    <span className={styles.recentIcon}><FileText size={15} /></span>
                    <div className={styles.recentInfo}>
                      <span className={styles.recentName}>{file.originalName}</span>
                      <span className={styles.recentMeta}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noneLabel}>Немає завантажених файлів</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
