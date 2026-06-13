/**
 * Flag 전체 페이지 캡처
 *
 * 시드:
 *   flagA (OPEN)  : lsh 호스트, CDH 참여자  → host / participant 뷰
 *   flagB (OPEN)  : lsh 호스트, CDH 미참여  → non-participant 뷰 (CDH가 둘러보기)
 *   flagC (CLOSED): lsh 호스트, CDH 참여자, memorials 있음 → 종료 뷰 / memorial
 *   flagD (OPEN)  : CDH 호스트 → lsh에게 초대 발송 → /flags/invitations
 *
 * 캡처 목록:
 *   flags/          01-browsing.png        둘러보기 탭 (CDH)
 *                   02-hosting.png         호스팅 탭 (lsh)
 *                   03-hosting-ended.png   호스팅 종료됨 (lsh)
 *                   04-participating.png   참여 중 탭 (CDH)
 *   flags-id/       01-host.png            호스트 뷰 (lsh, flagA)
 *                   02-participant.png     참여자 뷰 (CDH, flagA)
 *                   03-non-participant.png 비참여자 뷰 (CDH, flagB)
 *                   04-ended.png           종료 뷰 (lsh, flagC)
 *                   05-invite-modal.png    초대 모달 (lsh, flagA)
 *   flags-id-memorial/
 *                   01-locked.png          미작성 게이트 (lsh, flagC)
 *                   02-unlocked.png        목록 (CDH, flagC - CDH는 memorial 작성)
 *   flags-invitations/
 *                   01-list.png            받은 초대 목록 (lsh)
 *   flags-new/      01-form.png            빈 폼
 *                   02-validation.png      유효성 오류
 *                   03-encore.png          Encore 폼
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(__dirname, 'pages');
const BASE  = 'http://localhost:3000';
const API   = 'http://localhost:8080';

const LSH = { email: 'lsh@test.com',  password: 'String123!', id: 4 };
const CDH = { email: 'chdh@test.com', password: 'String123!', id: 2 };

const ok   = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const step = (m) => console.log(`\n── ${m}`);

function pastISO(ms) { return new Date(Date.now() - ms).toISOString().slice(0, 19); }
function futureISO(ms) { return new Date(Date.now() + ms).toISOString().slice(0, 19); }
const H = 3600000, D = 86400000;

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

async function apiLogin(email, password) {
  const res = await fetch(`${API}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  const token = cookie.match(/access_token=([^;]+)/)?.[1];
  if (!token) throw new Error(`API 로그인 실패: ${email}`);
  return token;
}

async function apiPost(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `access_token=${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function browserLogin(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 10000 });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function run() {
  // 출력 디렉토리
  const D_FLAGS    = path.join(PAGES, 'flags');
  const D_ID       = path.join(PAGES, 'flags-id');
  const D_MEM      = path.join(PAGES, 'flags-id-memorial');
  const D_INV      = path.join(PAGES, 'flags-invitations');
  const D_NEW      = path.join(PAGES, 'flags-new');
  [D_FLAGS, D_ID, D_MEM, D_INV, D_NEW].forEach(ensureDir);

  // ── 1. 시드 ────────────────────────────────────────────────────────────────
  step('1. 시드 생성');
  const lshToken = await apiLogin(LSH.email, LSH.password);
  const cdhToken = await apiLogin(CDH.email, CDH.password);

  // flagA: lsh 호스트, CDH 참여자 (OPEN)
  const seedA = await apiPost('/api/dev/flags/seed', {
    hostUserId: LSH.id,
    flags: [{
      title: '한강 치맥 파티 🍗',
      status: 'OPEN',
      schedule: {
        startDateTime: futureISO(7 * D),
        endDateTime:   futureISO(7 * D + 4 * H),
        deadline:      futureISO(6 * D),
      },
      capacity: 12,
      participantUserIds: [CDH.id],
    }],
  }, lshToken);
  const flagA = seedA.flagIds[0];
  ok(`flagA(OPEN, lsh호스트+CDH참여): ${flagA}`);

  // flagB: lsh 호스트, CDH 미참여 (OPEN) — 비참여자 뷰용
  const seedB = await apiPost('/api/dev/flags/seed', {
    hostUserId: LSH.id,
    flags: [{
      title: '북한산 새벽 등반 🏔️',
      status: 'OPEN',
      schedule: {
        startDateTime: futureISO(14 * D),
        endDateTime:   futureISO(14 * D + 6 * H),
        deadline:      futureISO(13 * D),
      },
      capacity: 6,
      participantUserIds: [5],
    }],
  }, lshToken);
  const flagB = seedB.flagIds[0];
  ok(`flagB(OPEN, lsh호스트, CDH미참여): ${flagB}`);

  // flagC: lsh 호스트, CDH 참여자, 종료, CDH memorial 있음
  const seedC = await apiPost('/api/dev/flags/seed', {
    hostUserId: LSH.id,
    flags: [{
      title: '클라이밍 모임 🧗',
      status: 'CLOSED',
      schedule: {
        startDateTime: pastISO(30 * D),
        endDateTime:   pastISO(30 * D - 3 * H),
        deadline:      pastISO(31 * D),
      },
      capacity: 8,
      participantUserIds: [CDH.id, 5],
      memorials: [
        { writerUserId: CDH.id, content: '정말 즐거웠어요! 다음에도 꼭 가요 🧗' },
        { writerUserId: 5, content: '초보자도 잘 따라갈 수 있었어요. 강사님도 친절했고!' },
      ],
    }],
  }, lshToken);
  const flagC = seedC.flagIds[0];
  ok(`flagC(CLOSED, memorial있음): ${flagC}`);

  // flagD: CDH 호스트 → lsh에게 초대
  const seedD = await apiPost('/api/dev/flags/seed', {
    hostUserId: CDH.id,
    flags: [{
      title: '제주 한달살기 🌴',
      status: 'OPEN',
      schedule: {
        startDateTime: futureISO(30 * D),
        endDateTime:   futureISO(60 * D),
        deadline:      futureISO(25 * D),
      },
      capacity: 4,
      participantUserIds: [5],
    }],
  }, cdhToken);
  const flagD = seedD.flagIds[0];
  try {
    await apiPost(`/api/v1/flags/${flagD}/invitations`, { inviteeId: LSH.id }, cdhToken);
    ok(`flagD(CDH호스트) → lsh 초대 완료: ${flagD}`);
  } catch (e) {
    warn(`초대 발송 실패: ${e.message}`);
  }

  const browser = await chromium.launch({ headless: true });
  const vp = { width: 390, height: 844 };

  // ── 2. lsh 페이지 세션 ────────────────────────────────────────────────────
  step('2. lsh 세션 — /flags, /flags/{id} 호스트 뷰');
  const lshCtx  = await browser.newContext({ viewport: vp });
  const lshPage = await lshCtx.newPage();
  await browserLogin(lshPage, LSH.email, LSH.password);

  // /flags — 호스팅 탭 (모집중)
  await lshPage.goto(`${BASE}/flags`, { waitUntil: 'networkidle' });
  await lshPage.locator('button').filter({ hasText: '호스팅' }).click();
  await lshPage.waitForTimeout(400);
  await lshPage.locator('button.rounded-full').filter({ hasText: '모집중' }).first().click();
  await lshPage.waitForTimeout(300);
  await lshPage.screenshot({ path: `${D_FLAGS}/02-hosting.png`, fullPage: true });
  ok('/flags 호스팅 탭');

  // /flags — 호스팅 탭 (종료됨)
  await lshPage.locator('button').filter({ hasText: '종료됨' }).click();
  await lshPage.waitForTimeout(300);
  await lshPage.screenshot({ path: `${D_FLAGS}/03-hosting-ended.png`, fullPage: true });
  ok('/flags 호스팅 종료됨');

  // /flags/{flagA} — 호스트 뷰
  await lshPage.goto(`${BASE}/flags/${flagA}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${D_ID}/01-host.png`, fullPage: true });
  ok(`/flags/${flagA} 호스트 뷰`);

  // 초대 모달
  const invBtn = lshPage.locator('button').filter({ hasText: '초대하기' });
  if (await invBtn.isVisible()) {
    await invBtn.click();
    await lshPage.waitForTimeout(500);
    await lshPage.screenshot({ path: `${D_ID}/05-invite-modal.png`, fullPage: true });
    ok('초대 모달');
    await lshPage.keyboard.press('Escape');
    await lshPage.waitForTimeout(200);
  }

  // /flags/{flagC} — 종료 뷰 (앙코르 링크)
  await lshPage.goto(`${BASE}/flags/${flagC}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${D_ID}/04-ended.png`, fullPage: true });
  ok(`/flags/${flagC} 종료 뷰`);

  // /flags/{flagC}/memorial — lsh 미작성 → locked
  await lshPage.goto(`${BASE}/flags/${flagC}/memorial`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${D_MEM}/01-locked.png`, fullPage: true });
  ok('memorial locked (lsh 미작성)');

  // /flags/invitations
  await lshPage.goto(`${BASE}/flags/invitations`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${D_INV}/01-list.png`, fullPage: true });
  ok('/flags/invitations');

  // /flags/new — 빈 폼
  await lshPage.goto(`${BASE}/flags/new`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${D_NEW}/01-form.png`, fullPage: true });
  ok('/flags/new 빈 폼');

  // 유효성 오류
  const submitBtn = lshPage.locator('button').filter({ hasText: /만들기/ }).first();
  await submitBtn.click();
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${D_NEW}/02-validation.png`, fullPage: true });
  ok('/flags/new 유효성 오류');

  // Encore 폼
  await lshPage.goto(`${BASE}/flags/new?parentFlagId=${flagC}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${D_NEW}/03-encore.png`, fullPage: true });
  ok('/flags/new Encore 폼');

  await lshCtx.close();

  // ── 3. CDH 세션 ───────────────────────────────────────────────────────────
  step('3. CDH 세션 — 참여자 뷰 / 비참여자 뷰 / 둘러보기');
  const cdhCtx  = await browser.newContext({ viewport: vp });
  const cdhPage = await cdhCtx.newPage();
  await browserLogin(cdhPage, CDH.email, CDH.password);

  // /flags — 둘러보기 탭
  await cdhPage.goto(`${BASE}/flags`, { waitUntil: 'networkidle' });
  await cdhPage.locator('button').filter({ hasText: '둘러보기' }).click();
  await cdhPage.waitForTimeout(400);
  await cdhPage.screenshot({ path: `${D_FLAGS}/01-browsing.png`, fullPage: true });
  ok('/flags 둘러보기 탭 (CDH)');

  // /flags — 참여 중 탭
  await cdhPage.locator('button').filter({ hasText: '참여 중' }).click();
  await cdhPage.waitForTimeout(400);
  await cdhPage.locator('button.rounded-full').filter({ hasText: '모집중' }).first().click();
  await cdhPage.waitForTimeout(300);
  await cdhPage.screenshot({ path: `${D_FLAGS}/04-participating.png`, fullPage: true });
  ok('/flags 참여 중 탭 (CDH)');

  // /flags/{flagA} — 참여자 뷰 (참여 취소 버튼)
  await cdhPage.goto(`${BASE}/flags/${flagA}`, { waitUntil: 'networkidle' });
  await cdhPage.waitForTimeout(600);
  await cdhPage.screenshot({ path: `${D_ID}/02-participant.png`, fullPage: true });
  ok(`/flags/${flagA} 참여자 뷰 (CDH)`);

  // /flags/{flagB} — 비참여자 뷰 (참여하기 버튼)
  await cdhPage.goto(`${BASE}/flags/${flagB}`, { waitUntil: 'networkidle' });
  await cdhPage.waitForTimeout(600);
  await cdhPage.screenshot({ path: `${D_ID}/03-non-participant.png`, fullPage: true });
  ok(`/flags/${flagB} 비참여자 뷰 (CDH)`);

  // /flags/{flagC}/memorial — CDH는 memorial 작성 → unlocked
  await cdhPage.goto(`${BASE}/flags/${flagC}/memorial`, { waitUntil: 'networkidle' });
  await cdhPage.waitForTimeout(600);
  await cdhPage.screenshot({ path: `${D_MEM}/02-unlocked.png`, fullPage: true });
  ok('memorial unlocked (CDH 작성 완료)');

  await cdhCtx.close();
  await browser.close();

  console.log('\n─────────────────────────────');
  console.log('캡처 완료');
  console.log(`  flags/          : ${D_FLAGS}`);
  console.log(`  flags-id/       : ${D_ID}`);
  console.log(`  flags-id-memorial/: ${D_MEM}`);
  console.log(`  flags-invitations/: ${D_INV}`);
  console.log(`  flags-new/      : ${D_NEW}`);
}

run().catch((e) => { console.error('\n❌ FATAL:', e.message); process.exit(1); });
