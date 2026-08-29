import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import type { FriendRequestDirection } from "@/app/actions/friendRequest";

/**
 * mutation 대상인 상대 사용자 ID를 방향별로 파생한다.
 *
 * - 받은 요청(RECEIVED)의 counterpart = requester.id
 * - 보낸 요청(SENT)의 counterpart = receiver.id
 *
 * UI key로 쓰는 request.id(UUID)와 서버 mutation 대상은 다른 개념이다.
 * ID가 없으면 null을 반환해 호출부가 버튼을 비활성화하고 잘못된 0을 보내지 않게 한다.
 */
export function deriveCounterpartId(
  request: FriendRequestResult,
  direction: FriendRequestDirection,
): number | null {
  const counterpart = direction === "RECEIVED" ? request.requester : request.receiver;
  return counterpart?.id ?? null;
}

/**
 * 방향별 상대방 표시 정보(카드에 노출할 사용자)를 반환한다.
 */
export function counterpartOf(request: FriendRequestResult, direction: FriendRequestDirection) {
  return direction === "RECEIVED" ? request.requester : request.receiver;
}

/**
 * 방향과 counterpartId를 결합한 로딩/중복 방지 키.
 * 서로 다른 탭의 동일 상대 ID가 충돌하지 않게 한다.
 */
export function loadingKey(direction: FriendRequestDirection, counterpartId: number): string {
  return `${direction}:${counterpartId}`;
}
