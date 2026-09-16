export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function mean(values: number[]): number {
  const finite = values.filter(isFiniteNumber);
  if (!finite.length) return Number.NaN;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function sampleStd(values: number[]): number {
  const finite = values.filter(isFiniteNumber);
  if (finite.length < 2) return Number.NaN;
  const mu = mean(finite);
  const ss = finite.reduce((sum, value) => sum + (value - mu) ** 2, 0);
  return Math.sqrt(ss / (finite.length - 1));
}

export function populationStd(values: number[]): number {
  const finite = values.filter(isFiniteNumber);
  if (!finite.length) return Number.NaN;
  const mu = mean(finite);
  const ss = finite.reduce((sum, value) => sum + (value - mu) ** 2, 0);
  return Math.sqrt(ss / finite.length);
}

export function median(values: number[]): number {
  const finite = values.filter(isFiniteNumber).sort((a, b) => a - b);
  if (!finite.length) return Number.NaN;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
}

export function coefficientOfVariation(values: number[]): number {
  const finite = values.filter(isFiniteNumber);
  if (finite.length < 2) return Number.NaN;
  const mu = mean(finite);
  if (mu === 0) return Number.NaN;
  return (sampleStd(finite) / Math.abs(mu)) * 100;
}

export function nanMean(values: number[]): number {
  return mean(values);
}

function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i += 1) sum += Math.log(i);
  return sum;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/** Survival P(X >= k) for Hypergeometric(N population, K success states, n draws). */
export function hypergeomSf(k: number, population: number, successStates: number, draws: number): number {
  if (successStates <= 0 || k <= 0) return 1;
  const maxX = Math.min(draws, successStates);
  const minX = Math.max(0, draws - (population - successStates));
  if (k <= minX) return 1;
  if (k > maxX) return 0;
  let survival = 0;
  for (let x = k; x <= maxX; x += 1) {
    const logP =
      logChoose(successStates, x) +
      logChoose(population - successStates, draws - x) -
      logChoose(population, draws);
    survival += Math.exp(logP);
  }
  return Math.min(1, Math.max(0, survival));
}

export function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)));
}

export function transpose(matrix: number[][]): number[][] {
  if (!matrix.length) return [];
  return matrix[0].map((_, col) => matrix.map((row) => row[col]));
}

export function matMul(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const m = b[0].length;
  const p = b.length;
  const out = Array.from({ length: n }, () => Array<number>(m).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < p; k += 1) {
      const aik = a[i][k];
      if (!aik) continue;
      for (let j = 0; j < m; j += 1) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

/** Jacobi eigen-decomposition for a symmetric matrix. Returns values + column eigenvectors. */
export function jacobiEigen(input: number[][]): { values: number[]; vectors: number[][] } {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v = identity(n);
  const maxIter = 80;

  for (let iter = 0; iter < maxIter; iter += 1) {
    let p = 0;
    let q = 1;
    let max = 0;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const mag = Math.abs(a[i][j]);
        if (mag > max) {
          max = mag;
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-14) break;

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];
    let c: number;
    let s: number;
    if (Math.abs(apq) < 1e-18) {
      c = 1;
      s = 0;
    } else {
      const tau = (aqq - app) / (2 * apq);
      const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      c = 1 / Math.sqrt(1 + t * t);
      s = t * c;
    }

    const appNew = c * c * app - 2 * s * c * apq + s * s * aqq;
    const aqqNew = s * s * app + 2 * s * c * apq + c * c * aqq;
    a[p][p] = appNew;
    a[q][q] = aqqNew;
    a[p][q] = 0;
    a[q][p] = 0;

    for (let i = 0; i < n; i += 1) {
      if (i === p || i === q) continue;
      const aip = a[i][p];
      const aiq = a[i][q];
      a[i][p] = c * aip - s * aiq;
      a[p][i] = a[i][p];
      a[i][q] = s * aip + c * aiq;
      a[q][i] = a[i][q];
    }

    for (let i = 0; i < n; i += 1) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = c * vip - s * viq;
      v[i][q] = s * vip + c * viq;
    }
  }

  return {
    values: a.map((row, i) => row[i]),
    vectors: v,
  };
}

export function frobeniusNormSquared(matrix: number[][]): number {
  let sum = 0;
  for (const row of matrix) {
    for (const value of row) {
      if (isFiniteNumber(value)) sum += value * value;
    }
  }
  return sum;
}
