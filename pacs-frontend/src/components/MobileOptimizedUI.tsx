import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  ZoomIn,
  RotateCw,
  Move,
  Ruler,
  Eye,
  Layers,
  Palette,
  Download,
  Share,
  Bookmark,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Grid,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface MobileToolbarProps {
  tools: ToolConfig[];
  activeTools: string[];
  onToolSelect: (toolId: string) => void;
  onToolDeselect: (toolId: string) => void;
  compact?: boolean;
}

interface ToolConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'navigation' | 'measurement' | 'annotation' | 'display' | 'analysis';
  shortcut?: string;
  description?: string;
}

interface MobileControlPanelProps {
  windowLevel: number;
  windowWidth: number;
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  onWindowLevelChange: (value: number) => void;
  onWindowWidthChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  onRotationChange: (value: number) => void;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onReset: () => void;
}

interface MobileNavigationProps {
  currentImage: number;
  totalImages: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onImageChange: (index: number) => void;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

interface NotificationConfig {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface MobileOptimizedUIProps {
  tools?: ToolConfig[];
  activeTools?: string[];
  onToolSelect?: (toolId: string) => void;
  onToolDeselect?: (toolId: string) => void;
  controlPanelProps?: MobileControlPanelProps;
  navigationProps?: MobileNavigationProps;
  notifications?: NotificationConfig[];
  onNotificationDismiss?: (id: string) => void;
  className?: string;
}

const defaultTools: ToolConfig[] = [
  { id: 'pan', name: 'Pan', icon: <Move className="h-4 w-4" />, category: 'navigation' },
  { id: 'zoom', name: 'Zoom', icon: <ZoomIn className="h-4 w-4" />, category: 'navigation' },
  { id: 'rotate', name: 'Rotate', icon: <RotateCw className="h-4 w-4" />, category: 'navigation' },
  { id: 'measure', name: 'Measure', icon: <Ruler className="h-4 w-4" />, category: 'measurement' },
  { id: 'windowing', name: 'Window', icon: <Eye className="h-4 w-4" />, category: 'display' },
  { id: 'layers', name: 'Layers', icon: <Layers className="h-4 w-4" />, category: 'display' },
  { id: 'palette', name: 'Palette', icon: <Palette className="h-4 w-4" />, category: 'display' },
  { id: 'settings', name: 'Settings', icon: <Settings className="h-4 w-4" />, category: 'display' }
];

const MobileToolbar: React.FC<MobileToolbarProps> = ({
  tools = defaultTools,
  activeTools = [],
  onToolSelect,
  onToolDeselect,
  compact = false
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const categories = Array.from(new Set(tools.map(tool => tool.category)));
  
  const getToolsByCategory = (category: string) => {
    return tools.filter(tool => tool.category === category);
  };
  
  const handleToolClick = (tool: ToolConfig) => {
    if (activeTools.includes(tool.id)) {
      onToolDeselect?.(tool.id);
    } else {
      onToolSelect?.(tool.id);
    }
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 p-2 bg-background border rounded-lg">
        {tools.slice(0, 4).map(tool => (
          <Button
            key={tool.id}
            variant={activeTools.includes(tool.id) ? "default" : "ghost"}
            size="sm"
            onClick={() => handleToolClick(tool)}
            className="flex-1"
          >
            {tool.icon}
          </Button>
        ))}
        {tools.length > 4 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh]">
              <SheetHeader>
                <SheetTitle>All Tools</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full mt-4">
                <div className="grid grid-cols-3 gap-2">
                  {tools.map(tool => (
                    <Button
                      key={tool.id}
                      variant={activeTools.includes(tool.id) ? "default" : "outline"}
                      className="h-16 flex flex-col gap-1"
                      onClick={() => handleToolClick(tool)}
                    >
                      {tool.icon}
                      <span className="text-xs">{tool.name}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {categories.map(category => {
        const categoryTools = getToolsByCategory(category);
        const isExpanded = expandedCategory === category;
        
        return (
          <Card key={category}>
            <CardHeader 
              className="pb-2 cursor-pointer"
              onClick={() => setExpandedCategory(isExpanded ? null : category)}
            >
              <CardTitle className="flex items-center justify-between text-sm capitalize">
                {category}
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {categoryTools.map(tool => (
                    <Button
                      key={tool.id}
                      variant={activeTools.includes(tool.id) ? "default" : "outline"}
                      className="h-12 flex flex-col gap-1"
                      onClick={() => handleToolClick(tool)}
                    >
                      {tool.icon}
                      <span className="text-xs">{tool.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

const MobileControlPanel: React.FC<MobileControlPanelProps> = ({
  windowLevel,
  windowWidth,
  zoom,
  rotation,
  brightness,
  contrast,
  onWindowLevelChange,
  onWindowWidthChange,
  onZoomChange,
  onRotationChange,
  onBrightnessChange,
  onContrastChange,
  onReset
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Display Controls</h3>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Window Level</label>
            <span className="text-sm text-muted-foreground">{windowLevel}</span>
          </div>
          <Slider
            value={[windowLevel]}
            onValueChange={([value]) => onWindowLevelChange(value)}
            min={-1000}
            max={1000}
            step={1}
            className="touch-slider"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Window Width</label>
            <span className="text-sm text-muted-foreground">{windowWidth}</span>
          </div>
          <Slider
            value={[windowWidth]}
            onValueChange={([value]) => onWindowWidthChange(value)}
            min={1}
            max={4000}
            step={1}
            className="touch-slider"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Zoom</label>
            <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={0.1}
            max={10}
            step={0.1}
            className="touch-slider"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Rotation</label>
            <span className="text-sm text-muted-foreground">{rotation}°</span>
          </div>
          <Slider
            value={[rotation]}
            onValueChange={([value]) => onRotationChange(value)}
            min={0}
            max={360}
            step={1}
            className="touch-slider"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Brightness</label>
            <span className="text-sm text-muted-foreground">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={([value]) => onBrightnessChange(value)}
            min={0}
            max={200}
            step={1}
            className="touch-slider"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Contrast</label>
            <span className="text-sm text-muted-foreground">{contrast}%</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={([value]) => onContrastChange(value)}
            min={0}
            max={200}
            step={1}
            className="touch-slider"
          />
        </div>
      </div>
    </div>
  );
};

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentImage,
  totalImages,
  isPlaying,
  playbackSpeed,
  onImageChange,
  onPlayToggle,
  onSpeedChange,
  onPrevious,
  onNext
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Navigation</h3>
        <Badge variant="outline">
          {currentImage + 1} / {totalImages}
        </Badge>
      </div>
      
      {/* Image Slider */}
      <div>
        <Slider
          value={[currentImage]}
          onValueChange={([value]) => onImageChange(value)}
          min={0}
          max={totalImages - 1}
          step={1}
          className="touch-slider"
        />
      </div>
      
      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onPlayToggle}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={onNext}>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Speed Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Speed</label>
          <span className="text-sm text-muted-foreground">{playbackSpeed}x</span>
        </div>
        <Slider
          value={[playbackSpeed]}
          onValueChange={([value]) => onSpeedChange(value)}
          min={0.1}
          max={5}
          step={0.1}
          className="touch-slider"
        />
      </div>
    </div>
  );
};

const MobileNotifications: React.FC<{
  notifications: NotificationConfig[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  const getNotificationIcon = (type: NotificationConfig['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <Card key={notification.id} className="shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                {notification.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-2"
                    onClick={notification.action.onClick}
                  >
                    {notification.action.label}
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(notification.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const MobileOptimizedUI: React.FC<MobileOptimizedUIProps> = ({
  tools,
  activeTools = [],
  onToolSelect,
  onToolDeselect,
  controlPanelProps,
  navigationProps,
  notifications = [],
  onNotificationDismiss,
  className
}) => {
  const [activePanel, setActivePanel] = useState<'tools' | 'controls' | 'navigation' | null>(null);
  
  return (
    <div className={`mobile-optimized-ui ${className || ''}`}>
      {/* Notifications */}
      {notifications.length > 0 && onNotificationDismiss && (
        <MobileNotifications
          notifications={notifications}
          onDismiss={onNotificationDismiss}
        />
      )}
      
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        {/* Compact Toolbar */}
        <div className="p-2">
          <MobileToolbar
            tools={tools || []}
            activeTools={activeTools}
            onToolSelect={onToolSelect || (() => {})}
            onToolDeselect={onToolDeselect || (() => {})}
            compact
          />
        </div>
        
        {/* Quick Access Buttons */}
        <div className="flex items-center justify-around p-2 border-t">
          <Button
            variant={activePanel === 'tools' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActivePanel(activePanel === 'tools' ? null : 'tools')}
            className="flex flex-col gap-1 h-12"
          >
            <Grid className="h-4 w-4" />
            <span className="text-xs">Tools</span>
          </Button>
          
          {controlPanelProps && (
            <Button
              variant={activePanel === 'controls' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel(activePanel === 'controls' ? null : 'controls')}
              className="flex flex-col gap-1 h-12"
            >
              <Settings className="h-4 w-4" />
              <span className="text-xs">Controls</span>
            </Button>
          )}
          
          {navigationProps && (
            <Button
              variant={activePanel === 'navigation' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel(activePanel === 'navigation' ? null : 'navigation')}
              className="flex flex-col gap-1 h-12"
            >
              <Play className="h-4 w-4" />
              <span className="text-xs">Navigate</span>
            </Button>
          )}
          
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col gap-1 h-12"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="text-xs">More</span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Additional Options</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmark
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Info className="h-4 w-4 mr-2" />
                  Information
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      
      {/* Expandable Panels */}
      {activePanel && (
        <div className="fixed bottom-20 left-0 right-0 z-30 bg-background border-t max-h-[60vh] overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {activePanel === 'tools' && (
                <MobileToolbar
                  tools={tools || []}
                  activeTools={activeTools}
                  onToolSelect={onToolSelect || (() => {})}
                  onToolDeselect={onToolDeselect || (() => {})}
                />
              )}
              
              {activePanel === 'controls' && controlPanelProps && (
                <MobileControlPanel {...controlPanelProps} />
              )}
              
              {activePanel === 'navigation' && navigationProps && (
                <MobileNavigation {...navigationProps} />
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedUI;

// Utility components for mobile-specific interactions
export const MobileFriendlyButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, onClick, variant = 'default', size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-10 px-3 text-sm',
    md: 'h-12 px-4',
    lg: 'h-14 px-6 text-lg'
  };
  
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={`${sizeClasses[size]} touch-manipulation ${className || ''}`}
    >
      {children}
    </Button>
  );
};

export const MobileFriendlySlider: React.FC<{
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
}> = ({ value, onValueChange, min, max, step, className }) => {
  return (
    <Slider
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      className={`touch-slider h-6 ${className || ''}`}
    />
  );
};
