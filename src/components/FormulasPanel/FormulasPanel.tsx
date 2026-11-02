import React, { useState, useEffect, useMemo, useCallback } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  Calculator,
  Plus,
  Search,
  Star,
  Copy,
  Check,
  Edit2,
  Trash2,
  Share2,
  RotateCcw,
  Sparkles,
  Layers,
  TrendingUp,
  Activity,
  Binary,
  DollarSign,
  Zap,
  HelpCircle,
  X,
  Play,
  Sigma,
  PieChart,
} from 'lucide-react'
import type { Formula, FormulaPayload, FormulaVariable, FormulaFilters } from '../../types'
import {
  evaluateFormula,
  extractVariablesFromExpression,
  formatMathResult,
  parseVariableInput,
} from '../../utils/mathEngine'
import styles from './FormulasPanel.module.css'
import VisualFormulaCalculator, { CALC_ACTION_CATEGORIES } from './VisualFormulaCalculator'

interface FormulasPanelProps {
  formulas: Formula[]
  onSaveFormula: (payload: FormulaPayload, existingId?: number) => Promise<void>
  onDeleteFormula: (id: number) => Promise<void>
  onToggleFavorite: (id: number) => Promise<void>
  onRefresh: () => Promise<void>
}

export const FORMULA_CATEGORIES = [
  { id: 'all', label: 'Всі формули', icon: Layers },
  { id: 'machine-learning', label: '🤖 Машинне навчання (ML)', icon: Sparkles },
  { id: 'calculus', label: '📈 Матаналіз & Інтеграли', icon: TrendingUp },
  { id: 'linear-algebra', label: '🔢 Лінійна алгебра & Вектори', icon: Activity },
  { id: 'statistics', label: '📊 Статистика & Ймовірність', icon: PieChart },
  { id: 'algebra', label: '📐 Алгебра & Геометрія', icon: Sigma },
  { id: 'trigonometry', label: '📐 Тригонометрія', icon: RotateCcw },
  { id: 'finance', label: '💰 Фінансова математика', icon: DollarSign },
  { id: 'physics', label: '⚡ Фізичні формули', icon: Zap },
  { id: 'discrete-math', label: '🧩 Дискретна математика', icon: Binary },
  { id: 'favorites', label: '⭐ Тільки обрані', icon: Star },
]

export default function FormulasPanel({
  formulas,
  onSaveFormula,
  onDeleteFormula,
  onToggleFavorite,
  onRefresh: _onRefresh,
}: FormulasPanelProps) {
  const [activeView, setActiveView] = useState<'calculator' | 'vault'>('calculator')
  const [formulaForCalculator, setFormulaForCalculator] = useState<Formula | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')

  // Variable values for calculation
  const [variableValues, setVariableValues] = useState<Record<string, any>>({})
  const [precision, setPrecision] = useState(4)
  const [copiedType, setCopiedType] = useState<string | null>(null)

  // Plot range for 2D graphing
  const [plotRange, setPlotRange] = useState({ min: -5, max: 5, steps: 100 })

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)

  // Filter formulas
  const filteredFormulas = useMemo(() => {
    const q = search.trim().toLowerCase()
    return formulas.filter((f) => {
      const matchesSearch =
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.expression.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))

      const matchesCat =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'favorites'
          ? f.isFavorite
          : f.category === selectedCategory

      const matchesTag = selectedTag === 'all' || f.tags.includes(selectedTag)

      return matchesSearch && matchesCat && matchesTag
    })
  }, [formulas, search, selectedCategory, selectedTag])

  // Current selected formula
  const currentFormula = useMemo(() => {
    if (selectedId) {
      const found = formulas.find((f) => f.id === selectedId)
      if (found) return found
    }
    return filteredFormulas[0] || null
  }, [formulas, selectedId, filteredFormulas])

  // Sync variables state when selected formula changes
  useEffect(() => {
    if (currentFormula) {
      setSelectedId(currentFormula.id)
      const initialVals: Record<string, any> = {}
      if (currentFormula.variables && currentFormula.variables.length > 0) {
        currentFormula.variables.forEach((v) => {
          initialVals[v.name] = v.defaultValue
        })
      } else {
        // Auto-extract if no variables configured
        const extracted = extractVariablesFromExpression(currentFormula.expression)
        extracted.forEach((vName) => {
          initialVals[vName] = 1.0
        })
      }
      setVariableValues(initialVals)
    }
  }, [currentFormula?.id])

  // Evaluate current formula live
  const evalResult = useMemo(() => {
    if (!currentFormula) return null
    const hasX = Object.keys(variableValues).includes('x') || currentFormula.expression.includes('x')
    return evaluateFormula(currentFormula.expression, variableValues, {
      precision,
      rangeForPlot: hasX ? plotRange : undefined,
    })
  }, [currentFormula, variableValues, precision, plotRange])

  // Render KaTeX HTML safely
  const renderKatex = (latex: string, displayMode = true) => {
    try {
      return katex.renderToString(latex, { displayMode, throwOnError: false })
    } catch {
      return latex
    }
  }

  // Handle variable change
  const handleVarChange = (name: string, val: any) => {
    setVariableValues((prev) => ({
      ...prev,
      [name]: val,
    }))
  }

  // Copy to clipboard helper
  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    } catch {
      alert('Не вдалося скопіювати.')
    }
  }

  // Open modal for new formula
  const openNewModal = () => {
    setEditingFormula(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const openEditModal = (formula: Formula) => {
    setEditingFormula(formula)
    setIsModalOpen(true)
  }

  // Duplicate formula
  const handleDuplicate = async (formula: Formula) => {
    await onSaveFormula({
      title: `${formula.title} (Копія)`,
      category: formula.category,
      latex: formula.latex,
      expression: formula.expression,
      variables: formula.variables,
      description: formula.description,
      example: formula.example,
      tags: [...formula.tags, 'custom'],
      isFavorite: false,
    })
  }

  // All unique tags
  const allTags = useMemo(() => {
    return Array.from(new Set(formulas.flatMap((f) => f.tags))).sort()
  }, [formulas])

  return (
    <div className={styles.formulasPanel}>
      {/* Top Mode Selector Bar */}
      <div className={styles.modeSelectorBar}>
        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={`${styles.segmentBtn} ${activeView === 'calculator' ? styles.active : ''}`}
            onClick={() => setActiveView('calculator')}
          >
            <Calculator size={16} />
            <span>🧮 Графічний Калькулятор</span>
          </button>
          <button
            type="button"
            className={`${styles.segmentBtn} ${activeView === 'vault' ? styles.active : ''}`}
            onClick={() => setActiveView('vault')}
          >
            <Layers size={16} />
            <span>📚 Сховище формул ({formulas.length})</span>
          </button>
        </div>

        {activeView === 'vault' ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setFormulaForCalculator(null)
              setActiveView('calculator')
            }}
          >
            <Plus size={16} />
            <span>Створити у графічному калькуляторі</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.openInCalcBtn}
            onClick={() => setActiveView('vault')}
          >
            <Layers size={14} />
            <span>Переглянути базу формул ({formulas.length})</span>
          </button>
        )}
      </div>

      {activeView === 'calculator' ? (
        <VisualFormulaCalculator
          initialFormula={formulaForCalculator}
          onSaveToVault={async (payload) => {
            await onSaveFormula(payload)
            setActiveView('vault')
          }}
          onSwitchToVault={() => setActiveView('vault')}
        />
      ) : (
        <div className={styles.panelGrid}>
        {/* SIDEBAR: List of formulas */}
        <aside className={styles.sidebarPanel}>
          <div className="panel-header compact" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <p className="kicker" style={{ color: '#ff4fa3', fontWeight: 600 }}>Сховище формул</p>
              <h2 style={{ fontSize: '18px', margin: 0, color: '#fff' }}>Математичний хаб</h2>
            </div>
            <button className="icon-btn pink" type="button" onClick={openNewModal} title="Створити нову формулу">
              <Plus size={18} />
            </button>
          </div>

          {/* Search box */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, color: '#71717a' }} />
              <input
                type="text"
                placeholder="Пошук формул, виразів, тегів..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#71717a', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className={styles.categoryTabs}>
            {FORMULA_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const count =
                cat.id === 'all'
                  ? formulas.length
                  : cat.id === 'favorites'
                  ? formulas.filter((f) => f.isFavorite).length
                  : formulas.filter((f) => f.category === cat.id).length

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryTab} ${selectedCategory === cat.id ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Icon size={12} />
                  <span>{cat.label.replace(/^[^\s]+\s/, '')}</span>
                  <span className={styles.categoryCount}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Formula List */}
          <div className={styles.formulaList}>
            {filteredFormulas.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>
                Формул не знайдено. Спробуйте змінити фільтр або створіть нову!
              </div>
            ) : (
              filteredFormulas.map((f) => (
                <div
                  key={f.id}
                  className={`${styles.formulaCard} ${selectedId === f.id ? styles.active : ''}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.categoryBadge}>{f.category}</span>
                    <button
                      className={`${styles.starBtn} ${f.isFavorite ? styles.active : ''}`}
                      type="button"
                      title={f.isFavorite ? 'В обраних' : 'Додати в обрані'}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(f.id)
                      }}
                    >
                      <Star size={14} fill={f.isFavorite ? '#fbbf24' : 'none'} />
                    </button>
                  </div>
                  <div className={styles.cardTitle}>{f.title}</div>
                  {f.latex && (
                    <div
                      className={styles.cardLatexMini}
                      dangerouslySetInnerHTML={{ __html: renderKatex(f.latex, false) }}
                    />
                  )}
                  {f.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {f.tags.slice(0, 3).map((t) => (
                        <span key={t} style={{ fontSize: '10px', color: '#71717a' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* MAIN: Formula Detail, Calculator, Graph, and Theory */}
        <main className={styles.contentPanel}>
          {currentFormula ? (
            <>
              {/* Header */}
              <div className={styles.detailHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.titleRow}>
                    <span className={styles.categoryBadge}>{currentFormula.category}</span>
                    <button
                      className={`${styles.starBtn} ${currentFormula.isFavorite ? styles.active : ''}`}
                      type="button"
                      onClick={() => onToggleFavorite(currentFormula.id)}
                      title="Додати в обрані"
                    >
                      <Star size={18} fill={currentFormula.isFavorite ? '#fbbf24' : 'none'} />
                    </button>
                  </div>
                  <h1 className={styles.mainTitle}>{currentFormula.title}</h1>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    className={styles.openInCalcBtn}
                    type="button"
                    onClick={() => {
                      setFormulaForCalculator(currentFormula)
                      setActiveView('calculator')
                    }}
                    title="Відкрити та редагувати цю формулу в графічному калькуляторі"
                  >
                    <Calculator size={14} />
                    <span>Графічний калькулятор</span>
                  </button>
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleCopy(currentFormula.latex, 'latex')}
                    title="Скопіювати LaTeX формулу"
                  >
                    {copiedType === 'latex' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>LaTeX</span>
                  </button>
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleCopy(currentFormula.expression, 'expr')}
                    title="Скопіювати вираз для коду"
                  >
                    {copiedType === 'expr' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>Вираз</span>
                  </button>
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleDuplicate(currentFormula)}
                    title="Дублювати формулу"
                  >
                    <Layers size={14} />
                    <span>Дублювати</span>
                  </button>
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => openEditModal(currentFormula)}
                    title="Редагувати формулу"
                  >
                    <Edit2 size={14} />
                    <span>Редагувати</span>
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    type="button"
                    onClick={() => {
                      if (confirm(`Ви дійсно бажаєте видалити формулу "${currentFormula.title}"?`)) {
                        onDeleteFormula(currentFormula.id)
                      }
                    }}
                    title="Видалити формулу"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Detail Body */}
              <div className={styles.detailBody}>
                {/* 1. Large KaTeX Hero Banner */}
                <div className={styles.katexHeroCard}>
                  <div
                    className={styles.katexDisplay}
                    dangerouslySetInnerHTML={{ __html: renderKatex(currentFormula.latex, true) }}
                  />
                  <div className={styles.expressionCode}>
                    Код виразу: <code>{currentFormula.expression}</code>
                  </div>
                </div>

                {/* 2. Interactive Calculator Section */}
                <section className={styles.calculatorSection}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                      <Calculator size={18} color="#ff4fa3" />
                      <span>Параметри та інтерактивні обчислення</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>Точність:</span>
                      {[2, 4, 6, 8].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={styles.constPill}
                          style={{
                            background: precision === p ? 'rgba(255, 79, 163, 0.25)' : undefined,
                            borderColor: precision === p ? '#ff4fa3' : undefined,
                            color: precision === p ? '#fff' : undefined,
                          }}
                          onClick={() => setPrecision(p)}
                        >
                          {p} знаки
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variables Inputs Grid */}
                  <div className={styles.variablesGrid}>
                    {currentFormula.variables && currentFormula.variables.length > 0 ? (
                      currentFormula.variables.map((v) => {
                        const curVal = variableValues[v.name] ?? v.defaultValue
                        return (
                          <div key={v.name} className={styles.varCard}>
                            <div className={styles.varHeader}>
                              <span className={styles.varName}>{v.name}</span>
                              <span className={styles.varLabel}>{v.label || v.name}</span>
                            </div>

                            <div className={styles.varInputRow}>
                              <input
                                className={styles.varInput}
                                type={v.type === 'number' && typeof curVal === 'number' ? 'number' : 'text'}
                                step={v.step ?? 'any'}
                                value={typeof curVal === 'object' ? JSON.stringify(curVal) : curVal}
                                onChange={(e) => handleVarChange(v.name, parseVariableInput(e.target.value))}
                              />
                              {v.unit && <span className={styles.varUnit}>{v.unit}</span>}
                            </div>

                            {v.min !== undefined && v.max !== undefined && typeof curVal === 'number' && (
                              <input
                                className={styles.varSlider}
                                type="range"
                                min={v.min}
                                max={v.max}
                                step={v.step || (v.max - v.min) / 100}
                                value={curVal}
                                onChange={(e) => handleVarChange(v.name, Number(e.target.value))}
                              />
                            )}

                            {v.description && (
                              <div style={{ fontSize: '11px', color: '#71717a' }}>{v.description}</div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      // Fallback dynamic input if no explicit variables array
                      Object.keys(variableValues).map((varName) => (
                        <div key={varName} className={styles.varCard}>
                          <div className={styles.varHeader}>
                            <span className={styles.varName}>{varName}</span>
                            <span className={styles.varLabel}>Змінна</span>
                          </div>
                          <div className={styles.varInputRow}>
                            <input
                              className={styles.varInput}
                              type="text"
                              value={variableValues[varName] ?? ''}
                              onChange={(e) => handleVarChange(varName, parseVariableInput(e.target.value))}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Result Box */}
                  <div className={styles.resultBox}>
                    <div className={styles.resultTop}>
                      <span className={styles.resultLabel}>Результат обчислення</span>
                      <button
                        className={styles.constPill}
                        type="button"
                        onClick={() => handleCopy(evalResult?.formattedResult || '', 'res')}
                        title="Скопіювати результат"
                      >
                        {copiedType === 'res' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                        <span>Копіювати</span>
                      </button>
                    </div>

                    <div className={styles.resultMain}>
                      <span>{evalResult?.formattedResult || '0'}</span>
                      {evalResult?.fraction && (
                        <span className={styles.resultFraction}>
                          (≈ {evalResult.fraction})
                        </span>
                      )}
                    </div>

                    {evalResult?.error && (
                      <div style={{ color: '#f87171', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
                        ⚠️ {evalResult.error}
                      </div>
                    )}

                    {evalResult?.stepByStep && evalResult.stepByStep.length > 0 && (
                      <div className={styles.stepByStepList}>
                        {evalResult.stepByStep.map((s, idx) => (
                          <div key={idx}>{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. Interactive 2D Function Plot (if formula contains x) */}
                {evalResult?.plotData && evalResult.plotData.length > 1 && (
                  <section className={styles.plotCard}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionTitle}>
                        <TrendingUp size={16} color="#c084fc" />
                        <span>Графік функції f(x) у діапазоні</span>
                      </div>

                      <div className={styles.plotControls}>
                        <span>x min:</span>
                        <input
                          type="number"
                          value={plotRange.min}
                          onChange={(e) => setPlotRange((p) => ({ ...p, min: Number(e.target.value) }))}
                          style={{ width: 60, padding: '3px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 4 }}
                        />
                        <span>x max:</span>
                        <input
                          type="number"
                          value={plotRange.max}
                          onChange={(e) => setPlotRange((p) => ({ ...p, max: Number(e.target.value) }))}
                          style={{ width: 60, padding: '3px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 4 }}
                        />
                      </div>
                    </div>

                    <div className={styles.plotSvgContainer}>
                      <PlotSvg points={evalResult.plotData} minX={plotRange.min} maxX={plotRange.max} />
                    </div>
                  </section>
                )}

                {/* 4. Documentation & Mathematical Context */}
                {currentFormula.description && (
                  <div className={styles.descCard}>
                    <h3 style={{ fontSize: '15px', color: '#fff', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={16} color="#3b82f6" />
                      <span>Математичне обґрунтування та застосування</span>
                    </h3>
                    <p style={{ margin: 0 }}>{currentFormula.description}</p>
                    {currentFormula.example && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid #ff4fa3', fontSize: '12.5px' }}>
                        <strong>Приклад:</strong> {currentFormula.example}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#71717a' }}>
              <Calculator size={48} color="#ff4fa3" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h2 style={{ color: '#fff', fontSize: '18px' }}>Оберіть формулу зі списку</h2>
              <p style={{ fontSize: '13px', maxWidth: 400, margin: '8px auto' }}>
                Використовуйте готові формули зі сховища для розрахунків або створіть власну з будь-якими змінними та операціями.
              </p>
              <button className={styles.actionBtn} type="button" onClick={openNewModal} style={{ marginTop: 16 }}>
                <Plus size={16} />
                <span>Створити нову формулу</span>
              </button>
            </div>
          )}
        </main>
      </div>
    )}

      {/* CREATE / EDIT FORMULA MODAL */}
      {isModalOpen && (
        <FormulaEditorModal
          initialFormula={editingFormula}
          onClose={() => setIsModalOpen(false)}
          onSave={async (payload) => {
            await onSaveFormula(payload, editingFormula?.id)
            setIsModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ----------------- SVG 2D FUNCTION PLOT COMPONENT -----------------
function PlotSvg({ points, minX, maxX }: { points: { x: number; y: number }[]; minX: number; maxX: number }) {
  const width = 600
  const height = 200
  const padding = 30

  const minY = Math.min(...points.map((p) => p.y))
  const maxY = Math.max(...points.map((p) => p.y))

  const rangeY = maxY - minY || 1
  const rangeX = maxX - minX || 1

  const scaleX = (x: number) => padding + ((x - minX) / rangeX) * (width - 2 * padding)
  const scaleY = (y: number) => height - padding - ((y - minY) / rangeY) * (height - 2 * padding)

  const pathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(2)} ${scaleY(p.y).toFixed(2)}`)
    .join(' ')

  const zeroY = minY <= 0 && maxY >= 0 ? scaleY(0) : null
  const zeroX = minX <= 0 && maxX >= 0 ? scaleX(0) : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      {/* Grid lines */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#27272a" strokeWidth="1" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#27272a" strokeWidth="1" />

      {/* Zero lines */}
      {zeroY !== null && (
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />
      )}
      {zeroX !== null && (
        <line x1={zeroX} y1={padding} x2={zeroX} y2={height - padding} stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="3 3" />
      )}

      {/* Function curve */}
      <path d={pathD} fill="none" stroke="#ff4fa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Text labels */}
      <text x={padding} y={height - 8} fill="#71717a" fontSize="10">{minX}</text>
      <text x={width - padding - 15} y={height - 8} fill="#71717a" fontSize="10">{maxX}</text>
      <text x={padding + 4} y={padding + 10} fill="#71717a" fontSize="10">{maxY.toFixed(2)}</text>
      <text x={padding + 4} y={height - padding - 4} fill="#71717a" fontSize="10">{minY.toFixed(2)}</text>
    </svg>
  )
}

// ----------------- FORMULA EDITOR MODAL -----------------
interface FormulaEditorModalProps {
  initialFormula: Formula | null
  onClose: () => void
  onSave: (payload: FormulaPayload) => Promise<void>
}

function FormulaEditorModal({ initialFormula, onClose, onSave }: FormulaEditorModalProps) {
  const [title, setTitle] = useState(initialFormula?.title || '')
  const [category, setCategory] = useState(initialFormula?.category || 'algebra')
  const [latex, setLatex] = useState(initialFormula?.latex || '')
  const [expression, setExpression] = useState(initialFormula?.expression || '')
  const [description, setDescription] = useState(initialFormula?.description || '')
  const [example, setExample] = useState(initialFormula?.example || '')
  const [tagsText, setTagsText] = useState(initialFormula?.tags?.join(', ') || '')
  const [variables, setVariables] = useState<FormulaVariable[]>(initialFormula?.variables || [])
  const [editorCategory, setEditorCategory] = useState('basic')

  // Auto-detect variables from expression
  const autoDetectVariables = () => {
    const names = extractVariablesFromExpression(expression)
    const existingMap = new Map(variables.map((v) => [v.name, v]))
    const newVars: FormulaVariable[] = names.map((name) => {
      if (existingMap.has(name)) return existingMap.get(name)!
      return {
        name,
        label: `Змінна ${name}`,
        defaultValue: 1.0,
        type: 'number',
      }
    })
    setVariables(newVars)
  }

  // Insert math snippet into expression
  const insertExpressionSnippet = (snippet: string) => {
    setExpression((prev) => prev + snippet)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Будь ласка, введіть назву формули')
      return
    }
    if (!expression.trim()) {
      alert('Будь ласка, введіть математичний вираз для обчислень')
      return
    }

    const payload: FormulaPayload = {
      title: title.trim(),
      category,
      latex: latex.trim(),
      expression: expression.trim(),
      variables,
      description: description.trim(),
      example: example.trim(),
      tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      isFavorite: initialFormula?.isFavorite || false,
    }

    await onSave(payload)
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {initialFormula ? 'Редагування формули' : 'Створення нової математичної формули'}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Title & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Назва формули</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="наприклад, Формула Герона, Сигмоїда..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Категорія</label>
                <select
                  className={styles.formSelect}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="machine-learning">Машинне навчання (ML)</option>
                  <option value="calculus">Матаналіз</option>
                  <option value="linear-algebra">Лінійна алгебра</option>
                  <option value="statistics">Статистика & Ймовірність</option>
                  <option value="algebra">Алгебра & Геометрія</option>
                  <option value="trigonometry">Тригонометрія</option>
                  <option value="finance">Фінанси</option>
                  <option value="physics">Фізика</option>
                  <option value="discrete-math">Дискретна математика</option>
                </select>
              </div>
            </div>

            {/* LaTeX Formula with Live Preview */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>LaTeX представлення (KaTeX)</label>
              <input
                className={styles.formInput}
                type="text"
                placeholder="наприклад, f(x) = ax^2 + bx + c або \sigma(z) = \frac{1}{1 + e^{-z}}"
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
              />
              {latex && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px 14px',
                    borderRadius: 8,
                    textAlign: 'center',
                    marginTop: 6,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      try {
                        return katex.renderToString(latex, { displayMode: true, throwOnError: false })
                      } catch {
                        return latex
                      }
                    })(),
                  }}
                />
              )}
            </div>

            {/* Executable Expression & Math Keyboard */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>Математичний вираз для обчислень</label>
                <button
                  type="button"
                  onClick={autoDetectVariables}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4fa3',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  ⚡ Авто-визначити змінні
                </button>
              </div>

              <input
                className={styles.formInput}
                type="text"
                placeholder="наприклад, sqrt(a^2 + b^2) або sigmoid(z) або mse(y_true, y_pred)"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, Consolas, monospace' }}
                required
              />

              {/* Category selector for operations */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '8px 0', paddingBottom: 4 }}>
                {CALC_ACTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={styles.keyBtn}
                    onClick={() => setEditorCategory(cat.id)}
                    style={{
                      background: editorCategory === cat.id ? 'rgba(255, 79, 163, 0.25)' : undefined,
                      borderColor: editorCategory === cat.id ? '#ff4fa3' : undefined,
                      color: editorCategory === cat.id ? '#fff' : undefined,
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons for selected category */}
              <div className={styles.mathKeyboard} style={{ maxHeight: 130, overflowY: 'auto' }}>
                {CALC_ACTION_CATEGORIES.find((c) => c.id === editorCategory)?.actions.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    className={styles.keyBtn}
                    onClick={() => {
                      setLatex((prev) => (prev ? `${prev} + ${act.latexInsert}` : act.latexInsert))
                      setExpression((prev) => (prev ? `${prev} + ${act.engineInsert}` : act.engineInsert))
                    }}
                    title={act.desc}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          try {
                            return katex.renderToString(act.label, { throwOnError: false })
                          } catch {
                            return act.label
                          }
                        })(),
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Quick Variables & Operators Row */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#71717a', marginRight: 4 }}>Вставити:</span>
                {['x', 'y', 'z', 't', 'a', 'b', 'c', 'n'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={styles.keyBtn}
                    onClick={() => {
                      setLatex((prev) => prev + v)
                      setExpression((prev) => prev + v)
                    }}
                    style={{ fontStyle: 'italic', fontWeight: 700 }}
                  >
                    {v}
                  </button>
                ))}
                {['+', '-', '*', '/'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={styles.keyBtn}
                    onClick={() => {
                      const lOp = op === '*' ? ' \\cdot ' : op === '/' ? ' / ' : ` ${op} `
                      setLatex((prev) => prev + lOp)
                      setExpression((prev) => `${prev} ${op} `)
                    }}
                  >
                    {op === '*' ? '×' : op === '/' ? '÷' : op}
                  </button>
                ))}
              </div>
            </div>

            {/* Variables Configuration */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.formLabel}>Змінні параметри ({variables.length})</label>
                <button
                  type="button"
                  onClick={() =>
                    setVariables((prev) => [
                      ...prev,
                      { name: `v${prev.length + 1}`, label: 'Нова змінна', defaultValue: 1, type: 'number' },
                    ])
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#c084fc',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + Додати змінну вручну
                </button>
              </div>

              {variables.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {variables.map((v, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 100px 70px 30px',
                        gap: 8,
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <input
                        className={styles.formInput}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        value={v.name}
                        onChange={(e) => {
                          const val = e.target.value
                          setVariables((prev) => prev.map((x, i) => (i === idx ? { ...x, name: val } : x)))
                        }}
                        placeholder="Змінна"
                      />
                      <input
                        className={styles.formInput}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        value={v.label || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setVariables((prev) => prev.map((x, i) => (i === idx ? { ...x, label: val } : x)))
                        }}
                        placeholder="Опис / Назва"
                      />
                      <input
                        className={styles.formInput}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        value={v.defaultValue}
                        onChange={(e) => {
                          const val = e.target.value
                          setVariables((prev) => prev.map((x, i) => (i === idx ? { ...x, defaultValue: val } : x)))
                        }}
                        placeholder="Замовчування"
                      />
                      <input
                        className={styles.formInput}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        value={v.unit || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          setVariables((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: val } : x)))
                        }}
                        placeholder="Одиниця"
                      />
                      <button
                        type="button"
                        onClick={() => setVariables((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Tags */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Опис та математичний зміст</label>
              <textarea
                className={styles.formTextarea}
                rows={3}
                placeholder="Пояснення суті формули, коли використовується, властивості..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Приклад використання</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="наприклад, a = 3, b = 4 => c = 5"
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Теги (через кому)</label>
                <input
                  className={styles.formInput}
                  type="text"
                  placeholder="geometry, ml, math, calculus"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.actionBtn} type="button" onClick={onClose}>
              Скасувати
            </button>
            <button className={`${styles.actionBtn} ${styles.primary}`} type="submit">
              {initialFormula ? 'Зберегти зміни' : 'Створити формулу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
