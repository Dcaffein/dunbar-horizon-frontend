import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const fakeJwt = [
  Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify({sub:'4',exp:9999999999})).toString('base64url'),
  'sig',
].join('.');

const br = await chromium.launch({ headless: false, slowMo: 200 });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies([{ name:'access_token', value:fakeJwt, domain:'localhost', path:'/' }]);
const p = await ctx.newPage();

// URL 변화 감지
p.on('framenavigated', frame => {
  if (frame === p.mainFrame()) console.log('  → 네비게이션:', frame.url());
});

await p.goto(`${BASE}/flags/new`);
await p.waitForLoadState('networkidle');
console.log('현재 URL:', p.url());

const cancelBtn = p.locator('button:has-text("취소")');
const isDisabled = await cancelBtn.evaluate(el => el.disabled);
console.log('[취소] 버튼 disabled:', isDisabled);

console.log('취소 클릭...');
await cancelBtn.click();
// 10초 대기
await p.waitForTimeout(10000);
console.log('10초 후 URL:', p.url());
await p.screenshot({ path: 'harness/verify/v26-cancel-debug.png' });

await br.close();
