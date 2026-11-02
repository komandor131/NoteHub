/**
 * Universal Academic and Practical Lecture Notes Generator for English Language
 * NoteHub Pro - Zero to Strong B2 Comprehensive Curriculum
 */

export function getEnglishNote(nodeId: string, nodeTitle?: string): string {
  const cleanTitle = (nodeTitle || 'Урок англійської мови')
    .replace(/^\d+(\.\d+)*\s*/, '')
    .replace(/^У\d+\.?\s*/, '')
    .trim()

  // Determine section and sub-numbers from nodeId (e.g. eng1_1_1, eng2_3_4, etc.)
  const match = nodeId.match(/eng(\d+)_(\d+)_(\d+)/i) || nodeId.match(/eng_(\d+)_(\d+)/i)
  const secNum = match ? parseInt(match[2], 10) : 1
  const subNum = match && match[3] ? parseInt(match[3], 10) : 1

  // CEFR Level calculation based on section index
  let cefrLevel = 'A0 Starter (Початковий рівень)'
  let badgeColor = '🟢'
  if (secNum <= 4) {
    cefrLevel = 'A0 Starter — Перші кроки та фундамент'
    badgeColor = '🟢'
  } else if (secNum <= 9) {
    cefrLevel = 'A1 Elementary — Базове щоденне мовлення'
    badgeColor = '🟢'
  } else if (secNum <= 14) {
    cefrLevel = 'A2 Pre-Intermediate — Розширення діалогу та часів'
    badgeColor = '🟡'
  } else if (secNum <= 20) {
    cefrLevel = 'B1 Intermediate — Вільне спілкування та складні конструкції'
    badgeColor = '🟠'
  } else if (secNum <= 25) {
    cefrLevel = 'B2 Upper-Intermediate — Побіжне мовлення, ідіоми та граматика'
    badgeColor = '🔴'
  } else {
    cefrLevel = 'Strong B2 / Professional IT — Професійний рівень та робота в IT'
    badgeColor = '🟣'
  }

  // Topic specific content synthesis
  const vocabBank = getVocabularyForTopic(cleanTitle, secNum, subNum)
  const grammarRule = getGrammarExplanation(cleanTitle, secNum, subNum)
  const phonics = getPhonicsAdvice(cleanTitle, secNum)
  const dialogue = getDialogue(cleanTitle, secNum)
  const mistakes = getCommonMistakes(cleanTitle, secNum)
  const itContext = getITContext(cleanTitle, secNum)
  const practice = getPracticeTasks(cleanTitle, secNum)

  return `# 🇬🇧 ${cleanTitle}

> **Рівень CEFR**: ${badgeColor} **${cefrLevel}**  
> **Мета уроку**: Повне освоєння теми від абсолютного нуля до впевненого активного використання в мовленні та листуванні.  
> **Фокус навички**: Розмовна практика, сприйняття на слух, правильна вимова, словниковий запас та професійне вживання.

---

## 1. 📖 Зрозуміле пояснення теми («Без занудства»)

${grammarRule}

---

## 2. 🗣️ Вимова, звуки та фонетичні нюанси (Phonics & Pronunciation)

${phonics}

---

## 3. 📚 Словниковий банк уроку (Essential Vocabulary)

Обов'язкові слова та сталі вирази для цієї теми. Запам'ятовуйте їх одразу в контексті готових речень:

| Англійське слово / фраза | Транскрипція IPA | Переклад українською | Живий приклад у реченні |
| :--- | :--- | :--- | :--- |
${vocabBank.map(v => `| **${v.en}** | \`${v.trans}\` | ${v.ua} | *"${v.ex}"* |`).join('\n')}

---

## 4. 💡 Живий діалог у реальній ситуації (Real-life Dialogue)

**Контекст**: *${dialogue.context}*

\`\`\`text
${dialogue.lines.map(l => `${l.speaker}: "${l.en}"\n   (${l.ua})`).join('\n\n')}
\`\`\`

---

## 5. ⚠️ Типові пастки та помилки новачків (Common Mistakes)

Через прямий переклад з української часто виникають типові помилки. Зверніть увагу:

${mistakes.map((m, i) => `### Помилка #${i + 1}
- ❌ **Неправильно**: \`${m.wrong}\`
- ✅ **Правильно**: \`${m.right}\`
- 💡 **Чому саме так**: ${m.reason}
`).join('\n')}

---

## 6. 💻 Як це використовується в IT та на роботі (IT & Career Context)

${itContext}

---

## 7. 📝 Практичні завдання для закріплення з розв'язком

Спробуйте перекласти або скласти речення самостійно, після чого перевірте себе:

${practice.map((p, i) => `**Завдання ${i + 1}**: ${p.q}  
<details>
<summary>👉 Натисніть, щоб побачити правильну відповідь</summary>

**Відповідь**: \`${p.a}\`
</details>
`).join('\n')}

---
> [!TIP]
> **Золоте правило вивчення мови**: Не вчіть окремі слова списком! Завжди повторюйте слова вголос у складі готового речення не менше 3-х разів. Це формує м'язову пам'ять язика та автоматичний мовленнєвий патерн.
`
}

function getGrammarExplanation(title: string, _sec: number, _sub?: number): string {
  const lower = title.toLowerCase()

  if (lower.includes('to be') || lower.includes('бути')) {
    return `Дієслово **to be** (бути, є, знаходитися) — це фундамент усієї англійської мови. В українській мові ми часто опускаємо слово "є" (*"Я розробник"*, *"Вона вдома"*), але в англійській мові **речення без дієслова не існує взагалі**!

### Форми дієслова To Be у теперішньому часі (Present Simple):
- **I am** (скорочено: *I'm*) — Я є.
- **He / She / It is** (скорочено: *He's / She's / It's*) — Він / вона / воно є.
- **You / We / They are** (скорочено: *You're / We're / They're*) — Ти (ви) / ми / вони є.

### Як будувати заперечення та питання:
- **Заперечення**: додаємо частку \`not\` одразу після дієслова: *I am not tired*, *He is not online*.
- **Питання**: виносимо \`am / is / are\` на перше місце перед підметом: *Are you ready?*, *Is the server running?*.`
  }

  if (lower.includes('present simple') || lower.includes('простий теперішній')) {
    return `**Present Simple** використовується для дій, які відбуваються **регулярно, постійно, за розкладом** або є загальновідомими фактами.

### Золоте правило побудови:
- З **I, You, We, They** дієслово залишається у початковій формі: *I write code every day.*
- З **He, She, It** до дієслова обов'язково додається закінчення **-s** або **-es**: *He write**s** tests.*, *She fix**es** bugs.*

### Помічники для заперечень та питань:
- Для заперечення використовуємо **don't** (з I/you/we/they) або **doesn't** (з he/she/it). Зверніть увагу: коли з'являється *doesn't*, закінчення \`-s\` у основного дієслова **зникає**! (*He doesn't work on weekends*).
- Слова-маркери: *always (завжди), usually (зазвичай), often (часто), every day (щодня), never (ніколи).*`
  }

  if (lower.includes('past simple') || lower.includes('минулий')) {
    return `**Past Simple** використовується для дій, які відбулися і **завершилися у конкретний момент у минулому**.

### Як утворюється:
1. **Правильні дієслова (Regular Verbs)**: додаємо закінчення \`-ed\`: *open -> opened*, *test -> tested*, *commit -> committed*.
2. **Неправильні дієслова (Irregular Verbs)**: використовуємо другу форму з таблиці неправильних дієслів (V2): *write -> wrote*, *make -> made*, *build -> built*, *go -> went*.

### Питання та заперечення:
- Усі особи використовують одне універсальне допоміжне дієслово **did**:
  - Заперечення: *I **didn't** deploy the service yesterday.* (основне дієслово повертається в 1-шу форму!).
  - Питання: ***Did** you check the logs?*`
  }

  if (lower.includes('present continuous') || lower.includes('тривалий')) {
    return `**Present Continuous** описує дію, яка відбувається **прямо зараз, у момент мовлення**, або тимчасовий процес у поточному періоді життя.

### Формула:
$$\\text{Subject} + \\text{am / is / are} + \\text{Verb-ing}$$

- *I **am debugging** the application right now.*
- *They **are working** from home this week.*

### Порівняння з Present Simple:
- *I drink coffee every morning.* (Present Simple — регулярна звичка).
- *I am drinking coffee right now.* (Present Continuous — дія в цю саму секунду).`
  }

  if (lower.includes('present perfect') || lower.includes('перфект')) {
    return `**Present Perfect** — один із найважливіших часів для роботи та співбесід. Він показує **результат або життєвий досвід у минулому, який має пряме значення для теперішнього моменту**. Точний час дії НЕ має значення!

### Формула:
$$\\text{Subject} + \\text{have / has} + \\text{V3 (Past Participle)}$$

- *I **have fixed** this critical bug.* (Результат зараз: баг виправлено, система працює).
- *He **has deployed** the release.*
- Маркери: *already (вже), yet (ще), just (щойно), ever (колись), never (ніколи).*`
  }

  if (lower.includes('conditional') || lower.includes('умовн')) {
    return `**Conditionals (Умовні речення)** описують ситуації за формулою *"Якщо ..., то ..."*.

### Основні типи:
1. **First Conditional (Реальне майбутнє)**: *If + Present Simple, will + Verb*  
   *If the pipeline passes, we will deploy to production.*
2. **Second Conditional (Уявна мрія зараз або в майбутньому)**: *If + Past Simple, would + Verb*  
   *If I had more RAM, the Docker container would run faster.*
3. **Third Conditional (Жаль про минуле, яке не змінити)**: *If + Past Perfect, would have + V3*  
   *If we had added indexes, the database wouldn't have crashed.*`
  }

  return `Тема **«${title}»** є ключовою сходинкою до рівня Strong B2. 

### Головна сутність та логіка:
В англійській мові кожна граматична конструкція має суворе математичне правило порядку слів:
$$\\text{Subject (Хто?)} \\longrightarrow \\text{Verb (Що робить?)} \\longrightarrow \\text{Object (Над чим?)} \\longrightarrow \\text{Place / Time (Де? Коли?)}$$

На відміну від української мови, де слова можна вільно міняти місцями, англійське речення має фіксовану структуру. Завдяки цьому співрозмовник завжди миттєво розуміє, хто виконує дію, а хто є об'єктом.

Опановуючи цей розділ, зосередьтеся на моделях-шаблонах (Sentence Patterns), які ви можете без вагань застосовувати під час діалогу, не перекладаючи кожне слово окремо у голові.`
}

function getPhonicsAdvice(_title: string, sec: number): string {
  if (sec <= 4) {
    return `1. **Артикуляція звуку [θ] та [ð] (літери th)**:
   - Кінчик язика повинен злегка знаходитися між передніми верхніми та нижніми зубами. Не замінюйте звук на [s], [z] чи [f]!
   - Глухий [θ]: *think*, *three*, *thanks*.
   - Дзвінкий [ð]: *this*, *that*, *the*, *they*.

2. **Різниця короткого [ɪ] та довгого [iː]**:
   - *ship* [ʃɪp] (корабель) vs *sheep* [ʃiːp] (вівця).
   - *bit* [bɪt] (шматочок) vs *beat* [biːt] (перемагати).
   - Довгий звук вимовляється з напруженими куточками губ, ніби ви злегка посміхаєтесь.

3. **Німі літери (Silent Letters)**:
   - Буква \`k\` перед \`n\` не читається: *know* [nəʊ], *knife* [naɪf], *knee* [niː].
   - Буква \`w\` перед \`r\` не читається: *write* [raɪt], *wrong* [rɒŋ].`
  }

  if (sec <= 14) {
    return `1. **Зв'язування слів у потоці мовлення (Connected Speech)**:
   - Носії мови не роблять пауз між словами. Якщо одне слово закінчується на приголосний, а наступне починається на голосний, вони зливаються:
     - *check in* звучить як \`[tʃek-ɪn]\`
     - *hold on* звучить як \`[həʊld-ɒn]\`
     - *pick it up* звучить як \`[pɪ-kɪ-tʌp]\`

2. **Редукція ненаголошених голосних (Звук Шва [ə])**:
   - В англійській мові ненаголошені голосні часто перетворюються на короткий нейтральний звук [ə]:
     - *about* -> [əˈbaʊt]
     - *problem* -> [ˈprɒbləm]`
  }

  return `1. **Інтонаційні патерни (Intonation Patterns)**:
   - **Стверджувальні речення та Wh-питання** мають низхідну інтонацію (Falling intonation): голос опускається в кінці фрази.
   - **Yes/No питання** мають висхідну інтонацію (Rising intonation): тон голосу піднімається в кінці.

2. **Наголос у фразі (Sentence Stress)**:
   - Наголошуються змістові слова (іменники, смислові дієслова, прикметники).
   - Допоміжні слова (артиклі, прийменники, допоміжні дієслова) вимовляються швидко та скорочено (weak forms): *can* [kən], *have* [həv].`
}

function getVocabularyForTopic(_title: string, sec: number, _sub?: number): Array<{ en: string; ua: string; trans: string; ex: string }> {
  if (sec <= 3) {
    return [
      { en: "hello / hi", ua: "привіт", trans: "/həˈləʊ/", ex: "Hello! My name is Alex." },
      { en: "name", ua: "ім'я", trans: "/neɪm/", ex: "What is your name?" },
      { en: "developer", ua: "розробник", trans: "/dɪˈvel.ə.pər/", ex: "I am a junior software developer." },
      { en: "company", ua: "компанія", trans: "/ˈkʌm.pə.ni/", ex: "He works at a tech company." },
      { en: "today", ua: "сьогодні", trans: "/təˈdeɪ/", ex: "Today is a productive day." },
      { en: "ready", ua: "готовий", trans: "/ˈred.i/", ex: "Are you ready to start?" },
      { en: "please", ua: "будь ласка", trans: "/pliːz/", ex: "Please check this file." },
      { en: "thank you", ua: "дякую", trans: "/ˈθæŋk ˌjuː/", ex: "Thank you for your help!" }
    ]
  }

  if (sec <= 10) {
    return [
      { en: "create", ua: "створювати", trans: "/kriˈeɪt/", ex: "We need to create a new branch." },
      { en: "fix", ua: "виправляти", trans: "/fɪks/", ex: "I fixed the issue this morning." },
      { en: "feature", ua: "функціонал / фіча", trans: "/ˈfiː.tʃər/", ex: "This is a very useful feature." },
      { en: "user", ua: "користувач", trans: "/ˈjuː.zər/", ex: "Users love the fast interface." },
      { en: "fast / slow", ua: "швидкий / повільний", trans: "/fɑːst / sləʊ/", ex: "The new API is very fast." },
      { en: "because", ua: "тому що", trans: "/bɪˈkəz/", ex: "The test failed because of a timeout." },
      { en: "always", ua: "завжди", trans: "/ˈɔːl.weɪz/", ex: "I always write unit tests." },
      { en: "yesterday", ua: "вчора", trans: "/ˈjes.tə.deɪ/", ex: "We released the update yesterday." }
    ]
  }

  if (sec <= 20) {
    return [
      { en: "implement", ua: "впроваджувати / реалізувати", trans: "/ˈɪm.plɪ.ment/", ex: "We must implement user authentication." },
      { en: "improve", ua: "покращувати", trans: "/ɪmˈpruːv/", ex: "This cache will improve performance." },
      { en: "solution", ua: "рішення", trans: "/səˈluː.ʃən/", ex: "We found an optimal engineering solution." },
      { en: "efficient", ua: "ефективний", trans: "/ɪˈfɪʃ.ənt/", ex: "This algorithm is more efficient." },
      { en: "experience", ua: "досвід", trans: "/ɪkˈspɪə.ri.əns/", ex: "I have two years of coding experience." },
      { en: "responsible for", ua: "відповідальний за", trans: "/rɪˈspɒn.sə.bəl fɔːr/", ex: "I am responsible for the backend architecture." },
      { en: "look forward to", ua: "з нетерпінням чекати на", trans: "/lʊk ˈfɔː.wəd tuː/", ex: "I look forward to our demo meeting." },
      { en: "resolve", ua: "розв'язувати (проблему)", trans: "/rɪˈzɒlv/", ex: "We resolved the merge conflict quickly." }
    ]
  }

  return [
    { en: "trade-off", ua: "компроміс", trans: "/ˈtreɪd.ɒf/", ex: "There is always a trade-off between latency and consistency." },
    { en: "scalable", ua: "масштабований", trans: "/ˈskeɪ.lə.bəl/", ex: "Our microservice architecture is highly scalable." },
    { en: "bottleneck", ua: "вузьке місце", trans: "/ˈbɒt.əl.nek/", ex: "Database locks are the primary bottleneck." },
    { en: "robust", ua: "надійний / відмовостійкий", trans: "/rəʊˈbʌst/", ex: "We designed a robust error handling system." },
    { en: "crucial", ua: "вирішальний / критично важливий", trans: "/ˈkruː.ʃəl/", ex: "Security audit is crucial before releasing to production." },
    { en: "align with", ua: "узгоджуватися з", trans: "/əˈlaɪn wɪð/", ex: "Does this feature align with the product roadmap?" },
    { en: "workaround", ua: "тимчасове обхідне рішення", trans: "/ˈwɜːk.ə.raʊnd/", ex: "We applied a quick workaround until the upstream library is patched." },
    { en: "take into account", ua: "брати до уваги", trans: "/teɪk ˈɪn.tuː əˈkaʊnt/", ex: "You should take network latency into account." }
  ]
}

function getDialogue(_title: string, sec: number) {
  if (sec <= 8) {
    return {
      context: "Знайомство на міжнародному командному мітингу",
      lines: [
        { speaker: "John", en: "Hi everyone! Welcome to the team. Alex, could you introduce yourself?", ua: "Привіт усім! Ласкаво просимо в команду. Алексе, чи міг би ти представитися?" },
        { speaker: "Alex", en: "Hello! My name is Alex. I am a software engineer from Ukraine. I am very happy to join this project!", ua: "Привіт! Мене звати Алекс. Я інженер-програміст з України. Дуже радий приєднатися до цього проєкту!" },
        { speaker: "John", en: "Great to have you here! What tech stack do you work with?", ua: "Чудово, що ти з нами! З яким технологічним стеком ти працюєш?" },
        { speaker: "Alex", en: "I mainly work with Python, Go, and relational databases.", ua: "В основному я працюю з Python, Go та реляційними базами даних." }
      ]
    }
  }

  return {
    context: "Обговорення архітектури та вирішення технічного блокера на стендапі",
    lines: [
      { speaker: "Team Lead", en: "How is the progress on the payment gateway integration, Alex?", ua: "Як прогрес з інтеграцією платіжного шлюзу, Алексе?" },
      { speaker: "Alex", en: "Yesterday I completed the webhook receiver and covered it with integration tests.", ua: "Вчора я закінчив обробник вебхуків та покрив його інтеграційними тестами." },
      { speaker: "Team Lead", en: "Awesome! Are there any blockers on your side?", ua: "Чудово! Чи є якісь блокери з твого боку?" },
      { speaker: "Alex", en: "None at the moment. Today I plan to optimize the retry logic and create a Pull Request for review.", ua: "Наразі жодних. Сьогодні планую оптимізувати логіку повторних спроб і створити Pull Request на перевірку." }
    ]
  }
}

function getCommonMistakes(_title: string, sec: number) {
  if (sec <= 8) {
    return [
      {
        wrong: "I am agree with you.",
        right: "I agree with you.",
        reason: "В англійській мові 'agree' — це дієслово (погоджуватися), а не прикметник! Тому допоміжне дієслово 'am' тут зайве."
      },
      {
        wrong: "I feel myself good.",
        right: "I feel good.",
        reason: "В українській мові ми кажемо 'почуваю себе', але в англійській зворотний займенник 'myself' після 'feel' не вживається (інакше це означає 'обмацувати себе')."
      },
      {
        wrong: "He work as developer.",
        right: "He works as a developer.",
        reason: "З займенниками he/she/it дієслово завжди має закінчення -s. Перед назвами професій обов'язково потрібен артикль 'a/an'."
      }
    ]
  }

  return [
    {
      wrong: "If I will have time, I will review your PR.",
      right: "If I have time, I will review your PR.",
      reason: "У підрядних реченнях умови (після if, when, as soon as) майбутній час 'will' ніколи не вживається! Замість нього використовується Present Simple."
    },
    {
      wrong: "I work here since two years.",
      right: "I have been working here for two years.",
      reason: "Для дій, які почалися в минулому і тривають досі, використовується Present Perfect Continuous. А для вказівки періоду використовується 'for', а не 'since'."
    },
    {
      wrong: "This code makes sense to me, but I didn't saw the logs.",
      right: "This code makes sense to me, but I didn't see the logs.",
      reason: "Після допоміжного дієслова 'didn't' основне дієслово завжди стоїть у 1-й початковій формі (infinitive without to)."
    }
  ]
}

function getITContext(_title: string, sec: number): string {
  if (sec <= 10) {
    return `### 🧑‍💻 Як це звучить у повсякденній роботі IT-спеціаліста:
- **У Slack чаті**: *"I am pushing the latest changes to the dev branch now."*
- **У назві комміту Git**: *"Fix: correct typo in authorization header validator."*
- **На короткому статусі**: *"I don't have any blockers today, continuing with the task."*`
  }

  return `### 🚀 Професійні шаблони для мітингів, PR та листування:
- **У коментарях до Pull Request**:
  - *"LGTM (Looks Good To Me)! However, could we refactor this loop to avoid O(N²) complexity?"*
  - *"I would suggest extracting this logic into a separate helper function for better testability."*
- **На архітектурній дискусії (Design Review)**:
  - *"If we rely on in-memory caching alone, we might encounter data inconsistency across multiple replicas."*
  - *"What are the trade-offs between using synchronous REST vs asynchronous message brokers here?"*
- **На технічній співбесіді (Technical Interview)**:
  - *"In my previous role, I was responsible for reducing database query response times by introducing indexing and query optimization."*`
}

function getPracticeTasks(_title: string, sec: number) {
  if (sec <= 8) {
    return [
      {
        q: "Перекладіть англійською: 'Мене звати Алекс, і я працюю інженером програмного забезпечення.'",
        a: "My name is Alex, and I work as a software engineer. (або: I am a software engineer.)"
      },
      {
        q: "Перекладіть англійською: 'Чи є у вас запитання щодо цього файлу?'",
        a: "Do you have any questions about this file?"
      },
      {
        q: "Знайдіть та виправте помилку: 'She don't likes writing documentation.'",
        a: "She doesn't like writing documentation. (doesn't + дієслово без -s)"
      }
    ]
  }

  return [
    {
      q: "Перекладіть англійською: 'Якщо ми не протестуємо реліз сьогодні, клієнти зіткнуться з помилками.'",
      a: "If we don't test the release today, customers will face bugs / errors."
    },
    {
      q: "Перекладіть умовну конструкцію: 'Я вже перевірив усі логи та не знайшов жодних аномалій.'",
      a: "I have already checked all the logs and haven't found any anomalies."
    },
    {
      q: "Складіть професійну відповідь: 'Я з нетерпінням чекаю на запуск нашого нового сервісу.'",
      a: "I look forward to launching our new service."
    }
  ]
}
