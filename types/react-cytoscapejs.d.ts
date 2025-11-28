// types/react-cytoscapejs.d.ts

declare module "react-cytoscapejs" {
  import { Component, CSSProperties } from "react";
  import cytoscape from "cytoscape";

  interface CytoscapeComponentProps {
    elements: cytoscape.ElementDefinition[];
    layout?: cytoscape.LayoutOptions;
    // ✅ [수정] Stylesheet -> StylesheetStyle
    stylesheet?: cytoscape.StylesheetStyle[];
    cy?: (cy: cytoscape.Core) => void;
    style?: CSSProperties;
    className?: string;

    pan?: { x: number; y: number };
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    wheelSensitivity?: number;
    boxSelectionEnabled?: boolean;
    autounselectify?: boolean;
    userZoomingEnabled?: boolean;
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {
    static normalizeElements(data: unknown): cytoscape.ElementDefinition[];
  }
}
