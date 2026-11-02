import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  XCircle,
  Circle,
  GraduationCap,
  HelpCircle,
  Award,
  RotateCcw,
  Sparkles,
  BarChart2
} from 'lucide-react'
import confetti from 'canvas-confetti'
import MathContent from '../MathContent/MathContent'
import { MATH_SECTION_1_TESTS, type MathTestQuestion } from '../../data/mathSection1Tests'
import { MATH_SECTION_2_TESTS } from '../../data/mathSection2Tests'
import { getUniversityQuestions } from '../../data/universityTests'
import { getEnglishQuestions } from '../../data/englishTests'
import styles from './TopicLectureView.module.css'

export interface RoadmapNodeItem {
  id: string
  title: string
  isCompleted?: boolean
  x?: number
  y?: number
}

interface TopicLectureViewProps {
  roadmapId: number
  roadmapTitle: string
  nodeId: string
  nodeTitle: string
  allNodes: RoadmapNodeItem[]
  isCompleted?: boolean
  onBack: () => void
  onNavigateTopic: (newNodeId: string) => void
  onToggleCompleted: (nodeId: string) => void
}

const OPTION_LETTERS = ['А', 'Б', 'В', 'Г']

export default function TopicLectureView({
  roadmapId: _roadmapId,
  roadmapTitle,
  nodeId,
  nodeTitle,
  allNodes,
  isCompleted = false,
  onBack,
  onNavigateTopic,
  onToggleCompleted
}: TopicLectureViewProps) {
  const [activeTab, setActiveTab] = useState<'lecture' | 'tests'>('lecture')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({})

  // Filter for sequential navigation: Math topics if in Math roadmap, otherwise all section/subtopic nodes
  const eligibleNodes = useMemo(() => {
    const isMath = roadmapTitle.toLowerCase().includes('математика')
    if (isMath) {
      const mathList = allNodes.filter(
        (n) =>
          n.id === 'math_1' ||
          n.id.startsWith('math_1_') ||
          n.id === 'math_2' ||
          n.id.startsWith('math_2_')
      )
      if (mathList.length > 0) return mathList
    }
    return allNodes.filter((n) => n.id !== 'root')
  }, [allNodes, roadmapTitle])

  const { currentIndex, prevNode, nextNode, totalCount } = useMemo(() => {
    const list = eligibleNodes.length > 0 ? eligibleNodes : allNodes.filter((n) => n.id !== 'root')
    const idx = list.findIndex((n) => n.id === nodeId)
    return {
      currentIndex: idx >= 0 ? idx : 0,
      prevNode: idx > 0 ? list[idx - 1] : null,
      nextNode: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
      totalCount: list.length
    }
  }, [eligibleNodes, allNodes, nodeId])

  // Fetch Lecture Note
  useEffect(() => {
    let isMounted = true
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const token = localStorage.getItem('token')
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const query = `?title=${encodeURIComponent(nodeTitle)}`

    fetch(`/api/roadmaps/notes/${encodeURIComponent(nodeId)}${query}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        setNotes(data?.notes || '')
      })
      .catch((err) => {
        console.error('Failed to load lecture note:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [nodeId, nodeTitle])

  // Extract executive summary from markdown if present
  const executiveSummary = useMemo(() => {
    if (!notes) return 'Повний конспект теми, математичні формули, визначення та покрокові розрахунки на числах.'
    const lines = notes.split('\n')
    const introLine = lines.find(
      (l) => l.trim().length > 30 && !l.startsWith('#') && !l.startsWith('$') && !l.startsWith('*')
    )
    return introLine || 'Опануйте базові визначення, ключові формули та розрахунки на реальних числових прикладах.'
  }, [notes])

  // Check active section (Section 1.1 vs Section 1.2 vs University Disciplines)
  const isMathSection1 = nodeId === 'math_1' || nodeId.startsWith('math_1_')
  const isMathSection2 = nodeId === 'math_2' || nodeId.startsWith('math_2_')

  const isEnglishTopic = nodeId.toLowerCase().startsWith('eng') || /англ|english/i.test(roadmapTitle)

  const activeSectionTests = useMemo(() => {
    if (isMathSection1) return MATH_SECTION_1_TESTS
    if (isMathSection2) return MATH_SECTION_2_TESTS
    if (isEnglishTopic) return getEnglishQuestions(nodeId, nodeTitle, roadmapTitle)
    return getUniversityQuestions(nodeId, nodeTitle, roadmapTitle)
  }, [isMathSection1, isMathSection2, isEnglishTopic, nodeId, nodeTitle, roadmapTitle])

  const activeSectionTitle = useMemo(() => {
    if (isMathSection1) return 'Розділ 1.1 Описова статистика'
    if (isMathSection2) return 'Розділ 1.2 Теорія ймовірностей'
    if (isEnglishTopic) return '🇬🇧 Англійська мова: Від нуля до Strong B2'
    return roadmapTitle
  }, [isMathSection1, isMathSection2, isEnglishTopic, roadmapTitle])

  // Reset filter when switching between topics
  useEffect(() => {
    setSelectedFilter('all')
  }, [nodeId])

  // Current topic quick check tests (3-4 questions for this nodeId)
  const currentTopicTests = useMemo(() => {
    const directMatches = activeSectionTests.filter((t) => t.topicId === nodeId)
    if (directMatches.length > 0) return directMatches.slice(0, 4)
    return activeSectionTests.slice(0, 4)
  }, [nodeId, activeSectionTests])

  // Filtered tests for dedicated Trainer tab
  const displayedTrainerTests = useMemo(() => {
    if (selectedFilter === 'all') return activeSectionTests
    const filtered = activeSectionTests.filter((t) => t.topicId === selectedFilter)
    return filtered.length > 0 ? filtered : activeSectionTests
  }, [selectedFilter, activeSectionTests])

  // Dynamic topic pills for the trainer tab
  const topicPills = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>()
    activeSectionTests.forEach((q) => {
      const existing = map.get(q.topicId)
      const qTitle = (q as any).topicTitle || nodeTitle || 'Основна тема'
      if (existing) {
        existing.count++
      } else {
        map.set(q.topicId, { title: qTitle, count: 1 })
      }
    })
    return Array.from(map.entries()).map(([id, info]) => ({
      id,
      title: info.title,
      count: info.count
    }))
  }, [activeSectionTests, nodeTitle])

  // Global test statistics for active section
  const { answeredCount, correctCount, accuracyPercent } = useMemo(() => {
    let count = 0
    let correct = 0
    activeSectionTests.forEach((q) => {
      const qKey = `${q.topicId}_${q.id}`
      if (userAnswers[qKey] !== undefined) {
        count++
        if (userAnswers[qKey] === q.correctIndex) {
          correct++
        }
      }
    })
    if (count === 0) return { answeredCount: 0, correctCount: 0, accuracyPercent: 0 }

    const accuracy = Math.round((correct / count) * 100)
    return { answeredCount: count, correctCount: correct, accuracyPercent: accuracy }
  }, [userAnswers, activeSectionTests])

  // Handle answering question
  const handleAnswer = (question: MathTestQuestion, optionIdx: number) => {
    const qKey = `${question.topicId}_${question.id}`
    if (userAnswers[qKey] !== undefined) return // already answered

    setUserAnswers((prev) => ({
      ...prev,
      [qKey]: optionIdx
    }))

    if (optionIdx === question.correctIndex) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 }
        })
      } catch {
        // ignore if canvas unavailable
      }
    }
  }

  const handleResetAnswers = () => {
    if (window.confirm('Скинути результати тестів для цього розділу та почати спочатку?')) {
      setUserAnswers((prev) => {
        const next = { ...prev }
        activeSectionTests.forEach((q) => {
          delete next[`${q.topicId}_${q.id}`]
        })
        return next
      })
    }
  }

  return (
    <div className={styles.lectureContainer}>
      {/* Sticky Top Navigation Bar */}
      <header className={styles.topNav}>
        <div className={styles.topNavInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button type="button" className={styles.backBtn} onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Назад до роадмапи</span>
            </button>
            <div className={styles.navMeta}>
              <span className={styles.progressBadge}>
                {roadmapTitle.split(' для ')[0]} • Тема {currentIndex + 1} з {totalCount}
              </span>
            </div>
          </div>

          <div className={styles.stepNavGroup}>
            <button
              type="button"
              className={styles.stepNavBtn}
              disabled={!prevNode}
              onClick={() => prevNode && onNavigateTopic(prevNode.id)}
              title={prevNode ? prevNode.title : undefined}
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Попередня</span>
            </button>

            <button
              type="button"
              className={`${styles.stepNavBtn} ${styles.stepNavBtnPrimary}`}
              disabled={!nextNode}
              onClick={() => nextNode && onNavigateTopic(nextNode.id)}
              title={nextNode ? nextNode.title : undefined}
            >
              <span className="hidden sm:inline">Наступна</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Article Wrapper */}
      <main className={styles.mainContent}>
        {/* Navigation Tabs Header */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'lecture' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('lecture')}
          >
            <BookOpen size={16} />
            <span>Конспект лекції</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'tests' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('tests')}
          >
            <HelpCircle size={16} />
            <span>Тренажер знань ({activeSectionTests.length} тестів)</span>
            <span className={styles.tabBadge}>
              {answeredCount}/{activeSectionTests.length}
            </span>
          </button>
        </div>

        {activeTab === 'lecture' ? (
          <>
            {/* Hero Card */}
            <section className={styles.heroCard}>
              <div className={styles.badgeRow}>
                <span className={styles.sectionBadge}>
                  <GraduationCap size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  LMS Академічний Конспект
                </span>
                <span className={styles.categoryBadge}>
                  Розділ {nodeId.startsWith('math_2') ? '1.2 Теорія ймовірностей' : '1.1 Описова статистика'}
                </span>
                {isCompleted ? (
                  <span className={styles.completedBadge}>
                    <CheckCircle2 size={12} />
                    Тему засвоєно
                  </span>
                ) : (
                  <span className={styles.categoryBadge}>У процесі вивчення</span>
                )}
              </div>

              <h1 className={styles.lectureTitle}>{nodeTitle}</h1>

              {/* Executive Summary Box (Inspired by IvankaNMT) */}
              <div className={styles.summaryBox}>
                <div className={styles.summaryIcon}>
                  <BookOpen size={16} />
                </div>
                <div className={styles.summaryContent}>
                  <span className={styles.summaryLabel}>Головна суть теми:</span>
                  <span className={styles.summaryText}>{executiveSummary}</span>
                </div>
              </div>
            </section>

            {/* Content Body Card */}
            <section className={styles.lectureBodyCard}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#a1a1aa' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '3px solid rgba(255, 79, 163, 0.2)',
                      borderTopColor: '#ff4fa3',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      margin: '0 auto 16px'
                    }}
                  />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Завантаження повного конспекту...</p>
                </div>
              ) : (
                <MathContent content={notes} />
              )}
            </section>

            {/* Quick Check Mini-Tests for this Topic */}
            {currentTopicTests.length > 0 && (
              <section className={styles.quickCheckSection}>
                <div className={styles.quickCheckSectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={styles.quickCheckIcon}>
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <span className={styles.quickCheckSub}>Перевір себе одразу після лекції</span>
                      <h2 className={styles.quickCheckMainTitle}>
                        Експрес-перевірка знань ({currentTopicTests.length} запитання)
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.openAllTestsBtn}
                    onClick={() => {
                      setSelectedFilter(nodeId)
                      setActiveTab('tests')
                    }}
                  >
                    <span>Відкрити повний тренажер 30 тестів</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className={styles.quickQuestionsList}>
                  {currentTopicTests.map((q, qIndex) => {
                    const qKey = `${q.topicId}_${q.id}`
                    const selectedOpt = userAnswers[qKey]
                    const isAnswered = selectedOpt !== undefined
                    const isCorrect = isAnswered && selectedOpt === q.correctIndex

                    return (
                      <div key={q.id} className={styles.quickQuestionCard}>
                        <div className={styles.questionCardHeader}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={styles.questionNumBadge}>Запитання {qIndex + 1}</span>
                            <span
                              className={`${styles.difficultyBadge} ${
                                q.difficulty === 'Легкий'
                                  ? styles.diffEasy
                                  : q.difficulty === 'Середній'
                                  ? styles.diffMedium
                                  : styles.diffHard
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </div>
                          {isAnswered && (
                            <span className={isCorrect ? styles.statusBadgeCorrect : styles.statusBadgeWrong}>
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 size={13} /> Правильно
                                </>
                              ) : (
                                <>
                                  <XCircle size={13} /> Помилка
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        <div className={styles.questionText}>
                          <MathContent content={q.question} />
                        </div>

                        <div className={styles.optionsGrid}>
                          {q.options.map((optText, optIdx) => {
                            const isThisSelected = selectedOpt === optIdx
                            const isThisCorrect = optIdx === q.correctIndex

                            let btnClass = styles.optionBtn
                            if (isAnswered) {
                              if (isThisCorrect) {
                                btnClass = `${styles.optionBtn} ${styles.optionBtnCorrect}`
                              } else if (isThisSelected && !isThisCorrect) {
                                btnClass = `${styles.optionBtn} ${styles.optionBtnWrong}`
                              } else {
                                btnClass = `${styles.optionBtn} ${styles.optionBtnDimmed}`
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                className={btnClass}
                                disabled={isAnswered}
                                onClick={() => handleAnswer(q, optIdx)}
                              >
                                <span className={styles.optionLetter}>{OPTION_LETTERS[optIdx]}</span>
                                <span className={styles.optionContent}>
                                  <MathContent content={optText} />
                                </span>
                                {isAnswered && isThisCorrect && (
                                  <CheckCircle2 size={16} className={styles.correctIcon} />
                                )}
                                {isAnswered && isThisSelected && !isThisCorrect && (
                                  <XCircle size={16} className={styles.wrongIcon} />
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {/* Explanation Box (Revealed on Answer) */}
                        {isAnswered && (
                          <div className={styles.explanationBox}>
                            <div className={styles.explanationHeader}>
                              <Award size={15} />
                              <span>Детальне обґрунтування відповіді:</span>
                            </div>
                            <div className={styles.explanationBody}>
                              <MathContent content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Footer Navigation Bar */}
            <section className={styles.footerBar}>
              <button
                type="button"
                className={`${styles.completeActionBtn} ${isCompleted ? styles.completeActionBtnDone : ''}`}
                onClick={() => onToggleCompleted(nodeId)}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                <span>{isCompleted ? 'Тему пройдено! (Натисніть для зміни)' : 'Позначити тему як засвоєну'}</span>
              </button>

              {nextNode && (
                <button
                  type="button"
                  className={styles.nextTopicBtn}
                  onClick={() => onNavigateTopic(nextNode.id)}
                >
                  <span>Наступний конспект: {nextNode.title.split(' ')[0]}</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </section>
          </>
        ) : (
          /* ========================================================= */
          /* DEDICATED TRAINER TAB (ALL 30 QUESTIONS WITH FILTERS & STATS) */
          /* ========================================================= */
          <div className={styles.trainerContainer}>
            {/* Stats Dashboard Card */}
            <section className={styles.statsCard}>
              <div className={styles.statsCardHeader}>
                <div>
                  <h2 className={styles.statsTitle}>
                    <Sparkles size={18} style={{ color: '#ff4fa3', display: 'inline', marginRight: '8px' }} />
                    Тренажер практичних завдань ({activeSectionTests.length} тестів)
                  </h2>
                  <p className={styles.statsSubtitle}>
                    {activeSectionTitle}: прикладні задачі, KaTeX формули, інтерпретація та інженерні кейси.
                  </p>
                </div>
                {answeredCount > 0 && (
                  <button type="button" className={styles.resetBtn} onClick={handleResetAnswers}>
                    <RotateCcw size={14} />
                    <span>Скинути спроби</span>
                  </button>
                )}
              </div>

              {/* Stat Counters Grid */}
              <div className={styles.statGrid}>
                <div className={styles.statTile}>
                  <span className={styles.statNum}>{activeSectionTests.length}</span>
                  <span className={styles.statLabel}>Всього питань</span>
                </div>
                <div className={styles.statTile}>
                  <span className={styles.statNum} style={{ color: '#38bdf8' }}>
                    {answeredCount} / {activeSectionTests.length}
                  </span>
                  <span className={styles.statLabel}>Вирішено</span>
                </div>
                <div className={styles.statTile}>
                  <span className={styles.statNum} style={{ color: '#10b981' }}>
                    {correctCount}
                  </span>
                  <span className={styles.statLabel}>Правильних відповідей</span>
                </div>
                <div className={styles.statTile}>
                  <span className={styles.statNum} style={{ color: '#ec4899' }}>
                    {accuracyPercent}%
                  </span>
                  <span className={styles.statLabel}>Точність відповідей</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${(answeredCount / activeSectionTests.length) * 100}%` }}
                />
              </div>
            </section>

            {/* Filter Pills */}
            <div className={styles.filterSection}>
              <span className={styles.filterTitle}>
                <BarChart2 size={14} />
                Фільтр за темами:
              </span>
              <div className={styles.filterPills}>
                <button
                  type="button"
                  className={`${styles.filterPill} ${selectedFilter === 'all' ? styles.filterPillActive : ''}`}
                  onClick={() => setSelectedFilter('all')}
                >
                  Всі {activeSectionTests.length} тестів
                </button>
                {topicPills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    className={`${styles.filterPill} ${selectedFilter === pill.id ? styles.filterPillActive : ''}`}
                    onClick={() => setSelectedFilter(pill.id)}
                  >
                    {pill.title} ({pill.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className={styles.questionsList}>
              {displayedTrainerTests.map((q) => {
                const qKey = `${q.topicId}_${q.id}`
                const selectedOpt = userAnswers[qKey]
                const isAnswered = selectedOpt !== undefined
                const isCorrect = isAnswered && selectedOpt === q.correctIndex

                return (
                  <div key={q.id} className={styles.trainerQuestionCard}>
                    <div className={styles.questionCardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={styles.questionNumBadge}>Тест #{q.id}</span>
                        <span className={styles.topicBadgeTag}>{q.topicTitle}</span>
                        <span
                          className={`${styles.difficultyBadge} ${
                            q.difficulty === 'Легкий'
                              ? styles.diffEasy
                              : q.difficulty === 'Середній'
                              ? styles.diffMedium
                              : styles.diffHard
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      {isAnswered && (
                        <span className={isCorrect ? styles.statusBadgeCorrect : styles.statusBadgeWrong}>
                          {isCorrect ? (
                            <>
                              <CheckCircle2 size={13} /> Вірно
                            </>
                          ) : (
                            <>
                              <XCircle size={13} /> Невірно
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    <div className={styles.questionText}>
                      <MathContent content={q.question} />
                    </div>

                    <div className={styles.optionsGrid}>
                      {q.options.map((optText, optIdx) => {
                        const isThisSelected = selectedOpt === optIdx
                        const isThisCorrect = optIdx === q.correctIndex

                        let btnClass = styles.optionBtn
                        if (isAnswered) {
                          if (isThisCorrect) {
                            btnClass = `${styles.optionBtn} ${styles.optionBtnCorrect}`
                          } else if (isThisSelected && !isThisCorrect) {
                            btnClass = `${styles.optionBtn} ${styles.optionBtnWrong}`
                          } else {
                            btnClass = `${styles.optionBtn} ${styles.optionBtnDimmed}`
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            className={btnClass}
                            disabled={isAnswered}
                            onClick={() => handleAnswer(q, optIdx)}
                          >
                            <span className={styles.optionLetter}>{OPTION_LETTERS[optIdx]}</span>
                            <span className={styles.optionContent}>
                              <MathContent content={optText} />
                            </span>
                            {isAnswered && isThisCorrect && (
                              <CheckCircle2 size={16} className={styles.correctIcon} />
                            )}
                            {isAnswered && isThisSelected && !isThisCorrect && (
                              <XCircle size={16} className={styles.wrongIcon} />
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Detailed Explanation Box */}
                    {isAnswered && (
                      <div className={styles.explanationBox}>
                        <div className={styles.explanationHeader}>
                          <Award size={15} />
                          <span>Детальне обґрунтування та хід думок:</span>
                        </div>
                        <div className={styles.explanationBody}>
                          <MathContent content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Return to Reading Lecture Button */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                className={styles.backToLectureBtn}
                onClick={() => {
                  setActiveTab('lecture')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <BookOpen size={16} />
                <span>Повернутися до вивчення конспекту</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
