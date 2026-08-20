import { expect, test } from 'playwright/test';
import { AUDIT_TASK_ID, AUDITABLE_ROUTES } from '../src/appRoutes.js';

const MOBILE_VIEWPORTS = [
  { name: 'compacto', width: 320, height: 568 },
  { name: 'padrao', width: 390, height: 844 },
];

function mockedBody(url) {
  if (url.pathname === '/auth/me') {
    return { id: AUDIT_TASK_ID, name: 'Auditoria Mobile', email: 'mobile@example.com', profile: 'USER' };
  }
  if (url.pathname === `/tasks/${AUDIT_TASK_ID}`) {
    return {
      id: AUDIT_TASK_ID,
      title: 'Tarefa de auditoria responsiva com título longo',
      description: 'Descrição usada para verificar a leitura completa em telas estreitas.',
      status: 'PENDING',
      priority: 'MEDIUM',
    };
  }
  if (url.pathname === '/tasks/report') {
    return {
      byDay: [], byCategory: [], taskPerformance: [], totalTasks: 0,
      dueTasksCompleted: 0, totalEstimatedMinutes: 0, totalActualSeconds: 0,
    };
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

async function setSession(page, isPrivate) {
  await page.goto('/');
  await page.evaluate(({ privateRoute }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (privateRoute) {
      localStorage.setItem('jdi.sessao', JSON.stringify({
        accessToken: 'access-mobile',
        refreshToken: 'refresh-mobile',
        name: 'Auditoria Mobile',
      }));
    }
  }, { privateRoute: isPrivate });
}

async function responsiveProblems(page) {
  return page.evaluate(() => {
    const width = window.innerWidth;
    const isVisible = (element) => {
      if (element.closest('[aria-hidden="true"], [inert]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const insideHorizontalScroller = (element) => {
      for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) return true;
      }
      return false;
    };
    const insideHiddenTree = (element) => {
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
      }
      return false;
    };
    const describe = (element) => {
      const id = element.id ? `#${element.id}` : '';
      const classes = [...element.classList].slice(0, 3).map((name) => `.${name}`).join('');
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const interactive = [...document.querySelectorAll(
      'button, a[href], input, textarea, select, [contenteditable="true"]',
    )].filter(isVisible);
    const clippedControls = interactive.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (insideHorizontalScroller(element)) return [];
      if (rect.left < -1 || rect.right > width + 1) {
        return [{ element: describe(element), left: Math.round(rect.left), right: Math.round(rect.right), width }];
      }
      return [];
    });
    const invisibleFields = [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')]
      .filter((element) => {
        if (['hidden', 'checkbox', 'radio', 'file', 'color'].includes(element.type)
          || element.closest('[aria-hidden="true"], [inert]') || insideHiddenTree(element)) return false;
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && !isVisible(element);
      })
      .map(describe);
    return {
      viewport: width,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > width + 1,
      clippedControls,
      invisibleFields,
    };
  });
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`responsividade mobile ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport });

    for (const surface of AUDITABLE_ROUTES) {
      test(`${surface.name} não cria overflow nem corta controles`, async ({ page }) => {
        await mockBackend(page);
        await setSession(page, surface.private);
        await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(350);

        expect(new URL(page.url()).pathname).toBe(surface.path);
        const problems = await responsiveProblems(page);
        expect(problems, JSON.stringify({ surface, problems }, null, 2)).toMatchObject({
          horizontalOverflow: false,
          clippedControls: [],
          invisibleFields: [],
        });
      });
    }
  });
}

test('sidebar pode ser expandida, usada e fechada em 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockBackend(page);
  await setSession(page, true);
  await page.goto('/visao-geral', { waitUntil: 'domcontentloaded' });

  const abrir = page.getByRole('button', { name: 'Abrir menu' });
  await expect(abrir).toBeVisible();
  await abrir.click();
  const fechar = page.locator('.sidebar').getByRole('button', { name: 'Fechar menu' });
  await expect(fechar).toHaveAttribute('aria-expanded', 'true');
  const calendario = page.locator('.sidebar a[href="/calendario"]');
  await expect(calendario).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveClass(/sidebar--mobile-open/);

  await calendario.click();
  await expect(page).toHaveURL(/\/calendario$/);
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
});
