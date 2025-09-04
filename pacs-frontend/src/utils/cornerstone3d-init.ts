import { init as csRenderInit } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import dicomImageLoader from '@cornerstonejs/dicom-image-loader';
import { cornerstoneStreamingImageVolumeLoader } from '@cornerstonejs/streaming-image-volume-loader';
import { Enums } from '@cornerstonejs/core';

// Initialize Cornerstone3D
export async function initCornerstone3D() {
  try {
    // Initialize the cornerstone core
    await csRenderInit();
    
    // Initialize cornerstone tools
    await csToolsInit();
    
    // Configure DICOM image loader
    const dicomLoader = dicomImageLoader as { external?: { cornerstone?: Record<string, unknown> } };
    if (dicomLoader.external) {
      dicomLoader.external.cornerstone = {
        ...dicomLoader.external.cornerstone,
      };
    }
    
    // Configure streaming image volume loader
    const streamingLoader = cornerstoneStreamingImageVolumeLoader as { external?: { cornerstone?: Record<string, unknown> } };
    if (streamingLoader.external) {
      streamingLoader.external.cornerstone = {
        ...streamingLoader.external.cornerstone,
      };
    }
    
    console.log('Cornerstone3D initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Cornerstone3D:', error);
    return false;
  }
}

// Viewport types for different visualization modes
export const ViewportType = {
  STACK: Enums.ViewportType.STACK,
  ORTHOGRAPHIC: Enums.ViewportType.ORTHOGRAPHIC,
  PERSPECTIVE: Enums.ViewportType.PERSPECTIVE,
  VOLUME_3D: Enums.ViewportType.VOLUME_3D,
};

// Rendering engine configuration
export const getRenderingEngineConfig = () => {
  return {
    name: 'myRenderingEngine',
    targetBufferType: 'Uint8Array',
  };
};

// MPR viewport configurations
export const getMPRViewportConfigs = () => {
  return {
    axial: {
      viewportId: 'CT_AXIAL',
      type: ViewportType.ORTHOGRAPHIC,
      element: null as HTMLDivElement | null,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
      },
    },
    sagittal: {
      viewportId: 'CT_SAGITTAL', 
      type: ViewportType.ORTHOGRAPHIC,
      element: null as HTMLDivElement | null,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
      },
    },
    coronal: {
      viewportId: 'CT_CORONAL',
      type: ViewportType.ORTHOGRAPHIC, 
      element: null as HTMLDivElement | null,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
      },
    },
  };
};

// Window/Level presets for different anatomies
export const getWindowLevelPresets = () => {
  return {
    'Soft Tissue': { windowWidth: 400, windowCenter: 40 },
    'Lung': { windowWidth: 1500, windowCenter: -600 },
    'Bone': { windowWidth: 1800, windowCenter: 400 },
    'Brain': { windowWidth: 80, windowCenter: 40 },
    'Liver': { windowWidth: 150, windowCenter: 30 },
    'Mediastinum': { windowWidth: 350, windowCenter: 50 },
    'Abdomen': { windowWidth: 350, windowCenter: 50 },
    'Spine': { windowWidth: 1800, windowCenter: 400 },
    'Angio': { windowWidth: 600, windowCenter: 300 },
    'Custom': { windowWidth: 400, windowCenter: 40 },
  };
};

// Hanging protocol configurations
export const getHangingProtocols = () => {
  return {
    'CT Chest': {
      id: 'ct-chest',
      name: 'CT Chest',
      modality: 'CT',
      bodyPart: 'CHEST',
      layout: {
        rows: 2,
        columns: 2,
        viewports: [
          { viewportId: 'axial', row: 0, col: 0 },
          { viewportId: 'sagittal', row: 0, col: 1 },
          { viewportId: 'coronal', row: 1, col: 0 },
          { viewportId: '3d', row: 1, col: 1 },
        ],
      },
      windowLevel: 'Lung',
    },
    'CT Abdomen': {
      id: 'ct-abdomen',
      name: 'CT Abdomen',
      modality: 'CT',
      bodyPart: 'ABDOMEN',
      layout: {
        rows: 2,
        columns: 2,
        viewports: [
          { viewportId: 'axial', row: 0, col: 0 },
          { viewportId: 'sagittal', row: 0, col: 1 },
          { viewportId: 'coronal', row: 1, col: 0 },
          { viewportId: 'volume', row: 1, col: 1 },
        ],
      },
      windowLevel: 'Abdomen',
    },
    'CT Brain': {
      id: 'ct-brain',
      name: 'CT Brain',
      modality: 'CT',
      bodyPart: 'HEAD',
      layout: {
        rows: 1,
        columns: 3,
        viewports: [
          { viewportId: 'axial', row: 0, col: 0 },
          { viewportId: 'sagittal', row: 0, col: 1 },
          { viewportId: 'coronal', row: 0, col: 2 },
        ],
      },
      windowLevel: 'Brain',
    },
    'Single View': {
      id: 'single-view',
      name: 'Single View',
      modality: 'ALL',
      bodyPart: 'ALL',
      layout: {
        rows: 1,
        columns: 1,
        viewports: [
          { viewportId: 'main', row: 0, col: 0 },
        ],
      },
      windowLevel: 'Soft Tissue',
    },
  };
};