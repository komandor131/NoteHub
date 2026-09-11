const fs = require('fs');

const dbFile = 'server/database.ts';
let dbContent = fs.readFileSync(dbFile, 'utf8');

// 1. Add schema creation to database.ts
const schemaAnchor = 'CREATE TABLE IF NOT EXISTS study_time (';
const newTablesSchema = `
    CREATE TABLE IF NOT EXISTS study_flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      roadmapId INTEGER,
      nodeId TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      mastery INTEGER DEFAULT 0,
      nextReviewDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      roadmapId INTEGER,
      nodeId TEXT,
      question TEXT NOT NULL,
      optionsJson TEXT NOT NULL,
      correctIndex INTEGER NOT NULL,
      explanation TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      date TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      topicsCompleted INTEGER DEFAULT 0,
      cardsReviewed INTEGER DEFAULT 0,
      quizzesPassed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_node_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerId INTEGER,
      nodeId TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL
    );
`;

if (!dbContent.includes('study_flashcards')) {
  dbContent = dbContent.replace(schemaAnchor, newTablesSchema + '\n    ' + schemaAnchor);
}

// 2. Add functions to the bottom of server/database.ts
const newDatabaseFunctions = `
// ==========================================
// Interactive Study & Flashcards & Quizzes
// ==========================================

export interface StudyFlashcardRecord {
  id: number
  ownerId: number
  roadmapId: number | null
  nodeId: string | null
  question: string
  answer: string
  mastery: number
  nextReviewDate: string | null
  createdAt: string
  updatedAt: string
}

export interface StudyQuizRecord {
  id: number
  ownerId: number
  roadmapId: number | null
  nodeId: string | null
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  createdAt: string
}

export interface StudyActivityRecord {
  date: string
  xp: number
  topicsCompleted: number
  cardsReviewed: number
  quizzesPassed: number
}

export function getNodeNotes(userId: number, nodeId: string): string | null {
  const row = one<{ notes: string }>(
    'SELECT notes FROM study_node_notes WHERE ownerId = ? AND nodeId = ?',
    [userId, nodeId],
    (r) => ({ notes: textValue(r.notes) })
  )
  return row ? row.notes : null
}

export function saveNodeNotes(userId: number, nodeId: string, notes: string): void {
  const now = new Date().toISOString()
  const existing = one<{ id: number }>(
    'SELECT id FROM study_node_notes WHERE ownerId = ? AND nodeId = ?',
    [userId, nodeId],
    (r) => ({ id: numberValue(r.id) })
  )
  if (existing) {
    run('UPDATE study_node_notes SET notes = ?, updatedAt = ? WHERE id = ?', [notes, now, existing.id])
  } else {
    run('INSERT INTO study_node_notes (ownerId, nodeId, notes, updatedAt) VALUES (?, ?, ?, ?)', [
      userId,
      nodeId,
      notes,
      now
    ])
  }
  logStudyActivity(userId, 'note_edit', 10)
  persist()
}

export function listFlashcards(userId: number, roadmapId?: number, nodeId?: string): StudyFlashcardRecord[] {
  let query = 'SELECT * FROM study_flashcards WHERE (ownerId = ? OR ownerId IS NULL)'
  const params: any[] = [userId]
  if (nodeId) {
    query += ' AND nodeId = ?'
    params.push(nodeId)
  } else if (roadmapId) {
    query += ' AND (roadmapId = ? OR nodeId LIKE ?)'
    params.push(roadmapId, \`math_%\`)
  }
  query += ' ORDER BY id DESC'
  return all(query, params, (row) => ({
    id: numberValue(row.id),
    ownerId: numberValue(row.ownerId),
    roadmapId: row.roadmapId ? numberValue(row.roadmapId) : null,
    nodeId: row.nodeId ? textValue(row.nodeId) : null,
    question: textValue(row.question),
    answer: textValue(row.answer),
    mastery: numberValue(row.mastery),
    nextReviewDate: row.nextReviewDate ? textValue(row.nextReviewDate) : null,
    createdAt: textValue(row.createdAt),
    updatedAt: textValue(row.updatedAt)
  }))
}

export function createFlashcard(
  userId: number,
  input: { roadmapId?: number; nodeId?: string; question: string; answer: string }
): StudyFlashcardRecord {
  const now = new Date().toISOString()
  run(
    'INSERT INTO study_flashcards (ownerId, roadmapId, nodeId, question, answer, mastery, nextReviewDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    [userId, input.roadmapId || null, input.nodeId || null, input.question, input.answer, now, now, now]
  )
  const id = lastInsertId()
  logStudyActivity(userId, 'flashcard_create', 15)
  persist()
  const list = listFlashcards(userId)
  return list.find((c) => c.id === id)!
}

export function reviewFlashcard(userId: number, id: number, rating: 'easy' | 'good' | 'hard'): void {
  const card = one<{ mastery: number }>('SELECT mastery FROM study_flashcards WHERE id = ?', [id], (r) => ({
    mastery: numberValue(r.mastery)
  }))
  let mastery = card ? card.mastery : 0
  let daysToAdd = 1
  let xp = 10

  if (rating === 'easy') {
    mastery = Math.min(5, mastery + 1)
    daysToAdd = mastery * 3 + 2
    xp = 15
  } else if (rating === 'good') {
    mastery = Math.min(5, mastery + 1)
    daysToAdd = Math.max(1, mastery * 2)
    xp = 10
  } else {
    mastery = Math.max(0, mastery - 1)
    daysToAdd = 1
    xp = 5
  }

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  const nextDateStr = nextDate.toISOString()

  run('UPDATE study_flashcards SET mastery = ?, nextReviewDate = ?, updatedAt = ? WHERE id = ?', [
    mastery,
    nextDateStr,
    new Date().toISOString(),
    id
  ])
  logStudyActivity(userId, 'flashcard_review', xp)
  persist()
}

export function deleteFlashcard(userId: number, id: number): void {
  run('DELETE FROM study_flashcards WHERE id = ? AND (ownerId = ? OR ownerId IS NULL)', [id, userId])
  persist()
}

export function listQuizzes(userId: number, nodeId?: string): StudyQuizRecord[] {
  let query = 'SELECT * FROM study_quizzes WHERE (ownerId = ? OR ownerId IS NULL)'
  const params: any[] = [userId]
  if (nodeId) {
    query += ' AND nodeId = ?'
    params.push(nodeId)
  }
  return all(query, params, (row) => {
    let options: string[] = []
    try {
      options = JSON.parse(textValue(row.optionsJson))
    } catch {
      options = []
    }
    return {
      id: numberValue(row.id),
      ownerId: numberValue(row.ownerId),
      roadmapId: row.roadmapId ? numberValue(row.roadmapId) : null,
      nodeId: row.nodeId ? textValue(row.nodeId) : null,
      question: textValue(row.question),
      options,
      correctIndex: numberValue(row.correctIndex),
      explanation: textValue(row.explanation),
      createdAt: textValue(row.createdAt)
    }
  })
}

export function logStudyActivity(
  userId: number,
  type: 'node_complete' | 'flashcard_review' | 'flashcard_create' | 'quiz_pass' | 'note_edit',
  xpAmount: number = 10
): void {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const existing = one<{ id: number; xp: number; topicsCompleted: number; cardsReviewed: number; quizzesPassed: number }>(
    'SELECT id, xp, topicsCompleted, cardsReviewed, quizzesPassed FROM study_activity WHERE ownerId = ? AND date = ?',
    [userId, today],
    (r) => ({
      id: numberValue(r.id),
      xp: numberValue(r.xp),
      topicsCompleted: numberValue(r.topicsCompleted),
      cardsReviewed: numberValue(r.cardsReviewed),
      quizzesPassed: numberValue(r.quizzesPassed)
    })
  )

  let topicInc = type === 'node_complete' ? 1 : 0
  let cardInc = type === 'flashcard_review' ? 1 : 0
  let quizInc = type === 'quiz_pass' ? 1 : 0

  if (existing) {
    run(
      'UPDATE study_activity SET xp = xp + ?, topicsCompleted = topicsCompleted + ?, cardsReviewed = cardsReviewed + ?, quizzesPassed = quizzesPassed + ? WHERE id = ?',
      [xpAmount, topicInc, cardInc, quizInc, existing.id]
    )
  } else {
    run(
      'INSERT INTO study_activity (ownerId, date, xp, topicsCompleted, cardsReviewed, quizzesPassed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, today, xpAmount, topicInc, cardInc, quizInc, now]
    )
  }
}

export function getStudyActivityStats(userId: number) {
  const records = all(
    'SELECT date, xp, topicsCompleted, cardsReviewed, quizzesPassed FROM study_activity WHERE ownerId = ? ORDER BY date ASC',
    [userId],
    (r) => ({
      date: textValue(r.date),
      xp: numberValue(r.xp),
      topicsCompleted: numberValue(r.topicsCompleted),
      cardsReviewed: numberValue(r.cardsReviewed),
      quizzesPassed: numberValue(r.quizzesPassed)
    })
  )

  const totalXp = records.reduce((sum, r) => sum + r.xp, 0)
  const totalTopics = records.reduce((sum, r) => sum + r.topicsCompleted, 0)
  const totalCards = records.reduce((sum, r) => sum + r.cardsReviewed, 0)
  const totalQuizzes = records.reduce((sum, r) => sum + r.quizzesPassed, 0)

  // Calculate streak
  const dates = new Set(records.filter((r) => r.xp > 0).map((r) => r.date))
  let streak = 0
  let check = new Date()
  const todayStr = check.toISOString().slice(0, 10)

  // If not studied today, check if studied yesterday to keep streak
  if (!dates.has(todayStr)) {
    check.setDate(check.getDate() - 1)
  }

  while (true) {
    const dStr = check.toISOString().slice(0, 10)
    if (dates.has(dStr)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate level: Level 1 = 0-100 XP, Level 2 = 100-300, etc.
  // Formula: level = Math.floor(Math.sqrt(totalXp / 50)) + 1
  const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 60)) + 1)
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 60
  const nextLevelXp = Math.pow(level, 2) * 60
  const levelProgress = Math.min(100, Math.round(((totalXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp || 1)) * 100))

  return {
    records,
    totalXp,
    level,
    levelProgress,
    nextLevelXp,
    streak,
    totalTopics,
    totalCards,
    totalQuizzes
  }
}

export function seedDefaultStudyContent(adminUserId: number) {
  const cardCount = one<{ count: number }>('SELECT COUNT(*) as count FROM study_flashcards', [], (r) => ({
    count: numberValue(r.count)
  }))

  if (!cardCount || cardCount.count === 0) {
    const now = new Date().toISOString()
    const defaultCards = [
      {
        nodeId: 'math_1_1',
        question: 'Як обчислюється середнє арифметичне для вибірки $\{x_1, x_2, \\dots, x_n\}$?',
        answer: '$$\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i$$\\\\Сума всіх спостережень, поділена на загальну кількість елементів у вибірці.'
      },
      {
        nodeId: 'math_1_1',
        question: 'У чому полягає різниця між середнім арифметичним та середнім геометричним?',
        answer: 'Середнє геометричне обчислюється як корінь $n$-го степеня з добутку елементів:$$\\bar{x}_{geom} = \\sqrt[n]{x_1 \\cdot x_2 \\cdot \\dots \\cdot x_n}$$Воно використовується для мультиплікативних процесів (темпи зростання, індекси).'
      },
      {
        nodeId: 'math_1_2',
        question: 'Що таке медіана і чому вона стійка (робастна) до викидів?',
        answer: 'Медіана ($Me$) — це значення, що ділить впорядкований ряд даних на дві рівні частини (50% зліва, 50% справа). Вона не залежить від екстремально великих чи малих значень у хвостах вибірки.'
      },
      {
        nodeId: 'math_1_3',
        question: 'Яка формула вибіркової дисперсії ($S^2$) і чому використовують $(n-1)$?',
        answer: '$$S^2 = \\frac{1}{n - 1} \\sum_{i=1}^{n} (x_i - \\bar{x})^2$$\\\\Ділення на $(n-1)$ (поправка Бесселя) усуває статистичне зміщення при оцінці дисперсії генеральної сукупності за малою вибіркою.'
      },
      {
        nodeId: 'math_1_4',
        question: 'Як визначаються межі викидів за правилом Тьюкі (IQR)?',
        answer: 'Інтерквартильний розмах: $IQR = Q_3 - Q_1$.\\\\Нижня межа: $Q_1 - 1.5 \\times IQR$\\\\Верхня межа: $Q_3 + 1.5 \\times IQR$.\\\\Усе за цими межами вважається викидом.'
      },
      {
        nodeId: 'math_2_7',
        question: 'Напишіть формулу теореми Байєса та поясніть її складові.',
        answer: '$$P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}$$\\\\* $P(A|B)$ — апостеріорна ймовірність\\\\* $P(A)$ — апріорна ймовірність\\\\* $P(B|A)$ — правдоподібність (Likelihood)\\\\* $P(B)$ — повна ймовірність події $B$.'
      },
      {
        nodeId: 'math_5_7',
        question: 'Чим відрізняється норма $L_1$ від норми $L_2$ для вектора $\\vec{v} = (v_1, \\dots, v_n)$?',
        answer: '* $L_1$ (Манхеттенська): $\\|v\\|_1 = \\sum_{i=1}^n |v_i|$\\\\* $L_2$ (Евклідова): $\\|v\\|_2 = \\sqrt{\\sum_{i=1}^n v_i^2}$\\\\$L_1$ сприяє розрідженості ознак (Lasso), а $L_2$ обмежує великі ваги (Ridge).'
      }
    ]

    defaultCards.forEach((c) => {
      run(
        'INSERT INTO study_flashcards (ownerId, roadmapId, nodeId, question, answer, mastery, nextReviewDate, createdAt, updatedAt) VALUES (?, 1, ?, ?, ?, 0, ?, ?, ?)',
        [adminUserId, c.nodeId, c.question, c.answer, now, now, now]
      )
    })
  }

  const quizCount = one<{ count: number }>('SELECT COUNT(*) as count FROM study_quizzes', [], (r) => ({
    count: numberValue(r.count)
  }))

  if (!quizCount || quizCount.count === 0) {
    const now = new Date().toISOString()
    const defaultQuizzes = [
      {
        nodeId: 'math_1_1',
        question: 'Яка з наведених метрик найбільш чутлива до появи поодиноких екстремальних викидів у вибірці?',
        options: ['Медіана', 'Мода', 'Середнє арифметичне', 'Інтерквартильний розмах (IQR)'],
        correctIndex: 2,
        explanation: 'Середнє арифметичне включає кожне значення безпосередньо у суму, тому навіть один гігантський викид суттєво зміщує його вгору.'
      },
      {
        nodeId: 'math_1_3',
        question: 'Якщо дисперсія вибірки дорівнює 16, чому дорівнює стандартне відхилення (σ)?',
        options: ['256', '4', '8', '32'],
        correctIndex: 1,
        explanation: 'Стандартне відхилення є квадратним коренем з дисперсії: $\\sigma = \\sqrt{16} = 4$.'
      },
      {
        nodeId: 'math_1_4',
        question: 'За правилом Тьюкі спостереження вважається викидом, якщо воно лежить за межами інтервалу:',
        options: ['[Mean - σ, Mean + σ]', '[Q1 - 1.5×IQR, Q3 + 1.5×IQR]', '[Min, Max]', '[Q1 - 3×IQR, Q3 + 3×IQR]'],
        correctIndex: 1,
        explanation: 'Класичне правило Тьюкі визначає межі вусів ящика з вусами як $Q_1 - 1.5 \\times IQR$ та $Q_3 + 1.5 \\times IQR$.'
      },
      {
        nodeId: 'math_2_7',
        question: 'Що визначає апостеріорну ймовірність P(A|B) у формулі Байєса?',
        options: [
          'Ймовірність події A до отримання нових свідчень B',
          'Ймовірність події A після врахування нового свідчення B',
          'Ймовірність того, що події A та B ніколи не відбудуться',
          'Частку помилок I роду в експерименті'
        ],
        correctIndex: 1,
        explanation: 'Апостеріорна ймовірність $P(A|B)$ — це оновлена оцінка ймовірності гіпотези $A$ з урахуванням того, що спостереження $B$ уже відбулося.'
      }
    ]

    defaultQuizzes.forEach((q) => {
      run(
        'INSERT INTO study_quizzes (ownerId, roadmapId, nodeId, question, optionsJson, correctIndex, explanation, createdAt) VALUES (?, 1, ?, ?, ?, ?, ?, ?)',
        [adminUserId, q.nodeId, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, now]
      )
    })
  }
}
`;

if (!dbContent.includes('listFlashcards')) {
  dbContent += '\n' + newDatabaseFunctions;
}

fs.writeFileSync(dbFile, dbContent, 'utf8');
console.log('Successfully patched server/database.ts with interactive learning models!');
