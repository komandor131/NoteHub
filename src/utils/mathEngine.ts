// High-Precision Mathematical Computation Engine for NoteHub Formulas Vault
// Supports: Arithmetic, Calculus, Linear Algebra, Statistics, ML, Trigonometry, Discrete Math & Plotting

export interface MathVariableValue {
  name: string
  value: any // number | string | number[] | number[][]
}

export interface EvaluationResult {
  success: boolean
  result: any
  formattedResult: string
  fraction: string | null
  error: string | null
  stepByStep: string[]
  plotData?: { x: number; y: number }[]
}

// Decimal to fraction using continued fraction algorithm
export function decimalToFraction(val: number, maxDenominator = 1000): string | null {
  if (!Number.isFinite(val)) return null
  if (Number.isInteger(val)) return null // Already an integer

  const sign = val < 0 ? '-' : ''
  const x = Math.abs(val)
  let m00 = 0, m01 = 1, m10 = 1, m11 = 0
  let current = x

  for (let iter = 0; iter < 20; iter++) {
    const a = Math.floor(current)
    const newM01 = m00 + a * m01
    const newM11 = m10 + a * m11
    m00 = m01
    m01 = newM01
    m10 = m11
    m11 = newM11

    if (m11 > maxDenominator) break

    const approx = m01 / m11
    if (Math.abs(x - approx) < 1e-7) {
      if (m11 === 1) return null
      return `${sign}${m01}/${m11}`
    }

    const frac = current - a
    if (frac < 1e-10) break
    current = 1 / frac
  }
  return null
}

// Convert user input string (e.g. "1, 2, 3" or "[1, 2, 3]" or "1 2; 3 4") to numeric or array
export function parseVariableInput(raw: any): any {
  if (typeof raw === 'number') return raw
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return 0

  const trimmed = raw.trim()
  if (!trimmed) return 0

  // 1. Try matrix: "[[1, 2], [3, 4]]" or "1 2; 3 4" or "1, 2; 3, 4"
  if (trimmed.includes(';') || (trimmed.startsWith('[[') && trimmed.endsWith(']]'))) {
    try {
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
          return parsed.map((row: any[]) => row.map(Number))
        }
      }
    } catch {
      // fallback to row split by ';'
    }
    const rows = trimmed.split(';').map(row => 
      row.trim().replace(/^\[|\]$/g, '').split(/[\s,]+/).filter(Boolean).map(Number)
    )
    if (rows.length > 0 && rows[0].length > 0) return rows
  }

  // 2. Try vector / array: "[1, 2, 3]" or "1, 2, 3" or "1 2 3"
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(Number)
    } catch {
      // ignore
    }
  }

  if (trimmed.includes(',')) {
    const parts = trimmed.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 1) {
      const nums = parts.map(Number)
      if (nums.every(n => !isNaN(n))) return nums
    }
  }

  // 3. Simple number
  const num = Number(trimmed)
  return isNaN(num) ? trimmed : num
}

// Format any result for clean display
export function formatMathResult(val: any, precision = 4): string {
  if (val === null || val === undefined) return '0'
  if (typeof val === 'boolean') return val ? 'True (Істина)' : 'False (Хибність)'
  if (typeof val === 'string') return val

  if (typeof val === 'number') {
    if (Number.isNaN(val)) return 'NaN (Невизначеність)'
    if (!Number.isFinite(val)) return val > 0 ? '+∞ (Нескінченність)' : '-∞ (Мінус нескінченність)'
    if (Number.isInteger(val)) return val.toLocaleString('uk-UA')
    // Round to precision, strip trailing zeros
    const rounded = Number(val.toFixed(precision))
    if (Math.abs(val) > 1e12 || (Math.abs(val) < 1e-4 && val !== 0)) {
      return val.toExponential(precision)
    }
    return rounded.toString()
  }

  // Vector / Array
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    if (Array.isArray(val[0])) {
      // Matrix
      const rows = val.map(row => `[ ${row.map((x: any) => formatMathResult(x, precision)).join(', ')} ]`)
      return `[\n  ${rows.join(',\n  ')}\n]`
    }
    return `[ ${val.map(x => formatMathResult(x, precision)).join(', ')} ]`
  }

  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2)
  }

  return String(val)
}

// Extract variable names from an expression (e.g. "a*x^2 + b*x + c" -> ["a", "x", "b", "c"])
export function extractVariablesFromExpression(expr: string): string[] {
  const reserved = new Set([
    'add', 'sub', 'mul', 'div', 'mod', 'pow', 'sqrt', 'cbrt', 'root', 'abs', 'sign', 'round',
    'floor', 'ceil', 'trunc', 'fact', 'factorial', 'gamma', 'pi', 'PI', 'e', 'E', 'phi', 'tau',
    'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 'atan2',
    'sind', 'cosd', 'tand', 'cotd', 'rad', 'deg', 'sinh', 'cosh', 'tanh', 'coth',
    'asinh', 'acosh', 'atanh', 'exp', 'exp2', 'ln', 'log', 'log10', 'log2', 'logb',
    'nCr', 'comb', 'nPr', 'perm', 'binomPdf', 'normPdf', 'normCdf', 'bayes',
    'mean', 'median', 'variance', 'stdev', 'quantile', 'cov', 'corr', 'sum', 'min', 'max',
    'dot', 'cross', 'norm', 'mag', 'unit', 'angle', 'det', 'trace', 'transpose', 'inv', 'matmul',
    'diff', 'diff2', 'integrate', 'limit', 'newtonRoot', 'sigmoid', 'relu', 'leakyRelu', 'softmax',
    'mse', 'rmse', 'mae', 'crossEntropy', 'cosineSim', 'euclidean', 'manhattan',
    'gcd', 'lcm', 'isPrime', 'primeFactors', 'modPow', 'compoundInterest', 'loanPayment', 'npv',
    'true', 'false', 'null', 'undefined', 'Infinity', 'NaN', 'Math'
  ])

  const matches = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || []
  const uniqueVars = new Set<string>()

  for (const m of matches) {
    if (!reserved.has(m) && isNaN(Number(m))) {
      uniqueVars.add(m)
    }
  }

  return Array.from(uniqueVars)
}

// ----------------- CORE MATH LIBRARY & FUNCTIONS -----------------
const MathLib = {
  // Constants
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E,
  phi: (1 + Math.sqrt(5)) / 2,
  PHI: (1 + Math.sqrt(5)) / 2,
  tau: 2 * Math.PI,
  TAU: 2 * Math.PI,
  inf: Infinity,
  sqrt2: Math.SQRT2,
  ln2: Math.LN2,
  ln10: Math.LN10,

  // Basic Arithmetic
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
  mul: (a: number, b: number) => a * b,
  div: (a: number, b: number) => a / b,
  mod: (a: number, b: number) => ((a % b) + b) % b,
  pow: (a: number, b: number) => Math.pow(a, b),
  sq: (a: number) => a * a,
  cube: (a: number) => a * a * a,
  sqrt: (x: number) => Math.sqrt(x),
  cbrt: (x: number) => Math.cbrt(x),
  root: (x: number, n: number) => Math.pow(x, 1 / n),
  abs: (x: number) => Math.abs(x),
  sign: (x: number) => Math.sign(x),
  round: (x: number, d = 0) => {
    const factor = Math.pow(10, d)
    return Math.round(x * factor) / factor
  },
  floor: (x: number) => Math.floor(x),
  ceil: (x: number) => Math.ceil(x),
  trunc: (x: number) => Math.trunc(x),

  // Combinatorics
  fact: factorial,
  factorial: factorial,
  gamma: gammaFunction,
  nCr: (n: number, k: number) => {
    if (k < 0 || k > n) return 0
    if (k === 0 || k === n) return 1
    k = Math.min(k, n - k)
    let c = 1
    for (let i = 0; i < k; i++) {
      c = (c * (n - i)) / (i + 1)
    }
    return Math.round(c)
  },
  comb: (n: number, k: number) => MathLib.nCr(n, k),
  nPr: (n: number, k: number) => {
    if (k < 0 || k > n) return 0
    let p = 1
    for (let i = 0; i < k; i++) p *= (n - i)
    return p
  },
  perm: (n: number, k: number) => MathLib.nPr(n, k),

  // Trigonometry (Radians)
  sin: (x: number) => Math.sin(x),
  cos: (x: number) => Math.cos(x),
  tan: (x: number) => Math.tan(x),
  cot: (x: number) => 1 / Math.tan(x),
  sec: (x: number) => 1 / Math.cos(x),
  csc: (x: number) => 1 / Math.sin(x),
  asin: (x: number) => Math.asin(x),
  acos: (x: number) => Math.acos(x),
  atan: (x: number) => Math.atan(x),
  acot: (x: number) => Math.PI / 2 - Math.atan(x),
  atan2: (y: number, x: number) => Math.atan2(y, x),

  // Degrees
  rad: (deg: number) => (deg * Math.PI) / 180,
  deg: (rad: number) => (rad * 180) / Math.PI,
  sind: (d: number) => Math.sin((d * Math.PI) / 180),
  cosd: (d: number) => Math.cos((d * Math.PI) / 180),
  tand: (d: number) => Math.tan((d * Math.PI) / 180),
  cotd: (d: number) => 1 / Math.tan((d * Math.PI) / 180),

  // Hyperbolic
  sinh: (x: number) => Math.sinh(x),
  cosh: (x: number) => Math.cosh(x),
  tanh: (x: number) => Math.tanh(x),
  coth: (x: number) => 1 / Math.tanh(x),
  asinh: (x: number) => Math.asinh(x),
  acosh: (x: number) => Math.acosh(x),
  atanh: (x: number) => Math.atanh(x),

  // Exponents & Logs
  exp: (x: number) => Math.exp(x),
  exp2: (x: number) => Math.pow(2, x),
  ln: (x: number) => Math.log(x),
  log: (x: number) => Math.log(x),
  log10: (x: number) => Math.log10(x),
  lg: (x: number) => Math.log10(x),
  log2: (x: number) => Math.log2(x),
  logb: (x: number, b: number) => Math.log(x) / Math.log(b),

  // Probability Distributions
  binomPdf: (k: number, n: number, p: number) => {
    return MathLib.nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
  },
  normPdf: (x: number, mean = 0, std = 1) => {
    if (std <= 0) return 0
    const z = (x - mean) / std
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z)
  },
  normCdf: (x: number, mean = 0, std = 1) => {
    if (std <= 0) return 0
    const z = (x - mean) / (std * Math.SQRT2)
    return 0.5 * (1 + erf(z))
  },
  bayes: (priorA: number, pB_given_A: number, pB: number) => {
    if (pB === 0) return 0
    return (pB_given_A * priorA) / pB
  },

  // Statistical Summaries for Arrays
  mean: (arr: number[]) => {
    const a = ensureArray(arr)
    if (!a.length) return 0
    return a.reduce((sum, v) => sum + v, 0) / a.length
  },
  median: (arr: number[]) => {
    const a = [...ensureArray(arr)].sort((x, y) => x - y)
    if (!a.length) return 0
    const mid = Math.floor(a.length / 2)
    return a.length % 2 !== 0 ? a[mid] : (a[mid - 1] + a[mid]) / 2
  },
  variance: (arr: number[], isSample = false) => {
    const a = ensureArray(arr)
    if (a.length <= 1) return 0
    const m = MathLib.mean(a)
    const sumSq = a.reduce((sum, v) => sum + Math.pow(v - m, 2), 0)
    return sumSq / (isSample ? a.length - 1 : a.length)
  },
  stdev: (arr: number[], isSample = false) => {
    return Math.sqrt(MathLib.variance(arr, isSample))
  },
  quantile: (arr: number[], q: number) => {
    const a = [...ensureArray(arr)].sort((x, y) => x - y)
    if (!a.length) return 0
    const pos = (a.length - 1) * Math.max(0, Math.min(1, q))
    const base = Math.floor(pos)
    const rest = pos - base
    if (a[base + 1] !== undefined) {
      return a[base] + rest * (a[base + 1] - a[base])
    }
    return a[base]
  },
  sum: (arr: number[]) => ensureArray(arr).reduce((acc, v) => acc + v, 0),
  min: (...args: any[]) => {
    const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
    return Math.min(...a)
  },
  max: (...args: any[]) => {
    const a = args.length === 1 && Array.isArray(args[0]) ? args[0] : args
    return Math.max(...a)
  },
  cov: (xArr: number[], yArr: number[]) => {
    const x = ensureArray(xArr), y = ensureArray(yArr)
    const n = Math.min(x.length, y.length)
    if (n <= 1) return 0
    const mx = MathLib.mean(x.slice(0, n)), my = MathLib.mean(y.slice(0, n))
    let sum = 0
    for (let i = 0; i < n; i++) sum += (x[i] - mx) * (y[i] - my)
    return sum / (n - 1)
  },
  corr: (xArr: number[], yArr: number[]) => {
    const x = ensureArray(xArr), y = ensureArray(yArr)
    const covariance = MathLib.cov(x, y)
    const sx = MathLib.stdev(x, true), sy = MathLib.stdev(y, true)
    if (sx === 0 || sy === 0) return 0
    return covariance / (sx * sy)
  },

  // Linear Algebra & Vectors
  dot: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    const len = Math.min(a.length, b.length)
    let sum = 0
    for (let i = 0; i < len; i++) sum += a[i] * b[i]
    return sum
  },
  cross: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    const x1 = a[0] || 0, y1 = a[1] || 0, z1 = a[2] || 0
    const x2 = b[0] || 0, y2 = b[1] || 0, z2 = b[2] || 0
    return [
      y1 * z2 - z1 * y2,
      z1 * x2 - x1 * z2,
      x1 * y2 - y1 * x2
    ]
  },
  norm: (v: number[]) => {
    const a = ensureArray(v)
    return Math.sqrt(a.reduce((acc, x) => acc + x * x, 0))
  },
  mag: (v: number[]) => MathLib.norm(v),
  unit: (v: number[]) => {
    const len = MathLib.norm(v)
    if (len === 0) return v
    return ensureArray(v).map(x => x / len)
  },
  angle: (u: number[], v: number[], inDegrees = false) => {
    const d = MathLib.dot(u, v)
    const magU = MathLib.norm(u), magV = MathLib.norm(v)
    if (magU === 0 || magV === 0) return 0
    const cosTheta = Math.max(-1, Math.min(1, d / (magU * magV)))
    const rad = Math.acos(cosTheta)
    return inDegrees ? MathLib.deg(rad) : rad
  },
  vecAdd: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    return a.map((val, i) => val + (b[i] || 0))
  },
  vecSub: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    return a.map((val, i) => val - (b[i] || 0))
  },
  vecScale: (v: number[], s: number) => {
    return ensureArray(v).map(x => x * s)
  },

  // Matrices
  det: (M: number[][]) => {
    if (!Array.isArray(M) || !Array.isArray(M[0])) return 0
    const n = M.length
    if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0]
    if (n === 3) {
      return (
        M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
        M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
        M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
      )
    }
    // Generic LU determinant
    return luDeterminant(M)
  },
  trace: (M: number[][]) => {
    if (!Array.isArray(M)) return 0
    let tr = 0
    for (let i = 0; i < M.length; i++) {
      if (M[i] && M[i][i] !== undefined) tr += M[i][i]
    }
    return tr
  },
  transpose: (M: number[][]) => {
    if (!Array.isArray(M) || !M.length) return []
    return M[0].map((_, col) => M.map(row => row[col]))
  },
  inv: (M: number[][]) => {
    if (!Array.isArray(M) || M.length !== 2) return null
    const det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
    if (Math.abs(det) < 1e-12) return null
    return [
      [M[1][1] / det, -M[0][1] / det],
      [-M[1][0] / det, M[0][0] / det]
    ]
  },
  matmul: (A: number[][], B: number[][]) => {
    if (!Array.isArray(A) || !Array.isArray(B)) return []
    const rowsA = A.length, colsA = A[0].length, colsB = B[0].length
    const result: number[][] = Array(rowsA).fill(0).map(() => Array(colsB).fill(0))
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j]
        }
        result[i][j] = sum
      }
    }
    return result
  },

  // Calculus & Numerical Methods
  diff: (fnOrExpr: any, xVal: number, h = 1e-5) => {
    const fn = toFunction(fnOrExpr, 'x')
    return (fn(xVal + h) - fn(xVal - h)) / (2 * h)
  },
  diff2: (fnOrExpr: any, xVal: number, h = 1e-4) => {
    const fn = toFunction(fnOrExpr, 'x')
    return (fn(xVal + h) - 2 * fn(xVal) + fn(xVal - h)) / (h * h)
  },
  integrate: (fnOrExpr: any, a: number, b: number, n = 1000) => {
    const fn = toFunction(fnOrExpr, 'x')
    if (n % 2 !== 0) n += 1 // Simpson's rule requires even number of intervals
    const h = (b - a) / n
    let sum = fn(a) + fn(b)
    for (let i = 1; i < n; i++) {
      const x = a + i * h
      sum += (i % 2 === 0 ? 2 : 4) * fn(x)
    }
    return (h / 3) * sum
  },
  limit: (fnOrExpr: any, xVal: number) => {
    const fn = toFunction(fnOrExpr, 'x')
    const h = 1e-7
    const left = fn(xVal - h)
    const right = fn(xVal + h)
    return (left + right) / 2
  },
  newtonRoot: (fnOrExpr: any, x0: number, tol = 1e-7, maxIter = 100) => {
    const fn = toFunction(fnOrExpr, 'x')
    let x = x0
    for (let i = 0; i < maxIter; i++) {
      const fx = fn(x)
      if (Math.abs(fx) < tol) return x
      const dfx = (fn(x + 1e-5) - fn(x - 1e-5)) / (2e-5)
      if (Math.abs(dfx) < 1e-12) break
      x = x - fx / dfx
    }
    return x
  },

  // Machine Learning / AI Activation & Losses
  sigmoid: (z: number) => 1 / (1 + Math.exp(-z)),
  relu: (x: number) => Math.max(0, x),
  leakyRelu: (x: number, alpha = 0.01) => (x > 0 ? x : alpha * x),
  elu: (x: number, alpha = 1.0) => (x > 0 ? x : alpha * (Math.exp(x) - 1)),
  gelu: (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3)))),
  softmax: (vec: number[]) => {
    const a = ensureArray(vec)
    const maxVal = Math.max(...a)
    const exps = a.map(x => Math.exp(x - maxVal))
    const sumExps = exps.reduce((acc, e) => acc + e, 0)
    return exps.map(e => e / sumExps)
  },
  mse: (yTrue: number[], yPred: number[]) => {
    const yt = ensureArray(yTrue), yp = ensureArray(yPred)
    const n = Math.min(yt.length, yp.length)
    if (!n) return 0
    let sum = 0
    for (let i = 0; i < n; i++) sum += Math.pow(yt[i] - yp[i], 2)
    return sum / n
  },
  rmse: (yTrue: number[], yPred: number[]) => Math.sqrt(MathLib.mse(yTrue, yPred)),
  mae: (yTrue: number[], yPred: number[]) => {
    const yt = ensureArray(yTrue), yp = ensureArray(yPred)
    const n = Math.min(yt.length, yp.length)
    if (!n) return 0
    let sum = 0
    for (let i = 0; i < n; i++) sum += Math.abs(yt[i] - yp[i])
    return sum / n
  },
  crossEntropy: (yTrue: number[], yPred: number[]) => {
    const yt = ensureArray(yTrue), yp = ensureArray(yPred)
    const n = Math.min(yt.length, yp.length)
    if (!n) return 0
    let sum = 0
    const eps = 1e-15
    for (let i = 0; i < n; i++) {
      const p = Math.max(eps, Math.min(1 - eps, yp[i]))
      sum += yt[i] * Math.log(p) + (1 - yt[i]) * Math.log(1 - p)
    }
    return -sum / n
  },
  cosineSim: (u: number[], v: number[]) => {
    const dot = MathLib.dot(u, v)
    const normU = MathLib.norm(u), normV = MathLib.norm(v)
    if (normU === 0 || normV === 0) return 0
    return dot / (normU * normV)
  },
  euclidean: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    const n = Math.min(a.length, b.length)
    let sum = 0
    for (let i = 0; i < n; i++) sum += Math.pow(a[i] - b[i], 2)
    return Math.sqrt(sum)
  },
  manhattan: (u: number[], v: number[]) => {
    const a = ensureArray(u), b = ensureArray(v)
    const n = Math.min(a.length, b.length)
    let sum = 0
    for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i])
    return sum
  },

  // Number Theory
  gcd: (a: number, b: number): number => {
    a = Math.abs(Math.round(a))
    b = Math.abs(Math.round(b))
    while (b) {
      const t = b
      b = a % b
      a = t
    }
    return a
  },
  lcm: (a: number, b: number): number => {
    if (a === 0 || b === 0) return 0
    return Math.abs(a * b) / MathLib.gcd(a, b)
  },
  isPrime: (n: number): boolean => {
    n = Math.round(n)
    if (n <= 1) return false
    if (n <= 3) return true
    if (n % 2 === 0 || n % 3 === 0) return false
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false
    }
    return true
  },
  primeFactors: (n: number): number[] => {
    n = Math.abs(Math.round(n))
    const factors: number[] = []
    let d = 2
    while (d * d <= n) {
      if (n % d === 0) {
        factors.push(d)
        n /= d
      } else {
        d++
      }
    }
    if (n > 1) factors.push(n)
    return factors
  },
  modPow: (base: number, exp: number, mod: number): number => {
    base = base % mod
    let res = 1
    exp = Math.round(exp)
    while (exp > 0) {
      if (exp % 2 === 1) res = (res * base) % mod
      base = (base * base) % mod
      exp = Math.floor(exp / 2)
    }
    return res
  },

  // Financial Mathematics
  compoundInterest: (P: number, r: number, n: number, t: number) => {
    return P * Math.pow(1 + r / n, n * t)
  },
  loanPayment: (P: number, annualRate: number, months: number) => {
    const r = annualRate / 12
    if (r === 0) return P / months
    return P * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  },
  npv: (rate: number, cashflows: number[]) => {
    const cfs = ensureArray(cashflows)
    return cfs.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0)
  },
}

// ----------------- EVALUATION ENGINE -----------------

// Pre-process math syntax to executable JavaScript:
// - replace '^' with '**'
// - replace implicit multiplication e.g. "2x" -> "2*x", "3(x)" -> "3*(x)"
// - replace 'e^x' with 'exp(x)'
// - replace '×' with '*', '÷' with '/'
export function preprocessExpression(expr: string): string {
  let cleaned = expr.trim()

  // Replace unicode operators
  cleaned = cleaned.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')

  // Replace e^x with exp(x)
  cleaned = cleaned.replace(/\be\^([a-zA-Z0-9_]+)/g, 'exp($1)')
  cleaned = cleaned.replace(/\be\^\(([^)]+)\)/g, 'exp($1)')

  // Replace power operator ^ with **
  cleaned = cleaned.replace(/\^/g, '**')

  // Handle implicit multiplication like 2x, 3(a+b), (a+b)(c+d)
  cleaned = cleaned.replace(/(\d+)([a-zA-Z_]\w*)/g, '$1*$2')
  cleaned = cleaned.replace(/(\d+)\(/g, '$1*(')
  cleaned = cleaned.replace(/\)(\d+)/g, ')*$1')
  cleaned = cleaned.replace(/\)\(/g, ')*(')
  cleaned = cleaned.replace(/([a-zA-Z_]\w*)\(/g, (match, fnName) => {
    // If it's a known function in MathLib, don't insert *
    if (fnName in MathLib) return match
    return `${fnName}*(`
  })

  return cleaned
}

export function evaluateFormula(
  expression: string,
  variables: Record<string, any>,
  options: { precision?: number; rangeForPlot?: { min: number; max: number; steps?: number } } = {}
): EvaluationResult {
  const precision = options.precision ?? 4
  const stepByStep: string[] = []

  try {
    const sanitizedExpr = preprocessExpression(expression)

    // Substitute numbers for trace
    let traceExpr = expression
    for (const [varName, varVal] of Object.entries(variables)) {
      const valStr = formatMathResult(varVal, 2)
      traceExpr = traceExpr.replace(new RegExp(`\\b${varName}\\b`, 'g'), `[${valStr}]`)
    }
    stepByStep.push(`Вихідний вираз: ${expression}`)
    stepByStep.push(`Підстановка значень: ${traceExpr}`)

    // Create execution scope with MathLib functions and parsed variables
    const scopeKeys = [...Object.keys(MathLib), ...Object.keys(variables)]
    const scopeVals = [...Object.values(MathLib), ...Object.values(variables).map(parseVariableInput)]

    // Safe Function evaluation
    const runner = new Function(...scopeKeys, `"use strict"; return (${sanitizedExpr});`)
    const rawResult = runner(...scopeVals)

    stepByStep.push(`Обчислений результат: ${formatMathResult(rawResult, precision)}`)

    // Decimal to fraction
    const frac = typeof rawResult === 'number' ? decimalToFraction(rawResult) : null
    if (frac) {
      stepByStep.push(`Раціональний дріб: ${frac}`)
    }

    // Optional 2D function plotting if expression depends on x
    let plotData: { x: number; y: number }[] | undefined = undefined
    if (options.rangeForPlot) {
      const minX = options.rangeForPlot.min
      const maxX = options.rangeForPlot.max
      const steps = options.rangeForPlot.steps || 100
      const dx = (maxX - minX) / steps
      plotData = []

      for (let i = 0; i <= steps; i++) {
        const xVal = minX + i * dx
        try {
          const plotScopeVals = scopeKeys.map(k => {
            if (k === 'x') return xVal
            if (k in variables) return parseVariableInput(variables[k])
            return (MathLib as any)[k]
          })
          const yVal = runner(...plotScopeVals)
          if (typeof yVal === 'number' && Number.isFinite(yVal)) {
            plotData.push({ x: Number(xVal.toFixed(4)), y: Number(yVal.toFixed(4)) })
          }
        } catch {
          // ignore discontinuity
        }
      }
    }

    return {
      success: true,
      result: rawResult,
      formattedResult: formatMathResult(rawResult, precision),
      fraction: frac,
      error: null,
      stepByStep,
      plotData,
    }
  } catch (err: any) {
    return {
      success: false,
      result: null,
      formattedResult: 'Помилка обчислення',
      fraction: null,
      error: err?.message || 'Некоректний синтаксис виразу',
      stepByStep: [`Помилка: ${err?.message || 'Некоректний вираз'}`],
    }
  }
}

// ----------------- INTERNAL HELPER FUNCTIONS -----------------

function ensureArray(val: any): number[] {
  if (Array.isArray(val)) return val.map(Number)
  if (typeof val === 'number') return [val]
  return []
}

function toFunction(fnOrExpr: any, varName = 'x'): (x: number) => number {
  if (typeof fnOrExpr === 'function') return fnOrExpr
  if (typeof fnOrExpr === 'string') {
    const expr = preprocessExpression(fnOrExpr)
    const scopeKeys = [...Object.keys(MathLib), varName]
    const fn = new Function(...scopeKeys, `"use strict"; return (${expr});`)
    return (x: number) => fn(...Object.values(MathLib), x)
  }
  return () => 0
}

function factorial(n: number): number {
  n = Math.round(n)
  if (n < 0) return NaN
  if (n === 0 || n === 1) return 1
  let res = 1
  for (let i = 2; i <= n; i++) res *= i
  return res
}

// Lanczos approximation for Gamma(z)
function gammaFunction(z: number): number {
  const g = 7
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.138571095836526, 9.9843695780195716e-6, 1.5056327351493116e-7
  ]
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFunction(1 - z))
  }
  z -= 1
  let x = p[0]
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (z + i)
  }
  const t = z + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
}

// Gauss Error Function erf(x)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1
  x = Math.abs(x)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}

// LU decomposition determinant for N x N matrix
function luDeterminant(M: number[][]): number {
  const n = M.length
  const A = M.map(row => [...row])
  let det = 1

  for (let i = 0; i < n; i++) {
    let pivot = i
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) pivot = j
    }
    if (Math.abs(A[pivot][i]) < 1e-12) return 0
    if (pivot !== i) {
      const temp = A[i]
      A[i] = A[pivot]
      A[pivot] = temp
      det = -det
    }
    det *= A[i][i]
    for (let j = i + 1; j < n; j++) {
      const factor = A[j][i] / A[i][i]
      for (let k = i; k < n; k++) {
        A[j][k] -= factor * A[i][k]
      }
    }
  }
  return det
}
