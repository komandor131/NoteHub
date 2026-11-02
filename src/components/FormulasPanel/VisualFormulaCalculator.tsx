import React, { useState, useEffect, useMemo, useCallback } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  Calculator,
  Save,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Activity,
  PieChart,
  Binary,
  Layers,
  Zap,
  Sliders,
  X,
  HelpCircle,
} from 'lucide-react'
import type { Formula, FormulaPayload, FormulaVariable } from '../../types'
import {
  evaluateFormula,
  extractVariablesFromExpression,
  formatMathResult,
  parseVariableInput,
} from '../../utils/mathEngine'
import styles from './VisualFormulaCalculator.module.css'

// ----------------- ACTION DEFINITIONS ("ВИБИРАЄШ ДІЮ ЯКУ ЗРОБИШ") -----------------
export interface MathAction {
  id: string
  label: string // Visual text / KaTeX representation on button
  latexInsert: string // What to insert into LaTeX display
  engineInsert: string // What to insert into computation expression
  desc: string // Tooltip / description
  isFunction?: boolean
  wrapSelected?: boolean
}

export interface ActionCategory {
  id: string
  label: string
  icon: any
  actions: MathAction[]
}

export const CALC_ACTION_CATEGORIES: ActionCategory[] = [
  {
    id: 'basic',
    label: '➗ Дроби & Базові дії',
    icon: Calculator,
    actions: [
      {
        id: 'frac',
        label: '\\frac{a}{b}',
        latexInsert: '\\frac{a}{b}',
        engineInsert: '((a)/(b))',
        desc: 'Звичайний дріб a/b (ділення чисельника на знаменник)',
      },
      {
        id: 'pow',
        label: 'x^y',
        latexInsert: '^{y}',
        engineInsert: '^(y)',
        desc: 'Піднесення до довільного степеня y',
      },
      {
        id: 'sqr',
        label: 'x^2',
        latexInsert: '^{2}',
        engineInsert: '^2',
        desc: 'Квадрат числа (піднесення до 2-го степеня)',
      },
      {
        id: 'cube',
        label: 'x^3',
        latexInsert: '^{3}',
        engineInsert: '^3',
        desc: 'Куб числа (піднесення до 3-го степеня)',
      },
      {
        id: 'sqrt',
        label: '\\sqrt{x}',
        latexInsert: '\\sqrt{x}',
        engineInsert: 'sqrt(x)',
        desc: 'Арифметичний квадратний корінь',
      },
      {
        id: 'nthroot',
        label: '\\sqrt[n]{x}',
        latexInsert: '\\sqrt[n]{x}',
        engineInsert: '(x)^(1/n)',
        desc: 'Корінь n-го степеня з x',
      },
      {
        id: 'abs',
        label: '|x|',
        latexInsert: '|x|',
        engineInsert: 'abs(x)',
        desc: 'Модуль (абсолютна величина числа)',
      },
      {
        id: 'parens',
        label: '( \\dots )',
        latexInsert: '(x)',
        engineInsert: '(x)',
        desc: 'Круглі дужки для групування пріоритету',
      },
      {
        id: 'brackets',
        label: '[ \\dots ]',
        latexInsert: '[x]',
        engineInsert: '[x]',
        desc: 'Квадратні дужки або елементи масиву',
      },
      {
        id: 'fact',
        label: 'n!',
        latexInsert: 'n!',
        engineInsert: 'fact(n)',
        desc: 'Факторіал натурального числа n! = 1 * 2 * ... * n',
      },
      {
        id: 'pct',
        label: '\\%',
        latexInsert: '\\%',
        engineInsert: '/100',
        desc: 'Відсоток від величини',
      },
      {
        id: 'pm',
        label: '\\pm',
        latexInsert: '\\pm ',
        engineInsert: '+',
        desc: 'Плюс-мінус (знак для коренів)',
      },
    ],
  },
  {
    id: 'trig',
    label: '📐 Тригонометрія & Кути',
    icon: Activity,
    actions: [
      {
        id: 'sin',
        label: '\\sin(x)',
        latexInsert: '\\sin(x)',
        engineInsert: 'sin(x)',
        desc: 'Синус кута в радіанах',
      },
      {
        id: 'cos',
        label: '\\cos(x)',
        latexInsert: '\\cos(x)',
        engineInsert: 'cos(x)',
        desc: 'Косинус кута в радіанах',
      },
      {
        id: 'tan',
        label: '\\tan(x)',
        latexInsert: '\\tan(x)',
        engineInsert: 'tan(x)',
        desc: 'Тангенс кута в радіанах',
      },
      {
        id: 'cot',
        label: '\\cot(x)',
        latexInsert: '\\cot(x)',
        engineInsert: 'cot(x)',
        desc: 'Котангенс кута в радіанах',
      },
      {
        id: 'asin',
        label: '\\arcsin(x)',
        latexInsert: '\\arcsin(x)',
        engineInsert: 'asin(x)',
        desc: 'Арксинус (обернена функція синуса)',
      },
      {
        id: 'acos',
        label: '\\arccos(x)',
        latexInsert: '\\arccos(x)',
        engineInsert: 'acos(x)',
        desc: 'Арккосинус',
      },
      {
        id: 'atan',
        label: '\\arctan(x)',
        latexInsert: '\\arctan(x)',
        engineInsert: 'atan(x)',
        desc: 'Арктангенс',
      },
      {
        id: 'sind',
        label: '\\sin^\\circ(d)',
        latexInsert: '\\sin^\\circ(d)',
        engineInsert: 'sind(d)',
        desc: 'Синус кута в градусах',
      },
      {
        id: 'cosd',
        label: '\\cos^\\circ(d)',
        latexInsert: '\\cos^\\circ(d)',
        engineInsert: 'cosd(d)',
        desc: 'Косинус кута в градусах',
      },
      {
        id: 'tand',
        label: '\\tan^\\circ(d)',
        latexInsert: '\\tan^\\circ(d)',
        engineInsert: 'tand(d)',
        desc: 'Тангенс кута в градусах',
      },
      {
        id: 'sinh',
        label: '\\sinh(x)',
        latexInsert: '\\sinh(x)',
        engineInsert: 'sinh(x)',
        desc: 'Гіперболічний синус',
      },
      {
        id: 'cosh',
        label: '\\cosh(x)',
        latexInsert: '\\cosh(x)',
        engineInsert: 'cosh(x)',
        desc: 'Гіперболічний косинус',
      },
      {
        id: 'tanh',
        label: '\\tanh(x)',
        latexInsert: '\\tanh(x)',
        engineInsert: 'tanh(x)',
        desc: 'Гіперболічний тангенс',
      },
    ],
  },
  {
    id: 'logs',
    label: '📉 Логарифми & Експоненти',
    icon: TrendingUp,
    actions: [
      {
        id: 'ln',
        label: '\\ln(x)',
        latexInsert: '\\ln(x)',
        engineInsert: 'ln(x)',
        desc: 'Натуральний логарифм за основою e (≈ 2.71828)',
      },
      {
        id: 'log10',
        label: '\\log_{10}(x)',
        latexInsert: '\\log_{10}(x)',
        engineInsert: 'log10(x)',
        desc: 'Десятковий логарифм за основою 10',
      },
      {
        id: 'log2',
        label: '\\log_2(x)',
        latexInsert: '\\log_2(x)',
        engineInsert: 'log2(x)',
        desc: 'Двійковий логарифм за основою 2 (для IT та теорії інформації)',
      },
      {
        id: 'logb',
        label: '\\log_b(x)',
        latexInsert: '\\log_{b}(x)',
        engineInsert: 'logBase(x, b)',
        desc: 'Логарифм за довільною основою b',
      },
      {
        id: 'exp',
        label: 'e^x',
        latexInsert: 'e^{x}',
        engineInsert: 'exp(x)',
        desc: 'Експоненціальна функція e^x',
      },
      {
        id: 'tenpow',
        label: '10^x',
        latexInsert: '10^{x}',
        engineInsert: '10^(x)',
        desc: 'Степінь 10',
      },
      {
        id: 'twopow',
        label: '2^x',
        latexInsert: '2^{x}',
        engineInsert: '2^(x)',
        desc: 'Степінь 2',
      },
    ],
  },
  {
    id: 'calculus',
    label: '📈 Матаналіз & Інтеграли',
    icon: Sparkles,
    actions: [
      {
        id: 'diff',
        label: '\\frac{d}{dx}f(x)',
        latexInsert: '\\frac{d}{dx}(x^2)',
        engineInsert: 'diff("x^2", x)',
        desc: 'Чисельна перша похідна функції в точці x',
      },
      {
        id: 'diff2',
        label: '\\frac{d^2}{dx^2}f(x)',
        latexInsert: '\\frac{d^2}{dx^2}(x^3)',
        engineInsert: 'diff2("x^3", x)',
        desc: 'Чисельна друга похідна функції в точці x',
      },
      {
        id: 'integrate',
        label: '\\int_a^b f(x)dx',
        latexInsert: '\\int_{a}^{b} x^2 \\, dx',
        engineInsert: 'integrate("x^2", a, b)',
        desc: 'Чисельне інтегрування за квадратурним правилом Сімпсона',
      },
      {
        id: 'sum',
        label: '\\sum_{i=1}^n',
        latexInsert: '\\sum_{i=1}^{n} a_i',
        engineInsert: 'sum([1, 2, 3, 4, 5])',
        desc: 'Сума елементів послідовності',
      },
      {
        id: 'prod',
        label: '\\prod_{i=1}^n',
        latexInsert: '\\prod_{i=1}^{n} a_i',
        engineInsert: 'prod([1, 2, 3, 4, 5])',
        desc: 'Добуток елементів послідовності',
      },
      {
        id: 'root',
        label: '\\text{solve}(f=0)',
        latexInsert: '\\text{root}(x^2 - 4 = 0)',
        engineInsert: 'newtonRoot("x^2 - 4", 1)',
        desc: 'Пошук дійсного кореня рівняння методом Ньютона-Рафсона',
      },
    ],
  },
  {
    id: 'linalg',
    label: '🔢 Вектори & Матриці',
    icon: Binary,
    actions: [
      {
        id: 'dot',
        label: '\\vec{u} \\cdot \\vec{v}',
        latexInsert: '\\vec{u} \\cdot \\vec{v}',
        engineInsert: 'dot(u, v)',
        desc: 'Скалярний добуток векторів: sum(u_i * v_i)',
      },
      {
        id: 'cross',
        label: '\\vec{u} \\times \\vec{v}',
        latexInsert: '\\vec{u} \\times \\vec{v}',
        engineInsert: 'cross(u, v)',
        desc: 'Векторний добуток у 3D просторі',
      },
      {
        id: 'norm',
        label: '\\|\\vec{v}\\|',
        latexInsert: '\\|\\vec{v}\\|',
        engineInsert: 'norm(v)',
        desc: 'Евклідова норма (довжина) вектора sqrt(sum(v_i^2))',
      },
      {
        id: 'angle',
        label: '\\angle(\\vec{u}, \\vec{v})',
        latexInsert: '\\angle(\\vec{u}, \\vec{v})',
        engineInsert: 'angle(u, v)',
        desc: 'Кут між двома векторами в радіанах',
      },
      {
        id: 'vec2',
        label: '\\begin{pmatrix}x\\\\y\\end{pmatrix}',
        latexInsert: '\\begin{pmatrix}x_1 \\\\ x_2\\end{pmatrix}',
        engineInsert: '[x1, x2]',
        desc: '2D вектор-стовпчик [x1, x2]',
      },
      {
        id: 'mat2',
        label: '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}',
        latexInsert: '\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}',
        engineInsert: '[[a, b], [c, d]]',
        desc: 'Квадратна матриця 2x2',
      },
      {
        id: 'det',
        label: '\\det(A)',
        latexInsert: '\\det(A)',
        engineInsert: 'det(A)',
        desc: 'Визначник (детермінант) квадратної матриці',
      },
      {
        id: 'inv',
        label: 'A^{-1}',
        latexInsert: 'A^{-1}',
        engineInsert: 'inv(A)',
        desc: 'Обернена матриця (A * A^-1 = I)',
      },
      {
        id: 'trans',
        label: 'A^T',
        latexInsert: 'A^T',
        engineInsert: 'transpose(A)',
        desc: 'Транспонована матриця (рядки стають стовпчиками)',
      },
    ],
  },
  {
    id: 'ml',
    label: '🤖 Штучний інтелект (ML)',
    icon: Sparkles,
    actions: [
      {
        id: 'sigmoid',
        label: '\\sigma(z)',
        latexInsert: '\\sigma(z) = \\frac{1}{1 + e^{-z}}',
        engineInsert: 'sigmoid(z)',
        desc: 'Логістична функція активації Сигмоїда: 1 / (1 + e^-z)',
      },
      {
        id: 'relu',
        label: '\\text{ReLU}(x)',
        latexInsert: '\\text{ReLU}(x) = \\max(0, x)',
        engineInsert: 'relu(x)',
        desc: 'Rectified Linear Unit: повертає x якщо x > 0, інакше 0',
      },
      {
        id: 'leaky_relu',
        label: '\\text{L-ReLU}(x)',
        latexInsert: '\\text{LeakyReLU}(x, 0.01)',
        engineInsert: 'leakyRelu(x, 0.01)',
        desc: 'Leaky ReLU з витоком альфа для уникнення зникаючого градієнта',
      },
      {
        id: 'softmax',
        label: '\\text{Softmax}(\\vec{z})',
        latexInsert: '\\text{Softmax}(\\vec{z})',
        engineInsert: 'softmax(z)',
        desc: 'Перетворення вектора логітів у розподіл ймовірностей',
      },
      {
        id: 'mse',
        label: '\\text{MSE}(y, \\hat{y})',
        latexInsert: '\\text{MSE}(y, \\hat{y})',
        engineInsert: 'mse(y, y_hat)',
        desc: 'Mean Squared Error (середньоквадратична похибка)',
      },
      {
        id: 'crossentropy',
        label: '\\mathcal{L}_{CE}',
        latexInsert: '\\mathcal{L}_{CE}(y, \\hat{y})',
        engineInsert: 'crossEntropy(y, y_hat)',
        desc: 'Cross-Entropy Loss для бінарної та багатокласової класифікації',
      },
      {
        id: 'cos_sim',
        label: '\\cos(\\vec{u}, \\vec{v})',
        latexInsert: '\\cos(\\vec{u}, \\vec{v})',
        engineInsert: 'cosineSim(u, v)',
        desc: 'Косинусна подібність векторних ембедингів: (u·v)/(||u||*||v||)',
      },
    ],
  },
  {
    id: 'stats',
    label: '📊 Статистика & Ймовірність',
    icon: PieChart,
    actions: [
      {
        id: 'mean',
        label: '\\mu = \\text{mean}',
        latexInsert: '\\mu = \\text{mean}(X)',
        engineInsert: 'mean(X)',
        desc: 'Математичне сподівання / середнє арифметичне ряду X',
      },
      {
        id: 'var',
        label: '\\sigma^2 = \\text{var}',
        latexInsert: '\\sigma^2 = \\text{var}(X)',
        engineInsert: 'variance(X)',
        desc: 'Вибіркова дисперсія (міра розсіювання даних)',
      },
      {
        id: 'std',
        label: '\\sigma = \\text{std}',
        latexInsert: '\\sigma = \\text{std}(X)',
        engineInsert: 'stdev(X)',
        desc: 'Стандартне відхилення sqrt(variance)',
      },
      {
        id: 'bayes',
        label: 'P(A|B)',
        latexInsert: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}',
        engineInsert: 'bayes(p_b_given_a, p_a, p_b)',
        desc: 'Формула Байєса для оновлення апріорної ймовірності',
      },
      {
        id: 'normpdf',
        label: '\\mathcal{N}(x, \\mu, \\sigma)',
        latexInsert: '\\mathcal{N}(x, \\mu, \\sigma)',
        engineInsert: 'normPdf(x, mu, sigma)',
        desc: 'Густина стандартного нормального розподілу Гауса',
      },
      {
        id: 'comb',
        label: '\\binom{n}{k}',
        latexInsert: '\\binom{n}{k}',
        engineInsert: 'comb(n, k)',
        desc: 'Кількість сполучень з n по k (біноміальний коефіцієнт)',
      },
      {
        id: 'perm',
        label: 'P(n, k)',
        latexInsert: 'P(n, k)',
        engineInsert: 'perm(n, k)',
        desc: 'Кількість розміщень без повторень з n по k',
      },
      {
        id: 'gcd',
        label: '\\gcd(a, b)',
        latexInsert: '\\gcd(a, b)',
        engineInsert: 'gcd(a, b)',
        desc: 'Найбільший спільний дільник (алгоритм Евкліда)',
      },
      {
        id: 'lcm',
        label: '\\text{lcm}(a, b)',
        latexInsert: '\\text{lcm}(a, b)',
        engineInsert: 'lcm(a, b)',
        desc: 'Найменше спільне кратне: (a * b) / gcd(a, b)',
      },
    ],
  },
  {
    id: 'finance',
    label: '🏛️ Фінансова математика',
    icon: Zap,
    actions: [
      {
        id: 'compound',
        label: 'A = P(1+\\frac{r}{n})^{nt}',
        latexInsert: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}',
        engineInsert: 'compoundInterest(P, r, n, t)',
        desc: 'Складні відсотки капіталізації: нарощена сума вкладу',
      },
      {
        id: 'annuity',
        label: 'M = P\\frac{r(1+r)^n}{(1+r)^n-1}',
        latexInsert: 'M = P \\frac{r(1+r)^n}{(1+r)^n - 1}',
        engineInsert: 'loanPayment(P, r, n)',
        desc: 'Ануїтетний щомісячний платіж за кредитом',
      },
      {
        id: 'roi',
        label: '\\text{ROI}',
        latexInsert: '\\text{ROI} = \\frac{R - C}{C} \\times 100\\%',
        engineInsert: '((R - C) / C) * 100',
        desc: 'Коефіцієнт окупності інвестицій (Return on Investment)',
      },
    ],
  },
]

// QUICK PRESETS
export const CALC_PRESETS = [
  {
    title: 'Квадратне рівняння',
    latex: '(-b + \\sqrt{b^2 - 4ac}) / (2a)',
    expression: '(-b + sqrt(b^2 - 4*a*c)) / (2*a)',
    category: 'algebra',
    desc: 'Пошук першого кореня x1 квадратного рівняння',
  },
  {
    title: 'Сигмоїда (Sigmoid)',
    latex: '\\sigma(z) = \\frac{1}{1 + e^{-z}}',
    expression: 'sigmoid(z)',
    category: 'machine-learning',
    desc: 'Логістична функція активації нейронів',
  },
  {
    title: 'Теорема Піфагора',
    latex: 'c = \\sqrt{a^2 + b^2}',
    expression: 'sqrt(a^2 + b^2)',
    category: 'algebra',
    desc: 'Довжина гіпотенузи прямокутного трикутника',
  },
  {
    title: 'Визначений інтеграл',
    latex: '\\int_{a}^{b} x^2 \\, dx',
    expression: 'integrate("x^2", a, b)',
    category: 'calculus',
    desc: 'Площа під параболою x^2 від a до b',
  },
  {
    title: 'Скалярний добуток',
    latex: '\\vec{u} \\cdot \\vec{v}',
    expression: 'dot(u, v)',
    category: 'linear-algebra',
    desc: 'Скалярний добуток векторів u та v',
  },
  {
    title: 'Складні відсотки',
    latex: 'A = P\\left(1 + \\frac{r}{n}\\right)^{nt}',
    expression: 'compoundInterest(P, r, n, t)',
    category: 'finance',
    desc: 'Розрахунок депозиту зі щомісячною капіталізацією',
  },
  {
    title: 'Похідна функції',
    latex: '\\frac{d}{dx}(x^3 - 3x)',
    expression: 'diff("x^3 - 3*x", x)',
    category: 'calculus',
    desc: 'Перша похідна функції в точці x',
  },
  {
    title: 'Нормальний розподіл Гауса',
    latex: '\\mathcal{N}(x, \\mu, \\sigma)',
    expression: 'normPdf(x, mu, sigma)',
    category: 'statistics',
    desc: 'Густина нормального розподілу',
  },
  {
    title: 'Косинусна подібність',
    latex: '\\cos(\\vec{u}, \\vec{v})',
    expression: 'cosineSim(u, v)',
    category: 'machine-learning',
    desc: 'Схожість двох векторів або ембедингів',
  },
]

// QUICK VARIABLES AND CONSTANTS
const QUICK_VARS = ['x', 'y', 'z', 't', 'a', 'b', 'c', 'n', 'm', 'k', 'r']
const QUICK_CONSTANTS = [
  { label: 'π', code: 'pi', latex: '\\pi', val: Math.PI },
  { label: 'e', code: 'e', latex: 'e', val: Math.E },
  { label: 'φ', code: '1.6180339887', latex: '\\phi', val: 1.6180339887 },
  { label: 'θ', code: 'theta', latex: '\\theta', val: 0 },
]

interface VisualFormulaCalculatorProps {
  initialFormula?: Formula | null
  onSaveToVault?: (payload: FormulaPayload) => Promise<void>
  onSwitchToVault?: () => void
}

export default function VisualFormulaCalculator({
  initialFormula,
  onSaveToVault,
  onSwitchToVault,
}: VisualFormulaCalculatorProps) {
  // State for LaTeX visual formula and evaluation engine expression
  const [displayLatex, setDisplayLatex] = useState(
    initialFormula?.latex || '\\sigma(z) = \\frac{1}{1 + e^{-z}}'
  )
  const [engineExpression, setEngineExpression] = useState(
    initialFormula?.expression || 'sigmoid(z)'
  )

  // Category tab for operations
  const [activeTab, setActiveTab] = useState<string>('basic')

  // Variable values mapping: { x: 2, a: 1, ... }
  const [variableValues, setVariableValues] = useState<Record<string, any>>({
    z: 0.5,
    x: 2,
    y: 3,
    a: 1,
    b: 2,
    c: 3,
    n: 12,
    t: 5,
    P: 10000,
    r: 0.08,
    mu: 0,
    sigma: 1,
    u: [1, 2, 3],
    v: [4, 5, 6],
    A: [[2, 1], [1, 3]],
    y_hat: 0.8,
    p_b_given_a: 0.95,
    p_a: 0.01,
    p_b: 0.05,
  })

  // Copied indicator
  const [copiedType, setCopiedType] = useState<string | null>(null)

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState(initialFormula?.title || '')
  const [saveCategory, setSaveCategory] = useState(initialFormula?.category || 'algebra')
  const [saveDesc, setSaveDesc] = useState(initialFormula?.description || '')
  const [saveTags, setSaveTags] = useState(initialFormula?.tags?.join(', ') || '')

  // Precision
  const [precision, setPrecision] = useState(6)

  // Plot range for single variable function f(x)
  const [plotRange, setPlotRange] = useState<{ min: number; max: number }>({ min: -10, max: 10 })

  // Synchronize when initialFormula changes
  useEffect(() => {
    if (initialFormula) {
      setDisplayLatex(initialFormula.latex)
      setEngineExpression(initialFormula.expression)
      setSaveTitle(initialFormula.title)
      setSaveCategory(initialFormula.category)
      setSaveDesc(initialFormula.description)
      setSaveTags(initialFormula.tags.join(', '))
      if (initialFormula.variables && initialFormula.variables.length > 0) {
        const initVals: Record<string, any> = {}
        initialFormula.variables.forEach((v) => {
          initVals[v.name] = v.defaultValue
        })
        setVariableValues((prev) => ({ ...prev, ...initVals }))
      }
    }
  }, [initialFormula])

  // Automatically extract variables from current engine expression
  const detectedVariables = useMemo(() => {
    const list = extractVariablesFromExpression(engineExpression)
    // Filter out built-ins that might look like variables
    const reserved = new Set([
      'pi', 'e', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
      'sinh', 'cosh', 'tanh', 'sind', 'cosd', 'tand', 'cot',
      'ln', 'log10', 'log2', 'exp', 'sqrt', 'abs', 'fact',
      'sigmoid', 'relu', 'leakyRelu', 'softmax', 'mse', 'crossEntropy',
      'cosineSim', 'diff', 'diff2', 'integrate', 'newtonRoot',
      'dot', 'cross', 'norm', 'angle', 'det', 'inv', 'transpose',
      'mean', 'variance', 'stdev', 'bayes', 'normPdf', 'normCdf',
      'comb', 'perm', 'gcd', 'lcm', 'compoundInterest', 'loanPayment',
    ])
    return list.filter((v) => !reserved.has(v))
  }, [engineExpression])

  // Live evaluate the mathematical expression
  const evalResult = useMemo(() => {
    if (!engineExpression.trim()) return null
    const hasX = detectedVariables.includes('x') || engineExpression.includes('x')
    return evaluateFormula(engineExpression, variableValues, {
      precision,
      rangeForPlot: hasX ? plotRange : undefined,
    })
  }, [engineExpression, variableValues, precision, plotRange, detectedVariables])

  // KaTeX safe renderer
  const renderKatexSafe = useCallback((latex: string, displayMode = true) => {
    try {
      return katex.renderToString(latex || '0', { displayMode, throwOnError: false })
    } catch {
      return latex
    }
  }, [])

  // ACTION CLICK HANDLER: inserts the chosen mathematical action
  const handleSelectAction = (action: MathAction) => {
    // If expression is empty or user is starting fresh
    if (!engineExpression.trim()) {
      setDisplayLatex(action.latexInsert)
      setEngineExpression(action.engineInsert)
      return
    }

    // Smart appending / chaining:
    // If current formula has an '=' sign (like f(x) = ...), replace right hand or append
    if (action.id === 'sqr' || action.id === 'cube' || action.id === 'pow') {
      setDisplayLatex((prev) => `${prev}${action.latexInsert}`)
      setEngineExpression((prev) => `(${prev})${action.engineInsert}`)
    } else if (action.id === 'frac') {
      setDisplayLatex((prev) => `\\frac{${prev}}{b}`)
      setEngineExpression((prev) => `((${prev}) / (b))`)
    } else if (action.id === 'sqrt') {
      setDisplayLatex((prev) => `\\sqrt{${prev}}`)
      setEngineExpression((prev) => `sqrt(${prev})`)
    } else if (action.id === 'abs') {
      setDisplayLatex((prev) => `|${prev}|`)
      setEngineExpression((prev) => `abs(${prev})`)
    } else {
      // General append with multiplication or operator if needed
      setDisplayLatex((prev) => `${prev} + ${action.latexInsert}`)
      setEngineExpression((prev) => `${prev} + ${action.engineInsert}`)
    }
  }

  // Insert Number or basic operator
  const handleInsertToken = (token: string, latexToken?: string) => {
    const lTok = latexToken || token
    if (token === 'AC') {
      setDisplayLatex('')
      setEngineExpression('')
      return
    }
    if (token === '⌫') {
      setDisplayLatex((prev) => prev.slice(0, -1))
      setEngineExpression((prev) => prev.slice(0, -1))
      return
    }

    setDisplayLatex((prev) => prev + lTok)
    setEngineExpression((prev) => prev + token)
  }

  // Insert Variable
  const handleInsertVariable = (vName: string) => {
    setDisplayLatex((prev) => (prev ? `${prev} + ${vName}` : vName))
    setEngineExpression((prev) => (prev ? `${prev} + ${vName}` : vName))
    if (variableValues[vName] === undefined) {
      setVariableValues((prev) => ({ ...prev, [vName]: 1.0 }))
    }
  }

  // Load Preset
  const handleLoadPreset = (preset: typeof CALC_PRESETS[0]) => {
    setDisplayLatex(preset.latex)
    setEngineExpression(preset.expression)
    setSaveTitle(preset.title)
    setSaveCategory(preset.category)
    setSaveDesc(preset.desc)
  }

  // Handle variable change
  const handleVarValueChange = (vName: string, val: any) => {
    setVariableValues((prev) => ({
      ...prev,
      [vName]: parseVariableInput(val),
    }))
  }

  // Copy to clipboard
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  // Save formula to Vault
  const handleSaveFormulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saveTitle.trim()) {
      alert('Будь ласка, введіть назву формули')
      return
    }

    const varsConfig: FormulaVariable[] = detectedVariables.map((vName) => ({
      name: vName,
      label: `Параметр ${vName}`,
      defaultValue: variableValues[vName] ?? 1.0,
      type:
        typeof variableValues[vName] === 'number'
          ? 'number'
          : Array.isArray(variableValues[vName]) && Array.isArray(variableValues[vName][0])
          ? 'matrix'
          : Array.isArray(variableValues[vName])
          ? 'vector'
          : 'number',
    }))

    const payload: FormulaPayload = {
      title: saveTitle.trim(),
      category: saveCategory,
      latex: displayLatex.trim() || engineExpression.trim(),
      expression: engineExpression.trim(),
      variables: varsConfig,
      description: saveDesc.trim() || `Математична формула ${saveTitle}`,
      example: evalResult?.formattedResult ? `Результат = ${evalResult.formattedResult}` : '',
      tags: saveTags.split(',').map((t) => t.trim()).filter(Boolean),
      isFavorite: false,
    }

    if (onSaveToVault) {
      await onSaveToVault(payload)
      setIsSaveModalOpen(false)
      alert(`Формулу "${payload.title}" успішно збережено у ваше Сховище формул!`)
    }
  }

  return (
    <div className={styles.calcContainer}>
      {/* HEADER & QUICK PRESETS */}
      <div className={styles.calcHeader}>
        <div className={styles.calcTitleArea}>
          <div className={styles.calcIconBadge}>
            <Calculator size={22} />
          </div>
          <div>
            <div className={styles.calcTitle}>Графічний Інтерактивний Калькулятор Формул</div>
            <div className={styles.calcSubtitle}>
              Оберіть математичну дію нижче для візуальної побудови формули та миттєвого обчислення
            </div>
          </div>
        </div>

        <div className={styles.calcHeaderActions}>
          <button
            type="button"
            className={styles.screenActionBtn}
            onClick={() => setIsSaveModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 79, 163, 0.2), rgba(168, 85, 247, 0.2))',
              borderColor: 'rgba(255, 79, 163, 0.4)',
              color: '#ff6eb4',
              fontWeight: 600,
            }}
          >
            <Save size={14} />
            <span>Зберегти у сховище</span>
          </button>

          {onSwitchToVault && (
            <button
              type="button"
              className={styles.screenActionBtn}
              onClick={onSwitchToVault}
            >
              <Layers size={14} />
              <span>До бібліотеки (30+)</span>
            </button>
          )}
        </div>
      </div>

      {/* QUICK PRESETS CAROUSEL */}
      <div className={styles.presetsBar}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginRight: 4 }}>
          Шаблони:
        </span>
        {CALC_PRESETS.map((p) => (
          <button
            key={p.title}
            type="button"
            className={styles.presetChip}
            onClick={() => handleLoadPreset(p)}
          >
            <Sparkles size={12} color="#ff4fa3" />
            <span>{p.title}</span>
          </button>
        ))}
      </div>

      {/* SCREEN / LCD DISPLAY */}
      <div className={styles.screenBox}>
        {/* Screen Toolbar */}
        <div className={styles.screenToolbar}>
          <div className={styles.screenModeBadge}>
            <Zap size={12} />
            <span>Live CAS Engine & KaTeX</span>
          </div>

          <div className={styles.screenQuickActions}>
            <button
              type="button"
              className={styles.screenActionBtn}
              onClick={() => handleCopy(displayLatex, 'latex')}
              title="Скопіювати LaTeX код"
            >
              {copiedType === 'latex' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              <span>{copiedType === 'latex' ? 'Скопійовано!' : 'LaTeX'}</span>
            </button>

            <button
              type="button"
              className={styles.screenActionBtn}
              onClick={() => handleInsertToken('⌫')}
              title="Стерти останній символ"
            >
              <RotateCcw size={12} />
              <span>Backspace</span>
            </button>

            <button
              type="button"
              className={`${styles.screenActionBtn} ${styles.danger}`}
              onClick={() => handleInsertToken('AC')}
              title="Очистити все"
            >
              <Trash2 size={12} />
              <span>AC</span>
            </button>
          </div>
        </div>

        {/* KaTeX Math Graphical Rendering Display */}
        <div className={styles.mathVisualDisplay}>
          {displayLatex ? (
            <div
              dangerouslySetInnerHTML={{
                __html: renderKatexSafe(displayLatex, true),
              }}
            />
          ) : (
            <div className={styles.emptyFormulaPlaceholder}>
              <HelpCircle size={18} />
              <span>Натисніть дію або операцію нижче, щоб побудувати формулу...</span>
            </div>
          )}
          <span className={styles.cursorBlink} />
        </div>

        {/* Live Result Display */}
        <div className={styles.resultRow}>
          <div className={styles.resultLabel}>Результат обчислення</div>
          <div className={styles.resultValueArea}>
            {evalResult?.error ? (
              <span className={styles.resultError}>Помилка: {evalResult.error}</span>
            ) : evalResult?.success ? (
              <>
                <span className={styles.resultValue}>
                  = {evalResult.formattedResult}
                </span>
                {evalResult.fraction && (
                  <span className={styles.resultFraction}>
                    (раціональний дріб: {evalResult.fraction})
                  </span>
                )}
                <button
                  type="button"
                  className={styles.screenActionBtn}
                  onClick={() => handleCopy(evalResult.formattedResult, 'result')}
                  title="Скопіювати результат"
                >
                  {copiedType === 'result' ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                  <span>{copiedType === 'result' ? 'Скопійовано' : 'Копіювати'}</span>
                </button>
              </>
            ) : (
              <span style={{ color: '#71717a', fontSize: 14 }}>—</span>
            )}
          </div>
        </div>

        {/* 2D Curve Plot if function depends on x */}
        {evalResult?.plotData && evalResult.plotData.length > 0 && (
          <div className={styles.screenGraphArea}>
            <div className={styles.screenGraphHeader}>
              <div className={styles.screenGraphTitle}>
                <TrendingUp size={14} />
                <span>Графік функції f(x) на проміжку [{plotRange.min}, {plotRange.max}]</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[-5, -10, -20].map((min) => (
                  <button
                    key={min}
                    type="button"
                    className={styles.screenActionBtn}
                    onClick={() => setPlotRange({ min, max: -min })}
                    style={{
                      background: plotRange.min === min ? 'rgba(255, 79, 163, 0.2)' : undefined,
                      color: plotRange.min === min ? '#ff4fa3' : undefined,
                    }}
                  >
                    ±{-min}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 160 }}>
              <PlotMiniSvg points={evalResult.plotData} minX={plotRange.min} maxX={plotRange.max} />
            </div>
          </div>
        )}
      </div>

      {/* BODY GRID: OPERATIONS KEYPAD ON LEFT + NUMPAD & OPERATORS ON RIGHT */}
      <div className={styles.calcBodyGrid}>
        {/* OPERATIONS KEYPAD ("ВИБИРАЄШ ДІЮ ЯКУ ЗРОБИШ") */}
        <div className={styles.operationsPanel}>
          {/* Category Tabs for Operations */}
          <div className={styles.opsNav}>
            {CALC_ACTION_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.opNavBtn} ${activeTab === cat.id ? styles.active : ''}`}
                  onClick={() => setActiveTab(cat.id)}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* Action Buttons for active category */}
          <div className={styles.actionButtonsGrid}>
            {CALC_ACTION_CATEGORIES.find((c) => c.id === activeTab)?.actions.map((act) => (
              <button
                key={act.id}
                type="button"
                className={styles.actionBtn}
                onClick={() => handleSelectAction(act)}
                title={act.desc}
              >
                <div
                  className={styles.actionSymbol}
                  dangerouslySetInnerHTML={{
                    __html: renderKatexSafe(act.label, false),
                  }}
                />
                <div className={styles.actionLabel}>{act.desc.split('(')[0].slice(0, 22)}</div>
              </button>
            ))}
          </div>

          {/* QUICK VARIABLES & CONSTANTS BAR */}
          <div className={styles.variablesToolbar}>
            <div className={styles.variablesLabel}>
              <span>Вставити змінну у формулу:</span>
              <span style={{ fontSize: 10, color: '#71717a' }}>Параметри автоматично додаються до повзунків</span>
            </div>
            <div className={styles.variablesList}>
              {QUICK_VARS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.varBtn}
                  onClick={() => handleInsertVariable(v)}
                >
                  {v}
                </button>
              ))}
              {QUICK_CONSTANTS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`${styles.varBtn} ${styles.constBtn}`}
                  onClick={() => handleInsertToken(c.code, c.latex)}
                  title={`Константа ${c.label} ≈ ${c.val}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: NUMPAD & BASIC ARITHMETIC OPERATORS */}
        <div className={styles.numpadPanel}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Числова панель & Арифметика
          </div>

          <div className={styles.numpadGrid}>
            {/* Row 1 */}
            <button type="button" className={`${styles.numKey} ${styles.clearKey}`} onClick={() => handleInsertToken('AC')}>
              AC
            </button>
            <button type="button" className={`${styles.numKey} ${styles.backspaceKey}`} onClick={() => handleInsertToken('⌫')}>
              ⌫
            </button>
            <button type="button" className={`${styles.numKey} ${styles.funcKey}`} onClick={() => handleInsertToken('(')}>
              (
            </button>
            <button type="button" className={`${styles.numKey} ${styles.funcKey}`} onClick={() => handleInsertToken(')')}>
              )
            </button>

            {/* Row 2 */}
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('7')}>
              7
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('8')}>
              8
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('9')}>
              9
            </button>
            <button type="button" className={`${styles.numKey} ${styles.operator}`} onClick={() => handleInsertToken('/', ' / ')}>
              ÷
            </button>

            {/* Row 3 */}
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('4')}>
              4
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('5')}>
              5
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('6')}>
              6
            </button>
            <button type="button" className={`${styles.numKey} ${styles.operator}`} onClick={() => handleInsertToken('*', ' \\cdot ')}>
              ×
            </button>

            {/* Row 4 */}
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('1')}>
              1
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('2')}>
              2
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('3')}>
              3
            </button>
            <button type="button" className={`${styles.numKey} ${styles.operator}`} onClick={() => handleInsertToken('-', ' - ')}>
              −
            </button>

            {/* Row 5 */}
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('0')}>
              0
            </button>
            <button type="button" className={styles.numKey} onClick={() => handleInsertToken('.')}>
              .
            </button>
            <button type="button" className={`${styles.numKey} ${styles.operator}`} onClick={() => handleInsertToken('^', '^{')}>
              ^
            </button>
            <button type="button" className={`${styles.numKey} ${styles.operator}`} onClick={() => handleInsertToken('+', ' + ')}>
              +
            </button>

            {/* Equal Row */}
            <button
              type="button"
              className={`${styles.numKey} ${styles.equalKey}`}
              onClick={() => {
                // Focus on result
              }}
            >
              = Обчислити
            </button>
            <button
              type="button"
              className={styles.numKey}
              onClick={() => handleInsertToken(',')}
              title="Кома для розділення аргументів"
            >
              ,
            </button>
            <button
              type="button"
              className={styles.numKey}
              onClick={() => handleInsertToken(';')}
              title="Крапка з комою для матриць"
            >
              ;
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC LIVE VARIABLE SLIDERS / PARAMETERS BENCH */}
      {detectedVariables.length > 0 && (
        <div className={styles.variablesBench}>
          <div className={styles.benchHeader}>
            <div className={styles.benchTitle}>
              <Sliders size={16} color="#ff4fa3" />
              <span>Інтерактивні змінні формули ({detectedVariables.length})</span>
            </div>
            <div style={{ fontSize: 11, color: '#71717a' }}>
              Тягніть повзунки або вказуйте точні числа — результат оновлюється на льоту
            </div>
          </div>

          <div className={styles.varsGrid}>
            {detectedVariables.map((vName) => {
              const currentVal = variableValues[vName] ?? 1.0
              const isNumeric = typeof currentVal === 'number'

              return (
                <div key={vName} className={styles.varCard}>
                  <div className={styles.varCardHeader}>
                    <span className={styles.varName}>{vName} =</span>
                    <input
                      type="text"
                      className={styles.varInputBox}
                      value={typeof currentVal === 'object' ? JSON.stringify(currentVal) : currentVal}
                      onChange={(e) => handleVarValueChange(vName, e.target.value)}
                    />
                  </div>

                  {isNumeric && (
                    <input
                      type="range"
                      className={styles.varSlider}
                      min={currentVal < -20 ? currentVal * 2 : -20}
                      max={currentVal > 20 ? currentVal * 2 : 20}
                      step={Math.abs(currentVal) > 10 ? 1 : 0.1}
                      value={currentVal}
                      onChange={(e) => handleVarValueChange(vName, parseFloat(e.target.value))}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP BY STEP SUBSTITUTION DISPLAY */}
      {evalResult?.stepByStep && evalResult.stepByStep.length > 0 && (
        <div className={styles.stepsBox}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6eb4', textTransform: 'uppercase', marginBottom: 4 }}>
            Покроковий розрахунок та підстановка:
          </div>
          {evalResult.stepByStep.map((s, idx) => (
            <div key={idx} className={styles.stepLine}>
              <span className={styles.stepNumber}>[{idx + 1}]</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* SAVE TO VAULT MODAL */}
      {isSaveModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsSaveModalOpen(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 520,
              background: '#18181b',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Зберегти формулу у Сховище</div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveFormulaSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', marginBottom: 6 }}>
                    НАЗВА ФОРМУЛИ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="наприклад, Мій розрахунок, Енергія фотона..."
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', marginBottom: 6 }}>
                    КАТЕГОРІЯ
                  </label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#27272a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <option value="algebra">Алгебра & Геометрія</option>
                    <option value="calculus">Матаналіз & Інтеграли</option>
                    <option value="linear-algebra">Лінійна алгебра & Вектори</option>
                    <option value="machine-learning">Машинне навчання (ML)</option>
                    <option value="statistics">Статистика & Ймовірність</option>
                    <option value="trigonometry">Тригонометрія</option>
                    <option value="finance">Фінансова математика</option>
                    <option value="physics">Фізичні закони</option>
                    <option value="discrete-math">Дискретна математика</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', marginBottom: 6 }}>
                    ОПИС ТА ПРИЗНАЧЕННЯ
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Для чого використовується ця формула..."
                    value={saveDesc}
                    onChange={(e) => setSaveDesc(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                      resize: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a1a1aa', marginBottom: 6 }}>
                    ТЕГИ (через кому)
                  </label>
                  <input
                    type="text"
                    placeholder="math, physics, ml, formula"
                    value={saveTags}
                    onChange={(e) => setSaveTags(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsSaveModalOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      color: '#d4d4d8',
                      cursor: 'pointer',
                    }}
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #ff4fa3, #a855f7)',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    💾 Зберегти у сховище
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------- MINI SVG GRAPH -----------------
function PlotMiniSvg({ points, minX, maxX }: { points: { x: number; y: number }[]; minX: number; maxX: number }) {
  const width = 600
  const height = 150
  const padding = 24

  const minY = Math.min(...points.map((p) => p.y))
  const maxY = Math.max(...points.map((p) => p.y))

  const rangeY = maxY - minY || 1
  const rangeX = maxX - minX || 1

  const scaleX = (x: number) => padding + ((x - minX) / rangeX) * (width - 2 * padding)
  const scaleY = (y: number) => height - padding - ((y - minY) / rangeY) * (height - 2 * padding)

  const pathD = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`)
    .join(' ')

  const zeroY = minY <= 0 && maxY >= 0 ? scaleY(0) : null
  const zeroX = minX <= 0 && maxX >= 0 ? scaleX(0) : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {/* Zero lines */}
      {zeroY !== null && (
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
      )}
      {zeroX !== null && (
        <line x1={zeroX} y1={padding} x2={zeroX} y2={height - padding} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="3 3" />
      )}

      {/* Function curve with gradient/glow */}
      <path d={pathD} fill="none" stroke="#ff4fa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Labels */}
      <text x={padding} y={height - 6} fill="#71717a" fontSize="10">{minX}</text>
      <text x={width - padding - 15} y={height - 6} fill="#71717a" fontSize="10">{maxX}</text>
      <text x={padding + 4} y={padding + 6} fill="#71717a" fontSize="10">{maxY.toFixed(2)}</text>
      <text x={padding + 4} y={height - padding - 4} fill="#71717a" fontSize="10">{minY.toFixed(2)}</text>
    </svg>
  )
}
