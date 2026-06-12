import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const PAGES_DIR = path.join(__dirname, 'pages');

async function login(context, email, password) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  return page;
}

async function makeApiReq(path, token, method = 'GET', body = null) {
  const http = (await import('http')).default;
  return new Promise((resolve, reject) => {
    const opts = {
      host: 'localhost', port: 8080, path, method,
      headers: { 'Cookie': `access_token=${token}`, 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setSlider(page, value) {
  const slider = page.locator('input[type="range"]').first();
  await slider.evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
  await page.waitForTimeout(300);
}

async function getBuzzIds(token) {
  const r = await makeApiReq('/api/v1/buzzes/', token);
  if (r.status !== 200) return { myBuzzId: null, otherBuzzId: null };
  const data = JSON.parse(r.body);
  const buzzes = data.content ?? [];
  const received = buzzes.find(b => !b.isCreator); // 받은 Buzz (타인)
  return { receivedBuzzId: received?.buzzId ?? null };
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ── 사전 준비: bjh → lsh Buzz 전송 (없으면 새로 생성) ───────────────────────
  const bjhCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const bjhPage = await login(bjhCtx, 'bjh@test.com', 'String123!');
  const bjhToken = (await bjhCtx.cookies()).find(c => c.name === 'access_token')?.value;

  // bjh가 받은 Buzz 목록 (lsh가 보낸 것) → lsh의 "내 Buzz" ID 수집
  const bjhBuzzes = await makeApiReq('/api/v1/buzzes/', bjhToken);
  let lshCreatedBuzzId = null;
  if (bjhBuzzes.status === 200) {
    const content = JSON.parse(bjhBuzzes.body).content ?? [];
    lshCreatedBuzzId = content.find(b => b.author?.userId === 4)?.buzzId ?? null;
  }

  // bjh가 lsh에게 아직 안 보냈으면 한 번 전송
  if (!lshCreatedBuzzId) {
    console.log('Creating buzz from lsh to bjh via form...');
    await bjhPage.goto(`${BASE_URL}/buzzes/new`);
    await bjhPage.waitForLoadState('networkidle');
    await bjhPage.waitForTimeout(600);
    // bjh가 lsh에게: API 직접
    await makeApiReq('/api/v1/buzzes', bjhToken, 'POST', {
      text: '[캡처용] 배지환이 보낸 Buzz',
      recipient: { type: 'MANUAL', memberIds: [4] },
    });
  }

  await bjhCtx.close();

  // ── lsh 세션 시작 ──────────────────────────────────────────────────────────
  const lshCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await login(lshCtx, 'lsh@test.com', 'String123!');
  const lshToken = (await lshCtx.cookies()).find(c => c.name === 'access_token')?.value;
  console.log('Logged in as lsh. URL:', page.url());

  // lsh 받은 Buzz 목록 (타인 Buzz ID)
  const lshBuzzResp = await makeApiReq('/api/v1/buzzes/', lshToken);
  let otherBuzzId = null;
  if (lshBuzzResp.status === 200) {
    const content = JSON.parse(lshBuzzResp.body).content ?? [];
    otherBuzzId = content.find(b => !b.isCreator)?.buzzId ?? null;
  }

  // lsh가 bjh에게 보낸 Buzz가 없으면 직접 생성
  if (!lshCreatedBuzzId) {
    const cr = await makeApiReq('/api/v1/buzzes', lshToken, 'POST', {
      text: '[캡처용] 이수환이 보낸 Buzz',
      recipient: { type: 'MANUAL', memberIds: [5] },
    });
    console.log('Create buzz status:', cr.status);
    // 재조회
    const bjhCtx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const bjhPage2 = await login(bjhCtx2, 'bjh@test.com', 'String123!');
    const bjhToken2 = (await bjhCtx2.cookies()).find(c => c.name === 'access_token')?.value;
    const b2 = await makeApiReq('/api/v1/buzzes/', bjhToken2);
    if (b2.status === 200) {
      const c2 = JSON.parse(b2.body).content ?? [];
      lshCreatedBuzzId = c2.find(b => b.author?.userId === 4)?.buzzId ?? null;
    }
    await bjhCtx2.close();
  }

  console.log('lshCreatedBuzzId:', lshCreatedBuzzId);
  console.log('otherBuzzId:', otherBuzzId);

  // ── /buzzes ─────────────────────────────────────────────────────────────────
  const buzzesDir = path.join(PAGES_DIR, 'buzzes');
  await page.goto(`${BASE_URL}/buzzes`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const bodyText = await page.textContent('body');
  const isEmpty = bodyText.includes('받은 Buzz가 없습니다') || bodyText.includes('Buzz가 없');
  if (isEmpty) {
    await page.screenshot({ path: path.join(buzzesDir, '02-empty.png'), fullPage: false });
    console.log('Saved buzzes/02-empty.png');
  } else {
    await page.screenshot({ path: path.join(buzzesDir, '01-list.png'), fullPage: false });
    console.log('Saved buzzes/01-list.png');
  }

  // ── /buzzes/new ─────────────────────────────────────────────────────────────
  const buzzesNewDir = path.join(PAGES_DIR, 'buzzes-new');
  await page.goto(`${BASE_URL}/buzzes/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 01 — ANCHOR 모드 기본 (슬라이더 "보통")
  await page.getByRole('button', { name: 'Anchor' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(buzzesNewDir, '01-anchor.png'), fullPage: false });
  console.log('Saved buzzes-new/01-anchor.png');

  // 02 — 슬라이더 최소값(0.1)
  await setSlider(page, 0.1);
  await page.screenshot({ path: path.join(buzzesNewDir, '02-anchor-slider-min.png'), fullPage: false });
  console.log('Saved buzzes-new/02-anchor-slider-min.png');

  // 03 — 슬라이더 최대값(1.0)
  await setSlider(page, 1.0);
  await page.screenshot({ path: path.join(buzzesNewDir, '03-anchor-slider-max.png'), fullPage: false });
  console.log('Saved buzzes-new/03-anchor-slider-max.png');

  // 04 — LABEL 모드
  await page.getByRole('button', { name: '라벨' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(buzzesNewDir, '04-label.png'), fullPage: false });
  console.log('Saved buzzes-new/04-label.png');

  // 05 — MANUAL 모드 (직접 선택)
  await page.getByRole('button', { name: '직접 선택' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(buzzesNewDir, '05-manual.png'), fullPage: false });
  console.log('Saved buzzes-new/05-manual.png');

  // 06 — 수신자 미선택 전송 → 클라이언트 에러 (직접 선택 모드 유지, 체크 없이 제출)
  await page.locator('textarea').first().fill('[검증용]');
  await page.getByRole('button', { name: 'Buzz 보내기' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(buzzesNewDir, '06-validation-error.png'), fullPage: false });
  console.log('Saved buzzes-new/06-validation-error.png');

  // ── /buzzes/{buzzId} ────────────────────────────────────────────────────────
  const buzzesIdDir = path.join(PAGES_DIR, 'buzzes-id');

  if (lshCreatedBuzzId) {
    await page.goto(`${BASE_URL}/buzzes/${lshCreatedBuzzId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 01 — 내 Buzz 상세 (isCreator=true → [삭제] 버튼 표시)
    await page.screenshot({ path: path.join(buzzesIdDir, '01-my-buzz.png'), fullPage: false });
    console.log('Saved buzzes-id/01-my-buzz.png');

    // 02 — 댓글 작성 → [수정][삭제] 버튼 확인
    const textarea = page.locator('textarea[placeholder*="댓글"]').first();
    if (await textarea.isVisible()) {
      await textarea.fill('[캡처용] 테스트 댓글');
      await page.getByRole('button', { name: '전송' }).click();
      await page.waitForTimeout(1200);
    }
    await page.screenshot({ path: path.join(buzzesIdDir, '02-my-comment.png'), fullPage: false });
    console.log('Saved buzzes-id/02-my-comment.png');
  } else {
    console.warn('lshCreatedBuzzId not found — skipping 01/02');
  }

  if (otherBuzzId) {
    await page.goto(`${BASE_URL}/buzzes/${otherBuzzId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 03 — 타인 Buzz (isCreator=false → 삭제 버튼 없음)
    await page.screenshot({ path: path.join(buzzesIdDir, '03-others-buzz.png'), fullPage: false });
    console.log('Saved buzzes-id/03-others-buzz.png');
  } else {
    console.warn('otherBuzzId not found — skipping 03');
  }

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
