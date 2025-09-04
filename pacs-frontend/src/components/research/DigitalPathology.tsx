import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';

// Replaced Material-UI with Radix UI and HTML equivalents
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Target as CenterIcon,
  Fullscreen as FullscreenIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Eye as VisibilityIcon,
  ChevronDown as ExpandMoreIcon,
  Play as PlayIcon,
  Square as StopIcon,
  BarChart3 as AnalyticsIcon,
  Palette as ColorizeIcon,
  Layers as LayersIcon
} from 'lucide-react';

// Interfaces for Digital Pathology
interface PathologySlide {
  id: string;
  name: string;
  patient_id: string;
  case_id: string;
  stain_type: 'H&E' | 'IHC' | 'IF' | 'PAS' | 'Trichrome' | 'Other';
  magnification_levels: number[];
  tile_size: number;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  pixel_size_microns: number;
  file_size_mb: number;
  format: 'SVS' | 'NDPI' | 'VSI' | 'SCN' | 'TIFF' | 'Other';
  acquisition_date: string;
  scanner_model: string;
  metadata: Record<string, any>;
  annotations: PathologyAnnotation[];
  analysis_results: AnalysisResult[];
}

interface PathologyAnnotation {
  id: string;
  type: 'region' | 'point' | 'line' | 'polygon' | 'circle' | 'rectangle';
  coordinates: number[][];
  label: string;
  category: 'tumor' | 'normal' | 'necrosis' | 'inflammation' | 'artifact' | 'other';
  confidence?: number;
  created_by: string;
  created_date: string;
  properties: {
    color: string;
    thickness: number;
    opacity: number;
    visible: boolean;
  };
  measurements?: {
    area_mm2?: number;
    perimeter_mm?: number;
    diameter_mm?: number;
  };
}

interface AnalysisResult {
  id: string;
  algorithm: string;
  version: string;
  parameters: Record<string, any>;
  results: {
    cell_count?: number;
    tumor_percentage?: number;
    mitotic_count?: number;
    nuclear_grade?: number;
    staining_intensity?: 'negative' | 'weak' | 'moderate' | 'strong';
    positive_cells_percentage?: number;
    features: FeatureVector;
  };
  confidence_score: number;
  processing_time_ms: number;
  created_date: string;
  roi_id?: string;
}

interface FeatureVector {
  morphological: {
    cell_area_mean: number;
    cell_area_std: number;
    nucleus_area_mean: number;
    nucleus_area_std: number;
    nucleus_circularity: number;
    cell_density: number;
  };
  textural: {
    contrast: number;
    correlation: number;
    energy: number;
    homogeneity: number;
    entropy: number;
  };
  color: {
    hue_mean: number;
    saturation_mean: number;
    brightness_mean: number;
    color_variance: number;
  };
}

interface ViewerState {
  zoom_level: number;
  center_x: number;
  center_y: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

interface AnalysisConfig {
  cell_detection: {
    enabled: boolean;
    algorithm: 'watershed' | 'deep_learning' | 'threshold' | 'contour';
    min_cell_size: number;
    max_cell_size: number;
    sensitivity: number;
  };
  tissue_segmentation: {
    enabled: boolean;
    method: 'color_deconvolution' | 'machine_learning' | 'threshold';
    tissue_types: string[];
  };
  quantification: {
    enabled: boolean;
    metrics: string[];
    roi_based: boolean;
  };
  quality_control: {
    blur_detection: boolean;
    artifact_detection: boolean;
    staining_quality: boolean;
  };
}

interface BatchAnalysis {
  id: string;
  name: string;
  slides: string[];
  config: AnalysisConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  started_date?: string;
  completed_date?: string;
  results_summary?: {
    total_slides: number;
    successful: number;
    failed: number;
    average_processing_time: number;
  };
}

const DigitalPathology: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSlide, setSelectedSlide] = useState<PathologySlide | null>(null);
  const [slides, setSlides] = useState<PathologySlide[]>([]);
  const [viewerState, setViewerState] = useState<ViewerState>({
    zoom_level: 1,
    center_x: 0,
    center_y: 0,
    rotation: 0,
    brightness: 50,
    contrast: 50,
    saturation: 50,
    gamma: 1
  });
  const [annotations, setAnnotations] = useState<PathologyAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    cell_detection: {
      enabled: true,
      algorithm: 'deep_learning',
      min_cell_size: 10,
      max_cell_size: 200,
      sensitivity: 0.8
    },
    tissue_segmentation: {
      enabled: true,
      method: 'color_deconvolution',
      tissue_types: ['epithelium', 'stroma', 'necrosis']
    },
    quantification: {
      enabled: true,
      metrics: ['cell_count', 'area', 'intensity'],
      roi_based: true
    },
    quality_control: {
      blur_detection: true,
      artifact_detection: true,
      staining_quality: true
    }
  });
  // TODO: Uncomment when implementing batch analysis and dialog features
  // const [batchAnalyses, setBatchAnalyses] = useState<BatchAnalysis[]>([]);
  // const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  // const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  // const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Mock data initialization
  useEffect(() => {
    const mockSlides: PathologySlide[] = [
      {
        id: 'slide_001',
        name: 'Breast Biopsy - H&E',
        patient_id: 'PAT_001',
        case_id: 'CASE_001',
        stain_type: 'H&E',
        magnification_levels: [1, 2, 5, 10, 20, 40],
        tile_size: 256,
        dimensions: { width: 50000, height: 40000 },
        pixel_size_microns: 0.25,
        file_size_mb: 1200,
        format: 'SVS',
        acquisition_date: '2024-01-15',
        scanner_model: 'Aperio AT2',
        metadata: {},
        annotations: [],
        analysis_results: []
      },
      {
        id: 'slide_002',
        name: 'Prostate Core - IHC Ki67',
        patient_id: 'PAT_002',
        case_id: 'CASE_002',
        stain_type: 'IHC',
        magnification_levels: [1, 2, 5, 10, 20, 40],
        tile_size: 256,
        dimensions: { width: 45000, height: 35000 },
        pixel_size_microns: 0.25,
        file_size_mb: 980,
        format: 'NDPI',
        acquisition_date: '2024-01-16',
        scanner_model: 'Hamamatsu NanoZoomer',
        metadata: {},
        annotations: [],
        analysis_results: []
      }
    ];
    setSlides(mockSlides);
    setSelectedSlide(mockSlides[0]);
  }, []);

  // Viewer functions
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setViewerState(prev => ({
      ...prev,
      zoom_level: direction === 'in' 
        ? Math.min(prev.zoom_level * 1.5, 40)
        : Math.max(prev.zoom_level / 1.5, 0.1)
    }));
  }, []);

  // TODO: Uncomment when implementing pan functionality
  // const handlePan = useCallback((deltaX: number, deltaY: number) => {
  //   setViewerState(prev => ({
  //     ...prev,
  //     center_x: prev.center_x + deltaX,
  //     center_y: prev.center_y + deltaY
  //   }));
  // }, []);

  const resetView = useCallback(() => {
    setViewerState({
      zoom_level: 1,
      center_x: 0,
      center_y: 0,
      rotation: 0,
      brightness: 50,
      contrast: 50,
      saturation: 50,
      gamma: 1
    });
  }, []);

  // Analysis functions
  const runAnalysis = useCallback(async () => {
    if (!selectedSlide) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  }, [selectedSlide]);

  // TODO: Uncomment when implementing add annotation functionality
  // const addAnnotation = useCallback((annotation: Omit<PathologyAnnotation, 'id' | 'created_date'>) => {
  //   const newAnnotation: PathologyAnnotation = {
  //     ...annotation,
  //     id: `ann_${Date.now()}`,
  //     created_date: new Date().toISOString()
  //   };
  //   setAnnotations(prev => [...prev, newAnnotation]);
  // }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<PathologyAnnotation>) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ));
  }, []);

  // TODO: Uncomment when implementing delete annotation functionality
  // const deleteAnnotation = useCallback((id: string) => {
  //   setAnnotations(prev => prev.filter(ann => ann.id !== id));
  //   if (selectedAnnotation === id) {
  //     setSelectedAnnotation(null);
  //   }
  // }, [selectedAnnotation]);

  // Render functions
  const renderSlideViewer = () => (
    <div className="bg-white border border-gray-200 rounded-lg h-full">
      <div className="p-1 h-full">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedSlide?.name || 'No slide selected'}
          </h3>
          <div className="flex space-x-1">
            <button 
              onClick={() => handleZoom('in')}
              className="p-1 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <ZoomInIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => handleZoom('out')}
              className="p-1 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <ZoomOutIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={resetView}
              className="p-1 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <CenterIcon className="h-4 w-4" />
            </button>
            <button className="p-1 text-gray-400 hover:text-gray-600 border border-gray-300 rounded">
              <FullscreenIcon className="h-4 w-4" />
            </button>
            <button 
              // onClick={() => setShowSettingsDialog(true)}
              className="p-1 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div 
          ref={viewerRef}
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          style={{ 
            height: 'calc(100% - 60px)', 
            position: 'relative',
            overflow: 'hidden',
            cursor: 'grab'
          }}
          onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
          onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
          onMouseLeave={(e) => e.currentTarget.style.cursor = 'grab'}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: `brightness(${viewerState.brightness}%) contrast(${viewerState.contrast}%) saturate(${viewerState.saturation}%)`
            }}
          />
          
          {/* Overlay for annotations */}
          <div
            className="absolute inset-0 pointer-events-none"
          >
            {annotations.map(annotation => (
              <div
                key={annotation.id}
                className="absolute pointer-events-auto cursor-pointer"
                style={{
                  border: `2px solid ${annotation.properties.color}`,
                  opacity: annotation.properties.opacity,
                  display: annotation.properties.visible ? 'block' : 'none'
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              />
            ))}
          </div>
          
          {/* Zoom level indicator */}
          <span
            className="absolute top-2 right-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            {`${(viewerState.zoom_level * 100).toFixed(0)}%`}
          </span>
        </div>
      </div>
    </div>
  );

  const renderSlideList = () => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Slide Collection</h3>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <UploadIcon className="h-4 w-4 mr-2" />
            Import Slides
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slides.map((slide) => (
                <tr 
                  key={slide.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedSlide?.id === slide.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedSlide(slide)}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {slide.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {slide.patient_id} - {slide.case_id}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {slide.stain_type}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {slide.file_size_mb} MB
                    </div>
                    <div className="text-sm text-gray-500">
                      {slide.dimensions.width} × {slide.dimensions.height}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(slide.acquisition_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <VisibilityIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <AnalyticsIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <DownloadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnnotationPanel = () => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Annotations</h3>
          <button 
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            // onClick={() => setShowAnnotationDialog(true)}
          >
            <ColorizeIcon className="h-4 w-4 mr-2" />
            Add Annotation
          </button>
        </div>
        
        <div className="space-y-2">
          {annotations.map((annotation) => (
            <React.Fragment key={annotation.id}>
              <div
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  selectedAnnotation === annotation.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: annotation.properties.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{annotation.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {annotation.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {annotation.type} - {annotation.created_by}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="p-1 rounded hover:bg-gray-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateAnnotation(annotation.id, {
                        properties: {
                          ...annotation.properties,
                          visible: !annotation.properties.visible
                        }
                      });
                    }}
                  >
                    <VisibilityIcon 
                      className={`h-4 w-4 ${
                        annotation.properties.visible ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        
        {annotations.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No annotations yet. Click "Add Annotation" to start.
          </p>
        )}
      </div>
    </div>
  );

  const renderAnalysisPanel = () => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analysis Tools</h3>
          <button 
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
              !selectedSlide || isAnalyzing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
            onClick={runAnalysis}
            disabled={!selectedSlide || isAnalyzing}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
        
        {isAnalyzing && (
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">
              Analysis Progress: {analysisProgress}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}
        
        <details className="bg-white border border-gray-200 rounded-lg" open>
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between bg-gray-50 hover:bg-gray-100">
            <span className="text-sm font-medium text-gray-900">Cell Detection</span>
            <ExpandMoreIcon className="h-5 w-5 text-gray-500" />
          </summary>
          <div className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={analysisConfig.cell_detection.enabled}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      cell_detection: {
                        ...prev.cell_detection,
                        enabled: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Cell Detection</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                <select
                  value={analysisConfig.cell_detection.algorithm}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    cell_detection: {
                      ...prev.cell_detection,
                      algorithm: e.target.value as any
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="watershed">Watershed</option>
                  <option value="deep_learning">Deep Learning</option>
                  <option value="threshold">Threshold</option>
                  <option value="contour">Contour</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Cell Size</label>
                  <input
                    type="number"
                    value={analysisConfig.cell_detection.min_cell_size}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      cell_detection: {
                        ...prev.cell_detection,
                        min_cell_size: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Cell Size</label>
                  <input
                    type="number"
                    value={analysisConfig.cell_detection.max_cell_size}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      cell_detection: {
                        ...prev.cell_detection,
                        max_cell_size: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sensitivity: {analysisConfig.cell_detection.sensitivity}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={analysisConfig.cell_detection.sensitivity}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    cell_detection: {
                      ...prev.cell_detection,
                      sensitivity: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </div>
        </details>
        
        <details className="bg-white border border-gray-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between bg-gray-50 hover:bg-gray-100">
            <span className="text-sm font-medium text-gray-900">Tissue Segmentation</span>
            <ExpandMoreIcon className="h-5 w-5 text-gray-500" />
          </summary>
          <div className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={analysisConfig.tissue_segmentation.enabled}
                    onChange={(e) => setAnalysisConfig(prev => ({
                      ...prev,
                      tissue_segmentation: {
                        ...prev.tissue_segmentation,
                        enabled: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Tissue Segmentation</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={analysisConfig.tissue_segmentation.method}
                  onChange={(e) => setAnalysisConfig(prev => ({
                    ...prev,
                    tissue_segmentation: {
                      ...prev.tissue_segmentation,
                      method: e.target.value as any
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="color_deconvolution">Color Deconvolution</option>
                  <option value="machine_learning">Machine Learning</option>
                  <option value="threshold">Threshold</option>
                </select>
              </div>
            </div>
          </div>
        </details>
        
        <details className="bg-white border border-gray-200 rounded-lg">
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between bg-gray-50 hover:bg-gray-100">
            <span className="text-sm font-medium text-gray-900">Quality Control</span>
            <ExpandMoreIcon className="h-5 w-5 text-gray-500" />
          </summary>
          <div className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={analysisConfig.quality_control.blur_detection}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisConfig(prev => ({
                      ...prev,
                      quality_control: {
                        ...prev.quality_control,
                        blur_detection: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Blur Detection</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={analysisConfig.quality_control.artifact_detection}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisConfig(prev => ({
                      ...prev,
                      quality_control: {
                        ...prev.quality_control,
                        artifact_detection: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Artifact Detection</span>
                </label>
              </div>
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={analysisConfig.quality_control.staining_quality}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisConfig(prev => ({
                      ...prev,
                      quality_control: {
                        ...prev.quality_control,
                        staining_quality: e.target.checked
                      }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Staining Quality</span>
                </label>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );

  const renderBatchAnalysis = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Analysis</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-blue-800 text-sm">Configure and run analysis on multiple slides simultaneously.</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slides</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[].map((batch: BatchAnalysis) => (
                <tr key={batch.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{batch.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="relative inline-flex items-center">
                      <LayersIcon className="h-5 w-5" />
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                        {batch.slides.length}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                      batch.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
                      batch.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${batch.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {batch.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-1">
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <PlayIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <StopIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 p-1">
                        <DownloadIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Digital Pathology Platform
      </h1>
      
      <Tabs.Root value={activeTab.toString()} onValueChange={(value) => setActiveTab(parseInt(value))} className="mb-6">
        <Tabs.List className="flex border-b border-gray-200">
          <Tabs.Trigger value="0" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">Slide Viewer</Tabs.Trigger>
          <Tabs.Trigger value="1" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">Analysis Tools</Tabs.Trigger>
          <Tabs.Trigger value="2" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600">Batch Processing</Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="0" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
            {renderSlideViewer()}
          </div>
          <div className="w-full md:w-1/3">
            <div className="space-y-4">
              <div>
                {renderSlideList()}
              </div>
              <div>
                {renderAnnotationPanel()}
              </div>
            </div>
          </div>
        </div>
        </Tabs.Content>
        
        <Tabs.Content value="1" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {renderSlideViewer()}
            </div>
            <div className="md:col-span-1">
              {renderAnalysisPanel()}
            </div>
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="2" className="mt-6">
          {renderBatchAnalysis()}
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default DigitalPathology;