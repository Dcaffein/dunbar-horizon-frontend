import FlagList from "@/components/Flag/FlagList";
import type { FlagResult } from "@/api/model/flagResult";

const now = new Date("2026-06-13T15:00:00").toISOString();

const MOCK_HOSTING: FlagResult[] = [
  {
    id: 1,
    title: "한강 치맥 파티 🍗",
    description: "여의도 한강공원에서 치킨 먹으면서 놀아요. 돗자리랑 간식 각자 가져오세요!",
    status: "OPEN",
    participantCount: 6,
    capacity: 12,
    schedule: {
      startDateTime: "2026-06-21T17:00:00",
      endDateTime: "2026-06-21T21:00:00",
      deadline: "2026-06-20T23:59:00",
    },
  },
  {
    id: 2,
    title: "보드게임 카페 번개",
    description: "홍대 보드게임 카페에서 가볍게 즐겨요. 초보 환영입니다 :)",
    status: "OPEN",
    participantCount: 3,
    capacity: 8,
    schedule: {
      startDateTime: "2026-06-15T13:00:00",
      endDateTime: "2026-06-15T17:00:00",
    },
  },
  {
    id: 3,
    title: "성수 팝업 투어 (Encore)",
    description: "지난번 성수 투어 앙코르! 못 온 분들 이번엔 꼭 와주세요.",
    status: "OPEN",
    parentFlagId: 10,
    participantCount: 4,
    capacity: 10,
    schedule: {
      startDateTime: "2026-06-28T11:00:00",
      endDateTime: "2026-06-28T16:00:00",
    },
  },
  {
    id: 4,
    title: "5월 클라이밍 모임",
    description: "강남 클라이밍 센터에서 초보자 위주로 진행했던 모임입니다.",
    status: "CLOSED",
    participantCount: 8,
    capacity: 8,
    schedule: {
      startDateTime: "2026-05-10T10:00:00",
      endDateTime: "2026-05-10T13:00:00",
    },
  },
];

const MOCK_PARTICIPATING: FlagResult[] = [
  {
    id: 5,
    title: "주말 북한산 등산",
    description: "북한산 둘레길 코스로 가볍게 걸어요. 편한 신발 필수!",
    status: "OPEN",
    participantCount: 9,
    capacity: 15,
    schedule: {
      startDateTime: "2026-06-22T07:30:00",
      endDateTime: "2026-06-22T13:00:00",
    },
  },
  {
    id: 6,
    title: "강남 런치 번개",
    description: "테헤란로 근처에서 점심 같이 먹어요.",
    status: "OPEN",
    participantCount: 4,
    schedule: {
      startDateTime: "2026-06-14T12:00:00",
      endDateTime: "2026-06-14T13:30:00",
    },
  },
];

const MOCK_BROWSE: FlagResult[] = [
  {
    id: 11,
    title: "홍대 즉흥 드로잉",
    description: "마감 임박! 남은 자리 2석.",
    status: "OPEN",
    participantCount: 8,
    capacity: 10,
    schedule: {
      startDateTime: "2026-06-13T15:00:00",
      endDateTime: "2026-06-13T17:00:00",
      deadline: "2026-06-13T14:45:00",
    },
  },
  {
    id: 12,
    title: "오후 런치 클럽",
    description: "2시간도 안 남았어요.",
    status: "OPEN",
    participantCount: 3,
    capacity: 8,
    schedule: {
      startDateTime: "2026-06-13T17:00:00",
      endDateTime: "2026-06-13T19:00:00",
      deadline: "2026-06-13T15:30:00",
    },
  },
  {
    id: 13,
    title: "저녁 북촌 산책 모임",
    description: "오늘 저녁 마감.",
    status: "OPEN",
    participantCount: 2,
    capacity: 6,
    schedule: {
      startDateTime: "2026-06-13T20:00:00",
      endDateTime: "2026-06-13T22:30:00",
      deadline: "2026-06-13T19:00:00",
    },
  },
  {
    id: 14,
    title: "내일 아침 러닝 클럽",
    description: "한강 러닝! 내일 오전 마감.",
    status: "OPEN",
    participantCount: 5,
    capacity: 15,
    schedule: {
      startDateTime: "2026-06-14T07:00:00",
      endDateTime: "2026-06-14T09:00:00",
      deadline: "2026-06-14T11:00:00",
    },
  },
  {
    id: 7,
    title: "연남동 카페 투어",
    description: "연남동 핫플 카페 3곳 투어! 감성 사진 같이 찍어요.",
    status: "OPEN",
    participantCount: 2,
    capacity: 6,
    schedule: {
      startDateTime: "2026-06-20T14:00:00",
      endDateTime: "2026-06-20T18:00:00",
    },
  },
  {
    id: 8,
    title: "인스파이어 영화제 관람",
    description: "영종도 인스파이어에서 야외 영화 관람. 담요 챙겨오세요!",
    status: "OPEN",
    parentFlagId: 5,
    participantCount: 5,
    capacity: 20,
    schedule: {
      startDateTime: "2026-06-27T19:00:00",
      endDateTime: "2026-06-27T22:30:00",
    },
  },
  {
    id: 9,
    title: "판교 스타트업 네트워킹",
    description: "판교 스타트업 종사자 분들 가볍게 네트워킹해요. 명함 지참 환영!",
    status: "OPEN",
    participantCount: 11,
    capacity: 30,
    schedule: {
      startDateTime: "2026-06-19T18:30:00",
      endDateTime: "2026-06-19T21:00:00",
      deadline: "2026-06-18T23:59:00",
    },
  },
  {
    id: 10,
    title: "지난 성수 팝업 투어",
    description: "성수 핫플 팝업 스토어 4곳 탐방. 너무 좋았어서 앙코르 예정!",
    status: "CLOSED",
    participantCount: 7,
    capacity: 10,
    schedule: {
      startDateTime: "2026-06-07T13:00:00",
      endDateTime: "2026-06-07T18:00:00",
    },
  },
];

export default function TestFlagsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Flag (목 데이터 테스트)</h1>
        <a href="/flags/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
          + 만들기
        </a>
      </header>
      <main className="max-w-lg mx-auto">
        <FlagList
          initialHosting={MOCK_HOSTING}
          initialParticipating={MOCK_PARTICIPATING}
          initialBrowse={MOCK_BROWSE}
        />
      </main>
    </div>
  );
}
