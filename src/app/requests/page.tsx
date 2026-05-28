import { getReceivedRequestsAction, getSentRequestsAction } from "@/app/actions/friendRequest";
import FriendRequestPage from "@/components/FriendRequest/FriendRequestPage";
import { isRedirectError } from "@/api/apiClient";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";

export default async function RequestsPage() {
  let received: FriendRequestResult[] = [];
  let sent: FriendRequestResult[] = [];

  try {
    const [receivedResult, sentResult] = await Promise.all([
      getReceivedRequestsAction(),
      getSentRequestsAction(),
    ]);
    if (receivedResult.success) received = receivedResult.data;
    if (sentResult.success) sent = sentResult.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  return <FriendRequestPage initialReceived={received} initialSent={sent} />;
}
