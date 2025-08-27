declare module 'cornerstone-math' {
  export interface Point2 {
    x: number;
    y: number;
  }
  
  export interface Point3 {
    x: number;
    y: number;
    z: number;
  }
  
  export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }
  
  export const point: {
    distance: (p1: Point2, p2: Point2) => number;
    distanceSquared: (p1: Point2, p2: Point2) => number;
  };
  
  export const lineSegment: {
    distanceToPoint: (start: Point2, end: Point2, point: Point2) => number;
  };
  
  export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
  }
  
  export interface Ellipse {
    center: Point2;
    width: number;
    height: number;
  }
  
  export const rect: {
    getCorners: (rect: Rect) => Point2[];
  };
  
  export const ellipse: {
    pointInEllipse: (ellipse: Ellipse, point: Point2) => boolean;
  };
}
