import { getReceivedRequestsAction, getSentRequestsAction } from "@/app/actions/friendRequest";
import FriendRequestPage from "@/components/FriendRequest/FriendRequestPage";
import type { RequestTabState } from "@/components/FriendRequest/useFriendRequest";
import { isRedirectError } from "@/api/apiClient";

export default async function RequestsPage() {
  let received: RequestTabState = { data: [], ok: true };
  let sent: RequestTabState = { data: [], ok: true };

  try {
    // 받은/보낸 PENDING 목록을 병렬 조회한다. 한쪽 실패를 다른 쪽 빈 목록으로 위장하지 않는다.
    const [receivedResult, sentResult] = await Promise.all([
      getReceivedRequestsAction(),
      getSentRequestsAction(),
    ]);
    received = receivedResult.success
      ? { data: receivedResult.data, ok: true }
      : { data: [], ok: false };
    sent = sentResult.success ? { data: sentResult.data, ok: true } : { data: [], ok: false };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    received = { data: [], ok: false };
    sent = { data: [], ok: false };
  }

  return <FriendRequestPage initialReceived={received} initialSent={sent} />;
}
