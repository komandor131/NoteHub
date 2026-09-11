import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  RotateCw,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Layers
} from 'lucide-react'
import MathContent from '../MathContent/MathContent'

export interface Flashcard {
  id: number
  roadmapId: number | null
  nodeId: string | null
  question: string
  answer: string
  mastery: number
  nextReviewDate: string | null
}

interface FlashcardsModalProps {
  open: boolean
  onClose: () => void
  roadmapId?: number
  nodeId?: string
  nodeTitle?: string
  onActivityLogged?: () => void
}

export default function FlashcardsModal({
  open,
  onClose,
  roadmapId,
  nodeId,
  nodeTitle,
  onActivityLogged
}: FlashcardsModalProps) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadCards = async () => {
    setLoading(true)
    try {
      let url = '/api/study/flashcards'
      const params = new URLSearchParams()
      if (nodeId) params.set('nodeId', nodeId)
      else if (roadmapId) params.set('roadmapId', String(roadmapId))
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCards(data)
        setCurrentIndex(0)
        setIsFlipped(false)
      }
    } catch (e) {
      console.error('Failed to load flashcards:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void loadCards()
    }
  }, [open, roadmapId, nodeId])

  if (!open) return null

  const currentCard = cards[currentIndex]

  const handleReview = async (rating: 'easy' | 'good' | 'hard') => {
    if (!currentCard) return
    try {
      await fetch(`/api/study/flashcards/${currentCard.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })
      if (onActivityLogged) onActivityLogged()

      // Flip back and go to next card
      setIsFlipped(false)
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        // Reload deck to update mastery
        void loadCards()
      }
    } catch (e) {
      console.error('Failed to review flashcard:', e)
    }
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim() || !newAnswer.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/study/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId,
          nodeId,
          question: newQuestion.trim(),
          answer: newAnswer.trim()
        })
      })
      if (res.ok) {
        setNewQuestion('')
        setNewAnswer('')
        setShowAddForm(false)
        await loadCards()
        if (onActivityLogged) onActivityLogged()
      }
    } catch (e) {
      console.error('Failed to create flashcard:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCard = async (id: number) => {
    if (!confirm('Видалити цю флеш-картку?')) return
    try {
      await fetch(`/api/study/flashcards/${id}`, { method: 'DELETE' })
      setCards((prev) => prev.filter((c) => c.id !== id))
      if (currentIndex >= cards.length - 1) {
        setCurrentIndex(Math.max(0, cards.length - 2))
      }
      setIsFlipped(false)
    } catch (e) {
      console.error('Failed to delete flashcard:', e)
    }
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
          maxWidth: '680px',
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
            background: 'linear-gradient(180deg, rgba(255, 79, 163, 0.05), transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(255, 79, 163, 0.15)',
                color: 'var(--pink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                Флеш-картки та інтервальне повторення
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                {nodeTitle ? `Тема: ${nodeTitle}` : 'Колекція карток для повторення'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn secondary compact"
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              <Plus size={13} style={{ marginRight: '4px' }} />
              {showAddForm ? 'Картки' : 'Додати'}
            </button>
            <button
              className="icon-btn"
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {showAddForm ? (
            /* Add Card Form */
            <form onSubmit={handleCreateCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600 }}>
                Створити нову флеш-картку
              </h3>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Питання або концепція (підтримує формули $...$ та $$...$$)
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Наприклад: Чому дорівнює стандартне відхилення \sigma?"
                  style={{
                    background: '#09090b',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Відповідь та розбір (підтримує формули, списки, KaTeX)
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Наприклад: $$\sigma = \sqrt{\frac{1}{n}\sum(x_i - \bar{x})^2}$$ Це міра розсіювання даних."
                  style={{
                    background: '#09090b',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={isSaving}
                  style={{ background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}
                >
                  {isSaving ? 'Збереження...' : 'Створити картку'}
                </button>
              </div>
            </form>
          ) : loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              Завантаження карток...
            </div>
          ) : cards.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(255, 79, 163, 0.1)',
                  color: 'var(--pink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <HelpCircle size={26} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#fff' }}>
                Немає карток для цієї теми
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--muted)', maxWidth: '380px', marginInline: 'auto' }}>
                Створіть свою першу картку з формулою чи запитанням, щоб тренувати пам'ять перед тестами.
              </p>
              <button
                className="btn primary"
                onClick={() => setShowAddForm(true)}
                style={{ background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}
              >
                <Plus size={14} style={{ marginRight: '6px' }} /> Створити першу картку
              </button>
            </div>
          ) : (
            /* Card Interactive View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Progress & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                <span>
                  Картка <strong style={{ color: '#fff' }}>{currentIndex + 1}</strong> з {cards.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: currentCard.mastery >= 3 ? '#10b981' : currentCard.mastery > 0 ? '#3b82f6' : 'var(--muted)'
                    }}
                  >
                    Рівень пам'яті: {currentCard.mastery}/5 ⭐
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => handleDeleteCard(currentCard.id)}
                    title="Видалити картку"
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* 3D Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  minHeight: '260px',
                  background: isFlipped ? '#141419' : '#121216',
                  border: isFlipped ? '1px solid rgba(255, 79, 163, 0.35)' : '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: isFlipped ? '0 12px 36px rgba(255, 79, 163, 0.08)' : '0 8px 24px rgba(0, 0, 0, 0.4)',
                  transition: 'all 0.25s ease'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '16px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 600,
                    color: isFlipped ? 'var(--pink)' : '#a1a1aa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCw size={11} /> {isFlipped ? 'Відповідь & Розбір' : 'Запитання'}
                </div>

                <div style={{ width: '100%', textAlign: 'center', margin: 'auto 0' }}>
                  {isFlipped ? (
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <MathContent content={currentCard.answer} />
                    </div>
                  ) : (
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#ffffff', lineHeight: 1.5 }}>
                      <MathContent content={currentCard.question} />
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    fontSize: '11.5px',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} color="var(--pink)" />
                  Натисніть на картку, щоб {isFlipped ? 'повернутися до питання' : 'побачити відповідь'}
                </div>
              </div>

              {/* Review Buttons when Flipped */}
              {isFlipped ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleReview('hard')}
                    style={{
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.08)',
                      padding: '10px',
                      fontSize: '12px'
                    }}
                  >
                    🔴 Складно
                    <span style={{ display: 'block', fontSize: '10px', opacity: 0.8 }}>Повторити завтра (+5 XP)</span>
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleReview('good')}
                    style={{
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      background: 'rgba(59, 130, 246, 0.08)',
                      padding: '10px',
                      fontSize: '12px'
                    }}
                  >
                    🟡 Добре
                    <span style={{ display: 'block', fontSize: '10px', opacity: 0.8 }}>Через 3 дні (+10 XP)</span>
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleReview('easy')}
                    style={{
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.08)',
                      padding: '10px',
                      fontSize: '12px'
                    }}
                  >
                    🟢 Легко
                    <span style={{ display: 'block', fontSize: '10px', opacity: 0.8 }}>Через тиждень (+15 XP)</span>
                  </button>
                </div>
              ) : (
                /* Navigation Buttons */
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      setIsFlipped(false)
                      setCurrentIndex((i) => Math.max(0, i - 1))
                    }}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    <ChevronLeft size={14} style={{ marginRight: '4px' }} /> Попередня
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setIsFlipped(true)}
                    style={{ background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff', fontSize: '12.5px', padding: '6px 18px' }}
                  >
                    Показати відповідь
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={currentIndex === cards.length - 1}
                    onClick={() => {
                      setIsFlipped(false)
                      setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))
                    }}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Наступна <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
