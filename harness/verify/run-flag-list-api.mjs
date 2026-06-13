const API = 'http://localhost:8080';
const LSH = { email: 'lsh@test.com', password: 'String123!' };

(async () => {
  const login = await fetch(`${API}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LSH),
  });
  const token = login.headers.get('set-cookie')?.match(/access_token=([^;]+)/)?.[1];
  if (!token) { console.error('로그인 실패'); return; }

  // RECRUITING 플래그 하나 골라서 deadline 패치 → status 변화 확인
  const r = await fetch(`${API}/api/v1/flags/me/hosting`, {
    headers: { Cookie: `access_token=${token}` },
  });
  const flags = await r.json();
  const target = flags.find(f => f.status === 'RECRUITING');
  if (!target) { console.log('RECRUITING 플래그 없음'); return; }

  console.log(`마감 전: id=${target.id} status=${target.status}`);

  // 모집 마감 호출
  const patch = await fetch(`${API}/api/v1/flags/${target.id}/schedule/deadline`, {
    method: 'PATCH',
    headers: { Cookie: `access_token=${token}` },
  });
  console.log(`PATCH 응답: ${patch.status}`);

  // 마감 후 상태 확인
  const r2 = await fetch(`${API}/api/v1/flags/${target.id}`, {
    headers: { Cookie: `access_token=${token}` },
  });
  const detail = await r2.json();
  console.log(`마감 후: status=${detail.status}`);
})();
