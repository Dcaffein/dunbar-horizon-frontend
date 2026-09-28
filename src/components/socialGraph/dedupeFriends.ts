import type { FriendshipDetail } from "./types";

/**
 * 같은 friendId 를 가진 레코드를 하나로 줄인다. 먼저 온 레코드를 남기며,
 * 이는 useGraphData 의 dedupById 와 동일한 규칙이라 리스트와 그래프가 같은
 * 레코드를 보게 된다.
 *
 * 백엔드 /api/v1/friends 가 같은 친구를 두 번 내려주는 사례가 있어(친밀도 값까지
 * 서로 다름) 방어한다. 근본 원인은 백엔드 데이터이므로 중복을 발견하면 경고를 남겨
 * 조용히 묻히지 않게 한다.
 */
export function dedupeFriends(friends: FriendshipDetail[]): FriendshipDetail[] {
  const seen = new Set<number>();
  return friends.filter((f) => {
    if (seen.has(f.friendId)) {
      console.warn(
        `[socialGraph] duplicate friendId from /api/v1/friends skipped: ${f.friendId}`,
      );
      return false;
    }
    seen.add(f.friendId);
    return true;
  });
}
