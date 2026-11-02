import React, { useState, useMemo, useEffect } from 'react'
import {
  Home,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Bell,
  Moon,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  Trophy,
} from 'lucide-react'
import type { LMSDiscipline, LMSTopic, LMSModule } from './lmsTypes'
import LMSEmptyDiscipline from './LMSEmptyDiscipline'
import MathContent from '../MathContent/MathContent'
import LMSQuizView from './LMSQuizView'
import styles from './LMSPortal.module.css'

interface LMSDisciplineViewProps {
  disciplines: LMSDiscipline[]
  currentDisciplineId: string
  onSelectDiscipline: (disciplineId: string) => void
  onExitToNoteHub: () => void
  onToggleTopicCompleted?: (topicId: string, completed: boolean) => void
}

export const LMSDisciplineView: React.FC<LMSDisciplineViewProps> = ({
  disciplines,
  currentDisciplineId,
  onSelectDiscipline,
  onExitToNoteHub,
  onToggleTopicCompleted,
}) => {
  const currentDiscipline = useMemo(
    () => disciplines.find((d) => d.id === currentDisciplineId) || disciplines[0],
    [disciplines, currentDisciplineId]
  )

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Map of expanded modules
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  // Default active topic
  const [activeTopicId, setActiveTopicId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loadingNote, setLoadingNote] = useState<boolean>(false)

  // Auto-select first topic when discipline changes
  useEffect(() => {
    if (currentDiscipline && currentDiscipline.modules.length > 0) {
      const firstMod = currentDiscipline.modules[0]
      if (firstMod.topics.length > 0) {
        setActiveTopicId(firstMod.topics[0].id)
        setExpandedModules({ [firstMod.id]: true })
      }
    }
  }, [currentDisciplineId])

  // Active topic & parent module
  const { activeTopic, activeModule, allTopicsList } = useMemo(() => {
    let foundTopic: LMSTopic | null = null
    let foundModule: LMSModule | null = null
    const allTopics: LMSTopic[] = []

    if (currentDiscipline) {
      for (const mod of currentDiscipline.modules) {
        for (const topic of mod.topics) {
          allTopics.push(topic)
          if (topic.id === activeTopicId) {
            foundTopic = topic
            foundModule = mod
          }
        }
      }
    }

    if (!foundTopic && allTopics.length > 0) {
      foundTopic = allTopics[0]
      foundModule = currentDiscipline?.modules[0] || null
    }

    return {
      activeTopic: foundTopic,
      activeModule: foundModule,
      allTopicsList: allTopics,
    }
  }, [currentDiscipline, activeTopicId])

  // Fetch real lecture notes from roadmap API
  useEffect(() => {
    if (!activeTopic || !currentDiscipline?.hasMaterials || activeTopic.kind === 'quiz') {
      setNotes('')
      return
    }

    let isMounted = true
    setLoadingNote(true)

    const token = localStorage.getItem('token')
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const query = `?title=${encodeURIComponent(activeTopic.title)}`

    fetch(`/api/roadmaps/notes/${encodeURIComponent(activeTopic.id)}${query}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        setNotes(data?.notes || '')
      })
      .catch((err) => {
        console.error('Failed to load lecture notes:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingNote(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeTopic, currentDiscipline])

  // Prev / Next topic navigation
  const { prevTopic, nextTopic } = useMemo(() => {
    const idx = allTopicsList.findIndex((t) => t.id === activeTopicId)
    return {
      prevTopic: idx > 0 ? allTopicsList[idx - 1] : null,
      nextTopic: idx >= 0 && idx < allTopicsList.length - 1 ? allTopicsList[idx + 1] : null,
    }
  }, [allTopicsList, activeTopicId])

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }))
  }

  const handleToggleComplete = () => {
    if (!activeTopic) return
    const newStatus = !activeTopic.isCompleted
    activeTopic.isCompleted = newStatus
    if (onToggleTopicCompleted) {
      onToggleTopicCompleted(activeTopic.id, newStatus)
    }
  }

  // Filter disciplines for dropdown search
  const filteredDisciplines = useMemo(() => {
    if (!searchQuery.trim()) return disciplines
    const q = searchQuery.toLowerCase()
    return disciplines.filter((d) => d.title.toLowerCase().includes(q))
  }, [disciplines, searchQuery])

  return (
    <div className={styles.lmsRoot}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.brandLogo} onClick={onExitToNoteHub} title="Повернутися до NoteHub">
            <span>GO</span>
            <span>IT</span>
          </div>

          <button
            type="button"
            className={styles.homeIconBtn}
            onClick={onExitToNoteHub}
            title="Головна NoteHub"
          >
            <Home size={17} />
          </button>

          <div className={styles.breadcrumbs}>
            <span className={styles.breadcrumbArrow}>→</span>
            <span className={styles.breadcrumbLink} onClick={onExitToNoteHub}>
              Роадмапи
            </span>
            <span className={styles.breadcrumbArrow}>→</span>

            {/* Real Roadmaps Dropdown Selector */}
            <div className={styles.disciplineSelectorWrap}>
              <button
                type="button"
                className={styles.disciplineSelectorBtn}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span>{currentDiscipline?.title}</span>
                <ChevronDown size={14} />
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <div className={styles.dropdownTitle}>
                    Навчальні Роадмапи NoteHub ({disciplines.length})
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {filteredDisciplines.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`${styles.dropdownItem} ${d.id === currentDisciplineId ? styles.active : ''}`}
                        onClick={() => {
                          onSelectDiscipline(d.id)
                          setIsDropdownOpen(false)
                        }}
                      >
                        <div>
                          <div className={styles.dropdownItemTitle}>{d.title}</div>
                          <div className={styles.dropdownItemMeta}>
                            {d.modules.length} модулів • {d.totalTopics} тем
                          </div>
                        </div>
                        {d.hasMaterials && <Sparkles size={14} color="#7eb5ff" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className={styles.topbarSearch}>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} color="#88888e" />
            </div>
          </div>
        </div>

        <div className={styles.topbarRight}>
          <button type="button" className={styles.iconBtn} title="Календар">
            <Calendar size={16} />
          </button>
          <button type="button" className={styles.iconBtn} title="Сповіщення">
            <Bell size={16} />
          </button>
          <button
            type="button"
            className={styles.miniCoursesBtn}
            onClick={() => {
              const math = disciplines.find((d) => d.hasMaterials) || disciplines[0]
              onSelectDiscipline(math.id)
            }}
          >
            Математика
          </button>
          <div className={styles.userAvatar} title="Профіль">
            <span>O</span>
          </div>
          <div className={styles.darkModeBadge} title="Темна тема">
            <Moon size={13} color="#facc15" />
            <span className={styles.newPill}>NEW</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.disciplineLayout}>
        {/* Left Sidebar */}
        {!isSidebarCollapsed && (
          <aside className={styles.sidebar}>
            <div className={styles.sidebarModulesList}>
              {currentDiscipline.modules.map((module) => {
                const isExpanded = expandedModules[module.id] ?? false
                return (
                  <div key={module.id} className={styles.moduleBlock}>
                    <button
                      type="button"
                      className={`${styles.moduleHeaderBtn} ${isExpanded ? styles.expanded : ''}`}
                      onClick={() => toggleModuleExpanded(module.id)}
                    >
                      <div className={styles.moduleHeaderLeft}>
                        <span className={styles.moduleCheckmark}>
                          <Check size={15} strokeWidth={3} />
                        </span>
                        <span className={styles.moduleTitleText}>{module.title}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isExpanded && (
                      <div className={styles.moduleSubList}>
                        {module.topics.map((topic) => {
                          const isActive = topic.id === activeTopicId
                          const isQuiz = topic.kind === 'quiz'
                          return (
                            <button
                              key={topic.id}
                              type="button"
                              className={`${styles.topicRowBtn} ${isActive ? styles.active : ''} ${isQuiz ? styles.quizTopicRow : ''}`}
                              onClick={() => setActiveTopicId(topic.id)}
                            >
                              <span className={styles.topicCheckmark}>
                                {isQuiz ? (
                                  <Trophy size={13} color="#f59e0b" />
                                ) : (
                                  <Check size={13} strokeWidth={2.5} />
                                )}
                              </span>
                              <span style={isQuiz ? { color: '#fbbf24', fontWeight: 600 } : undefined}>
                                {topic.title}
                              </span>
                              {isQuiz && <span className={styles.quizBadge}>20 Б</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={styles.sidebarFooter}>
              <button
                type="button"
                className={styles.collapseMenuBtn}
                onClick={() => setIsSidebarCollapsed(true)}
              >
                <span>Collapse menu</span>
                <span>«</span>
              </button>
            </div>
          </aside>
        )}

        {/* Center Main Pane */}
        {!currentDiscipline.hasMaterials ? (
          /* Empty state for unpopulated roadmaps */
          <LMSEmptyDiscipline
            discipline={currentDiscipline}
            onSwitchToMath={() => {
              const math = disciplines.find((d) => d.hasMaterials) || disciplines[0]
              onSelectDiscipline(math.id)
            }}
            onBackToCatalog={onExitToNoteHub}
          />
        ) : (
          /* Populated lecture reader for Mathematics sourced from Roadmap */
          <main className={styles.readingPane}>
            <div className={styles.readingContentWrap}>
              {activeTopic && (
                activeTopic.kind === 'quiz' ? (
                  <LMSQuizView
                    checkpointId={activeTopic.id}
                    onComplete={(_score, passed) => {
                      if (passed) {
                        handleToggleComplete()
                      }
                    }}
                    onNavigateNext={() => nextTopic && setActiveTopicId(nextTopic.id)}
                    onNavigatePrev={() => prevTopic && setActiveTopicId(prevTopic.id)}
                  />
                ) : (
                  <>
                    <h1 className={styles.readingTitle}>{activeTopic.title}</h1>

                    {loadingNote ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px 0', color: '#9a9a9f' }}>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Завантаження конспекту з роадмапи...</span>
                      </div>
                    ) : (
                      <div className={styles.readingBody}>
                        <MathContent content={notes || `### Огляд теми: ${activeTopic.title}\n\nМатеріали теми завантажуються з бази знань роадмапи.`} />
                      </div>
                    )}

                    {/* Navigation Footer */}
                    <footer className={styles.readingFooter}>
                      <button
                        type="button"
                        className={styles.navTopicBtn}
                        disabled={!prevTopic}
                        onClick={() => prevTopic && setActiveTopicId(prevTopic.id)}
                      >
                        <ChevronLeft size={16} />
                        <span>Попередня тема</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.completeBtn} ${activeTopic.isCompleted ? styles.completed : ''}`}
                        onClick={handleToggleComplete}
                      >
                        <Check size={16} strokeWidth={2.5} />
                        <span>{activeTopic.isCompleted ? 'Вивчено' : 'Позначити як вивчено'}</span>
                      </button>

                      <button
                        type="button"
                        className={styles.navTopicBtn}
                        disabled={!nextTopic}
                        onClick={() => nextTopic && setActiveTopicId(nextTopic.id)}
                      >
                        <span>Наступна тема</span>
                        <ChevronRight size={16} />
                      </button>
                    </footer>
                  </>
                )
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default LMSDisciplineView
