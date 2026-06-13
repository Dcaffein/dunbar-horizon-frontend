import FlagDetail from "@/components/Flag/FlagDetail";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { MemorialResult } from "@/api/model/memorialResult";
import type { CommentResult } from "@/api/model/commentResult";
import type { FriendshipDetail } from "@/components/socialGraph/types";

const MY_HOST_USER_ID = 1;
const MY_PARTICIPANT_USER_ID = 2;

const MOCK_FLAG_ACTIVE: FlagDetailResult = {
  id: 1,
  title: "한강 치맥 파티 🍗",
  description: "여의도 한강공원에서 치킨 먹으면서 놀아요.\n돗자리랑 간식 각자 가져오세요!",
  status: "OPEN",
  capacity: 12,
  participantCount: 6,
  isHost: true,
  host: { id: 1, nickname: "수환", profileImageUrl: undefined },
  schedule: {
    startDateTime: "2026-06-21T17:00:00",
    endDateTime: "2026-06-21T21:00:00",
    deadline: "2026-06-20T23:59:00",
  },
  participants: [
    { id: 1, nickname: "수환", canInvite: true },
    { id: 2, nickname: "지민", canInvite: true },
    { id: 3, nickname: "현우", canInvite: false },
    { id: 4, nickname: "소연", canInvite: false },
  ],
};

// 참여자 시점 — 지민(id:2) 기준
const MOCK_FLAG_ACTIVE_PARTICIPANT: FlagDetailResult = {
  id: 1,
  title: "한강 치맥 파티 🍗",
  description: "여의도 한강공원에서 치킨 먹으면서 놀아요.\n돗자리랑 간식 각자 가져오세요!",
  status: "OPEN",
  capacity: 12,
  participantCount: 6,
  isHost: false,
  host: { id: 1, nickname: "수환", profileImageUrl: undefined },
  schedule: {
    startDateTime: "2026-06-21T17:00:00",
    endDateTime: "2026-06-21T21:00:00",
    deadline: "2026-06-20T23:59:00",
  },
  participants: [
    { id: 1, nickname: "수환", canInvite: true },
    { id: 2, nickname: "지민", canInvite: true },
    { id: 3, nickname: "현우", canInvite: false },
    { id: 4, nickname: "소연", canInvite: false },
  ],
};

const MOCK_FLAG_ENDED: FlagDetailResult = {
  id: 2,
  title: "5월 클라이밍 모임",
  description: "강남 클라이밍 센터에서 초보자 위주로 진행했던 모임입니다. 다들 정말 재밌었죠!",
  status: "CLOSED",
  capacity: 8,
  participantCount: 8,
  isHost: true,
  host: { id: 1, nickname: "수환", profileImageUrl: undefined },
  schedule: {
    startDateTime: "2026-05-10T10:00:00",
    endDateTime: "2026-05-10T13:00:00",
  },
  participants: [
    { id: 1, nickname: "수환", canInvite: false },
    { id: 2, nickname: "지민", canInvite: false },
    { id: 3, nickname: "현우", canInvite: false },
  ],
};

const MOCK_MEMORIALS: MemorialResult[] = [
  { id: 1, writerId: 2, nickname: "지민", content: "정말 즐거웠어요! 다음에도 꼭 하고 싶어요 🧗", createdAt: "2026-05-10T14:30:00" },
  { id: 2, writerId: 3, nickname: "현우", content: "초보자도 잘 따라갈 수 있었어요. 강사님도 친절했고!", createdAt: "2026-05-10T15:00:00" },
];

// 호스트(수환, id:1) 기준 댓글
const MOCK_COMMENTS_HOST: CommentResult[] = [
  { id: 1, writerInfo: { id: 4, nickname: "소연" }, content: "준비물 뭐 가져가면 되나요?", isMine: false, isPrivate: false, createdAt: "2026-06-19T10:00:00" },
  { id: 2, writerInfo: { id: 1, nickname: "수환" }, content: "돗자리랑 음료 정도면 충분해요!", isMine: true, isPrivate: false, createdAt: "2026-06-19T10:30:00" },
  { id: 3, writerInfo: { id: 2, nickname: "지민" }, content: "저도 늦게 합류해도 되나요?", isMine: false, isPrivate: true, createdAt: "2026-06-19T11:00:00" },
];

// 참여자(지민, id:2) 기준 댓글
const MOCK_COMMENTS_PARTICIPANT: CommentResult[] = [
  { id: 1, writerInfo: { id: 4, nickname: "소연" }, content: "준비물 뭐 가져가면 되나요?", isMine: false, isPrivate: false, createdAt: "2026-06-19T10:00:00" },
  { id: 2, writerInfo: { id: 1, nickname: "수환" }, content: "돗자리랑 음료 정도면 충분해요!", isMine: false, isPrivate: false, createdAt: "2026-06-19T10:30:00" },
  { id: 3, writerInfo: { id: 2, nickname: "지민" }, content: "저도 늦게 합류해도 되나요?", isMine: true, isPrivate: true, createdAt: "2026-06-19T11:00:00" },
];

const MOCK_FRIENDS: FriendshipDetail[] = [
  { friendId: 2, friendNickname: "지민", friendAlias: "지민이", friendProfileImageUrl: "", intimacy: 0.8, myInterestScore: 0.7, isMuted: false },
  { friendId: 3, friendNickname: "현우", friendAlias: "현우", friendProfileImageUrl: "", intimacy: 0.5, myInterestScore: 0.5, isMuted: false },
];

export default function TestFlagDetailPage() {
  return (
    <div>
      {/* 진행 중 - 참여자 시점 (지민, isHost:false) */}
      <div id="participant-active">
        <FlagDetail
          flag={MOCK_FLAG_ACTIVE_PARTICIPANT}
          myUserId={MY_PARTICIPANT_USER_ID}
          friends={MOCK_FRIENDS}
          memorials={[]}
          comments={MOCK_COMMENTS_PARTICIPANT}
        />
      </div>
    </div>
  );
}
