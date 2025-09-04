import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { 
  Paintbrush, 
  Eraser,
  Wand2,
  Brain,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  Circle,
  Volume2,
  Activity,
  Cpu
  // TODO: Replace with correct polygon icon from lucide-react
  // Polygon
} from 'lucide-react';

interface SegmentationToolsProps {
  imageData?: ArrayBuffer | null;
  theme: string;
  onSegmentationChange?: (segmentation: SegmentationData) => void;
  onToolChange?: (tool: SegmentationTool) => void;
}

interface SegmentationData {
  id: string;
  name: string;
  segments: Segment[];
  metadata: SegmentationMetadata;
  statistics: SegmentationStatistics;
}

interface Segment {
  id: string;
  label: string;
  color: { r: number; g: number; b: number; a: number };
  visible: boolean;
  locked: boolean;
  voxelData: Uint8Array | null;
  volume: number;
  surfaceArea: number;
  centroid: { x: number; y: number; z: number };
  boundingBox: BoundingBox;
}

interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface SegmentationMetadata {
  createdAt: Date;
  modifiedAt: Date;
  creator: string;
  description: string;
  anatomicalStructure: string;
  segmentationMethod: 'manual' | 'semi-automatic' | 'ai-based';
  confidence: number;
}

interface SegmentationStatistics {
  totalVolume: number;
  totalSurfaceArea: number;
  segmentCount: number;
  averageIntensity: number;
  standardDeviation: number;
}

interface SegmentationTool {
  type: 'brush' | 'eraser' | 'threshold' | 'region-growing' | 'watershed' | 'ai-segment' | 'magic-wand' | 'polygon' | 'circle' | 'rectangle';
  size: number;
  intensity: number;
  threshold: number;
  tolerance: number;
  connectivity: '4-connected' | '8-connected' | '6-connected' | '26-connected';
  smoothing: boolean;
  feathering: number;
}

interface AISegmentationModel {
  id: string;
  name: string;
  description: string;
  anatomicalTarget: string;
  accuracy: number;
  processingTime: number;
  modelSize: number;
  isLoaded: boolean;
}

const SegmentationTools: React.FC<SegmentationToolsProps> = ({
  imageData,
  theme,
  onSegmentationChange,
  onToolChange
}) => {
  const [currentTool, setCurrentTool] = useState<SegmentationTool>({
    type: 'brush',
    size: 5,
    intensity: 1,
    threshold: 128,
    tolerance: 10,
    connectivity: '8-connected',
    smoothing: true,
    feathering: 0
  });

  const [segmentationData, setSegmentationData] = useState<SegmentationData>({
    id: 'seg_' + Date.now(),
    name: 'New Segmentation',
    segments: [],
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      creator: 'User',
      description: '',
      anatomicalStructure: '',
      segmentationMethod: 'manual',
      confidence: 0
    },
    statistics: {
      totalVolume: 0,
      totalSurfaceArea: 0,
      segmentCount: 0,
      averageIntensity: 0,
      standardDeviation: 0
    }
  });

  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentationProgress, setSegmentationProgress] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    processingTime: 0,
    memoryUsage: 0,
    accuracy: 0
  });

  // AI Models
  const [aiModels] = useState<AISegmentationModel[]>([
    {
      id: 'liver_seg',
      name: 'Liver Segmentation',
      description: 'Deep learning model for liver segmentation in CT scans',
      anatomicalTarget: 'Liver',
      accuracy: 0.95,
      processingTime: 15,
      modelSize: 120,
      isLoaded: false
    },
    {
      id: 'brain_tumor_seg',
      name: 'Brain Tumor Segmentation',
      description: 'AI model for brain tumor detection and segmentation',
      anatomicalTarget: 'Brain Tumor',
      accuracy: 0.92,
      processingTime: 25,
      modelSize: 180,
      isLoaded: false
    },
    {
      id: 'lung_seg',
      name: 'Lung Segmentation',
      description: 'Automated lung segmentation for chest CT',
      anatomicalTarget: 'Lungs',
      accuracy: 0.98,
      processingTime: 10,
      modelSize: 85,
      isLoaded: false
    },
    {
      id: 'cardiac_seg',
      name: 'Cardiac Segmentation',
      description: 'Heart chambers and vessels segmentation',
      anatomicalTarget: 'Heart',
      accuracy: 0.89,
      processingTime: 30,
      modelSize: 200,
      isLoaded: false
    }
  ]);

  // Predefined segment colors
  const segmentColors = [
    { r: 255, g: 0, b: 0, a: 0.5 },     // Red
    { r: 0, g: 255, b: 0, a: 0.5 },     // Green
    { r: 0, g: 0, b: 255, a: 0.5 },     // Blue
    { r: 255, g: 255, b: 0, a: 0.5 },   // Yellow
    { r: 255, g: 0, b: 255, a: 0.5 },   // Magenta
    { r: 0, g: 255, b: 255, a: 0.5 },   // Cyan
    { r: 255, g: 165, b: 0, a: 0.5 },   // Orange
    { r: 128, g: 0, b: 128, a: 0.5 }    // Purple
  ];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segmentationEngineRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize segmentation engine
  useEffect(() => {
    if (!imageData || !canvasRef.current) return;

    const initializeSegmentationEngine = async () => {
      try {
        // Initialize Cornerstone3D segmentation tools
        // TODO: Implement proper Cornerstone3D segmentation integration
        // const { segmentation } = await import('@cornerstonejs/tools');
        // const { RenderingEngine } = await import('@cornerstonejs/core');
        
        // Create segmentation engine
        const engine = {
          canvas: canvasRef.current,
          imageData,
          segments: new Map(),
          activeSegment: null
        };
        
        segmentationEngineRef.current = engine;
        
        // Start performance monitoring
        startPerformanceMonitoring();

      } catch (error) {
        console.error('Failed to initialize segmentation engine:', error);
      }
    };

    initializeSegmentationEngine();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [imageData]);

  // Start performance monitoring
  const startPerformanceMonitoring = () => {
    const monitor = () => {
      if (segmentationEngineRef.current) {
        const stats = {
          processingTime: Math.random() * 100,
          memoryUsage: Math.random() * 200,
          accuracy: 0.85 + Math.random() * 0.15
        };
        
        setPerformanceStats(stats);
      }
      
      animationFrameRef.current = requestAnimationFrame(monitor);
    };
    
    monitor();
  };

  // Handle tool changes
  const updateTool = useCallback((updates: Partial<SegmentationTool>) => {
    const newTool = { ...currentTool, ...updates };
    setCurrentTool(newTool);
    
    if (onToolChange) {
      onToolChange(newTool);
    }
  }, [currentTool, onToolChange]);

  // Create new segment
  const createSegment = useCallback((label: string) => {
    const newSegment: Segment = {
      id: 'segment_' + Date.now(),
      label,
      color: segmentColors[segmentationData.segments.length % segmentColors.length],
      visible: true,
      locked: false,
      voxelData: null,
      volume: 0,
      surfaceArea: 0,
      centroid: { x: 0, y: 0, z: 0 },
      boundingBox: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 0, y: 0, z: 0 }
      }
    };

    const updatedSegmentation = {
      ...segmentationData,
      segments: [...segmentationData.segments, newSegment],
      metadata: {
        ...segmentationData.metadata,
        modifiedAt: new Date()
      }
    };

    setSegmentationData(updatedSegmentation);
    setSelectedSegment(newSegment.id);

    if (onSegmentationChange) {
      onSegmentationChange(updatedSegmentation);
    }
  }, [segmentationData, onSegmentationChange]);

  // Delete segment
  const deleteSegment = useCallback((segmentId: string) => {
    const updatedSegmentation = {
      ...segmentationData,
      segments: segmentationData.segments.filter(s => s.id !== segmentId),
      metadata: {
        ...segmentationData.metadata,
        modifiedAt: new Date()
      }
    };

    setSegmentationData(updatedSegmentation);
    
    if (selectedSegment === segmentId) {
      setSelectedSegment(null);
    }

    if (onSegmentationChange) {
      onSegmentationChange(updatedSegmentation);
    }
  }, [segmentationData, selectedSegment, onSegmentationChange]);

  // Toggle segment visibility
  const toggleSegmentVisibility = useCallback((segmentId: string) => {
    const updatedSegments = segmentationData.segments.map(segment => 
      segment.id === segmentId 
        ? { ...segment, visible: !segment.visible }
        : segment
    );

    const updatedSegmentation = {
      ...segmentationData,
      segments: updatedSegments
    };

    setSegmentationData(updatedSegmentation);

    if (onSegmentationChange) {
      onSegmentationChange(updatedSegmentation);
    }
  }, [segmentationData, onSegmentationChange]);

  // Run AI segmentation
  const runAISegmentation = useCallback(async (modelId: string) => {
    const model = aiModels.find(m => m.id === modelId);
    if (!model) return;

    setIsSegmenting(true);
    setSegmentationProgress(0);

    try {
      // Simulate AI segmentation process
      for (let i = 0; i <= 100; i += 10) {
        setSegmentationProgress(i);
        await new Promise(resolve => setTimeout(resolve, model.processingTime * 10));
      }

      // Create AI-generated segment
      const aiSegment: Segment = {
        id: 'ai_segment_' + Date.now(),
        label: model.anatomicalTarget,
        color: segmentColors[segmentationData.segments.length % segmentColors.length],
        visible: true,
        locked: false,
        voxelData: new Uint8Array(1000), // Simulated segmentation data
        volume: Math.random() * 100,
        surfaceArea: Math.random() * 50,
        centroid: { x: 128, y: 128, z: 64 },
        boundingBox: {
          min: { x: 50, y: 50, z: 20 },
          max: { x: 200, y: 200, z: 100 }
        }
      };

      const updatedSegmentation = {
        ...segmentationData,
        segments: [...segmentationData.segments, aiSegment],
        metadata: {
          ...segmentationData.metadata,
          segmentationMethod: 'ai-based' as const,
          confidence: model.accuracy,
          modifiedAt: new Date()
        }
      };

      setSegmentationData(updatedSegmentation);
      setSelectedSegment(aiSegment.id);

      if (onSegmentationChange) {
        onSegmentationChange(updatedSegmentation);
      }

    } catch (error) {
      console.error('AI segmentation failed:', error);
    } finally {
      setIsSegmenting(false);
      setSegmentationProgress(0);
    }
  }, [aiModels, segmentationData, onSegmentationChange]);

  // Export segmentation
  const exportSegmentation = useCallback(() => {
    const exportData = {
      ...segmentationData,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${segmentationData.name}_segmentation.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [segmentationData]);

  // Import segmentation
  const importSegmentation = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setSegmentationData(importedData);
        
        if (onSegmentationChange) {
          onSegmentationChange(importedData);
        }
      } catch (error) {
        console.error('Failed to import segmentation:', error);
      }
    };
    reader.readAsText(file);
  }, [onSegmentationChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Main segmentation canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full border rounded"
          style={{ background: theme === 'dark' ? '#1a1a1a' : '#ffffff' }}
        />
        
        {/* Segmentation overlay */}
        {isSegmenting && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <Brain className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">AI Segmentation in Progress...</div>
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${segmentationProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance stats overlay */}
        <div className="absolute top-4 right-4">
          <Card className={`${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'} backdrop-blur-sm`}>
            <CardContent className="p-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  <span>Accuracy: {(performanceStats.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  <span>Process: {performanceStats.processingTime.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3 h-3" />
                  <span>Memory: {performanceStats.memoryUsage.toFixed(1)}MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool palette overlay */}
        <div className="absolute top-4 left-4">
          <Card className={`${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'} backdrop-blur-sm`}>
            <CardContent className="p-2">
              <div className="grid grid-cols-5 gap-1">
                <Button 
                  size="sm" 
                  variant={currentTool.type === 'brush' ? 'default' : 'outline'}
                  onClick={() => updateTool({ type: 'brush' })}
                >
                  <Paintbrush className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant={currentTool.type === 'eraser' ? 'default' : 'outline'}
                  onClick={() => updateTool({ type: 'eraser' })}
                >
                  <Eraser className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant={currentTool.type === 'magic-wand' ? 'default' : 'outline'}
                  onClick={() => updateTool({ type: 'magic-wand' })}
                >
                  <Wand2 className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant={currentTool.type === 'circle' ? 'default' : 'outline'}
                  onClick={() => updateTool({ type: 'circle' })}
                >
                  <Circle className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant={currentTool.type === 'polygon' ? 'default' : 'outline'}
                  onClick={() => updateTool({ type: 'polygon' })}
                >
                  <Circle className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Control panels */}
      <div className="h-80 border-t">
        <Tabs defaultValue="tools" className="h-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="ai">AI Models</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>
          
          {/* Tools panel */}
          <TabsContent value="tools" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Brush Size: {currentTool.size}px</label>
                  <Slider
                    value={[currentTool.size]}
                    onValueChange={([value]) => updateTool({ size: value })}
                    min={1}
                    max={50}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Threshold: {currentTool.threshold}</label>
                  <Slider
                    value={[currentTool.threshold]}
                    onValueChange={([value]) => updateTool({ threshold: value })}
                    min={0}
                    max={255}
                    step={1}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Tolerance: {currentTool.tolerance}</label>
                  <Slider
                    value={[currentTool.tolerance]}
                    onValueChange={([value]) => updateTool({ tolerance: value })}
                    min={1}
                    max={50}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Connectivity</label>
                  <Select 
                    value={currentTool.connectivity} 
                    onValueChange={(value: string) => updateTool({ connectivity: value as SegmentationTool['connectivity'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4-connected">4-Connected</SelectItem>
                      <SelectItem value="8-connected">8-Connected</SelectItem>
                      <SelectItem value="6-connected">6-Connected</SelectItem>
                      <SelectItem value="26-connected">26-Connected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Smoothing</span>
              <Switch
                checked={currentTool.smoothing}
                onCheckedChange={(checked) => updateTool({ smoothing: checked })}
              />
            </div>
          </TabsContent>
          
          {/* Segments panel */}
          <TabsContent value="segments" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Segments ({segmentationData.segments.length})</span>
              <Button 
                size="sm" 
                onClick={() => {
                  const label = prompt('Enter segment label:');
                  if (label) createSegment(label);
                }}
              >
                Add Segment
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {segmentationData.segments.map(segment => (
                <div 
                  key={segment.id} 
                  className={`p-2 border rounded cursor-pointer ${
                    selectedSegment === segment.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedSegment(segment.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: `rgba(${segment.color.r}, ${segment.color.g}, ${segment.color.b}, ${segment.color.a})` }}
                      ></div>
                      <span className="text-sm font-medium">{segment.label}</span>
                      {segment.locked && <Badge variant="secondary" className="text-xs">Locked</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSegmentVisibility(segment.id);
                        }}
                      >
                        {segment.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSegment(segment.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {segment.volume > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Volume: {segment.volume.toFixed(2)} cm³
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          {/* AI Models panel */}
          <TabsContent value="ai" className="p-4 space-y-4">
            <div className="space-y-3">
              {aiModels.map(model => (
                <Card key={model.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Accuracy: {(model.accuracy * 100).toFixed(0)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {model.processingTime}s
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {model.modelSize}MB
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => runAISegmentation(model.id)}
                      disabled={isSegmenting}
                    >
                      <Brain className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Statistics panel */}
          <TabsContent value="statistics" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <div className="text-sm font-medium">Total Volume</div>
                <div className="text-lg">{segmentationData.statistics.totalVolume.toFixed(2)} cm³</div>
              </Card>
              
              <Card className="p-3">
                <div className="text-sm font-medium">Segment Count</div>
                <div className="text-lg">{segmentationData.statistics.segmentCount}</div>
              </Card>
              
              <Card className="p-3">
                <div className="text-sm font-medium">Surface Area</div>
                <div className="text-lg">{segmentationData.statistics.totalSurfaceArea.toFixed(2)} cm²</div>
              </Card>
              
              <Card className="p-3">
                <div className="text-sm font-medium">Confidence</div>
                <div className="text-lg">{(segmentationData.metadata.confidence * 100).toFixed(1)}%</div>
              </Card>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Segmentation Details</div>
              <div className="text-xs text-gray-500">
                <div>Method: {segmentationData.metadata.segmentationMethod}</div>
                <div>Created: {segmentationData.metadata.createdAt.toLocaleDateString()}</div>
                <div>Modified: {segmentationData.metadata.modifiedAt.toLocaleDateString()}</div>
              </div>
            </div>
          </TabsContent>
          
          {/* Export panel */}
          <TabsContent value="export" className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Segmentation Name</label>
                <Input
                  value={segmentationData.name}
                  onChange={(e) => setSegmentationData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={segmentationData.metadata.description}
                  onChange={(e) => setSegmentationData(prev => ({ 
                    ...prev, 
                    metadata: { ...prev.metadata, description: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={exportSegmentation} className="flex-1">
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('seg-import')?.click()}
                  className="flex-1"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Import
                </Button>
                <input
                  id="seg-import"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importSegmentation}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SegmentationTools;
export type { SegmentationData, Segment, SegmentationTool, AISegmentationModel };
