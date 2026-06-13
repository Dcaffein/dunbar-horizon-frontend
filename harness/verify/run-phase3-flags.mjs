/**
 * Phase 3 — Flag 관련 페이지 실제 API 테스트
 *
 * 순서:
 * 1. lsh 로그인
 * 2. /api/dev/flags/seed 로 OPEN + CLOSED 플래그 생성
 * 3. 최두현(id=2) 로그인 → lsh에게 초대 발송
 * 4. lsh 세션으로 전 페이지 순회 및 스크린샷
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(__dirname, 'pages');
const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8080';

// fixtures/users.md 기준
const LSH = { email: 'lsh@test.com',  password: 'String123!', id: 4 };
const CDH = { email: 'chdh@test.com', password: 'String123!', id: 2 };  // 최두현, lsh 친구

const ok   = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠️  ${m}`);
const fail = (m) => console.log(`  ❌ ${m}`);
const step = (m) => console.log(`\n── ${m}`);

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

async function loginAndSaveToken(page, email, password) {
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

function futureISO(ms) { return new Date(Date.now() + ms).toISOString().slice(0, 19); }
function pastISO(ms)   { return new Date(Date.now() - ms).toISOString().slice(0, 19); }
const H = 3600000, D = 86400000;

// ─── 메인 ────────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. lsh 로그인 ──────────────────────────────────────────────────────────
  step('1. lsh 로그인');
  const lshCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const lshPage = await lshCtx.newPage();
  const lshToken = await loginAndSaveToken(lshPage, LSH.email, LSH.password);
  ok(`lsh 로그인 성공`);

  // ── 2. 플래그 시드 (lsh 호스트) ───────────────────────────────────────────
  step('2. 플래그 시드 생성');
  const seedRes = await apiPost('/api/dev/flags/seed', {
    hostUserId: LSH.id,
    flags: [
      {
        title: '한강 치맥 파티 🍗',
        status: 'OPEN',
        schedule: {
          startDateTime: futureISO(7 * D),
          endDateTime:   futureISO(7 * D + 4 * H),
          deadline:      futureISO(6 * D),
        },
        capacity: 12,
        participantUserIds: [CDH.id, 5],
      },
      {
        title: '클라이밍 모임 🧗',
        status: 'CLOSED',
        schedule: {
          startDateTime: pastISO(30 * D),
          endDateTime:   pastISO(30 * D - 3 * H),
        },
        capacity: 8,
        participantUserIds: [CDH.id, 5],
        memorials: [
          { writerUserId: CDH.id, content: '정말 즐거웠어요! 다음에도 꼭 하고 싶어요 🧗' },
          { writerUserId: 5,      content: '초보자도 잘 따라갈 수 있었어요. 강사님도 친절했고!' },
        ],
      },
    ],
  }, lshToken);

  const [openId, closedId] = seedRes?.flagIds ?? [];
  if (!openId || !closedId) throw new Error(`시드 실패: ${JSON.stringify(seedRes)}`);
  ok(`OPEN 플래그: ${openId}`);
  ok(`CLOSED 플래그: ${closedId}`);

  // ── 3. 최두현 로그인 → lsh에게 초대 ──────────────────────────────────────
  step('3. 최두현이 lsh에게 Flag 초대 발송');
  const cdhCtx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cdhPage = await cdhCtx.newPage();
  const cdhToken = await loginAndSaveToken(cdhPage, CDH.email, CDH.password);
  ok('최두현 로그인 성공');

  const cdhSeed = await apiPost('/api/dev/flags/seed', {
    hostUserId: CDH.id,
    flags: [{
      title: '북한산 트레킹 🏔️',
      status: 'OPEN',
      schedule: {
        startDateTime: futureISO(14 * D),
        endDateTime:   futureISO(14 * D + 6 * H),
        deadline:      futureISO(13 * D),
      },
      capacity: 6,
      participantUserIds: [5],
    }],
  }, cdhToken);

  const invFlagId = cdhSeed?.flagIds?.[0];
  if (invFlagId) {
    try {
      await apiPost(`/api/v1/flags/${invFlagId}/invitations`, { inviteeId: LSH.id }, cdhToken);
      ok(`lsh에게 초대 발송 완료 (flagId=${invFlagId})`);
    } catch (e) {
      warn(`초대 발송 실패: ${e.message}`);
    }
  }
  await cdhPage.close();
  await cdhCtx.close();

  // ── 4. /flags — 목록 ──────────────────────────────────────────────────────
  step('4. /flags — 목록 페이지');
  await lshPage.goto(`${BASE}/flags`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(500);

  // 호스팅 탭 + 모집중
  await lshPage.locator('button').filter({ hasText: '호스팅' }).click();
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${PAGES}/flags/01-hosting.png`, fullPage: true });
  const hostCards = await lshPage.locator('.rounded-2xl').count();
  hostCards >= 1 ? ok(`호스팅 탭 카드 ${hostCards}개`) : fail('호스팅 카드 없음');

  // 종료됨 필터
  await lshPage.locator('button').filter({ hasText: '종료됨' }).click();
  await lshPage.waitForTimeout(300);
  await lshPage.screenshot({ path: `${PAGES}/flags/02-hosting-ended.png`, fullPage: true });
  const hintVisible = await lshPage.locator('text=앙코르 또는 메모리얼').isVisible().catch(() => false);
  hintVisible ? ok('종료됨 힌트 텍스트 표시') : warn('종료됨 힌트 없음');

  // 참여 중 탭
  await lshPage.locator('button').filter({ hasText: '참여 중' }).click();
  await lshPage.waitForTimeout(400);
  await lshPage.locator('button').filter({ hasText: '모집중' }).click();
  await lshPage.waitForTimeout(300);
  await lshPage.screenshot({ path: `${PAGES}/flags/03-participating.png`, fullPage: true });

  // 둘러보기 탭
  await lshPage.locator('button').filter({ hasText: '둘러보기' }).click();
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${PAGES}/flags/04-browse.png`, fullPage: true });

  // ── 5. /flags/{openId} — 상세 (host) ──────────────────────────────────────
  step(`5. /flags/${openId} — 상세 (host 시점)`);
  await lshPage.goto(`${BASE}/flags/${openId}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${PAGES}/flags-id/01-detail-host.png`, fullPage: true });

  const closeBtn  = lshPage.locator('button').filter({ hasText: '모집 마감' });
  const deleteBtn = lshPage.locator('button').filter({ hasText: '삭제' });
  await closeBtn.isVisible()  ? ok('모집 마감 버튼 표시') : fail('모집 마감 버튼 없음');
  await deleteBtn.isVisible() ? ok('삭제 버튼 표시')      : fail('삭제 버튼 없음');

  // 초대 모달
  const inviteBtn = lshPage.locator('button').filter({ hasText: '초대하기' });
  if (await inviteBtn.isVisible()) {
    await inviteBtn.click();
    await lshPage.waitForTimeout(500);
    await lshPage.screenshot({ path: `${PAGES}/flags-id/07-invite-modal.png`, fullPage: true });
    ok('초대 모달 열림');
    await lshPage.keyboard.press('Escape');
    await lshPage.waitForTimeout(300);
  } else {
    warn('초대하기 버튼 없음');
  }

  // ── 6. /flags/{closedId} — 종료된 Flag 상세 ───────────────────────────────
  step(`6. /flags/${closedId} — 종료된 Flag 상세`);
  await lshPage.goto(`${BASE}/flags/${closedId}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${PAGES}/flags-id/04-detail-ended.png`, fullPage: true });

  const encoreBtn     = lshPage.locator('a').filter({ hasText: '앙코르' });
  const memorialLink  = lshPage.locator('a').filter({ hasText: 'Memorial' });
  await encoreBtn.isVisible()    ? ok('앙코르 링크 표시')   : fail('앙코르 링크 없음');
  await memorialLink.isVisible() ? ok('Memorial 링크 표시') : warn('Memorial 링크 없음');

  // ── 7. /flags/{closedId}/memorial — 메모리얼 페이지 ───────────────────────
  step(`7. /flags/${closedId}/memorial — 메모리얼 (host — 미작성)`);
  await lshPage.goto(`${BASE}/flags/${closedId}/memorial`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${PAGES}/flags-id/11-memorial-locked.png`, fullPage: true });

  const lockedMsg = lshPage.locator('text=메모리얼을 작성하면');
  if (await lockedMsg.isVisible()) {
    ok('미작성 게이트 표시 (백엔드 접근 거부 → locked)');
  } else {
    // host가 목록을 볼 수 있는 경우
    const memCount = await lshPage.locator('text=Memorial').count();
    memCount > 0 ? ok(`Memorial 헤더 표시 (host 접근 가능)`) : warn('게이트도 목록도 없음');
    await lshPage.screenshot({ path: `${PAGES}/flags-id/10-memorial-unlocked.png`, fullPage: true });
  }

  // ── 8. /flags/invitations — 받은 초대 ────────────────────────────────────
  step('8. /flags/invitations — 받은 초대');
  await lshPage.goto(`${BASE}/flags/invitations`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(600);
  await lshPage.screenshot({ path: `${PAGES}/flags-invitations/01-invitation-list.png`, fullPage: true });

  const invCards = await lshPage.locator('.rounded-2xl').count();
  if (invCards >= 1) {
    ok(`초대 카드 ${invCards}개 표시`);
    const rejectBtn = lshPage.locator('button').filter({ hasText: '거절' }).first();
    const acceptBtn = lshPage.locator('button').filter({ hasText: '수락' }).first();
    await rejectBtn.isVisible() ? ok('거절 버튼 표시') : fail('거절 버튼 없음');
    await acceptBtn.isVisible() ? ok('수락 버튼 표시') : fail('수락 버튼 없음');
  } else {
    warn('초대 없음 — 알림 생성 지연 또는 초대 발송 실패');
    await lshPage.screenshot({ path: `${PAGES}/flags-invitations/02-empty.png`, fullPage: true });
  }

  // ── 9. /flags/new — 폼 & 유효성 ─────────────────────────────────────────
  step('9. /flags/new — 폼 & 유효성 검증');
  await lshPage.goto(`${BASE}/flags/new`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${PAGES}/flags-new/01-form.png`, fullPage: true });

  const submitBtn = lshPage.locator('button').filter({ hasText: /Flag\s*만들기|만들기/ }).first();
  await submitBtn.click();
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${PAGES}/flags-new/02-validation-error.png`, fullPage: true });
  const titleErr = await lshPage.locator('text=제목을 입력해주세요').isVisible().catch(() => false);
  titleErr ? ok('빈 폼 제목 에러 표시') : fail('제목 에러 없음');

  // Encore 폼
  await lshPage.goto(`${BASE}/flags/new?parentFlagId=${closedId}`, { waitUntil: 'networkidle' });
  await lshPage.waitForTimeout(400);
  await lshPage.screenshot({ path: `${PAGES}/flags-new/03-encore-form.png`, fullPage: true });
  const encoreSubmit = lshPage.locator('button').filter({ hasText: 'Encore 생성' });
  await encoreSubmit.isVisible() ? ok('Encore 생성 버튼 표시') : fail('Encore 생성 버튼 없음');

  await browser.close();
  console.log('\n─────────────────────────────');
  console.log('Phase 3 테스트 완료');
}

run().catch((err) => {
  console.error('\n❌ FATAL:', err.message);
  process.exit(1);
});
