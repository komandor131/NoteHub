const fs = require('fs');

const panelFile = 'src/components/RoadmapsPanel/RoadmapsPanel.tsx';
let content = fs.readFileSync(panelFile, 'utf8');

// 1. Add imports
const oldImports = `import MathContent from '../MathContent/MathContent'
import styles from './RoadmapsPanel.module.css'
import { useConfirm } from '../../context/ConfirmContext'`;

const newImports = `import MathContent from '../MathContent/MathContent'
import styles from './RoadmapsPanel.module.css'
import { useConfirm } from '../../context/ConfirmContext'
import FlashcardsModal from '../Study/FlashcardsModal'
import QuizModal from '../Study/QuizModal'
import AITutorDrawer from '../Study/AITutorDrawer'
import StudyAnalyticsWidget from '../Study/StudyAnalyticsWidget'
import { Bot, Layers, Award, Sparkles, Edit3, Eye, Flame, Zap } from 'lucide-react'`;

if (content.includes(oldImports)) {
  content = content.replace(oldImports, newImports);
}

// 2. Add study states inside RoadmapsPanel component
const oldStates = `  const [activeNotes, setActiveNotes] = useState<string | null>(null)
  const [activeNotesTitle, setActiveNotesTitle] = useState<string>('')
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)`;

const newStates = `  const [activeNotes, setActiveNotes] = useState<string | null>(null)
  const [activeNotesTitle, setActiveNotesTitle] = useState<string>('')
  const [activeNotesNodeId, setActiveNotesNodeId] = useState<string | null>(null)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesEditContent, setNotesEditContent] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Interactive study modals
  const [isAITutorOpen, setIsAITutorOpen] = useState(false)
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [activeStudyNodeId, setActiveStudyNodeId] = useState<string | undefined>(undefined)
  const [activeStudyNodeTitle, setActiveStudyNodeTitle] = useState<string | undefined>(undefined)
  const [analyticsKey, setAnalyticsKey] = useState(0)`;

if (content.includes(oldStates)) {
  content = content.replace(oldStates, newStates);
}

// 3. Update handleOpenNotes to also populate notesEditContent & activeNotesNodeId
const oldHandleOpenNotes = `  const handleOpenNotes = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setActiveNotesTitle(node.title || 'Конспект')
    setIsLoadingNotes(true)
    try {
      const res = await fetch(\`\${API_BASE}/api/roadmaps/notes/\${nodeId}\`)
      const data = await res.json()
      if (data && data.notes) {
        setActiveNotes(data.notes)
      } else {
        setActiveNotes('Для цього кроку конспект ще не створено.')
      }
    } catch (err) {
      setActiveNotes('Помилка завантаження конспекту. Перевірте з\\'єднання з сервером.')
    } finally {
      setIsLoadingNotes(false)
    }
  }`;

const newHandleOpenNotes = `  const handleOpenNotes = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setActiveNotesTitle(node.title || 'Конспект')
    setActiveNotesNodeId(nodeId)
    setIsEditingNotes(false)
    setIsLoadingNotes(true)
    try {
      const res = await fetch(\`\${API_BASE}/api/roadmaps/notes/\${nodeId}\`)
      const data = await res.json()
      const notesText = data && data.notes ? data.notes : 'Для цього кроку конспект ще не створено.\\n\\nВи можете додати власні нотатки, формули LaTeX або згенерувати конспект за допомогою ШІ-Викладача.'
      setActiveNotes(notesText)
      setNotesEditContent(notesText)
    } catch (err) {
      setActiveNotes('Помилка завантаження конспекту. Перевірте з\\'єднання з сервером.')
      setNotesEditContent('')
    } finally {
      setIsLoadingNotes(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!activeNotesNodeId) return
    setIsSavingNotes(true)
    try {
      const res = await fetch(\`\${API_BASE}/api/roadmaps/notes/\${activeNotesNodeId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesEditContent })
      })
      if (res.ok) {
        setActiveNotes(notesEditContent)
        setIsEditingNotes(false)
        setAnalyticsKey((k) => k + 1)
      }
    } catch (e) {
      console.error('Failed to save notes:', e)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleAppendToNotes = async (contentToAppend: string) => {
    const targetNodeId = activeStudyNodeId || activeNotesNodeId || selectedNodeId
    if (!targetNodeId) return
    const currentText = activeNotes || ''
    const updatedText = currentText + contentToAppend
    try {
      await fetch(\`\${API_BASE}/api/roadmaps/notes/\${targetNodeId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedText })
      })
      setActiveNotes(updatedText)
      setNotesEditContent(updatedText)
      setAnalyticsKey((k) => k + 1)
    } catch (e) {
      console.error('Failed to append to notes:', e)
    }
  }

  const handleInsertSnippet = (snippet: string) => {
    setNotesEditContent((prev) => prev + snippet)
  }`;

if (content.includes(oldHandleOpenNotes)) {
  content = content.replace(oldHandleOpenNotes, newHandleOpenNotes);
}

// 4. In roadmap header: add compact StudyAnalyticsWidget and buttons for Flashcards & Quizzes
const oldCanvasHeader = `        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn secondary"
            onClick={() => onSelectRoadmap(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ChevronLeft size={16} /> Назад до списку
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{roadmap.title}</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
              {roadmap.description || 'Навчальний план'}
            </p>
          </div>
        </div>`;

const newCanvasHeader = `        {/* Back and Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="btn secondary"
              onClick={() => onSelectRoadmap(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Назад до списку
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{roadmap.title}</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                {roadmap.description || 'Навчальний план'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StudyAnalyticsWidget key={analyticsKey} compact />
            <button
              className="btn secondary compact"
              onClick={() => {
                setActiveStudyNodeId(undefined)
                setActiveStudyNodeTitle(roadmap.title)
                setIsFlashcardsOpen(true)
              }}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={14} color="var(--pink)" /> Флеш-картки
            </button>
            <button
              className="btn secondary compact"
              onClick={() => {
                setActiveStudyNodeId(undefined)
                setActiveStudyNodeTitle(roadmap.title)
                setIsQuizOpen(true)
              }}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Award size={14} color="#60a5fa" /> Тести
            </button>
          </div>
        </div>`;

if (content.includes(oldCanvasHeader)) {
  content = content.replace(oldCanvasHeader, newCanvasHeader);
}

// 5. In Node Inspector: add buttons for AI Tutor, Flashcards, Quiz, and LaTeX notes
const oldInspectorActions = `                    {selectedNodeId && (
                      <button
                        type="button"
                        className="btn primary"
                        style={{ marginTop: '8px', minHeight: '32px', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}
                        onClick={async () => {
                          if (setSection && onSelectMindMap) {
                            let currentMindMaps = mindMaps || []
                            try {
                              const data = await fetchMindMaps()
                              if (Array.isArray(data)) {
                                currentMindMaps = data
                              }
                            } catch (e) {
                              console.error(e)
                            }

                            if (onRefreshData) {
                              void onRefreshData() // Sync parent state in background
                            }

                            const cleanNodeTitle = node.title.trim()
                            const targetMap = currentMindMaps.find((m) => 
                              m.title.trim().toLowerCase() === cleanNodeTitle.toLowerCase() ||
                              m.title.trim().toLowerCase().includes(cleanNodeTitle.toLowerCase())
                            ) || currentMindMaps.find((m) => m.title === 'Математика та статистика') || currentMindMaps[0]
                            
                            if (targetMap) {
                              onSelectMindMap(targetMap.id)
                            }
                            setSection('mindmaps')
                          }
                        }}
                      >
                        <BookOpen size={13} /> Перейти до вивчення теми
                      </button>
                    )}`;

const newInspectorActions = `                    {selectedNodeId && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          className="btn primary"
                          style={{
                            minHeight: '34px',
                            fontSize: '12.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: 'linear-gradient(135deg, var(--pink), #9333ea)',
                            borderColor: 'var(--pink)',
                            color: '#fff',
                            fontWeight: 600
                          }}
                          onClick={() => {
                            setActiveStudyNodeId(node.id)
                            setActiveStudyNodeTitle(node.title)
                            setIsAITutorOpen(true)
                          }}
                        >
                          <Bot size={15} /> 🤖 Відкрити ШІ-Викладача
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ minHeight: '32px', fontSize: '11.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => {
                              setActiveStudyNodeId(node.id)
                              setActiveStudyNodeTitle(node.title)
                              setIsFlashcardsOpen(true)
                            }}
                          >
                            <Layers size={13} color="var(--pink)" /> Флеш-картки
                          </button>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ minHeight: '32px', fontSize: '11.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            onClick={() => {
                              setActiveStudyNodeId(node.id)
                              setActiveStudyNodeTitle(node.title)
                              setIsQuizOpen(true)
                            }}
                          >
                            <Award size={13} color="#60a5fa" /> Тест знань
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn secondary"
                          style={{ minHeight: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => handleOpenNotes(node.id)}
                        >
                          <FileText size={13} color="#10b981" /> 📝 Конспект (LaTeX)
                        </button>
                      </div>
                    )}`;

if (content.includes(oldInspectorActions)) {
  content = content.replace(oldInspectorActions, newInspectorActions);
}

// 6. In Note Drawer: Add toolbar and edit mode with KaTeX shortcuts and split preview
const oldNotesDrawer = `      {activeNotes !== null && (
        <div className="modal-backdrop" onClick={() => setActiveNotes(null)} style={{ zIndex: 10000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '650px',
              maxWidth: '95vw',
              height: '100%',
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#0c0c0e',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
          >
            <div className="drawer-header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="kicker" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: 'var(--pink)', letterSpacing: '1.2px', fontWeight: 600 }}>Навчальний конспект</p>
                <h2 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600, color: '#ffffff', lineHeight: '1.4' }}>{activeNotesTitle}</h2>
              </div>
              <button className="icon-btn" onClick={() => setActiveNotes(null)} aria-label="Close notes" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body" style={{ padding: '24px 20px', flex: 1, overflowY: 'auto', background: '#09090b' }}>
              {isLoadingNotes ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  <span>Завантаження конспекту...</span>
                </div>
              ) : (
                <MathContent content={activeNotes} />
              )}
            </div>
            <div className="drawer-actions" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: '#0c0c0e' }}>
              <button className="btn secondary" style={{ width: '100%' }} onClick={() => setActiveNotes(null)}>
                Закрити конспект
              </button>
            </div>
          </div>
        </div>
      )}`;

const newNotesDrawer = `      {activeNotes !== null && (
        <div className="modal-backdrop" onClick={() => setActiveNotes(null)} style={{ zIndex: 10000 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: isEditingNotes ? '850px' : '650px',
              maxWidth: '95vw',
              height: '100%',
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              background: '#0c0c0e',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              transition: 'width 0.2s ease'
            }}
          >
            <div className="drawer-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f13' }}>
              <div>
                <p className="kicker" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', color: 'var(--pink)', letterSpacing: '1.2px', fontWeight: 600 }}>Навчальний конспект</p>
                <h2 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, color: '#ffffff', lineHeight: '1.4' }}>{activeNotesTitle}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn secondary compact"
                  onClick={() => setIsEditingNotes(!isEditingNotes)}
                  style={{ fontSize: '11.5px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isEditingNotes ? <Eye size={13} /> : <Edit3 size={13} />}
                  {isEditingNotes ? 'Перегляд' : 'Редагувати'}
                </button>
                <button
                  className="btn secondary compact"
                  onClick={() => {
                    setActiveStudyNodeId(activeNotesNodeId || undefined)
                    setActiveStudyNodeTitle(activeNotesTitle)
                    setIsAITutorOpen(true)
                  }}
                  style={{ fontSize: '11.5px', padding: '4px 10px', color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Bot size={13} /> ШІ-Викладач
                </button>
                <button className="icon-btn" onClick={() => setActiveNotes(null)} aria-label="Close notes" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* LaTeX Snippets Toolbar when in edit mode */}
            {isEditingNotes && (
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('$$\\\\frac{a}{b}$$')}>
                  Дріб (frac)
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('$$\\\\sqrt{x}$$')}>
                  Корінь (sqrt)
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('$$\\\\sum_{i=1}^{n} x_i$$')}>
                  Сума (sum)
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('$$\\\\sigma = \\\\sqrt{S^2}$$')}>
                  Сигма (σ)
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('$$\\\\mu$$')}>
                  Мю (μ)
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('\\n> [!TIP]\\n> Корисна підказка')}>
                  💡 [!TIP]
                </button>
                <button type="button" className="btn secondary compact" style={{ fontSize: '11px', padding: '2px 7px' }} onClick={() => handleInsertSnippet('\\n> [!IMPORTANT]\\n> Важлива формула')}>
                  📝 [!IMPORTANT]
                </button>
              </div>
            )}

            <div className="drawer-body" style={{ padding: '20px', flex: 1, overflowY: 'auto', background: '#09090b' }}>
              {isLoadingNotes ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--muted)' }}>
                  <span>Завантаження конспекту...</span>
                </div>
              ) : isEditingNotes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                  <textarea
                    className="form-control"
                    value={notesEditContent}
                    onChange={(e) => setNotesEditContent(e.target.value)}
                    placeholder="Введіть текст конспекту з підтримкою Markdown та формул LaTeX ($...$ та $$...$$)"
                    style={{
                      flex: 1,
                      minHeight: '260px',
                      background: '#121216',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '14px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      resize: 'none'
                    }}
                  />
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Попередній перегляд (Live Preview):
                    </p>
                    <div style={{ background: '#121216', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto' }}>
                      <MathContent content={notesEditContent} />
                    </div>
                  </div>
                </div>
              ) : (
                <MathContent content={activeNotes} />
              )}
            </div>

            <div className="drawer-actions" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: '#0c0c0e', display: 'flex', gap: '10px' }}>
              {isEditingNotes ? (
                <>
                  <button className="btn secondary" style={{ flex: 1 }} onClick={() => setIsEditingNotes(false)}>
                    Скасувати
                  </button>
                  <button
                    className="btn primary"
                    style={{ flex: 1, background: 'var(--pink)', borderColor: 'var(--pink)', color: '#fff' }}
                    disabled={isSavingNotes}
                    onClick={handleSaveNotes}
                  >
                    {isSavingNotes ? 'Збереження...' : 'Зберегти зміни'}
                  </button>
                </>
              ) : (
                <button className="btn secondary" style={{ width: '100%' }} onClick={() => setActiveNotes(null)}>
                  Закрити конспект
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      <FlashcardsModal
        open={isFlashcardsOpen}
        onClose={() => setIsFlashcardsOpen(false)}
        roadmapId={selectedRoadmapId || undefined}
        nodeId={activeStudyNodeId}
        nodeTitle={activeStudyNodeTitle}
        onActivityLogged={() => setAnalyticsKey((k) => k + 1)}
      />

      <QuizModal
        open={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        nodeId={activeStudyNodeId}
        nodeTitle={activeStudyNodeTitle}
        onActivityLogged={() => setAnalyticsKey((k) => k + 1)}
      />

      <AITutorDrawer
        open={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        nodeId={activeStudyNodeId}
        nodeTitle={activeStudyNodeTitle}
        onSaveToNotes={handleAppendToNotes}
      />`;

if (content.includes(oldNotesDrawer)) {
  content = content.replace(oldNotesDrawer, newNotesDrawer);
}

// 7. Show StudyAnalyticsWidget in roadmaps overview list
const oldRoadmapGridHeader = `      <div className="panel-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Навчальні роадмапи</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            Оберіть напрямок або створіть власний навчальний трек
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => {
            setEditingRoadmap(null)
            setIsDrawerOpen(true)
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Створити роадмап
        </button>
      </div>`;

const newRoadmapGridHeader = `      <div className="panel-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Навчальні роадмапи</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '14px' }}>
            Оберіть напрямок або створіть власний навчальний трек (60 спеціалізованих блоків)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn secondary"
            onClick={() => {
              setActiveStudyNodeId(undefined)
              setActiveStudyNodeTitle('Загальний огляд')
              setIsFlashcardsOpen(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Layers size={15} color="var(--pink)" /> Флеш-картки
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              setActiveStudyNodeId(undefined)
              setActiveStudyNodeTitle('Загальний тест')
              setIsQuizOpen(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Award size={15} color="#60a5fa" /> Тести
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setEditingRoadmap(null)
              setIsDrawerOpen(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Створити роадмап
          </button>
        </div>
      </div>

      <StudyAnalyticsWidget key={analyticsKey} />`;

if (content.includes(oldRoadmapGridHeader)) {
  content = content.replace(oldRoadmapGridHeader, newRoadmapGridHeader);
}

fs.writeFileSync(panelFile, content, 'utf8');
console.log('Successfully patched RoadmapsPanel.tsx with interactive learning & LaTeX editor!');
