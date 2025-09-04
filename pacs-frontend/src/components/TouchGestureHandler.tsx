import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Hand,
  ZoomIn,
  RotateCw,
  Move,
  Maximize,
  Minimize,
  RefreshCw
} from 'lucide-react';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  type: 'none' | 'pan' | 'zoom' | 'rotate';
  startDistance?: number;
  startAngle?: number;
  startCenter?: { x: number; y: number };
  lastCenter?: { x: number; y: number };
}

interface TouchGestureSettings {
  panEnabled: boolean;
  zoomEnabled: boolean;
  rotateEnabled: boolean;
  panSensitivity: number;
  zoomSensitivity: number;
  rotateSensitivity: number;
  minZoom: number;
  maxZoom: number;
  inertiaEnabled: boolean;
  inertiaDamping: number;
  doubleTapZoom: boolean;
  longPressEnabled: boolean;
  longPressDuration: number;
}

interface TouchGestureHandlerProps {
  targetElement?: HTMLElement | null;
  onPan?: (deltaX: number, deltaY: number) => void;
  onZoom?: (scale: number, centerX: number, centerY: number) => void;
  onRotate?: (angle: number, centerX: number, centerY: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  settings?: Partial<TouchGestureSettings>;
  className?: string;
}

const defaultSettings: TouchGestureSettings = {
  panEnabled: true,
  zoomEnabled: true,
  rotateEnabled: true,
  panSensitivity: 1.0,
  zoomSensitivity: 1.0,
  rotateSensitivity: 1.0,
  minZoom: 0.1,
  maxZoom: 10.0,
  inertiaEnabled: true,
  inertiaDamping: 0.95,
  doubleTapZoom: true,
  longPressEnabled: true,
  longPressDuration: 500
};

export const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  targetElement,
  onPan,
  onZoom,
  onRotate,
  onDoubleTap,
  onLongPress,
  settings: userSettings,
  className
}) => {
  const [settings, setSettings] = useState<TouchGestureSettings>({
    ...defaultSettings,
    ...userSettings
  });
  const [isActive, setIsActive] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureState>({ type: 'none' });
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const gestureStateRef = useRef<GestureState>({ type: 'none' });
  const touchPointsRef = useRef<TouchPoint[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const inertiaAnimationRef = useRef<number | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });

  // Utility functions
  const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getAngle = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  };

  const getCenter = (points: TouchPoint[]): { x: number; y: number } => {
    const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  };

  const createTouchPoint = (touch: Touch): TouchPoint => ({
    id: touch.identifier,
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  });

  // Inertia animation
  const startInertia = () => {
    if (!settings.inertiaEnabled || Math.abs(velocityRef.current.x) < 1 && Math.abs(velocityRef.current.y) < 1) {
      return;
    }

    const animate = () => {
      if (Math.abs(velocityRef.current.x) < 0.1 && Math.abs(velocityRef.current.y) < 0.1) {
        inertiaAnimationRef.current = null;
        return;
      }

      onPan?.(velocityRef.current.x, velocityRef.current.y);
      velocityRef.current.x *= settings.inertiaDamping;
      velocityRef.current.y *= settings.inertiaDamping;
      
      inertiaAnimationRef.current = requestAnimationFrame(animate);
    };

    inertiaAnimationRef.current = requestAnimationFrame(animate);
  };

  const stopInertia = () => {
    if (inertiaAnimationRef.current) {
      cancelAnimationFrame(inertiaAnimationRef.current);
      inertiaAnimationRef.current = null;
    }
  };

  // Touch event handlers
  const handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();
    stopInertia();
    
    const newTouchPoints = Array.from(event.touches).map(createTouchPoint);
    touchPointsRef.current = newTouchPoints;
    setTouchPoints(newTouchPoints);
    setIsActive(true);

    // Handle long press
    if (settings.longPressEnabled && newTouchPoints.length === 1) {
      longPressTimerRef.current = setTimeout(() => {
        const point = newTouchPoints[0];
        onLongPress?.(point.x, point.y);
      }, settings.longPressDuration);
    }

    // Determine gesture type
    if (newTouchPoints.length === 1) {
      gestureStateRef.current = {
        type: 'pan',
        lastCenter: { x: newTouchPoints[0].x, y: newTouchPoints[0].y }
      };
    } else if (newTouchPoints.length === 2) {
      const distance = getDistance(newTouchPoints[0], newTouchPoints[1]);
      const angle = getAngle(newTouchPoints[0], newTouchPoints[1]);
      const center = getCenter(newTouchPoints);
      
      gestureStateRef.current = {
        type: settings.zoomEnabled ? 'zoom' : 'rotate',
        startDistance: distance,
        startAngle: angle,
        startCenter: center,
        lastCenter: center
      };
    }

    setCurrentGesture({ ...gestureStateRef.current });
  };

  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const newTouchPoints = Array.from(event.touches).map(createTouchPoint);
    touchPointsRef.current = newTouchPoints;
    setTouchPoints(newTouchPoints);

    if (newTouchPoints.length === 1 && gestureStateRef.current.type === 'pan' && settings.panEnabled) {
      const current = newTouchPoints[0];
      const last = gestureStateRef.current.lastCenter;
      
      if (last) {
        const deltaX = (current.x - last.x) * settings.panSensitivity;
        const deltaY = (current.y - last.y) * settings.panSensitivity;
        
        // Update velocity for inertia
        velocityRef.current = { x: deltaX, y: deltaY };
        
        onPan?.(deltaX, deltaY);
        gestureStateRef.current.lastCenter = { x: current.x, y: current.y };
      }
    } else if (newTouchPoints.length === 2 && gestureStateRef.current.startDistance) {
      const currentDistance = getDistance(newTouchPoints[0], newTouchPoints[1]);
      const currentAngle = getAngle(newTouchPoints[0], newTouchPoints[1]);
      const currentCenter = getCenter(newTouchPoints);

      // Handle zoom
      if (settings.zoomEnabled && gestureStateRef.current.startDistance) {
        const scale = currentDistance / gestureStateRef.current.startDistance;
        const clampedScale = Math.max(settings.minZoom, Math.min(settings.maxZoom, scale));
        onZoom?.(clampedScale * settings.zoomSensitivity, currentCenter.x, currentCenter.y);
      }

      // Handle rotation
      if (settings.rotateEnabled && gestureStateRef.current.startAngle !== undefined) {
        const angleDelta = currentAngle - gestureStateRef.current.startAngle;
        onRotate?.(angleDelta * settings.rotateSensitivity, currentCenter.x, currentCenter.y);
      }
    }

    setCurrentGesture({ ...gestureStateRef.current });
  };

  const handleTouchEnd = (event: TouchEvent) => {
    event.preventDefault();
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const remainingTouches = Array.from(event.touches).map(createTouchPoint);
    touchPointsRef.current = remainingTouches;
    setTouchPoints(remainingTouches);

    // Handle double tap
    if (settings.doubleTapZoom && remainingTouches.length === 0 && gestureStateRef.current.type === 'pan') {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        const lastCenter = gestureStateRef.current.lastCenter;
        if (lastCenter) {
          onDoubleTap?.(lastCenter.x, lastCenter.y);
        }
      }
      lastTapTimeRef.current = now;
    }

    if (remainingTouches.length === 0) {
      setIsActive(false);
      startInertia();
      gestureStateRef.current = { type: 'none' };
      setCurrentGesture({ type: 'none' });
    } else if (remainingTouches.length === 1 && gestureStateRef.current.type !== 'pan') {
      // Switch to pan mode
      gestureStateRef.current = {
        type: 'pan',
        lastCenter: { x: remainingTouches[0].x, y: remainingTouches[0].y }
      };
      setCurrentGesture({ ...gestureStateRef.current });
    }
  };

  // Setup touch event listeners
  useEffect(() => {
    const element = targetElement || document.body;
    
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      stopInertia();
    };
  }, [targetElement, settings]);

  const updateSetting = <K extends keyof TouchGestureSettings>(
    key: K,
    value: TouchGestureSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings({ ...defaultSettings, ...userSettings });
  };

  return (
    <div className={`touch-gesture-handler ${className || ''}`}>
      {/* Status Display */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            Touch Gesture Handler
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{touchPoints.length}</div>
              <div className="text-sm text-muted-foreground">Touch Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold capitalize">{currentGesture.type}</div>
              <div className="text-sm text-muted-foreground">Current Gesture</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2))}
              </div>
              <div className="text-sm text-muted-foreground">Velocity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {inertiaAnimationRef.current ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-muted-foreground">Inertia Active</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gesture Settings
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                {showSettings ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={resetSettings}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-6">
            {/* Gesture Toggles */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Enabled Gestures
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pan-enabled" className="flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Pan
                  </Label>
                  <Switch
                    id="pan-enabled"
                    checked={settings.panEnabled}
                    onCheckedChange={(checked) => updateSetting('panEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="zoom-enabled" className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </Label>
                  <Switch
                    id="zoom-enabled"
                    checked={settings.zoomEnabled}
                    onCheckedChange={(checked) => updateSetting('zoomEnabled', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="rotate-enabled" className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Rotate
                  </Label>
                  <Switch
                    id="rotate-enabled"
                    checked={settings.rotateEnabled}
                    onCheckedChange={(checked) => updateSetting('rotateEnabled', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Sensitivity Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Sensitivity</h4>
              <div className="space-y-4">
                <div>
                  <Label>Pan Sensitivity: {settings.panSensitivity.toFixed(1)}</Label>
                  <Slider
                    value={[settings.panSensitivity]}
                    onValueChange={([value]) => updateSetting('panSensitivity', value)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Zoom Sensitivity: {settings.zoomSensitivity.toFixed(1)}</Label>
                  <Slider
                    value={[settings.zoomSensitivity]}
                    onValueChange={([value]) => updateSetting('zoomSensitivity', value)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Rotate Sensitivity: {settings.rotateSensitivity.toFixed(1)}</Label>
                  <Slider
                    value={[settings.rotateSensitivity]}
                    onValueChange={([value]) => updateSetting('rotateSensitivity', value)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Zoom Limits */}
            <div className="space-y-4">
              <h4 className="font-medium">Zoom Limits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Zoom: {settings.minZoom.toFixed(1)}</Label>
                  <Slider
                    value={[settings.minZoom]}
                    onValueChange={([value]) => updateSetting('minZoom', value)}
                    min={0.01}
                    max={1.0}
                    step={0.01}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Max Zoom: {settings.maxZoom.toFixed(1)}</Label>
                  <Slider
                    value={[settings.maxZoom]}
                    onValueChange={([value]) => updateSetting('maxZoom', value)}
                    min={1.0}
                    max={50.0}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Advanced</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inertia-enabled">Inertia</Label>
                  <Switch
                    id="inertia-enabled"
                    checked={settings.inertiaEnabled}
                    onCheckedChange={(checked) => updateSetting('inertiaEnabled', checked)}
                  />
                </div>
                {settings.inertiaEnabled && (
                  <div>
                    <Label>Inertia Damping: {settings.inertiaDamping.toFixed(2)}</Label>
                    <Slider
                      value={[settings.inertiaDamping]}
                      onValueChange={([value]) => updateSetting('inertiaDamping', value)}
                      min={0.8}
                      max={0.99}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="double-tap-zoom">Double Tap Zoom</Label>
                  <Switch
                    id="double-tap-zoom"
                    checked={settings.doubleTapZoom}
                    onCheckedChange={(checked) => updateSetting('doubleTapZoom', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="long-press-enabled">Long Press</Label>
                  <Switch
                    id="long-press-enabled"
                    checked={settings.longPressEnabled}
                    onCheckedChange={(checked) => updateSetting('longPressEnabled', checked)}
                  />
                </div>
                {settings.longPressEnabled && (
                  <div>
                    <Label>Long Press Duration: {settings.longPressDuration}ms</Label>
                    <Slider
                      value={[settings.longPressDuration]}
                      onValueChange={([value]) => updateSetting('longPressDuration', value)}
                      min={200}
                      max={2000}
                      step={100}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default TouchGestureHandler;

// Utility hook for easy integration
export const useTouchGestures = (elementRef: React.RefObject<HTMLElement>) => {
  const [gestureHandler] = useState<typeof TouchGestureHandler | null>(null);
  
  useEffect(() => {
    if (elementRef.current) {
      // This would be used in conjunction with the TouchGestureHandler component
      // The actual implementation would depend on how you want to integrate it
    }
  }, [elementRef]);
  
  return gestureHandler;
};