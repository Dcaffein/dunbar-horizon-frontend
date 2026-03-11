// components/socialGraph/types.ts

import type { NodeSingular, EdgeSingular } from "cytoscape";

export type LayoutType = "connectivity" | "interest" | "intimacy";

export interface FriendshipDetail {
  friendId: number;
  friendNickname: string;
  friendProfileImageUrl: string;
  friendAlias: string;
  intimacy: number;
  myInterestScore: number;
  isMuted: boolean;
}

export interface NetworkFriendEdge {
  friendAId: number;
  friendBId: number;
  intimacy: number;
}

export interface FcoseLayoutOptions {
  /** 레이아웃 알고리즘 이름 (fcose 고정) */
  name: "fcose";

  /** 연산 품질 (draft: 빠름, proof: 정교함, default: 균형) */
  quality?: "default" | "draft" | "proof";
  /** 초기 배치를 무작위로 할지 여부 (기존 위치 보존 시 false) */
  randomize?: boolean;
  /** 노드가 자리 잡는 과정을 애니메이션으로 보여줄지 여부 */
  animate?: boolean;
  /** 애니메이션 동작 시간 (ms 단위) */
  animationDuration?: number;
  /** 레이아웃 완료 후 전체 그래프가 캔버스에 꽉 차게 자동 줌인/아웃 */
  fit?: boolean;
  /** fit 적용 시 캔버스 테두리와 그래프 사이의 여백 (px) */
  padding?: number;
  /** 노드 겹침 계산 시 텍스트 라벨 영역까지 포함할지 여부 (글자 겹침 방지) */
  nodeDimensionsIncludeLabels?: boolean;

  /** 노드 간의 척력 */
  nodeRepulsion?: number | ((node: NodeSingular) => number);

  /** 선의 이상적인 목표 길이 */
  idealEdgeLength?: number | ((edge: EdgeSingular) => number);

  /**  선의 탄성 (당기는 힘) 클수록 이상적인 길이로 강하게 끌어당김 */
  edgeElasticity?: number | ((edge: EdgeSingular) => number);

  /** 부모 노드(Compound)가 자식 노드를 감쌀 때의 여유 공간 비율 */
  nestingFactor?: number;
  /** 화면 중앙으로 모든 노드를 당기는 중력 */
  gravity?: number;
  /** 물리 엔진의 최대 반복 계산 횟수 (높을수록 배치가 정교해지지만 연산이 길어짐) */
  numIter?: number;
  /** 기존 그래프에 새 노드가 추가될 때 발생하는 초기 충격 에너지량 (자연스러운 재배치용) */
  initialEnergyOnIncremental?: number;

  /** 부모 노드(Compound) 내부의 중력 범위 */
  gravityRangeCompound?: number;
  /** 부모 노드(Compound) 내부의 중력 세기 */
  gravityCompound?: number;
  /** 전체 중력이 미치는 범위 */
  gravityRange?: number;

  /** 노드 간에 절대 침범할 수 없는 최소 물리적 이격 거리 (px) */
  nodeSeparation?: number;
}
