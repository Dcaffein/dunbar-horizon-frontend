/**
 * 메모리얼 시나리오 테스트
 * 1. lsh가 종료된 플래그에서 memorial 미작성 상태로 조회 시도 → 게이트 확인
 * 2. 게이트 화면에서 "작성하기" → 바텀시트 → 내용 입력 → 제출 → 결과 확인
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(__dirname, 'pages');
const BASE  = 'http://localhost:3000';
const API   = 'http://localhost:8080';

const LSH = { email: 'lsh@test.com',  password: 'String123!', id: 4 };
const CDH = { email: 'chdh@test.com', password: 'String123!', id: 2 };

const ok   = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const fail = (m) => console.log(`  ❌ ${m}`);
const step = (m) => console.log(`\n── ${m}`);

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 10000 });
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'access_token')?.value;
  if (!token) throw new Error(`로그인 실패: ${email}`);
  return token;
}

async function apiPost(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `access_token=${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function pastISO(ms) { return new Date(Date.now() - ms).toISOString().slice(0, 19); }
const H = 3600000, D = 86400000;

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. CDH가 종료된 플래그 생성 (lsh=참여자, CDH+user5만 memorial 작성) ──
  step('1. CDH 플래그 시드 — lsh는 참여자, memorial 미작성');
  const cdhCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cdhPage = await cdhCtx.newPage();
  const cdhToken = await login(cdhPage, CDH.email, CDH.password);
  ok('CDH 로그인 성공');

  const seed = await apiPost('/api/dev/flags/seed', {
    hostUserId: CDH.id,
    flags: [{
      title: '비밀 캠핑 🏕️',
      status: 'CLOSED',
      schedule: {
        startDateTime: pastISO(14 * D),
        endDateTime:   pastISO(14 * D - 3 * H),
        deadline:      pastISO(15 * D),
      },
      capacity: 6,
      participantUserIds: [LSH.id, 5],
      memorials: [
        { writerUserId: CDH.id, content: '정말 별이 예뻤어요 🌟 또 가고 싶다' },
        { writerUserId: 5,      content: '모닥불 앞에서 나눈 이야기들이 아직도 기억나요' },
      ],
    }],
  }, cdhToken);

  const flagId = seed?.flagIds?.[0];
  if (!flagId) throw new Error('시드 실패');
  ok(`플래그 생성: flagId=${flagId} (lsh는 참여자, memorial 없음)`);
  await cdhPage.close();
  await cdhCtx.close();

  // ── 2. lsh 로그인 → memorial 페이지 접근 (미작성 상태) ───────────────────
  step('2. lsh — memorial 미작성 상태로 조회');
  const lshCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const lshPage = await lshCtx.newPage();
  await login(lshPage, LSH.email, LSH.password);
  ok('lsh 로그인 성공');

  await lshPage.goto(`${BASE}/flags/${flagId}/memorial`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(800);
  await lshPage.screenshot({ path: `${PAGES}/flags-id/11-memorial-locked.png`, fullPage: true });

  const isLocked    = await lshPage.locator('text=메모리얼을 작성하면').isVisible().catch(() => false);
  const memCount    = await lshPage.locator('text=Memorial').count();
  const writeBtn    = lshPage.locator('button').filter({ hasText: '작성하기' });
  const writeBtnVis = await writeBtn.isVisible().catch(() => false);

  isLocked ? ok('🔒 게이트 표시 — 미작성 메시지 노출') : warn(`게이트 없음 (Memorial 요소: ${memCount}개)`);
  writeBtnVis ? ok('"작성하기" 버튼 표시') : warn('"작성하기" 버튼 없음');

  // ── 3. 작성하기 → 바텀시트 → 내용 입력 → 제출 ──────────────────────────
  step('3. "작성하기" → 바텀시트 → 제출');

  if (writeBtnVis) {
    await writeBtn.click();
    await lshPage.waitForTimeout(500);
    await lshPage.screenshot({ path: `${PAGES}/flags-id/12-memorial-write-sheet.png`, fullPage: true });
    ok('바텀시트 열림');

    await lshPage.fill('textarea', '늦게 합류했지만 정말 즐거운 캠핑이었어요! 🔥 다들 감사합니다.');
    await lshPage.waitForTimeout(200);
    await lshPage.screenshot({ path: `${PAGES}/flags-id/13-memorial-write-filled.png`, fullPage: true });
    ok('내용 입력');

    const saveBtn = lshPage.locator('button').filter({ hasText: '저장' }).last();
    await saveBtn.click();
    await lshPage.waitForTimeout(1500);
    await lshPage.screenshot({ path: `${PAGES}/flags-id/14-memorial-after-submit.png`, fullPage: true });

    // 결과 확인
    const errEl    = await lshPage.locator('[class*="text-red"]').first().textContent().catch(() => null);
    const stillLocked = await lshPage.locator('text=메모리얼을 작성하면').isVisible().catch(() => false);
    const sheetOpen   = await lshPage.locator('text=Memorial 작성하기').isVisible().catch(() => false);

    if (errEl && errEl.trim()) {
      fail(`백엔드 거부: ${errEl.trim()}`);
    } else if (stillLocked) {
      warn('제출 후에도 게이트 상태 유지 (리프레시 전)');
    } else if (sheetOpen) {
      warn('바텀시트가 닫히지 않음 — 제출 실패 가능성');
    } else {
      ok('제출 성공 — 페이지 리프레시됨');
    }
  } else {
    warn('"작성하기" 버튼이 없어 제출 테스트 스킵');
  }

  await browser.close();
  console.log('\n─────────────────────────────');
  console.log('테스트 완료');
}

run().catch((err) => {
  console.error('\n❌ FATAL:', err.message);
  process.exit(1);
});
