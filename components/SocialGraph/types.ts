/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NodeSingular, EdgeSingular, BaseLayoutOptions } from "cytoscape";

// 레이아웃 타입
export type LayoutType = "spiral" | "community" | "interaction";

export interface OneHopsNetworkDto {
  friendId: string;
  friendName: string;
  alias?: string;
  mutualFriendIds: string[];
  weight?: number;
}

// Fcose 전용 옵션 타입
export type FcoseLayoutOptions = BaseLayoutOptions & {
  name: "fcose";
  quality?: "default" | "draft" | "proof";
  randomize?: boolean;
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  fit?: boolean;
  padding?: number;
  nodeRepulsion?: (node: NodeSingular) => number;
  idealEdgeLength?: (edge: EdgeSingular) => number;
  edgeElasticity?: (edge: EdgeSingular) => number;
  gravity?: number;
  nodeSeparation?: number;
  numIter?: number;
  initialEnergyOnIncremental?: number;
  nestingFactor?: number;
  gravityRange?: number;

  tile?: boolean;
  tilingPaddingVertical?: number;
  tilingPaddingHorizontal?: number;

  // ✅ [추가] 노드 크기에 라벨(텍스트)까지 포함해서 계산할지 여부
  // true로 설정하면 글씨가 겹치는 것도 방지해줍니다.
  nodeDimensionsIncludeLabels?: boolean;

  fixedNodeConstraint?: any[];
  alignmentConstraint?: any;
};
