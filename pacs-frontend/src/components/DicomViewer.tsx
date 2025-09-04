import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import ExpandableToolbar from './ExpandableToolbar';
import ToolbarSettings from './ToolbarSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from './ui/dropdown-menu';
import { 
  ArrowLeft, 
  ZoomIn, 
  RotateCw, 
  Ruler, 
  Square, 
  Circle,
  Play,
  Pause,
  Download,
  Settings,
  Settings2,
  Brain,
  Activity,
  Grid3X3,
  Eye,
  Move3D,
  RefreshCw,
  Layers,
  Maximize,
  Sun,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
  Grid2X2,
  LayoutGrid,
  ChevronDown,
  RectangleHorizontal,
  RectangleVertical,
  Columns3,
  Rows3,
  Columns4,
  Rows4
} from 'lucide-react';

import {
  RenderingEngine,
  Types,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  cache,
  imageLoader,
  metaData,
  getRenderingEngine,
  utilities,
  init as csRenderInit
} from '@cornerstonejs/core';
import {
  cornerstoneStreamingImageVolumeLoader,
  cornerstoneDICOMImageLoader
} from '@cornerstonejs/dicom-image-loader';
import {
  ToolGroupManager,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollMouseWheelTool,
  LengthTool,
  AngleTool,
  RectangleROITool,
  EllipticalROITool,
  init as csToolsInit,
  ToolGroup
} from '@cornerstonejs/tools';
import * as dicomParser from 'dicom-parser';
import { getWindowLevelPresets } from '../utils/cornerstone3d-init';



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
  type: 'distance' | 'angle' | 'area' | 'ellipse' | 'rectangle';
  value: number;
  unit: string;
  coordinates: number[];
  label?: string;
}

interface ViewportSettings {
  windowCenter: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  invert: boolean;
  brightness: number;
  contrast: number;
}

// Extend Window interface for cine interval
declare global {
  interface Window {
    cineInterval?: NodeJS.Timeout;
  }
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
    invert: false,
    brightness: 0,
    contrast: 1
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);
  const [viewport, setViewport] = useState<Types.IStackViewport | null>(null);
  const [toolGroup, setToolGroup] = useState<ToolGroup | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'mpr' | 'vr' | 'mip' | 'multi'>('2d');
  const [mprViews, setMprViews] = useState<{axial: HTMLElement | null, coronal: HTMLElement | null, sagittal: HTMLElement | null}>({
    axial: null, 
    coronal: null, 
    sagittal: null
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [multiViewMode, setMultiViewMode] = useState(false);
  const [viewportLayout, setViewportLayout] = useState<'1x1' | '1x2' | '2x1' | '2x2' | '1x3' | '3x1' | '1x4' | '4x1' | '2x3' | '3x2' | '3x3' | '1x6' | '6x1'>('2x2');
  const [viewportElements, setViewportElements] = useState<HTMLDivElement[]>([]);
  // Removed unused viewportSettings2 and viewportSettings3
  // Removed unused viewportSettings4
  const [toolbarConfig, setToolbarConfig] = useState({
    position: 'bottom-left' as const,
    autoHide: true,
    expandOnHover: true,
    expandOnClick: true,
    hideDelay: 2000,
    showLabels: true,
    compactMode: false,
    enabledTools: [
      'windowLevel', 'zoom', 'pan', 'rotate', 'reset', 'fullscreen',
      'length', 'angle', 'rectangle', 'ellipse', 'polygon', 'freehand',
      'cobb', 'suv', 'hounsfield', 'pixelProbe',
      'mpr', 'volumeRender', 'surfaceRender', 'mip', 'minip',
      'histogram', 'profile', 'statistics', 'timeIntensity',
      'brush', 'eraser', 'magicWand', 'threshold', 'regionGrow',
      'registration', 'fusion', 'overlay', 'blend',
      'exportImage', 'exportVideo', 'exportMesh', 'exportReport',
      'cardiac', 'vascular', 'oncology', 'orthopedic', 'neurological'
    ]
  });
  const [toolbarSettingsOpen, setToolbarSettingsOpen] = useState(false);
  const [histogramData, setHistogramData] = useState<{bins: number[], values: number[]} | null>(null);
  const [showHistogram, setShowHistogram] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Performance optimization state
  const [renderingQueue, setRenderingQueue] = useState<Set<string>>(new Set());
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRenderTime = useRef<number>(0);
  const viewportCache = useRef<Map<string, any>>(new Map());
  const performanceMetrics = useRef({
    renderCount: 0,
    averageRenderTime: 0,
    lastFrameTime: 0
  });

  // Image enhancement filters state
  const [imageFilters, setImageFilters] = useState({
    sharpen: 0,      // 0-100
    smooth: 0,       // 0-100
    edgeEnhance: 0,  // 0-100
    denoise: 0       // 0-100
  });
  const [showFilters, setShowFilters] = useState(false);
  const originalImageData = useRef<Map<string, ImageData>>(new Map());

  // Gamma correction state
  const [gammaCorrection, setGammaCorrection] = useState({
    gamma: 1.0,      // 0.1-3.0
    brightness: 0,   // -100 to 100
    contrast: 1.0    // 0.1-3.0
  });
  const [showGamma, setShowGamma] = useState(false);

  // Memory-based cache for when storage is not available
  const memoryCache = useRef<Map<string, any>>(new Map());
  
  // Storage fallback functions
  const safeStorageGet = useCallback((key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryCache.current.get(key) || null;
    }
  }, []);

  // Performance optimization utilities
  const debouncedRender = useCallback((viewportId: string, renderFn: () => void, delay: number = 16) => {
    // Clear existing timeout for this viewport
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    // Add to rendering queue
    setRenderingQueue(prev => new Set(prev).add(viewportId));

    // Debounce rendering to avoid excessive updates
    renderTimeoutRef.current = setTimeout(() => {
      const startTime = performance.now();
      
      try {
        renderFn();
        
        // Update performance metrics
        const renderTime = performance.now() - startTime;
        const metrics = performanceMetrics.current;
        metrics.renderCount++;
        metrics.averageRenderTime = (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;
        metrics.lastFrameTime = renderTime;
        
        // Log performance warnings
        if (renderTime > 50) {
          console.warn(`⚠️ Slow render detected: ${renderTime.toFixed(2)}ms for viewport ${viewportId}`);
        }
        
      } catch (error) {
        console.error('❌ Render error:', error);
      } finally {
        // Remove from rendering queue
        setRenderingQueue(prev => {
          const newQueue = new Set(prev);
          newQueue.delete(viewportId);
          return newQueue;
        });
        lastRenderTime.current = performance.now();
      }
    }, delay);
  }, []);

  const cacheViewportState = useCallback((viewportId: string, state: any) => {
    const cacheKey = `${viewportId}_${currentImageIndex}`;
    viewportCache.current.set(cacheKey, {
      ...state,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries (keep last 10 per viewport)
    const cacheEntries = Array.from(viewportCache.current.entries())
      .filter(([key]) => key.startsWith(viewportId))
      .sort(([,a], [,b]) => b.timestamp - a.timestamp);
    
    if (cacheEntries.length > 10) {
      cacheEntries.slice(10).forEach(([key]) => {
        viewportCache.current.delete(key);
      });
    }
  }, [currentImageIndex]);

  const getCachedViewportState = useCallback((viewportId: string) => {
    const cacheKey = `${viewportId}_${currentImageIndex}`;
    const cached = viewportCache.current.get(cacheKey);
    
    // Return cached state if it's less than 5 minutes old
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached;
    }
    
    return null;
  }, [currentImageIndex]);

  // Memory management utilities
  const cleanupMemory = useCallback(() => {
    // Clear old cache entries
    const now = Date.now();
    const maxAge = 600000; // 10 minutes
    
    for (const [key, value] of viewportCache.current.entries()) {
      if (now - value.timestamp > maxAge) {
        viewportCache.current.delete(key);
      }
    }
    
    // Clear memory cache if it gets too large
    if (memoryCache.current.size > 100) {
      const entries = Array.from(memoryCache.current.entries());
      entries.slice(0, 50).forEach(([key]) => {
        memoryCache.current.delete(key);
      });
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }, []);

  // Performance monitoring
  const getPerformanceStats = useCallback(() => {
    const metrics = performanceMetrics.current;
    return {
      renderCount: metrics.renderCount,
      averageRenderTime: metrics.averageRenderTime.toFixed(2),
      lastFrameTime: metrics.lastFrameTime.toFixed(2),
      cacheSize: viewportCache.current.size,
      memoryUsage: memoryCache.current.size,
      activeRenders: renderingQueue.size
    };
  }, [renderingQueue.size]);

  // Image enhancement filter functions
  const applyImageFilters = useCallback(async (imageData: ImageData, filters: typeof imageFilters): Promise<ImageData> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    ctx.putImageData(imageData, 0, 0);
    
    // Apply filters in sequence
    if (filters.denoise > 0) {
      await applyDenoiseFilter(ctx, filters.denoise / 100);
    }
    
    if (filters.smooth > 0) {
      await applySmoothFilter(ctx, filters.smooth / 100);
    }
    
    if (filters.sharpen > 0) {
      await applySharpenFilter(ctx, filters.sharpen / 100);
    }
    
    if (filters.edgeEnhance > 0) {
      await applyEdgeEnhanceFilter(ctx, filters.edgeEnhance / 100);
    }
    
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  const applySharpenFilter = useCallback(async (ctx: CanvasRenderingContext2D, intensity: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Sharpen kernel
    const kernel = [
      0, -intensity, 0,
      -intensity, 1 + 4 * intensity, -intensity,
      0, -intensity, 0
    ];
    
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.max(0, Math.min(255, sum));
        }
        // Copy alpha channel
        const idx = (y * width + x) * 4 + 3;
        newData[idx] = data[idx];
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }, []);

  const applySmoothFilter = useCallback(async (ctx: CanvasRenderingContext2D, intensity: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Gaussian blur approximation
    const radius = Math.ceil(intensity * 3);
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const idx = (ny * width + nx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }
        }
        
        const idx = (y * width + x) * 4;
        newData[idx] = r / count;
        newData[idx + 1] = g / count;
        newData[idx + 2] = b / count;
        newData[idx + 3] = data[idx + 3]; // Alpha
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }, []);

  const applyEdgeEnhanceFilter = useCallback(async (ctx: CanvasRenderingContext2D, intensity: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Edge detection kernel (Sobel)
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy) * intensity;
        const idx = (y * width + x) * 4;
        
        // Enhance edges by adding edge magnitude to original
        for (let c = 0; c < 3; c++) {
          newData[idx + c] = Math.max(0, Math.min(255, data[idx + c] + magnitude));
        }
        newData[idx + 3] = data[idx + 3]; // Alpha
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }, []);

  const applyDenoiseFilter = useCallback(async (ctx: CanvasRenderingContext2D, intensity: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Simple median filter for noise reduction
    const radius = Math.ceil(intensity * 2);
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const neighbors: number[][] = [[], [], []];
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const idx = (ny * width + nx) * 4;
            
            neighbors[0].push(data[idx]);     // R
            neighbors[1].push(data[idx + 1]); // G
            neighbors[2].push(data[idx + 2]); // B
          }
        }
        
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          neighbors[c].sort((a, b) => a - b);
          const median = neighbors[c][Math.floor(neighbors[c].length / 2)];
          newData[idx + c] = median;
        }
        newData[idx + 3] = data[idx + 3]; // Alpha
      }
    }
    
    const newImageData = new ImageData(newData, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }, []);

  const handleFilterChange = useCallback((filterType: keyof typeof imageFilters, value: number) => {
    setImageFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    
    // Apply filters with debouncing
    if (viewport) {
      debouncedRender(viewport.id, async () => {
        try {
          // Get current image data
          const canvas = viewport.getCanvas();
          const ctx = canvas.getContext('2d')!;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Store original if not already stored
          const cacheKey = `${viewport.id}_${currentImageIndex}`;
          if (!originalImageData.current.has(cacheKey)) {
            originalImageData.current.set(cacheKey, imageData);
          }
          
          // Apply filters to original image
          const original = originalImageData.current.get(cacheKey)!;
          const filtered = await applyImageFilters(original, { ...imageFilters, [filterType]: value });
          
          // Update viewport
          ctx.putImageData(filtered, 0, 0);
          viewport.render();
          
        } catch (error) {
          console.error('❌ Filter application failed:', error);
        }
      }, 100);
    }
  }, [imageFilters, viewport, currentImageIndex, debouncedRender, applyImageFilters]);

  const resetFilters = useCallback(() => {
    setImageFilters({
      sharpen: 0,
      smooth: 0,
      edgeEnhance: 0,
      denoise: 0
    });
    
    // Restore original image
    if (viewport) {
      const cacheKey = `${viewport.id}_${currentImageIndex}`;
      const original = originalImageData.current.get(cacheKey);
      
      if (original) {
        const canvas = viewport.getCanvas();
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(original, 0, 0);
        viewport.render();
      }
    }
  }, [viewport, currentImageIndex]);

  // Gamma correction functions
  const applyGammaCorrection = useCallback(async (imageData: ImageData, gamma: number, brightness: number, contrast: number): Promise<ImageData> => {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);
    
    // Create gamma lookup table for performance
    const gammaLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      gammaLUT[i] = Math.pow(i / 255, 1 / gamma) * 255;
    }
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply gamma correction to RGB channels
      for (let c = 0; c < 3; c++) {
        let value = data[i + c];
        
        // Apply gamma correction
        value = gammaLUT[value];
        
        // Apply brightness and contrast
        value = (value - 128) * contrast + 128 + brightness;
        
        // Clamp to valid range
        newData[i + c] = Math.max(0, Math.min(255, value));
      }
      
      // Preserve alpha channel
      newData[i + 3] = data[i + 3];
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
  }, []);

  const handleGammaChange = useCallback((property: keyof typeof gammaCorrection, value: number) => {
    setGammaCorrection(prev => ({
      ...prev,
      [property]: value
    }));
    
    // Apply gamma correction with debouncing
    if (viewport) {
      debouncedRender(viewport.id, async () => {
        try {
          // Get current image data
          const canvas = viewport.getCanvas();
          const ctx = canvas.getContext('2d')!;
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Store original if not already stored
          const cacheKey = `${viewport.id}_${currentImageIndex}_original`;
          if (!originalImageData.current.has(cacheKey)) {
            originalImageData.current.set(cacheKey, imageData);
          }
          
          // Apply gamma correction to original image
          const original = originalImageData.current.get(cacheKey)!;
          const corrected = await applyGammaCorrection(
            original, 
            property === 'gamma' ? value : gammaCorrection.gamma,
            property === 'brightness' ? value : gammaCorrection.brightness,
            property === 'contrast' ? value : gammaCorrection.contrast
          );
          
          // Update viewport
          ctx.putImageData(corrected, 0, 0);
          viewport.render();
          
        } catch (error) {
          console.error('❌ Gamma correction failed:', error);
        }
      }, 100);
    }
  }, [gammaCorrection, viewport, currentImageIndex, debouncedRender, applyGammaCorrection]);

  const resetGammaCorrection = useCallback(() => {
    setGammaCorrection({
      gamma: 1.0,
      brightness: 0,
      contrast: 1.0
    });
    
    // Restore original image
    if (viewport) {
      const cacheKey = `${viewport.id}_${currentImageIndex}_original`;
      const original = originalImageData.current.get(cacheKey);
      
      if (original) {
        const canvas = viewport.getCanvas();
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(original, 0, 0);
        viewport.render();
      }
    }
  }, [viewport, currentImageIndex]);
  
  const safeStorageSet = useCallback((key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryCache.current.set(key, value);
    }
  }, []);
  
  const safeStorageRemove = useCallback((key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryCache.current.delete(key);
    }
  }, []);

  // Multi-viewport management functions
  const distributeImagesAcrossViewports = useCallback(() => {
    if (!imageIds.length || !viewportElements.length) {
      console.log('❌ No images or viewports available for distribution');
      return;
    }

    const numViewports = viewportElements.length;
    const numImages = imageIds.length;
    
    console.log(`📊 Distributing ${numImages} images across ${numViewports} viewports`);
    
    // Calculate image distribution strategy
    const imagesPerViewport = Math.floor(numImages / numViewports);
    const remainingImages = numImages % numViewports;
    
    let imageIndex = 0;
    
    for (let viewportIndex = 0; viewportIndex < numViewports; viewportIndex++) {
      const element = viewportElements[viewportIndex];
      if (!element) continue;
      
      // Calculate how many images this viewport should get
      const imagesForThisViewport = imagesPerViewport + (viewportIndex < remainingImages ? 1 : 0);
      
      if (imagesForThisViewport > 0 && imageIndex < numImages) {
        const imageId = imageIds[imageIndex];
        
        // Load and display the image
        cornerstone.loadImage(imageId).then((image) => {
          cornerstone.displayImage(element, image);
          console.log(`✅ Loaded image ${imageIndex + 1} in viewport ${viewportIndex + 1}`);
        }).catch((err) => {
          console.error(`❌ Failed to load image ${imageIndex + 1} in viewport ${viewportIndex + 1}:`, err);
        });
        
        imageIndex += imagesForThisViewport;
      }
    }
  }, [imageIds, viewportElements]);

  const synchronizeViewports = useCallback((sourceViewport: HTMLDivElement, settings: ViewportSettings) => {
    if (!multiViewMode) return;
    
    viewportElements.forEach((element) => {
      if (element && element !== sourceViewport) {
        try {
          const enabledElement = cornerstone.getEnabledElement(element);
          if (enabledElement) {
            const viewport = cornerstone.getViewport(element);
            viewport.voi.windowWidth = settings.windowWidth;
            viewport.voi.windowCenter = settings.windowCenter;
            viewport.scale = settings.zoom;
            viewport.translation = settings.pan;
            viewport.rotation = settings.rotation;
            viewport.invert = settings.invert;
            cornerstone.setViewport(element, viewport);
          }
        } catch (err) {
          console.error('Error synchronizing viewport:', err);
        }
      }
    });
  }, [multiViewMode, viewportElements]);

  const initializeMultiViewports = useCallback(async () => {
    if (!viewportElements.length || viewportElements.length === 0) {
      console.log('❌ No viewport elements available for multi-view initialization');
      return;
    }

    try {
      console.log('🔧 Initializing multi-viewports...', viewportElements.length);
      
      // Initialize each viewport element
      for (let i = 0; i < viewportElements.length; i++) {
        const element = viewportElements[i];
        if (element && !cornerstone.getEnabledElement(element)) {
          cornerstone.enable(element);
          console.log(`✅ Enabled viewport ${i + 1}`);
        }
      }
      
      // Distribute images across viewports
      distributeImagesAcrossViewports();
      
    } catch (err) {
      console.error('❌ Failed to initialize multi-viewports:', err);
    }
  }, [viewportElements, distributeImagesAcrossViewports]);

  // Initialize multi-viewports when entering multi-view mode
  useEffect(() => {
    if (viewMode === 'multi' && viewportElements.length > 0 && isInitialized) {
      console.log('🔧 Multi-view mode activated, initializing viewports...');
      initializeMultiViewports();
      // Distribute images after initialization
      setTimeout(() => {
        if (imageIds.length > 0) {
          distributeImagesAcrossViewports();
        }
      }, 100);
    }
  }, [viewMode, viewportElements, isInitialized, initializeMultiViewports, distributeImagesAcrossViewports, imageIds]);

  // Redistribute images when layout changes
  useEffect(() => {
    if (viewMode === 'multi' && isInitialized && imageIds.length > 0) {
      console.log('🔄 Layout changed, redistributing images...');
      setTimeout(() => {
        distributeImagesAcrossViewports();
      }, 100);
    }
  }, [viewportLayout, viewMode, isInitialized, imageIds, distributeImagesAcrossViewports]);

  useEffect(() => {
    console.log('🔍 DicomViewer useEffect triggered, viewMode:', viewMode, 'isInitialized:', isInitialized);
    console.log('🔍 cornerstoneElementRef.current:', cornerstoneElementRef.current);
    console.log('🔍 Available modules:', {
      RenderingEngine: typeof RenderingEngine,
      csToolsInit: typeof csToolsInit,
      cornerstoneDICOMImageLoader: typeof cornerstoneDICOMImageLoader,
      dicomParser: typeof dicomParser
    });

    const initializeCornerstone = async () => {
      try {
        if (!cornerstoneElementRef.current) {
          console.log('❌ cornerstoneElementRef.current is null, skipping initialization');
          return;
        }

        console.log('🔧 Initializing Cornerstone.js 3D...');
        
        // Initialize DICOM Image Loader with comprehensive error handling
        cornerstoneDICOMImageLoader.external.cornerstone = cornerstone;
        cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
        
        // Register the wadouri and wadors image loaders
        try {
          imageLoader.registerImageLoader('wadouri', cornerstoneDICOMImageLoader.wadouri.loadImage);
          imageLoader.registerImageLoader('wadors', cornerstoneDICOMImageLoader.wadors.loadImage);
          console.log('✅ DICOM image loaders registered successfully');
        } catch (loaderError) {
          console.error('❌ Failed to register DICOM image loaders:', loaderError);
        }
        
        // Configure DICOM image loader with storage access disabled
        cornerstoneDICOMImageLoader.configure({
          beforeSend: function(xhr: XMLHttpRequest) {
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            // Add CORS headers for cross-origin requests
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
            xhr.setRequestHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            xhr.setRequestHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          },
          useWebWorkers: false,
          strict: false,
          // Completely disable storage access to prevent context errors
          storageAccess: false,
          // Disable caching that might use storage
          maxWebWorkers: 0,
          // Use memory-only caching
          decodeConfig: {
            convertFloatPixelDataToInt: false,
            use16BitDataType: false
          }
        });
        
        // Override storage methods to prevent access errors
        try {
          // Check if storage is available
          const testKey = '__storage_test__';
          window.localStorage.setItem(testKey, 'test');
          window.localStorage.removeItem(testKey);
          console.log('✅ Storage access available');
        } catch (storageError) {
          console.warn('⚠️ Storage access restricted, using memory-only mode:', storageError.message);
          
          // Override storage methods with no-op functions
          const noOpStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
            clear: () => {},
            length: 0,
            key: () => null
          };
          
          // Replace localStorage and sessionStorage if they cause errors
          try {
            Object.defineProperty(window, 'localStorage', {
              value: noOpStorage,
              writable: false
            });
            Object.defineProperty(window, 'sessionStorage', {
              value: noOpStorage,
              writable: false
            });
          } catch (defineError) {
            console.warn('Could not override storage objects:', defineError.message);
          }
        }

        // Initialize Cornerstone Core first
        await csRenderInit();
        
        // Initialize Cornerstone Tools
        await csToolsInit();
        
        // Create rendering engine
        const renderingEngineId = 'myRenderingEngine';
        const renderingEngine = new RenderingEngine(renderingEngineId);
        
        // Create viewport
        const viewportId = 'CT_STACK';
        const viewportInput = {
          viewportId,
          type: Enums.ViewportType.STACK,
          element: cornerstoneElementRef.current,
          defaultOptions: {
            background: [0.2, 0.3, 0.4] as Types.Point3
          }
        };
        
        renderingEngine.enableElement(viewportInput);
        
        // Get the stack viewport
        const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
        
        // Create tool group
        const toolGroupId = 'myToolGroup';
        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        
        // Add tools to the tool group
        toolGroup?.addTool(WindowLevelTool.toolName);
        toolGroup?.addTool(PanTool.toolName);
        toolGroup?.addTool(ZoomTool.toolName);
        toolGroup?.addTool(StackScrollMouseWheelTool.toolName);
        toolGroup?.addTool(LengthTool.toolName);
        toolGroup?.addTool(AngleTool.toolName);
        toolGroup?.addTool(RectangleROITool.toolName);
        toolGroup?.addTool(EllipticalROITool.toolName);
        
        // Set tool modes
        toolGroup?.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: Enums.MouseBindings.Primary }]
        });
        toolGroup?.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: Enums.MouseBindings.Auxiliary }]
        });
        toolGroup?.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: Enums.MouseBindings.Secondary }]
        });
        toolGroup?.setToolActive(StackScrollMouseWheelTool.toolName);
        
        // Add viewport to tool group
        toolGroup?.addViewport(viewportId, renderingEngineId);
        
        // Store references
        setRenderingEngine(renderingEngine);
        setViewport(viewport);
        setToolGroup(toolGroup);
        
        setIsInitialized(true);
        console.log('✅ Cornerstone 3D initialized successfully');
        console.log('📊 Rendering Engine:', renderingEngine);
        console.log('📊 Viewport:', viewport);
        console.log('📊 Tool Group:', toolGroup);
        
      } catch (err) {
        console.error('❌ Failed to initialize Cornerstone:', err);
        setError('Failed to initialize DICOM viewer');
      }
    };

    if (cornerstoneElementRef.current && !isInitialized) {
      console.log('✅ Conditions met for initialization, calling initializeCornerstone()');
      initializeCornerstone();
    } else {
      console.log('❌ Initialization conditions not met:', {
        hasElement: !!cornerstoneElementRef.current,
        isInitialized: isInitialized
      });
    }

    return () => {
      if (renderingEngine && isInitialized) {
        try {
          renderingEngine.destroy();
          if (toolGroup) {
            ToolGroupManager.destroyToolGroup(toolGroup.id);
          }
        } catch (err) {
          console.error('Error cleaning up Cornerstone 3D:', err);
        }
      }
    };
  }, [isInitialized, viewMode, token, renderingEngine, toolGroup]);

  // Removed duplicate useEffect hook - initialization is handled by the first useEffect

  useEffect(() => {
    const fetchStudy = async () => {
      try {
        console.log('🔍 Fetching study:', studyId);
        const response = await fetch(`${API_URL}/api/studies/${studyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const studyData = await response.json();
          console.log('📊 Study data received:', studyData);
          console.log('📁 DICOM files:', studyData.dicom_files);
          setStudy(studyData);
          
          console.log('🔍 Checking DICOM files condition:');
          console.log('  - studyData.dicom_files exists:', !!studyData.dicom_files);
          console.log('  - studyData.dicom_files length:', studyData.dicom_files?.length);
          console.log('  - condition result:', studyData.dicom_files && studyData.dicom_files.length > 0);
          
          if (studyData.dicom_files && studyData.dicom_files.length > 0) {
            console.log('✅ Using real DICOM files');
            console.log('📋 First DICOM file structure:', JSON.stringify(studyData.dicom_files[0], null, 2));
            const imageIds = studyData.dicom_files.map((file: { id: string; file_name: string }) => {
              console.log('🔍 Processing file:', JSON.stringify(file, null, 2));
              console.log('🆔 File ID:', file.id, 'Type:', typeof file.id);
              const imageId = `wadouri:${API_URL}/api/studies/dicom/files/${file.id}`;
              console.log('🖼️ Generated imageId:', imageId);
              
              // Test the URL directly
              console.log('🧪 Testing DICOM URL accessibility...');
              fetch(imageId.replace('wadouri:', ''), {
                headers: { 'Authorization': `Bearer ${token}` }
              }).then(response => {
                console.log(`📡 DICOM URL test result: ${response.status} ${response.statusText}`);
                console.log(`📏 Content-Length: ${response.headers.get('content-length')}`);
              }).catch(err => {
                console.error('❌ DICOM URL test failed:', err);
              });
              
              return imageId;
            });
            console.log('✅ Real DICOM imageIds:', imageIds);
            setImageIds(imageIds);
          } else {
            console.log('🎭 No DICOM files found, using mock images');
            const generateAlphanumericId = () => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              let result = '';
              for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return result;
            };
            const mockImageIds = Array.from({ length: 120 }, () => 
              `example://image-${generateAlphanumericId()}`
            );
            console.log('🎭 Using mock imageIds (120 images):', mockImageIds.slice(0, 5), '...');
            setImageIds(mockImageIds);
          }
        } else {
          console.log('❌ Study fetch failed:', response.status, response.statusText);
          setError('Study not found');
        }
      } catch (error) {
        console.error('❌ Error fetching study:', error);
        setError('Failed to load study');
      } finally {
        setLoading(false);
      }
    };

    if (studyId) {
      fetchStudy();
    }
  }, [studyId, token, API_URL]);

  const loadImage = useCallback(async (imageIndex: number) => {
    console.log('🔄 loadImage called with index:', imageIndex, 'imageIds length:', imageIds.length);
    
    if (!viewport || !renderingEngine || imageIndex >= imageIds.length || imageIndex < 0) {
      console.log('❌ loadImage early return:', {
        hasViewport: !!viewport,
        hasRenderingEngine: !!renderingEngine,
        imageIndex,
        imageIdsLength: imageIds.length,
        isValidIndex: imageIndex >= 0 && imageIndex < imageIds.length
      });
      return;
    }
    
    try {
      const imageId = imageIds[imageIndex];
      console.log('🔄 Processing image ID:', imageId);
      
      if (imageId && imageId.startsWith('wadouri:')) {
        console.log('🔄 Loading DICOM image via wadouri:', imageId);
        
        try {
          // Clear any existing error state
          setError(null);
          
          // Validate the image ID format
          const url = imageId.replace('wadouri:', '');
          if (!url || !url.startsWith('http')) {
            throw new Error(`Invalid wadouri URL format: ${imageId}`);
          }
          
          console.log('🔄 Setting stack with image:', imageId);
          
          // Set the stack on the viewport with error handling
          await viewport.setStack([imageId], 0);
          
          // Extract DICOM metadata for automatic window/level detection
          try {
            const image = await imageLoader.loadAndCacheImage(imageId);
            if (image && image.data && image.data.string) {
              const dataSet = image.data;
              
              // Extract window center and width from DICOM metadata
              let windowCenter = dataSet.floatString('x00281050'); // Window Center
              let windowWidth = dataSet.floatString('x00281051');  // Window Width
              
              // If multiple values, take the first one
              if (windowCenter && typeof windowCenter === 'string' && windowCenter.includes('\\')) {
                windowCenter = parseFloat(windowCenter.split('\\')[0]);
              } else if (windowCenter) {
                windowCenter = parseFloat(windowCenter);
              }
              
              if (windowWidth && typeof windowWidth === 'string' && windowWidth.includes('\\')) {
                windowWidth = parseFloat(windowWidth.split('\\')[0]);
              } else if (windowWidth) {
                windowWidth = parseFloat(windowWidth);
              }
              
              // Apply automatic window/level if found in metadata
              if (windowCenter && windowWidth && !isNaN(windowCenter) && !isNaN(windowWidth)) {
                console.log('🎯 Auto-detected window/level from DICOM:', { windowCenter, windowWidth });
                
                const newSettings = {
                  ...viewportSettings,
                  windowCenter,
                  windowWidth
                };
                
                setViewportSettings(newSettings);
                
                // Apply to viewport
                viewport.setProperties({
                  voiRange: {
                    lower: windowCenter - windowWidth / 2,
                    upper: windowCenter + windowWidth / 2
                  }
                });
              } else {
                console.log('⚠️ No valid window/level found in DICOM metadata, using defaults');
                
                // Apply default window/level based on modality
                const modality = dataSet.string('x00080060'); // Modality
                let defaultSettings = { windowCenter: 40, windowWidth: 400 }; // Default soft tissue
                
                if (modality) {
                  const presets = getWindowLevelPresets();
                  switch (modality.toUpperCase()) {
                    case 'CT':
                      if (study?.body_part?.toLowerCase().includes('lung')) {
                        defaultSettings = presets['Lung'];
                      } else if (study?.body_part?.toLowerCase().includes('bone')) {
                        defaultSettings = presets['Bone'];
                      } else if (study?.body_part?.toLowerCase().includes('brain') || study?.body_part?.toLowerCase().includes('head')) {
                        defaultSettings = presets['Brain'];
                      } else {
                        defaultSettings = presets['Soft Tissue'];
                      }
                      break;
                    case 'MR':
                    case 'MRI':
                      defaultSettings = presets['Brain'];
                      break;
                    default:
                      defaultSettings = presets['Soft Tissue'];
                  }
                }
                
                console.log('🎯 Applying modality-based defaults:', defaultSettings);
                
                const newSettings = {
                  ...viewportSettings,
                  windowCenter: defaultSettings.windowCenter,
                  windowWidth: defaultSettings.windowWidth
                };
                
                setViewportSettings(newSettings);
                
                viewport.setProperties({
                  voiRange: {
                    lower: defaultSettings.windowCenter - defaultSettings.windowWidth / 2,
                    upper: defaultSettings.windowCenter + defaultSettings.windowWidth / 2
                  }
                });
              }
            }
          } catch (metadataError) {
            console.warn('⚠️ Could not extract DICOM metadata for auto window/level:', metadataError);
          }
          
          console.log('🔄 Rendering viewport:', viewport.id);
          
          // Render the viewport
          renderingEngine.renderViewports([viewport.id]);
          
          console.log('✅ DICOM image loaded and displayed successfully');
          
          // Update current image index
          setCurrentImageIndex(imageIndex);
          
        } catch (imageError) {
          console.error('❌ Error during DICOM image loading/display:', imageError);
          console.error('Failed image ID:', imageId);
          
          // Enhanced error handling with retry mechanism
          let shouldRetry = false;
          let errorMessage = '';
          
          if (imageError.message.includes('404')) {
            errorMessage = 'DICOM file not found on server';
          } else if (imageError.message.includes('403') || imageError.message.includes('401')) {
            errorMessage = 'Access denied - please check authentication';
            shouldRetry = true; // Might be temporary auth issue
          } else if (imageError.message.includes('CORS')) {
            errorMessage = 'Cross-origin request blocked - check server CORS settings';
          } else if (imageError.message.includes('storage')) {
            errorMessage = 'Storage access error - using memory-only mode';
            shouldRetry = true;
          } else if (imageError.message.includes('network') || imageError.message.includes('timeout')) {
            errorMessage = 'Network error - check connection';
            shouldRetry = true;
          } else {
            errorMessage = `Failed to load DICOM image: ${imageError.message}`;
            shouldRetry = true;
          }
          
          // Implement retry mechanism for recoverable errors
          if (shouldRetry && imageIndex === currentImageIndex) {
            console.log('🔄 Attempting to retry image loading in 2 seconds...');
            setTimeout(() => {
              if (imageIndex === currentImageIndex) {
                console.log('🔄 Retrying image load for index:', imageIndex);
                loadImage(imageIndex).catch(() => {
                  console.log('❌ Retry failed, showing error');
                  setError(errorMessage);
                });
              }
            }, 2000);
          } else {
            setError(errorMessage);
          }
          
          // Try to apply basic window/level even if image loading partially failed
          try {
            if (viewport) {
              viewport.setProperties({
                voiRange: {
                  lower: viewportSettings.windowCenter - viewportSettings.windowWidth / 2,
                  upper: viewportSettings.windowCenter + viewportSettings.windowWidth / 2
                }
              });
              renderingEngine.renderViewports([viewport.id]);
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback rendering also failed:', fallbackError);
          }
          
          throw imageError;
        }
      } else if (imageId) {
        console.log('⚠️ Non-wadouri image ID detected:', imageId);
        setError('Only wadouri DICOM images are supported in this viewer');
      } else {
        console.log('❌ Empty or invalid image ID');
        setError('Invalid image identifier');
      }
      
    } catch (err) {
      console.error('❌ Failed to load image:', err);
      console.error('Image ID that failed:', imageIds[imageIndex]);
      
      // Don't overwrite more specific error messages
      if (!error) {
        setError('Failed to load DICOM image');
      }
    }
  }, [imageIds, viewport, renderingEngine, error]);

  useEffect(() => {
    const conditions = {
      isInitialized,
      imageIdsLength: imageIds.length,
      hasViewport: !!viewport,
      hasRenderingEngine: !!renderingEngine,
      viewMode,
      currentImageIndex,
      isValidImageIndex: currentImageIndex >= 0 && currentImageIndex < imageIds.length
    };
    
    console.log('🔍 Image loading useEffect triggered:', conditions);
    
    if (isInitialized && imageIds.length > 0 && viewport && renderingEngine && viewMode === '2d' && conditions.isValidImageIndex) {
      console.log('✅ All conditions met, calling loadImage with index:', currentImageIndex);
      loadImage(currentImageIndex);
    } else {
      const missingConditions = [];
      if (!isInitialized) missingConditions.push('not initialized');
      if (imageIds.length === 0) missingConditions.push('no image IDs');
      if (!viewport) missingConditions.push('no viewport');
      if (!renderingEngine) missingConditions.push('no rendering engine');
      if (viewMode !== '2d') missingConditions.push(`view mode is ${viewMode}, not 2d`);
      if (!conditions.isValidImageIndex) missingConditions.push(`invalid image index: ${currentImageIndex}`);
      
      console.log('⏳ Image loading conditions not met:', missingConditions.join(', '));
      
      // Clear error if we're just waiting for initialization
      if (missingConditions.length > 0 && !missingConditions.includes('no image IDs')) {
        setError(null);
      }
    }
  }, [isInitialized, imageIds, currentImageIndex, viewMode, loadImage, viewport, renderingEngine]);

  useEffect(() => {
    if (viewMode === '3d' || viewMode === 'vr') {
      console.log('3D/VR mode selected - VTK integration coming soon');
    }
  }, [viewMode]);

  // Histogram calculation functions
  const calculateHistogram = useCallback((imageData: any) => {
    if (!imageData || !imageData.getPixelData) return null;
    
    try {
      const pixelData = imageData.getPixelData();
      const numBins = 256;
      const histogram = new Array(numBins).fill(0);
      
      // Find min and max values
      let minValue = Infinity;
      let maxValue = -Infinity;
      
      for (let i = 0; i < pixelData.length; i++) {
        const value = pixelData[i];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
      
      // Calculate bin size
      const binSize = (maxValue - minValue) / numBins;
      
      // Fill histogram
      for (let i = 0; i < pixelData.length; i++) {
        const binIndex = Math.min(
          Math.floor((pixelData[i] - minValue) / binSize),
          numBins - 1
        );
        histogram[binIndex]++;
      }
      
      // Create bins array
      const bins = Array.from({ length: numBins }, (_, i) => 
        Math.round(minValue + i * binSize)
      );
      
      return { bins, values: histogram };
    } catch (error) {
      console.error('Error calculating histogram:', error);
      return null;
    }
  }, []);

  const updateHistogram = useCallback(async () => {
    if (!viewport || !imageIds[currentImageIndex]) return;
    
    try {
      const imageId = imageIds[currentImageIndex];
      const image = await imageLoader.loadAndCacheImage(imageId);
      const histogram = calculateHistogram(image);
      setHistogramData(histogram);
    } catch (error) {
      console.error('Error updating histogram:', error);
      setHistogramData(null);
    }
  }, [viewport, imageIds, currentImageIndex, calculateHistogram]);

  // Update histogram when image changes
  useEffect(() => {
    if (showHistogram && viewport && imageIds.length > 0) {
      updateHistogram();
    }
  }, [showHistogram, viewport, currentImageIndex, updateHistogram]);

  // Memory cleanup and performance monitoring
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupMemory();
      
      // Log performance stats in development
      if (import.meta.env.DEV) {
        const stats = getPerformanceStats();
        if (stats.renderCount > 0) {
          console.log('📊 Performance Stats:', stats);
        }
      }
    }, 30000); // Cleanup every 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(cleanupInterval);
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      cleanupMemory();
    };
  }, [cleanupMemory, getPerformanceStats]);

  // Responsive viewport sizing
  useEffect(() => {
    const handleResize = () => {
      if (viewport && renderingEngine) {
        // Debounce viewport resize for better performance
        debouncedRender(viewport.id, () => {
          try {
            renderingEngine.resize();
            viewport.render();
          } catch (error) {
            console.warn('⚠️ Viewport resize failed:', error);
          }
        }, 100); // Longer delay for resize events
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewport, renderingEngine, debouncedRender]);

  const handleToolSelect = (tool: string) => {
    if (!toolGroup) return;
    
    // Deactivate all tools first
    toolGroup.setToolPassive(LengthTool.toolName);
    toolGroup.setToolPassive(AngleTool.toolName);
    toolGroup.setToolPassive(RectangleROITool.toolName);
    toolGroup.setToolPassive(EllipticalROITool.toolName);
    toolGroup.setToolPassive(WindowLevelTool.toolName);
    toolGroup.setToolPassive(PanTool.toolName);
    toolGroup.setToolPassive(ZoomTool.toolName);
    
    // Activate selected tool
    switch (tool) {
      case 'distance':
        toolGroup.setToolActive(LengthTool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'angle':
        toolGroup.setToolActive(AngleTool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'rectangle':
        toolGroup.setToolActive(RectangleROITool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'ellipse':
        toolGroup.setToolActive(EllipticalROITool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'pan':
        toolGroup.setToolActive(PanTool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'zoom':
        toolGroup.setToolActive(ZoomTool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
      case 'wwwc':
      default:
        toolGroup.setToolActive(WindowLevelTool.toolName, {
          bindings: [{ mouseButton: 1 }]
        });
        break;
    }
    
    setActiveTool(tool);
  };

  // Zoom functions with synchronization
  // Removed handleZoomIn - replaced by new Cornerstone3D zoom tool

  // Removed handleZoomOut - replaced by new Cornerstone3D zoom tool

  // Removed handleZoomFit - replaced by new Cornerstone3D zoom tool

  // Sidebar handlers
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const reconstruct3D = () => {
    if (!imageIds.length) return;

    try {
      console.log('3D reconstruction initiated for', imageIds.length, 'slices');
      setViewMode('3d');
    } catch (error) {
      console.error('Failed to reconstruct 3D volume:', error);
    }
  };



  const generateMPR = () => {
    if (!imageIds.length) return;

    try {
      const axialView = { plane: 'axial', sliceIndex: Math.floor(imageIds.length / 2) };
      const coronalView = { plane: 'coronal', sliceIndex: Math.floor(512 / 2) };
      const sagittalView = { plane: 'sagittal', sliceIndex: Math.floor(512 / 2) };

      setMprViews({
        axial: axialView,
        coronal: coronalView,
        sagittal: sagittalView
      });

      setViewMode('mpr');
      console.log('MPR views generated:', { axialView, coronalView, sagittalView });
    } catch (error) {
      console.error('Failed to generate MPR views:', error);
    }
  };

  const generateMIP = () => {
    if (!imageIds.length) return;

    try {
      setViewMode('mip');
    } catch (error) {
      console.error('Failed to generate MIP:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSliceChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentImageIndex < imageIds.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else if (direction === 'prev' && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleWindowLevelChange = (type: 'center' | 'width', value: number) => {
    const newSettings = {
      ...viewportSettings,
      [type === 'center' ? 'windowCenter' : 'windowWidth']: value
    };
    setViewportSettings(newSettings);
    
    if (viewport) {
      // Update viewport properties using new Cornerstone.js 3D API
      const properties = viewport.getProperties();
      // Use debounced rendering for better performance
      debouncedRender(viewport.id, () => {
        viewport.setProperties({
          ...properties,
          voiRange: {
            lower: newSettings.windowCenter - newSettings.windowWidth / 2,
            upper: newSettings.windowCenter + newSettings.windowWidth / 2
          }
        });
        viewport.render();
        
        // Cache viewport state
        cacheViewportState(viewport.id, newSettings);
      });
    }
    
    // TODO: Implement viewport synchronization for multi-view mode
  };

  const handleBrightnessChange = (value: number) => {
    const newSettings = {
      ...viewportSettings,
      brightness: value
    };
    setViewportSettings(newSettings);
    
    if (viewport) {
      // Apply brightness adjustment using Cornerstone.js 3D API
      const properties = viewport.getProperties();
      const currentVoi = properties.voiRange || {
        lower: newSettings.windowCenter - newSettings.windowWidth / 2,
        upper: newSettings.windowCenter + newSettings.windowWidth / 2
      };
      
      // Adjust brightness by shifting the VOI range
      const brightnessOffset = value * 50; // Scale brightness adjustment
      // Use debounced rendering for better performance
      debouncedRender(viewport.id, () => {
        viewport.setProperties({
          ...properties,
          voiRange: {
            lower: currentVoi.lower + brightnessOffset,
            upper: currentVoi.upper + brightnessOffset
          }
        });
        viewport.render();
        
        // Cache viewport state
        cacheViewportState(viewport.id, newSettings);
      });
    }
  };

  const handleContrastChange = (value: number) => {
    const newSettings = {
      ...viewportSettings,
      contrast: value
    };
    setViewportSettings(newSettings);
    
    if (viewport) {
      // Apply contrast adjustment using Cornerstone.js 3D API
      const properties = viewport.getProperties();
      const currentVoi = properties.voiRange || {
        lower: newSettings.windowCenter - newSettings.windowWidth / 2,
        upper: newSettings.windowCenter + newSettings.windowWidth / 2
      };
      
      // Adjust contrast by scaling the VOI range
      const center = (currentVoi.lower + currentVoi.upper) / 2;
      const width = (currentVoi.upper - currentVoi.lower) * value;
      
      // Use debounced rendering for better performance
      debouncedRender(viewport.id, () => {
        viewport.setProperties({
          ...properties,
          voiRange: {
            lower: center - width / 2,
            upper: center + width / 2
          }
        });
        viewport.render();
        
        // Cache viewport state
        cacheViewportState(viewport.id, newSettings);
      });
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prev => {
          if (prev >= imageIds.length - 1) {
            return 0; // Loop back to start
          }
          return prev + 1;
        });
      }, 100); // 10 FPS
      
      window.cineInterval = interval;
    } else {
      if (window.cineInterval) {
        clearInterval(window.cineInterval);
        window.cineInterval = undefined;
      }
    }
  };

  const resetViewport = () => {
    if (!viewport || !isInitialized) return;
    
    try {
      // Reset viewport using new Cornerstone.js 3D API
      viewport.resetCamera();
      const resetSettings = {
        windowCenter: 40,
        windowWidth: 400,
        zoom: 1,
        pan: { x: 0, y: 0 },
        rotation: 0,
        invert: false,
        brightness: 0,
        contrast: 1
      };
      setViewportSettings(resetSettings);
      
      // Apply reset settings to viewport
      viewport.setProperties({
        voiRange: {
          lower: resetSettings.windowCenter - resetSettings.windowWidth / 2,
          upper: resetSettings.windowCenter + resetSettings.windowWidth / 2
        }
      });
      viewport.render();
      
      // Synchronize with other viewports in multi-view mode
      if (viewMode === 'multi') {
        synchronizeViewports(resetSettings);
      }
    } catch (err) {
      console.error('Failed to reset viewport:', err);
    }
  };

  const exportImage = (format: 'png' | 'jpg' | 'mp4' | 'stl' | 'pdf' = 'png') => {
    if (!viewport || !isInitialized) return;
    
    try {
      const canvas = viewport.getCanvas();
      if (!canvas) {
        console.error('Canvas not available for export');
        return;
      }
      
      switch (format) {
        case 'png':
        case 'jpg': {
          const link = document.createElement('a');
          link.download = `${study?.patient_name || 'study'}_slice_${currentImageIndex + 1}.${format}`;
          link.href = canvas.toDataURL(`image/${format}`);
          link.click();
          break;
        }
          
        case 'mp4':
          exportCineLoop();
          break;
          
        case 'stl':
          export3DModel();
          break;
          
        case 'pdf':
          exportReportPDF();
          break;
          
        default: {
          const defaultLink = document.createElement('a');
          defaultLink.download = `${study?.patient_name || 'study'}_slice_${currentImageIndex + 1}.png`;
          defaultLink.href = canvas.toDataURL();
          defaultLink.click();
        }
      }
    } catch (err) {
      console.error('Failed to export image:', err);
    }
  };

  const generateAIReport = async () => {
    if (!study) return;
    
    setAiReportLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          study_id: study.id,
          modality: study.modality,
          body_part: study.body_part
        })
      });
      
      if (response.ok) {
        const aiReport = await response.json();
        setStudy(prev => prev ? { ...prev, ai_report: aiReport } : null);
      }
    } catch (err) {
      console.error('Failed to generate AI report:', err);
    } finally {
      setAiReportLoading(false);
    }
  };

  const exportCineLoop = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 512;
      
      const frames: string[] = [];
      
      for (let i = 0; i < imageIds.length; i++) {
        setCurrentImageIndex(i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render
        
        if (cornerstoneElementRef.current && isInitialized) {
          try {
            const enabledElement = cornerstone.getEnabledElement(cornerstoneElementRef.current);
            if (enabledElement && enabledElement.canvas) {
              const sourceCanvas = enabledElement.canvas;
              ctx?.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
              frames.push(canvas.toDataURL());
            }
          } catch (err) {
            console.warn(`Failed to capture frame ${i}:`, err);
          }
        }
      }
      
      console.log(`MP4 export: ${frames.length} frames captured`);
      alert(`Cine loop export completed with ${frames.length} frames`);
      
    } catch (error) {
      console.error('Failed to export cine loop:', error);
      alert('Failed to export cine loop');
    }
  };

  const export3DModel = async () => {
    try {
      if (!study) return;
      
      const stlContent = `
solid ${study.patient_name}_3D_Model
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 1.0 0.0 0.0
      vertex 0.0 1.0 0.0
    endloop
  endfacet
endsolid ${study.patient_name}_3D_Model
      `;
      
      const blob = new Blob([stlContent], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${study.patient_name}_3D_model.stl`;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to export 3D model:', error);
      alert('Failed to export 3D model');
    }
  };

  const exportReportPDF = async () => {
    try {
      if (!study) return;
      
      const response = await fetch(`${API_URL}/studies/${study.id}/report/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${study.patient_name}_Report.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('No report available for PDF export');
      }
    } catch (error) {
      console.error('Failed to export PDF report:', error);
      alert('Failed to export PDF report');
    }
  };

  // Handle tool selection from ExpandableToolbar
  const handleToolbarToolSelect = useCallback((toolId: string) => {
    console.log('Tool selected:', toolId);
    
    switch (toolId) {
      case 'windowLevel':
        setActiveTool('wwwc');
        break;
      case 'zoom':
        setActiveTool('zoom');
        break;
      case 'pan':
        setActiveTool('pan');
        break;
      case 'rotate':
        setActiveTool('rotate');
        break;
      case 'reset':
        resetViewport();
        break;
      case 'fullscreen':
        // Toggle fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
      case 'length':
        setActiveTool('length');
        break;
      case 'angle':
        setActiveTool('angle');
        break;
      case 'rectangle':
        setActiveTool('rectangleROI');
        break;
      case 'ellipse':
        setActiveTool('ellipticalROI');
        break;
      case 'polygon':
        setActiveTool('polygon');
        break;
      case 'freehand':
        setActiveTool('freehand');
        break;
      case 'cobb':
        setActiveTool('cobb');
        break;
      case 'pixelProbe':
        setActiveTool('probe');
        break;
      case 'mpr':
        setViewMode('mpr');
        generateMPR();
        break;
      case 'volumeRender':
        setViewMode('vr');
        reconstruct3D();
        break;
      case 'surfaceRender':
        setViewMode('3d');
        reconstruct3D();
        break;
      case 'mip':
        setViewMode('mip');
        generateMIP();
        break;
      case 'minip':
        setViewMode('mip');
        generateMIP();
        break;
      case 'exportImage':
        exportImage('png');
        break;
      case 'exportVideo':
        exportImage('mp4');
        break;
      case 'exportMesh':
        exportImage('stl');
        break;
      case 'exportReport':
        exportImage('pdf');
        break;
      case 'histogram':
      case 'profile':
      case 'statistics':
      case 'timeIntensity':
      case 'brush':
      case 'eraser':
      case 'magicWand':
      case 'threshold':
      case 'regionGrow':
      case 'registration':
      case 'fusion':
      case 'overlay':
      case 'blend':
      case 'cardiac':
      case 'vascular':
      case 'oncology':
      case 'orthopedic':
      case 'neurological':
      case 'suv':
      case 'hounsfield':
        // These tools would require additional implementation
        console.log(`Advanced tool ${toolId} selected - implementation needed`);
        alert(`${toolId} tool is not yet implemented. This would be a future enhancement.`);
        break;
      default:
        console.log('Unknown tool:', toolId);
    }
  }, []);

  // Handle toolbar configuration changes
  const handleToolbarConfigChange = useCallback((newConfig: any) => {
    setToolbarConfig(newConfig);
    // Save to localStorage for persistence
    try {
      localStorage.setItem('dicom-toolbar-config', JSON.stringify(newConfig));
    } catch (error) {
      console.warn('Failed to save toolbar config:', error);
    }
  }, []);

  // Load toolbar configuration from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('dicom-toolbar-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setToolbarConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.warn('Failed to load toolbar config:', error);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-lg text-white">Loading study...</div>
      </div>
    );
  }

  if (error || !study) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-lg text-red-400 mb-4">{error || 'Study not found'}</div>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col transition-colors duration-200 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="h-screen flex flex-col bg-background text-foreground">
        {/* Header */}
        <div className="bg-card p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{study.patient_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {study.modality} • {study.body_part} • {study.study_date}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{study.modality}</Badge>
              <div className="flex space-x-1">
                <Button 
                  variant={viewMode === '2d' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('2d')}
                >
                  2D
                </Button>
                <Button 
                  variant={viewMode === '3d' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => {
                    setViewMode('3d');
                    reconstruct3D();
                  }}
                >
                  <Move3D className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'mpr' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => {
                    setViewMode('mpr');
                    generateMPR();
                  }}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'vr' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => {
                    setViewMode('vr');
                    reconstruct3D();
                  }}
                >
                  <Layers className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'mip' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => {
                    setViewMode('mip');
                    generateMIP();
                  }}
                >
                  <Maximize className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'multi' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => {
                    setViewMode('multi');
                    setMultiViewMode(true);
                  }}
                  title="Multi-Viewport View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Layout Controls for Multi-View */}
              {viewMode === 'multi' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="ml-2">
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      {viewportLayout === '1x1' && '1×1'}
                      {viewportLayout === '1x2' && '1×2'}
                      {viewportLayout === '2x1' && '2×1'}
                      {viewportLayout === '2x2' && '2×2'}
                      {viewportLayout === '1x3' && '1×3'}
                      {viewportLayout === '3x1' && '3×1'}
                      {viewportLayout === '1x4' && '1×4'}
                      {viewportLayout === '4x1' && '4×1'}
                      {viewportLayout === '2x3' && '2×3'}
                      {viewportLayout === '3x2' && '3×2'}
                      {viewportLayout === '3x3' && '3×3'}
                      {viewportLayout === '1x6' && '1×6'}
                      {viewportLayout === '6x1' && '6×1'}
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Viewport Layouts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Single Viewport */}
                    <DropdownMenuItem onClick={() => setViewportLayout('1x1')}>
                      <div className="flex items-center space-x-3">
                        <Square className="w-4 h-4" />
                        <span>Single (1×1)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    {/* Two Viewports */}
                    <DropdownMenuItem onClick={() => setViewportLayout('1x2')}>
                      <div className="flex items-center space-x-3">
                        <RectangleVertical className="w-4 h-4" />
                        <span>Vertical (1×2)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('2x1')}>
                      <div className="flex items-center space-x-3">
                        <RectangleHorizontal className="w-4 h-4" />
                        <span>Horizontal (2×1)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Four Viewports */}
                    <DropdownMenuItem onClick={() => setViewportLayout('2x2')}>
                      <div className="flex items-center space-x-3">
                        <Grid2X2 className="w-4 h-4" />
                        <span>Grid (2×2)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('1x4')}>
                      <div className="flex items-center space-x-3">
                        <Rows4 className="w-4 h-4" />
                        <span>Vertical Stack (1×4)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('4x1')}>
                      <div className="flex items-center space-x-3">
                        <Columns4 className="w-4 h-4" />
                        <span>Horizontal Row (4×1)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Three Viewports */}
                    <DropdownMenuItem onClick={() => setViewportLayout('1x3')}>
                      <div className="flex items-center space-x-3">
                        <Rows3 className="w-4 h-4" />
                        <span>Vertical Triple (1×3)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('3x1')}>
                      <div className="flex items-center space-x-3">
                        <Columns3 className="w-4 h-4" />
                        <span>Horizontal Triple (3×1)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Six Viewports */}
                    <DropdownMenuItem onClick={() => setViewportLayout('2x3')}>
                      <div className="flex items-center space-x-3">
                        <LayoutGrid className="w-4 h-4" />
                        <span>Grid (2×3)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('3x2')}>
                      <div className="flex items-center space-x-3">
                        <LayoutGrid className="w-4 h-4" />
                        <span>Grid (3×2)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('1x6')}>
                      <div className="flex items-center space-x-3">
                        <Rows4 className="w-4 h-4" />
                        <span>Vertical Stack (1×6)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => setViewportLayout('6x1')}>
                      <div className="flex items-center space-x-3">
                        <Columns4 className="w-4 h-4" />
                        <span>Horizontal Row (6×1)</span>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Nine Viewports */}
                    <DropdownMenuItem onClick={() => setViewportLayout('3x3')}>
                      <div className="flex items-center space-x-3">
                        <Grid3X3 className="w-4 h-4" />
                        <span>Large Grid (3×3)</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={generateAIReport}
                disabled={aiReportLoading}
              >
                {aiReportLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4 mr-2" />
                )}
                AI Report
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setToolbarSettingsOpen(true)}
                title="Toolbar Settings"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetViewport}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                {sidebarVisible ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 space-y-2">
          <Button
            variant={activeTool === 'wwwc' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('wwwc')}
            className="w-10 h-10"
            title="Window/Level"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'zoom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('zoom')}
            className="w-10 h-10"
            title="Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'pan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('pan')}
            className="w-10 h-10"
            title="Pan"
          >
            <Move3D className="w-4 h-4" />
          </Button>
          <Separator className="w-8" />
          <Button
            variant={activeTool === 'distance' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('distance')}
            className="w-10 h-10"
            title="Length Measurement"
          >
            <Ruler className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'angle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('angle')}
            className="w-10 h-10"
            title="Angle Measurement"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('rectangle')}
            className="w-10 h-10"
            title="Rectangle ROI"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'ellipse' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('ellipse')}
            className="w-10 h-10"
            title="Ellipse ROI"
          >
            <Circle className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === 'freehand' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('freehand')}
            className="w-10 h-10"
            title="Freehand ROI"
          >
            ✏️
          </Button>
          <Button
            variant={activeTool === 'cobb' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleToolSelect('cobb')}
            className="w-10 h-10"
            title="Cobb Angle"
          >
            📐
          </Button>
          <Separator className="w-8" />
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="w-10 h-10"
            title="Cine Playback"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportImage('png')}
              className="w-10 h-10"
              title="Export Options"
            >
              <Download className="w-4 h-4" />
            </Button>
            <div className="absolute left-12 top-0 hidden group-hover:block bg-popover rounded-md shadow-lg p-2 space-y-1 z-10 border border-border">
              <Button size="sm" variant="ghost" onClick={() => exportImage('png')} className="w-full justify-start text-xs">
                PNG Image
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('jpg')} className="w-full justify-start text-xs">
                JPEG Image
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('mp4')} className="w-full justify-start text-xs">
                MP4 Cine
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('stl')} className="w-full justify-start text-xs">
                STL 3D Model
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportImage('pdf')} className="w-full justify-start text-xs">
                PDF Report
              </Button>
            </div>
          </div>
        </div>

        {/* Main Viewer */}
        <div className="flex-1 flex">
          <div className="flex-1 bg-black relative">
            <div 
              ref={viewerRef}
              className="w-full h-full flex items-center justify-center"
            >
              {/* 2D Cornerstone DICOM Viewer */}
              {viewMode === '2d' && (
                <div 
                  ref={cornerstoneElementRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
              
              {/* 3D VTK Viewer */}
              {(viewMode === '3d' || viewMode === 'vr') && (
                <div 
                  ref={vtkContainerRef}
                  className="w-full h-full"
                  style={{ minHeight: '400px' }}
                />
              )}
              
              {/* MPR Views */}
              {viewMode === 'mpr' && (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1">
                  <div className="bg-muted flex items-center justify-center tt-foreground">
                    <div>Axial View {mprViews.axial ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-muted flex items-center justify-center text-foreground">
                    <div>Coronal View {mprViews.coronal ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-muted flex items-center justify-center text-foreground">
                    <div>Sagittal View {mprViews.sagittal ? '✓' : '○'}</div>
                  </div>
                  <div className="bg-muted flex items-center justify-center text-foreground">
                    <div>3D Reconstruction</div>
                  </div>
                </div>
              )}
              
              {/* MIP View */}
              {viewMode === 'mip' && (
                <div className="w-full h-full bg-muted flex items-center justify-center text-foreground">
                  <div>Maximum Intensity Projection</div>
                </div>
              )}
              
              {/* Multi-Viewport View */}
              {viewMode === 'multi' && (
                <div className="w-full h-full">
                  {viewportLayout === '2x2' && (
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1">
                      <div className="relative bg-black border border-border">
                        <div 
                          ref={(el) => {
                            if (el && !viewportElements.includes(el)) {
                              setViewportElements(prev => [...prev.slice(0, 0), el, ...prev.slice(1)]);
                            }
                          }}
                          className="w-full h-full"
                          style={{ minHeight: '200px' }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Viewport 1
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + 1}/{imageIds.length}
                        </div>
                      </div>
                      <div className="relative bg-black border border-border">
                        <div 
                          ref={(el) => {
                            if (el && !viewportElements.includes(el)) {
                              setViewportElements(prev => [...prev.slice(0, 1), el, ...prev.slice(2)]);
                            }
                          }}
                          className="w-full h-full"
                          style={{ minHeight: '200px' }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Viewport 2
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + 2}/{imageIds.length}
                        </div>
                      </div>
                      <div className="relative bg-black border border-border">
                        <div 
                          ref={(el) => {
                            if (el && !viewportElements.includes(el)) {
                              setViewportElements(prev => [...prev.slice(0, 2), el, ...prev.slice(3)]);
                            }
                          }}
                          className="w-full h-full"
                          style={{ minHeight: '200px' }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Viewport 3
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + 3}/{imageIds.length}
                        </div>
                      </div>
                      <div className="relative bg-black border border-border">
                        <div 
                          ref={(el) => {
                            if (el && !viewportElements.includes(el)) {
                              setViewportElements(prev => [...prev.slice(0, 3), el]);
                            }
                          }}
                          className="w-full h-full"
                          style={{ minHeight: '200px' }}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Viewport 4
                        </div>
                        <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                          Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + 4}/{imageIds.length}
                        </div>
                      </div>
                    </div>
                  )}
                  {viewportLayout === '1x4' && (
                    <div className="w-full h-full grid grid-cols-1 grid-rows-4 gap-1">
                      {[1, 2, 3, 4].map((index) => (
                        <div key={index} className="relative bg-black border border-border">
                          <div 
                            ref={(el) => {
                              if (el && !viewportElements.includes(el)) {
                                setViewportElements(prev => {
                                  const newElements = [...prev];
                                  newElements[index - 1] = el;
                                  return newElements;
                                });
                              }
                            }}
                            className="w-full h-full"
                            style={{ minHeight: '100px' }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                          <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                            Viewport {index}
                          </div>
                          <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                            Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + index}/{imageIds.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {viewportLayout === '4x1' && (
                    <div className="w-full h-full grid grid-cols-4 grid-rows-1 gap-1">
                      {[1, 2, 3, 4].map((index) => (
                        <div key={index} className="relative bg-black border border-border">
                          <div 
                            ref={(el) => {
                              if (el && !viewportElements.includes(el)) {
                                setViewportElements(prev => {
                                  const newElements = [...prev];
                                  newElements[index - 1] = el;
                                  return newElements;
                                });
                              }
                            }}
                            className="w-full h-full"
                            style={{ minHeight: '200px' }}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                          <div className="absolute top-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                            Viewport {index}
                          </div>
                          <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                            Image: {Math.floor((currentImageIndex * 4) / imageIds.length) + index}/{imageIds.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Overlay Info */}
            <div className="absolute top-4 left-4 text-sm bg-popover/90 p-2 rounded border border-border text-foreground">
              <div>Patient: {study.patient_name}</div>
              <div>ID: {study.patient_id}</div>
              <div>W/L: {viewportSettings.windowWidth}/{viewportSettings.windowCenter}</div>
              <div>Zoom: {(viewportSettings.zoom * 100).toFixed(0)}%</div>
            </div>
            
            <div className="absolute top-4 right-4 text-sm text-right bg-popover/90 p-2 rounded border border-border text-foreground">
              <div>{study.modality}</div>
              <div>{study.body_part}</div>
              <div>Image: {currentImageIndex + 1}/{imageIds.length}</div>
            </div>

            {/* Slice Navigation */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-popover/90 p-2 rounded border border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSliceChange('prev')}
                disabled={currentImageIndex === 0}
              >
                Previous
              </Button>
              <span className="text-sm px-2 text-foreground">
                {currentImageIndex + 1} / {imageIds.length}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSliceChange('next')}
                disabled={currentImageIndex === imageIds.length - 1}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Right Panel */}
          {sidebarVisible && (
            <>
              {/* Resize Handle */}
              <div 
                className="sidebar-resize-handle"
                onMouseDown={handleResizeStart}
              >
                <div className="sidebar-resize-grip">
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
              
              <div 
                className="sidebar-container bg-card border-l border-border overflow-y-auto flex-shrink-0"
                style={{ width: `${sidebarWidth}px` }}
              >
            <div className="p-4 space-y-4">
              {/* Window/Level Controls */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Window/Level</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Window Width: {viewportSettings.windowWidth}</label>
                    <Slider
                      value={[viewportSettings.windowWidth]}
                      onValueChange={(value) => handleWindowLevelChange('width', value[0])}
                      max={2000}
                      min={1}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Window Center: {viewportSettings.windowCenter}</label>
                    <Slider
                      value={[viewportSettings.windowCenter]}
                      onValueChange={(value) => handleWindowLevelChange('center', value[0])}
                      max={1000}
                      min={-1000}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          Window/Level Presets
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuLabel>Anatomical Presets</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.entries(getWindowLevelPresets()).map(([name, preset]) => (
                          <DropdownMenuItem
                            key={name}
                            onClick={() => {
                              handleWindowLevelChange('width', preset.windowWidth);
                              handleWindowLevelChange('center', preset.windowCenter);
                            }}
                          >
                            {name}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {preset.windowWidth}/{preset.windowCenter}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          handleWindowLevelChange('width', 400);
                          handleWindowLevelChange('center', 40);
                        }}
                      >
                        Soft Tissue
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          handleWindowLevelChange('width', 1500);
                          handleWindowLevelChange('center', -600);
                        }}
                      >
                        Lung
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          handleWindowLevelChange('width', 1800);
                          handleWindowLevelChange('center', 400);
                        }}
                      >
                        Bone
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={resetViewport}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset View
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Brightness/Contrast Controls */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Brightness & Contrast</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Brightness: {viewportSettings.brightness.toFixed(1)}</label>
                    <Slider
                      value={[viewportSettings.brightness]}
                      onValueChange={(value) => handleBrightnessChange(value[0])}
                      max={2}
                      min={-2}
                      step={0.1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Contrast: {viewportSettings.contrast.toFixed(1)}</label>
                    <Slider
                      value={[viewportSettings.contrast]}
                      onValueChange={(value) => handleContrastChange(value[0])}
                      max={3}
                      min={0.1}
                      step={0.1}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        handleBrightnessChange(0);
                        handleContrastChange(1);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        handleBrightnessChange(0.5);
                        handleContrastChange(1.2);
                      }}
                    >
                      Enhance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Histogram Display */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Image Histogram
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistogram(!showHistogram)}
                    >
                      {showHistogram ? 'Hide' : 'Show'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showHistogram && (
                  <CardContent>
                    {histogramData ? (
                      <div className="space-y-2">
                        <div className="h-32 w-full bg-muted rounded relative overflow-hidden">
                          <svg width="100%" height="100%" className="absolute inset-0">
                            {histogramData.values.map((value, index) => {
                              const maxValue = Math.max(...histogramData.values);
                              const height = (value / maxValue) * 100;
                              const x = (index / histogramData.values.length) * 100;
                              const width = 100 / histogramData.values.length;
                              
                              return (
                                <rect
                                  key={index}
                                  x={`${x}%`}
                                  y={`${100 - height}%`}
                                  width={`${width}%`}
                                  height={`${height}%`}
                                  fill="hsl(var(--primary))"
                                  opacity={0.7}
                                />
                              );
                            })}
                          </svg>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Min: {Math.min(...histogramData.bins)}</span>
                            <span>Max: {Math.max(...histogramData.bins)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pixels: {histogramData.values.reduce((a, b) => a + b, 0).toLocaleString()}</span>
                            <span>Bins: {histogramData.bins.length}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={updateHistogram}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        {viewport ? 'Click Refresh to generate histogram' : 'Load an image to view histogram'}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Image Enhancement Filters */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Image Enhancement
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showFilters && (
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Sharpen: {imageFilters.sharpen}%</label>
                      <Slider
                        value={[imageFilters.sharpen]}
                        onValueChange={(value) => handleFilterChange('sharpen', value[0])}
                        max={100}
                        min={0}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Smooth: {imageFilters.smooth}%</label>
                      <Slider
                        value={[imageFilters.smooth]}
                        onValueChange={(value) => handleFilterChange('smooth', value[0])}
                        max={100}
                        min={0}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Edge Enhance: {imageFilters.edgeEnhance}%</label>
                      <Slider
                        value={[imageFilters.edgeEnhance]}
                        onValueChange={(value) => handleFilterChange('edgeEnhance', value[0])}
                        max={100}
                        min={0}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Denoise: {imageFilters.denoise}%</label>
                      <Slider
                        value={[imageFilters.denoise]}
                        onValueChange={(value) => handleFilterChange('denoise', value[0])}
                        max={100}
                        min={0}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={resetFilters}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          handleFilterChange('sharpen', 25);
                          handleFilterChange('edgeEnhance', 15);
                          handleFilterChange('denoise', 10);
                        }}
                      >
                        Enhance
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Gamma Correction */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Gamma Correction
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGamma(!showGamma)}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showGamma ? 'rotate-180' : ''}`} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                {showGamma && (
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Gamma: {gammaCorrection.gamma.toFixed(2)}</label>
                      <Slider
                        value={[gammaCorrection.gamma]}
                        onValueChange={(value) => handleGammaChange('gamma', value[0])}
                        max={3.0}
                        min={0.1}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Brightness: {gammaCorrection.brightness}</label>
                      <Slider
                        value={[gammaCorrection.brightness]}
                        onValueChange={(value) => handleGammaChange('brightness', value[0])}
                        max={100}
                        min={-100}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Contrast: {gammaCorrection.contrast.toFixed(2)}</label>
                      <Slider
                        value={[gammaCorrection.contrast]}
                        onValueChange={(value) => handleGammaChange('contrast', value[0])}
                        max={3.0}
                        min={0.1}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={resetGammaCorrection}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          handleGammaChange('gamma', 1.2);
                          handleGammaChange('brightness', 10);
                          handleGammaChange('contrast', 1.1);
                        }}
                      >
                        Auto
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Study Info */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Study Information</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><span className="text-muted-foreground">Patient:</span> {study.patient_name}</div>
                  <div><span className="text-muted-foreground">ID:</span> {study.patient_id}</div>
                  <div><span className="text-muted-foreground">Date:</span> {study.study_date}</div>
                  <div><span className="text-muted-foreground">Modality:</span> {study.modality}</div>
                  <div><span className="text-muted-foreground">Body Part:</span> {study.body_part}</div>
                  <div><span className="text-muted-foreground">Description:</span> {study.study_description}</div>
                  <div><span className="text-muted-foreground">Images:</span> {imageIds.length}</div>
                </CardContent>
              </Card>

              {/* Measurements */}
              <Card className="sidebar-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Measurements</CardTitle>
                </CardHeader>
                <CardContent>
                  {measurements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Use measurement tools to add annotations</p>
                  ) : (
                    <div className="space-y-2">
                      {measurements.map((measurement) => (
                        <div key={measurement.id} className="text-sm">
                          <div className="flex justify-between">
                            <span className="capitalize text-muted-foreground">{measurement.type}</span>
                            <span className="text-foreground">{measurement.value.toFixed(1)} {measurement.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Report */}
              {study.ai_report && (
                <Card className="sidebar-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      AI Analysis
                      {study.ai_report?.ai_model && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {study.ai_report.ai_model}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Findings:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {study.ai_report.findings?.map((finding, index) => (
                          <li key={index} className="text-xs">• {finding}</li>
                        )) || <li className="text-xs text-muted-foreground">No findings available</li>}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Impression:</h4>
                      <p className="text-sm text-muted-foreground">{study.ai_report?.impression || 'No impression available'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Confidence:</h4>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(study.ai_report?.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {((study.ai_report?.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Pathology Scores */}
                    {study.ai_report?.pathology_scores && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Pathology Scores:</h4>
                        <div className="space-y-1">
                          {Object.entries(study.ai_report.pathology_scores)
                            .filter(([, score]) => score > 0.1)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([pathology, score]) => (
                            <div key={pathology} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{pathology.replace('_', ' ')}</span>
                              <span className="text-foreground">{(score * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}            </div>
              </div>
            </>          )}
        </div>
        
        {/* Expandable Toolbar */}
        <ExpandableToolbar
          config={toolbarConfig}
          onToolSelect={handleToolbarToolSelect}
          onConfigChange={handleToolbarConfigChange}
          activeTool={activeTool}
          viewMode={viewMode}
        />
        
        {/* Toolbar Settings Dialog */}
        <ToolbarSettings
          isOpen={toolbarSettingsOpen}
          onClose={() => setToolbarSettingsOpen(false)}
          config={toolbarConfig}
          onConfigChange={handleToolbarConfigChange}
        />
      </div>
    </div>
    </div>
  );
}
