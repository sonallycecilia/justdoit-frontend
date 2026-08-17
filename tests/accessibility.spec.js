import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from 'playwright/test';

const TASK_ID = '00000000-0000-0000-0000-000000000001';
const surfaces = [
  { name: 'home', path: '/', private: false },
  { name: 'cadastro', path: '/signup', private: false },
  { name: 'onboarding', path: '/onboarding', private: true },
  { name: 'visao-geral', path: '/visao-geral', private: true },
  { name: 'tarefas', path: '/todo', private: true },
  { name: 'nova-tarefa', path: '/tasks/nova', private: true },
  { name: 'detalhe-tarefa', path: `/tasks/${TASK_ID}`, private: true },
  { name: 'anotacoes', path: '/anotacoes', private: true },
  { name: 'calendario', path: '/calendario', private: true },
  { name: 'analise', path: '/analise', private: true },
  { name: 'configuracoes', path: '/configuracoes', private: true },
];

function mockedBody(url) {
  if (url.pathname === '/auth/me') {
    return { id: TASK_ID, name: 'Auditoria', email: 'auditoria@example.com', profile: 'USER' };
  }
  if (url.pathname === `/tasks/${TASK_ID}`) {
    return { id: TASK_ID, title: 'Tarefa de auditoria', status: 'PENDING', priority: 'MEDIUM' };
  }
  if (url.pathname === '/tasks/report') {
    return { byDay: [], byCategory: [], taskPerformance: [], totalTasks: 0, dueTasksCompleted: 0, totalEstimatedMinutes: 0, totalActualSeconds: 0 };
  }
  if (url.pathname === '/analytics/overall') return { reports: [], timeBlocks: [] };
  return [];
}

async function mockBackend(page) {
  await page.route(/^http:\/\/localhost:808[0-3]\//, async (route) => {
    const url = new URL(route.request().url());
    const nullable = /\/(note|module-config|cycle-config|timer|timers\/active|focus-sessions)$/.test(url.pathname)
      || url.pathname === '/weekly-plans';
    await route.fulfill({
      status: nullable ? 404 : 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(nullable ? { message: 'Não configurado' } : mockedBody(url)),
    });
  });
}

test('métrica WCAG automatizada em todas as rotas', async ({ page }) => {
  await mockBackend(page);
  const results = [];

  for (const surface of surfaces) {
    await page.goto('/');
    await page.evaluate(({ key, value }) => {
      [...Array(localStorage.length).keys()]
        .map((index) => localStorage.key(index))
        .filter((storageKey) => storageKey?.startsWith('jdi.sessao'))
        .forEach((storageKey) => localStorage.removeItem(storageKey));
      [...Array(sessionStorage.length).keys()]
        .map((index) => sessionStorage.key(index))
        .filter((storageKey) => storageKey?.startsWith('jdi.sessao'))
        .forEach((storageKey) => sessionStorage.removeItem(storageKey));
      if (value) localStorage.setItem(key, value);
    }, {
      key: 'jdi.sessao',
      value: surface.private
        ? JSON.stringify({ accessToken: 'access-auditoria', refreshToken: 'refresh-auditoria', name: 'Auditoria' })
        : null,
    });

    await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(750);
    expect(new URL(page.url()).pathname, `${surface.name} não pode redirecionar durante a auditoria`).toBe(surface.path);

    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('[aria-hidden="true"]')
      .analyze();

    results.push({
      surface: surface.name,
      path: surface.path,
      passedRules: axe.passes.map((rule) => rule.id),
      violations: axe.violations.map((rule) => ({
        id: rule.id,
        impact: rule.impact,
        help: rule.help,
        nodes: rule.nodes.length,
        details: rule.nodes.map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
      })),
      incompleteRules: axe.incomplete.map((rule) => rule.id),
    });
  }

  const approved = results.reduce((sum, result) => {
    const violated = new Set(result.violations.map((rule) => rule.id));
    return sum + new Set(result.passedRules.filter((rule) => !violated.has(rule))).size;
  }, 0);
  const denominator = results.reduce((sum, result) => (
    sum + new Set([...result.passedRules, ...result.violations.map((rule) => rule.id)]).size
  ), 0);
  const violations = results.reduce((sum, result) => sum + result.violations.length, 0);
  const percentage = denominator ? (approved / denominator) * 100 : 0;
  const report = {
    metric: 'Conformidade de acessibilidade automatizada',
    standard: 'WCAG 2 A/AA, WCAG 2.1 A/AA e WCAG 2.2 AA cobertas pelo axe-core',
    formula: 'regras-página aprovadas / (regras-página aprovadas + regras-página violadas)',
    surfacesExpected: surfaces.length,
    surfacesAudited: results.length,
    numerator: approved,
    denominator,
    percentage: Number(percentage.toFixed(2)),
    limitPercentage: 100,
    violations,
    incomplete: results.reduce((sum, result) => sum + result.incompleteRules.length, 0),
    passed: results.length === surfaces.length && violations === 0 && percentage === 100,
    measuredAt: new Date().toISOString(),
    results,
  };

  await mkdir(resolve('quality-reports'), { recursive: true });
  await writeFile(resolve('quality-reports/accessibility.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  expect(report.surfacesAudited).toBe(report.surfacesExpected);
  expect(results.flatMap((result) => result.violations), JSON.stringify(report.results, null, 2)).toEqual([]);
});
