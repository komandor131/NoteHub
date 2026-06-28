import React, { useState, useEffect, type FormEvent } from 'react'
import { TrendingUp, DollarSign, FileText, Trash2, Wallet, Repeat, Plus } from 'lucide-react'
import type { FinanceGoal, Subscription, FinanceGoalPayload, SubscriptionPayload, FinancePanelProps } from '../../types'
import { formatShortDate } from '../../dateUtils'
import EmptyState from '../EmptyState/EmptyState'
import styles from './FinancePanel.module.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function FinancePanel({
  balance,
  goals,
  subscriptions,
  onChangeBalance,
  onAdjustBalance,
  onContribute,
  onWithdraw,
  onEditGoal,
  onDeleteGoal,
  onEditSub,
  onDeleteSub,
  onPaySub,
  onAddSub,
}: FinancePanelProps) {
  const [balanceEditOpen, setBalanceEditOpen] = useState(false)
  const [customBalanceInput, setCustomBalanceInput] = useState(String(balance))
  
  // Finance Sub-tab
  const [activeFinanceTab, setActiveFinanceTab] = useState<'goals' | 'calculators'>('goals')
  
  // Financial Calculator States
  const [monthlySavingsInput, setMonthlySavingsInput] = useState('3000')
  const [principalInput, setPrincipalInput] = useState('10000')
  const [monthlyAddInput, setMonthlyAddInput] = useState('2000')
  const [interestInput, setInterestInput] = useState('12')
  const [yearsInput, setYearsInput] = useState('5')

  // Target Cost Split Calculator States
  const [splitCostInput, setSplitCostInput] = useState('12000')
  const [splitMonthlyInput, setSplitMonthlyInput] = useState('1000')
  const [splitMonthsInput, setSplitMonthsInput] = useState('12')
  const [splitCalcMode, setSplitCalcMode] = useState<'time' | 'amount'>('time')

  useEffect(() => {
    setCustomBalanceInput(String(balance))
  }, [balance])

  const handleBalanceSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(customBalanceInput)
    if (isNaN(parsed)) {
      alert('Будь ласка, введіть коректну суму.')
      return
    }
    void onChangeBalance(parsed)
    setBalanceEditOpen(false)
  }

  return (
    <div className={`finance-wrapper ${styles.financePanel}`}>
      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-amount-display">
          <h3>Мій гаманець</h3>
          {balanceEditOpen ? (
            <form onSubmit={handleBalanceSubmit} className="row-actions" style={{ marginTop: '8px' }}>
              <input
                className="date-control"
                style={{ width: '160px', height: '36px' }}
                value={customBalanceInput}
                onChange={(e) => setCustomBalanceInput(e.target.value)}
                autoFocus
              />
              <button className="btn primary" type="submit" style={{ minHeight: '36px', padding: '0 12px' }}>
                Так
              </button>
              <button
                className="btn secondary"
                type="button"
                style={{ minHeight: '36px', padding: '0 12px' }}
                onClick={() => setBalanceEditOpen(false)}
              >
                Скасувати
              </button>
            </form>
          ) : (
            <div className="row-actions" style={{ gap: '14px' }}>
              <p className="balance-amount">{balance.toLocaleString('uk-UA')} ₴</p>
              <button
                className="btn secondary"
                style={{ minHeight: '28px', padding: '0 8px', fontSize: '12px' }}
                onClick={() => setBalanceEditOpen(true)}
              >
                Редагувати
              </button>
            </div>
          )}
          <p className="brand-subtitle" style={{ color: 'var(--muted)' }}>Поточний баланс грошей на даний момент</p>
        </div>

        <div className="balance-actions-block">
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Швидкі операції
          </span>
          <div className="balance-presets">
            <button className="balance-preset-btn" onClick={() => void onAdjustBalance(100)}>+100 ₴</button>
            <button className="balance-preset-btn" onClick={() => void onAdjustBalance(500)}>+500 ₴</button>
            <button className="balance-preset-btn" onClick={() => void onAdjustBalance(1000)}>+1 000 ₴</button>
            <button className="balance-preset-btn" onClick={() => void onAdjustBalance(-500)}>-500 ₴</button>
            <button className="balance-preset-btn" onClick={() => void onAdjustBalance(-1000)}>-1 000 ₴</button>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginTop: '24px', marginBottom: '16px' }}>
        <button
          className={`btn ${activeFinanceTab === 'goals' ? 'primary' : 'secondary'}`}
          type="button"
          onClick={() => setActiveFinanceTab('goals')}
        >
          🎯 Цілі та регулярні платежі
        </button>
        <button
          className={`btn ${activeFinanceTab === 'calculators' ? 'primary' : 'secondary'}`}
          type="button"
          onClick={() => setActiveFinanceTab('calculators')}
        >
          🧮 Фінансовий аналіз та калькулятори
        </button>
      </div>

      {activeFinanceTab === 'goals' && (
        <div className="workspace-grid" style={{ marginTop: '16px' }}>
          {/* Left Side: Savings Goals */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <TrendingUp size={18} className="pink" />
              Цілі заощаджень (Бажання)
            </h2>
            
            <div className="finance-goals-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {goals.map((goal) => {
                const photoAttachment = goal.attachments.find(
                  (a) => a.mimeType.startsWith('image/')
                )
                const percent = goal.target_amount > 0 ? Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100)) : 0

                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-img-container" style={{ height: '140px' }}>
                      {photoAttachment ? (
                        <img
                          className="goal-img"
                          src={`${API_BASE}/uploads/${encodeURIComponent(photoAttachment.storedName)}`}
                          alt={goal.title}
                        />
                      ) : (
                        <div className="goal-no-img">
                          <DollarSign size={24} />
                          <span>Немає фото</span>
                        </div>
                      )}
                    </div>

                    <div className="goal-info">
                      <h3>{goal.title}</h3>
                      <p className="goal-desc">{goal.description || 'Опис цілі відсутній.'}</p>
                    </div>

                    <div className="goal-progress-section">
                      <div className="goal-progress-labels">
                        <span className="saved">{goal.saved_amount.toLocaleString('uk-UA')} ₴</span>
                        <span className="target">{goal.target_amount.toLocaleString('uk-UA')} ₴ ({percent}%)</span>
                      </div>
                      <div className="goal-progress-track">
                        <div className="goal-progress-fill" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="goal-meta">
                      <span>{goal.target_date ? `До: ${formatShortDate(goal.target_date)}` : 'Термін не вказано'}</span>
                      <div className="row-actions" style={{ gap: '4px' }}>
                        <button className="icon-btn" style={{ width: '28px', height: '28px' }} type="button" onClick={() => onEditGoal(goal)}>
                          <FileText size={13} />
                        </button>
                        <button className="icon-btn danger" style={{ width: '28px', height: '28px' }} type="button" onClick={() => void onDeleteGoal(goal)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="goal-card-actions">
                      <button className="btn primary" style={{ flex: 1, minHeight: '30px' }} onClick={() => void onContribute(goal)}>
                        Внести накопичення
                      </button>
                      <button className="btn secondary" style={{ minHeight: '30px' }} onClick={() => void onWithdraw(goal)}>
                        Зняти
                      </button>
                    </div>
                  </article>
                )
              })}

              {!goals.length && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <EmptyState
                    icon={<Wallet size={20} />}
                    title="Немає цілей заощадження"
                    text="Створіть ціль, вкажіть суму, завантажте фото речі та відстежуйте свій прогрес."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Recurring Payments */}
          <aside className="panel" style={{ padding: '20px' }}>
            <div className="panel-header compact" style={{ padding: '0 0 12px', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Repeat size={16} className="pink" />
                Регулярні платежі
              </h2>
              <button className="icon-btn pink" style={{ width: '28px', height: '28px' }} onClick={onAddSub}>
                <Plus size={16} />
              </button>
            </div>

            <div className="subscriptions-list-container">
              {subscriptions.map((sub) => (
                <div className="subscription-row-card" key={sub.id}>
                  <div className="subscription-left">
                    <div className="subscription-icon-box" style={{ color: sub.color }}>
                      💸
                    </div>
                    <div className="subscription-details">
                      <h4>{sub.title}</h4>
                      <p>
                        {sub.period === 'weekly' ? 'Щотижня' : 'Щомісяця'} · {formatShortDate(sub.next_payment_date)}
                      </p>
                    </div>
                  </div>

                  <div className="subscription-right">
                    <div className="subscription-cost">{sub.amount} ₴</div>
                    <div className="row-actions" style={{ gap: '2px' }}>
                      <button
                        className="btn primary"
                        style={{ minHeight: '26px', padding: '0 8px', fontSize: '11px' }}
                        onClick={() => void onPaySub(sub)}
                      >
                        Сплатити
                      </button>
                      <button
                        className="icon-btn"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => onEditSub(sub)}
                      >
                        <FileText size={12} />
                      </button>
                      <button
                        className="icon-btn danger"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => void onDeleteSub(sub)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!subscriptions.length && (
                <EmptyState
                  icon={<Repeat size={18} />}
                  title="Немає підписок"
                  text="Додайте регулярні витрати (Netflix, оренду), щоб вони виводились на календар."
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {activeFinanceTab === 'calculators' && (
        <div className="finance-split-grid" style={{ marginTop: '16px' }}>
          {/* Left Column: Target Cost Splitter & Goal Forecast Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Target Cost Split Calculator */}
            <div className="financial-projection-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="pink" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                  Калькулятор планування цілі
                </h3>
              </div>
              
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                Швидко розбийте вартість великої покупки на частини, щоб зрозуміти, скільки потрібно відкладати або скільки часу це займе.
              </p>

              <div className="form-group">
                <label className="form-label">Вартість покупки / цілі (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={splitCostInput}
                  onChange={(e) => setSplitCostInput(e.target.value)}
                  placeholder="Наприклад: 12000"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', background: '#09090b', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className={`btn ${splitCalcMode === 'time' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, minHeight: '30px', fontSize: '11px', padding: '0 4px' }}
                  onClick={() => setSplitCalcMode('time')}
                >
                  📅 Розрахувати час
                </button>
                <button
                  type="button"
                  className={`btn ${splitCalcMode === 'amount' ? 'primary' : 'secondary'}`}
                  style={{ flex: 1, minHeight: '30px', fontSize: '11px', padding: '0 4px' }}
                  onClick={() => setSplitCalcMode('amount')}
                >
                  💰 Розрахувати суму
                </button>
              </div>

              {splitCalcMode === 'time' ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Щомісячний внесок (₴)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={splitMonthlyInput}
                      onChange={(e) => setSplitMonthlyInput(e.target.value)}
                      placeholder="Наприклад: 1000"
                    />
                  </div>
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Час накопичення</span>
                    <strong style={{ fontSize: '18px', color: 'var(--pink-strong)' }}>
                      {(() => {
                        const cost = parseFloat(splitCostInput) || 0
                        const monthly = parseFloat(splitMonthlyInput) || 1
                        const months = Math.ceil(cost / monthly)
                        return `${months} ${months === 1 ? 'місяць' : [2, 3, 4].includes(months % 10) && ![12, 13, 14].includes(months % 100) ? 'місяці' : 'місяців'}`
                      })()}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      ({((parseFloat(splitCostInput) || 0) / (parseFloat(splitMonthlyInput) || 1) / 12).toFixed(1)} р.)
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Бажаний термін (місяців)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={splitMonthsInput}
                      onChange={(e) => setSplitMonthsInput(e.target.value)}
                      placeholder="Наприклад: 12"
                    />
                  </div>
                  <div style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>Потрібно відкладати на місяць</span>
                    <strong style={{ fontSize: '18px', color: 'var(--pink-strong)' }}>
                      {(() => {
                        const cost = parseFloat(splitCostInput) || 0
                        const months = parseInt(splitMonthsInput) || 1
                        return Math.round(cost / months).toLocaleString('uk-UA')
                      })()} ₴
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                      ({Math.round((parseFloat(splitCostInput) || 0) / (parseInt(splitMonthsInput) || 1) / 4.3).toLocaleString('uk-UA')} ₴ на тиждень)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Goal Savings Timeline Estimator */}
            <div className="financial-projection-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <TrendingUp size={18} className="pink" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                  Прогнозатор досягнення цілей
                </h3>
              </div>
              
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
                Вкажіть вашу заплановану щомісячну суму заощадження. Система розрахує приблизний графік досягнення ваших активних цілей.
              </p>

              <div className="form-group">
                <label className="form-label">Щомісячне заощадження (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={monthlySavingsInput}
                  onChange={(e) => setMonthlySavingsInput(e.target.value)}
                  placeholder="Сума заощаджень"
                />
              </div>

              <div style={{ display: 'grid', gap: '10px', marginTop: '4px' }}>
                {(() => {
                  const monthlyRate = parseFloat(monthlySavingsInput) || 1
                  let accumulatedRemaining = 0
                  const uncompletedGoals = goals.filter((g) => g.saved_amount < g.target_amount)
                  
                  if (!uncompletedGoals.length) {
                    return (
                      <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '16px', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                        Усі ваші цілі вже досягнуто!
                      </p>
                    )
                  }

                  return uncompletedGoals.map((goal) => {
                    const remaining = goal.target_amount - goal.saved_amount
                    accumulatedRemaining += remaining
                    const months = accumulatedRemaining / monthlyRate
                    
                    const targetDate = new Date()
                    targetDate.setMonth(targetDate.getMonth() + Math.ceil(months))
                    const formattedDate = targetDate.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' })

                    return (
                      <div className="projection-timeline-item" key={goal.id}>
                        <div>
                          <div className="projection-timeline-title">{goal.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            Залишилось накопичити: {remaining.toLocaleString('uk-UA')} ₴
                          </div>
                        </div>
                        <div className="projection-timeline-time" title={`${Math.ceil(months)} міс.`}>
                          {formattedDate}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </div>

          {/* Right Column: Compound Interest Calculator */}
          <div className="financial-projection-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Wallet size={18} className="pink" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>
                Калькулятор складних відсотків
              </h3>
            </div>

            <div className="projection-input-group">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Початковий капітал (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Поповнення / міс. (₴)</label>
                <input
                  type="number"
                  className="form-control"
                  value={monthlyAddInput}
                  onChange={(e) => setMonthlyAddInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Річна ставка (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Період (років)</label>
                <input
                  type="number"
                  className="form-control"
                  value={yearsInput}
                  onChange={(e) => setYearsInput(e.target.value)}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            {(() => {
              const p = parseFloat(principalInput) || 0
              const pmt = parseFloat(monthlyAddInput) || 0
              const annualRate = parseFloat(interestInput) || 0
              const r = annualRate / 100 / 12
              const years = Math.min(10, Math.max(1, parseInt(yearsInput) || 1))

              const yearlyData: Array<{ year: number; principal: number; balance: number }> = []
              let currentBalance = p
              let currentPrincipal = p

              for (let y = 1; y <= years; y++) {
                for (let m = 0; m < 12; m++) {
                  currentBalance = currentBalance * (1 + r) + pmt
                  currentPrincipal += pmt
                }
                yearlyData.push({
                  year: y,
                  principal: Math.round(currentPrincipal),
                  balance: Math.round(currentBalance),
                })
              }

              const maxVal = yearlyData.length ? Math.max(...yearlyData.map((d) => d.balance)) : 1

              return (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div className="projection-bar-chart">
                    {yearlyData.map((data) => {
                      const prcHeight = (data.principal / maxVal) * 100
                      const balHeight = (data.balance / maxVal) * 100

                      return (
                        <div className="projection-bar-pair" key={data.year}>
                          <div className="projection-bar-pair-columns">
                            <div
                              className="projection-bar principal"
                              style={{ height: `${prcHeight}%` }}
                              data-value={`${data.principal.toLocaleString('uk-UA')} ₴`}
                            />
                            <div
                              className="projection-bar compound"
                              style={{ height: `${balHeight}%` }}
                              data-value={`${data.balance.toLocaleString('uk-UA')} ₴`}
                            />
                          </div>
                          <span className="projection-bar-label">{data.year} р.</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="projection-chart-legend">
                    <div className="projection-legend-item">
                      <div className="projection-legend-color principal" style={{ background: '#71717a' }} />
                      <span>Вкладений капітал</span>
                    </div>
                    <div className="projection-legend-item">
                      <div className="projection-legend-color compound" style={{ background: 'var(--pink)' }} />
                      <span>Баланс з відсотками</span>
                    </div>
                  </div>

                  {yearlyData.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: '#09090b', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Разом інвестовано</span>
                        <strong style={{ fontSize: '15px', color: '#ffffff' }}>
                          {yearlyData[yearlyData.length - 1].principal.toLocaleString('uk-UA')} ₴
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block', textTransform: 'uppercase' }}>Кінцева сума</span>
                        <strong style={{ fontSize: '15px', color: 'var(--pink-strong)' }}>
                          {yearlyData[yearlyData.length - 1].balance.toLocaleString('uk-UA')} ₴
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
