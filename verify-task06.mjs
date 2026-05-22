import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  // 로그인
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name=email]', 'lsh@test.com');
  await page.fill('input[name=password]', 'String123!');
  await Promise.all([
    page.waitForNavigation({ timeout: 8000 }).catch(() => {}),
    page.keyboard.press('Enter'),
  ]);
  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // DUNBAR 클릭 → 그래프 로드
  const dunbarBtn = page.locator('button:has-text("DUNBAR")').first();
  await dunbarBtn.click({ force: true });
  await page.waitForTimeout(6000);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();

  // [검증1] 초기 패널 없음
  const aliasInput = page.locator('input[placeholder="별칭"]').first();
  console.log('[검증1] 초기 패널 숨김 (false여야):', await aliasInput.isVisible());

  // [검증2] 노드 탐색: 그래프 영역 여러 위치 클릭해서 노드 탭 찾기
  let nodeFound = false;
  if (box) {
    // 노드들이 분포하는 영역을 격자로 탐색
    const offsets = [
      [0.35, 0.25], [0.45, 0.25], [0.55, 0.25], [0.65, 0.25],
      [0.35, 0.40], [0.45, 0.40], [0.55, 0.40], [0.65, 0.40],
      [0.35, 0.55], [0.45, 0.55], [0.55, 0.55], [0.65, 0.55],
      [0.75, 0.30], [0.75, 0.45], [0.75, 0.60],
    ];
    for (const [rx, ry] of offsets) {
      const x = box.x + box.width * rx;
      const y = box.y + box.height * ry;
      await page.mouse.click(x, y);
      await page.waitForTimeout(400);
      if (await aliasInput.isVisible()) {
        nodeFound = true;
        console.log(`[검증2] 노드 탭 성공 — 위치 rx=${rx} ry=${ry}`);
        break;
      }
    }
  }
  console.log('[검증2] 노드 탭 후 패널 표시:', nodeFound);
  await page.screenshot({ path: 'verify-06-01-panel.png' });

  if (nodeFound) {
    // [검증3] 패널 내 요소 확인
    const muteText = page.locator('text=음소거').first();
    const routableText = page.locator('text=추천 경유 허용').first();
    const deleteBtn = page.locator('button:has-text("친구 삭제")').first();
    const saveBtn = page.locator('button:has-text("저장")').first();
    console.log('[검증3] 별칭 입력창:', await aliasInput.isVisible());
    console.log('[검증3] 저장 버튼:', await saveBtn.isVisible());
    console.log('[검증3] 음소거:', await muteText.isVisible());
    console.log('[검증3] 추천 경유 허용:', await routableText.isVisible());
    console.log('[검증3] 친구 삭제 버튼:', await deleteBtn.isVisible());

    // [검증4] 빈 영역 클릭 → 패널 닫힘
    if (box) {
      await page.mouse.click(box.x + 5, box.y + 5);
      await page.waitForTimeout(500);
    }
    console.log('[검증4] 빈 영역 클릭 후 패널 닫힘 (false여야):', await aliasInput.isVisible());

    // [검증5] 라벨 탭에서 노드 클릭 시 패널 노출
    await page.getByRole('button', { name: '라벨 관리' }).click();
    await page.waitForTimeout(300);
    if (box) {
      const offsets2 = [
        [0.35, 0.25], [0.45, 0.25], [0.55, 0.25], [0.65, 0.25],
        [0.35, 0.40], [0.45, 0.40], [0.55, 0.40], [0.65, 0.40],
        [0.35, 0.55], [0.45, 0.55], [0.55, 0.55], [0.65, 0.55],
        [0.75, 0.30], [0.75, 0.45], [0.75, 0.60],
      ];
      for (const [rx, ry] of offsets2) {
        await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
        await page.waitForTimeout(400);
        if (await aliasInput.isVisible()) break;
      }
    }
    await page.screenshot({ path: 'verify-06-02-label-tab.png' });
    console.log('[검증5] 라벨 탭에서 패널 표시:', await aliasInput.isVisible());
  }

} catch (e) {
  console.error('오류:', e.message);
  await page.screenshot({ path: 'verify-06-error.png' }).catch(() => {});
} finally {
  await browser.close();
}
