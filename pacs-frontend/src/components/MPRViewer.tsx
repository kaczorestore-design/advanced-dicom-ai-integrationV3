import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RenderingEngine, volumeLoader, setVolumesForViewports } from '@cornerstonejs/core';
import { ToolGroupManager, Enums as ToolEnums } from '@cornerstonejs/tools';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Grid3X3, 
  RotateCcw, 
  Square,
  Circle,
  Ruler,
  Eye,
  EyeOff,
  Settings,
  Layers,
  Volume2,
  Maximize2
} from 'lucide-react';
import { getMPRViewportConfigs, getWindowLevelPresets } from '../utils/cornerstone3d-init';

interface MPRViewerProps {
  imageIds: string[];
  theme: string;
}

interface ViewportState {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  visible: boolean;
}

const MPRViewer: React.FC<MPRViewerProps> = ({ 
  imageIds, 
  theme 
}) => {
  const axialRef = useRef<HTMLDivElement>(null);
  const sagittalRef = useRef<HTMLDivElement>(null);
  const coronalRef = useRef<HTMLDivElement>(null);
  const volume3DRef = useRef<HTMLDivElement>(null);
  
  const [renderingEngine, setRenderingEngine] = useState<RenderingEngine | null>(null);
  const [volumeId] = useState<string>('volume-1'); // setVolumeId commented out - unused
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState('Soft Tissue');
  const [activeTool, setActiveTool] = useState('WindowLevel');
  const [viewportStates, setViewportStates] = useState<Record<string, ViewportState>>({
    axial: { windowWidth: 400, windowCenter: 40, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, visible: true },
    sagittal: { windowWidth: 400, windowCenter: 40, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, visible: true },
    coronal: { windowWidth: 400, windowCenter: 40, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, visible: true },
    volume3D: { windowWidth: 400, windowCenter: 40, zoom: 1, pan: { x: 0, y: 0 }, rotation: 0, visible: true },
  });
  // const [measurements, setMeasurements] = useState<any[]>([]); // Commented out - unused
  const [syncViewports, setSyncViewports] = useState(true);
  const [renderingMode, setRenderingMode] = useState<'mpr' | 'mip' | 'volume'>('mpr');

  const windowLevelPresets = getWindowLevelPresets();

  // Initialize MPR viewer
  const initializeMPR = useCallback(async () => {
    if (!imageIds || imageIds.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create rendering engine
      const engine = new RenderingEngine('mpr-rendering-engine');
      setRenderingEngine(engine);
      
      // Setup viewport elements
    const viewportConfigs = getMPRViewportConfigs();
    
    // Check if all elements are available
    if (!axialRef.current || !sagittalRef.current || !coronalRef.current) {
      console.error('Viewport elements not ready');
      return;
    }
    
    viewportConfigs.axial.element = axialRef.current;
    viewportConfigs.sagittal.element = sagittalRef.current;
    viewportConfigs.coronal.element = coronalRef.current;

    // Enable viewports
    const viewportInputArray = [
      { ...viewportConfigs.axial, element: axialRef.current! },
      { ...viewportConfigs.sagittal, element: sagittalRef.current! },
      { ...viewportConfigs.coronal, element: coronalRef.current! },
    ];

    engine.setViewports(viewportInputArray);
      
      // Create volume
      const volume = await volumeLoader.createAndCacheVolume(volumeId, {
        imageIds,
      });
      
      // Load the volume
      await volume.load();
      
      // Set volumes for viewports
      await setVolumesForViewports(
        engine,
        [
          {
            volumeId,
            callback: ({ volumeActor }) => {
              // Apply initial window/level
              const preset = windowLevelPresets[activePreset as keyof typeof windowLevelPresets];
              if (preset) {
                volumeActor.getProperty().setColorWindow(preset.windowWidth);
                volumeActor.getProperty().setColorLevel(preset.windowCenter);
              }
            },
          },
        ],
        ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL']
      );
      
      // Render all viewports
      engine.renderViewports(['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL']);
      
      // Setup tools
      setupTools(engine);
      
      console.log('MPR viewer initialized successfully');
    } catch (err) {
      console.error('Failed to initialize MPR viewer:', err);
      setError(`Failed to initialize MPR viewer: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageIds, volumeId, activePreset]);

  // Setup tools for MPR
  const setupTools = (engine: RenderingEngine) => {
    try {
      // Create tool group
      const toolGroupId = 'mpr-tool-group';
      let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      
      if (!toolGroup) {
        toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
      }
      
      // Add tools to the tool group
      const tools = [
        'WindowLevelTool',
        'PanTool', 
        'ZoomTool',
        'StackScrollMouseWheelTool',
        'LengthTool',
        'RectangleROITool',
        'EllipticalROITool',
        'CircleROITool',
        'BidirectionalTool',
        'AngleTool',
        'CobbAngleTool',
        'ArrowAnnotateTool',
        'ProbeTool',
      ];
      
      tools.forEach(toolName => {
        try {
          toolGroup?.addTool(toolName);
        } catch (err) {
          console.warn(`Failed to add tool ${toolName}:`, err);
        }
      });
      
      // Set tool modes
      if (toolGroup) {
        toolGroup.setToolActive('WindowLevelTool', {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
        });
        
        toolGroup.setToolActive('PanTool', {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
        });
        
        toolGroup.setToolActive('ZoomTool', {
          bindings: [{ mouseButton: ToolEnums.MouseBindings.Secondary }],
        });
        
        toolGroup.setToolActive('StackScrollMouseWheelTool');
        
        // Add viewports to tool group
        const viewportIds = ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL'];
        toolGroup.addViewport(viewportIds[0], engine.id);
        toolGroup.addViewport(viewportIds[1], engine.id);
        toolGroup.addViewport(viewportIds[2], engine.id);
      }
      
    } catch (err) {
      console.error('Failed to setup tools:', err);
    }
  };

  // Handle window/level preset change
  const handlePresetChange = (presetName: string) => {
    setActivePreset(presetName);
    const preset = windowLevelPresets[presetName as keyof typeof windowLevelPresets];
    
    if (renderingEngine && preset) {
      const viewportIds = ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL'];
      viewportIds.forEach(viewportId => {
        const viewport = renderingEngine.getViewport(viewportId) as any;
        if (viewport && viewport.setProperties) {
          viewport.setProperties({
            voiRange: {
              lower: preset.windowCenter - preset.windowWidth / 2,
              upper: preset.windowCenter + preset.windowWidth / 2,
            },
          });
          viewport.render();
        }
      });
    }
    
    // Update all viewport states
    setViewportStates(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = {
          ...updated[key],
          windowWidth: preset.windowWidth,
          windowCenter: preset.windowCenter,
        };
      });
      return updated;
    });
  };

  // Handle tool change
  const handleToolChange = (toolName: string) => {
    setActiveTool(toolName);
    
    if (renderingEngine) {
      const toolGroupId = 'mpr-tool-group';
      const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      
      if (toolGroup) {
        // Deactivate all tools first
        toolGroup.setToolPassive('LengthTool');
        toolGroup.setToolPassive('RectangleROITool');
        toolGroup.setToolPassive('EllipticalROITool');
        toolGroup.setToolPassive('CircleROITool');
        toolGroup.setToolPassive('BidirectionalTool');
        toolGroup.setToolPassive('AngleTool');
        toolGroup.setToolPassive('CobbAngleTool');
        toolGroup.setToolPassive('ArrowAnnotateTool');
        toolGroup.setToolPassive('ProbeTool');
        
        // Activate selected tool
        if (toolName !== 'WindowLevel') {
          toolGroup.setToolActive(toolName, {
            bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
          });
        }
      }
    }
  };

  // Toggle viewport visibility
  const toggleViewportVisibility = (viewportKey: string) => {
    setViewportStates(prev => ({
      ...prev,
      [viewportKey]: {
        ...prev[viewportKey],
        visible: !prev[viewportKey].visible,
      },
    }));
  };

  // Reset all viewports
  const resetViewports = () => {
    if (renderingEngine) {
      const viewportIds = ['CT_AXIAL', 'CT_SAGITTAL', 'CT_CORONAL'];
      viewportIds.forEach(viewportId => {
        const viewport = renderingEngine.getViewport(viewportId);
        if (viewport) {
          viewport.resetCamera();
          viewport.render();
        }
      });
    }
  };

  // Initialize when component mounts or imageIds change
  useEffect(() => {
    if (imageIds && imageIds.length > 0) {
      initializeMPR();
    }
    
    return () => {
      // Cleanup
      if (renderingEngine) {
        renderingEngine.destroy();
      }
    };
  }, [initializeMPR]);

  return (
    <div className={`w-full h-full flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* MPR Controls */}
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-blue-500" />
            <span>Multi-Planar Reconstruction</span>
            <Badge variant="outline" className="ml-2">
              {renderingMode.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Window/Level Presets */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Preset:</label>
              <Select value={activePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(windowLevelPresets).map(preset => (
                    <SelectItem key={preset} value={preset}>
                      {preset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Tool Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Tool:</label>
              <div className="flex gap-1">
                {[
                  { name: 'WindowLevel', icon: Settings, label: 'W/L' },
                  { name: 'LengthTool', icon: Ruler, label: 'Length' },
                  { name: 'RectangleROITool', icon: Square, label: 'ROI' },
                  { name: 'EllipticalROITool', icon: Circle, label: 'Ellipse' },
                ].map(tool => (
                  <Button
                    key={tool.name}
                    size="sm"
                    variant={activeTool === tool.name ? 'default' : 'outline'}
                    onClick={() => handleToolChange(tool.name)}
                    className="px-2"
                  >
                    <tool.icon className="w-4 h-4" />
                    <span className="ml-1 text-xs">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Rendering Mode */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Mode:</label>
              <div className="flex gap-1">
                {[
                  { mode: 'mpr', icon: Grid3X3, label: 'MPR' },
                  { mode: 'mip', icon: Layers, label: 'MIP' },
                  { mode: 'volume', icon: Volume2, label: '3D' },
                ].map(mode => (
                  <Button
                    key={mode.mode}
                    size="sm"
                    variant={renderingMode === mode.mode ? 'default' : 'outline'}
                    onClick={() => setRenderingMode(mode.mode as any)}
                    className="px-2"
                  >
                    <mode.icon className="w-4 h-4" />
                    <span className="ml-1 text-xs">{mode.label}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetViewports}>
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button 
                size="sm" 
                variant={syncViewports ? 'default' : 'outline'}
                onClick={() => setSyncViewports(!syncViewports)}
              >
                <Maximize2 className="w-4 h-4" />
                Sync
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MPR Viewports Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
        {/* Axial View */}
        <div className={`relative border rounded-lg overflow-hidden ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'
        } ${!viewportStates.axial.visible ? 'opacity-50' : ''}`}>
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Axial
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleViewportVisibility('axial')}
              className="p-1 h-6 w-6"
            >
              {viewportStates.axial.visible ? 
                <Eye className="w-3 h-3" /> : 
                <EyeOff className="w-3 h-3" />
              }
            </Button>
          </div>
          <div 
            ref={axialRef}
            className="w-full h-full min-h-[200px]"
            style={{ display: viewportStates.axial.visible ? 'block' : 'none' }}
          />
        </div>

        {/* Sagittal View */}
        <div className={`relative border rounded-lg overflow-hidden ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'
        } ${!viewportStates.sagittal.visible ? 'opacity-50' : ''}`}>
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Sagittal
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleViewportVisibility('sagittal')}
              className="p-1 h-6 w-6"
            >
              {viewportStates.sagittal.visible ? 
                <Eye className="w-3 h-3" /> : 
                <EyeOff className="w-3 h-3" />
              }
            </Button>
          </div>
          <div 
            ref={sagittalRef}
            className="w-full h-full min-h-[200px]"
            style={{ display: viewportStates.sagittal.visible ? 'block' : 'none' }}
          />
        </div>

        {/* Coronal View */}
        <div className={`relative border rounded-lg overflow-hidden ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'
        } ${!viewportStates.coronal.visible ? 'opacity-50' : ''}`}>
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Coronal
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleViewportVisibility('coronal')}
              className="p-1 h-6 w-6"
            >
              {viewportStates.coronal.visible ? 
                <Eye className="w-3 h-3" /> : 
                <EyeOff className="w-3 h-3" />
              }
            </Button>
          </div>
          <div 
            ref={coronalRef}
            className="w-full h-full min-h-[200px]"
            style={{ display: viewportStates.coronal.visible ? 'block' : 'none' }}
          />
        </div>

        {/* 3D/Volume View */}
        <div className={`relative border rounded-lg overflow-hidden ${
          theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-300 bg-white'
        } ${!viewportStates.volume3D.visible ? 'opacity-50' : ''}`}>
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              3D Volume
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleViewportVisibility('volume3D')}
              className="p-1 h-6 w-6"
            >
              {viewportStates.volume3D.visible ? 
                <Eye className="w-3 h-3" /> : 
                <EyeOff className="w-3 h-3" />
              }
            </Button>
          </div>
          <div 
            ref={volume3DRef}
            className="w-full h-full min-h-[200px]"
            style={{ display: viewportStates.volume3D.visible ? 'block' : 'none' }}
          />
        </div>
      </div>

      {/* Loading/Error States */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Initializing MPR viewer...</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={() => setError(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MPRViewer;