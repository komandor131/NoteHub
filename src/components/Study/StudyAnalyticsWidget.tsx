import React, { useState, useEffect } from 'react'
import {
  Flame,
  Zap,
  Award,
  BookOpen,
  Layers,
  CheckCircle2,
  Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react'

interface ActivityRecord {
  date: string
  xp: number
  topicsCompleted: number
  cardsReviewed: number
  quizzesPassed: number
}

interface ActivityStats {
  records: ActivityRecord[]
  totalXp: number
  level: number
  levelProgress: number
  nextLevelXp: number
  streak: number
  totalTopics: number
  totalCards: number
  totalQuizzes: number
}

interface StudyAnalyticsWidgetProps {
  compact?: boolean
  onOpenFlashcards?: () => void
  onOpenQuizzes?: () => void
}

export default function StudyAnalyticsWidget({
  compact = false,
  onOpenFlashcards,
  onOpenQuizzes
}: StudyAnalyticsWidgetProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/study/activity', { headers })
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data && Array.isArray(data.records)) {
        setStats(data)
      }
    } catch (e) {
      console.error('Failed to load study activity stats:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStats()
  }, [])

  if (loading || !stats || !Array.isArray(stats.records)) {
    return null
  }

  // Generate 52 weeks of dates for the Heatmap
  const today = new Date()
  const yearDays: { dateStr: string; activity?: ActivityRecord }[] = []
  const safeRecords = Array.isArray(stats.records) ? stats.records : []
  const recordMap = new Map(safeRecords.map((r) => [r.date, r]))

  for (let i = 119; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    const dStr = d.toISOString().slice(0, 10)
    yearDays.push({
      dateStr: dStr,
      activity: recordMap.get(dStr)
    })
  }

  const getHeatmapColor = (xp?: number) => {
    if (!xp || xp === 0) return 'rgba(255, 255, 255, 0.04)'
    if (xp < 25) return 'rgba(255, 79, 163, 0.35)'
    if (xp < 60) return 'rgba(255, 79, 163, 0.6)'
    return 'var(--pink)'
  }

  const levelNames = [
    'Новачок в аналітиці',
    'Дослідник даних',
    'Практик математики',
    'ML Інженер початківець',
    'AI Спеціаліст',
    'MilTech Експерт',
    'Майстер системного аналізу'
  ]
  const currentLevelTitle = levelNames[Math.min(stats.level - 1, levelNames.length - 1)]

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 600 }}>
          <Flame size={15} />
          <span>{stats.streak} {stats.streak === 1 ? 'день' : stats.streak > 1 && stats.streak < 5 ? 'дні' : 'днів'} стрік</span>
        </div>
        <div style={{ width: '1px', height: '14px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--pink)', fontWeight: 600 }}>
          <Zap size={14} />
          <span>{stats.totalXp} XP (Рівень {stats.level})</span>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0c0c0f',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        marginBottom: '20px'
      }}
    >
      {/* Top row: Level, Streak, Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(255, 79, 163, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(255, 79, 163, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pink)'
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                Рівень {stats.level}: {currentLevelTitle}
              </h3>
              <span
                style={{
                  background: 'rgba(255, 79, 163, 0.12)',
                  color: 'var(--pink)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                {stats.totalXp} XP
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <div
                style={{
                  width: '180px',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${stats.levelProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--pink), #a855f7)',
                    borderRadius: '3px'
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {stats.levelProgress}% до Рівня {stats.level + 1}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: '#f59e0b'
            }}
          >
            <Flame size={18} />
            <div>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>
                {stats.streak} {stats.streak === 1 ? 'день' : 'днів'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Стрік навчання</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#60a5fa'
            }}
          >
            <Layers size={18} />
            <div>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>
                {stats.totalCards}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Карток повторено</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#34d399'
            }}
          >
            <CheckCircle2 size={18} />
            <div>
              <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>
                {stats.totalQuizzes}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Тестів складено</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CalendarIcon size={13} /> Активність за останні 4 місяці (120 днів)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--muted)' }}>
            <span>Менше</span>
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.04)' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'rgba(255, 79, 163, 0.35)' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'rgba(255, 79, 163, 0.6)' }} />
            <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'var(--pink)' }} />
            <span>Більше</span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 1fr)',
            gridAutoFlow: 'column',
            gap: '4px',
            overflowX: 'auto',
            paddingBottom: '4px'
          }}
        >
          {yearDays.map((day, idx) => (
            <div
              key={idx}
              title={`${day.dateStr}: ${day.activity?.xp || 0} XP`}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2.5px',
                background: getHeatmapColor(day.activity?.xp),
                transition: 'transform 0.1s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
