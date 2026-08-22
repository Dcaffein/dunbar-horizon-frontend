/**
 * 조회는 성공했고 데이터가 정말 없을 때 쓴다.
 * 조회가 실패한 경우에는 `FailureState` 를 쓸 것 — 둘은 반대말이다.
 *
 * FriendRequestPage 의 지역 함수를 그대로 승격했다. 모양은 바뀌지 않았다.
 */
export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg
        className="w-12 h-12 mb-3 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
