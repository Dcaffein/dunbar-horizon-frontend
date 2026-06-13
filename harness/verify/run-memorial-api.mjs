/**
 * 종료 플래그 memorial API 직접 테스트
 * GET + POST /api/v1/flags/{id}/memorials 응답 확인
 */
const API = 'http://localhost:8080';
const LSH = { email: 'lsh@test.com', password: 'String123!', id: 4 };

async function run() {
  // lsh 로그인
  const loginRes = await fetch(`${API}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LSH.email, password: LSH.password }),
  });
  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const token = setCookie.match(/access_token=([^;]+)/)?.[1];
  if (!token) { console.error('로그인 실패'); return; }
  console.log('로그인 성공');

  // flagId=43: CDH가 호스트, lsh=참여자, CDH+user5만 memorial 작성
  const flagId = 43;

  // 1. GET memorials (lsh 미작성 상태)
  const r1 = await fetch(`${API}/api/v1/flags/${flagId}/memorials`, {
    headers: { Cookie: `access_token=${token}` },
  });
  const b1 = await r1.text();
  console.log(`\n[GET memorials — 작성 전] ${r1.status}`);
  console.log(b1.slice(0, 500));

  // 2. POST memorial (종료 플래그에 작성 시도)
  const r2 = await fetch(`${API}/api/v1/flags/${flagId}/memorials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `access_token=${token}` },
    body: JSON.stringify({ content: '직접 API 테스트 — 종료 플래그에 메모리얼 작성 🔥' }),
  });
  const b2 = await r2.text();
  console.log(`\n[POST memorial] ${r2.status}`);
  console.log(b2.slice(0, 500));

  // 3. GET memorials (작성 후)
  const r3 = await fetch(`${API}/api/v1/flags/${flagId}/memorials`, {
    headers: { Cookie: `access_token=${token}` },
  });
  const b3 = await r3.text();
  console.log(`\n[GET memorials — 작성 후] ${r3.status}`);
  console.log(b3.slice(0, 800));
}

run().catch((e) => console.error('FATAL:', e.message));
