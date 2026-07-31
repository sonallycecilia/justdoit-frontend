import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REPORT_DIR = resolve('.lighthouseci');
const OUTPUT_DIR = resolve('quality-reports');
const LIMIT_MS = Number(process.env.LCP_P75_LIMIT_MS ?? 2500);

function percentileNearestRank(values, percentile) {
  if (values.length === 0) {
    throw new Error('Nenhum valor foi informado para o cálculo do percentil.');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(percentile * sorted.length);
  return sorted[rank - 1];
}

const reportFiles = (await readdir(REPORT_DIR))
  .filter((file) => file.endsWith('.json'))
  .sort();

const samples = [];
for (const file of reportFiles) {
  const report = JSON.parse(await readFile(resolve(REPORT_DIR, file), 'utf8'));
  const lcp = report.audits?.['largest-contentful-paint']?.numericValue;

  if (Number.isFinite(lcp)) {
    samples.push(Math.round(lcp));
  }
}

if (samples.length < 2) {
  throw new Error(
    `São necessárias ao menos 2 amostras válidas de LCP; encontradas: ${samples.length}.`,
  );
}

const lcpP75 = percentileNearestRank(samples, 0.75);
const passed = lcpP75 <= LIMIT_MS;
const result = {
  metric: 'Largest Contentful Paint (LCP) no P75',
  formula: 'P75 = valor na posição ceil(0,75 × N) das amostras ordenadas',
  samplesMs: [...samples].sort((a, b) => a - b),
  percentile: 75,
  valueMs: lcpP75,
  limitMs: LIMIT_MS,
  passed,
  measuredAt: new Date().toISOString(),
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  resolve(OUTPUT_DIR, 'lcp-p75.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

console.log(
  `[MÉTRICA DESEMPENHO - LCP P75] amostras=${result.samplesMs.join(',')} ms`
  + ` -> P75=${lcpP75} ms; limite=${LIMIT_MS} ms; ${passed ? 'APROVADA' : 'REPROVADA'}`,
);

if (!passed) {
  process.exitCode = 1;
}
