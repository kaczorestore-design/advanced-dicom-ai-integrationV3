// Type declarations for Cornerstone3D modules

interface ImageLoaderReturn {
  promise: Promise<import('cornerstone-core').Image>;
  cancelFn?: () => void;
  decache?: () => void;
}

interface DICOMImageLoader {
  external: {
    cornerstone: typeof import('cornerstone-core');
    dicomParser: typeof import('dicom-parser');
  };
  configure(options: Record<string, unknown>): void;
  loadImage(imageId: string, options?: Record<string, unknown>): ImageLoaderReturn;
  wadouri: {
    loadImage(imageId: string, options?: Record<string, unknown>): ImageLoaderReturn;
  };
  wadors: {
    loadImage(imageId: string, options?: Record<string, unknown>): ImageLoaderReturn;
  };
}

interface StreamingImageVolumeLoader {
  loadVolume(volumeId: string): Promise<VolumeData>;
}

interface VolumeData {
  volumeId: string;
  dimensions: number[];
  spacing: number[];
  origin: number[];
  direction: number[];
  scalarData: ArrayLike<number>;
}

declare module '@cornerstonejs/dicom-image-loader' {
  const dicomImageLoader: DICOMImageLoader;
  export default dicomImageLoader;
}

declare module '@cornerstonejs/streaming-image-volume-loader' {
  export const cornerstoneStreamingImageVolumeLoader: StreamingImageVolumeLoader;
}

declare module '@cornerstonejs/dicom-image-loader/dist/cornerstoneDICOMImageLoader.bundle.min.js' {
  const dicomImageLoader: DICOMImageLoader;
  export default dicomImageLoader;
}
