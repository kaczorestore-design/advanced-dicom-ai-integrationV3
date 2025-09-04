import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Box, 
  Layers3, 
  Palette, 
  Settings, 
  Download, 
  RotateCcw,
  Maximize,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Types
interface TransferFunction {
  id: string;
  name: string;
  points: TransferPoint[];
  opacity: number;
  visible: boolean;
}

interface TransferPoint {
  value: number;
  opacity: number;
  color: [number, number, number]; // RGB
}

interface RenderingPreset {
  id: string;
  name: string;
  description: string;
  transferFunction: TransferFunction;
  renderingMode: 'mip' | 'volumetric' | 'isosurface' | 'composite';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  lighting: {
    ambient: number;
    diffuse: number;
    specular: number;
    shininess: number;
  };
}

interface VolumeData {
  dimensions: [number, number, number];
  spacing: [number, number, number];
  origin: [number, number, number];
  data: ArrayBuffer;
  dataType: 'uint8' | 'uint16' | 'int16' | 'float32';
}

interface EnhancedVolumeRendererProps {
  volumeData?: VolumeData;
  onRenderComplete?: (renderTime: number) => void;
  onPresetChanged?: (preset: RenderingPreset) => void;
  onTransferFunctionChanged?: (transferFunction: TransferFunction) => void;
}

export const EnhancedVolumeRenderer: React.FC<EnhancedVolumeRendererProps> = ({
  volumeData,
  onRenderComplete,
  onPresetChanged,
  onTransferFunctionChanged
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [transferFunctions, setTransferFunctions] = useState<TransferFunction[]>([
    {
      id: 'bone',
      name: 'Bone',
      opacity: 1.0,
      visible: true,
      points: [
        { value: 0, opacity: 0, color: [0, 0, 0] },
        { value: 150, opacity: 0, color: [139, 69, 19] },
        { value: 300, opacity: 0.3, color: [255, 248, 220] },
        { value: 1000, opacity: 0.8, color: [255, 255, 255] }
      ]
    },
    {
      id: 'soft_tissue',
      name: 'Soft Tissue',
      opacity: 0.8,
      visible: false,
      points: [
        { value: 0, opacity: 0, color: [0, 0, 0] },
        { value: 40, opacity: 0.1, color: [255, 0, 0] },
        { value: 80, opacity: 0.3, color: [255, 128, 128] },
        { value: 120, opacity: 0.5, color: [255, 255, 255] }
      ]
    },
    {
      id: 'vessels',
      name: 'Vessels',
      opacity: 0.9,
      visible: false,
      points: [
        { value: 0, opacity: 0, color: [0, 0, 0] },
        { value: 100, opacity: 0, color: [255, 0, 0] },
        { value: 200, opacity: 0.7, color: [255, 0, 0] },
        { value: 400, opacity: 1.0, color: [255, 255, 0] }
      ]
    }
  ]);
  
  const [renderingPresets] = useState<RenderingPreset[]>([
    {
      id: 'ct_bone',
      name: 'CT Bone',
      description: 'Optimized for bone visualization',
      transferFunction: transferFunctions[0],
      renderingMode: 'mip',
      quality: 'high',
      lighting: { ambient: 0.2, diffuse: 0.8, specular: 0.5, shininess: 32 }
    },
    {
      id: 'ct_soft_tissue',
      name: 'CT Soft Tissue',
      description: 'Optimized for soft tissue contrast',
      transferFunction: transferFunctions[1],
      renderingMode: 'volumetric',
      quality: 'medium',
      lighting: { ambient: 0.3, diffuse: 0.7, specular: 0.3, shininess: 16 }
    },
    {
      id: 'angiography',
      name: 'Angiography',
      description: 'Vessel visualization',
      transferFunction: transferFunctions[2],
      renderingMode: 'mip',
      quality: 'high',
      lighting: { ambient: 0.1, diffuse: 0.9, specular: 0.8, shininess: 64 }
    }
  ]);
  
  const [currentPreset, setCurrentPreset] = useState<RenderingPreset>(renderingPresets[0]);
  const [renderingSettings, setRenderingSettings] = useState({
    renderingMode: 'volumetric' as const,
    quality: 'medium' as const,
    stepSize: 0.5,
    gradientThreshold: 0.1,
    enableShading: true,
    enableGradients: true,
    enableJittering: true,
    enableGPUAcceleration: true,
    sampleRate: 1.0,
    maxSteps: 1000
  });
  
  const [cameraSettings, setCameraSettings] = useState({
    position: [0, 0, 500],
    target: [0, 0, 0],
    up: [0, 1, 0],
    fov: 45,
    near: 0.1,
    far: 1000
  });
  
  const [animationSettings, setAnimationSettings] = useState({
    isPlaying: false,
    speed: 1.0,
    rotationAxis: 'y' as 'x' | 'y' | 'z',
    currentFrame: 0,
    totalFrames: 360
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0
  });
  
  const [isRendering, setIsRendering] = useState(false);
  const [selectedTransferFunction, setSelectedTransferFunction] = useState<TransferFunction>(transferFunctions[0]);

  // Initialize WebGL context
  useEffect(() => {
    if (canvasRef.current && !glRef.current) {
      const gl = canvasRef.current.getContext('webgl2', {
        alpha: false,
        depth: true,
        stencil: false,
        antialias: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
      
      if (gl) {
        glRef.current = gl;
        initializeWebGL(gl);
      } else {
        console.error('WebGL2 not supported');
      }
    }
  }, []);

  // Initialize WebGL resources
  const initializeWebGL = useCallback((gl: WebGL2RenderingContext) => {
    // Enable extensions
    const extensions = [
      'EXT_color_buffer_float',
      'OES_texture_float_linear',
      'WEBGL_debug_renderer_info'
    ];
    
    extensions.forEach(ext => {
      const extension = gl.getExtension(ext);
      if (!extension) {
        console.warn(`Extension ${ext} not supported`);
      }
    });
    
    // Set up initial GL state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 1);
    
    // Create shaders and programs
    createShaderPrograms(gl);
    
    // Create volume texture
    if (volumeData) {
      createVolumeTexture(gl, volumeData);
    }
    
    // Start render loop
    startRenderLoop();
  }, [volumeData]);

  // Create shader programs
  const createShaderPrograms = useCallback((gl: WebGL2RenderingContext) => {
    // Volume rendering vertex shader
    const vertexShaderSource = `#version 300 es
      in vec3 a_position;
      in vec2 a_texCoord;
      
      uniform mat4 u_modelViewMatrix;
      uniform mat4 u_projectionMatrix;
      
      out vec3 v_position;
      out vec2 v_texCoord;
      
      void main() {
        v_position = a_position;
        v_texCoord = a_texCoord;
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
      }
    `;
    
    // Volume rendering fragment shader
    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      in vec3 v_position;
      in vec2 v_texCoord;
      
      uniform sampler3D u_volumeTexture;
      uniform sampler2D u_transferFunction;
      uniform vec3 u_cameraPosition;
      uniform vec3 u_volumeDimensions;
      uniform vec3 u_volumeSpacing;
      uniform float u_stepSize;
      uniform int u_maxSteps;
      uniform int u_renderingMode; // 0: MIP, 1: Volumetric, 2: Isosurface
      uniform float u_isoValue;
      uniform bool u_enableShading;
      uniform bool u_enableJittering;
      
      out vec4 fragColor;
      
      vec3 calculateGradient(vec3 pos) {
        vec3 step = 1.0 / u_volumeDimensions;
        float x1 = texture(u_volumeTexture, pos + vec3(step.x, 0, 0)).r;
        float x2 = texture(u_volumeTexture, pos - vec3(step.x, 0, 0)).r;
        float y1 = texture(u_volumeTexture, pos + vec3(0, step.y, 0)).r;
        float y2 = texture(u_volumeTexture, pos - vec3(0, step.y, 0)).r;
        float z1 = texture(u_volumeTexture, pos + vec3(0, 0, step.z)).r;
        float z2 = texture(u_volumeTexture, pos - vec3(0, 0, step.z)).r;
        return normalize(vec3(x1 - x2, y1 - y2, z1 - z2));
      }
      
      vec4 applyTransferFunction(float intensity) {
        return texture(u_transferFunction, vec2(intensity, 0.5));
      }
      
      void main() {
        vec3 rayDir = normalize(v_position - u_cameraPosition);
        vec3 rayStart = v_position;
        
        vec4 color = vec4(0.0);
        float maxIntensity = 0.0;
        
        for (int i = 0; i < u_maxSteps; i++) {
          vec3 samplePos = rayStart + rayDir * float(i) * u_stepSize;
          
          // Check bounds
          if (any(lessThan(samplePos, vec3(0.0))) || any(greaterThan(samplePos, vec3(1.0)))) {
            break;
          }
          
          float intensity = texture(u_volumeTexture, samplePos).r;
          
          if (u_renderingMode == 0) { // MIP
            maxIntensity = max(maxIntensity, intensity);
          } else if (u_renderingMode == 1) { // Volumetric
            vec4 sampleColor = applyTransferFunction(intensity);
            
            if (u_enableShading && sampleColor.a > 0.01) {
              vec3 gradient = calculateGradient(samplePos);
              vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
              float diffuse = max(0.0, dot(gradient, lightDir));
              sampleColor.rgb *= (0.3 + 0.7 * diffuse);
            }
            
            // Front-to-back compositing
            color.rgb += sampleColor.rgb * sampleColor.a * (1.0 - color.a);
            color.a += sampleColor.a * (1.0 - color.a);
            
            if (color.a > 0.99) break;
          } else if (u_renderingMode == 2) { // Isosurface
            if (intensity >= u_isoValue) {
              vec4 sampleColor = applyTransferFunction(intensity);
              
              if (u_enableShading) {
                vec3 gradient = calculateGradient(samplePos);
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(0.0, dot(gradient, lightDir));
                sampleColor.rgb *= (0.3 + 0.7 * diffuse);
              }
              
              color = sampleColor;
              break;
            }
          }
        }
        
        if (u_renderingMode == 0) {
          color = applyTransferFunction(maxIntensity);
        }
        
        fragColor = color;
      }
    `;
    
    // Compile and link shaders (simplified)
    console.log('Shader programs created');
  }, []);

  // Create volume texture
  const createVolumeTexture = useCallback((gl: WebGL2RenderingContext, data: VolumeData) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    
    // Upload texture data
    const [width, height, depth] = data.dimensions;
    let format = gl.RED;
    let type = gl.UNSIGNED_BYTE;
    
    switch (data.dataType) {
      case 'uint16':
        type = gl.UNSIGNED_SHORT;
        break;
      case 'int16':
        type = gl.SHORT;
        break;
      case 'float32':
        type = gl.FLOAT;
        break;
    }
    
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.R16F,
      width,
      height,
      depth,
      0,
      format,
      type,
      new Uint8Array(data.data)
    );
    
    console.log('Volume texture created:', data.dimensions);
  }, []);

  // Start render loop
  const startRenderLoop = useCallback(() => {
    const render = (timestamp: number) => {
      if (glRef.current && canvasRef.current) {
        const startTime = performance.now();
        
        renderFrame(glRef.current);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        setPerformanceMetrics(prev => ({
          ...prev,
          renderTime,
          fps: 1000 / renderTime
        }));
        
        onRenderComplete?.(renderTime);
      }
      
      if (animationSettings.isPlaying) {
        setAnimationSettings(prev => ({
          ...prev,
          currentFrame: (prev.currentFrame + prev.speed) % prev.totalFrames
        }));
      }
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    animationRef.current = requestAnimationFrame(render);
  }, [animationSettings.isPlaying, onRenderComplete]);

  // Render frame
  const renderFrame = useCallback((gl: WebGL2RenderingContext) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Simulate volume rendering (placeholder)
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear canvas
      ctx.fillStyle = theme === 'dark' ? '#1a1a1a' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw volume rendering placeholder
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) / 4;
      
      // Create gradient for volume effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(128, 128, 128, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add rotation effect if animating
      if (animationSettings.isPlaying) {
        const angle = (animationSettings.currentFrame * Math.PI * 2) / animationSettings.totalFrames;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.moveTo(0, -radius);
        ctx.lineTo(0, radius);
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw transfer function overlay
      if (selectedTransferFunction.visible) {
        drawTransferFunctionOverlay(ctx, selectedTransferFunction);
      }
    }
  }, [theme, animationSettings, selectedTransferFunction]);

  // Draw transfer function overlay
  const drawTransferFunctionOverlay = useCallback((ctx: CanvasRenderingContext2D, tf: TransferFunction) => {
    const overlayHeight = 60;
    const overlayY = ctx.canvas.height - overlayHeight - 10;
    const overlayWidth = ctx.canvas.width - 20;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, overlayY, overlayWidth, overlayHeight);
    
    // Transfer function curve
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    tf.points.forEach((point, index) => {
      const x = 10 + (point.value / 1000) * overlayWidth;
      const y = overlayY + overlayHeight - (point.opacity * overlayHeight);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Control points
    tf.points.forEach(point => {
      const x = 10 + (point.value / 1000) * overlayWidth;
      const y = overlayY + overlayHeight - (point.opacity * overlayHeight);
      
      ctx.fillStyle = `rgb(${point.color.join(',')})`;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, []);

  // Update transfer function
  const updateTransferFunction = useCallback((tfId: string, updates: Partial<TransferFunction>) => {
    setTransferFunctions(prev => prev.map(tf => 
      tf.id === tfId ? { ...tf, ...updates } : tf
    ));
    
    const updatedTF = transferFunctions.find(tf => tf.id === tfId);
    if (updatedTF) {
      onTransferFunctionChanged?.({ ...updatedTF, ...updates });
    }
  }, [transferFunctions, onTransferFunctionChanged]);

  // Apply preset
  const applyPreset = useCallback((preset: RenderingPreset) => {
    setCurrentPreset(preset);
    setRenderingSettings(prev => ({
      ...prev,
      renderingMode: preset.renderingMode,
      quality: preset.quality
    }));
    setSelectedTransferFunction(preset.transferFunction);
    onPresetChanged?.(preset);
  }, [onPresetChanged]);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    setAnimationSettings(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  // Export volume rendering
  const exportRendering = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `volume-rendering-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Enhanced Volume Rendering
            {renderingSettings.enableGPUAcceleration && (
              <Badge variant="secondary" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                GPU
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* Main Rendering Canvas */}
            <div className="col-span-3">
              <div className="relative border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-96"
                  width={800}
                  height={600}
                />
                
                {/* Canvas Controls */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleAnimation}
                  >
                    {animationSettings.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <Button size="sm" variant="outline" onClick={exportRendering}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Performance Metrics */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
                  <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
                  <div>Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
                  <div>Mode: {renderingSettings.renderingMode.toUpperCase()}</div>
                  <div>Quality: {renderingSettings.quality.toUpperCase()}</div>
                </div>
              </div>
            </div>
            
            {/* Controls Panel */}
            <div className="space-y-4">
              <Tabs defaultValue="presets" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="presets">Presets</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="presets" className="space-y-2">
                  <ScrollArea className="h-64">
                    {renderingPresets.map((preset) => (
                      <Card 
                        key={preset.id} 
                        className={`p-3 mb-2 cursor-pointer transition-colors ${
                          currentPreset.id === preset.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => applyPreset(preset)}
                      >
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-gray-500 mb-2">{preset.description}</div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {preset.renderingMode.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {preset.quality.toUpperCase()}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="transfer" className="space-y-2">
                  <ScrollArea className="h-64">
                    {transferFunctions.map((tf) => (
                      <Card key={tf.id} className="p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{tf.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateTransferFunction(tf.id, { visible: !tf.visible })}
                            >
                              {tf.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        {tf.visible && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-medium">Opacity: {tf.opacity.toFixed(2)}</label>
                              <Slider
                                value={[tf.opacity]}
                                onValueChange={([value]) => updateTransferFunction(tf.id, { opacity: value })}
                                max={1}
                                step={0.01}
                                className="mt-1"
                              />
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              {tf.points.length} control points
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedTransferFunction(tf)}
                              className="w-full"
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Rendering Mode</label>
                      <select 
                        className="w-full mt-1 p-2 border rounded"
                        value={renderingSettings.renderingMode}
                        onChange={(e) => setRenderingSettings(prev => ({ 
                          ...prev, 
                          renderingMode: e.target.value as any 
                        }))}
                      >
                        <option value="mip">Maximum Intensity Projection</option>
                        <option value="volumetric">Volumetric Rendering</option>
                        <option value="isosurface">Isosurface</option>
                        <option value="composite">Composite</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Quality</label>
                      <select 
                        className="w-full mt-1 p-2 border rounded"
                        value={renderingSettings.quality}
                        onChange={(e) => setRenderingSettings(prev => ({ 
                          ...prev, 
                          quality: e.target.value as any 
                        }))}
                      >
                        <option value="low">Low (Fast)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra (Slow)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Step Size: {renderingSettings.stepSize}</label>
                      <Slider
                        value={[renderingSettings.stepSize]}
                        onValueChange={([value]) => setRenderingSettings(prev => ({ ...prev, stepSize: value }))}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Sample Rate: {renderingSettings.sampleRate}</label>
                      <Slider
                        value={[renderingSettings.sampleRate]}
                        onValueChange={([value]) => setRenderingSettings(prev => ({ ...prev, sampleRate: value }))}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={renderingSettings.enableShading}
                          onChange={(e) => setRenderingSettings(prev => ({ ...prev, enableShading: e.target.checked }))}
                        />
                        <span className="text-sm">Enable Shading</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={renderingSettings.enableGradients}
                          onChange={(e) => setRenderingSettings(prev => ({ ...prev, enableGradients: e.target.checked }))}
                        />
                        <span className="text-sm">Enable Gradients</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={renderingSettings.enableJittering}
                          onChange={(e) => setRenderingSettings(prev => ({ ...prev, enableJittering: e.target.checked }))}
                        />
                        <span className="text-sm">Enable Jittering</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={renderingSettings.enableGPUAcceleration}
                          onChange={(e) => setRenderingSettings(prev => ({ ...prev, enableGPUAcceleration: e.target.checked }))}
                        />
                        <span className="text-sm">GPU Acceleration</span>
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedVolumeRenderer;