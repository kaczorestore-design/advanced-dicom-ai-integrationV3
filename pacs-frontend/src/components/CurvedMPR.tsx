import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Move3D, 
  Download, 
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Types
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface CurvedPath {
  id: string;
  name: string;
  points: Point3D[];
  color: string;
  thickness: number;
  visible: boolean;
}

interface MPRPlane {
  id: string;
  name: string;
  orientation: 'axial' | 'sagittal' | 'coronal' | 'curved';
  position: number;
  thickness: number;
  visible: boolean;
  windowLevel: number;
  windowWidth: number;
}

interface CurvedMPRProps {
  volumeData?: Record<string, unknown>;
  imageStack?: string[];
  onPathCreated?: (path: CurvedPath) => void;
  onPlaneUpdated?: (plane: MPRPlane) => void;
  _onImageExport?: (imageData: ImageData, filename: string) => void;
}

export const CurvedMPR: React.FC<CurvedMPRProps> = ({
  volumeData,
  imageStack,
  onPathCreated,
  onPlaneUpdated,
  _onImageExport: _
}) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paths, setPaths] = useState<CurvedPath[]>([]);
  const [planes, setPlanes] = useState<MPRPlane[]>([
    {
      id: 'axial',
      name: 'Axial',
      orientation: 'axial',
      position: 50,
      thickness: 1,
      visible: true,
      windowLevel: 40,
      windowWidth: 400
    },
    {
      id: 'sagittal',
      name: 'Sagittal',
      orientation: 'sagittal',
      position: 50,
      thickness: 1,
      visible: true,
      windowLevel: 40,
      windowWidth: 400
    },
    {
      id: 'coronal',
      name: 'Coronal',
      orientation: 'coronal',
      position: 50,
      thickness: 1,
      visible: true,
      windowLevel: 40,
      windowWidth: 400
    }
  ]);
  const [_selectedPath, setSelectedPath] = useState<CurvedPath | null>(null);
  const [, ] = useState<MPRPlane | null>(null);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point3D[]>([]);
  const [mprSettings, setMprSettings] = useState({
    interpolation: 'linear',
    sampling: 1.0,
    straightening: true,
    showCrosshairs: true,
    showAnnotations: true,
    autoSync: true
  });

  // Initialize canvas and rendering
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Initialize rendering
        renderMPRViews(ctx);
      }
    }
  }, [volumeData, planes, paths]);

  // Render MPR views
  const renderMPRViews = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate viewport layout (2x2 grid)
    const viewportWidth = width / 2;
    const viewportHeight = height / 2;
    
    // Render each plane
    planes.forEach((plane, index) => {
      if (!plane.visible) return;
      
      const x = (index % 2) * viewportWidth;
      const y = Math.floor(index / 2) * viewportHeight;
      
      renderPlane(ctx, plane, x, y, viewportWidth, viewportHeight);
    });
    
    // Render curved paths
    paths.forEach(path => {
      if (path.visible) {
        renderPath(ctx, path);
      }
    });
    
    // Render crosshairs if enabled
    if (mprSettings.showCrosshairs) {
      renderCrosshairs(ctx);
    }
  }, [theme, planes, paths, mprSettings]);

  // Render individual plane
  const renderPlane = useCallback((ctx: CanvasRenderingContext2D, plane: MPRPlane, x: number, y: number, width: number, height: number) => {
    // Save context
    ctx.save();
    
    // Set viewport
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    
    // Render plane background
    ctx.fillStyle = theme === 'dark' ? '#2a2a2a' : '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Render plane border
    ctx.strokeStyle = theme === 'dark' ? '#404040' : '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    // Render plane label
    ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
    ctx.font = '14px Arial';
    ctx.fillText(plane.name, 10, 25);
    
    // Render plane position indicator
    ctx.fillStyle = plane.orientation === 'axial' ? '#ff6b6b' : 
                   plane.orientation === 'sagittal' ? '#4ecdc4' : 
                   plane.orientation === 'coronal' ? '#45b7d1' : '#f9ca24';
    ctx.fillRect(10, height - 20, (plane.position / 100) * (width - 20), 10);
    
    // Simulate image rendering (placeholder)
    if (volumeData || imageStack) {
      renderPlaneImage(ctx, plane, width, height);
    }
    
    // Restore context
    ctx.restore();
  }, [theme, volumeData, imageStack]);

  // Render plane image (placeholder implementation)
  const renderPlaneImage = useCallback((ctx: CanvasRenderingContext2D, plane: MPRPlane, width: number, height: number) => {
    // This would be replaced with actual volume rendering logic
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // Generate placeholder pattern based on plane orientation
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      let intensity = (() => {
        switch (plane.orientation) {
          case 'axial':
            return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 127 + 128;
          case 'sagittal':
            return Math.sin(x * 0.05) * Math.sin(y * 0.05) * 127 + 128;
          case 'coronal':
            return Math.cos(x * 0.08) * Math.cos(y * 0.08) * 127 + 128;
          case 'curved':
            return Math.sin(x * 0.02) * Math.cos(y * 0.02) * 127 + 128;
          default:
            return 0;
        }
      })();
      
      // Apply window/level
      const windowMin = plane.windowLevel - plane.windowWidth / 2;
      const windowMax = plane.windowLevel + plane.windowWidth / 2;
      intensity = Math.max(0, Math.min(255, (intensity - windowMin) / (windowMax - windowMin) * 255));
      
      data[i] = intensity;     // R
      data[i + 1] = intensity; // G
      data[i + 2] = intensity; // B
      data[i + 3] = 255;       // A
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Render curved path
  const renderPath = useCallback((ctx: CanvasRenderingContext2D, path: CurvedPath) => {
    if (path.points.length < 2) return;
    
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.thickness;
    ctx.beginPath();
    
    // Convert 3D points to 2D screen coordinates (simplified)
    const screenPoints = path.points.map(point => ({
      x: point.x * ctx.canvas.width / 100,
      y: point.y * ctx.canvas.height / 100
    }));
    
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    for (let i = 1; i < screenPoints.length; i++) {
      ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
    }
    ctx.stroke();
    
    // Render path points
    screenPoints.forEach((point, index) => {
      ctx.fillStyle = path.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label first and last points
      if (index === 0 || index === screenPoints.length - 1) {
        ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#000000';
        ctx.font = '12px Arial';
        ctx.fillText(index === 0 ? 'Start' : 'End', point.x + 5, point.y - 5);
      }
    });
  }, [theme]);

  // Render crosshairs
  const renderCrosshairs = useCallback((ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Vertical crosshair
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Horizontal crosshair
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }, []);

  // Handle canvas mouse events
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingPath) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / canvas.offsetWidth) * 100;
    const y = ((event.clientY - rect.top) / canvas.offsetHeight) * 100;
    
    const newPoint: Point3D = { x, y, z: 50 }; // Default z position
    setCurrentPath(prev => [...prev, newPoint]);
  }, [isDrawingPath]);

  // Create new curved path
  const createCurvedPath = useCallback(() => {
    if (currentPath.length < 2) return;
    
    const newPath: CurvedPath = {
      id: `path-${Date.now()}`,
      name: `Curved Path ${paths.length + 1}`,
      points: [...currentPath],
      color: '#f9ca24',
      thickness: 2,
      visible: true
    };
    
    setPaths(prev => [...prev, newPath]);
    setCurrentPath([]);
    setIsDrawingPath(false);
    
    // Create curved MPR plane
    const curvedPlane: MPRPlane = {
      id: `curved-${Date.now()}`,
      name: `Curved MPR ${planes.filter(p => p.orientation === 'curved').length + 1}`,
      orientation: 'curved',
      position: 0,
      thickness: 1,
      visible: true,
      windowLevel: 40,
      windowWidth: 400
    };
    
    setPlanes(prev => [...prev, curvedPlane]);
    
    onPathCreated?.(newPath);
  }, [currentPath, paths.length, planes, onPathCreated]);

  // Update plane settings
  const updatePlane = useCallback((planeId: string, updates: Partial<MPRPlane>) => {
    setPlanes(prev => prev.map(plane => 
      plane.id === planeId ? { ...plane, ...updates } : plane
    ));
    
    const updatedPlane = planes.find(p => p.id === planeId);
    if (updatedPlane) {
      onPlaneUpdated?.({ ...updatedPlane, ...updates });
    }
  }, [planes, onPlaneUpdated]);

  // Export current view
  const exportView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `curved-mpr-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move3D className="h-5 w-5" />
            Curved Multi-Planar Reconstruction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* Main MPR Canvas */}
            <div className="col-span-3">
              <div className="relative border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-96 cursor-crosshair"
                  onClick={handleCanvasClick}
                />
                
                {/* Canvas Controls */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={isDrawingPath ? 'default' : 'outline'}
                    onClick={() => {
                      setIsDrawingPath(!isDrawingPath);
                      if (isDrawingPath) {
                        setCurrentPath([]);
                      }
                    }}
                  >
                    {isDrawingPath ? 'Cancel' : 'Draw Path'}
                  </Button>
                  
                  {currentPath.length >= 2 && (
                    <Button size="sm" onClick={createCurvedPath}>
                      Create Curved MPR
                    </Button>
                  )}
                  
                  <Button size="sm" variant="outline" onClick={exportView}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Drawing Instructions */}
                {isDrawingPath && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
                    Click to add points to the curved path. Need at least 2 points.
                    {currentPath.length > 0 && ` (${currentPath.length} points)`}
                  </div>
                )}
              </div>
            </div>
            
            {/* Controls Panel */}
            <div className="space-y-4">
              <Tabs defaultValue="planes" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="planes">Planes</TabsTrigger>
                  <TabsTrigger value="paths">Paths</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="planes" className="space-y-2">
                  <ScrollArea className="h-64">
                    {planes.map((plane) => (
                      <Card key={plane.id} className="p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={plane.visible ? 'default' : 'secondary'}>
                              {plane.name}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updatePlane(plane.id, { visible: !plane.visible })}
                            >
                              {plane.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        {plane.visible && (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-medium">Position: {plane.position}%</label>
                              <Slider
                                value={[plane.position]}
                                onValueChange={([value]) => updatePlane(plane.id, { position: value })}
                                max={100}
                                step={1}
                                className="mt-1"
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs font-medium">Window Level: {plane.windowLevel}</label>
                              <Slider
                                value={[plane.windowLevel]}
                                onValueChange={([value]) => updatePlane(plane.id, { windowLevel: value })}
                                min={-1000}
                                max={1000}
                                step={1}
                                className="mt-1"
                              />
                            </div>
                            
                            <div>
                              <label className="text-xs font-medium">Window Width: {plane.windowWidth}</label>
                              <Slider
                                value={[plane.windowWidth]}
                                onValueChange={([value]) => updatePlane(plane.id, { windowWidth: value })}
                                min={1}
                                max={2000}
                                step={1}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="paths" className="space-y-2">
                  <ScrollArea className="h-64">
                    {paths.map((path) => (
                      <Card key={path.id} className="p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: path.color }}
                            />
                            <span className="text-sm font-medium">{path.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updatedPaths = paths.map(p => 
                                  p.id === path.id ? { ...p, visible: !p.visible } : p
                                );
                                setPaths(updatedPaths);
                              }}
                            >
                              {path.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {path.points.length} points
                        </div>
                        
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPath(path)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setPaths(prev => prev.filter(p => p.id !== path.id));
                              // Remove associated curved planes
                              setPlanes(prev => prev.filter(plane => 
                                !(plane.orientation === 'curved' && plane.id.includes(path.id))
                              ));
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    {paths.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No curved paths created yet.
                        Click "Draw Path" to start.
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Interpolation</label>
                      <select 
                        className="w-full mt-1 p-2 border rounded"
                        value={mprSettings.interpolation}
                        onChange={(e) => setMprSettings(prev => ({ ...prev, interpolation: e.target.value }))}
                      >
                        <option value="linear">Linear</option>
                        <option value="cubic">Cubic</option>
                        <option value="nearest">Nearest Neighbor</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Sampling Rate: {mprSettings.sampling}</label>
                      <Slider
                        value={[mprSettings.sampling]}
                        onValueChange={([value]) => setMprSettings(prev => ({ ...prev, sampling: value }))}
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mprSettings.straightening}
                          onChange={(e) => setMprSettings(prev => ({ ...prev, straightening: e.target.checked }))}
                        />
                        <span className="text-sm">Path Straightening</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mprSettings.showCrosshairs}
                          onChange={(e) => setMprSettings(prev => ({ ...prev, showCrosshairs: e.target.checked }))}
                        />
                        <span className="text-sm">Show Crosshairs</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mprSettings.showAnnotations}
                          onChange={(e) => setMprSettings(prev => ({ ...prev, showAnnotations: e.target.checked }))}
                        />
                        <span className="text-sm">Show Annotations</span>
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={mprSettings.autoSync}
                          onChange={(e) => setMprSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                        />
                        <span className="text-sm">Auto Sync Views</span>
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

export default CurvedMPR;
