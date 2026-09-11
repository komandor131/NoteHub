import React, { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import MathContent from '../MathContent/MathContent'

export interface QuizQuestion {
  id: number
  nodeId: string | null
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface QuizModalProps {
  open: boolean
  onClose: () => void
  nodeId?: string
  nodeTitle?: string
  onActivityLogged?: () => void
}

export default function QuizModal({
  open,
  onClose,
  nodeId,
  nodeTitle,
  onActivityLogged
}: QuizModalProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadQuizzes = async () => {
    setLoading(true)
    try {
      let url = '/api/study/quizzes'
      if (nodeId) url += `?nodeId=${encodeURIComponent(nodeId)}`
      const res = await fetch(url)
      const data = await res.json()
      if (Array.isArray(data)) {
        setQuestions(data)
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsAnswerSubmitted(false)
        setScore(0)
        setIsFinished(false)
      }
    } catch (e) {
      console.error('Failed to load quizzes:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void loadQuizzes()
    }
  }, [open, nodeId])

  if (!open) return null

  const currentQ = questions[currentIndex]

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQ) return
    setIsAnswerSubmitted(true)
    if (selectedOption === currentQ.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setIsAnswerSubmitted(false)
    } else {
      // Finished all questions in quiz
      setIsFinished(true)
      const finalScore = score + (selectedOption === currentQ?.correctIndex ? 1 : 0)
      try {
        await fetch('/api/study/quizzes/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: finalScore, total: questions.length })
        })
        if (onActivityLogged) onActivityLogged()
      } catch (e) {
        console.error('Failed to submit quiz score:', e)
      }
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsAnswerSubmitted(false)
    setScore(0)
    setIsFinished(false)
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 11000,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '660px',
          background: '#0e0e11',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05), transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                Тест для перевірки знань
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                {nodeTitle ? `Тема: ${nodeTitle}` : 'Контрольні тестові запитання'}
              </p>
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              Завантаження запитань...
            </div>
          ) : questions.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <HelpCircle size={26} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#fff' }}>
                Тести для цього розділу готуються
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--muted)', maxWidth: '380px', marginInline: 'auto' }}>
                Ви можете повторити матеріал у розділі Конспект або скористатися ШІ-Викладачем для генерації нових практичних задач.
              </p>
              <button className="btn secondary" onClick={onClose}>
                Повернутися до роадмапи
              </button>
            </div>
          ) : isFinished ? (
            /* Results Screen */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: score >= Math.ceil(questions.length * 0.7) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: score >= Math.ceil(questions.length * 0.7) ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <Award size={32} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: '20px', color: '#fff' }}>
                {score >= Math.ceil(questions.length * 0.7) ? '🎉 Відмінний результат!' : '💪 Тест пройдено!'}
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--muted)' }}>
                Ви правильно відповіли на <strong style={{ color: '#fff' }}>{score}</strong> з {questions.length} запитань.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  background: 'rgba(255, 79, 163, 0.12)',
                  color: 'var(--pink)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '24px'
                }}
              >
                <Sparkles size={14} /> +{score * 15 + (score >= Math.ceil(questions.length * 0.7) ? 30 : 5)} XP нараховано
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn secondary" onClick={handleRestart} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={14} /> Пройти знову
                </button>
                <button className="btn primary" onClick={onClose} style={{ background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}>
                  Завершити
                </button>
              </div>
            </div>
          ) : (
            /* Question Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Question Progress Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                <span>
                  Запитання <strong style={{ color: '#fff' }}>{currentIndex + 1}</strong> з {questions.length}
                </span>
                <span>
                  Правильних: <strong style={{ color: '#10b981' }}>{score}</strong>
                </span>
              </div>

              {/* Question Card */}
              <div
                style={{
                  background: '#121216',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#fff',
                  lineHeight: 1.5
                }}
              >
                <MathContent content={currentQ.question} />
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQ.options.map((opt, idx) => {
                  let borderColor = 'var(--border)'
                  let bgColor = '#121216'
                  let textColor = '#e4e4e7'

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      borderColor = '#10b981'
                      bgColor = 'rgba(16, 185, 129, 0.12)'
                      textColor = '#34d399'
                    } else if (idx === selectedOption) {
                      borderColor = '#ef4444'
                      bgColor = 'rgba(239, 68, 68, 0.12)'
                      textColor = '#f87171'
                    }
                  } else if (selectedOption === idx) {
                    borderColor = 'var(--pink)'
                    bgColor = 'rgba(255, 79, 163, 0.08)'
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswerSubmitted}
                      onClick={() => setSelectedOption(idx)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `1px solid ${borderColor}`,
                        background: bgColor,
                        color: textColor,
                        textAlign: 'left',
                        fontSize: '13.5px',
                        cursor: isAnswerSubmitted ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isAnswerSubmitted && idx === currentQ.correctIndex && (
                        <CheckCircle2 size={16} color="#10b981" />
                      )}
                      {isAnswerSubmitted && idx === selectedOption && idx !== currentQ.correctIndex && (
                        <XCircle size={16} color="#ef4444" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Explanation when submitted */}
              {isAnswerSubmitted && currentQ.explanation && (
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.06)',
                    borderLeft: '4px solid #3b82f6',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                >
                  <strong style={{ display: 'block', color: '#60a5fa', marginBottom: '4px' }}>
                    💡 Пояснення розв'язку:
                  </strong>
                  <MathContent content={currentQ.explanation} />
                </div>
              )}

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                {!isAnswerSubmitted ? (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={selectedOption === null}
                    onClick={handleSubmitAnswer}
                    style={{
                      background: 'var(--pink)',
                      borderColor: 'var(--pink)',
                      color: '#fff',
                      padding: '8px 22px',
                      fontSize: '13px'
                    }}
                  >
                    Відповісти
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleNextQuestion}
                    style={{
                      background: '#10b981',
                      borderColor: '#10b981',
                      color: '#fff',
                      padding: '8px 22px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {currentIndex < questions.length - 1 ? 'Наступне запитання' : 'Переглянути результати'}
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
