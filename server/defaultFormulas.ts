// Pre-built Mathematical Formulas Library for NoteHub Formulas Vault
// Categories: 'machine-learning' | 'calculus' | 'linear-algebra' | 'statistics' | 'algebra' | 'trigonometry' | 'finance' | 'physics' | 'discrete-math'

export interface DefaultFormulaItem {
  title: string
  category: string
  latex: string
  expression: string
  variables: Array<{
    name: string
    label?: string
    defaultValue: number | string
    type?: 'number' | 'vector' | 'matrix'
    min?: number
    max?: number
    step?: number
    unit?: string
    description?: string
  }>
  description: string
  example?: string
  tags: string[]
  isFavorite?: boolean
}

export const DEFAULT_FORMULAS: DefaultFormulaItem[] = [
  // --- MACHINE LEARNING & DATA SCIENCE ---
  {
    title: 'Сигмоїдна функція активації (Sigmoid)',
    category: 'machine-learning',
    latex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}',
    expression: 'sigmoid(z)',
    variables: [
      { name: 'z', label: 'Вхідне значення (Logit)', defaultValue: 1.5, min: -10, max: 10, step: 0.1, description: 'Логіт або лінійна комбінація ознак' }
    ],
    description: 'Переводить будь-яке дійсне число в діапазон ймовірностей $(0, 1)$. Фундаментальна функція активації в логістичній регресії та бінарній класифікації нейромереж.',
    example: 'При $z = 0$, $\\sigma(0) = 0.5$. При $z = 2$, $\\sigma(2) \\approx 0.8808$.',
    tags: ['machine-learning', 'activation', 'neural-networks', 'deep-learning'],
    isFavorite: true,
  },
  {
    title: 'Середньоквадратична помилка (MSE Loss)',
    category: 'machine-learning',
    latex: '\\text{MSE} = \\frac{1}{n} \\sum_{i=1}^n (y_i - \\hat{y}_i)^2',
    expression: 'mse(y_true, y_pred)',
    variables: [
      { name: 'y_true', label: 'Істинні значення (y)', defaultValue: '[3.0, -0.5, 2.0, 7.0]', type: 'vector', description: 'Вектор реальних значень таргету' },
      { name: 'y_pred', label: 'Передбачені значення (ŷ)', defaultValue: '[2.5, 0.0, 2.1, 7.8]', type: 'vector', description: 'Вектор передбачень моделі' }
    ],
    description: 'Класична функція втрат у задачах регресії. Штрафує великі відхилення сильніше через піднесення різниці до квадрата.',
    example: 'y_true = [1, 2, 3], y_pred = [1.2, 1.9, 3.1] => MSE = 0.02',
    tags: ['machine-learning', 'loss-functions', 'regression', 'metrics'],
    isFavorite: true,
  },
  {
    title: 'Бінарна крос-ентропія (Binary Cross-Entropy Loss)',
    category: 'machine-learning',
    latex: '\\mathcal{L} = -\\frac{1}{n} \\sum_{i=1}^n [y_i \\ln(\\hat{p}_i) + (1 - y_i) \\ln(1 - \\hat{p}_i)]',
    expression: 'crossEntropy(y_true, y_pred)',
    variables: [
      { name: 'y_true', label: 'Істинні класи (0 або 1)', defaultValue: '[1, 0, 1, 1]', type: 'vector' },
      { name: 'y_pred', label: 'Передбачені ймовірності (0..1)', defaultValue: '[0.9, 0.15, 0.8, 0.65]', type: 'vector' }
    ],
    description: 'Стандартна функція втрат для оптимізації моделей бінарної класифікації (Log Loss). Вимірює розбіжність між істинним розподілом і передбаченим.',
    example: 'y_true = [1], y_pred = [0.9] => Loss = -ln(0.9) ≈ 0.105',
    tags: ['machine-learning', 'loss-functions', 'classification'],
    isFavorite: false,
  },
  {
    title: 'Косинусна подібність векторів (Cosine Similarity)',
    category: 'machine-learning',
    latex: '\\text{CosineSim}(\\mathbf{u}, \\mathbf{v}) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\| \\|\\mathbf{v}\\|}',
    expression: 'cosineSim(u, v)',
    variables: [
      { name: 'u', label: 'Вектор U (Embeddings)', defaultValue: '[1.0, 2.0, 3.0]', type: 'vector' },
      { name: 'v', label: 'Вектор V (Embeddings)', defaultValue: '[2.0, 4.0, 5.0]', type: 'vector' }
    ],
    description: 'Вимірює косинус кута між двома багатовимірними векторами (ембеддінгами). Використовується в пошукових системах, RAG та семантичному порівнянні тексту.',
    example: 'Для співнапрямлених векторів CosineSim = 1.0; для ортогональних = 0.0.',
    tags: ['machine-learning', 'embeddings', 'nlp', 'vectors', 'similarity'],
    isFavorite: true,
  },
  {
    title: 'Евклідова відстань у просторі (Euclidean Distance)',
    category: 'machine-learning',
    latex: 'd(\\mathbf{p}, \\mathbf{q}) = \\sqrt{\\sum_{i=1}^n (p_i - q_i)^2}',
    expression: 'euclidean(p, q)',
    variables: [
      { name: 'p', label: 'Точка P (координати)', defaultValue: '[1, 2, 5]', type: 'vector' },
      { name: 'q', label: 'Точка Q (координати)', defaultValue: '[4, 6, 5]', type: 'vector' }
    ],
    description: 'Геометрична довжина відрізка між двома точками в $n$-вимірному просторі. Лежить в основі KNN, K-Means та метричних алгоритмів.',
    example: 'P = [0, 0], Q = [3, 4] => d = 5',
    tags: ['machine-learning', 'geometry', 'distance', 'clustering'],
    isFavorite: false,
  },
  {
    title: 'Функція активації ReLU (Rectified Linear Unit)',
    category: 'machine-learning',
    latex: 'f(x) = \\max(0, x)',
    expression: 'relu(x)',
    variables: [
      { name: 'x', label: 'Вхідне значення x', defaultValue: 3.5, step: 0.1 }
    ],
    description: 'Найпопулярніша функція активації у глибоких нейромережах (CNN, Transformer). Усуває проблему згасання градієнтів для додатних значень.',
    example: 'relu(-5) = 0; relu(4.2) = 4.2',
    tags: ['machine-learning', 'activation', 'neural-networks'],
    isFavorite: false,
  },
  {
    title: 'Функція Softmax (Нормалізація розподілу)',
    category: 'machine-learning',
    latex: 'P(y=i) = \\frac{e^{z_i}}{\\sum_{j=1}^K e^{z_j}}',
    expression: 'softmax(z)',
    variables: [
      { name: 'z', label: 'Вектор логітів z', defaultValue: '[2.0, 1.0, 0.1]', type: 'vector' }
    ],
    description: 'Перетворює довільний вектор логітів у ймовірнісний розподіл над класами (сума всіх компонентів дорівнює 1). Застосовується у фінальному шарі багатокласової класифікації.',
    example: 'z = [2.0, 1.0, 0.1] => [0.659, 0.242, 0.099]',
    tags: ['machine-learning', 'activation', 'probability', 'classification'],
    isFavorite: false,
  },

  // --- CALCULUS & NUMERICAL ANALYSIS ---
  {
    title: 'Чисельна похідна функції (Central Difference)',
    category: 'calculus',
    latex: "f'(x) \\approx \\frac{f(x + h) - f(x - h)}{2h}",
    expression: 'diff("x^3 - 3*x^2 + 2", x, 1e-5)',
    variables: [
      { name: 'x', label: 'Точка диференціювання x', defaultValue: 2.0, step: 0.1 }
    ],
    description: 'Високоточна центральна різниця другого порядку для чисельного розрахунку миттєвої швидкості зміни функції $f(x)$ у заданій точці.',
    example: 'f(x) = x^3 - 3x^2 + 2, f\'(x) = 3x^2 - 6x. У точці x = 2: 3(4) - 12 = 0.',
    tags: ['calculus', 'derivatives', 'numerical-analysis'],
    isFavorite: true,
  },
  {
    title: 'Чисельний визначений інтеграл (Формула Сімпсона)',
    category: 'calculus',
    latex: '\\int_a^b f(x) dx \\approx \\frac{h}{3} [f(a) + 4\\sum f(x_{odd}) + 2\\sum f(x_{even}) + f(b)]',
    expression: 'integrate("sin(x)", a, b, 1000)',
    variables: [
      { name: 'a', label: 'Нижня межа інтегрування (a)', defaultValue: 0, step: 0.1 },
      { name: 'b', label: 'Верхня межа інтегрування (b)', defaultValue: 3.14159265, step: 0.1 }
    ],
    description: 'Чисельне обчислення площі під кривою методом Сімпсона (параболічна апроксимація). Забезпечує надзвичайно високу точність $O(h^4)$.',
    example: 'Інтеграл від sin(x) на [0, π] дорівнює точно 2.0.',
    tags: ['calculus', 'integrals', 'simpson-rule', 'numerical-analysis'],
    isFavorite: true,
  },
  {
    title: 'Крок градієнтного спуску (Gradient Descent Step)',
    category: 'calculus',
    latex: '\\theta_{k+1} = \\theta_k - \\eta \\cdot \\nabla f(\\theta_k)',
    expression: 'theta - eta * grad',
    variables: [
      { name: 'theta', label: 'Поточний параметр (θ_k)', defaultValue: 5.0 },
      { name: 'eta', label: 'Швидкість навчання (Learning Rate η)', defaultValue: 0.1, min: 0.0001, max: 1.0, step: 0.01 },
      { name: 'grad', label: 'Значення градієнта ∇f', defaultValue: 8.0 }
    ],
    description: 'Основа алгоритму оптимізації ваг у машинному навчанні та нейронних мережах. Зміщує параметри у напрямку, протилежному до градієнта.',
    example: 'θ = 5.0, η = 0.1, grad = 8.0 => θ_next = 5.0 - 0.8 = 4.2',
    tags: ['calculus', 'optimization', 'gradient-descent', 'machine-learning'],
    isFavorite: false,
  },
  {
    title: 'Пошук кореня рівняння (Метод Ньютона-Рафсона)',
    category: 'calculus',
    latex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}',
    expression: 'newtonRoot("x^2 - 2", x0)',
    variables: [
      { name: 'x0', label: 'Початкове наближення (x0)', defaultValue: 1.0 }
    ],
    description: 'Ітераційний чисельний алгоритм із квадратичною швидкістю збіжності для знаходження нулів нелінійних функцій $f(x) = 0$.',
    example: 'Для x^2 - 2 = 0 метод знаходить √2 ≈ 1.41421356 за 4 ітерації.',
    tags: ['calculus', 'root-finding', 'newton-method'],
    isFavorite: false,
  },

  // --- LINEAR ALGEBRA ---
  {
    title: 'Скалярний добуток векторів (Dot Product)',
    category: 'linear-algebra',
    latex: '\\mathbf{a} \\cdot \\mathbf{b} = \\sum_{i=1}^n a_i b_i = \\|\\mathbf{a}\\| \\|\\mathbf{b}\\| \\cos(\\theta)',
    expression: 'dot(a, b)',
    variables: [
      { name: 'a', label: 'Вектор a', defaultValue: '[1, 3, -5]', type: 'vector' },
      { name: 'b', label: 'Вектор b', defaultValue: '[4, -2, -1]', type: 'vector' }
    ],
    description: 'Базова операція векторної алгебри: сума добутків відповідних координат. Якщо добуток дорівнює нулю — вектори перпендикулярні (ортогональні).',
    example: '[1, 3, -5] · [4, -2, -1] = 4 - 6 + 5 = 3',
    tags: ['linear-algebra', 'vectors', 'dot-product'],
    isFavorite: true,
  },
  {
    title: 'Векторний добуток 3D векторів (Cross Product)',
    category: 'linear-algebra',
    latex: '\\mathbf{a} \\times \\mathbf{b} = (a_y b_z - a_z b_y, \\; a_z b_x - a_x b_z, \\; a_x b_y - a_y b_x)',
    expression: 'cross(a, b)',
    variables: [
      { name: 'a', label: 'Вектор a (3D)', defaultValue: '[1, 0, 0]', type: 'vector' },
      { name: 'b', label: 'Вектор b (3D)', defaultValue: '[0, 1, 0]', type: 'vector' }
    ],
    description: 'Повертає вектор, що є строго перпендикулярним до площини обох вихідних векторів. Довжина дорівнює площі натягнутого паралелограма.',
    example: '[1, 0, 0] × [0, 1, 0] = [0, 0, 1]',
    tags: ['linear-algebra', 'vectors', 'cross-product', 'physics'],
    isFavorite: false,
  },
  {
    title: 'Визначник квадратної матриці (Determinant)',
    category: 'linear-algebra',
    latex: '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc',
    expression: 'det(M)',
    variables: [
      { name: 'M', label: 'Матриця M (2x2 або 3x3)', defaultValue: '[[3, 8], [4, 6]]', type: 'matrix' }
    ],
    description: 'Скалярна характеристика лінійного оператора. Показує, у скільки разів змінюється об\'єм простору при перетворенні. Якщо det = 0, матриця невироджена.',
    example: 'det([[3, 8], [4, 6]]) = 3*6 - 8*4 = 18 - 32 = -14',
    tags: ['linear-algebra', 'matrices', 'determinant'],
    isFavorite: true,
  },
  {
    title: 'Обернена матриця 2x2 (Matrix Inverse)',
    category: 'linear-algebra',
    latex: 'A^{-1} = \\frac{1}{\\det(A)} \\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
    expression: 'inv(A)',
    variables: [
      { name: 'A', label: 'Матриця A (2x2)', defaultValue: '[[4, 7], [2, 6]]', type: 'matrix' }
    ],
    description: 'Матриця, добуток якої на вихідну дає одиничну матрицю: $A \\cdot A^{-1} = I$. Необхідна для аналітичного розв\'язку СЛАР $Ax = b \\implies x = A^{-1}b$.',
    example: 'A = [[4, 7], [2, 6]], det = 10 => A^-1 = [[0.6, -0.7], [-0.2, 0.4]]',
    tags: ['linear-algebra', 'matrices', 'inverse'],
    isFavorite: false,
  },
  {
    title: 'Кут між двома векторами (Angle between vectors)',
    category: 'linear-algebra',
    latex: '\\theta = \\arccos\\left(\\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\| \\|\\mathbf{v}\\|}\\right)',
    expression: 'angle(u, v, true)',
    variables: [
      { name: 'u', label: 'Вектор U', defaultValue: '[1, 0]', type: 'vector' },
      { name: 'v', label: 'Вектор V', defaultValue: '[1, 1]', type: 'vector' }
    ],
    description: 'Розраховує кут між двома векторами в градусах (°).',
    example: 'u = [1, 0], v = [1, 1] => кут 45°',
    tags: ['linear-algebra', 'vectors', 'geometry', 'trigonometry'],
    isFavorite: false,
  },

  // --- PROBABILITY & STATISTICS ---
  {
    title: 'Формула Байєса (Bayes\' Theorem)',
    category: 'statistics',
    latex: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    expression: 'bayes(priorA, pB_given_A, pB)',
    variables: [
      { name: 'priorA', label: 'Апріорна ймовірність P(A)', defaultValue: 0.01, min: 0, max: 1, step: 0.001, description: 'Базова частота явища у популяції' },
      { name: 'pB_given_A', label: 'Чутливість тесту P(B|A)', defaultValue: 0.95, min: 0, max: 1, step: 0.01, description: 'Ймовірність позитивного тесту при наявності стану' },
      { name: 'pB', label: 'Повна ймовірність тесту P(B)', defaultValue: 0.05, min: 0.0001, max: 1, step: 0.01, description: 'Загальна частка позитивних тестів' }
    ],
    description: 'Оновлює ймовірність гіпотези A після отримання нового факту B. Фундамент баєсівського виведення, A/B тестування та медичної діагностики.',
    example: 'Рідкісна хвороба 1% (prior=0.01), тест точний на 95%, 5% хибнопозитивних => P(Хворий | Тест+) = 19%.',
    tags: ['statistics', 'probability', 'bayes', 'data-science'],
    isFavorite: true,
  },
  {
    title: 'Нормальний розподіл (Гаусіана / Gaussian PDF)',
    category: 'statistics',
    latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{(x - \\mu)^2}{2\\sigma^2}}',
    expression: 'normPdf(x, mu, sigma)',
    variables: [
      { name: 'x', label: 'Точка x', defaultValue: 0.0, step: 0.1 },
      { name: 'mu', label: 'Математичне сподівання (μ)', defaultValue: 0.0, step: 0.1 },
      { name: 'sigma', label: 'Стандартне відхилення (σ)', defaultValue: 1.0, min: 0.01, step: 0.1 }
    ],
    description: 'Щільність імовірності класичного дзвоноподібного розподілу Гауса. Описує випадкові величини, сформовані сумою багатьох незалежних факторів (ЦГТ).',
    example: 'При μ=0, σ=1 у точці x=0 значення f(0) ≈ 0.3989.',
    tags: ['statistics', 'probability', 'distributions', 'normal-distribution'],
    isFavorite: true,
  },
  {
    title: 'Дисперсія та стандартне відхилення (Variance & StDev)',
    category: 'statistics',
    latex: '\\sigma^2 = \\frac{1}{n} \\sum_{i=1}^n (x_i - \\bar{x})^2, \\quad \\sigma = \\sqrt{\\sigma^2}',
    expression: 'stdev(data, false)',
    variables: [
      { name: 'data', label: 'Вибірка даних', defaultValue: '[10, 12, 23, 23, 16, 23, 21, 16]', type: 'vector' }
    ],
    description: 'Міра розсіювання значень навколо середнього арифметичного. Показує ступінь варіативності або стабільності процесу.',
    example: '[2, 4, 4, 4, 5, 5, 7, 9] => Mean = 5, StDev = 2.0',
    tags: ['statistics', 'descriptive-statistics', 'variance', 'stdev'],
    isFavorite: false,
  },
  {
    title: 'Коефіцієнт кореляції Пірсона (Pearson Correlation)',
    category: 'statistics',
    latex: 'r = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sqrt{\\sum(x_i - \\bar{x})^2 \\sum(y_i - \\bar{y})^2}}',
    expression: 'corr(x, y)',
    variables: [
      { name: 'x', label: 'Змінна X', defaultValue: '[1, 2, 3, 4, 5]', type: 'vector' },
      { name: 'y', label: 'Змінна Y', defaultValue: '[2, 4, 5, 4, 5]', type: 'vector' }
    ],
    description: 'Показує силу та напрям лінійного взаємозв\'язку між двома змінними в межах від -1 (суворо обернений) до +1 (суворо прямий). 0 — лінійний зв\'язок відсутній.',
    example: 'X = [1, 2, 3], Y = [2, 4, 6] => r = 1.0 (ідеальна пряма залежність)',
    tags: ['statistics', 'correlation', 'data-analysis'],
    isFavorite: false,
  },
  {
    title: 'Число сполук (Комбінаторика nCr)',
    category: 'statistics',
    latex: 'C_n^k = \\binom{n}{k} = \\frac{n!}{k!(n - k)!}',
    expression: 'comb(n, k)',
    variables: [
      { name: 'n', label: 'Загальна кількість елементів (n)', defaultValue: 10, min: 0, step: 1 },
      { name: 'k', label: 'Кількість обраних (k)', defaultValue: 3, min: 0, step: 1 }
    ],
    description: 'Кількість способів вибрати $k$ елементів із множини в $n$ елементів без урахування порядку.',
    example: 'C(10, 3) = 120 способів вибрати 3 людини в команду з 10.',
    tags: ['statistics', 'combinatorics', 'discrete-math'],
    isFavorite: false,
  },

  // --- ALGEBRA & GEOMETRY ---
  {
    title: 'Квадратне рівняння (Дискримінант та корені)',
    category: 'algebra',
    latex: 'x_{1,2} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\quad D = b^2 - 4ac',
    expression: 'b^2 - 4*a*c >= 0 ? [(-b + sqrt(b^2 - 4*a*c))/(2*a), (-b - sqrt(b^2 - 4*a*c))/(2*a)] : "Комплексні корені"',
    variables: [
      { name: 'a', label: 'Коефіцієнт a', defaultValue: 1, step: 0.1 },
      { name: 'b', label: 'Коефіцієнт b', defaultValue: -5, step: 0.1 },
      { name: 'c', label: 'Коефіцієнт c', defaultValue: 6, step: 0.1 }
    ],
    description: 'Знаходить дійсні корені квадратного рівняння $ax^2 + bx + c = 0$ через дискримінант.',
    example: 'x^2 - 5x + 6 = 0 => D = 25 - 24 = 1 => корені x1 = 3, x2 = 2.',
    tags: ['algebra', 'equations', 'quadratic', 'roots'],
    isFavorite: true,
  },
  {
    title: 'Теорема Піфагора (Pythagorean Theorem)',
    category: 'algebra',
    latex: 'c = \\sqrt{a^2 + b^2}',
    expression: 'sqrt(a^2 + b^2)',
    variables: [
      { name: 'a', label: 'Катет a', defaultValue: 3, min: 0, step: 0.1, unit: 'см' },
      { name: 'b', label: 'Катет b', defaultValue: 4, min: 0, step: 0.1, unit: 'см' }
    ],
    description: 'Знаходження гіпотенузи прямокутного трикутника за довжинами двох катетів.',
    example: 'a = 3, b = 4 => c = 5 (Єгипетський трикутник)',
    tags: ['algebra', 'geometry', 'pythagoras'],
    isFavorite: false,
  },
  {
    title: 'Площа трикутника за формулою Герона',
    category: 'algebra',
    latex: 'S = \\sqrt{p(p - a)(p - b)(p - c)}, \\quad p = \\frac{a + b + c}{2}',
    expression: 'sqrt(((a+b+c)/2) * (((a+b+c)/2) - a) * (((a+b+c)/2) - b) * (((a+b+c)/2) - c))',
    variables: [
      { name: 'a', label: 'Сторона a', defaultValue: 7, min: 0, step: 0.1 },
      { name: 'b', label: 'Сторона b', defaultValue: 8, min: 0, step: 0.1 },
      { name: 'c', label: 'Сторона c', defaultValue: 9, min: 0, step: 0.1 }
    ],
    description: 'Обчислення площі довільного трикутника, якщо відомі довжини всіх трьох його сторін.',
    example: 'a = 7, b = 8, c = 9 => p = 12 => S ≈ 26.83',
    tags: ['algebra', 'geometry', 'triangle', 'area'],
    isFavorite: false,
  },

  // --- TRIGONOMETRY ---
  {
    title: 'Теорема косинусів (Law of Cosines)',
    category: 'trigonometry',
    latex: 'c = \\sqrt{a^2 + b^2 - 2ab \\cos(\\gamma)}',
    expression: 'sqrt(a^2 + b^2 - 2*a*b*cosd(gamma))',
    variables: [
      { name: 'a', label: 'Сторона a', defaultValue: 5, step: 0.1 },
      { name: 'b', label: 'Сторона b', defaultValue: 7, step: 0.1 },
      { name: 'gamma', label: 'Кут γ між ними (градуси)', defaultValue: 60, min: 0, max: 180, step: 1, unit: '°' }
    ],
    description: 'Узагальнення теореми Піфагора для довільного трикутника. Дозволяє знайти третю сторону за двома сторонами та кутом між ними.',
    example: 'a = 5, b = 7, γ = 60° => c = √(25 + 49 - 35) = √39 ≈ 6.245',
    tags: ['trigonometry', 'geometry', 'cosines'],
    isFavorite: false,
  },

  // --- FINANCE ---
  {
    title: 'Складні відсотки (Compound Interest)',
    category: 'finance',
    latex: 'A = P \\left(1 + \\frac{r}{n}\\right)^{nt}',
    expression: 'compoundInterest(P, r, n, t)',
    variables: [
      { name: 'P', label: 'Початковий капітал (P)', defaultValue: 100000, step: 1000, unit: '₴' },
      { name: 'r', label: 'Річна ставка (r)', defaultValue: 0.12, min: 0, max: 1, step: 0.01, unit: '%/100' },
      { name: 'n', label: 'Нарахувань на рік (n)', defaultValue: 12, min: 1, step: 1, description: '12 - щомісячна капіталізація' },
      { name: 't', label: 'Кількість років (t)', defaultValue: 5, min: 1, step: 1, unit: 'років' }
    ],
    description: 'Розрахунок підсумкової суми депозиту або інвестиції з урахуванням капіталізації накопичених відсотків.',
    example: '100 000 ₴ під 12% річних на 5 років із щомісячною капіталізацією зростуть до ~181 670 ₴.',
    tags: ['finance', 'compound-interest', 'investing'],
    isFavorite: true,
  },
  {
    title: 'Ануїтетний щомісячний платіж по кредиту',
    category: 'finance',
    latex: 'M = P \\cdot \\frac{r(1 + r)^N}{(1 + r)^N - 1}',
    expression: 'loanPayment(P, annualRate, months)',
    variables: [
      { name: 'P', label: 'Сума кредиту (Тіло)', defaultValue: 500000, step: 10000, unit: '₴' },
      { name: 'annualRate', label: 'Річна відсоткова ставка', defaultValue: 0.15, min: 0.01, max: 1.0, step: 0.01 },
      { name: 'months', label: 'Термін кредиту (місяці)', defaultValue: 36, min: 1, max: 360, step: 1, unit: 'міс' }
    ],
    description: 'Розрахунок фіксованого регулярного щомісячного платежу для погашення іпотеки або кредиту.',
    example: 'Кредит 500 000 ₴ під 15% на 36 місяців => щомісячний платіж ≈ 17 332 ₴.',
    tags: ['finance', 'credit', 'mortgage', 'annuity'],
    isFavorite: false,
  },

  // --- PHYSICS ---
  {
    title: 'Еквівалентність маси та енергії (Ейнштейн)',
    category: 'physics',
    latex: 'E = m \\cdot c^2',
    expression: 'm * (299792458)^2',
    variables: [
      { name: 'm', label: 'Маса тіла m', defaultValue: 0.001, min: 0, step: 0.0001, unit: 'кг' }
    ],
    description: 'Фундаментальний закон релятивістської фізики, виведений Альбертом Ейнштейном. Показує, яку колосальну енергію містить навіть мікроскопічна маса.',
    example: '1 грам (0.001 кг) матерії містить ≈ 8.987 × 10^13 Джоулів енергії.',
    tags: ['physics', 'relativity', 'einstein', 'energy'],
    isFavorite: true,
  },
  {
    title: 'Закон всесвітнього тяжіння Ньютона',
    category: 'physics',
    latex: 'F = G \\cdot \\frac{m_1 m_2}{r^2}',
    expression: '6.67430e-11 * (m1 * m2) / (r^2)',
    variables: [
      { name: 'm1', label: 'Маса першого тіла m1', defaultValue: 5.972e24, unit: 'кг (Земля)' },
      { name: 'm2', label: 'Маса другого тіла m2', defaultValue: 70, unit: 'кг (Людина)' },
      { name: 'r', label: 'Відстань між центрами r', defaultValue: 6.371e6, unit: 'м (Радіус Землі)' }
    ],
    description: 'Сила гравітаційного притягання між двома матеріальними точками. Гравітаційна стала $G \\approx 6.6743 \\times 10^{-11} \\text{ Н}\\cdot\\text{м}^2/\\text{кг}^2$.',
    example: 'Для людини 70 кг на поверхні Землі сила тяжіння становить ≈ 686 Ньютонів.',
    tags: ['physics', 'gravity', 'newton'],
    isFavorite: false,
  },
  {
    title: 'Кінетична енергія рухомого тіла',
    category: 'physics',
    latex: 'E_k = \\frac{1}{2} m v^2',
    expression: '0.5 * m * v^2',
    variables: [
      { name: 'm', label: 'Маса тіла m', defaultValue: 1500, min: 0, unit: 'кг (Авто)' },
      { name: 'v', label: 'Швидкість руху v', defaultValue: 27.78, min: 0, unit: 'м/с (100 км/год)' }
    ],
    description: 'Енергія, яку має тіло внаслідок свого механічного поступального руху.',
    example: 'Автомобіль 1500 кг на швидкості 100 км/год (27.8 м/с) несе кінетичну енергію ≈ 578 кДж.',
    tags: ['physics', 'mechanics', 'energy'],
    isFavorite: false,
  },

  // --- DISCRETE MATH & NUMBER THEORY ---
  {
    title: 'Найбільший спільний дільник (НСД / GCD)',
    category: 'discrete-math',
    latex: '\\gcd(a, b) = \\text{max}\\{d \\in \\mathbb{Z} : d|a \\land d|b\\}',
    expression: 'gcd(a, b)',
    variables: [
      { name: 'a', label: 'Число a', defaultValue: 1071, step: 1 },
      { name: 'b', label: 'Число b', defaultValue: 462, step: 1 }
    ],
    description: 'Найбільше натуральне число, на яке діляться без залишку обидва числа $a$ та $b$. Обчислюється за швидким алгоритмом Евкліда.',
    example: 'gcd(1071, 462) = 21',
    tags: ['discrete-math', 'number-theory', 'algorithms'],
    isFavorite: false,
  },
  {
    title: 'Найменше спільне кратне (НСК / LCM)',
    category: 'discrete-math',
    latex: '\\text{lcm}(a, b) = \\frac{|a \\cdot b|}{\\gcd(a, b)}',
    expression: 'lcm(a, b)',
    variables: [
      { name: 'a', label: 'Число a', defaultValue: 12, step: 1 },
      { name: 'b', label: 'Число b', defaultValue: 18, step: 1 }
    ],
    description: 'Найменше спільне кратне двох цілих чисел.',
    example: 'lcm(12, 18) = 36',
    tags: ['discrete-math', 'number-theory'],
    isFavorite: false,
  }
]
