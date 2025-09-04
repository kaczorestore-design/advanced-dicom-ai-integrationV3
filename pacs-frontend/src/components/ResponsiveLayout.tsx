import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// TODO: Uncomment when implementing tabs functionality
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Menu,
  Smartphone,
  Tablet,
  Monitor,
  Grid,
  Maximize2,
  Minimize2,
  RotateCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

interface ViewportInfo {
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'large-desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  touchSupported: boolean;
}

interface LayoutConfig {
  columns: number;
  rows: number;
  showSidebar: boolean;
  sidebarPosition: 'left' | 'right' | 'bottom';
  sidebarCollapsed: boolean;
  showToolbar: boolean;
  toolbarPosition: 'top' | 'bottom' | 'left' | 'right';
  compactMode: boolean;
  fullscreenMode: boolean;
}

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  breakpoints?: Partial<BreakpointConfig>;
  onLayoutChange?: (layout: LayoutConfig, viewport: ViewportInfo) => void;
  onViewportChange?: (viewport: ViewportInfo) => void;
  className?: string;
}

const defaultBreakpoints: BreakpointConfig = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  largeDesktop: 1920
};

const getDeviceType = (width: number, breakpoints: BreakpointConfig): ViewportInfo['deviceType'] => {
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  if (width < breakpoints.desktop) return 'desktop';
  return 'large-desktop';
};

const getDefaultLayout = (deviceType: ViewportInfo['deviceType'], orientation: ViewportInfo['orientation']): LayoutConfig => {
  switch (deviceType) {
    case 'mobile':
      return {
        columns: 1,
        rows: 1,
        showSidebar: false,
        sidebarPosition: 'bottom',
        sidebarCollapsed: true,
        showToolbar: true,
        toolbarPosition: 'bottom',
        compactMode: true,
        fullscreenMode: false
      };
    case 'tablet':
      return {
        columns: orientation === 'landscape' ? 2 : 1,
        rows: orientation === 'landscape' ? 1 : 2,
        showSidebar: true,
        sidebarPosition: orientation === 'landscape' ? 'left' : 'bottom',
        sidebarCollapsed: orientation === 'portrait',
        showToolbar: true,
        toolbarPosition: 'top',
        compactMode: orientation === 'portrait',
        fullscreenMode: false
      };
    case 'desktop':
    case 'large-desktop':
    default:
      return {
        columns: 2,
        rows: 2,
        showSidebar: true,
        sidebarPosition: 'left',
        sidebarCollapsed: false,
        showToolbar: true,
        toolbarPosition: 'top',
        compactMode: false,
        fullscreenMode: false
      };
  }
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  toolbar,
  header,
  footer,
  breakpoints: userBreakpoints,
  onLayoutChange,
  onViewportChange,
  className
}) => {
  const breakpoints = { ...defaultBreakpoints, ...userBreakpoints };
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    deviceType: 'desktop',
    orientation: 'landscape',
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    touchSupported: typeof window !== 'undefined' ? 'ontouchstart' in window : false
  });
  
  const [layout, setLayout] = useState<LayoutConfig>(
    getDefaultLayout(viewport.deviceType, viewport.orientation)
  );
  const [showLayoutControls, setShowLayoutControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update viewport information
  const updateViewport = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width, breakpoints);
    const orientation = width > height ? 'landscape' : 'portrait';
    const pixelRatio = window.devicePixelRatio;
    const touchSupported = 'ontouchstart' in window;

    const newViewport: ViewportInfo = {
      width,
      height,
      deviceType,
      orientation,
      pixelRatio,
      touchSupported
    };

    setViewport(newViewport);
    onViewportChange?.(newViewport);

    // Auto-adjust layout based on device type and orientation
    const newLayout = getDefaultLayout(deviceType, orientation);
    setLayout(newLayout);
    onLayoutChange?.(newLayout, newViewport);
  };

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, [onViewportChange, onLayoutChange, breakpoints]);

  const updateLayout = (updates: Partial<LayoutConfig>) => {
    const newLayout = { ...layout, ...updates };
    setLayout(newLayout);
    onLayoutChange?.(newLayout, viewport);
  };

  const toggleSidebar = () => {
    updateLayout({ sidebarCollapsed: !layout.sidebarCollapsed });
  };

  const toggleFullscreen = () => {
    updateLayout({ fullscreenMode: !layout.fullscreenMode });
  };

  const getDeviceIcon = () => {
    switch (viewport.deviceType) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getGridClasses = () => {
    const { columns, rows } = layout;
    return {
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`
    };
  };

  const getSidebarClasses = () => {
    const baseClasses = "transition-all duration-300 ease-in-out";
    const { sidebarPosition, sidebarCollapsed } = layout;
    
    if (sidebarCollapsed) {
      switch (sidebarPosition) {
        case 'left': return `${baseClasses} -translate-x-full`;
        case 'right': return `${baseClasses} translate-x-full`;
        case 'bottom': return `${baseClasses} translate-y-full`;
        default: return `${baseClasses} -translate-x-full`;
      }
    }
    
    return baseClasses;
  };

  const renderMobileLayout = () => (
    <div className="flex flex-col h-full">
      {header && (
        <div className="flex-shrink-0 border-b">
          {header}
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden">
        {children}
        
        {/* Mobile Sidebar as Sheet */}
        {sidebar && (
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 left-2 z-10"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side={layout.sidebarPosition === 'bottom' ? 'bottom' : 'left'}>
              {sidebar}
            </SheetContent>
          </Sheet>
        )}
      </div>
      
      {layout.showToolbar && toolbar && (
        <div className="flex-shrink-0 border-t">
          {toolbar}
        </div>
      )}
      
      {footer && (
        <div className="flex-shrink-0 border-t">
          {footer}
        </div>
      )}
    </div>
  );

  const renderTabletDesktopLayout = () => {
    const sidebarWidth = layout.sidebarCollapsed ? '0px' : 
      viewport.deviceType === 'tablet' ? '280px' : '320px';
    
    return (
      <div className="flex flex-col h-full">
        {header && (
          <div className="flex-shrink-0 border-b">
            {header}
          </div>
        )}
        
        {layout.showToolbar && layout.toolbarPosition === 'top' && toolbar && (
          <div className="flex-shrink-0 border-b">
            {toolbar}
          </div>
        )}
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          {layout.showSidebar && layout.sidebarPosition === 'left' && sidebar && (
            <div 
              className={`flex-shrink-0 border-r ${getSidebarClasses()}`}
              style={{ width: sidebarWidth }}
            >
              <div className="h-full overflow-auto">
                {sidebar}
              </div>
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {layout.showToolbar && layout.toolbarPosition === 'left' && toolbar && (
              <div className="flex-shrink-0 border-b">
                {toolbar}
              </div>
            )}
            
            <div 
              className="flex-1 grid gap-1 p-1 overflow-hidden"
              style={getGridClasses()}
            >
              {children}
            </div>
            
            {layout.showToolbar && layout.toolbarPosition === 'bottom' && toolbar && (
              <div className="flex-shrink-0 border-t">
                {toolbar}
              </div>
            )}
          </div>
          
          {/* Right Sidebar */}
          {layout.showSidebar && layout.sidebarPosition === 'right' && sidebar && (
            <div 
              className={`flex-shrink-0 border-l ${getSidebarClasses()}`}
              style={{ width: sidebarWidth }}
            >
              <div className="h-full overflow-auto">
                {sidebar}
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Sidebar */}
        {layout.showSidebar && layout.sidebarPosition === 'bottom' && sidebar && (
          <div className={`flex-shrink-0 border-t ${getSidebarClasses()}`}>
            <div className="h-48 overflow-auto">
              {sidebar}
            </div>
          </div>
        )}
        
        {footer && (
          <div className="flex-shrink-0 border-t">
            {footer}
          </div>
        )}
      </div>
    );
  };

  const renderLayoutControls = () => (
    <Card className="absolute top-4 right-4 z-50 w-80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            Layout Controls
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLayoutControls(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Viewport Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getDeviceIcon()}
              {viewport.deviceType}
            </span>
            <Badge variant="outline">
              {viewport.width} × {viewport.height}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              {viewport.orientation}
            </span>
            <Badge variant={viewport.touchSupported ? "default" : "secondary"}>
              {viewport.touchSupported ? 'Touch' : 'Mouse'}
            </Badge>
          </div>
        </div>
        
        <Separator />
        
        {/* Grid Controls */}
        <div className="space-y-3">
          <h4 className="font-medium">Grid Layout</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Columns</label>
              <div className="flex items-center gap-1 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ columns: Math.max(1, layout.columns - 1) })}
                  disabled={layout.columns <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm">{layout.columns}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ columns: Math.min(4, layout.columns + 1) })}
                  disabled={layout.columns >= 4}
                >
                  +
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm">Rows</label>
              <div className="flex items-center gap-1 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ rows: Math.max(1, layout.rows - 1) })}
                  disabled={layout.rows <= 1}
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm">{layout.rows}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayout({ rows: Math.min(4, layout.rows + 1) })}
                  disabled={layout.rows >= 4}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Layout Actions */}
        <div className="space-y-2">
          <h4 className="font-medium">Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              className="flex items-center gap-2"
            >
              {layout.sidebarCollapsed ? (
                layout.sidebarPosition === 'left' ? <ChevronRight className="h-4 w-4" /> :
                layout.sidebarPosition === 'right' ? <ChevronLeft className="h-4 w-4" /> :
                <ChevronUp className="h-4 w-4" />
              ) : (
                layout.sidebarPosition === 'left' ? <ChevronLeft className="h-4 w-4" /> :
                layout.sidebarPosition === 'right' ? <ChevronRight className="h-4 w-4" /> :
                <ChevronDown className="h-4 w-4" />
              )}
              Sidebar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              {layout.fullscreenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              Fullscreen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div 
      ref={containerRef}
      className={`responsive-layout h-full ${layout.fullscreenMode ? 'fixed inset-0 z-50 bg-background' : ''} ${className || ''}`}
    >
      {/* Layout Controls Toggle */}
      {!showLayoutControls && (
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 z-40"
          onClick={() => setShowLayoutControls(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      
      {/* Layout Controls */}
      {showLayoutControls && renderLayoutControls()}
      
      {/* Main Layout */}
      {viewport.deviceType === 'mobile' ? renderMobileLayout() : renderTabletDesktopLayout()}
    </div>
  );
};

export default ResponsiveLayout;

// Hook for responsive utilities
export const useResponsive = (breakpoints?: Partial<BreakpointConfig>) => {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    deviceType: 'desktop',
    orientation: 'landscape',
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    touchSupported: typeof window !== 'undefined' ? 'ontouchstart' in window : false
  });
  
  const bp = { ...defaultBreakpoints, ...breakpoints };
  
  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const deviceType = getDeviceType(width, bp);
      const orientation = width > height ? 'landscape' : 'portrait';
      
      setViewport({
        width,
        height,
        deviceType,
        orientation,
        pixelRatio: window.devicePixelRatio,
        touchSupported: 'ontouchstart' in window
      });
    };
    
    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);
  
  return {
    viewport,
    isMobile: viewport.deviceType === 'mobile',
    isTablet: viewport.deviceType === 'tablet',
    isDesktop: viewport.deviceType === 'desktop' || viewport.deviceType === 'large-desktop',
    isPortrait: viewport.orientation === 'portrait',
    isLandscape: viewport.orientation === 'landscape',
    isTouchDevice: viewport.touchSupported
  };
};