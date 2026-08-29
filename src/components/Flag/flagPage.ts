import type { FlagResult } from "@/api/model/flagResult";
import type { SliceFlagResult } from "@/api/model/sliceFlagResult";

export interface FlagPage {
  flags: FlagResult[];
  page: number;
  isLast: boolean;
}

export function toFlagPage(slice: SliceFlagResult, requestedPage: number): FlagPage {
  return {
    flags: slice.content ?? [],
    page: slice.number ?? requestedPage,
    isLast: slice.last ?? true,
  };
}

export function mergeFlagPages(current: FlagResult[], next: FlagResult[]): FlagResult[] {
  const knownIds = new Set(current.map((flag) => flag.id).filter((id): id is number => id != null));

  return [
    ...current,
    ...next.filter((flag) => {
      if (flag.id == null || knownIds.has(flag.id)) return false;
      knownIds.add(flag.id);
      return true;
    }),
  ];
}
