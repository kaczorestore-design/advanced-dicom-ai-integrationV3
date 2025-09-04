import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';

import { 
  Link, 
  Unlink, 
  Eye, 
 
  RefreshCw,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack
} from 'lucide-react';

interface ViewportSynchronizationProps {
  viewports: ViewportInfo[];
  theme: string;
  onSyncChange?: (syncConfig: SyncConfiguration) => void;
  onViewportUpdate?: (viewportId: string, updates: ViewportState) => void;
}

interface ViewportInfo {
  id: string;
  name: string;
  seriesInstanceUID?: string;
  studyInstanceUID?: string;
  modality?: string;
  orientation?: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  isActive: boolean;
  currentImageIndex?: number;
  totalImages?: number;
  element?: HTMLElement;
}

interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  windowLevel: number;
  windowWidth: number;
  imageIndex: number;
  invert: boolean;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

interface SyncConfiguration {
  enabled: boolean;
  syncTypes: {
    scroll: boolean;
    zoom: boolean;
    pan: boolean;
    windowLevel: boolean;
    rotation: boolean;
    invert: boolean;
    flip: boolean;
  };
  syncGroups: SyncGroup[];
  masterViewport?: string;
}

interface SyncGroup {
  id: string;
  name: string;
  viewportIds: string[];
  syncTypes: string[];
  color: string;
}

const ViewportSynchronization: React.FC<ViewportSynchronizationProps> = ({
  viewports,
  theme,
  onSyncChange,
  onViewportUpdate
}) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfiguration>({
    enabled: true,
    syncTypes: {
      scroll: true,
      zoom: true,
      pan: true,
      windowLevel: true,
      rotation: false,
      invert: false,
      flip: false
    },
    syncGroups: [],
    masterViewport: undefined
  });
  
  const [viewportStates, setViewportStates] = useState<Record<string, ViewportState>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [newGroupName, setNewGroupName] = useState('');
  
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncEventRef = useRef<number>(0);
  
  const groupColors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
  ];

  // Initialize viewport states
  useEffect(() => {
    const initialStates: Record<string, ViewportState> = {};
    viewports.forEach(viewport => {
      if (!viewportStates[viewport.id]) {
        initialStates[viewport.id] = {
          zoom: 1,
          pan: { x: 0, y: 0 },
          rotation: 0,
          windowLevel: 40,
          windowWidth: 400,
          imageIndex: viewport.currentImageIndex || 0,
          invert: false,
          flipHorizontal: false,
          flipVertical: false
        };
      }
    });
    
    if (Object.keys(initialStates).length > 0) {
      setViewportStates(prev => ({ ...prev, ...initialStates }));
    }
  }, [viewports]);

  // Handle sync configuration changes
  const updateSyncConfig = useCallback((updates: Partial<SyncConfiguration>) => {
    const newConfig = { ...syncConfig, ...updates };
    setSyncConfig(newConfig);
    
    if (onSyncChange) {
      onSyncChange(newConfig);
    }
  }, [syncConfig, onSyncChange]);

  // Synchronize viewport states
  const synchronizeViewports = useCallback((sourceViewportId: string, changes: Partial<ViewportState>) => {
    if (!syncConfig.enabled) return;
    
    // Prevent infinite sync loops
    const now = Date.now();
    if (now - lastSyncEventRef.current < 50) return;
    lastSyncEventRef.current = now;
    
    const sourceViewport = viewports.find(v => v.id === sourceViewportId);
    if (!sourceViewport) return;
    
    // Find sync groups containing the source viewport
    const relevantGroups = syncConfig.syncGroups.filter(group => 
      group.viewportIds.includes(sourceViewportId)
    );
    
    // If no groups, sync all viewports if global sync is enabled
    const targetViewportIds = relevantGroups.length > 0 
      ? relevantGroups.flatMap(group => group.viewportIds)
      : viewports.map(v => v.id);
    
    // Apply changes to target viewports
    const updates: Record<string, Partial<ViewportState>> = {};
    
    targetViewportIds.forEach(targetId => {
      if (targetId === sourceViewportId) return;
      
      const targetViewport = viewports.find(v => v.id === targetId);
      if (!targetViewport || !targetViewport.isActive) return;
      
      const syncTypes = relevantGroups.length > 0 
        ? relevantGroups.find(g => g.viewportIds.includes(targetId))?.syncTypes || []
        : Object.keys(syncConfig.syncTypes).filter(key => syncConfig.syncTypes[key as keyof typeof syncConfig.syncTypes]);
      
      const targetUpdates: Partial<ViewportState> = {};
      
      // Apply synchronized changes based on sync types
      if (syncTypes.includes('scroll') && changes.imageIndex !== undefined) {
        // Synchronize scroll position proportionally
        const sourceTotal = sourceViewport.totalImages || 1;
        const targetTotal = targetViewport.totalImages || 1;
        const ratio = changes.imageIndex / Math.max(sourceTotal - 1, 1);
        targetUpdates.imageIndex = Math.round(ratio * Math.max(targetTotal - 1, 1));
      }
      
      if (syncTypes.includes('zoom') && changes.zoom !== undefined) {
        targetUpdates.zoom = changes.zoom;
      }
      
      if (syncTypes.includes('pan') && changes.pan !== undefined) {
        targetUpdates.pan = { ...changes.pan };
      }
      
      if (syncTypes.includes('windowLevel')) {
        if (changes.windowLevel !== undefined) targetUpdates.windowLevel = changes.windowLevel;
        if (changes.windowWidth !== undefined) targetUpdates.windowWidth = changes.windowWidth;
      }
      
      if (syncTypes.includes('rotation') && changes.rotation !== undefined) {
        targetUpdates.rotation = changes.rotation;
      }
      
      if (syncTypes.includes('invert') && changes.invert !== undefined) {
        targetUpdates.invert = changes.invert;
      }
      
      if (syncTypes.includes('flip')) {
        if (changes.flipHorizontal !== undefined) targetUpdates.flipHorizontal = changes.flipHorizontal;
        if (changes.flipVertical !== undefined) targetUpdates.flipVertical = changes.flipVertical;
      }
      
      if (Object.keys(targetUpdates).length > 0) {
        updates[targetId] = targetUpdates;
      }
    });
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      setViewportStates(prev => {
        const newStates = { ...prev };
        Object.entries(updates).forEach(([viewportId, update]) => {
          newStates[viewportId] = { ...newStates[viewportId], ...update };
          
          // Notify parent component
          if (onViewportUpdate) {
            onViewportUpdate(viewportId, newStates[viewportId]);
          }
        });
        return newStates;
      });
    }
  }, [syncConfig, viewports, onViewportUpdate]);

  // Handle viewport state changes
  const handleViewportChange = useCallback((viewportId: string, changes: Partial<ViewportState>) => {
    setViewportStates(prev => ({
      ...prev,
      [viewportId]: { ...prev[viewportId], ...changes }
    }));
    
    // Trigger synchronization
    synchronizeViewports(viewportId, changes);
    
    // Notify parent component
    if (onViewportUpdate) {
      onViewportUpdate(viewportId, { ...viewportStates[viewportId], ...changes });
    }
  }, [viewportStates, synchronizeViewports, onViewportUpdate]);

  // Create sync group
  const createSyncGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    
    const newGroup: SyncGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      viewportIds: [],
      syncTypes: ['scroll', 'zoom', 'pan', 'windowLevel'],
      color: groupColors[syncConfig.syncGroups.length % groupColors.length]
    };
    
    updateSyncConfig({
      syncGroups: [...syncConfig.syncGroups, newGroup]
    });
    
    setNewGroupName('');
    // Group created successfully
  }, [newGroupName, syncConfig.syncGroups, updateSyncConfig]);

  // Add viewport to sync group
  const addViewportToGroup = useCallback((groupId: string, viewportId: string) => {
    const updatedGroups = syncConfig.syncGroups.map(group => {
      if (group.id === groupId && !group.viewportIds.includes(viewportId)) {
        return { ...group, viewportIds: [...group.viewportIds, viewportId] };
      }
      return group;
    });
    
    updateSyncConfig({ syncGroups: updatedGroups });
  }, [syncConfig.syncGroups, updateSyncConfig]);

  // Remove viewport from sync group
  const removeViewportFromGroup = useCallback((groupId: string, viewportId: string) => {
    const updatedGroups = syncConfig.syncGroups.map(group => {
      if (group.id === groupId) {
        return { ...group, viewportIds: group.viewportIds.filter(id => id !== viewportId) };
      }
      return group;
    });
    
    updateSyncConfig({ syncGroups: updatedGroups });
  }, [syncConfig.syncGroups, updateSyncConfig]);

  // Playback controls
  const startPlayback = useCallback(() => {
    if (playbackIntervalRef.current) return;
    
    setIsPlaying(true);
    playbackIntervalRef.current = setInterval(() => {
      const activeViewports = viewports.filter(v => v.isActive);
      if (activeViewports.length === 0) return;
      
      activeViewports.forEach(viewport => {
        const currentState = viewportStates[viewport.id];
        if (!currentState) return;
        
        const totalImages = viewport.totalImages || 1;
        const nextIndex = (currentState.imageIndex + 1) % totalImages;
        
        handleViewportChange(viewport.id, { imageIndex: nextIndex });
      });
    }, 1000 / playbackSpeed);
  }, [viewports, viewportStates, playbackSpeed, handleViewportChange]);

  const stopPlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  return (
    <Card className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          <span>Viewport Synchronization</span>
          <Badge variant={syncConfig.enabled ? 'default' : 'secondary'}>
            {syncConfig.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Global sync toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={syncConfig.enabled}
                onCheckedChange={(enabled) => updateSyncConfig({ enabled })}
              />
              <span className="text-sm font-medium">Enable Synchronization</span>
            </div>
            <Badge variant="outline">
              {viewports.filter(v => v.isActive).length} Active Viewports
            </Badge>
          </div>

          {/* Sync types */}
          {syncConfig.enabled && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Synchronization Types</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(syncConfig.syncTypes).map(([type, enabled]) => (
                  <div key={type} className="flex items-center gap-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        updateSyncConfig({
                          syncTypes: { ...syncConfig.syncTypes, [type]: checked }
                        })
                      }

                    />
                    <span className="text-xs capitalize">
                      {type === 'windowLevel' ? 'Window/Level' : type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sync groups */}
          {syncConfig.enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Sync Groups</h4>
                <Button size="sm" variant="outline" onClick={createSyncGroup}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Group
                </Button>
              </div>
              
              {/* Create new group */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`flex-1 px-2 py-1 text-xs border rounded ${
                    theme === 'dark' 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && createSyncGroup()}
                />
              </div>
              
              {/* Existing groups */}
              <div className="space-y-2">
                {syncConfig.syncGroups.map(group => (
                  <div key={group.id} className={`p-2 rounded border ${
                    theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${group.color}`}></div>
                        <span className="text-sm font-medium">{group.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {group.viewportIds.length} viewports
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Viewport assignment */}
                    <div className="grid grid-cols-2 gap-1">
                      {viewports.map(viewport => {
                        const isInGroup = group.viewportIds.includes(viewport.id);
                        return (
                          <Button
                            key={viewport.id}
                            size="sm"
                            variant={isInGroup ? 'default' : 'outline'}
                            onClick={() => 
                              isInGroup 
                                ? removeViewportFromGroup(group.id, viewport.id)
                                : addViewportToGroup(group.id, viewport.id)
                            }
                            className="text-xs h-6"
                          >
                            {isInGroup ? <Link className="w-3 h-3 mr-1" /> : <Unlink className="w-3 h-3 mr-1" />}
                            {viewport.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playback controls */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Playback Controls</h4>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isPlaying ? 'default' : 'outline'}
                onClick={isPlaying ? stopPlayback : startPlayback}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              
              <Button size="sm" variant="outline" onClick={() => {
                viewports.forEach(viewport => {
                  if (viewport.isActive) {
                    const currentState = viewportStates[viewport.id];
                    if (currentState) {
                      const prevIndex = Math.max(0, currentState.imageIndex - 1);
                      handleViewportChange(viewport.id, { imageIndex: prevIndex });
                    }
                  }
                });
              }}>
                <SkipBack className="w-3 h-3" />
              </Button>
              
              <Button size="sm" variant="outline" onClick={() => {
                viewports.forEach(viewport => {
                  if (viewport.isActive) {
                    const currentState = viewportStates[viewport.id];
                    if (currentState && viewport.totalImages) {
                      const nextIndex = Math.min(viewport.totalImages - 1, currentState.imageIndex + 1);
                      handleViewportChange(viewport.id, { imageIndex: nextIndex });
                    }
                  }
                });
              }}>
                <SkipForward className="w-3 h-3" />
              </Button>
              
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs">Speed:</span>
                <Slider
                  value={[playbackSpeed]}
                  onValueChange={([speed]) => setPlaybackSpeed(speed)}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-20"
                />
                <span className="text-xs w-8">{playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          {/* Viewport status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Viewport Status</h4>
            <div className="grid grid-cols-1 gap-2">
              {viewports.map(viewport => {
                const state = viewportStates[viewport.id];
                const groups = syncConfig.syncGroups.filter(g => g.viewportIds.includes(viewport.id));
                
                return (
                  <div key={viewport.id} className={`p-2 rounded border text-xs ${
                    theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                  } ${!viewport.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className={`w-3 h-3 ${viewport.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="font-medium">{viewport.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {viewport.modality}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {groups.map(group => (
                          <div key={group.id} className={`w-2 h-2 rounded-full ${group.color}`}></div>
                        ))}
                      </div>
                    </div>
                    {state && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Image: {state.imageIndex + 1}/{viewport.totalImages || 1} | 
                        Zoom: {state.zoom.toFixed(1)}x | 
                        W/L: {state.windowWidth}/{state.windowLevel}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewportSynchronization;
export type { ViewportInfo, ViewportState, SyncConfiguration, SyncGroup };