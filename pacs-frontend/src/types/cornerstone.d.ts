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
  export interface Tool {
    name: string;
  }

  export const LengthTool: Tool;
  export const AngleTool: Tool;
  export const RectangleRoiTool: Tool;
  export const EllipticalRoiTool: Tool;
  export const WwwcTool: Tool;
  export const PanTool: Tool;
  export const ZoomTool: Tool;
  export const StackScrollMouseWheelTool: Tool;

  export const external: {
    cornerstone: typeof import('cornerstone-core');
    Hammer: typeof import('hammerjs');
    cornerstoneMath: typeof import('cornerstone-math');
  };

  export function init(): void;
  export function addTool(tool: Tool): void;
  export function setToolActive(toolName: string, options?: Record<string, unknown>): void;
  export function setToolPassive(toolName: string): void;
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
