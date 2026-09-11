const fs = require('fs');

const indexFile = 'server/index.ts';
let content = fs.readFileSync(indexFile, 'utf8');

const startMarker = "app.get('/api/roadmaps/notes/:nodeId',";
const endMarker = "function parseId(value: string | undefined) {";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers:', { startIndex, endIndex });
  process.exit(1);
}

const newStudyRoutes = `app.get('/api/roadmaps/notes/:nodeId', (request, response) => {
  const { nodeId } = request.params
  const userId = request.user ? request.user.id : 1
  let notes = getNodeNotes(userId, nodeId)

  if (!notes) {
    notes = mathNotes[nodeId] || null
  }

  if (!notes && nodeId.endsWith('_4')) {
    notes = \`## Практичний кейс та самоконтроль

### 1. Огляд кейсу
Цей розділ присвячено практичному застосуванню вивченого матеріалу на реальному прикладі.

### 2. Практичні завдання та кроки вирішення
1. **Збір та підготовка даних**: Визначення ключових вхідних параметрів та очищення вибірки.
2. **Аналітичний розрахунок**: Застосування відповідних формул та моделей для аналізу.
3. **Інтерпретація результатів**: Формулювання висновків та рекомендацій на основі розрахунків.

---
> [!TIP]
> Ви можете вільно редагувати цей конспект, додавати власні формули LaTeX (наприклад: $\\\\bar{x} = \\\\frac{1}{n}\\\\sum x_i$) та зберігати пояснення від ШІ-Викладача!\`
  }

  response.json({ notes })
})

app.put('/api/roadmaps/notes/:nodeId', (request, response) => {
  const { nodeId } = request.params
  const userId = request.user ? request.user.id : 1
  const { notes } = request.body
  if (typeof notes !== 'string') {
    response.status(400).json({ error: 'Notes string is required' })
    return
  }
  saveNodeNotes(userId, nodeId, notes)
  response.json({ success: true, notes })
})

// Flashcards API
app.get('/api/study/flashcards', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const roadmapId = request.query.roadmapId ? Number(request.query.roadmapId) : undefined
  const nodeId = request.query.nodeId ? String(request.query.nodeId) : undefined
  response.json(listFlashcards(userId, roadmapId, nodeId))
})

app.post('/api/study/flashcards', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { roadmapId, nodeId, question, answer } = request.body
  if (!question || !answer) {
    response.status(400).json({ error: 'Question and answer are required' })
    return
  }
  const card = createFlashcard(userId, { roadmapId, nodeId, question, answer })
  response.status(201).json(card)
})

app.post('/api/study/flashcards/:id/review', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const id = parseId(request.params.id)
  const { rating } = request.body
  if (rating !== 'easy' && rating !== 'good' && rating !== 'hard') {
    response.status(400).json({ error: 'Invalid rating. Expected easy, good, or hard' })
    return
  }
  reviewFlashcard(userId, id, rating)
  response.json({ success: true })
})

app.delete('/api/study/flashcards/:id', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const id = parseId(request.params.id)
  deleteFlashcard(userId, id)
  response.status(204).end()
})

// Quizzes API
app.get('/api/study/quizzes', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const nodeId = request.query.nodeId ? String(request.query.nodeId) : undefined
  response.json(listQuizzes(userId, nodeId))
})

app.post('/api/study/quizzes/submit', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { score, total } = request.body
  const passed = score >= Math.ceil(total * 0.6)
  const xpEarned = score * 15 + (passed ? 30 : 5)
  logStudyActivity(userId, 'quiz_pass', xpEarned)
  response.json({ success: true, xpEarned, passed })
})

// Activity & Gamification API
app.get('/api/study/activity', (request, response) => {
  const userId = request.user ? request.user.id : 1
  response.json(getStudyActivityStats(userId))
})

app.post('/api/study/activity/log', (request, response) => {
  const userId = request.user ? request.user.id : 1
  const { type, xp } = request.body
  logStudyActivity(userId, type || 'node_complete', xp || 20)
  response.json({ success: true })
})

// Built-in AI Study Assistant API
app.post('/api/study/ai-tutor', (request, response) => {
  const { topicTitle, userMessage, actionType } = request.body
  const cleanTitle = (topicTitle || 'Обрана тема').replace(/^\\d+(\\.\\d+)*\\s*/, '')

  let reply = ''

  if (actionType === 'explain') {
    reply = \`### 💡 Пояснення теми: **\${cleanTitle}**

Уявімо цю концепцію на простому прикладі:

1. **Суть концепції**: Це ключовий інструмент, який дозволяє узагальнювати дані або прогнозувати поведінку складної системи.
2. **Чому це важливо**: Без розуміння цього механізму неможливо коректно інтерпретувати розрахунки та оцінювати похибки у практичних завданнях.

> [!TIP]
> Спробуйте сформулювати своїми словами: як би ви пояснили цю концепцію іншій людині?\`
  } else if (actionType === 'formulas') {
    reply = \`### 📐 Ключові математичні формули: **\${cleanTitle}**

Базове математичне формулювання:
$$\\\\text{Метрика} = \\\\frac{1}{n} \\\\sum_{i=1}^{n} \\\\Big( x_i - \\\\mu \\\\Big)^2$$

* $x_i$ — $i$-те значення у вибірці
* $\\\\mu$ — середнє значення
* $n$ — кількість спостережень

> [!IMPORTANT]
> Зверніть увагу на розмірність: для отримання базових одиниць часто береться квадратний корінь $\\\\sigma = \\\\sqrt{\\\\text{Дисперсія}}$.\`
  } else if (actionType === 'example') {
    reply = \`### ✍️ Покроковий приклад розрахунку на числах

Візьмемо простий набір спостережень:
$$\\\\mathcal{D} = \\\\{ 4, 7, 8, 11, 15 \\\\}$$

1. **Крок 1**: Рахуємо суму елементів:
   $$\\\\sum = 4 + 7 + 8 + 11 + 15 = 45$$
2. **Крок 2**: Кількість елементів $n = 5$.
3. **Крок 3**: Обчислюємо середнє:
   $$\\\\bar{x} = \\\\frac{45}{5} = 9$$
4. **Крок 4**: Рахуємо відхилення від середнього:
   $$(4-9)^2 = 25, \\\\quad (7-9)^2 = 4, \\\\quad (8-9)^2 = 1, \\\\quad (11-9)^2 = 4, \\\\quad (15-9)^2 = 36$$
   $$\\\\text{Сума квадратів} = 25 + 4 + 1 + 4 + 36 = 70$$
   $$S^2 = \\\\frac{70}{5 - 1} = 17.5$$

Результат отримано вручну без сторонніх калькуляторів!\`
  } else if (actionType === 'task') {
    reply = \`### ❓ Практична задача для самоперевірки

**Умова задачі:**
Дано вибірку результатів спостережень:
$$\\\\mathcal{X} = \\\\{ 10, 12, 14, 16, 18, 20 \\\\}$$

**Завдання:**
1. Знайдіть медіану ($Me$) та середнє арифметичне ($\\\\bar{x}$).
2. Визначте, як зміниться результат, якщо останнє число $20$ замінити на викид $200$.

*Напишіть вашу відповідь у чат, і я перевірю хід розрахунків!* 🚀\`
  } else {
    reply = \`Чудове запитання щодо теми **\${cleanTitle}**!

Розглянемо це поетапно:
1. За наданим запитом: *\${userMessage || 'Поясни детальніше'}*
2. Головне правило тут полягає у послідовному аналізі вхідних параметрів та застосуванні формули без поспіху.

Чи бажаєте розібрати конкретний числовий приклад чи подивитися на практичне застосування в реальних проєктах?\`
  }

  response.json({ reply })
})

`;

content = content.slice(0, startIndex) + newStudyRoutes + content.slice(endIndex);
fs.writeFileSync(indexFile, content, 'utf8');
console.log('Successfully applied study API routes!');
