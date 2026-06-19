"use client";

import { useState } from "react";
import type { BuzzSummaryResult } from "@/api/model/buzzSummaryResult";
import BuzzList from "./BuzzList";

interface BuzzTabsProps {
  receivedBuzzes: BuzzSummaryResult[];
  receivedHasMore: boolean;
  sentBuzzes: BuzzSummaryResult[];
  sentHasMore: boolean;
}

export default function BuzzTabs({
  receivedBuzzes,
  receivedHasMore,
  sentBuzzes,
  sentHasMore,
}: BuzzTabsProps) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");


  return (
    <div>
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("received")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === "received"
              ? "text-orange-600 border-b-2 border-orange-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          받은 Buzz
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === "sent"
              ? "text-orange-600 border-b-2 border-orange-500"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          보낸 Buzz
        </button>
      </div>

      {activeTab === "received" ? (
        <BuzzList key="received" initialBuzzes={receivedBuzzes} initialHasMore={receivedHasMore} mode="received" />
      ) : (
        <BuzzList key="sent" initialBuzzes={sentBuzzes} initialHasMore={sentHasMore} mode="sent" />
      )}
    </div>
  );
}
