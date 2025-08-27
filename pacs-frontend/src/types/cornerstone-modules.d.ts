declare module 'cornerstone-core' {
  const cornerstone: typeof import('./cornerstone');
  export = cornerstone;
}

declare module 'cornerstone-tools' {
  const cornerstoneTools: typeof import('./cornerstone');
  export = cornerstoneTools;
}

declare module 'cornerstone-wado-image-loader' {
  const cornerstoneWADOImageLoader: Record<string, unknown>;
  export = cornerstoneWADOImageLoader;
}
