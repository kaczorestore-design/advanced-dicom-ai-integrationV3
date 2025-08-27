import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut,
  RotateCw, 
  Ruler, 
  Square, 
  Circle,
  Play,
  Pause,
  Download,
  Settings,
  Brain,
  Grid3X3,
  Move3D,
  RefreshCw,
  Layers,
  Maximize,
  Sun,
  Moon,
  Network,
  Type,
  ArrowUpRight,
  Target,
  Hand,
  MousePointer2,
  Contrast,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ScanLine,
  Crosshair,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
} from 'lucide-react';
import { DICOMNetworkPanel } from './DICOMNetworkPanel';
import { DICOMProtocolTester } from './DICOMProtocolTester';

import * as cornerstone from 'cornerstone-core';
import * as cornerstoneTools from 'cornerstone-tools';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';
import * as cornerstoneMath from 'cornerstone-math';

// Basic VTK.js imports for 3D visualization (simplified) - temporarily disabled
// import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
// import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
// import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
// import { VtkDataTypes } from 'vtk.js/Sources/Common/Core/DataArray/Constants';


interface Study {
  id: number;
  patient_name: string;
  patient_id: string;
  study_date: string;
  modality: string;
  body_part: string;
  study_description: string;
  ai_report?: {
    findings: string[];
    impression: string;
    confidence: number;
    pathology_scores?: Record<string, number>;
    abnormal_findings?: string[];
    ai_model?: string;
    analysis_type?: string;
  };
  dicom_files?: Array<{
    id: number;
    file_path: string;
    instance_number: number;
    slice_location?: number;
  }>;
}

interface Measurement {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'ellipse' | 'rectangle' | 'suv' | 'annotation' | 'arrow';
  value: number;
  unit: string;
  coordinates: number[];
  label?: string;
  text?: string;
  suvData?: {
    maxSUV: number;
    meanSUV: number;
    bodyWeight?: number;
    injectedDose?: number;
    scanTime?: string;
  };
}

interface ViewportSettings {
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  invert: boolean;
}

export default function DicomViewer() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const viewerRef = useRef<HTMLDivElement>(null);
  const cornerstoneElementRef = useRef<HTMLDivElement>(null);
  const vtkContainerRef = useRef<HTMLDivElement>(null);
  
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurements] = useState<Measurement[]>([]);
  const [activeTool, setActiveTool] = useState<string>('wwwc');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    windowCenter: 40,
    windowWidth: 400,
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    invert: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'mpr' | 'vr' | 'mip'>('2d');
  const [, setMprViews] = useState<{axial: HTMLElement | null, coronal: HTMLElement | null, sagittal: HTMLElement | null}>({
    axial: null,
    coronal: null,
    sagittal: null
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [showDICOMNetworking, setShowDICOMNetworking] = useState(false);
  const [, setShowAIHeatmap] = useState(false);
  const [seriesSynchronization, setSeriesSynchronization] = useState(false);
  const [, setHangingProtocol] = useState<string>('default');
  const [layout, setLayout] = useState<string>('1x1');
  const [keyboardShortcuts] = useState(true);
  
  // VTK.js state for 3D visualization (simplified) - temporarily disabled
  // const [vtkFullScreenRenderWindow, setVtkFullScreenRenderWindow] = useState<any>(null);
  // const [vtkInitialized, setVtkInitialized] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  

  
  const persistedMeasurements = measurements;
  const measurementsLoading = false;
  const deleteMeasurement = (id: string) => {
    console.log('Deleting measurement:', id);
  };

  useEffect(() => {
    console.log('🔍 DicomViewer useEffect triggered, viewMode:', viewMode, 'isInitialized:', isInitialized);
    console.log('🔍 cornerstoneElementRef.current:', cornerstoneElementRef.current);
    
    if (!cornerstoneElementRef.current || isInitialized) {
      console.log('⏳ Waiting for cornerstone element to be ready or already initialized');
      return;
    }
    
    const timer = setTimeout(() => {
      initializeCornerstone();
    }, 100);
    
    return () => clearTimeout(timer);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cornerstoneElementRef.current, isInitialized]);
  
  const initializeCornerstone = async () => {
    try {
      if (!cornerstoneElementRef.current) {
        console.log('❌ cornerstoneElementRef.current is null, skipping initialization');
        return;
      }

        console.log('🔧 Initializing Cornerstone.js...');
        
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        
        cornerstoneWADOImageLoader.configure({
          beforeSend: function(xhr: XMLHttpRequest) {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          },
          useWebWorkers: false,
          webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.js',
          taskConfiguration: {
            'decodeTask': {
              loadCodecsOnStartup: true,
              initializeCodecsOnStartup: false,
              codecsPath: '/cornerstoneWADOImageLoaderCodecs.js',
              usePDFJS: false,
              strict: false
            }
          }
        });

        cornerstoneTools.external.cornerstone = cornerstone;
        cornerstoneTools.external.Hammer = Hammer;
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
        
        cornerstoneTools.init({
          mouseEnabled: true,
          touchEnabled: true,
          globalToolSyncEnabled: false,
          showSVGCursors: true
        });
        
        try {
          cornerstone.enable(cornerstoneElementRef.current);
          console.log('✅ Cornerstone element enabled successfully');
        } catch (enableErr) {
          console.error('❌ Failed to enable cornerstone element:', enableErr);
          setError('Failed to initialize DICOM viewer element');
          return;
        }
        
        const LengthTool = cornerstoneTools.LengthTool;
        const AngleTool = cornerstoneTools.AngleTool;
        const RectangleRoiTool = cornerstoneTools.RectangleRoiTool;
        const EllipticalRoiTool = cornerstoneTools.EllipticalRoiTool;
        const WwwcTool = cornerstoneTools.WwwcTool;
        const PanTool = cornerstoneTools.PanTool;
        const ZoomTool = cornerstoneTools.ZoomTool;
        const StackScrollMouseWheelTool = cornerstoneTools.StackScrollMouseWheelTool;
        
        cornerstoneTools.addTool(LengthTool);
        cornerstoneTools.addTool(AngleTool);
        cornerstoneTools.addTool(RectangleRoiTool);
        cornerstoneTools.addTool(EllipticalRoiTool);
        cornerstoneTools.addTool(WwwcTool);
        cornerstoneTools.addTool(PanTool);
        cornerstoneTools.addTool(ZoomTool);
        cornerstoneTools.addTool(StackScrollMouseWheelTool);
        
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 });
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
        cornerstoneTools.setToolActive('StackScrollMouseWheel', {});
        
        (window as typeof window & {
          cornerstone: typeof cornerstone;
          cornerstoneTools: typeof cornerstoneTools;
          cornerstoneWADOImageLoader: typeof cornerstoneWADOImageLoader;
        }).cornerstone = cornerstone;
        (window as typeof window & {
          cornerstone: typeof cornerstone;
          cornerstoneTools: typeof cornerstoneTools;
          cornerstoneWADOImageLoader: typeof cornerstoneWADOImageLoader;
        }).cornerstoneTools = cornerstoneTools;
        (window as typeof window & {
          cornerstone: typeof cornerstone;
          cornerstoneTools: typeof cornerstoneTools;
          cornerstoneWADOImageLoader: typeof cornerstoneWADOImageLoader;
        }).cornerstoneWADOImageLoader = cornerstoneWADOImageLoader;
        
        setIsInitialized(true);
        console.log('✅ Cornerstone initialized successfully');
        
      } catch (err) {
        console.error('❌ Failed to initialize Cornerstone:', err);
        setError('Failed to initialize DICOM viewer');
      }
    };

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && viewMode === '2d') {
      loadImage(currentImageIndex);
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode, loadImage]);

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && viewMode === '2d') {
      console.log('✅ Cornerstone initialized, loading images:', imageIds);
      loadImage(0);
    }
  }, [isInitialized, imageIds, viewMode, loadImage]);

  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 0 && cornerstoneElementRef.current && viewMode === '2d') {
      loadImage(currentImageIndex);
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode, loadImage]);

  // Set up image stack for mouse wheel scrolling
  useEffect(() => {
    if (isInitialized && imageIds && imageIds.length > 1 && cornerstoneElementRef.current && viewMode === '2d') {
      try {
        const element = cornerstoneElementRef.current;
        
        // Create stack object
        const stack = {
          imageIds: imageIds,
          currentImageIdIndex: currentImageIndex
        };
        
        // Add stack state manager
        cornerstoneTools.addStackStateManager(element, ['stack']);
        cornerstoneTools.addToolState(element, 'stack', stack);
        
        // Add event listener for stack scroll events
        const handleStackScroll = () => {
          const stackData = cornerstoneTools.getToolState(element, 'stack');
          if (stackData && stackData.data && stackData.data.length > 0) {
            const newImageIndex = stackData.data[0].currentImageIdIndex;
            if (newImageIndex !== currentImageIndex && newImageIndex >= 0 && newImageIndex < imageIds.length) {
              setCurrentImageIndex(newImageIndex);
            }
          }
        };
        
        element.addEventListener('cornerstoneimagerendered', handleStackScroll);
        
        console.log('✅ Image stack configured for mouse wheel scrolling:', imageIds.length, 'images');
        
        // Cleanup function
        return () => {
          element.removeEventListener('cornerstoneimagerendered', handleStackScroll);
        };
      } catch (err) {
        console.error('❌ Failed to setup image stack:', err);
      }
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode]);

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching study with ID: ${studyId}`);
        const response = await fetch(`${API_URL}/api/studies/${studyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const studyData = await response.json();
          setStudy(studyData);
          
          if (studyData.dicom_files && studyData.dicom_files.length > 0) {
            const ids = studyData.dicom_files.map((file: { id: number; file_path: string; instance_number: number; slice_location?: number }) => 
              `wadouri:${API_URL}/api/studies/dicom/files/${file.id}`
            );
            setImageIds(ids);
            console.log('✅ Study loaded with image IDs:', ids);
          } else {
            const mockIds = Array.from({ length: 120 }, (_, i) => 
              `example://image-${i + 1}`
            );
            setImageIds(mockIds);
            console.log('⚠️ No DICOM files found, using mock images');
          }
        } else {
          setError('Study not found or access denied');
          console.error('Failed to fetch study:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error fetching study:', err);
        setError('Failed to load study data');
      } finally {
        setLoading(false);
      }
    };

    if (studyId) {
      fetchStudy();
    }
  }, [studyId, token, API_URL]);

  // VTK useEffect temporarily disabled
  // useEffect(() => {
  //   if (viewMode === '3d' || viewMode === 'vr') {
  //     initializeVTK().then(() => {
  //       if (viewMode === '3d' && vtkFullScreenRenderWindow) {
  //         // Basic 3D volume rendering setup
  //         createVolumeFromDICOM().then(volumeData => {
  //           if (volumeData) {
  //             console.log('3D volume data created successfully - basic VTK.js integration ready');
  //             // Advanced volume rendering would require additional VTK modules
  //           }
  //         });
  //       }
  //     });
  //   }
  // }, [viewMode, vtkFullScreenRenderWindow]);
  
  // Cleanup VTK when switching away from 3D modes - temporarily disabled
  // useEffect(() => {
  //   if (viewMode !== '3d' && viewMode !== 'vr' && viewMode !== 'mip' && vtkInitialized) {
  //     cleanupVTK();
  //   }
  // }, [viewMode]);
  
  // Cleanup VTK on component unmount - temporarily disabled
  // useEffect(() => {
  //   return () => {
  //     cleanupVTK();
  //   };
  // }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup playback interval
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      
      // Cleanup cornerstone
      if (cornerstoneElementRef.current) {
        try {
          cornerstone.disable(cornerstoneElementRef.current);
        } catch (err) {
          console.warn('Error disabling cornerstone element:', err);
        }
      }
    };
  }, []);

  // Mouse event handlers for sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.max(250, Math.min(600, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadImage = async (imageIndex: number) => {
    if (!cornerstoneElementRef.current) {
      console.error('Cannot load image - cornerstone element not available');
      setError('Viewer element not ready. Please try refreshing the page.');
      return;
    }
    
    if (!isInitialized) {
      console.error('Cannot load image - cornerstone not initialized');
      setError('DICOM viewer not initialized. Please try refreshing the page.');
      return;
    }
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      console.error('No image IDs available or not an array');
      setError('No images available for this study');
      return;
    }
    
    if (imageIndex < 0 || imageIndex >= imageIds.length) {
      console.error('Invalid image index:', imageIndex, 'max:', imageIds.length - 1);
      return;
    }
    
    try {
      const imageId = imageIds[imageIndex];
      
      if (imageId && typeof imageId === 'string' && imageId.startsWith('wadouri:')) {
        console.log('🔄 Loading real DICOM image:', imageId);
        try {
          const image = await cornerstone.loadImage(imageId);
          console.log('✅ DICOM image loaded successfully:', image.width, 'x', image.height);
          
          if (cornerstoneElementRef.current) {
            cornerstone.displayImage(cornerstoneElementRef.current, image);
            
            const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
            cornerstone.setViewport(cornerstoneElementRef.current, {
              ...viewport,
              ...viewportSettings
            });
          } else {
            console.error('Cornerstone element reference lost during image loading');
          }
        } catch (err) {
          console.error('Failed to load DICOM image:', err);
          createAndDisplayMockImage(imageIndex);
        }
      } else {
        createAndDisplayMockImage(imageIndex);
      }
      
    } catch (err) {
      console.error('❌ Failed to load image:', err);
      if (imageIds && imageIndex < imageIds.length) {
        console.error('Image ID that failed:', imageIds[imageIndex]);
      }
      setError('Failed to load DICOM image');
    }
  };

  const createAndDisplayMockImage = (imageIndex: number) => {
    if (!cornerstoneElementRef.current) {
      console.error('Cannot create mock image - cornerstone element not available');
      return;
    }
    
    if (!isInitialized) {
      console.error('Cannot create mock image - cornerstone not initialized');
      return;
    }
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get 2D context from canvas');
        return;
      }
      
      const imageData = ctx.createImageData(512, 512);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const x = (i / 4) % 512;
        const y = Math.floor((i / 4) / 512);
        const centerX = 256;
        const centerY = 256;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        let intensity = 0;
        if (study?.modality === 'CR' || study?.modality === 'DX') {
          intensity = Math.max(0, 200 - distance * 0.5 + Math.sin(x * 0.02) * 20 + Math.cos(y * 0.02) * 20);
          if (distance > 200) intensity = Math.max(intensity * 0.3, 20);
        } else if (study?.modality === 'CT') {
          intensity = 128 + Math.sin(distance * 0.02) * 50 + Math.random() * 30;
        } else if (study?.modality === 'MR') {
          intensity = 150 + Math.cos(distance * 0.01) * 80 + Math.sin(x * 0.01) * 30;
        } else {
          intensity = Math.max(0, 255 - distance + Math.random() * 50);
        }
        
        intensity = Math.max(0, Math.min(255, intensity));
        
        imageData.data[i] = intensity;
        imageData.data[i + 1] = intensity;
        imageData.data[i + 2] = intensity;
        imageData.data[i + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const mockImageId = imageIds && imageIndex < imageIds.length ? 
        imageIds[imageIndex] : `mock-image-${imageIndex}`;
      
      const mockImage = {
        imageId: mockImageId,
        minPixelValue: 0,
        maxPixelValue: 255,
        slope: 1,
        intercept: 0,
        windowCenter: viewportSettings.windowCenter,
        windowWidth: viewportSettings.windowWidth,
        render: cornerstone.renderGrayscaleImage,
        getPixelData: () => imageData.data,
        rows: 512,
        columns: 512,
        height: 512,
        width: 512,
        color: false,
        columnPixelSpacing: 1,
        rowPixelSpacing: 1,
        invert: false,
        sizeInBytes: 512 * 512
      };
      
      cornerstone.displayImage(cornerstoneElementRef.current, mockImage);
      
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      cornerstone.setViewport(cornerstoneElementRef.current, {
        ...viewport,
        ...viewportSettings
      });
      
      console.log('✅ Mock image displayed successfully');
    } catch (err) {
      console.error('❌ Failed to create and display mock image:', err);
    }
  };

  const handleToolSelect = (tool: string) => {
    if (!cornerstoneElementRef.current) return;
    
    cornerstoneTools.setToolPassive('Length');
    cornerstoneTools.setToolPassive('Angle');
    cornerstoneTools.setToolPassive('RectangleRoi');
    cornerstoneTools.setToolPassive('EllipticalRoi');
    cornerstoneTools.setToolPassive('FreehandRoi');
    cornerstoneTools.setToolPassive('CobbAngle');
    cornerstoneTools.setToolPassive('Wwwc');
    cornerstoneTools.setToolPassive('Pan');
    cornerstoneTools.setToolPassive('Zoom');
    
    switch (tool) {
      case 'distance':
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'angle':
        cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
        break;
      case 'rectangle':
        cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
        break;
      case 'ellipse':
        cornerstoneTools.setToolActive('EllipticalRoi', { mouseButtonMask: 1 });
        break;
      case 'freehand':
        cornerstoneTools.setToolActive('FreehandRoi', { mouseButtonMask: 1 });
        break;
      case 'cobb':
        cornerstoneTools.setToolActive('CobbAngle', { mouseButtonMask: 1 });
        break;
      case 'suv':
        // SUV measurement - use Length tool with special handling
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'annotation':
        // Text annotation - use a simple click handler for now
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'arrow':
        // Arrow tool - use Length tool with arrow styling
        cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
        break;
      case 'wwwc':
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
        break;
      case 'pan':
        cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
        break;
      case 'zoom':
        cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
        break;
      default:
        cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
    }
    
    setActiveTool(tool);
  };

  const reconstruct3D = () => {
    setViewMode('3d');
    console.log('3D reconstruction requested - VTK integration coming soon');
  };

  // VTK.js functions temporarily disabled

  const generateMPR = async () => {
    setViewMode('mpr');
    
    setMprViews({
      axial: { label: 'Axial View', ready: true },
      coronal: { label: 'Coronal View', ready: true },
      sagittal: { label: 'Sagittal View', ready: true }
    });
    
    // await initializeVTK();
    console.log('MPR generation - VTK.js temporarily disabled');
  };

  const generateMIP = async () => {
    setViewMode('mip');
    // await initializeVTK();
    
    // if (vtkFullScreenRenderWindow) {
    //   const volumeData = await createVolumeFromDICOM();
    //   if (volumeData) {
    //     console.log('MIP generation with VTK.js - volume data created successfully');
    //     // Basic MIP implementation - more advanced rendering would require additional VTK modules
    //     console.log('MIP rendering with VTK.js completed');
    //   }
    // }
    console.log('MIP generation - VTK.js temporarily disabled');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSliceChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < imageIds.length) {
      setCurrentImageIndex(newIndex);
    }
  };

  const handleRotate = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    const newRotation = (viewportSettings.rotation + 90) % 360;
    const newSettings = {
      ...viewportSettings,
      rotation: newRotation
    };
    
    setViewportSettings(newSettings);
    
    try {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      viewport.rotation = newRotation * (Math.PI / 180); // Convert to radians
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    } catch (err) {
      console.error('Failed to rotate image:', err);
      setError('Failed to rotate image');
    }
  };

  const handleInvert = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    const newInvert = !viewportSettings.invert;
    const newSettings = {
      ...viewportSettings,
      invert: newInvert
    };
    
    setViewportSettings(newSettings);
    
    try {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      viewport.invert = newInvert;
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    } catch (err) {
      console.error('Failed to invert image:', err);
      setError('Failed to invert image');
    }
  };

  const handleWindowLevelChange = (type: 'center' | 'width', value: number) => {
    const newSettings = {
      ...viewportSettings,
      windowCenter: type === 'center' ? value : viewportSettings.windowCenter,
      windowWidth: type === 'width' ? value : viewportSettings.windowWidth
    };
    
    setViewportSettings(newSettings);
    
    if (cornerstoneElementRef.current && isInitialized) {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      viewport.voi.windowWidth = newSettings.windowWidth;
      viewport.voi.windowCenter = newSettings.windowCenter;
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    }
  };

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }
    
    if (imageIds.length <= 1) {
      setError('Cannot play cine with only one image');
      return;
    }
    
    setIsPlaying(true);
    
    playbackIntervalRef.current = setInterval(() => {
      setCurrentImageIndex(prev => {
        const next = prev + 1;
        if (next >= imageIds.length) {
          setIsPlaying(false);
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
          }
          return 0;
        }
        return next;
      });
    }, 100);
  };

  const resetViewport = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    const defaultSettings = {
      windowCenter: 40,
      windowWidth: 400,
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
      invert: false
    };
    
    setViewportSettings(defaultSettings);
    cornerstone.reset(cornerstoneElementRef.current);
  };

  const handleZoomIn = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    try {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      const newZoom = Math.min(viewport.scale * 1.25, 10); // Max zoom 10x
      viewport.scale = newZoom;
      
      setViewportSettings(prev => ({ ...prev, zoom: newZoom }));
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    } catch (err) {
      console.error('Failed to zoom in:', err);
      setError('Failed to zoom in');
    }
  };

  const handleZoomOut = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    try {
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      const newZoom = Math.max(viewport.scale * 0.8, 0.1); // Min zoom 0.1x
      viewport.scale = newZoom;
      
      setViewportSettings(prev => ({ ...prev, zoom: newZoom }));
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    } catch (err) {
      console.error('Failed to zoom out:', err);
      setError('Failed to zoom out');
    }
  };

  const handleZoomFit = () => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    try {
      cornerstone.fitToWindow(cornerstoneElementRef.current);
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      setViewportSettings(prev => ({ ...prev, zoom: viewport.scale }));
    } catch (err) {
      console.error('Failed to fit to window:', err);
      setError('Failed to fit to window');
    }
  };

  // Window Level Presets
  const windowLevelPresets = {
    lung: { center: -600, width: 1500 },
    bone: { center: 300, width: 1500 },
    brain: { center: 40, width: 80 },
    abdomen: { center: 50, width: 350 },
    mediastinum: { center: 50, width: 350 },
    liver: { center: 30, width: 150 },
    spine: { center: 50, width: 250 }
  };

  const applyWindowLevelPreset = (preset: keyof typeof windowLevelPresets) => {
    if (!cornerstoneElementRef.current || !isInitialized) return;
    
    try {
      const { center, width } = windowLevelPresets[preset];
      const viewport = cornerstone.getViewport(cornerstoneElementRef.current);
      viewport.voi.windowCenter = center;
      viewport.voi.windowWidth = width;
      
      setViewportSettings(prev => ({ 
        ...prev, 
        windowCenter: center, 
        windowWidth: width 
      }));
      cornerstone.setViewport(cornerstoneElementRef.current, viewport);
    } catch (err) {
      console.error('Failed to apply window level preset:', err);
      setError('Failed to apply window level preset');
    }
  };

  const resetWindowLevel = () => {
    applyWindowLevelPreset('brain'); // Default to brain window
  };

  const exportImage = () => {
    if (!cornerstoneElementRef.current || !isInitialized) {
      setError('DICOM viewer not ready for export');
      return;
    }
    
    try {
      const element = cornerstoneElementRef.current;
      const viewport = cornerstone.getViewport(element);
      
      if (!viewport) {
        setError('No viewport available for export');
        return;
      }
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        setError('Failed to create export canvas');
        return;
      }
      
      const image = cornerstone.getImage(element);
      
      if (!image) {
        setError('No image available for export');
        return;
      }
      
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Use cornerstone's built-in canvas rendering
      const enabledElement = cornerstone.getEnabledElement(element);
      if (enabledElement && enabledElement.canvas) {
        context.drawImage(enabledElement.canvas, 0, 0);
      } else {
        setError('Failed to access rendered image');
        return;
      }
      
      const link = document.createElement('a');
      link.download = `study_${studyId}_image_${currentImageIndex + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Failed to export image:', err);
      setError('Failed to export image. Please try again.');
    }
  };

  const generateAIReport = async () => {
    if (!study) {
      setError('No study available for AI analysis');
      return;
    }
    
    try {
      setAiReportLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/ai/generate-report/${studyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const reportData = await response.json();
        
        setStudy(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ai_report: reportData
          };
        });
        
        setShowAIHeatmap(true);
      } else {
        const errorText = await response.text();
        console.error('Failed to generate AI report:', response.status, errorText);
        setError(`Failed to generate AI report: ${response.status === 404 ? 'Service not available' : 'Server error'}`);
      }
    } catch (err) {
      console.error('Error generating AI report:', err);
      setError('Network error while generating AI report. Please check your connection and try again.');
    } finally {
      setAiReportLoading(false);
    }
  };

  const exportCineLoop = () => {
    if (!cornerstoneElementRef.current || !isInitialized || imageIds.length < 2) {
      console.error('Cannot export cine loop - viewer not ready or not enough images');
      return;
    }
    
    try {
      console.log('Exporting cine loop...');
      
      
      alert('Cine loop export feature coming soon. This would export a MP4 video of the current series.');
      
    } catch (err) {
      console.error('Failed to export cine loop:', err);
    }
  };

  const export3DModel = async () => {
    if (!study) return;
    
    try {
      console.log('Exporting 3D model...');
      
      
      const stlContent = `solid DICOM_3D_Model
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid DICOM_3D_Model`;
      
      const blob = new Blob([stlContent], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `study_${studyId}_3d_model.stl`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to export 3D model:', err);
    }
  };

  const exportReportPDF = async () => {
    if (!study) return;
    
    try {
      const response = await fetch(`${API_URL}/api/studies/${studyId}/report/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = `study_${studyId}_report.pdf`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download report PDF:', response.status);
      }
    } catch (err) {
      console.error('Error downloading report PDF:', err);
    }
  };

  const initializeDICOMweb = () => {
    setShowDICOMNetworking(true);
  };

  const toggleSeriesSynchronization = () => {
    setSeriesSynchronization(!seriesSynchronization);
    console.log(`Series synchronization ${!seriesSynchronization ? 'enabled' : 'disabled'}`);
  };

  const applyHangingProtocol = (protocol: string) => {
    setHangingProtocol(protocol);
    console.log(`Applied hanging protocol: ${protocol}`);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!keyboardShortcuts) return;
      
      switch (e.key) {
        case 'ArrowRight':
          setCurrentImageIndex(prev => Math.min(prev + 1, imageIds.length - 1));
          break;
        case 'ArrowLeft':
          setCurrentImageIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'w':
          handleToolSelect('wwwc');
          break;
        case 'p':
          handleToolSelect('pan');
          break;
        case 'z':
          handleToolSelect('zoom');
          break;
        case 'd':
          handleToolSelect('distance');
          break;
        case 'a':
          handleToolSelect('angle');
          break;
        case 'r':
          handleToolSelect('rectangle');
          break;
        case 'e':
          handleToolSelect('ellipse');
          break;
        case 'f':
          handleToolSelect('freehand');
          break;
        case 'c':
          handleToolSelect('cobb');
          break;
        case 's':
          handleToolSelect('suv');
          break;
        case 't':
          handleToolSelect('annotation');
          break;
        case 'm':
          handleToolSelect('arrow');
          break;
        case 'Space':
          togglePlayback();
          break;
        case 'Escape':
          resetViewport();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [keyboardShortcuts, imageIds.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-cardiac-spin text-blue-500 text-6xl">❤️</div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading DICOM viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-2xl w-full mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <Button onClick={() => navigate(-1)} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studies
        </Button>
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-2xl w-full">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Tips:</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Check your network connection</li>
            <li>Verify that the study ID is correct</li>
            <li>Ensure you have permission to access this study</li>
            <li>Try refreshing the page</li>
            <li>Contact support if the issue persists</li>
          </ul>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-500 hover:bg-blue-600"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 text-gray-100' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-800'
    }`}>
      {/* Header */}
      <div className={`p-2 sm:p-4 border-b transition-colors duration-200 ${
        theme === 'dark' 
          ? 'border-slate-700/50 bg-gradient-to-r from-slate-800/90 to-gray-800/90 backdrop-blur-sm' 
          : 'border-gray-200/60 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm'
      } flex-shrink-0 shadow-lg`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
          <div className="flex items-center w-full sm:w-auto">
            <Button 
              size="sm" 
              onClick={() => navigate(-1)}
              className={`mr-2 sm:mr-4 flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-slate-600/90 hover:to-slate-700/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50'
                  : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-gray-200/90 hover:to-gray-300/90 text-gray-700 hover:text-gray-800 border border-gray-300/50 hover:border-gray-400/50'
              }`}
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate text-blue-800 dark:text-blue-100">{study?.patient_name || 'Unknown Patient'}</h1>
              <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="truncate text-blue-700 dark:text-blue-300">ID: {study?.patient_id || 'Unknown'}</span>
                <span className="hidden sm:inline text-blue-500 dark:text-blue-400">•</span>
                <span className="truncate text-blue-700 dark:text-blue-300">Date: {study?.study_date || 'Unknown'}</span>
                <span className="hidden sm:inline text-blue-500 dark:text-blue-400">•</span>
                <Badge className={`text-xs border-2 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-blue-700 to-blue-800 text-blue-100 border-blue-500 shadow-md' 
                    : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-blue-300 shadow-sm'
                }`}>{study?.modality || 'Unknown'}</Badge>
                <Badge className={`text-xs border-2 ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-br from-blue-700 to-blue-800 text-blue-100 border-blue-500 shadow-md' 
                    : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-800 border-blue-300 shadow-sm'
                }`}>{study?.body_part || 'Unknown'}</Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2 w-full sm:w-auto justify-end">
            <Button 
              size="sm" 
              onClick={toggleTheme}
              className={`flex-shrink-0 font-semibold transition-all duration-200 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white border-slate-500 hover:border-slate-400 shadow-lg hover:shadow-xl' 
                  : 'bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 text-gray-800 border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg'
              }`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              size="sm" 
              onClick={initializeDICOMweb}
              className={`flex-shrink-0 font-semibold transition-all duration-200 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-blue-500 hover:border-blue-400 shadow-lg hover:shadow-xl' 
                  : 'bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-800 border-blue-300 hover:border-blue-400 shadow-md hover:shadow-lg'
              }`}
            >
              <Network className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">DICOM Network</span>
            </Button>
            <Button 
              size="sm" 
              onClick={exportReportPDF}
              className={`flex-shrink-0 font-semibold transition-all duration-200 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-green-500 hover:border-green-400 shadow-lg hover:shadow-xl' 
                  : 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-800 border-green-300 hover:border-green-400 shadow-md hover:shadow-lg'
              }`}
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-medium">Report</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className={`w-full lg:w-20 max-h-screen lg:max-h-full p-3 flex lg:flex-col justify-start lg:justify-center items-center overflow-x-auto overflow-y-auto lg:overflow-x-visible lg:overflow-y-auto space-y-0 lg:space-y-3 space-x-3 lg:space-x-0 ${theme === 'dark' ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700' : 'bg-gradient-to-b from-gray-50 to-gray-100 border-r border-gray-300'} flex-shrink-0 shadow-lg scroll-smooth`} style={{scrollbarWidth: 'thin', scrollbarColor: theme === 'dark' ? '#4B5563 #1F2937' : '#9CA3AF #E5E7EB'}}>
          {/* Window/Level Tool */}
          <Button 
            variant={activeTool === 'wwwc' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('wwwc')}
            className={`aspect-square w-12 h-12 font-semibold transition-all duration-200 hover:scale-105 border-2 ${
              activeTool === 'wwwc' 
                ? theme === 'dark'
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-400 shadow-xl'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-lg'
                : theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-blue-600 hover:to-blue-700 text-white border-slate-500 hover:border-blue-400 shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-800 border-gray-300 hover:border-blue-400 shadow-md hover:shadow-lg'
            }`}
            title="Window/Level Adjustment (W)"
          >
            <Contrast className="h-5 w-5" />
          </Button>
          
          {/* Zoom Tools Group */}
          <div className="flex lg:flex-col gap-1">
            <Button 
              variant={activeTool === 'zoom' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('zoom')}
              className={`aspect-square w-12 h-12 font-semibold transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'zoom' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-green-600 hover:to-green-700 text-white border-slate-500 hover:border-green-400 shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-br from-white to-gray-50 hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-md hover:shadow-lg'
              }`}
              title="Interactive Zoom Tool (Z)"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleZoomIn}
              className={`aspect-square w-10 h-10 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-emerald-600 hover:to-emerald-700 text-white border-slate-400 hover:border-emerald-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-emerald-50 hover:to-emerald-100 text-gray-700 hover:text-emerald-800 border-gray-300 hover:border-emerald-400 shadow-sm hover:shadow-md'
              }`}
              title="Zoom In (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleZoomOut}
              className={`aspect-square w-10 h-10 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white border-slate-400 hover:border-red-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-800 border-gray-300 hover:border-red-400 shadow-sm hover:shadow-md'
              }`}
              title="Zoom Out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleZoomFit}
              className={`aspect-square w-10 h-10 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
              }`}
              title="Fit to Window (F)"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Pan Tool */}
          <Button 
            variant={activeTool === 'pan' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => handleToolSelect('pan')}
            className={`aspect-square w-12 h-12 font-semibold transition-all duration-200 hover:scale-105 border-2 ${
              activeTool === 'pan' 
                ? theme === 'dark'
                  ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white border-orange-400 shadow-xl'
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400 shadow-lg'
                : theme === 'dark'
                  ? 'bg-gradient-to-br from-slate-700 to-slate-800 hover:from-orange-600 hover:to-orange-700 text-white border-slate-500 hover:border-orange-400 shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-br from-white to-gray-50 hover:from-orange-50 hover:to-orange-100 text-gray-700 hover:text-orange-800 border-gray-300 hover:border-orange-400 shadow-md hover:shadow-lg'
            }`}
            title="Pan Tool (P)"
          >
            <Hand className="h-5 w-5" />
          </Button>
          
          {/* Measurement Tools Group */}
          <div className="flex lg:flex-col gap-1">
            <Button 
              variant={activeTool === 'distance' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('distance')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'distance' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="Distance Measurement (D)"
            >
              <Ruler className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'angle' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('angle')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'angle' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="Angle Measurement (A)"
            >
              <ScanLine className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'rectangle' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('rectangle')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'rectangle' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="Rectangle ROI (R)"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'ellipse' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('ellipse')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'ellipse' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="Elliptical ROI (E)"
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'suv' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('suv')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'suv' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="SUV Measurement (S)"
            >
              <Target className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Annotation Tools */}
          <div className="flex lg:flex-col gap-1">
            <Button 
              variant={activeTool === 'annotation' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('annotation')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'annotation' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-400 shadow-xl'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
              }`}
              title="Text Annotation (T)"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'arrow' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleToolSelect('arrow')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                activeTool === 'arrow' 
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-400 shadow-xl'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
              }`}
              title="Arrow Marker (M)"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleToolSelect('crosshair')}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-emerald-600 hover:to-emerald-700 text-white border-slate-400 hover:border-emerald-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-emerald-50 hover:to-emerald-100 text-gray-700 hover:text-emerald-800 border-gray-300 hover:border-emerald-400 shadow-sm hover:shadow-md'
              }`}
              title="Crosshair Reference"
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          </div>
          <Separator className="my-2" />
          
          {/* Image Manipulation Tools */}
          <div className="flex lg:flex-col gap-1">
            <Button 
              size="sm" 
              onClick={handleRotate}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-blue-600 hover:to-blue-700 text-white border-slate-400 hover:border-blue-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-800 border-gray-300 hover:border-blue-400 shadow-sm hover:shadow-md'
              }`}
              title="Rotate Image (R)"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={() => {}}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={() => {}}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleInvert}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                viewportSettings.invert
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-yellow-600 to-yellow-700 text-white border-yellow-400 shadow-xl'
                    : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-yellow-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-yellow-600 hover:to-yellow-700 text-white border-slate-400 hover:border-yellow-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-yellow-50 hover:to-yellow-100 text-gray-700 hover:text-yellow-800 border-gray-300 hover:border-yellow-400 shadow-sm hover:shadow-md'
              }`}
              title="Invert Image (I)"
            >
              {viewportSettings.invert ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Playback & Export Tools */}
          <div className="flex lg:flex-col gap-1">
            <Button 
              size="sm" 
              onClick={togglePlayback}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                isPlaying
                  ? theme === 'dark'
                    ? 'bg-gradient-to-br from-green-600 to-green-700 text-white border-green-400 shadow-xl'
                    : 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg'
                  : theme === 'dark'
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg'
                    : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
              }`}
              title="Play/Pause Cine (Space)"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button 
              size="sm" 
              onClick={resetViewport}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white border-slate-400 hover:border-red-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-800 border-gray-300 hover:border-red-400 shadow-sm hover:shadow-md'
              }`}
              title="Reset Viewport (Esc)"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              onClick={exportImage}
              className={`aspect-square w-11 h-11 font-medium transition-all duration-200 hover:scale-105 border-2 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-amber-600 hover:to-amber-700 text-white border-slate-400 hover:border-amber-400 shadow-md hover:shadow-lg' 
                  : 'bg-gradient-to-br from-gray-50 to-white hover:from-amber-50 hover:to-amber-100 text-gray-700 hover:text-amber-800 border-gray-300 hover:border-amber-400 shadow-sm hover:shadow-md'
              }`}
              title="Export Image"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* View Mode Tabs */}
          <div className={`flex space-x-1 sm:space-x-2 p-2 overflow-x-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} flex-shrink-0`}>
            <Button 
              size="sm" 
              onClick={() => setViewMode('2d')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                viewMode === '2d'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600/95 to-indigo-600/95 text-white border border-blue-500/50'
                    : 'bg-gradient-to-r from-blue-500/95 to-indigo-500/95 text-white border border-blue-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-blue-600/90 hover:to-indigo-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-blue-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-blue-500/90 hover:to-indigo-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-blue-400/50'
              }`}
            >
              2D
            </Button>
            <Button 
              size="sm" 
              onClick={generateMPR}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                viewMode === 'mpr'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-600/95 to-teal-600/95 text-white border border-emerald-500/50'
                    : 'bg-gradient-to-r from-emerald-500/95 to-teal-500/95 text-white border border-emerald-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-emerald-600/90 hover:to-teal-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-emerald-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-emerald-500/90 hover:to-teal-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-emerald-400/50'
              }`}
            >
              MPR
            </Button>
            <Button 
              size="sm" 
              onClick={reconstruct3D}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                viewMode === '3d'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-purple-600/95 to-pink-600/95 text-white border border-purple-500/50'
                    : 'bg-gradient-to-r from-purple-500/95 to-pink-500/95 text-white border border-purple-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-purple-600/90 hover:to-pink-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-purple-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-purple-500/90 hover:to-pink-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-purple-400/50'
              }`}
            >
              3D
            </Button>
            <Button 
              size="sm" 
              onClick={() => setViewMode('vr')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                viewMode === 'vr'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-orange-600/95 to-red-600/95 text-white border border-orange-500/50'
                    : 'bg-gradient-to-r from-orange-500/95 to-red-500/95 text-white border border-orange-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-orange-600/90 hover:to-red-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-orange-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-orange-500/90 hover:to-red-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-orange-400/50'
              }`}
            >
              VR
            </Button>
            <Button 
              size="sm" 
              onClick={generateMIP}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                viewMode === 'mip'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-cyan-600/95 to-blue-600/95 text-white border border-cyan-500/50'
                    : 'bg-gradient-to-r from-cyan-500/95 to-blue-500/95 text-white border border-cyan-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-cyan-600/90 hover:to-blue-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-cyan-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-cyan-500/90 hover:to-blue-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-cyan-400/50'
              }`}
            >
              MIP
            </Button>
            
            {/* Layout Tools Separator */}
            <div className={`w-px h-8 mx-2 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'}`}></div>
            
            {/* Layout Tools */}
            <Button 
              size="sm" 
              onClick={() => setLayout('1x1')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                layout === '1x1'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-600/95 to-emerald-600/95 text-white border border-green-500/50'
                    : 'bg-gradient-to-r from-green-500/95 to-emerald-500/95 text-white border border-green-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-green-600/90 hover:to-emerald-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-green-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-green-500/90 hover:to-emerald-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-green-400/50'
              }`}
            >
              1×1
            </Button>
            <Button 
              size="sm" 
              onClick={() => setLayout('1x2')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                layout === '1x2'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-600/95 to-emerald-600/95 text-white border border-green-500/50'
                    : 'bg-gradient-to-r from-green-500/95 to-emerald-500/95 text-white border border-green-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-green-600/90 hover:to-emerald-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-green-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-green-500/90 hover:to-emerald-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-green-400/50'
              }`}
            >
              1×2
            </Button>
            <Button 
              size="sm" 
              onClick={() => setLayout('2x1')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                layout === '2x1'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-600/95 to-emerald-600/95 text-white border border-green-500/50'
                    : 'bg-gradient-to-r from-green-500/95 to-emerald-500/95 text-white border border-green-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-green-600/90 hover:to-emerald-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-green-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-green-500/90 hover:to-emerald-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-green-400/50'
              }`}
            >
              2×1
            </Button>
            <Button 
              size="sm" 
              onClick={() => setLayout('2x2')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                layout === '2x2'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-600/95 to-emerald-600/95 text-white border border-green-500/50'
                    : 'bg-gradient-to-r from-green-500/95 to-emerald-500/95 text-white border border-green-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-green-600/90 hover:to-emerald-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-green-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-green-500/90 hover:to-emerald-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-green-400/50'
              }`}
            >
              2×2
            </Button>
            <Button 
              size="sm" 
              onClick={() => setLayout('2x3')}
              className={`flex-shrink-0 font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                layout === '2x3'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-green-600/95 to-emerald-600/95 text-white border border-green-500/50'
                    : 'bg-gradient-to-r from-green-500/95 to-emerald-500/95 text-white border border-green-400/50'
                  : theme === 'dark'
                    ? 'bg-gradient-to-r from-slate-700/80 to-slate-800/80 hover:from-green-600/90 hover:to-emerald-600/90 text-gray-300 hover:text-white border border-slate-600/50 hover:border-green-500/50'
                    : 'bg-gradient-to-r from-gray-100/80 to-gray-200/80 hover:from-green-500/90 hover:to-emerald-500/90 text-gray-700 hover:text-white border border-gray-300/50 hover:border-green-400/50'
              }`}
            >
              2×3
            </Button>
          </div>

          {/* Viewer Container */}
          <div className="flex-1 relative overflow-hidden" ref={viewerRef}>
            {/* Dynamic Layout Container */}
            {viewMode === '2d' && (
              <div className={`w-full h-full ${
                layout === '1x1' ? 'grid grid-cols-1 grid-rows-1' :
                layout === '1x2' ? 'grid grid-cols-1 grid-rows-2' :
                layout === '2x1' ? 'grid grid-cols-2 grid-rows-1' :
                layout === '2x2' ? 'grid grid-cols-2 grid-rows-2' :
                layout === '2x3' ? 'grid grid-cols-2 grid-rows-3' :
                'grid grid-cols-1 grid-rows-1'
              } gap-1`}>
                {/* Primary Viewport */}
                <div 
                  className={`dicom-viewport ${
                    layout === '1x1' ? 'layout-1x1' : 'layout-multi'
                  } ${
                    loading ? 'loading' : ''
                  } ${
                    error ? 'error' : ''
                  } active`}
                >
                  <div 
                    ref={cornerstoneElementRef}
                    className="w-full h-full"
                    style={{ 
                      minHeight: layout === '1x1' ? '400px' : '200px',
                      maxHeight: '100%'
                    }}
                  ></div>
                </div>
                
                {/* Additional Viewports for multi-layout */}
                {layout !== '1x1' && Array.from({ length: 
                  layout === '1x2' ? 1 :
                  layout === '2x1' ? 1 :
                  layout === '2x2' ? 3 :
                  layout === '2x3' ? 5 : 0
                }).map((_, index) => (
                  <div 
                    key={`viewport-${index + 1}`}
                    className="dicom-viewport layout-multi"
                  >
                    <div className={`text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <div className="text-sm font-medium">Viewport {index + 2}</div>
                      <div className="text-xs mt-1">Ready for DICOM</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Multi-Layout Information */}
            {viewMode === '2d' && layout !== '1x1' && (
              <div className={`absolute bottom-0 left-0 right-0 p-3 backdrop-blur-md transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-t from-slate-900/95 to-slate-800/90 border-t border-slate-700/50' 
                  : 'bg-gradient-to-t from-white/95 to-gray-50/90 border-t border-gray-200/50'
              } shadow-lg`}>
                <div className="flex items-center justify-center space-x-4">
                  <div className={`flex items-center space-x-2 ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  }`}>
                    <Grid3X3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Layout: {layout}</span>
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Primary viewport active • Additional viewports ready for DICOM studies
                  </div>
                </div>
              </div>
            )}
            
            {viewMode === 'mpr' && (
              <div className="grid grid-cols-2 gap-2 h-full">
                <div className="bg-black flex items-center justify-center">
                  <div>Axial View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>Coronal View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>Sagittal View</div>
                </div>
                <div className="bg-black flex items-center justify-center">
                  <div>3D View</div>
                </div>
              </div>
            )}
            
            {(viewMode === '3d' || viewMode === 'vr' || viewMode === 'mip') && (
              <div 
                ref={vtkContainerRef}
                className="w-full h-full bg-black"
                style={{ minHeight: '500px' }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">{viewMode.toUpperCase()} Rendering</h3>
                    <p>VTK.js integration temporarily disabled</p>
                    <p className="text-sm text-gray-400 mt-2">3D visualization will be available once VTK.js issues are resolved</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Controls - Only show for single viewport */}
            {viewMode === '2d' && layout === '1x1' && (
              <div className={`absolute bottom-0 left-0 right-0 p-2 sm:p-4 backdrop-blur-md transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'bg-gradient-to-t from-slate-900/95 to-slate-800/90 border-t border-slate-700/50' 
                  : 'bg-gradient-to-t from-white/95 to-gray-50/90 border-t border-gray-200/50'
              } shadow-lg`}>
                <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 mb-2">
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleSliceChange(currentImageIndex - 1)}
                      disabled={currentImageIndex <= 0}
                      className={`text-sm font-semibold px-4 py-2 transition-all duration-200 ${
                        theme === 'dark' 
                          ? 'bg-slate-700/80 hover:bg-slate-600/90 text-white border-slate-500 hover:border-slate-400' 
                          : 'bg-white/90 hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-gray-400'
                      } shadow-md hover:shadow-lg`}
                    >
                      Previous
                    </Button>
                    <div className={`text-sm font-bold px-3 py-2 rounded-md whitespace-nowrap ${
                      theme === 'dark' 
                        ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' 
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      Image {currentImageIndex + 1} / {imageIds.length}
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleSliceChange(currentImageIndex + 1)}
                      disabled={currentImageIndex >= imageIds.length - 1}
                      className={`text-sm font-semibold px-4 py-2 transition-all duration-200 ${
                        theme === 'dark' 
                          ? 'bg-slate-700/80 hover:bg-slate-600/90 text-white border-slate-500 hover:border-slate-400' 
                          : 'bg-white/90 hover:bg-gray-50 text-gray-800 border-gray-300 hover:border-gray-400'
                      } shadow-md hover:shadow-lg`}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="flex flex-col space-y-4 w-full px-2 sm:px-0">
                    {/* Window Level Presets */}
                    <div className="flex flex-col space-y-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                        Window Presets
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <Button 
                          size="sm" 
                          onClick={() => applyWindowLevelPreset('lung')}
                          className={`text-sm font-medium px-4 py-2 transition-all duration-200 border-2 ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-blue-600 hover:to-blue-700 text-white border-slate-400 hover:border-blue-400 shadow-md hover:shadow-lg' 
                              : 'bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-800 border-gray-300 hover:border-blue-400 shadow-sm hover:shadow-md'
                          }`}
                          title="Lung Window (-600/1500)"
                        >
                          Lung
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => applyWindowLevelPreset('bone')}
                          className={`text-sm font-medium px-4 py-2 transition-all duration-200 border-2 ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-green-600 hover:to-green-700 text-white border-slate-400 hover:border-green-400 shadow-md hover:shadow-lg' 
                              : 'bg-gradient-to-br from-gray-50 to-white hover:from-green-50 hover:to-green-100 text-gray-700 hover:text-green-800 border-gray-300 hover:border-green-400 shadow-sm hover:shadow-md'
                          }`}
                          title="Bone Window (300/1500)"
                        >
                          Bone
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => applyWindowLevelPreset('brain')}
                          className={`text-sm font-medium px-4 py-2 transition-all duration-200 border-2 ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-purple-600 hover:to-purple-700 text-white border-slate-400 hover:border-purple-400 shadow-md hover:shadow-lg' 
                              : 'bg-gradient-to-br from-gray-50 to-white hover:from-purple-50 hover:to-purple-100 text-gray-700 hover:text-purple-800 border-gray-300 hover:border-purple-400 shadow-sm hover:shadow-md'
                          }`}
                          title="Brain Window (40/80)"
                        >
                          Brain
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => applyWindowLevelPreset('abdomen')}
                          className={`text-sm font-medium px-4 py-2 transition-all duration-200 border-2 ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-orange-600 hover:to-orange-700 text-white border-slate-400 hover:border-orange-400 shadow-md hover:shadow-lg' 
                              : 'bg-gradient-to-br from-gray-50 to-white hover:from-orange-50 hover:to-orange-100 text-gray-700 hover:text-orange-800 border-gray-300 hover:border-orange-400 shadow-sm hover:shadow-md'
                          }`}
                          title="Abdomen Window (50/350)"
                        >
                          Abdomen
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={resetWindowLevel}
                          className={`text-sm font-medium px-4 py-2 transition-all duration-200 border-2 ${
                            theme === 'dark' 
                              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-red-600 hover:to-red-700 text-white border-slate-400 hover:border-red-400 shadow-md hover:shadow-lg' 
                              : 'bg-gradient-to-br from-gray-50 to-white hover:from-red-50 hover:to-red-100 text-gray-700 hover:text-red-800 border-gray-300 hover:border-red-400 shadow-sm hover:shadow-md'
                          }`}
                          title="Reset to Default"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    
                    {/* Manual Window Level Controls */}
                    <div className="flex flex-col space-y-3">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide px-1">
                        Manual Adjustment
                      </div>
                      <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-8 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Width</label>
                            <span className="text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">
                              {viewportSettings.windowWidth}
                            </span>
                          </div>
                          <Slider 
                            value={[viewportSettings.windowWidth]} 
                            min={1} 
                            max={2000} 
                            step={1}
                            onValueChange={(value) => handleWindowLevelChange('width', value[0])}
                            className="w-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Center</label>
                            <span className="text-sm font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">
                              {viewportSettings.windowCenter}
                            </span>
                          </div>
                          <Slider 
                            value={[viewportSettings.windowCenter]} 
                            min={-1000} 
                            max={1000} 
                            step={1}
                            onValueChange={(value) => handleWindowLevelChange('center', value[0])}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <Button
          size="sm"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className={`fixed top-20 right-2 z-50 font-medium transition-all duration-200 hover:scale-105 border-2 ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-blue-600 hover:to-blue-700 text-white border-slate-400 hover:border-blue-400 shadow-lg hover:shadow-xl' 
              : 'bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-800 border-gray-300 hover:border-blue-400 shadow-lg hover:shadow-xl'
          }`}
          title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>

        {/* Right Panel - AI Report & Measurements */}
        {sidebarVisible && (
          <div 
            className={`relative overflow-y-auto flex-shrink-0 transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-gradient-to-b from-slate-800/95 to-slate-900/95 border-l border-slate-700/50' 
                : 'bg-gradient-to-b from-gray-50/95 to-white/95 border-l border-gray-200/50'
            } backdrop-blur-sm shadow-xl`}
            style={{ width: `${sidebarWidth}px` }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('resize-handle')) {
                setIsResizing(true);
              }
            }}
          >
            {/* Resize Handle */}
            <div 
              className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize resize-handle transition-all duration-200 ${
                theme === 'dark' 
                  ? 'bg-slate-600/50 hover:bg-blue-500/80 hover:shadow-lg' 
                  : 'bg-gray-300/50 hover:bg-blue-400/80 hover:shadow-lg'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            >
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <GripVertical className={`h-4 w-4 transition-colors ${
                  theme === 'dark' ? 'text-slate-400 hover:text-blue-300' : 'text-gray-500 hover:text-blue-600'
                }`} />
              </div>
            </div>
            
            <div className="p-2 sm:p-4 pl-6">
          {/* AI Report */}
          <Card className={`mb-4 transition-all duration-200 shadow-lg hover:shadow-xl ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-700/90 to-slate-800/90 text-gray-100 border-slate-600/50' 
              : 'bg-gradient-to-br from-white/95 to-gray-50/95 text-gray-800 border-gray-200/60'
          } backdrop-blur-sm`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-500" />
                  <span className="text-lg font-bold">AI Analysis</span>
                </div>
                <Button 
                  size="sm" 
                  onClick={generateAIReport}
                  disabled={aiReportLoading}
                  className={`transition-all duration-200 font-medium border-2 ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-blue-600 hover:to-blue-700 text-white border-slate-400 hover:border-blue-400 shadow-md hover:shadow-lg' 
                      : 'bg-gradient-to-br from-gray-50 to-white hover:from-blue-50 hover:to-blue-100 text-gray-700 hover:text-blue-800 border-gray-300 hover:border-blue-400 shadow-sm hover:shadow-md'
                  }`}
                >
                  {aiReportLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </div>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {study?.ai_report ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                    <Badge className={`font-semibold border-2 ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-400 shadow-md' 
                        : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300 shadow-sm'
                    }`}>
                      {study.ai_report.analysis_type || 'General Analysis'}
                    </Badge>
                    <div className={`text-sm font-bold flex items-center gap-2 ${
                      theme === 'dark' ? 'text-green-300' : 'text-green-700'
                    }`}>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Confidence: {(study.ai_report.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-blue-900/20 border-blue-700' 
                      : 'bg-blue-50/80 border-blue-200'
                  }`}>
                    <h4 className={`font-bold text-base mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Findings:
                    </h4>
                    <ul className="space-y-2">
                      {study.ai_report.findings?.map((finding, i) => (
                        <li key={i} className={`text-sm leading-relaxed flex items-start gap-2 ${
                          theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                        }`}>
                          <span className="text-blue-500 font-bold mt-1">•</span>
                          <span>{finding}</span>
                        </li>
                      )) || (
                        <li className={`text-sm italic flex items-start gap-2 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          <span className="text-gray-400 font-bold mt-1">•</span>
                          <span>No findings available</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${
                    theme === 'dark' 
                      ? 'bg-blue-900/20 border-blue-700' 
                      : 'bg-blue-50/80 border-blue-200'
                  }`}>
                    <h4 className={`font-bold text-base mb-3 flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Impression:
                    </h4>
                    <p className={`text-sm leading-relaxed ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                    }`}>
                      {study.ai_report.impression}
                    </p>
                  </div>
                  
                  {study.ai_report.pathology_scores && Object.keys(study.ai_report.pathology_scores).length > 0 && (
                    <div className={`p-4 rounded-lg border ${
                      theme === 'dark' 
                        ? 'bg-blue-900/20 border-blue-700' 
                        : 'bg-blue-50/80 border-blue-200'
                    }`}>
                      <h4 className={`font-bold text-base mb-3 flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Pathology Scores:
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(study.ai_report.pathology_scores).map(([key, value]) => (
                          <div key={key} className={`flex justify-between items-center p-2 rounded border ${
                            theme === 'dark' 
                              ? 'bg-slate-600/30 border-slate-500/50' 
                              : 'bg-white/60 border-gray-200/80'
                          }`}>
                            <span className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-slate-200' : 'text-gray-700'
                            }`}>{key}:</span>
                            <span className={`text-sm font-bold ${
                              theme === 'dark' ? 'text-orange-300' : 'text-orange-600'
                            }`}>
                              {(typeof value === 'number' ? (value * 100).toFixed(1) : 'N/A')}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className={`w-12 h-12 mx-auto mb-3 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    No AI analysis available.
                  </p>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    Click "Generate" to analyze this study.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Measurements */}
          <Card className={`mb-4 transition-all duration-200 shadow-lg hover:shadow-xl ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-700/90 to-slate-800/90 text-gray-100 border-slate-600/50' 
              : 'bg-gradient-to-br from-white/95 to-gray-50/95 text-gray-800 border-gray-200/60'
          } backdrop-blur-sm`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-green-500" />
                <span className="text-lg font-bold">Measurements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {measurementsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
                    }`}>Processing measurements...</p>
                  </div>
                </div>
              ) : persistedMeasurements.length > 0 ? (
                <div className="space-y-3">
                  {persistedMeasurements.map((measurement) => (
                    <div key={measurement.id} className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      theme === 'dark' 
                        ? 'bg-blue-900/30 border-blue-700 hover:bg-blue-900/50' 
                        : 'bg-blue-50/80 border-blue-200 hover:bg-blue-100/90'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className={`font-semibold text-sm flex items-center gap-2 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)}
                          </div>
                          <div className={`text-sm font-medium mt-1 ${
                            theme === 'dark' ? 'text-green-300' : 'text-green-600'
                          }`}>
                            {measurement.value.toFixed(2)} {measurement.unit}
                          </div>
                          {measurement.label && (
                            <div className={`text-xs mt-1 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                            }`}>
                              {measurement.label}
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteMeasurement(measurement.id)}
                          className={`transition-all duration-200 ${
                            theme === 'dark' 
                              ? 'hover:bg-red-600/20 hover:text-red-300 text-slate-400' 
                              : 'hover:bg-red-50 hover:text-red-600 text-gray-500'
                          }`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Ruler className={`w-12 h-12 mx-auto mb-3 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    No measurements yet.
                  </p>
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    Use the measurement tools to add some.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Advanced Tools */}
          <Card className={`transition-all duration-200 shadow-lg hover:shadow-xl ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-700/90 to-slate-800/90 text-gray-100 border-slate-600/50' 
              : 'bg-gradient-to-br from-white/95 to-gray-50/95 text-gray-800 border-gray-200/60'
          } backdrop-blur-sm`}>
            <CardHeader>
              <CardTitle>Advanced Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className={`w-full justify-start font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:from-purple-500/95 hover:to-indigo-500/95 text-white border border-purple-500/30 hover:border-purple-400/50'
                      : 'bg-gradient-to-r from-purple-500/90 to-indigo-500/90 hover:from-purple-600/95 hover:to-indigo-600/95 text-white border border-purple-400/30 hover:border-purple-300/50'
                  }`}
                  onClick={exportCineLoop}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Cine Loop
                </Button>
                <Button 
                  size="sm" 
                  className={`w-full justify-start font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500/95 hover:to-teal-500/95 text-white border border-emerald-500/30 hover:border-emerald-400/50'
                      : 'bg-gradient-to-r from-emerald-500/90 to-teal-500/90 hover:from-emerald-600/95 hover:to-teal-600/95 text-white border border-emerald-400/30 hover:border-emerald-300/50'
                  }`}
                  onClick={export3DModel}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Export 3D Model
                </Button>
                <Button 
                  size="sm" 
                  className={`w-full justify-start font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500/95 hover:to-blue-500/95 text-white border border-cyan-500/30 hover:border-cyan-400/50'
                      : 'bg-gradient-to-r from-cyan-500/90 to-blue-500/90 hover:from-cyan-600/95 hover:to-blue-600/95 text-white border border-cyan-400/30 hover:border-cyan-300/50'
                  }`}
                  onClick={toggleSeriesSynchronization}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {seriesSynchronization ? 'Disable' : 'Enable'} Series Sync
                </Button>
                <Button 
                  size="sm" 
                  className={`w-full justify-start font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-orange-600/90 to-red-600/90 hover:from-orange-500/95 hover:to-red-500/95 text-white border border-orange-500/30 hover:border-orange-400/50'
                      : 'bg-gradient-to-r from-orange-500/90 to-red-500/90 hover:from-orange-600/95 hover:to-red-600/95 text-white border border-orange-400/30 hover:border-orange-300/50'
                  }`}
                  onClick={() => applyHangingProtocol('chest')}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Apply Hanging Protocol
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
        )}
      </div>
      
      {/* DICOM Networking Panel */}
      {showDICOMNetworking && (
        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300`}>
          <div className={`w-full max-w-4xl rounded-xl shadow-2xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/50' 
              : 'bg-gradient-to-br from-white/95 to-gray-50/95 border border-gray-200/60'
          } backdrop-blur-md`}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">DICOM Networking</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDICOMNetworking(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <DICOMNetworkPanel />
              <DICOMProtocolTester />
            </div>
          </div>
        </div>
        )}
    </div>
  );
}
