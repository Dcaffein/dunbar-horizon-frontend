import { chromium } from 'playwright';

const OUT = 'harness/verify';
const BASE = 'http://localhost:3000';
const fakeJwt = [
  Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify({sub:'4',exp:9999999999})).toString('base64url'),
  'sig',
].join('.');

const br = await chromium.launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies([{ name:'access_token', value:fakeJwt, domain:'localhost', path:'/' }]);
const p = await ctx.newPage();

// ── /flags 목록 ──────────────────────────────────────────
await p.goto(`${BASE}/flags`);
await p.waitForLoadState('networkidle');

const tabNames = await p.locator('.flex button').allTextContents();
console.log('탭 목록:', tabNames.map(t=>t.trim()).filter(Boolean).join(' | '));

const browseActive = await p.locator('button:has-text("둘러보기")').evaluate(el =>
  el.className.includes('indigo'));
console.log('둘러보기 active(indigo):', browseActive);

const toggle = p.locator('input[type="checkbox"]');
console.log('종료포함 토글 visible:', await toggle.isVisible());

const oldTabs = await p.locator('button:has-text("주최 중"), button:has-text("친구 Flag")').count();
console.log('구버전 탭 잔존 수:', oldTabs, '(0이어야 함)');

await p.screenshot({ path: `${OUT}/v26-01-list-browse.png` });

await p.locator('button:has-text("호스팅")').click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/v26-02-list-hosting.png` });

await toggle.check(); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/v26-03-toggle-on.png` });
await toggle.uncheck();

// ── /flags/new ────────────────────────────────────────────
await p.goto(`${BASE}/flags/new`);
await p.waitForLoadState('networkidle');
await p.waitForTimeout(500);

const dtInputs = p.locator('input[type="datetime-local"]');
const vals = await dtInputs.evaluateAll(els => els.map(e => e.value));
console.log('datetime-local 기본값들:', vals, '(모두 빈값이어야 함)');

console.log('[취소] 버튼 visible:', await p.locator('button:has-text("취소")').isVisible());

const deadlineLbl = await p.locator('label').filter({hasText:/^모집 마감/}).first().textContent().catch(()=>'');
console.log('모집마감 레이블:', deadlineLbl.trim());

await p.screenshot({ path: `${OUT}/v26-04-new-form-empty.png` });

// 폼 채워서 제출 시도
await p.locator('input').first().fill('테스트 Flag');
await p.locator('textarea').fill('Playwright 검증용 플래그입니다.');
await dtInputs.nth(0).fill('2026-06-20T14:00');
await dtInputs.nth(1).fill('2026-06-20T17:00');
await p.screenshot({ path: `${OUT}/v26-05-form-filled.png` });

await p.locator('button:has-text("Flag 만들기")').click();
await p.waitForTimeout(1500);
console.log('제출 후 URL:', p.url());
await p.screenshot({ path: `${OUT}/v26-06-after-submit.png` });

// 에러 메시지 캡처 (백엔드 없으면 submit 에러)
const submitErr = await p.locator('p.text-red-500, p[class*="red"]').allTextContents().catch(()=>[]);
if (submitErr.length) console.log('제출 에러:', submitErr);

// 취소 버튼 → /flags
await p.goto(`${BASE}/flags/new`);
await p.waitForLoadState('networkidle');
await p.locator('button:has-text("취소")').click();
await p.waitForURL(u => u.endsWith('/flags'), { timeout: 5000 }).catch(()=>{});
console.log('취소 후 URL:', p.url(), '(http://localhost:3000/flags 이어야 함)');
await p.screenshot({ path: `${OUT}/v26-07-cancel-redirect.png` });

// Encore 폼 — 앙코르 버튼 확인
await p.goto(`${BASE}/flags/new?parentFlagId=1`);
await p.waitForLoadState('networkidle');
await p.waitForTimeout(400);
const encoreBtnText = await p.locator('button:has-text("Encore 생성")').isVisible();
console.log('Encore 생성 버튼:', encoreBtnText);
await p.screenshot({ path: `${OUT}/v26-08-encore-form.png` });

// Phase 3 — 빈 폼 submit validation
await p.goto(`${BASE}/flags/new`);
await p.waitForLoadState('networkidle');
await p.locator('button:has-text("Flag 만들기")').click();
await p.waitForTimeout(400);
const validationErrors = await p.locator('p[class*="red"]').allTextContents().catch(()=>[]);
console.log('빈폼 에러들:', validationErrors);
await p.screenshot({ path: `${OUT}/v26-09-validation.png` });

// Phase 3 — 종료 일시 < 시작 일시 edge case
await p.locator('input').first().fill('엣지 케이스 테스트');
await p.locator('textarea').fill('설명');
const dt2 = p.locator('input[type="datetime-local"]');
await dt2.nth(0).fill('2026-06-20T17:00');  // 시작
await dt2.nth(1).fill('2026-06-20T14:00');  // 종료 < 시작
await p.locator('button:has-text("Flag 만들기")').click();
await p.waitForTimeout(400);
const dateErr = await p.locator('p[class*="red"]').allTextContents().catch(()=>[]);
console.log('날짜 역전 에러:', dateErr);
await p.screenshot({ path: `${OUT}/v26-10-date-edge.png` });

await br.close();
console.log('\n검증 완료');
