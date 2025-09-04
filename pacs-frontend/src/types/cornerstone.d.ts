declare module 'cornerstone-core' {
  export interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: (enabledElement: EnabledElement, invalidated: boolean) => void;
    getPixelData: () => Uint8Array | Uint16Array | Int16Array | Float32Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    invert: boolean;
    sizeInBytes: number;
  }

  export interface Viewport {
    scale: number;
    translation: { x: number; y: number };
    voi: { windowWidth: number; windowCenter: number };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
  }

  export interface EnabledElement {
    element: HTMLElement;
    image: Image;
    viewport: Viewport;
    canvas: HTMLCanvasElement;
    invalid: boolean;
    needsRedraw: boolean;
  }

  export function enable(element: HTMLElement): void;
  export function disable(element: HTMLElement): void;
  export function displayImage(element: HTMLElement, image: Image): void;
  export function getViewport(element: HTMLElement): Viewport;
  export function setViewport(element: HTMLElement, viewport: Partial<Viewport>): void;
  export function reset(element: HTMLElement): void;
  export function getEnabledElement(element: HTMLElement): EnabledElement;
  export function renderGrayscaleImage(enabledElement: EnabledElement, invalidated: boolean): void;
}

declare module 'cornerstone-tools' {
  interface Tool {
    name: string;
    analyzeRegion?: (data: any, element: HTMLElement) => Promise<any>;
    analyzeTexture?: (data: any, element: HTMLElement) => Promise<any>;
    analyzeMorphology?: (data: any, element: HTMLElement) => Promise<any>;
  }

  const LengthTool: Tool;
  const AngleTool: Tool;
  const RectangleRoiTool: Tool;
  const EllipticalRoiTool: Tool;
  const WwwcTool: Tool;
  const PanTool: Tool;
  const ZoomTool: Tool;
  const StackScrollMouseWheelTool: Tool;

  const external: {
    cornerstone: typeof import('cornerstone-core');
    Hammer: typeof import('hammerjs');
    cornerstoneMath: typeof import('cornerstone-math');
  };

  function init(): void;
  function addTool(tool: Tool): void;
  function setToolActive(toolName: string, options?: Record<string, unknown>): void;
  function setToolPassive(toolName: string): void;
  function getToolForElement(element: HTMLElement, toolName: string): Tool | undefined;
  function addToolState(element: HTMLElement, toolName: string, data: any): void;

  export {
    Tool,
    LengthTool,
    AngleTool,
    RectangleRoiTool,
    EllipticalRoiTool,
    WwwcTool,
    PanTool,
    ZoomTool,
    StackScrollMouseWheelTool,
    external,
    init,
    addTool,
    setToolActive,
    setToolPassive,
    getToolForElement,
    addToolState
  };
}

declare module 'cornerstone-wado-image-loader' {
  export const external: {
    cornerstone: typeof import('cornerstone-core');
    dicomParser: typeof import('dicom-parser');
  };
}

export {};

declare global {
  interface Window {
    dicomParser: typeof import('dicom-parser');
    Hammer: typeof import('hammerjs');
    cornerstoneMath: typeof import('cornerstone-math');
  }
}
