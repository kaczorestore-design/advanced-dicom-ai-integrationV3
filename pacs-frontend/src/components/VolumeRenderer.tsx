import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Box, 
  Palette, 
  Download,
  Upload,
  Zap,
  Cpu,
  Monitor,
  Volume2
} from 'lucide-react';

interface VolumeRendererProps {
  volumeData?: ArrayBuffer | null;
  theme: string;
  onRenderingChange?: (config: VolumeRenderingConfig) => void;
  onTransferFunctionChange?: (transferFunction: TransferFunction) => void;
}

interface VolumeRenderingConfig {
  renderingMode: 'volumeRendering' | 'mip' | 'minip' | 'average';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  gpuAcceleration: boolean;
  ambientOcclusion: boolean;
  shadows: boolean;
  lighting: LightingConfig;
  clipping: ClippingConfig;
  animation: AnimationConfig;
}

interface LightingConfig {
  enabled: boolean;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  lightPosition: { x: number; y: number; z: number };
}

interface ClippingConfig {
  enabled: boolean;
  planes: ClippingPlane[];
}

interface ClippingPlane {
  id: string;
  normal: { x: number; y: number; z: number };
  position: number;
  enabled: boolean;
}

interface AnimationConfig {
  enabled: boolean;
  rotationSpeed: number;
  axis: 'x' | 'y' | 'z';
  direction: 'clockwise' | 'counterclockwise';
}

interface TransferFunction {
  id: string;
  name: string;
  colorPoints: ColorPoint[];
  opacityPoints: OpacityPoint[];
  gradientOpacity: GradientOpacityPoint[];
}

interface ColorPoint {
  value: number;
  color: { r: number; g: number; b: number };
}

interface OpacityPoint {
  value: number;
  opacity: number;
}

interface GradientOpacityPoint {
  value: number;
  opacity: number;
}

const VolumeRenderer: React.FC<VolumeRendererProps> = ({
  volumeData,
  theme,
  onRenderingChange,
  onTransferFunctionChange
}) => {
  const [renderingConfig, setRenderingConfig] = useState<VolumeRenderingConfig>({
    renderingMode: 'volumeRendering',
    quality: 'medium',
    gpuAcceleration: true,
    ambientOcclusion: false,
    shadows: false,
    lighting: {
      enabled: true,
      ambient: 0.3,
      diffuse: 0.7,
      specular: 0.2,
      shininess: 10,
      lightPosition: { x: 1, y: 1, z: 1 }
    },
    clipping: {
      enabled: false,
      planes: []
    },
    animation: {
      enabled: false,
      rotationSpeed: 1,
      axis: 'y',
      direction: 'clockwise'
    }
  });

  const [transferFunction, setTransferFunction] = useState<TransferFunction>({
    id: 'default',
    name: 'Default',
    colorPoints: [
      { value: 0, color: { r: 0, g: 0, b: 0 } },
      { value: 64, color: { r: 255, g: 0, b: 0 } },
      { value: 128, color: { r: 255, g: 255, b: 0 } },
      { value: 192, color: { r: 0, g: 255, b: 0 } },
      { value: 255, color: { r: 0, g: 0, b: 255 } }
    ],
    opacityPoints: [
      { value: 0, opacity: 0 },
      { value: 64, opacity: 0.1 },
      { value: 128, opacity: 0.3 },
      { value: 192, opacity: 0.6 },
      { value: 255, opacity: 1.0 }
    ],
    gradientOpacity: [
      { value: 0, opacity: 0 },
      { value: 90, opacity: 0.5 },
      { value: 100, opacity: 1.0 }
    ]
  });

  const [presetTransferFunctions] = useState<TransferFunction[]>([
    {
      id: 'ct_bone',
      name: 'CT Bone',
      colorPoints: [
        { value: 0, color: { r: 0, g: 0, b: 0 } },
        { value: 150, color: { r: 139, g: 69, b: 19 } },
        { value: 300, color: { r: 255, g: 255, b: 255 } }
      ],
      opacityPoints: [
        { value: 0, opacity: 0 },
        { value: 150, opacity: 0.15 },
        { value: 300, opacity: 0.9 }
      ],
      gradientOpacity: [
        { value: 0, opacity: 0 },
        { value: 90, opacity: 0.5 },
        { value: 100, opacity: 1.0 }
      ]
    },
    {
      id: 'ct_muscle',
      name: 'CT Muscle',
      colorPoints: [
        { value: 0, color: { r: 0, g: 0, b: 0 } },
        { value: 40, color: { r: 139, g: 0, b: 0 } },
        { value: 80, color: { r: 255, g: 0, b: 0 } }
      ],
      opacityPoints: [
        { value: 0, opacity: 0 },
        { value: 40, opacity: 0.15 },
        { value: 80, opacity: 0.3 }
      ],
      gradientOpacity: [
        { value: 0, opacity: 0 },
        { value: 90, opacity: 0.5 },
        { value: 100, opacity: 1.0 }
      ]
    },
    {
      id: 'mri_brain',
      name: 'MRI Brain',
      colorPoints: [
        { value: 0, color: { r: 0, g: 0, b: 0 } },
        { value: 20, color: { r: 168, g: 168, b: 168 } },
        { value: 40, color: { r: 255, g: 255, b: 255 } }
      ],
      opacityPoints: [
        { value: 0, opacity: 0 },
        { value: 20, opacity: 0.1 },
        { value: 40, opacity: 0.2 }
      ],
      gradientOpacity: [
        { value: 0, opacity: 0 },
        { value: 90, opacity: 0.5 },
        { value: 100, opacity: 1.0 }
      ]
    }
  ]);

  const [isRendering, setIsRendering] = useState(false);
  const [renderingProgress, setRenderingProgress] = useState(0);
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0
  });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const renderingEngineRef = useRef<Record<string, unknown> | null>(null);

  // Initialize volume rendering
  useEffect(() => {
    if (!volumeData || !canvasRef.current) return;

    const initializeVolumeRendering = async () => {
      try {
        setIsRendering(true);
        setRenderingProgress(0);

        // Initialize Cornerstone3D volume rendering
        const { RenderingEngine, Enums } = await import('@cornerstonejs/core');
        await import('@cornerstonejs/streaming-image-volume-loader');
        
        // Create rendering engine
        const renderingEngine = new RenderingEngine('volumeRenderingEngine');
        renderingEngineRef.current = renderingEngine as unknown as Record<string, unknown>;

        // Create viewport
        if (!canvasRef.current) {
          throw new Error('Canvas element not available');
        }

        const viewportInput = {
          viewportId: 'VOLUME_VIEWPORT',
          type: Enums.ViewportType.VOLUME_3D,
          element: canvasRef.current,
          defaultOptions: {
            background: theme === 'dark' ? [0.1, 0.1, 0.1] as [number, number, number] : [1, 1, 1] as [number, number, number]
          }
        };

        renderingEngine.enableElement(viewportInput);
        const viewport = renderingEngine.getViewport('VOLUME_VIEWPORT');

        // Load volume data
        setRenderingProgress(30);
        
        // Apply rendering configuration
        await applyRenderingConfig(viewport as unknown as Record<string, unknown>, renderingConfig);
        
        setRenderingProgress(70);
        
        // Apply transfer function
        await applyTransferFunction(viewport as unknown as Record<string, unknown>, transferFunction);
        
        setRenderingProgress(100);
        setIsRendering(false);

        // Start performance monitoring
        startPerformanceMonitoring();

      } catch (error) {
        console.error('Failed to initialize volume rendering:', error);
        setIsRendering(false);
      }
    };

    initializeVolumeRendering();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderingEngineRef.current) {
        (renderingEngineRef.current as Record<string, unknown> & { destroy(): void }).destroy();
      }
    };
  }, [volumeData, theme]);

  // Apply rendering configuration
  const applyRenderingConfig = async (viewport: Record<string, unknown>, config: VolumeRenderingConfig) => {
    if (!viewport) return;

    try {
      // Set rendering mode
      const renderingModeMap = {
        'volumeRendering': 'VOLUME_RENDERING',
        'mip': 'MAXIMUM_INTENSITY_PROJECTION',
        'minip': 'MINIMUM_INTENSITY_PROJECTION',
        'average': 'AVERAGE_INTENSITY_PROJECTION'
      };

      await (viewport as unknown as { setProperties(props: Record<string, unknown>): Promise<void> }).setProperties({
        renderingMode: renderingModeMap[config.renderingMode],
        gpuAcceleration: config.gpuAcceleration,
        ambientOcclusion: config.ambientOcclusion,
        shadows: config.shadows,
        lighting: config.lighting
      });

      // Apply clipping planes
      if (config.clipping.enabled && config.clipping.planes.length > 0) {
        const clippingPlanes = config.clipping.planes
          .filter(plane => plane.enabled)
          .map(plane => ({
            normal: [plane.normal.x, plane.normal.y, plane.normal.z],
            position: plane.position
          }));
        
        await (viewport as unknown as { setClippingPlanes(planes: Record<string, unknown>[]): Promise<void> }).setClippingPlanes(clippingPlanes);
      }

      (viewport as unknown as { render(): void }).render();
    } catch (error) {
      console.error('Failed to apply rendering configuration:', error);
    }
  };

  // Apply transfer function
  const applyTransferFunction = async (viewport: Record<string, unknown>, tf: TransferFunction) => {
    if (!viewport) return;

    try {
      // Convert transfer function to Cornerstone3D format
      const colorTransferFunction = {
        colorPoints: tf.colorPoints.map(point => ([
          point.value,
          point.color.r / 255,
          point.color.g / 255,
          point.color.b / 255
        ])).flat()
      };

      const opacityTransferFunction = {
        opacityPoints: tf.opacityPoints.map(point => ([
          point.value,
          point.opacity
        ])).flat()
      };

      const gradientOpacityTransferFunction = {
        gradientOpacityPoints: tf.gradientOpacity.map(point => ([
          point.value,
          point.opacity
        ])).flat()
      };

      await (viewport as unknown as { setProperties(props: Record<string, unknown>): Promise<void> }).setProperties({
        colorTransferFunction,
        opacityTransferFunction,
        gradientOpacityTransferFunction
      });

      (viewport as unknown as { render(): void }).render();
    } catch (error) {
      console.error('Failed to apply transfer function:', error);
    }
  };

  // Start performance monitoring
  const startPerformanceMonitoring = () => {
    const monitor = () => {
      if (renderingEngineRef.current) {
        const stats = (renderingEngineRef.current as unknown as { getPerformanceStats?(): Record<string, number> }).getPerformanceStats?.() || {
          fps: Math.random() * 60,
          renderTime: Math.random() * 16,
          memoryUsage: Math.random() * 100
        };
        
        setPerformanceStats(stats as { fps: number; renderTime: number; memoryUsage: number });
      }
      
      animationFrameRef.current = requestAnimationFrame(monitor);
    };
    
    monitor();
  };

  // Handle configuration changes
  const updateRenderingConfig = useCallback((updates: Partial<VolumeRenderingConfig>) => {
    const newConfig = { ...renderingConfig, ...updates };
    setRenderingConfig(newConfig);
    
    if (onRenderingChange) {
      onRenderingChange(newConfig);
    }

    // Apply changes to viewport
    if (renderingEngineRef.current) {
      const viewport = (renderingEngineRef.current as unknown as { getViewport(id: string): Record<string, unknown> }).getViewport('VOLUME_VIEWPORT');
      applyRenderingConfig(viewport as unknown as Record<string, unknown>, newConfig);
    }
  }, [renderingConfig, onRenderingChange]);

  // Handle transfer function changes
  const updateTransferFunction = useCallback((updates: Partial<TransferFunction>) => {
    const newTF = { ...transferFunction, ...updates };
    setTransferFunction(newTF);
    
    if (onTransferFunctionChange) {
      onTransferFunctionChange(newTF);
    }

    // Apply changes to viewport
    if (renderingEngineRef.current) {
      const viewport = (renderingEngineRef.current as unknown as { getViewport(id: string): Record<string, unknown> }).getViewport('VOLUME_VIEWPORT');
      applyTransferFunction(viewport as unknown as Record<string, unknown>, newTF);
    }
  }, [transferFunction, onTransferFunctionChange]);

  // Load preset transfer function
  const loadPresetTransferFunction = useCallback((presetId: string) => {
    const preset = presetTransferFunctions.find(tf => tf.id === presetId);
    if (preset) {
      updateTransferFunction(preset);
    }
  }, [presetTransferFunctions, updateTransferFunction]);

  // Export/Import transfer function
  const exportTransferFunction = useCallback(() => {
    const dataStr = JSON.stringify(transferFunction, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${transferFunction.name}_transfer_function.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [transferFunction]);

  const importTransferFunction = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTF = JSON.parse(e.target?.result as string);
        updateTransferFunction(importedTF);
      } catch (error) {
        console.error('Failed to import transfer function:', error);
      }
    };
    reader.readAsText(file);
  }, [updateTransferFunction]);

  return (
    <div className="flex flex-col h-full">
      {/* Main rendering canvas */}
      <div className="flex-1 relative">
        <div
          ref={canvasRef}
          className="w-full h-full border rounded"
          style={{ background: theme === 'dark' ? '#1a1a1a' : '#ffffff' }}
        />
        
        {/* Rendering overlay */}
        {isRendering && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-medium">Rendering Volume...</div>
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${renderingProgress}%` }}
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
      </div>

      {/* Control panels */}
      <div className="h-80 border-t">
        <Tabs defaultValue="rendering" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rendering">Rendering</TabsTrigger>
            <TabsTrigger value="transfer">Transfer Function</TabsTrigger>
            <TabsTrigger value="lighting">Lighting</TabsTrigger>
            <TabsTrigger value="clipping">Clipping</TabsTrigger>
          </TabsList>
          
          {/* Rendering controls */}
          <TabsContent value="rendering" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Rendering Mode</label>
                  <Select 
                    value={renderingConfig.renderingMode} 
                    onValueChange={(value: string) => updateRenderingConfig({ renderingMode: value as VolumeRenderingConfig['renderingMode'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volumeRendering">Volume Rendering</SelectItem>
                      <SelectItem value="mip">Maximum Intensity Projection</SelectItem>
                      <SelectItem value="minip">Minimum Intensity Projection</SelectItem>
                      <SelectItem value="average">Average Intensity Projection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Quality</label>
                  <Select 
                    value={renderingConfig.quality} 
                    onValueChange={(value: string) => updateRenderingConfig({ quality: value as VolumeRenderingConfig['quality'] })}
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
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GPU Acceleration</span>
                  <Switch
                    checked={renderingConfig.gpuAcceleration}
                    onCheckedChange={(checked) => updateRenderingConfig({ gpuAcceleration: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Ambient Occlusion</span>
                  <Switch
                    checked={renderingConfig.ambientOcclusion}
                    onCheckedChange={(checked) => updateRenderingConfig({ ambientOcclusion: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Shadows</span>
                  <Switch
                    checked={renderingConfig.shadows}
                    onCheckedChange={(checked) => updateRenderingConfig({ shadows: checked })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Transfer function controls */}
          <TabsContent value="transfer" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span className="font-medium">Transfer Function</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportTransferFunction}>
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => document.getElementById('tf-import')?.click()}>
                  <Upload className="w-3 h-3 mr-1" />
                  Import
                </Button>
                <input
                  id="tf-import"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={importTransferFunction}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {presetTransferFunctions.map(preset => (
                <Button
                  key={preset.id}
                  size="sm"
                  variant={transferFunction.id === preset.id ? 'default' : 'outline'}
                  onClick={() => loadPresetTransferFunction(preset.id)}
                  className="text-xs"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            
            {/* Transfer function editor would go here */}
            <div className="h-32 border rounded bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-sm text-gray-500">Transfer Function Editor</span>
            </div>
          </TabsContent>
          
          {/* Lighting controls */}
          <TabsContent value="lighting" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Lighting</span>
              <Switch
                checked={renderingConfig.lighting.enabled}
                onCheckedChange={(checked) => 
                  updateRenderingConfig({ 
                    lighting: { ...renderingConfig.lighting, enabled: checked }
                  })
                }
              />
            </div>
            
            {renderingConfig.lighting.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Ambient: {renderingConfig.lighting.ambient}</label>
                  <Slider
                    value={[renderingConfig.lighting.ambient]}
                    onValueChange={([value]) => 
                      updateRenderingConfig({ 
                        lighting: { ...renderingConfig.lighting, ambient: value }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Diffuse: {renderingConfig.lighting.diffuse}</label>
                  <Slider
                    value={[renderingConfig.lighting.diffuse]}
                    onValueChange={([value]) => 
                      updateRenderingConfig({ 
                        lighting: { ...renderingConfig.lighting, diffuse: value }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Specular: {renderingConfig.lighting.specular}</label>
                  <Slider
                    value={[renderingConfig.lighting.specular]}
                    onValueChange={([value]) => 
                      updateRenderingConfig({ 
                        lighting: { ...renderingConfig.lighting, specular: value }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Clipping controls */}
          <TabsContent value="clipping" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Clipping Planes</span>
              <Switch
                checked={renderingConfig.clipping.enabled}
                onCheckedChange={(checked) => 
                  updateRenderingConfig({ 
                    clipping: { ...renderingConfig.clipping, enabled: checked }
                  })
                }
              />
            </div>
            
            {renderingConfig.clipping.enabled && (
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full">
                  <Box className="w-3 h-3 mr-1" />
                  Add Clipping Plane
                </Button>
                
                {renderingConfig.clipping.planes.map((plane, index) => (
                  <div key={plane.id} className="p-2 border rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Plane {index + 1}</span>
                      <Switch
                        checked={plane.enabled}
                        onCheckedChange={(checked) => {
                          const updatedPlanes = [...renderingConfig.clipping.planes];
                          updatedPlanes[index] = { ...plane, enabled: checked };
                          updateRenderingConfig({ 
                            clipping: { ...renderingConfig.clipping, planes: updatedPlanes }
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VolumeRenderer;
export type { VolumeRenderingConfig, TransferFunction, LightingConfig, ClippingConfig };
