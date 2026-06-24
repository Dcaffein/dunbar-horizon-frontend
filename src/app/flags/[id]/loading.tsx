export default function FlagDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-36 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full">
        {/* 상태 + 제목 + 설명 */}
        <div className="bg-white px-4 py-5 border-b space-y-3 animate-pulse">
          <div className="flex gap-2">
            <div className="w-14 h-5 bg-gray-200 rounded-full" />
          </div>
          <div className="w-2/3 h-6 bg-gray-200 rounded" />
          <div className="w-full h-4 bg-gray-100 rounded" />
          <div className="w-4/5 h-4 bg-gray-100 rounded" />
        </div>

        {/* 일정 정보 */}
        <div className="bg-white px-4 py-4 border-b space-y-2 animate-pulse">
          <div className="w-24 h-3 bg-gray-200 rounded" />
          <div className="w-40 h-4 bg-gray-100 rounded" />
        </div>

        {/* 참여자 */}
        <div className="bg-white px-4 py-4 border-b animate-pulse">
          <div className="w-20 h-3 bg-gray-200 rounded mb-3" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gray-200" />
            ))}
          </div>
        </div>

        {/* 댓글 */}
        <div className="px-4 py-4 space-y-3 animate-pulse">
          <div className="w-16 h-3 bg-gray-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 space-y-2">
              <div className="w-20 h-3 bg-gray-200 rounded" />
              <div className="w-full h-3 bg-gray-100 rounded" />
              <div className="w-3/4 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
