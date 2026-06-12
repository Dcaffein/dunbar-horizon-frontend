/* eslint-disable @typescript-eslint/no-explicit-any */
// components/socialGraph/CytoscapeWrapper.tsx
"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

// 브라우저 환경에서만 물리 엔진 플러그인 등록
if (typeof window !== "undefined") {
  cytoscape.use(fcose);
}

export default function CytoscapeWrapper({
  elements,
  stylesheet,
  layout,
  cy: setCy,
  onLayoutStop,
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      wheelSensitivity: 0.5,
      minZoom: 0.1,
      maxZoom: 5.0,
    });

    if (setCy) {
      setCy(cyRef.current);
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // elements가 비었으면 cy도 비워서 다음 로드 시 hadElementsBefore = false 보장
    if (!elements || elements.length === 0) {
      if (cy.elements().length > 0) cy.elements().remove();
      return;
    }

    // 단순 엣지 추가 여부를 판별할 변수
    let isLazyLoadUpdate = false;
    const hadElementsBefore = cy.elements().length > 0;

    cy.batch(() => {
      const newElementIds = new Set(elements.map((el: any) => el.data.id));

      const elementsToRemove = cy
        .elements()
        .filter((el: any) => !newElementIds.has(el.id()));
      if (elementsToRemove.length > 0) cy.remove(elementsToRemove);

      const elementsToAdd = elements.filter(
        (el: any) => cy.getElementById(el.data.id).length === 0,
      );
      if (elementsToAdd.length > 0) {
        // 기존 노드가 남아있을 때만 그래프 중심 기준으로 position 없는 새 노드 배치
        // 초기 로드/전체 교체 시에는 cy가 비어있어 cy.extent()가 유효하지 않으므로 적용 안 함
        const remainingNodes = cy.nodes();
        if (remainingNodes.length > 0) {
          const ext = cy.extent();
          const graphCenter = { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 };
          cy.add(elementsToAdd.map((el: any) => {
            if (!el.data.source && !el.position) {
              return { ...el, position: graphCenter };
            }
            return el;
          }));
        } else {
          cy.add(elementsToAdd);
        }
      }

      // 캔버스에 이미 데이터가 있었고, 삭제된 요소가 하나도 없거나
      // 삭제된 요소가 전부 suggestion 타입인 경우 (anchor 재선택) fit 비활성.
      const SUGGESTION_TYPES = ["suggestion", "suggestion-edge", "mutual-edge"];
      const removedAreSuggestionOnly =
        elementsToRemove.length > 0 &&
        elementsToRemove.every((el: any) =>
          SUGGESTION_TYPES.includes(el.data("type")),
        );
      isLazyLoadUpdate =
        hadElementsBefore &&
        (elementsToRemove.length === 0 || removedAreSuggestionOnly);
    });

    // 최초 렌더링/전체 교체: layoutstop 후 onLayoutStop 콜백으로 zoom 재조정
    // lazy-load: 현재 줌/팬 유지
    const layoutInstance = cy.layout({ ...layout, fit: false });
    if (!isLazyLoadUpdate && onLayoutStop) {
      layoutInstance.one("layoutstop", onLayoutStop);
    }
    layoutInstance.run();
  }, [elements]);

  // '스타일(stylesheet)'이 바뀌었을 때는 노드를 지우지 않고 스타일만 변경
  useEffect(() => {
    if (cyRef.current && stylesheet) {
      cyRef.current.style(stylesheet);
    }
  }, [stylesheet]); // 테마가 바뀔 때 실행됨

  // 테마(레이아웃) 변경 시 기존 위치에서 물리 엔진 재가동 → 완료 후 zoom 재조정
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.elements().length === 0) return;
    const layoutInstance = cy.layout({ ...layout, fit: false });
    if (onLayoutStop) {
      layoutInstance.one("layoutstop", onLayoutStop);
    }
    layoutInstance.run();
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
