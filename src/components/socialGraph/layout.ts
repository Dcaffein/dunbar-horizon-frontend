// components/socialGraph/layout.ts
import type { EdgeSingular } from "cytoscape";
import type { FcoseLayoutOptions, LayoutType } from "./types";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";

// circleSize별 예상 노드 수 힌트 (gravity/repulsion 스케일 기준)
const CIRCLE_NODE_HINTS: Partial<Record<GetFriendsNetworkCircleSize, number>> = {
  [GetFriendsNetworkCircleSize.SUPPORT]: 5,
  [GetFriendsNetworkCircleSize.SYMPATHY]: 15,
  [GetFriendsNetworkCircleSize.KINSHIP]: 50,
  [GetFriendsNetworkCircleSize.DUNBAR]: 150,
};

function gravityForCircle(circleSize: GetFriendsNetworkCircleSize | null): number {
  const n = circleSize ? (CIRCLE_NODE_HINTS[circleSize] ?? 0) : 0;
  if (n <= 0) return 0.05;
  // 노드 수가 적을수록 강한 중력으로 그래프를 중앙에 모음
  return Math.max(0.05, Math.min(0.8, 4 / n));
}

function repulsionForCircle(circleSize: GetFriendsNetworkCircleSize | null): number {
  const n = circleSize ? (CIRCLE_NODE_HINTS[circleSize] ?? 0) : 0;
  if (n <= 0) return 400000;
  return Math.max(20000, Math.min(400000, n * 8000));
}

export const getLayoutOptions = (
  type: LayoutType,
  isSnapshot: boolean = false,
  circleSize: GetFriendsNetworkCircleSize | null = null,
): FcoseLayoutOptions => {
  const baseOptions: Partial<FcoseLayoutOptions> = {
    quality: "proof",
    animate: !isSnapshot,
    animationDuration: isSnapshot ? 0 : 500,
    fit: true,
    nodeDimensionsIncludeLabels: true,
    randomize: false,
    numIter: 5000,
    tile: false,
  };

  const gravity = gravityForCircle(circleSize);
  const repulsion = repulsionForCircle(circleSize);

  // gravity: 0.25, // 전체 그래프를 가운데로 묶는 중력의 기본값
  // nodeRepulsion: 4500, // 노드 간의 기본적인 척력
  // idealEdgeLength: 50, // 모든 선의 기본 길이(50이면 한 점에 모임)
  // edgeElasticity: 0.45, // 모든 선의 기본 탄성(높을수록 idealEdgeLength를 유지하려는 힘이 강해짐)
  const configs: Record<LayoutType, FcoseLayoutOptions> = {
    connectivity: {
      ...baseOptions,
      name: "fcose",
      nodeRepulsion: repulsion,
      gravity,

      idealEdgeLength: (edge: EdgeSingular) => {
        const sourceNeighbors = edge.source().neighborhood("node");
        const targetNeighbors = edge.target().neighborhood("node");

        // 공통 지인(교집합)과 두 노드가 아는 모든 사람(합집합)을 구함
        const intersectionCount =
          sourceNeighbors.intersection(targetNeighbors).length;
        const unionCount = sourceNeighbors.union(targetNeighbors).length;

        // 자카드 유사도(Jaccard Similarity) 계산 (0.0 ~ 1.0)
        const similarity = unionCount > 0 ? intersectionCount / unionCount : 0;

        // 유사도가 0이면 400px 밖으로 밀어냄
        if (similarity === 0) return 400;

        // 유사도가 높을수록 선이 짧아짐 (최대 200px ~ 최소 90px 밀착)
        return Math.max(90, 200 - similarity * 150);
      },

      edgeElasticity: (edge: EdgeSingular) => {
        const sourceNeighbors = edge.source().neighborhood("node");
        const targetNeighbors = edge.target().neighborhood("node");

        const intersectionCount =
          sourceNeighbors.intersection(targetNeighbors).length;
        const unionCount = sourceNeighbors.union(targetNeighbors).length;

        const similarity = unionCount > 0 ? intersectionCount / unionCount : 0;

        // 유사도가 0이면 장력을 최소화하여 쉽게 늘어나게 방치함
        if (similarity === 0) return 0.05;

        // 유사도가 높을수록 장력이 폭발적으로 증가하여 끊어지지 않게 결속함 (최대 3.1)
        return 0.1 + similarity * 3.0;
      },
    },

    intimacy: {
      ...baseOptions,
      name: "fcose",
      nodeRepulsion: repulsion,
      gravity,

      idealEdgeLength: (edge: EdgeSingular) => {
        const rawIntimacy = edge.data("intimacy") || 0;

        // 곡선을 왼쪽으로 0.2 당긴 후 거듭제곱을 적용하여 텐션 발동 지점을 앞당김
        const visualIntimacy = Math.pow(rawIntimacy + 0.2, 2);

        // 친밀도가 높을수록 200px에서 80px까지 급격히 줄어듦
        return Math.max(80, 200 - visualIntimacy * 150);
      },

      edgeElasticity: (edge: EdgeSingular) => {
        const rawIntimacy = edge.data("intimacy") || 0;

        // 길이와 동일하게 0.2가 더해진 거듭제곱 곡선을 사용함
        const tensionCurve = Math.pow(rawIntimacy + 0.2, 2);

        // 기본 장력 0.1(실)에서 시작해 찐친 구간에서 폭발적으로 장력이 상승함 (최대 2.0)
        return 0.1 + tensionCurve * 1.9;
      },
    },

    interest: {
      ...baseOptions,
      name: "fcose",

      nodeRepulsion: repulsion,

      gravity,

      idealEdgeLength: 150,

      edgeElasticity: (edge: EdgeSingular) => {
        const deltaA = Math.max(0, (edge.source().data("interest") || 0) - (edge.source().data("intimacy") || 0));
        const deltaB = Math.max(0, (edge.target().data("interest") || 0) - (edge.target().data("intimacy") || 0));
        // 어느 한쪽 노드라도 delta가 크면 장력이 강해짐 (주인공 노드 기준)
        const dominantDelta = Math.max(deltaA, deltaB);
        return 0.45 + Math.sqrt(dominantDelta) * 8;
      },
    },
  };
  return configs[type] || configs.connectivity;
};
