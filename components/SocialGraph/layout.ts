// components/socialGraph/layout.ts
import type { NodeSingular, EdgeSingular } from "cytoscape";
import type { FcoseLayoutOptions, LayoutType } from "./types";

export const getLayoutOptions = (
  type: LayoutType,
  isSnapshot: boolean = false,
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

  // gravity: 0.25, // 전체 그래프를 가운데로 묶는 중력의 기본값
  // nodeRepulsion: 4500, // 노드 간의 기본적인 척력
  // idealEdgeLength: 50, // 모든 선의 기본 길이(50이면 한 점에 모임)
  // edgeElasticity: 0.45, // 모든 선의 기본 탄성(높을수록 idealEdgeLength를 유지하려는 힘이 강해짐)
  const configs: Record<LayoutType, FcoseLayoutOptions> = {
    connectivity: {
      ...baseOptions,
      name: "fcose",
      // 매우 강한 척력으로 노드 간 기본 거리를 넓게 확보함
      nodeRepulsion: 400000,
      // 중력을 최소화하여 척력에 의한 팽창을 허용함
      gravity: 0.05,

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
      // 강한 척력과 약한 중력으로 노드 간 기본 거리를 넓게 확보함
      nodeRepulsion: 400000,
      gravity: 0.05,

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

      nodeRepulsion: (node: NodeSingular) => {
        const interest = node.data("interest") || 0;
        // 관심도가 높을수록 더 큰 척력으로 자기 영역을 확보함 (기본 10,000 ~ 최대 230,000)
        return 10000 + interest * 220000;
      },

      // 척력이 약해진 만큼 중력을 살짝 올려서 전체 그래프의 파편화를 막음
      gravity: 0.2,

      edgeElasticity: (edge: EdgeSingular) => {
        const s = edge.source().data("interest") || 0;
        const t = edge.target().data("interest") || 0;

        // 양쪽 관심도의 합에 비례하여 장력이 강해짐 (최소 0.1 ~ 최대 1.5)
        return 0.1 + (s + t) * 0.7;
      },

      idealEdgeLength: (edge: EdgeSingular) => {
        const s = edge.source().data("interest") || 0;
        const t = edge.target().data("interest") || 0;

        // 두 노드의 평균 관심도를 산출함
        const avgI = (s + t) / 2;

        // 평균 관심도가 높을수록 거리가 짧아짐 (최대 400px ~ 최소 100px)
        return 400 - avgI * 300;
      },
    },
  };
  return configs[type] || configs.connectivity;
};
