import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Monitor, Laptop, Check, ChevronsLeft, ChevronsRight, MoreHorizontal, Minus, BookOpen, Sparkles } from 'lucide-react'

interface Lesson {
  id: number
  title: string
  type: 'training' | 'lesson' | 'task' | 'quiz' | 'test' | 'project'
  content: string
  is_premium: boolean
}

interface Module {
  id: number
  title: string
  lessons: Lesson[]
}

interface ProgressEntry {
  userId: number
  lessonId: number
  completed: number
  updatedAt: string
}

interface StudyPanelProps {
  onExit: () => void
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function StudyPanel({ onExit }: StudyPanelProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const [expandedModules, setExpandedModules] = useState<number[]>([]) 
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch modules & progress
  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      fetch(`${API_BASE}/api/study/modules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json()),
      fetch(`${API_BASE}/api/study/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ])
      .then(([modulesData, progressData]: [Module[], ProgressEntry[]]) => {
        setModules(modulesData)
        setProgress(progressData || [])
        
        if (modulesData.length > 0) {
          setExpandedModules([modulesData[0].id])
          if (modulesData[0].lessons.length > 0) {
            setSelectedLesson(modulesData[0].lessons[0])
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const toggleModule = (id: number) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    )
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: prev[sectionKey] === false ? true : false
    }))
  }

  const isLessonCompleted = (lessonId: number) => {
    return progress.some(p => p.lessonId === lessonId && p.completed === 1)
  }

  // Handle marking progress and going to the next block
  const handleCompleteAndNext = async () => {
    if (!selectedLesson || actionLoading) return
    setActionLoading(true)

    const token = localStorage.getItem('token')
    try {
      // Mark current as completed
      await fetch(`${API_BASE}/api/study/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          completed: 1
        })
      })

      // Update local progress state
      setProgress(prev => {
        const exists = prev.some(p => p.lessonId === selectedLesson.id)
        if (exists) {
          return prev.map(p => p.lessonId === selectedLesson.id ? { ...p, completed: 1 } : p)
        } else {
          return [...prev, { userId: 0, lessonId: selectedLesson.id, completed: 1, updatedAt: new Date().toISOString() }]
        }
      })

      // Find next lesson
      const allLessons = modules.flatMap(m => m.lessons)
      const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id)
      
      if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
        const next = allLessons[currentIndex + 1]
        
        // Ensure the next module is expanded in the sidebar
        const nextModule = modules.find(m => m.lessons.some(l => l.id === next.id))
        if (nextModule && !expandedModules.includes(nextModule.id)) {
          setExpandedModules(prev => [...prev, nextModule.id])
        }

        setSelectedLesson(next)
      } else {
        alert('Поздоровляємо! Ви пройшли всю навчальну програму!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#1c1c1e] text-white">
      <div className="animate-pulse flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Loading NoteHub Study...
      </div>
    </div>
  )

  return (
    <div className="flex h-screen w-screen bg-[#1c1c1e] text-[#a1a1aa] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className={`flex flex-col bg-[#212124] border-r border-[#2c2c2e] transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-[320px]'}`}>
        
        {/* Brand Header */}
        {!isCollapsed ? (
          <div className="p-4 border-b border-[#2c2c2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/FAVICONNOTE.png" className="w-8 h-8 rounded-lg object-contain" alt="Study Logo" />
              <span className="font-bold text-white text-base">NoteHub Study</span>
            </div>
            <button 
              onClick={onExit}
              className="text-xs px-2.5 py-1 rounded bg-[#2c2c2e] hover:bg-[#3e3e42] text-gray-300 hover:text-white border border-[#3e3e42] transition-colors"
            >
              Вийти
            </button>
          </div>
        ) : (
          <div className="p-3 border-b border-[#2c2c2e] flex justify-center">
            <button onClick={onExit} title="Вийти в NoteHub Pro">
              <img src="/FAVICONNOTE.png" className="w-8 h-8 rounded-lg object-contain" alt="Exit" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
          <div className="space-y-1">
            {modules.map((mod) => {
              const isExpanded = expandedModules.includes(mod.id);
              
              // Filter out lessons by type
              const trainings = mod.lessons.filter(l => l.type === 'training' || l.type === 'quiz');
              const otherLessons = mod.lessons.filter(l => l.type !== 'training' && l.type !== 'quiz');

              // Determine module status
              // Green if all lessons in the module are completed.
              // Yellow if some lessons are completed or if the active lesson is in this module (and it's not fully completed).
              // Gray if 0 are completed.
              const totalLessons = mod.lessons.length;
              const completedLessons = mod.lessons.filter(l => isLessonCompleted(l.id)).length;
              const isActiveInModule = mod.lessons.some(l => l.id === selectedLesson?.id);

              let statusColor = "text-gray-500"; // Default gray
              if (totalLessons > 0) {
                if (completedLessons === totalLessons) {
                  statusColor = "text-emerald-500"; // Completed (green)
                } else if (completedLessons > 0 || isActiveInModule) {
                  statusColor = "text-yellow-500"; // In progress (yellow)
                }
              }

              return (
                <div key={mod.id} className="mb-2">
                  <button 
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false);
                      toggleModule(mod.id);
                    }} 
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#2c2c2e] transition-colors ${isExpanded ? 'bg-[#2c2c2e]/50' : ''}`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <CheckCircle2 size={18} className={`shrink-0 ${statusColor}`} />
                      {!isCollapsed && (
                        <span className={`font-medium text-sm truncate ${isExpanded ? 'text-blue-400' : 'text-gray-300'}`}>
                          {mod.title}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="text-gray-500 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    )}
                  </button>

                  {isExpanded && !isCollapsed && (
                    <div className="ml-5 pl-4 border-l border-[#3a3a3c] mt-2 mb-4 space-y-3">
                      
                      {/* Collapsible Training group */}
                      {trainings.length > 0 && (() => {
                        const sectionKey = `${mod.id}-training`;
                        const isSecExpanded = expandedSections[sectionKey] !== false;
                        return (
                          <div>
                            <button 
                              onClick={() => toggleSection(sectionKey)} 
                              className="w-full flex items-center justify-between text-[13px] font-semibold text-gray-400 mb-1.5 hover:text-gray-200 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <MoreHorizontal size={14} />
                                Training
                              </div>
                              <Minus size={14} className={isSecExpanded ? 'opacity-100' : 'opacity-40'} />
                            </button>
                            {isSecExpanded && (
                              <div className="space-y-0.5">
                                {trainings.map(lesson => {
                                  const isSelected = selectedLesson?.id === lesson.id;
                                  const completed = isLessonCompleted(lesson.id);
                                  return (
                                    <button 
                                      key={lesson.id}
                                      onClick={() => setSelectedLesson(lesson)}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all ${isSelected ? 'bg-[#323236] text-white shadow-sm' : 'text-[#8e8e93] hover:text-gray-200 hover:bg-[#2c2c2e]'}`}
                                    >
                                      <Check size={14} className={`shrink-0 ${completed ? "text-emerald-500" : "text-gray-600"}`} />
                                      <span className="text-left leading-tight pr-2 truncate">{lesson.title}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Other lessons (lesson, task, project, test, etc.) listed at the root of the module */}
                      {otherLessons.map(lesson => {
                        const isSelected = selectedLesson?.id === lesson.id;
                        const completed = isLessonCompleted(lesson.id);
                        
                        // Select icon based on type
                        let IconComponent = Monitor;
                        let iconColor = "text-blue-400";
                        if (lesson.type === 'task' || lesson.type === 'test') {
                          IconComponent = Laptop;
                          iconColor = "text-orange-400";
                        }

                        return (
                          <button 
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all ${isSelected ? 'bg-[#323236] text-white shadow-sm' : 'text-[#8e8e93] hover:text-gray-200 hover:bg-[#2c2c2e]'}`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <IconComponent size={14} className={`shrink-0 ${iconColor}`} />
                              <span className="text-left leading-tight truncate">{lesson.title}</span>
                            </div>
                            <Check size={12} className={`shrink-0 ml-2 ${completed ? "text-emerald-500" : "text-gray-600 opacity-0"}`} />
                          </button>
                        )
                      })}

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-4 border-t border-[#2c2c2e] flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[#2c2c2e] transition-colors"
        >
          {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!isCollapsed && <span className="text-sm font-medium">Collapse menu</span>}
        </button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto bg-[#1c1c1e] relative">
        {selectedLesson ? (
          <div className="max-w-4xl mx-auto px-8 py-12 lg:px-16 lg:py-16">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-10 tracking-tight">
              {selectedLesson.title}
            </h1>
            
            <div 
              className="prose prose-invert prose-lg max-w-none prose-p:text-[#b4b4bb] prose-p:leading-relaxed prose-headings:text-white prose-headings:font-bold prose-h2:mt-12 prose-h2:mb-6 prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-strong:text-gray-200"
              dangerouslySetInnerHTML={{ __html: selectedLesson.content }} 
            />

            {/* Complete & Proceed Action Button */}
            <div className="mt-16 pt-8 border-t border-[#2c2c2e] flex justify-end">
              <button
                onClick={handleCompleteAndNext}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 disabled:opacity-50 font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95"
              >
                <Sparkles size={16} className="text-yellow-600 animate-pulse" />
                <span>
                  {isLessonCompleted(selectedLesson.id) ? 'Наступний блок →' : 'Приступити до наступного блоку ✓'}
                </span>
              </button>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
              .prose p { margin-bottom: 1.5em; font-size: 16px; }
              .prose h2 { font-size: 24px; }
              .prose h3 { font-size: 20px; margin-top: 2em; margin-bottom: 1em; }
              .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em; color: #b4b4bb; }
              .prose li { margin-bottom: 0.5em; }
            `}} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p>Select a lesson from the sidebar to begin</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3a3a3c;
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #4a4a4c;
        }
      `}} />
    </div>
  )
}
