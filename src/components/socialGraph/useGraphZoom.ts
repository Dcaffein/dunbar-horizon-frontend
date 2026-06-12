import { useCallback } from "react";
import type { MutableRefObject } from "react";

export const ZOOM_FIT = 0.7;
export const ZOOM_NODE = 0.8;

export function useGraphZoom(cyRef: MutableRefObject<any>) {
  const zoomFit = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.nodes().length === 0) return;
    cy.zoom(ZOOM_FIT);
    cy.center();
  }, [cyRef]);

  const zoomToNode = useCallback(
    (nodeId: string, duration = 350) => {
      const cy = cyRef.current;
      if (!cy) return;
      const node = cy.getElementById(nodeId);
      if (node.length === 0) return;
      cy.animate(
        { center: { eles: node }, zoom: ZOOM_NODE },
        { duration, easing: "ease-out-quad" },
      );
    },
    [cyRef],
  );

  return { zoomFit, zoomToNode };
}
