import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
// import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  // DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  // DropdownMenuSub,
  // DropdownMenuSubContent,
  // DropdownMenuSubTrigger
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import {
  // Basic Tools
  Eye, ZoomIn, /* ZoomOut, */ Move3D, RotateCw, Maximize, RefreshCw,
  // Measurement Tools
  Ruler, Square, Circle, Triangle, Pen, Scissors,
  // Advanced Tools
  Layers, Volume2, Brain, Activity, Zap, Target,
  // 3D Tools
  /* Box, Sphere, Cylinder, */ Grid3X3,
  // Analysis Tools
  BarChart3, LineChart, PieChart, TrendingUp, Calculator,
  // Export/Import
  Download, /* Upload, Save, */ FileImage, FileVideo, FileText,
  // Settings
  Settings, /* Palette, Layout, Monitor, */
  // Navigation
  /* ChevronLeft, ChevronRight, ChevronUp, ChevronDown, */
  /* Play, Pause, SkipBack, SkipForward, RotateCcw, */
  // Advanced Features
  /* Microscope, Stethoscope, */ Heart, Bone, /* Lung, */
  // UI Controls
  MoreHorizontal, Pin, PinOff, Expand, /* Shrink, */
  // Specialized
  Crosshair, Focus, Contrast /* Sun, Moon */
} from 'lucide-react';

interface ToolbarConfig {
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  autoHide: boolean;
  expandOnHover: boolean;
  expandOnClick: boolean;
  hideDelay: number;
  showLabels: boolean;
  compactMode: boolean;
  enabledTools: string[];
}

interface ExpandableToolbarProps {
  onToolSelect: (tool: string) => void;
  activeTool: string;
  config?: Partial<ToolbarConfig>;
  onConfigChange?: (config: ToolbarConfig) => void;
  className?: string;
}

const defaultConfig: ToolbarConfig = {
  position: 'bottom-left',
  autoHide: true,
  expandOnHover: true,
  expandOnClick: true,
  hideDelay: 2000,
  showLabels: true,
  compactMode: false,
  enabledTools: [
    // Basic viewing tools
    'windowLevel', 'zoom', 'pan', 'rotate', 'reset', 'fullscreen',
    // Measurement tools
    'length', 'angle', 'rectangle', 'ellipse', 'polygon', 'freehand',
    // Advanced measurement
    'cobb', 'suv', 'hounsfield', 'pixelProbe',
    // 3D tools
    'mpr', 'volumeRender', 'surfaceRender', 'mip', 'minip',
    // Analysis tools
    'histogram', 'profile', 'statistics', 'timeIntensity',
    // Segmentation
    'brush', 'eraser', 'magicWand', 'threshold', 'regionGrow',
    // Registration
    'registration', 'fusion', 'overlay', 'blend',
    // Export
    'exportImage', 'exportVideo', 'exportMesh', 'exportReport',
    // Specialized
    'cardiac', 'vascular', 'oncology', 'orthopedic', 'neurological'
  ]
};

const toolGroups = {
  basic: {
    label: 'Basic Tools',
    tools: [
      { id: 'windowLevel', icon: Eye, label: 'Window/Level', shortcut: 'W' },
      { id: 'zoom', icon: ZoomIn, label: 'Zoom', shortcut: 'Z' },
      { id: 'pan', icon: Move3D, label: 'Pan', shortcut: 'P' },
      { id: 'rotate', icon: RotateCw, label: 'Rotate', shortcut: 'R' },
      { id: 'reset', icon: RefreshCw, label: 'Reset View', shortcut: 'Ctrl+R' },
      { id: 'fullscreen', icon: Maximize, label: 'Fullscreen', shortcut: 'F' }
    ]
  },
  measurement: {
    label: 'Measurements',
    tools: [
      { id: 'length', icon: Ruler, label: 'Length', shortcut: 'L' },
      { id: 'angle', icon: Triangle, label: 'Angle', shortcut: 'A' },
      { id: 'rectangle', icon: Square, label: 'Rectangle ROI', shortcut: 'Shift+R' },
      { id: 'ellipse', icon: Circle, label: 'Ellipse ROI', shortcut: 'Shift+E' },
      { id: 'polygon', icon: Pen, label: 'Polygon ROI', shortcut: 'Shift+P' },
      { id: 'freehand', icon: Pen, label: 'Freehand ROI', shortcut: 'Shift+F' },
      { id: 'cobb', icon: Ruler, label: 'Cobb Angle', shortcut: 'C' },
      { id: 'pixelProbe', icon: Crosshair, label: 'Pixel Probe', shortcut: 'X' }
    ]
  },
  advanced: {
    label: 'Advanced Analysis',
    tools: [
      { id: 'suv', icon: Activity, label: 'SUV Calculation', shortcut: 'S' },
      { id: 'hounsfield', icon: Calculator, label: 'Hounsfield Units', shortcut: 'H' },
      { id: 'histogram', icon: BarChart3, label: 'Histogram', shortcut: 'Shift+H' },
      { id: 'profile', icon: LineChart, label: 'Intensity Profile', shortcut: 'Shift+I' },
      { id: 'statistics', icon: PieChart, label: 'ROI Statistics', shortcut: 'Shift+S' },
      { id: 'timeIntensity', icon: TrendingUp, label: 'Time-Intensity Curve', shortcut: 'T' }
    ]
  },
  threed: {
    label: '3D Visualization',
    tools: [
      { id: 'mpr', icon: Grid3X3, label: 'Multi-Planar Reconstruction', shortcut: 'M' },
      { id: 'volumeRender', icon: Volume2, label: 'Volume Rendering', shortcut: 'V' },
      { id: 'surfaceRender', icon: Grid3X3, label: 'Surface Rendering', shortcut: 'Shift+V' },
      { id: 'mip', icon: Layers, label: 'Maximum Intensity Projection', shortcut: 'Shift+M' },
      { id: 'minip', icon: Layers, label: 'Minimum Intensity Projection', shortcut: 'Ctrl+M' }
    ]
  },
  segmentation: {
    label: 'Segmentation',
    tools: [
      { id: 'brush', icon: Pen, label: 'Brush Tool', shortcut: 'B' },
      { id: 'eraser', icon: Scissors, label: 'Eraser', shortcut: 'E' },
      { id: 'magicWand', icon: Zap, label: 'Magic Wand', shortcut: 'W' },
      { id: 'threshold', icon: Target, label: 'Threshold', shortcut: 'Shift+T' },
      { id: 'regionGrow', icon: Expand, label: 'Region Growing', shortcut: 'G' }
    ]
  },
  registration: {
    label: 'Registration & Fusion',
    tools: [
      { id: 'registration', icon: Focus, label: 'Image Registration', shortcut: 'Ctrl+G' },
      { id: 'fusion', icon: Layers, label: 'Image Fusion', shortcut: 'F' },
      { id: 'overlay', icon: Layers, label: 'Overlay', shortcut: 'O' },
      { id: 'blend', icon: Contrast, label: 'Blend Mode', shortcut: 'Shift+B' }
    ]
  },
  export: {
    label: 'Export & Save',
    tools: [
      { id: 'exportImage', icon: FileImage, label: 'Export Image', shortcut: 'Ctrl+S' },
      { id: 'exportVideo', icon: FileVideo, label: 'Export Video', shortcut: 'Ctrl+Shift+S' },
      { id: 'exportMesh', icon: FileText, label: 'Export 3D Model', shortcut: 'Ctrl+3' },
      { id: 'exportReport', icon: Download, label: 'Export Report', shortcut: 'Ctrl+R' }
    ]
  },
  specialized: {
    label: 'Specialized Tools',
    tools: [
      { id: 'cardiac', icon: Heart, label: 'Cardiac Analysis', shortcut: 'Ctrl+H' },
      { id: 'vascular', icon: Activity, label: 'Vascular Analysis', shortcut: 'Ctrl+V' },
      { id: 'oncology', icon: Target, label: 'Oncology Tools', shortcut: 'Ctrl+O' },
      { id: 'orthopedic', icon: Bone, label: 'Orthopedic Tools', shortcut: 'Ctrl+B' },
      { id: 'neurological', icon: Brain, label: 'Neurological Tools', shortcut: 'Ctrl+N' }
    ]
  }
};

export default function ExpandableToolbar({
  onToolSelect,
  activeTool,
  config: userConfig,
  onConfigChange,
  className = ''
}: ExpandableToolbarProps) {
  const [config, setConfig] = useState<ToolbarConfig>({ ...defaultConfig, ...userConfig });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Auto-hide logic
  useEffect(() => {
    if (!config.autoHide || isPinned || hovering || isExpanded) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsVisible(true);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, config.hideDelay);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [config.autoHide, config.hideDelay, isPinned, hovering, isExpanded]);

  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    setHovering(true);
    if (config.expandOnHover) {
      setIsExpanded(true);
    }
  }, [config.expandOnHover]);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
    if (config.expandOnHover && !isPinned) {
      setIsExpanded(false);
    }
  }, [config.expandOnHover, isPinned]);

  const handleClick = useCallback(() => {
    if (config.expandOnClick) {
      setIsExpanded(!isExpanded);
    }
  }, [config.expandOnClick, isExpanded]);

  const handleToolClick = useCallback((toolId: string) => {
    onToolSelect(toolId);
    if (!isPinned && config.expandOnClick) {
      setIsExpanded(false);
    }
  }, [onToolSelect, isPinned, config.expandOnClick]);

  const togglePin = useCallback(() => {
    setIsPinned(!isPinned);
  }, [isPinned]);

  const updateConfig = useCallback((newConfig: Partial<ToolbarConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  }, [config, onConfigChange]);

  // Position classes
  const getPositionClasses = () => {
    const base = 'fixed z-50 transition-all duration-300 ease-in-out';
    switch (config.position) {
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      case 'top-left':
        return `${base} top-4 left-4`;
      case 'top-right':
        return `${base} top-4 right-4`;
      default:
        return `${base} bottom-4 left-4`;
    }
  };

  // Render tool button
  const renderToolButton = (tool: Record<string, unknown> & { id: string; icon: React.ComponentType<{ className?: string }>; label: string; shortcut?: string }, _groupId: string) => {
    if (!config.enabledTools.includes(tool.id)) return null;

    const isActive = activeTool === tool.id;
    const IconComponent = tool.icon;

    return (
      <TooltipProvider key={tool.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size={config.compactMode ? 'sm' : 'default'}
              onClick={() => handleToolClick(tool.id)}
              className={`
                ${config.compactMode ? 'w-8 h-8 p-1' : 'w-10 h-10 p-2'}
                ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                transition-colors duration-200
              `}
            >
              <IconComponent className={config.compactMode ? 'w-3 h-3' : 'w-4 h-4'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col items-start">
            <span className="font-medium">{tool.label}</span>
            {tool.shortcut && (
              <span className="text-xs text-muted-foreground">{tool.shortcut}</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render tool group
  const renderToolGroup = (groupId: string, group: Record<string, unknown> & { tools: Array<Record<string, unknown> & { id: string; icon: React.ComponentType<{ className?: string }>; label: string; shortcut?: string }>; label: string }) => {
    const enabledTools = group.tools.filter((tool) => config.enabledTools.includes(tool.id));
    if (enabledTools.length === 0) return null;

    return (
      <div key={groupId} className="space-y-1">
        {config.showLabels && isExpanded && (
          <div className="px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">
              {group.label}
            </span>
          </div>
        )}
        <div className="flex flex-col space-y-1">
          {enabledTools.map((tool: Record<string, unknown> & { id: string; icon: React.ComponentType<{ className?: string }>; label: string; shortcut?: string }) => renderToolButton(tool, groupId))}
        </div>
        {isExpanded && <Separator className="my-2" />}
      </div>
    );
  };

  if (!isVisible && config.autoHide && !hovering) {
    return (
      <div
        className={`${getPositionClasses()} ${className}`}
        onMouseEnter={handleMouseEnter}
      >
        <div className="w-2 h-8 bg-sky-500/20 rounded-r-md cursor-pointer hover:bg-sky-500/40 transition-colors" />
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className={`${getPositionClasses()} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Toolbar Header */}
        <div className="flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClick}
              className="w-6 h-6 p-0"
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
            {isExpanded && (
              <span className="text-xs font-medium text-muted-foreground">
                DICOM Tools
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {isExpanded && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePin}
                  className="w-6 h-6 p-0"
                >
                  {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                      <Settings className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Toolbar Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <div className="p-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-hide" className="text-xs">Auto Hide</Label>
                        <Switch
                          id="auto-hide"
                          checked={config.autoHide}
                          onCheckedChange={(checked) => updateConfig({ autoHide: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="expand-hover" className="text-xs">Expand on Hover</Label>
                        <Switch
                          id="expand-hover"
                          checked={config.expandOnHover}
                          onCheckedChange={(checked) => updateConfig({ expandOnHover: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-labels" className="text-xs">Show Labels</Label>
                        <Switch
                          id="show-labels"
                          checked={config.showLabels}
                          onCheckedChange={(checked) => updateConfig({ showLabels: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="compact-mode" className="text-xs">Compact Mode</Label>
                        <Switch
                          id="compact-mode"
                          checked={config.compactMode}
                          onCheckedChange={(checked) => updateConfig({ compactMode: checked })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">Hide Delay (ms)</Label>
                        <Slider
                          value={[config.hideDelay]}
                          onValueChange={([value]) => updateConfig({ hideDelay: value })}
                          min={500}
                          max={5000}
                          step={250}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground">{config.hideDelay}ms</span>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Toolbar Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-0 overflow-hidden'}`}>
          <div className="p-2 space-y-2">
            {Object.entries(toolGroups).map(([groupId, group]) => 
              renderToolGroup(groupId, group)
            )}
          </div>
        </div>

        {/* Collapsed State - Show most important tools */}
        {!isExpanded && (
          <div className="p-2">
            <div className="flex flex-col space-y-1">
              {/* Show only the most essential tools when collapsed */}
              {renderToolButton(toolGroups.basic.tools[0], 'basic')} {/* Window/Level */}
              {renderToolButton(toolGroups.basic.tools[1], 'basic')} {/* Zoom */}
              {renderToolButton(toolGroups.measurement.tools[0], 'measurement')} {/* Length */}
              {renderToolButton(toolGroups.threed.tools[0], 'threed')} {/* MPR */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
