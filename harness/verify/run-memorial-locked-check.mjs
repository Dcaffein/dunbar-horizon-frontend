/**
 * locked 게이트 조건 확인
 * - CDH 호스트, lsh 참여자
 * - CDH + user5가 메모리얼 작성 완료
 * - lsh는 미작성 상태로 GET → locked 뜨는지 확인
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

function pastISO(ms) { return new Date(Date.now() - ms).toISOString().slice(0, 19); }
const H = 3600000, D = 86400000;

async function apiLogin(email, password) {
  const res = await fetch(`${API}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  const token = cookie.match(/access_token=([^;]+)/)?.[1];
  if (!token) throw new Error(`로그인 실패: ${email}`);
  return token;
}

async function apiPost(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `access_token=${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function run() {
  // 1. CDH 토큰으로 플래그 시드 (lsh = 참여자, lsh는 memorial 없음)
  const cdhToken = await apiLogin(CDH.email, CDH.password);
  const seed = await apiPost('/api/dev/flags/seed', {
    hostUserId: CDH.id,
    flags: [{
      title: '한라산 등반 🏔️',
      status: 'CLOSED',
      schedule: {
        startDateTime: pastISO(7 * D),
        endDateTime:   pastISO(7 * D - 4 * H),
        deadline:      pastISO(8 * D),
      },
      capacity: 8,
      participantUserIds: [LSH.id, 5],
      memorials: [
        { writerUserId: CDH.id, content: '정상에서 본 일출이 잊을 수가 없어요 🌅' },
        { writerUserId: 5,      content: '힘들었지만 같이 오르니까 버틸 수 있었어요!' },
      ],
    }],
  }, cdhToken);

  const flagId = seed?.flagIds?.[0];
  if (!flagId) throw new Error('시드 실패');
  console.log(`플래그 생성: ${flagId} (CDH·user5 memorial 있음, lsh 없음)`);

  // 2. API 직접 확인: lsh로 GET memorials
  const lshToken = await apiLogin(LSH.email, LSH.password);
  const r = await fetch(`${API}/api/v1/flags/${flagId}/memorials`, {
    headers: { Cookie: `access_token=${lshToken}` },
  });
  const body = await r.text();
  console.log(`\nGET /api/v1/flags/${flagId}/memorials — lsh(미작성): ${r.status}`);
  console.log(body.slice(0, 400));

  // 3. Playwright: 실제 화면 확인
  const browser = await chromium.launch({ headless: true });
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // lsh 브라우저 로그인
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', LSH.email);
  await page.fill('input[type="password"]', LSH.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 });

  await page.goto(`${BASE}/flags/${flagId}/memorial`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${PAGES}/flags-id/11-memorial-locked.png`, fullPage: true });

  const gateMsg  = await page.locator('text=메모리얼을 작성하면').isVisible().catch(() => false);
  const emptyMsg = await page.locator('text=아직 남겨진 기억이 없습니다').isVisible().catch(() => false);
  const memCards = await page.locator('li.bg-gray-50').count();

  console.log('\n── 화면 결과 ──');
  if (gateMsg)        console.log('✅ locked 게이트 표시 (🔒 메모리얼을 작성하면...)');
  else if (emptyMsg)  console.log('⚠️  "아직 남겨진 기억이 없습니다." 표시 — 게이트 아님');
  else if (memCards)  console.log(`⚠️  memorial 카드 ${memCards}개 표시 — 잠금 없이 열람 가능`);
  else                console.log('❓ 알 수 없는 상태');

  await browser.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
