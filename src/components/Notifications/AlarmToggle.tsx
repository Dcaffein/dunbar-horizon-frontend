"use client";

import { useFcmToken } from "@/hooks/useFcmToken";

export default function AlarmToggle() {
  const { alarmOn, loading, deniedModal, toggleOn, toggleOff, dismissDeniedModal } =
    useFcmToken();

  const handleToggle = () => {
    if (loading) return;
    if (alarmOn) {
      toggleOff();
    } else {
      toggleOn();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-gray-500">알람 허용</span>
        <button
          type="button"
          role="switch"
          aria-checked={alarmOn}
          aria-label="알람 토글"
          disabled={loading}
          onClick={handleToggle}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            alarmOn ? "bg-indigo-600" : "bg-gray-200",
            loading ? "opacity-50 cursor-not-allowed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              alarmOn ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>

      {/* 권한 차단 안내 모달 */}
      {deniedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={dismissDeniedModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <h2 className="text-base font-bold text-gray-900">알람 권한이 차단되어 있어요</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              브라우저가 알림을 차단하고 있습니다.
              아래 방법으로 권한을 허용해주세요.
            </p>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>주소창 왼쪽의 <strong>자물쇠(🔒) 아이콘</strong>을 클릭하세요.</li>
              <li><strong>알림</strong> 항목을 <strong>허용</strong>으로 변경하세요.</li>
              <li>페이지를 새로고침 후 다시 토글을 켜주세요.</li>
            </ol>
            <button
              type="button"
              onClick={dismissDeniedModal}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
