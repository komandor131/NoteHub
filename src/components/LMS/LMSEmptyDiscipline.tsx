import React from 'react'
import { AlertCircle, ArrowLeft, Sparkles, Layers } from 'lucide-react'
import type { LMSDiscipline } from './lmsTypes'
import styles from './LMSPortal.module.css'

interface LMSEmptyDisciplineProps {
  discipline: LMSDiscipline
  onSwitchToMath: () => void
  onBackToCatalog: () => void
}

export const LMSEmptyDiscipline: React.FC<LMSEmptyDisciplineProps> = ({
  discipline,
  onSwitchToMath,
  onBackToCatalog,
}) => {
  return (
    <div className={styles.emptyDisciplineContainer}>
      <div className={styles.emptyDisciplineWrap}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyIconCircle}>
            <AlertCircle size={34} />
          </div>

          <h2 className={styles.emptyTitle}>Упс, сюди досі не додано матеріали</h2>

          <p className={styles.emptySubtitle}>
            Структура дисципліни <strong>«{discipline.title}»</strong> сформована згідно з навчальним планом, проте
            детальні лекційні конспекти та практичні завдання для неї ще перебувають на стадії підготовки.
          </p>

          <div className={styles.emptyStatsPill}>
            <Layers size={15} />
            <span>
              {discipline.modules.length} {discipline.modules.length === 1 ? 'модуль' : 'модулів'} • {discipline.totalTopics} {discipline.totalTopics === 1 ? 'тема' : 'тем'} завантажено з MindMap
            </span>
          </div>

          <div className={styles.emptyActionsRow}>
            <button type="button" className={styles.switchMathBtn} onClick={onSwitchToMath}>
              <Sparkles size={16} />
              Перейти до Математики (доступні матеріали)
            </button>
          </div>
        </div>

        {/* Syllabus breakdown of modules & topics derived from MindMap */}
        {discipline.modules.length > 0 && (
          <div>
            <h3 className={styles.syllabusTitle}>
              План тем дисципліни (синхронізовано з MindMap)
            </h3>
            <div className={styles.syllabusList}>
              {discipline.modules.map((module, mIdx) => (
                <div key={module.id} className={styles.syllabusModuleCard}>
                  <div className={styles.syllabusModuleTitle}>
                    {module.title || `Тема ${mIdx + 1}`}
                  </div>
                  <div className={styles.syllabusTopicsList}>
                    {module.topics.map((topic) => (
                      <span key={topic.id} className={styles.syllabusTopicBadge}>
                        {topic.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LMSEmptyDiscipline
