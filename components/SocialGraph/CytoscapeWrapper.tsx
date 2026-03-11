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
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    cyRef.current = cytoscape({
      container: containerRef.current,
      wheelSensitivity: 0.2,
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
    if (!cy || !elements || elements.length === 0) return;

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
      if (elementsToAdd.length > 0) cy.add(elementsToAdd);

      // 캔버스에 이미 데이터가 있었고, 삭제된 요소가 하나도 없다면?
      // = 다른 네트워크로 교체된 게 아니라 새로운 엣지만 추가된 상황임.
      isLazyLoadUpdate = hadElementsBefore && elementsToRemove.length === 0;
      cy.nodes().forEach((node: any) => {
        if (node.degree() === 0) {
          node.addClass("isolated"); // 선이 0개면 흐릿하게
        } else {
          node.removeClass("isolated"); // 선이 1개라도 생기면 선명하게
        }
      });
    });

    // 레이지 로딩 상황일 때는 카메라 전체 화면 리셋(fit)을 강제로 끔.
    // 현재의 줌 인 상태를 유지하면서 노드들만 움직임
    cy.layout({ ...layout, fit: !isLazyLoadUpdate }).run();
  }, [elements]);

  // '스타일(stylesheet)'이 바뀌었을 때는 노드를 지우지 않고 스타일만 변경
  useEffect(() => {
    if (cyRef.current && stylesheet) {
      cyRef.current.style(stylesheet);
    }
  }, [stylesheet]); // 테마가 바뀔 때 실행됨

  // 레이아웃만 바뀌었을 때는 기존 위치에서 물리 엔진 재가동
  useEffect(() => {
    // 노드가 화면에 있을 때만 실행
    if (cyRef.current && cyRef.current.elements().length > 0) {
      cyRef.current.layout(layout).run();
    }
  }, [layout]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
