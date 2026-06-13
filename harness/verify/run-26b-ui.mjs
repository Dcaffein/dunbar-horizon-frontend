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

await p.goto(`${BASE}/test-flags`);
await p.waitForLoadState('networkidle');
await p.waitForTimeout(600);

// 01 — 둘러보기 · 모집중 (기본)
await p.screenshot({ path: `${OUT}/26b-01-browse-active.png` });
console.log('26b-01-browse-active.png');

// 02 — 둘러보기 · 종료됨
await p.locator('button:has-text("종료됨")').click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/26b-02-browse-ended.png` });
console.log('26b-02-browse-ended.png');

// 03 — 호스팅 · 모집중
await p.locator('button:has-text("호스팅")').click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/26b-03-hosting-active.png` });
console.log('26b-03-hosting-active.png');

// 04 — 호스팅 · 종료됨 (앙코르 버튼 없는지 확인)
await p.locator('button:has-text("종료됨")').click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/26b-04-hosting-ended.png` });
console.log('26b-04-hosting-ended.png');

// 05 — 참여 중 · 모집중
await p.locator('button:has-text("참여 중")').click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/26b-05-participating.png` });
console.log('26b-05-participating.png');

// 06 — 모집마감 필터 (호스팅)
await p.locator('button:has-text("호스팅")').click();
await p.waitForTimeout(200);
await p.locator('button:has-text("모집마감")').click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/26b-06-hosting-deadline.png` });
console.log('26b-06-hosting-deadline.png');

await br.close();
console.log('완료');
