import type { MathTestQuestion } from './mathSection1Tests'

interface DisciplineSubjectInfo {
  name: string
  focus: string
  keyTerms: string[]
  sampleQuestionTopics: Array<{
    q: string
    options: [string, string, string, string]
    correctIndex: number
    explanation: string
  }>
}

const DISCIPLINE_DATA: Record<string, DisciplineSubjectInfo> = {
  cs: {
    name: "Комп'ютерні системи",
    focus: "Апаратна архітектура, планувальник ОС, пам'ять та низькорівнева взаємодія",
    keyTerms: ["Фон Нейман", "Регістри", "Кеш L1/L2/L3", "Віртуальна пам'ять", "Syscalls", "М'ютекси", "Сокети", "Конвеєр"],
    sampleQuestionTopics: [
      {
        q: "Який ключовий принцип архітектури фон Неймана відрізняє її від Гарвардської архітектури?",
        options: [
          "Спільна пам'ять для команд (коду програми) та для даних",
          "Фізичне розділення шини інструкцій та шини даних",
          "Відсутність лічильника команд (Instruction Pointer)",
          "Використання виключно асинхронних тактових генераторів"
        ],
        correctIndex: 0,
        explanation: "В архітектурі фон Неймана програми та дані зберігаються в одному адресному просторі оперативної пам'яті, що створює так зване 'вузьке місце фон Неймана' (Von Neumann Bottleneck). У Гарвардській архітектурі пам'ять коду та даних фізично розділена."
      },
      {
        q: "Чому багаторівневий кеш CPU (L1, L2, L3) організовано за принципом ієрархії, а не як один великий швидкий кеш?",
        options: [
          "Через фізичні обмеження швидкості світла, площі кристала та експоненційне зростання вартості надшвидкої пам'яті SRAM",
          "Через вимоги протоколу TCP/IP до адресації пам'яті",
          "Тому що L3 кеш використовує DRAM, а L1 використовує жорсткий диск",
          "Щоб запобігти перегріванню шини PCI-Express"
        ],
        correctIndex: 0,
        explanation: "L1 кеш розташований найближче до обчислювальних блоків і працює за 1-4 такти, але займає багато місця на кремнії. L2 і L3 більші, але дещо повільніші, що забезпечує ідеальний компроміс між вартістю кристала, затримкою та ємністю."
      },
      {
        q: "Що відбувається під час перемикання контексту (Context Switch) між двома процесами в ОС?",
        options: [
          "Збереження регістрів процесора, скидання або зміна таблиць сторінок CR3 (TLB flush) та відновлення стану іншого процесу",
          "Повне перезавантаження ядра операційної системи",
          "Очищення всього вмісту оперативної пам'яті",
          "Зміна MAC-адреси мережевого адаптера"
        ],
        correctIndex: 0,
        explanation: "При зміні контексту процесу ядро ОС зберігає PCB (Process Control Block), регістри, покажчик стека, а також перемикає таблиці віртуальної пам'яті через регістр CR3, що призводить до інвалідації TLB і є відносно ресурсомісткою операцією."
      },
      {
        q: "У чому полягає різниця між системним викликом (Syscall) та звичайним викликом функції бібліотеки?",
        options: [
          "Syscall викликає перехід з простору користувача (User Space) у простір ядра (Kernel Space) через апаратне переривання або інструкцію syscall/sysenter",
          "Syscall виконується лише у JavaScript браузері",
          "Виклик функції бібліотеки завжди потребує прав root/administrator",
          "Різниці немає, це синоніми"
        ],
        correctIndex: 0,
        explanation: "Звичайна функція виконується в кільці захисту Ring 3. Щоб звернутися до заліза (диск, мережа, пам'ять), потрібен перехід у захищене кільце Ring 0 (ядро) через механізм системного виклику."
      }
    ]
  },
  sec: {
    name: "Прикладна кібербезпека",
    focus: "Secure SDLC, криптографія, аудит коду та безпека хмарних середовищ",
    keyTerms: ["STRIDE", "SAST", "DAST", "SQLi", "XSS", "OAuth2", "JWT", "Zero Trust"],
    sampleQuestionTopics: [
      {
        q: "Яка модель загроз класифікує загрози на Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service та Elevation of Privilege?",
        options: ["STRIDE", "DREAD", "PASTA", "OCTAVE"],
        correctIndex: 0,
        explanation: "STRIDE — розроблена Microsoft методологія класифікації загроз безпеки програмного забезпечення на етапі архітектурного проєктування."
      },
      {
        q: "У чому полягає фундаментальна різниця між SAST (Static Application Security Testing) та DAST (Dynamic)?",
        options: [
          "SAST аналізує вихідний код без його запуску (White-box), а DAST тестує працюючий застосунок зовні (Black-box)",
          "SAST перевіряє тільки паролі, а DAST перевіряє SSL сертифікати",
          "DAST виконується компілятором, а SAST виконується браузером",
          "SAST використовується лише для апаратного забезпечення"
        ],
        correctIndex: 0,
        explanation: "SAST сканує вихідний код, конфігурації та шукає вразливості на ранніх етапах, тоді як DAST імітує атаки хакера на запущене production/staging оточення."
      }
    ]
  },
  algo: {
    name: "Розробка й аналіз алгоритмів",
    focus: "Асимптотичний аналіз, динамічне програмування, графічні алгоритми та структури даних",
    keyTerms: ["Big-O", "Master Theorem", "DP Memoization", "Dijkstra", "AVL-дерево", "Куча", "Жадібні алгоритми"],
    sampleQuestionTopics: [
      {
        q: "Яка часова складність пошуку та вставки в збалансованому двійковому дереві пошуку (AVL або Red-Black Tree)?",
        options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"],
        correctIndex: 0,
        explanation: "Завдяки автоматичному балансуванню висота дерева гарантовано підтримується на рівні O(log n), що гарантує O(log n) для пошуку, вставки та видалення в найгіршому випадку."
      },
      {
        q: "У чому відмінність між підходами динамічного програмування Top-Down (з мемоізацією) та Bottom-Up (табуляцією)?",
        options: [
          "Top-Down використовує рекурсію зі збереженням проміжних результатів у хеш-таблиці/масиві, а Bottom-Up заповнює таблицю ітеративно від базових випадків",
          "Top-Down працює за лінійний час, а Bottom-Up за експоненційний",
          "Top-Down не потребує додаткової пам'яті",
          "Bottom-Up застосовується лише для сортування масивів"
        ],
        correctIndex: 0,
        explanation: "Top-Down йде від загальної задачі до підзадач через рекурсію, тоді як Bottom-Up ітеративно рахує найменші підзадачі без накладних витрат на глибину стека викликів."
      }
    ]
  },
  go: {
    name: "Основи мови Go",
    focus: "Синтаксис, покажчики, горутини, канали та конкурентність",
    keyTerms: ["Goroutines", "Channels", "Mutex", "Select", "Escape Analysis", "Slices"],
    sampleQuestionTopics: [
      {
        q: "Що відбувається під час надсилання повідомлення в небуферизований канал (unbuffered channel) у Go?",
        options: [
          "Горутина-відправник блокується, доки інша горутина не виконає читання з цього каналу",
          "Повідомлення негайно скидається на диск",
          "Горутина аварійно завершується з panic",
          "Повідомлення зберігається в черзі пам'яті довільного розміру"
        ],
        correctIndex: 0,
        explanation: "Небуферизовані канали забезпечують синхронну комунікацію (rendezvous): відправка блокується доти, доки отримувач не буде готовий прийняти дані."
      },
      {
        q: "Як планувальник Go (Go Scheduler) керує горутинами за моделлю M:N?",
        options: [
          "Мультиплексує N горутин на M потоків операційної системи за допомогою P (логічних процесорів) з технологією Work Stealing",
          "Створює новий потік ядра ОС на кожне ключове слово 'go'",
          "Використовує виключно кооперативну багатозадачність без витіснення",
          "Передає всі задачі системній черзі Windows / Linux безпосередньо"
        ],
        correctIndex: 0,
        explanation: "Модель GMP (Goroutine, Machine/Thread, Processor) дозволяє легко створювати сотні тисяч горутин, а техніка Work Stealing забирає задачі з черг інших процесорів при їх простоюванні."
      }
    ]
  },
  rust: {
    name: "Системне програмування на Rust",
    focus: "Ownership, Borrow Checker, Lifetimes, безпека пам'яті та системний рівень",
    keyTerms: ["Ownership", "Borrowing", "&mut", "Lifetimes", "Arc", "Mutex", "Unsafe", "Traits"],
    sampleQuestionTopics: [
      {
        q: "Яке з наведених правил є основним фундаментальним правилом володіння (Ownership) у Rust?",
        options: [
          "Кожне значення в Rust має рівно одного власника (змінну), і коли власник виходить з області видимості, пам'ять звільняється",
          "Значення можуть одночасно належати кільком змінним без обмежень",
          "Пам'ять звільняється лише за командою спеціального Garbage Collector кожні 10 мс",
          "Усі змінні за замовчуванням є глобальними та мутабельними"
        ],
        correctIndex: 0,
        explanation: "Система власності Rust гарантує звільнення пам'яті під час виходу з області видимості (RAII) без збирача сміття, виключаючи подвійне звільнення (double free) та витоки."
      },
      {
        q: "Скільки мутабельних посилань (&mut T) на одну ділянку даних дозволяє Borrow Checker одночасно в одній області видимості?",
        options: [
          "Рівно одне, і за умови відсутності будь-яких незмінних посилань (&T)",
          "Необмежену кількість",
          "Скільки ядер у процесора",
          "До 256 посилань"
        ],
        correctIndex: 0,
        explanation: "Правило аліасингу (Aliasing XOR Mutability): ви можете мати або довільну кількість незмінних посилань, або рівно одне мутабельне посилання. Це запобігає гонкам даних (Data Races) на етапі компіляції."
      }
    ]
  }
};

export function getUniversityQuestions(
  nodeId: string,
  nodeTitle: string,
  roadmapTitle: string
): MathTestQuestion[] {
  const parts = nodeId.split('_');
  const prefix = parts[0];
  const sectionNum = parseInt(parts[1] || '1', 10);
  const subNum = parseInt(parts[2] || '1', 10);

  const subjectInfo = DISCIPLINE_DATA[prefix] || {
    name: roadmapTitle,
    focus: "Професійне володіння стеком технологій від новачка до архітектора",
    keyTerms: ["Архітектура", "Продуктивність", "Безпека", "Оптимізація", "Тестування", "Production"],
    sampleQuestionTopics: []
  };

  const questions: MathTestQuestion[] = [];
  const baseSeed = (sectionNum * 31 + subNum * 17);

  // Generate exactly 30 high-yield questions for this specific topic
  for (let i = 1; i <= 30; i++) {
    const qSeed = baseSeed + i * 13;
    let questionText = "";
    let options: [string, string, string, string] = [
      "", "", "", ""
    ];
    let correctIdx = (qSeed % 4);
    let explanation = "";
    let hint = "";

    // Specific domain customized questions
    if (i <= subjectInfo.sampleQuestionTopics.length) {
      const sample = subjectInfo.sampleQuestionTopics[i - 1];
      questionText = `[${nodeTitle}] ${sample.q}`;
      options = [...sample.options];
      correctIdx = sample.correctIndex;
      explanation = sample.explanation;
      hint = `Зверніть увагу на базові архітектурні принципи ${subjectInfo.name}.`;
    } else {
      // Dynamic generation based on depth level
      const termA = subjectInfo.keyTerms[(i * 3) % subjectInfo.keyTerms.length];
      const termB = subjectInfo.keyTerms[(i * 5 + 1) % subjectInfo.keyTerms.length];

      if (i <= 6) {
        // Zero Level: Fundamentals & Definitions
        questionText = `Тест ${i} (Основи): Яке головне призначення концепції «${nodeTitle}» у контексті дисципліни ${subjectInfo.name}?`;
        const correctOpt = `Забезпечення детермінованої роботи, масштабованості та ізоляції в рамках ${termA}.`;
        const wrongOpts = [
          `Повне вимкнення валідації типів для збільшення швидкості вводу коду.`,
          `Створення монолітної залежності без можливості тестування.`,
          `Ігнорування протоколів передачі даних на користь прямого доступу до BIOS.`
        ];
        options[correctIdx] = correctOpt;
        let wIdx = 0;
        for (let j = 0; j < 4; j++) {
          if (j !== correctIdx) {
            options[j] = wrongOpts[wIdx++];
          }
        }
        explanation = `На базовому рівні ${nodeTitle} забезпечує фундаментальний контракт системи: передбачуваність стану та інтеграцію з ${termA}.`;
        hint = `Орієнтуйтеся на класичні стандарти інженерії та принципи чистої архітектури.`;
      } else if (i <= 14) {
        // Core Level: Mechanics & Under the hood
        questionText = `Тест ${i} (Внутрішній устрій): Як на низькому рівні реалізовано взаємодію між компонентами у темі «${nodeTitle}»?`;
        const correctOpt = `Через структуровані черги буферизації або системні виклики з перевіркою цілісності пам'яті та ${termA}.`;
        const wrongOpts = [
          `Шляхом неконтрольованого запису в стек процесора без синхронізації.`,
          `За допомогою періодичного опитування (busy polling) з 100% завантаженням CPU.`,
          `Через пряму модифікацію бінарного файлу програми під час її виконання.`
        ];
        options[correctIdx] = correctOpt;
        let wIdx = 0;
        for (let j = 0; j < 4; j++) {
          if (j !== correctIdx) {
            options[j] = wrongOpts[wIdx++];
          }
        }
        explanation = `У сучасних системах передача керування вимагає чіткої буферизації та захисту від Race Conditions з урахуванням ${termA}.`;
        hint = `Згадайте як операційна система керує I/O та виділенням ресурсів.`;
      } else if (i <= 22) {
        // Practical Level: Code, CLI & Benchmarks
        questionText = `Тест ${i} (Практика): Яка асимптотична складність або поведінка очікується при масштабуванні ${nodeTitle} під навантаженням?`;
        const correctOpt = `Асимптотика O(1) або O(log n) завдяки індексації, кешуванню та ефективній роботі з ${termB}.`;
        const wrongOpts = [
          `Експоненційне зростання O(2^n) як обов'язковий стандарт галузі.`,
          `Падіння пропускної здатності до нуля через дедлоки у перші 100 мілісекунд.`,
          `Фіксована затримка 10 секунд на кожен мережевий пакет.`
        ];
        options[correctIdx] = correctOpt;
        let wIdx = 0;
        for (let j = 0; j < 4; j++) {
          if (j !== correctIdx) {
            options[j] = wrongOpts[wIdx++];
          }
        }
        explanation = `Грамотно спроєктований алгоритм у темі ${nodeTitle} мінімізує обхід пам'яті та утримує накладні витрати на рівні O(1) / O(log n).`;
        hint = `Подумайте про зв'язок між індексами, кешами та затримкою (Latency).`;
      } else {
        // Pro Level: Security, Failure modes & Architecture
        questionText = `Тест ${i} (Senior Pro): Який архітектурний патерн або запобіжник є ключовим для запобігання збоям у модулі «${nodeTitle}»?`;
        const correctOpt = `Застосування Circuit Breaker, таймаутів, обмеження швидкості (Rate Limiting) та принципу Least Privilege.`;
        const wrongOpts = [
          `Вимкнення всіх перевірок автентифікації під час високого навантаження.`,
          `Збільшення пулу з'єднань до нескінченності без моніторингу витоків пам'яті.`,
          `Збереження паролів та токенів у відкритому вигляді у логах додатку.`
        ];
        options[correctIdx] = correctOpt;
        let wIdx = 0;
        for (let j = 0; j < 4; j++) {
          if (j !== correctIdx) {
            options[j] = wrongOpts[wIdx++];
          }
        }
        explanation = `На рівні Senior архітектури стабільність забезпечується комбінацією лімітів швидкості, ізоляції відмов (Bulkhead) та відсікання збійних вузлів.`;
        hint = `Оцініть патерни стійкості розподілених систем та безпеку Secure SDLC.`;
      }
    }

    questions.push({
      id: i,
      topicId: nodeId,
      topicTitle: nodeTitle,
      difficulty: i <= 8 ? 'Легкий' : i <= 20 ? 'Середній' : 'Складний',
      question: questionText,
      options,
      correctIndex: correctIdx,
      explanation
    });
  }

  return questions;
}
