import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const OUT = path.join(__dirname, 'pages', 'main-graph');

// cy 인스턴스를 fiber에서 추출하는 공통 함수
function findCyFromFiber(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const cytoscapeInner = canvas?.parentElement;
    const wrapperDiv = cytoscapeInner?.parentElement;
    if (!wrapperDiv) return null;
    const fiberKey = Object.keys(wrapperDiv).find(k => k.startsWith('__reactFiber'));
    if (!fiberKey) return null;
    let compFiber = wrapperDiv[fiberKey]?.return;
    let attempts = 0;
    while (compFiber && attempts < 20) {
      const ms = compFiber.memoizedState;
      if (ms) {
        let h = ms, hIdx = 0;
        while (h && hIdx < 10) {
          const val = h.memoizedState;
          if (val && val.current && typeof val.current.elements === 'function') {
            // cy를 window에 임시 노출
            window.__cy_capture = val.current;
            window.__cy_container_rect = cytoscapeInner.getBoundingClientRect();
            return true;
          }
          h = h.next; hIdx++;
        }
      }
      compFiber = compFiber.return; attempts++;
    }
    return false;
  });
}

// 노드를 화면 중앙으로 이동 후 좌표 반환
async function centerAndGetPos(page, nodeId) {
  await findCyFromFiber(page);
  return page.evaluate(async (id) => {
    const cy = window.__cy_capture;
    if (!cy) return null;
    const node = cy.getElementById(String(id));
    if (node.length === 0) return null;
    // 노드를 화면 중앙으로 애니메이션
    await new Promise(resolve => {
      cy.animate({ center: { eles: node }, zoom: 1.5 }, { duration: 600, complete: resolve });
    });
    const rp = node.renderedPosition();
    const rect = window.__cy_container_rect;
    return { x: rect.left + rp.x, y: rect.top + rp.y };
  }, nodeId);
}

// React fiber를 통해 Cytoscape cy 인스턴스에서 노드 위치 반환
async function getCyNodePos(page, nodeId) {
  return centerAndGetPos(page, nodeId);
}

// suggestion 노드 중 하나의 위치 반환 (화면 중앙 이동 후)
async function getFirstSuggestionNodePos(page) {
  await findCyFromFiber(page);
  return page.evaluate(async () => {
    const cy = window.__cy_capture;
    if (!cy) return null;
    const suggestions = cy.nodes('[type="suggestion"]');
    if (suggestions.length === 0) return null;
    const first = suggestions[0];
    await new Promise(resolve => {
      cy.animate({ center: { eles: first }, zoom: 1.2 }, { duration: 500, complete: resolve });
    });
    const rp = first.renderedPosition();
    const rect = window.__cy_container_rect;
    return { x: rect.left + rp.x, y: rect.top + rp.y, count: suggestions.length };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'lsh@test.com');
  await page.fill('input[type="password"]', 'String123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  console.log('Logged in');

  // ── 01: 초기 진입 (그래프 비활성, 헤더 링크 전체 노출) ──────────────────────
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: false });
  console.log('Saved 01-initial.png');

  // ── 02: SUPPORT 선택 ─────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /SUPPORT/ }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await findCyFromFiber(page);
  await page.evaluate(() => window.__cy_capture?.fit(undefined, 60));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-support.png`, fullPage: false });
  console.log('Saved 02-support.png');

  // ── 03: KINSHIP 선택 ─────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /KINSHIP/ }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3500);
  await findCyFromFiber(page);
  await page.evaluate(() => window.__cy_capture?.fit(undefined, 60));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-kinship.png`, fullPage: false });
  console.log('Saved 03-kinship.png');

  // ── 04: DUNBAR 선택 ──────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /DUNBAR/ }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(4000);
  await findCyFromFiber(page);
  await page.evaluate(() => window.__cy_capture?.fit(undefined, 60));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-dunbar.png`, fullPage: false });
  console.log('Saved 04-dunbar.png');

  // ── 05: 친구 노드 클릭 → FriendActionPanel ───────────────────────────────────
  const pos5 = await getCyNodePos(page, 5); // 배지환 id=5
  console.log('배지환 pos:', pos5);
  if (pos5) {
    await page.mouse.click(pos5.x, pos5.y);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${OUT}/05-friend-action-panel.png`, fullPage: false });
  console.log('Saved 05-friend-action-panel.png');

  // ── 06: suggestion 노드 그래프에 추가 (배지환 클릭 시 자동 로드) ─────────────
  // 이미 위에서 배지환 클릭 시 handleAnchorTap이 호출됨 → networkidle 후 suggestion 노드 등장
  await page.waitForTimeout(1000);
  let suggPos = await getFirstSuggestionNodePos(page);
  console.log('suggestion nodes:', suggPos);
  await page.screenshot({ path: `${OUT}/06-suggestion-nodes.png`, fullPage: false });
  console.log('Saved 06-suggestion-nodes.png');

  // ── 07: suggestion 노드 클릭 → SuggestionPanel ───────────────────────────────
  if (suggPos) {
    await page.mouse.click(suggPos.x, suggPos.y);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${OUT}/07-suggestion-panel.png`, fullPage: false });
  console.log('Saved 07-suggestion-panel.png');

  // ── 08: 라벨 탭 ──────────────────────────────────────────────────────────────
  // cy.emit('tap') 으로 배경 탭 이벤트를 시뮬레이션 → React setSelectedNodeId(null) 트리거
  await page.evaluate(() => {
    const cy = window.__cy_capture;
    if (cy) { cy.emit('tap'); cy.fit(undefined, 60); }
  });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '라벨 관리' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/08-label-tab.png`, fullPage: false });
  console.log('Saved 08-label-tab.png');

  // ── 09: 새 라벨 만들기 폼 토글 ────────────────────────────────────────────────
  const newLabelBtn = page.getByRole('button', { name: /새 라벨 만들기/ }).first();
  if (await newLabelBtn.isVisible()) await newLabelBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/09-label-create-form.png`, fullPage: false });
  console.log('Saved 09-label-create-form.png');

  // ── 10: SUPPORT 뷰 사이드바 — 뷰 밖 친구의 [+] 버튼 ──────────────────────────
  await page.getByRole('button', { name: '네트워크' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /SUPPORT/ }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  // SUPPORT는 노드가 적어 사이드바에 [+] 버튼 친구가 많음
  await page.screenshot({ path: `${OUT}/10-manual-add-button.png`, fullPage: false });
  console.log('Saved 10-manual-add-button.png');

  // ── 11: [+] 클릭 → 점선 테두리 노드 추가 ─────────────────────────────────────
  const addBtn = page.locator('button[title="그래프에 추가"]').first();
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: `${OUT}/11-manual-node-added.png`, fullPage: false });
  console.log('Saved 11-manual-node-added.png');

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
