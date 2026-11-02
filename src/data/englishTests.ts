import type { MathTestQuestion } from './mathSection1Tests'

/**
 * Universal 30-Question Test Bank Generator for English Language (Zero to Strong B2)
 * NoteHub Pro - Structured English Trainer
 */

interface TopicTestSeed {
  q: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
}

export function getEnglishQuestions(
  nodeId: string,
  nodeTitle?: string,
  roadmapTitle?: string
): MathTestQuestion[] {
  const cleanTitle = (nodeTitle || 'Англійська мова')
    .replace(/^\d+(\.\d+)*\s*/, '')
    .replace(/^У\d+\.?\s*/, '')
    .trim()

  const match = nodeId.match(/eng(\d+)_(\d+)_(\d+)/i) || nodeId.match(/eng_(\d+)_(\d+)/i)
  const trackNum = match ? parseInt(match[1], 10) : 1
  const secNum = match ? parseInt(match[2], 10) : 1
  const subNum = match && match[3] ? parseInt(match[3], 10) : 1

  // Determine level
  let levelName = 'A0-A1'
  if (secNum > 25) levelName = 'Strong B2 / IT'
  else if (secNum > 20) levelName = 'B2'
  else if (secNum > 14) levelName = 'B1'
  else if (secNum > 9) levelName = 'A2'

  const questions: MathTestQuestion[] = []

  // Core thematic seeds for English
  const seeds: TopicTestSeed[] = [
    {
      q: `[${cleanTitle}] Як правильно побудувати твердження з дієсловом "to be" у теперішньому часі для підмета "He"?`,
      options: [
        "He is a software developer.",
        "He are a software developer.",
        "He am a software developer.",
        "He be a software developer."
      ],
      correctIndex: 0,
      explanation: "Для займенників he, she, it дієслово to be має єдину форму 'is'. Форма 'are' використовується для you/we/they, 'am' — виключно для I, а початкова форма 'be' вимагає частки to або модального дієслова."
    },
    {
      q: `[${cleanTitle}] Оберіть граматично правильне заперечне речення в Present Simple:`,
      options: [
        "He doesn't work on weekends.",
        "He don't work on weekends.",
        "He doesn't works on weekends.",
        "He not work on weekends."
      ],
      correctIndex: 0,
      explanation: "З 3-ю особою однини (he, she, it) у Present Simple вживається допоміжне дієслово 'doesn't', після якого смислове дієслово повертається у початкову форму БЕЗ закінчення -s."
    },
    {
      q: `[${cleanTitle}] Яке слово є правильним перекладом українського виразу "виправляти помилки в коді"?`,
      options: [
        "To debug / fix bugs",
        "To break exceptions",
        "To invent errors",
        "To commit failures"
      ],
      correctIndex: 0,
      explanation: "'To debug' або 'to fix bugs' — це стандартний міжнародний інженерний термін для пошуку та усунення несправностей у програмному забезпеченні."
    },
    {
      q: `[${cleanTitle}] У чому полягає різниця між "I write code" та "I am writing code"?`,
      options: [
        "'I write code' — це регулярна дія або професія; 'I am writing code' — це дія, що відбувається в цей момент мовлення.",
        "'I write code' — це минулий час, а 'I am writing code' — майбутній.",
        "Між ними немає жодної різниці, це абсолютні синоніми.",
        "'I am writing code' можна вживати лише у вихідні дні."
      ],
      correctIndex: 0,
      explanation: "Present Simple (I write) виражає повторювану регулярну дію або факт, тоді як Present Continuous (I am writing) позначає дію, що триває прямо зараз."
    },
    {
      q: `[${cleanTitle}] Яка форма минулого часу (Past Simple) у неправильного дієслова "write" (писати)?`,
      options: [
        "wrote",
        "writed",
        "written",
        "writing"
      ],
      correctIndex: 0,
      explanation: "Дієслово 'write' є неправильним: його форми — write (V1), wrote (V2 — Past Simple), written (V3 — Past Participle). Форми 'writed' не існує в англійській мові."
    },
    {
      q: `[${cleanTitle}] Як коректно висловити майбутню заплановану дію, рішення про яку прийнято заздалегідь?`,
      options: [
        "I am going to deploy the new service tomorrow.",
        "I will to deploy the new service tomorrow.",
        "I am deploy the new service tomorrow.",
        "I go deploy the new service tomorrow."
      ],
      correctIndex: 0,
      explanation: "Конструкція 'be going to + Verb' вказує на заздалегідь спланований намір або очевидну подію в майбутньому. 'Will to' є грубою граматичною помилкою."
    },
    {
      q: `[${cleanTitle}] Яке речення демонструє правильне використання Present Perfect?`,
      options: [
        "I have already tested this endpoint.",
        "I have already tested this endpoint yesterday.",
        "I has already test this endpoint.",
        "I did already have tested this endpoint."
      ],
      correctIndex: 0,
      explanation: "Present Perfect (have + V3) підкреслює результат дії до теперішнього моменту без точної вказівки минулого часу. Якщо зазначено конкретний час у минулому ('yesterday'), потрібно використовувати Past Simple ('I tested')."
    },
    {
      q: `[${cleanTitle}] Оберіть правильний артикль для речення: 'We need to hire ___ senior Python developer.'`,
      options: [
        "a",
        "an",
        "the",
        "— (нульовий артикль)"
      ],
      correctIndex: 0,
      explanation: "Перед обчислюваним іменником у однині, що починається з приголосного звуку ('senior' починається на /s/), вживається неозначений артикль 'a'. Артикль 'an' ставиться перед голосними звуками."
    },
    {
      q: `[${cleanTitle}] Що означає фразове дієслово "to find out"?`,
      options: [
        "З'ясувати, дізнатися інформацію",
        "Загубити предмет на вулиці",
        "Видалити обліковий запис",
        "Перезавантажити роутер"
      ],
      correctIndex: 0,
      explanation: "'Find out' означає з'ясувати, розібратися або відкрити для себе нову інформацію (наприклад, 'I need to find out why the server crashed')."
    },
    {
      q: `[${cleanTitle}] Як правильно відповісти на стендапі (Daily Scrum) про відсутність блокерів?`,
      options: [
        "I have no blockers today, continuing with my task.",
        "I don't have nothing blockers today.",
        "I am no have blocking things today.",
        "Blockers are missing from me today."
      ],
      correctIndex: 0,
      explanation: "'I have no blockers today' або 'I don't have any blockers today' — це лаконічний, природний та професійний вираз для щоденних IT-мітингів."
    }
  ]

  // Generate 30 questions based on progressive difficulty
  for (let i = 1; i <= 30; i++) {
    const seedIndex = (i - 1) % seeds.length
    const seed = seeds[seedIndex]

    let difficulty: 'Легкий' | 'Середній' | 'Складний' = 'Легкий'
    let qPrefix = ''
    let points = 5

    if (i <= 10) {
      difficulty = 'Легкий'
      qPrefix = `Тест ${i} (Фундамент та Словник [${levelName}]): `
      points = 5
    } else if (i <= 20) {
      difficulty = 'Середній'
      qPrefix = `Тест ${i} (Граматика та Побудова [${levelName}]): `
      points = 10
    } else {
      difficulty = 'Складний'
      qPrefix = `Тест ${i} (Strong B2 & IT English Mastery): `
    }

    if (i <= seeds.length) {
      questions.push({
        id: i,
        topicId: nodeId,
        topicTitle: cleanTitle,
        question: `${qPrefix}${seed.q}`,
        options: seed.options,
        correctIndex: seed.correctIndex,
        explanation: seed.explanation,
        difficulty
      })
    } else {
      // Dynamic variant generation for comprehensive 30 tests
      const subVariationIndex = (i - 1) % 10

      const variations: Array<{
        q: string
        options: [string, string, string, string]
        correctIndex: number
        exp: string
      }> = [
        {
          q: `Яке з наведених речень містить типову помилку прямого перекладу (кальку)?`,
          options: [
            "I agree with the proposed API architecture.",
            "I am agree with the proposed API architecture.",
            "I approve the proposed API architecture.",
            "I support the proposed API architecture."
          ],
          correctIndex: 1,
          exp: "'Agree' — це смислове дієслово. В англійській мові ніколи не кажуть 'I am agree', правильно казати 'I agree' або 'I don't agree'."
        },
        {
          q: `Оберіть речення з правильним використанням First Conditional (реальна умова у майбутньому):`,
          options: [
            "If the tests pass, we will merge the pull request.",
            "If the tests will pass, we will merge the pull request.",
            "If the tests pass, we merge would the pull request.",
            "If the tests are passing, we merged the pull request."
          ],
          correctIndex: 0,
          exp: "У підрядних реченнях умови (після If) ніколи не використовується 'will'! Правило: If + Present Simple, will + Verb."
        },
        {
          q: `Який синонім найкраще підходить до виразу "to resolve a trade-off"?`,
          options: [
            "To balance competing priorities or constraints",
            "To delete all conflicting database tables",
            "To refuse writing automated tests",
            "To ignore customer requirements"
          ],
          correctIndex: 0,
          exp: "В інженерному системному дизайні 'trade-off' — це компроміс між двома протилежними факторами (наприклад, швидкість vs використання пам'яті). Його розв'язання означає збалансування пріоритетів."
        },
        {
          q: `Як правильно перекласти речення: 'Я працюю в цій компанії вже два роки' (дія почалася в минулому і триває досі)?`,
          options: [
            "I have been working at this company for two years.",
            "I work at this company since two years.",
            "I am working at this company two years ago.",
            "I worked at this company during two years."
          ],
          correctIndex: 0,
          exp: "Для позначення тривалої дії, яка розпочалася в минулому і триває в момент мовлення, використовується Present Perfect Continuous (have been + V-ing) у поєднанні з прийменником 'for' (протягом якогось часу)."
        },
        {
          q: `Що означає професійний термін 'workaround' у розробці програмного забезпечення?`,
          options: [
            "Тимчасове обхідне рішення проблеми до випуску повноцінного виправлення",
            "Повний рефакторинг усього вихідного коду програми",
            "Відмова від тестування перед релізом",
            "Завершення робочого дня раніше графіка"
          ],
          correctIndex: 0,
          exp: "'Workaround' — це тимчасовий спосіб обійти баг або обмеження системи без усунення першопричини (наприклад, доки вендор не оновить бібліотеку)."
        },
        {
          q: `Оберіть граматично правильну конструкцію пасивного стану (Passive Voice):`,
          options: [
            "The microservice was deployed by the CI/CD pipeline.",
            "The microservice was deploy by the CI/CD pipeline.",
            "The microservice is deploy by the CI/CD pipeline.",
            "The microservice been deployed by the CI/CD pipeline."
          ],
          correctIndex: 0,
          exp: "Формула Passive Voice: to be + V3 (Past Participle). У минулому часі для однини це 'was + deployed'."
        },
        {
          q: `Яке з модальних дієслів виражає ввічливу пораду чи рекомендацію колезі?`,
          options: [
            "You should write comments for this complex algorithm.",
            "You must write comments for this complex algorithm.",
            "You can't write comments for this complex algorithm.",
            "You would to write comments for this complex algorithm."
          ],
          correctIndex: 0,
          exp: "Модальне дієслово 'should' використовується для дружніх та конструктивних рекомендацій ('варто / слід'). 'Must' звучить як суворий безапеляційний наказ."
        },
        {
          q: `Що означає скорочення 'LGTM', яке розробники пишуть під час рев'ю коду (Code Review)?`,
          options: [
            "Looks Good To Me (виглядає добре, схвалюю)",
            "Let Git Terminate Merge",
            "Logic Gives Too Many Errors",
            "Load Graphs To Monitor"
          ],
          correctIndex: 0,
          exp: "'LGTM' — найпоширеніша абревіатура в GitHub/GitLab, що означає повне схвалення змін у Pull Request без додаткових зауважень."
        },
        {
          q: `Оберіть правильний варіант побудови непрямого запитання (Embedded Question):`,
          options: [
            "Could you please tell me where the configuration file is?",
            "Could you please tell me where is the configuration file?",
            "Could you please tell me where does the configuration file be?",
            "Could you please tell me where the configuration file does exist?"
          ],
          correctIndex: 0,
          exp: "У непрямих питаннях (після ввідних фраз 'Could you tell me...', 'Do you know...') порядок слів стає прямим (підмет + дієслово): 'where the configuration file is', а не зворотним."
        },
        {
          q: `Як впевнено відповісти англійською на запитання: 'What are your key strengths as an engineer?' на інтерв'ю?`,
          options: [
            "My key strengths are problem-solving, clean code habits, and fast adaptation to new technologies.",
            "I very good man and I can everything make in computer.",
            "My strengths is missing because I don't know my level.",
            "I always sleeping when code is compiling."
          ],
          correctIndex: 0,
          exp: "Чітка, структурована та професійна відповідь із підкресленням аналітичних здібностей (problem-solving), культури коду та здатності швидко навчатися справляє найкраще враження на технічного інтерв'юера."
        }
      ]

      const currentVariation = variations[subVariationIndex]
      questions.push({
        id: i,
        topicId: nodeId,
        topicTitle: cleanTitle,
        question: `${qPrefix}${currentVariation.q}`,
        options: currentVariation.options,
        correctIndex: currentVariation.correctIndex,
        explanation: currentVariation.exp,
        difficulty
      })
    }
  }

  return questions
}
