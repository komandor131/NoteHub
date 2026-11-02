import React, { useState, useMemo, useEffect } from 'react'
import {
  ShieldAlert,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Trophy,
  HelpCircle,
  Award,
} from 'lucide-react'
import { getCheckpointById, LMSQuizCheckpoint, LMSQuizQuestion } from '../../data/lmsMathTests'
import MathContent from '../MathContent/MathContent'
import styles from './LMSQuizView.module.css'

interface LMSQuizViewProps {
  checkpointId: string
  onComplete?: (score: number, passed: boolean) => void
  onNavigateNext?: () => void
  onNavigatePrev?: () => void
}

export const LMSQuizView: React.FC<LMSQuizViewProps> = ({
  checkpointId,
  onComplete,
  onNavigateNext,
  onNavigatePrev,
}) => {
  const checkpoint: LMSQuizCheckpoint | null = useMemo(() => {
    return getCheckpointById(checkpointId)
  }, [checkpointId])

  // Mystery mode: false until explicitly clicked
  const [isStarted, setIsStarted] = useState<boolean>(false)
  const [currentIdx, setCurrentIdx] = useState<number>(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)

  // Reset state when checkpointId changes
  useEffect(() => {
    setIsStarted(false)
    setCurrentIdx(0)
    setSelectedAnswers({})
    setIsSubmitted(false)
    setElapsedSeconds(0)
  }, [checkpointId])

  // Timer while quiz is active
  useEffect(() => {
    if (!isStarted || isSubmitted) return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isStarted, isSubmitted])

  if (!checkpoint) {
    return (
      <div className={styles.quizRoot}>
        <div className={styles.introCard}>
          <HelpCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
          <h2 className={styles.introTitle}>Контрольний тест не знайдено</h2>
          <p className={styles.introSubtitle}>
            Для ідентифікатора {checkpointId} ще не сформовано тестовий пул завдань.
          </p>
          {onNavigateNext && (
            <button type="button" className={styles.navBtn} onClick={onNavigateNext}>
              <span>Перейти до наступної теми</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const questions: LMSQuizQuestion[] = checkpoint.questions
  const totalQuestions = questions.length // Exactly 20
  const answeredCount = Object.keys(selectedAnswers).length
  const currentQuestion = questions[currentIdx]

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }))
  }

  const handleSubmitQuiz = () => {
    setIsSubmitted(true)
    let score = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1
      }
    })
    const passed = score >= checkpoint.passingScore
    if (onComplete) {
      onComplete(score, passed)
    }
  }

  const handleRetry = () => {
    setSelectedAnswers({})
    setIsSubmitted(false)
    setCurrentIdx(0)
    setElapsedSeconds(0)
    setIsStarted(true)
  }

  // Calculate final score
  const finalScore = useMemo(() => {
    let score = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1
      }
    })
    return score
  }, [questions, selectedAnswers])

  const isPassed = finalScore >= checkpoint.passingScore
  const scorePercent = Math.round((finalScore / totalQuestions) * 100)

  // =========================================================================
  // 1. MYSTERY INTRO VIEW (Before clicking "Розпочати тестування")
  // =========================================================================
  if (!isStarted) {
    return (
      <div className={styles.quizRoot}>
        <div className={styles.introCard}>
          <div className={styles.introIconWrap}>
            <Trophy size={36} />
          </div>

          <div className={styles.introBadge}>
            <ShieldAlert size={14} />
            <span>Підсумковий зріз знань</span>
          </div>

          <h1 className={styles.introTitle}>{checkpoint.title}</h1>
          <p className={styles.introSubtitle}>
            {checkpoint.modulesSpan} • {checkpoint.moduleRangeText}
          </p>

          <div className={styles.introStatsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{totalQuestions}</div>
              <div className={styles.statLabel}>Запитань</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>20</div>
              <div className={styles.statLabel}>Макс. балів (1 бал/пит)</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{checkpoint.passingScore} / 20</div>
              <div className={styles.statLabel}>Прохідний бал (80%)</div>
            </div>
          </div>

          <div className={styles.introNotice}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#60a5fa' }}>
              🔒 Правила та умови проходження:
            </strong>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '6px' }}>
                Тест формується з 20 завдань за темами попередніх 3-х модулів.
              </li>
              <li style={{ marginBottom: '6px' }}>
                Зміст запитань та варіанти відповідей стануть відомі тільки після початку тесту.
              </li>
              <li style={{ marginBottom: '6px' }}>
                Ви можете вільно повертатися до будь-якого питання та змінювати свій вибір до натискання «Завершити тест».
              </li>
              <li>
                Після завершення ви отримаєте повний розбір кожного питання з правильними формулами та поясненнями.
              </li>
            </ul>
          </div>

          <button
            type="button"
            className={styles.startQuizBtn}
            onClick={() => setIsStarted(true)}
          >
            <Play size={18} fill="#ffffff" />
            <span>Розпочати тестування ({totalQuestions} питань)</span>
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 3. RESULTS & EXPLANATIONS VIEW (After test is submitted)
  // =========================================================================
  if (isSubmitted) {
    return (
      <div className={styles.quizRoot}>
        {/* Results Banner */}
        <div className={`${styles.resultsHeroCard} ${isPassed ? styles.passed : styles.failed}`}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            {isPassed ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '16px', borderRadius: '50%' }}>
                <Award size={48} color="#34d399" />
              </div>
            ) : (
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '16px', borderRadius: '50%' }}>
                <HelpCircle size={48} color="#fbbf24" />
              </div>
            )}
          </div>

          <div className={`${styles.resultScoreBadge} ${isPassed ? styles.passed : styles.failed}`}>
            {finalScore} / {totalQuestions}
          </div>

          <div className={styles.resultStatusText}>
            {isPassed
              ? '🎉 Відмінно! Модульний контроль складено!'
              : '⚠️ Тест не складено. Прохідний поріг — 16 балів.'}
          </div>

          <p className={styles.resultSubtext}>
            Ваш результат: {scorePercent}% • Час проходження: {formatTime(elapsedSeconds)} •{' '}
            {isPassed
              ? 'Матеріал 3-х модулів засвоєно на високому рівні.'
              : 'Рекомендуємо переглянути конспекти тем, де були допущені помилки, та пройти тест знову.'}
          </p>

          <div className={styles.resultActionsRow}>
            <button type="button" className={styles.retryBtn} onClick={handleRetry}>
              <RotateCcw size={16} />
              <span>Пройти тест знову</span>
            </button>

            {onNavigateNext && (
              <button type="button" className={styles.nextModuleBtn} onClick={onNavigateNext}>
                <span>Продовжити навчання</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Review */}
        <div className={styles.reviewHeader}>
          <Sparkles size={20} color="#7eb5ff" />
          <span>Детальний аналіз відповідей ({totalQuestions} питань)</span>
        </div>

        <div>
          {questions.map((q, qIdx) => {
            const userChoice = selectedAnswers[qIdx]
            const isCorrect = userChoice === q.correctIndex

            return (
              <div
                key={q.id}
                className={`${styles.reviewItemCard} ${isCorrect ? styles.isCorrect : styles.isWrong}`}
              >
                <div className={styles.reviewItemTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#ffffff' }}>#{qIdx + 1}</span>
                    <span className={styles.topicTag}>{q.topicTitle}</span>
                  </div>

                  <span className={`${styles.statusPill} ${isCorrect ? styles.correct : styles.wrong}`}>
                    {isCorrect ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Правильно (+1 бал)</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        <span>Помилка (0 балів)</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Question */}
                <div style={{ marginBottom: '14px', fontSize: '15.5px', color: '#ffffff' }}>
                  <MathContent content={q.question} />
                </div>

                {/* Options Review */}
                <div className={styles.reviewOptionsList}>
                  {q.options.map((opt, optIdx) => {
                    const isUserPick = userChoice === optIdx
                    const isRight = optIdx === q.correctIndex
                    const letter = String.fromCharCode(65 + optIdx)

                    let optionClass = styles.reviewOption
                    if (isRight) optionClass += ` ${styles.correctAnswer}`
                    else if (isUserPick && !isRight) optionClass += ` ${styles.userSelectedWrong}`

                    return (
                      <div key={optIdx} className={optionClass}>
                        <span style={{ fontWeight: 700, minWidth: '22px' }}>{letter}.</span>
                        <div style={{ flex: 1 }}>
                          <MathContent content={opt} />
                        </div>
                        {isRight && <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />}
                        {isUserPick && !isRight && <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />}
                      </div>
                    )
                  })}
                </div>

                {/* Mathematical Explanation */}
                <div className={styles.explanationBox}>
                  <div className={styles.explanationTitle}>💡 Математичне обґрунтування:</div>
                  <MathContent content={q.explanation} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 2. ACTIVE QUIZ RUNNER VIEW (20 questions with mystery revealed)
  // =========================================================================
  const optionLetters = ['A', 'B', 'C', 'D']

  return (
    <div className={styles.quizRoot}>
      {/* Header with Title & Stepper */}
      <div className={styles.quizHeader}>
        <div className={styles.quizTopRow}>
          <div className={styles.quizTitle}>
            <Trophy size={18} color="#7eb5ff" />
            <span>{checkpoint.title}</span>
          </div>

          <div className={styles.quizMetaBadges}>
            <div className={styles.answeredCountBadge}>
              Відповіді: {answeredCount} / {totalQuestions}
            </div>
            <div className={styles.timerBadge}>
              <Clock size={14} />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* 20 Questions Stepper */}
        <div className={styles.stepperGrid}>
          {questions.map((_, idx) => {
            const isAnswered = selectedAnswers[idx] !== undefined
            const isActive = idx === currentIdx

            let pillClass = styles.stepPill
            if (isActive) pillClass += ` ${styles.active}`
            else if (isAnswered) pillClass += ` ${styles.answered}`

            return (
              <button
                key={idx}
                type="button"
                className={pillClass}
                onClick={() => setCurrentIdx(idx)}
                title={`Питання ${idx + 1}${isAnswered ? ' (відповідь обрана)' : ''}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question Card */}
      <div className={styles.questionCard}>
        <div className={styles.questionMetaRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff' }}>
              Питання {currentIdx + 1} з {totalQuestions}
            </span>
            <span className={styles.topicTag}>{currentQuestion.topicTitle}</span>
          </div>

          <span
            className={`${styles.difficultyTag} ${
              currentQuestion.difficulty === 'Легкий'
                ? styles.diffEasy
                : currentQuestion.difficulty === 'Середній'
                ? styles.diffMedium
                : styles.diffHard
            }`}
          >
            {currentQuestion.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <div className={styles.questionText}>
          <MathContent content={currentQuestion.question} />
        </div>

        {/* Options */}
        <div className={styles.optionsList}>
          {currentQuestion.options.map((opt, optIdx) => {
            const isSelected = selectedAnswers[currentIdx] === optIdx
            return (
              <button
                key={optIdx}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleSelectOption(optIdx)}
              >
                <span className={styles.optionLetter}>{optionLetters[optIdx]}</span>
                <div className={styles.optionText}>
                  <MathContent content={opt} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className={styles.runnerFooter}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
        >
          <ChevronLeft size={16} />
          <span>Попереднє</span>
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentIdx < totalQuestions - 1 ? (
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
            >
              <span>Наступне</span>
              <ChevronRight size={16} />
            </button>
          ) : null}

          <button
            type="button"
            className={styles.submitQuizBtn}
            onClick={handleSubmitQuiz}
          >
            <CheckCircle2 size={16} />
            <span>Завершити тест ({answeredCount}/{totalQuestions})</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default LMSQuizView
