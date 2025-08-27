declare module 'hammerjs' {
  export = Hammer;
  
  interface HammerOptions {
    [key: string]: unknown;
  }
  
  interface HammerEvent {
    type: string;
    deltaX?: number;
    deltaY?: number;
    distance?: number;
    angle?: number;
    velocityX?: number;
    velocityY?: number;
    scale?: number;
    rotation?: number;
    center?: { x: number; y: number };
    target?: EventTarget;
    preventDefault?: () => void;
    [key: string]: unknown;
  }
  
  class Hammer {
    constructor(element: HTMLElement, options?: HammerOptions);
    on(events: string, handler: (ev: HammerEvent) => void): Hammer;
    off(events: string, handler?: (ev: HammerEvent) => void): Hammer;
    destroy(): void;
    
    static Manager: typeof Hammer;
    static Pan: typeof Hammer;
    static Pinch: typeof Hammer;
    static Rotate: typeof Hammer;
    static Swipe: typeof Hammer;
    static Tap: typeof Hammer;
  }
}
