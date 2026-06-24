export default function FlagsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-10 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-16 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      {/* 탭 바 */}
      <div className="flex border-b border-gray-200 bg-white">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* 필터 세그먼트 */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-14 h-7 bg-gray-100 rounded-full animate-pulse" />
        ))}
      </div>

      {/* 카드 목록 */}
      <ul className="py-2">
        {[1, 2, 3, 4].map((i) => (
          <li key={i} className="mx-4 my-3 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] p-4 space-y-2 animate-pulse">
            <div className="flex justify-between">
              <div className="w-14 h-5 bg-gray-200 rounded-full" />
              <div className="w-16 h-4 bg-gray-100 rounded" />
            </div>
            <div className="w-2/3 h-5 bg-gray-200 rounded" />
            <div className="w-full h-4 bg-gray-100 rounded" />
            <div className="w-1/2 h-3 bg-gray-100 rounded" />
          </li>
        ))}
      </ul>
    </div>
  );
}
