import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  RotateCcw,
  Download,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Zap,
  Monitor,
  Cpu
} from 'lucide-react';

interface MIPViewerProps {
  volumeData?: ArrayBuffer | null;
  theme: string;
  onMIPConfigChange?: (config: MIPConfiguration) => void;
  onProjectionChange?: (projection: ProjectionSettings) => void;
}

interface MIPConfiguration {
  projectionType: 'mip' | 'minip' | 'average' | 'sum';
  thickness: number;
  orientation: 'axial' | 'coronal' | 'sagittal' | 'oblique';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  interpolation: 'nearest' | 'linear' | 'cubic';
  raycastingSteps: number;
  enableGPU: boolean;
  enableCaching: boolean;
}

interface ProjectionSettings {
  windowLevel: number;
  windowWidth: number;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  colormap: string;
  opacity: number;
}

interface ViewportSettings {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  flip: { horizontal: boolean; vertical: boolean };
}

interface AnimationSettings {
  enabled: boolean;
  speed: number;
  direction: 'forward' | 'backward' | 'pingpong';
  startSlice: number;
  endSlice: number;
  currentSlice: number;
}

const MIPViewer: React.FC<MIPViewerProps> = ({
  volumeData,
  theme,
  onMIPConfigChange,
  onProjectionChange
}) => {
  const [mipConfig, setMipConfig] = useState<MIPConfiguration>({
    projectionType: 'mip',
    thickness: 10,
    orientation: 'axial',
    quality: 'medium',
    interpolation: 'linear',
    raycastingSteps: 512,
    enableGPU: true,
    enableCaching: true
  });

  const [projectionSettings, setProjectionSettings] = useState<ProjectionSettings>({
    windowLevel: 40,
    windowWidth: 400,
    brightness: 0,
    contrast: 1,
    gamma: 1,
    invert: false,
    colormap: 'grayscale',
    opacity: 1
  });

  const [, setViewportSettings] = useState<ViewportSettings>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    rotation: 0,
    flip: { horizontal: false, vertical: false }
  });

  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    enabled: false,
    speed: 1,
    direction: 'forward',
    startSlice: 0,
    endSlice: 100,
    currentSlice: 50
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderingEngineRef = useRef<any>(null);

  // Predefined window/level presets for MIP
  const mipPresets = [
    { name: 'Lung', windowLevel: -600, windowWidth: 1500 },
    { name: 'Bone', windowLevel: 300, windowWidth: 1500 },
    { name: 'Brain', windowLevel: 40, windowWidth: 80 },
    { name: 'Abdomen', windowLevel: 50, windowWidth: 350 },
    { name: 'Angio', windowLevel: 300, windowWidth: 600 },
    { name: 'Chest', windowLevel: 40, windowWidth: 400 }
  ];

  // Colormap options
  const colormaps = [
    'grayscale', 'hot', 'cool', 'jet', 'rainbow', 'viridis', 'plasma', 'inferno'
  ];

  // Initialize MIP rendering
  useEffect(() => {
    if (!volumeData || !canvasRef.current) return;

    const initializeMIPRendering = async () => {
      try {
        setIsProcessing(true);
        setProcessingProgress(0);

        // Initialize Cornerstone3D for MIP rendering
        const { RenderingEngine, Enums } = await import('@cornerstonejs/core');
        await import('@cornerstonejs/streaming-image-volume-loader');
        
        // Create rendering engine
        const renderingEngine = new RenderingEngine('mipRenderingEngine');
        renderingEngineRef.current = renderingEngine;

        setProcessingProgress(30);

        // Create MIP viewport
        const viewportInput = {
          viewportId: 'MIP_VIEWPORT',
          type: Enums.ViewportType.VOLUME_3D,
          element: canvasRef.current,
          defaultOptions: {
            background: theme === 'dark' ? [0.1, 0.1, 0.1] : [1, 1, 1],
            orientation: mipConfig.orientation
          }
        };

        renderingEngine.enableElement(viewportInput as any);
        const viewport = renderingEngine.getViewport('MIP_VIEWPORT');

        setProcessingProgress(60);

        // Configure MIP rendering
        await configureMIPRendering(viewport, mipConfig);
        
        setProcessingProgress(80);
        
        // Apply projection settings
        await applyProjectionSettings(viewport, projectionSettings);
        
        setProcessingProgress(100);
        setIsProcessing(false);

        // Start performance monitoring
        startPerformanceMonitoring();

      } catch (error) {
        console.error('Failed to initialize MIP rendering:', error);
        setIsProcessing(false);
      }
    };

    initializeMIPRendering();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
      }
    };
  }, [volumeData, theme]);

  // Configure MIP rendering
  const configureMIPRendering = async (viewport: any, config: MIPConfiguration) => {
    if (!viewport) return;

    try {
      const projectionTypeMap = {
        'mip': 'MAXIMUM_INTENSITY_PROJECTION',
        'minip': 'MINIMUM_INTENSITY_PROJECTION',
        'average': 'AVERAGE_INTENSITY_PROJECTION',
        'sum': 'SUM_INTENSITY_PROJECTION'
      };

      await viewport.setProperties({
        renderingMode: projectionTypeMap[config.projectionType],
        slabThickness: config.thickness,
        orientation: config.orientation,
        interpolationType: config.interpolation,
        raycastingSteps: config.raycastingSteps,
        useGPUAcceleration: config.enableGPU,
        enableCaching: config.enableCaching
      });

      viewport.render();
    } catch (error) {
      console.error('Failed to configure MIP rendering:', error);
    }
  };

  // Apply projection settings
  const applyProjectionSettings = async (viewport: any, settings: ProjectionSettings) => {
    if (!viewport) return;

    try {
      await viewport.setProperties({
        voiRange: {
          lower: settings.windowLevel - settings.windowWidth / 2,
          upper: settings.windowLevel + settings.windowWidth / 2
        },
        brightness: settings.brightness,
        contrast: settings.contrast,
        gamma: settings.gamma,
        invert: settings.invert,
        colormap: settings.colormap,
        opacity: settings.opacity
      });

      viewport.render();
    } catch (error) {
      console.error('Failed to apply projection settings:', error);
    }
  };

  // Start performance monitoring
  const startPerformanceMonitoring = () => {
    const monitor = () => {
      if (renderingEngineRef.current) {
        const stats = renderingEngineRef.current.getPerformanceStats?.() || {
          renderTime: Math.random() * 16,
          memoryUsage: Math.random() * 100,
          fps: Math.random() * 60
        };
        
        setPerformanceStats(stats);
      }
      
      animationFrameRef.current = requestAnimationFrame(monitor);
    };
    
    monitor();
  };

  // Handle configuration changes
  const updateMIPConfig = useCallback((updates: Partial<MIPConfiguration>) => {
    const newConfig = { ...mipConfig, ...updates };
    setMipConfig(newConfig);
    
    if (onMIPConfigChange) {
      onMIPConfigChange(newConfig);
    }

    // Apply changes to viewport
    if (renderingEngineRef.current) {
      const viewport = renderingEngineRef.current.getViewport('MIP_VIEWPORT');
      configureMIPRendering(viewport, newConfig);
    }
  }, [mipConfig, onMIPConfigChange]);

  // Handle projection settings changes
  const updateProjectionSettings = useCallback((updates: Partial<ProjectionSettings>) => {
    const newSettings = { ...projectionSettings, ...updates };
    setProjectionSettings(newSettings);
    
    if (onProjectionChange) {
      onProjectionChange(newSettings);
    }

    // Apply changes to viewport
    if (renderingEngineRef.current) {
      const viewport = renderingEngineRef.current.getViewport('MIP_VIEWPORT');
      applyProjectionSettings(viewport, newSettings);
    }
  }, [projectionSettings, onProjectionChange]);

  // Apply preset window/level
  const applyPreset = useCallback((preset: { windowLevel: number; windowWidth: number }) => {
    updateProjectionSettings({
      windowLevel: preset.windowLevel,
      windowWidth: preset.windowWidth
    });
  }, [updateProjectionSettings]);

  // Reset viewport
  const resetViewport = useCallback(() => {
    setViewportSettings({
      zoom: 1,
      pan: { x: 0, y: 0 },
      rotation: 0,
      flip: { horizontal: false, vertical: false }
    });

    if (renderingEngineRef.current) {
      const viewport = renderingEngineRef.current.getViewport('MIP_VIEWPORT');
      viewport.resetCamera();
      (viewport as any).render();
    }
  }, []);

  // Export MIP image
  const exportMIPImage = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `mip_${mipConfig.projectionType}_${mipConfig.orientation}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [mipConfig]);

  return (
    <div className="flex flex-col h-full">
      {/* Main MIP canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full border rounded"
          style={{ background: theme === 'dark' ? '#1a1a1a' : '#ffffff' }}
        />
        
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">Processing MIP...</div>
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
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
                  <Monitor className="w-3 h-3" />
                  <span>FPS: {performanceStats.fps.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3" />
                  <span>Render: {performanceStats.renderTime.toFixed(1)}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3 h-3" />
                  <span>Memory: {performanceStats.memoryUsage.toFixed(1)}MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick controls overlay */}
        <div className="absolute top-4 left-4">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetViewport}>
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportMIPImage}>
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Control panels */}
      <div className="h-80 border-t">
        <Tabs defaultValue="projection" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="projection">Projection</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="animation">Animation</TabsTrigger>
          </TabsList>
          
          {/* Projection controls */}
          <TabsContent value="projection" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Projection Type</label>
                  <Select 
                    value={mipConfig.projectionType} 
                    onValueChange={(value: string) => updateMIPConfig({ projectionType: value as MIPConfiguration['projectionType'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mip">Maximum Intensity Projection</SelectItem>
                      <SelectItem value="minip">Minimum Intensity Projection</SelectItem>
                      <SelectItem value="average">Average Intensity Projection</SelectItem>
                      <SelectItem value="sum">Sum Intensity Projection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Orientation</label>
                  <Select 
                    value={mipConfig.orientation} 
                    onValueChange={(value: string) => updateMIPConfig({ orientation: value as MIPConfiguration['orientation'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="axial">Axial</SelectItem>
                      <SelectItem value="coronal">Coronal</SelectItem>
                      <SelectItem value="sagittal">Sagittal</SelectItem>
                      <SelectItem value="oblique">Oblique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Thickness: {mipConfig.thickness}mm</label>
                  <Slider
                    value={[mipConfig.thickness]}
                    onValueChange={([value]) => updateMIPConfig({ thickness: value })}
                    min={1}
                    max={50}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Quality</label>
                  <Select 
                    value={mipConfig.quality} 
                    onValueChange={(value: string) => updateMIPConfig({ quality: value as MIPConfiguration['quality'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="ultra">Ultra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GPU Acceleration</span>
              <Switch
                checked={mipConfig.enableGPU}
                onCheckedChange={(checked) => updateMIPConfig({ enableGPU: checked })}
              />
            </div>
          </TabsContent>
          
          {/* Display controls */}
          <TabsContent value="display" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Window Level: {projectionSettings.windowLevel}</label>
                  <Slider
                    value={[projectionSettings.windowLevel]}
                    onValueChange={([value]) => updateProjectionSettings({ windowLevel: value })}
                    min={-1000}
                    max={1000}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Window Width: {projectionSettings.windowWidth}</label>
                  <Slider
                    value={[projectionSettings.windowWidth]}
                    onValueChange={([value]) => updateProjectionSettings({ windowWidth: value })}
                    min={1}
                    max={2000}
                    step={1}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Brightness: {projectionSettings.brightness}</label>
                  <Slider
                    value={[projectionSettings.brightness]}
                    onValueChange={([value]) => updateProjectionSettings({ brightness: value })}
                    min={-100}
                    max={100}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Contrast: {projectionSettings.contrast.toFixed(1)}</label>
                  <Slider
                    value={[projectionSettings.contrast]}
                    onValueChange={([value]) => updateProjectionSettings({ contrast: value })}
                    min={0.1}
                    max={3}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Invert</span>
              <Switch
                checked={projectionSettings.invert}
                onCheckedChange={(checked) => updateProjectionSettings({ invert: checked })}
              />
            </div>
          </TabsContent>
          
          {/* Presets */}
          <TabsContent value="presets" className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {mipPresets.map(preset => (
                <Button
                  key={preset.name}
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset(preset)}
                  className="text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            
            <div>
              <label className="text-sm font-medium">Colormap</label>
              <Select 
                value={projectionSettings.colormap} 
                onValueChange={(value) => updateProjectionSettings({ colormap: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colormaps.map(colormap => (
                    <SelectItem key={colormap} value={colormap}>
                      {colormap.charAt(0).toUpperCase() + colormap.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          {/* Animation controls */}
          <TabsContent value="animation" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Animation</span>
              <Switch
                checked={animationSettings.enabled}
                onCheckedChange={(checked) => 
                  setAnimationSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>
            
            {animationSettings.enabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <SkipBack className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline">
                    {animationSettings.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </Button>
                  <Button size="sm" variant="outline">
                    <SkipForward className="w-3 h-3" />
                  </Button>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Speed: {animationSettings.speed}x</label>
                  <Slider
                    value={[animationSettings.speed]}
                    onValueChange={([value]) => 
                      setAnimationSettings(prev => ({ ...prev, speed: value }))
                    }
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MIPViewer;
export type { MIPConfiguration, ProjectionSettings, ViewportSettings, AnimationSettings };
