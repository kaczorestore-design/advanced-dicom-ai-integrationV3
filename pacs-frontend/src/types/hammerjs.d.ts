declare module 'hammerjs' {
  export = Hammer;
  
  class Hammer {
    constructor(element: HTMLElement, options?: any);
    on(events: string, handler: (ev: any) => void): Hammer;
    off(events: string, handler?: (ev: any) => void): Hammer;
    destroy(): void;
    
    static Manager: any;
    static Pan: any;
    static Pinch: any;
    static Rotate: any;
    static Swipe: any;
    static Tap: any;
  }
}
