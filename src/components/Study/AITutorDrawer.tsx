import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Sparkles,
  BookmarkPlus,
  Lightbulb,
  Binary,
  Calculator,
  HelpCircle,
  Bot,
  User,
  Check
} from 'lucide-react'
import MathContent from '../MathContent/MathContent'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
}

interface AITutorDrawerProps {
  open: boolean
  onClose: () => void
  nodeId?: string
  nodeTitle?: string
  onSaveToNotes?: (contentToAppend: string) => Promise<void>
}

export default function AITutorDrawer({
  open,
  onClose,
  nodeId,
  nodeTitle,
  onSaveToNotes
}: AITutorDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedMessageId, setSavedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize tutor message when opening a new topic
  useEffect(() => {
    if (open && nodeTitle) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `👋 Вітаю! Я ваш інтерактивний **ШІ-Викладач** по темі: **${nodeTitle}**.\n\nЯ пояснюю матеріал покроково, показую точні математичні формули з розбором, розписую ручні розрахунки на числах та даю задачі для перевірки.\n\nОберіть дію нижче або напишіть своє запитання:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }
  }, [open, nodeTitle])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open) return null

  const handleSend = async (customPrompt?: string, actionType?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || loading) return

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customPrompt) setInputText('')
    setLoading(true)

    try {
      const res = await fetch('/api/study/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: nodeTitle,
          userMessage: textToSend.trim(),
          actionType: actionType || 'custom'
        })
      })
      const data = await res.json()
      const aiReplyText = data.reply || 'Вибачте, виникла помилка генерації відповіді. Спробуйте ще раз.'

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (e) {
      console.error('Failed to get AI tutor reply:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToNotes = async (msg: Message) => {
    if (!onSaveToNotes) return
    try {
      await onSaveToNotes(`\n\n---\n### 🤖 Конспект від ШІ-Викладача (${msg.timestamp})\n${msg.text}`)
      setSavedMessageId(msg.id)
      setTimeout(() => setSavedMessageId(null), 2500)
    } catch (e) {
      console.error('Failed to save to notes:', e)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 10000,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          background: '#0c0c0f',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#0f0f13'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--pink), #8b5cf6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                ШІ-Викладач
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--muted)', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nodeTitle || 'Інтерактивний репетитор'}
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

        {/* Quick Actions Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          <button
            type="button"
            className="btn secondary compact"
            disabled={loading}
            onClick={() => handleSend('Поясни цю концепцію з нуля простими словами та аналогіями', 'explain')}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Lightbulb size={12} color="#f59e0b" /> Поясни з нуля
          </button>
          <button
            type="button"
            className="btn secondary compact"
            disabled={loading}
            onClick={() => handleSend('Наведи точні математичні формули та розпиши кожну змінну', 'formulas')}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Binary size={12} color="#60a5fa" /> Формули & Змінні
          </button>
          <button
            type="button"
            className="btn secondary compact"
            disabled={loading}
            onClick={() => handleSend('Покажи покроковий приклад розрахунку на конкретних числах', 'example')}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Calculator size={12} color="#10b981" /> Приклад розрахунку
          </button>
          <button
            type="button"
            className="btn secondary compact"
            disabled={loading}
            onClick={() => handleSend('Дай мені одну практичну задачу для перевірки знань', 'task')}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <HelpCircle size={12} color="var(--pink)" /> Задача на перевірку
          </button>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: '4px'
              }}
            >
              <div
                style={{
                  maxWidth: '92%',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #be185d, #9d174d)' : '#141419',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}
              >
                {msg.sender === 'user' ? (
                  <div>{msg.text}</div>
                ) : (
                  <div>
                    <MathContent content={msg.text} />
                    {onSaveToNotes && msg.id !== 'welcome' && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn secondary compact"
                          onClick={() => handleSaveToNotes(msg)}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: savedMessageId === msg.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: savedMessageId === msg.id ? '#10b981' : 'var(--muted)',
                            borderColor: savedMessageId === msg.id ? '#10b981' : 'var(--border)'
                          }}
                        >
                          {savedMessageId === msg.id ? (
                            <>
                              <Check size={11} /> Збережено в конспект!
                            </>
                          ) : (
                            <>
                              <BookmarkPlus size={11} /> Зберегти в конспект
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--muted)', margin: '0 4px' }}>
                {msg.timestamp}
              </span>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px', padding: '8px' }}>
              <Sparkles size={14} color="var(--pink)" className="animate-spin" />
              ШІ-Викладач готує детальне пояснення...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: '#0f0f13' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend()
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              className="form-control"
              placeholder="Задайте питання викладачу..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              style={{
                background: '#09090b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                padding: '8px 12px'
              }}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={!inputText.trim() || loading}
              style={{
                background: 'var(--pink)',
                borderColor: 'var(--pink)',
                color: '#fff',
                width: '38px',
                height: '38px',
                minWidth: '38px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
