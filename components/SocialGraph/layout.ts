import type { NodeSingular, EdgeSingular } from "cytoscape";
import type { FcoseLayoutOptions, LayoutType } from "./types";

// ----------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------
const getMutualNeighborCount = (edge: EdgeSingular): number => {
  const source = edge.source();
  const target = edge.target();

  const sourceNeighbors = source.neighborhood("node");
  const targetNeighbors = target.neighborhood("node");

  return sourceNeighbors.intersection(targetNeighbors).length;
};

// ----------------------------------------------------------------------
// Layout Configurations
// ----------------------------------------------------------------------

const BASE_OPTIONS: Partial<FcoseLayoutOptions> = {
  name: "fcose",
  quality: "default",
  animate: true,
  animationDuration: 1000,
  fit: true,
  padding: 50,
  numIter: 2500,
  initialEnergyOnIncremental: 0.8,
  nodeDimensionsIncludeLabels: true,
};

// 1. 나선형 (Spiral)
const SPIRAL_LAYOUT: FcoseLayoutOptions = {
  ...BASE_OPTIONS,
  name: "fcose",
  randomize: false,
  nodeRepulsion: () => 60000,
  idealEdgeLength: () => 200,
  edgeElasticity: () => 0.45,
  gravity: 0.1,
  nodeSeparation: 250,
};

// 2. 커뮤니티형 (Community) - 겹침 방지 튜닝
const COMMUNITY_LAYOUT: FcoseLayoutOptions = {
  ...BASE_OPTIONS,
  name: "fcose",
  randomize: false,
  tile: false,

  // 반발력은 그룹 분리를 위해 여전히 강하게 유지
  nodeRepulsion: () => 300000,

  // [수정] 거리: SPIRAL 기준(200)에서 시작 -> 친할수록 가까워짐
  idealEdgeLength: (edge: EdgeSingular) => {
    const mutualCount = getMutualNeighborCount(edge);
    // 기본 200에서 공유 친구 1명당 30px씩 감소
    // 단, 겹침 방지를 위해 최소 100px은 유지
    return Math.max(100, 300 - mutualCount * 20);
  },

  // [수정] 탄성: SPIRAL 기준(0.45)에서 시작 -> 친할수록 단단해짐
  edgeElasticity: (edge: EdgeSingular) => {
    const mutualCount = getMutualNeighborCount(edge);
    // 기본 0.45에서 공유 친구 1명당 0.1씩 증가 (최대 0.9)
    return Math.min(1.5, 0.45 + mutualCount * 0.05);
  },

  nodeSeparation: 100,
  gravity: 0.1,
};

// 3. 친밀도형 (Interaction)
const INTERACTION_LAYOUT: FcoseLayoutOptions = {
  ...BASE_OPTIONS,
  name: "fcose",
  randomize: true,
  tile: false,
  nodeRepulsion: (node: NodeSingular) => {
    const w = node.data("weight") || 0;
    return 100000 + w * 300000;
  },
  idealEdgeLength: () => 150,
  edgeElasticity: () => 0.45,
  gravity: 0.1,
  nodeSeparation: 200,
};

export const getLayoutOptions = (type: LayoutType): FcoseLayoutOptions => {
  switch (type) {
    case "community":
      return COMMUNITY_LAYOUT;
    case "interaction":
      return INTERACTION_LAYOUT;
    case "spiral":
    default:
      return SPIRAL_LAYOUT;
  }
};
