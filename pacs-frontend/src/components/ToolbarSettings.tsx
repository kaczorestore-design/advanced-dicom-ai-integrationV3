import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Settings, X, RotateCcw } from 'lucide-react';

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

interface ToolbarSettingsProps {
  config: ToolbarConfig;
  onConfigChange: (config: ToolbarConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_TOOLS = [
  { id: 'windowLevel', label: 'Window/Level', category: 'Basic' },
  { id: 'zoom', label: 'Zoom', category: 'Basic' },
  { id: 'pan', label: 'Pan', category: 'Basic' },
  { id: 'rotate', label: 'Rotate', category: 'Basic' },
  { id: 'reset', label: 'Reset', category: 'Basic' },
  { id: 'fullscreen', label: 'Fullscreen', category: 'Basic' },
  
  { id: 'length', label: 'Length', category: 'Measurement' },
  { id: 'angle', label: 'Angle', category: 'Measurement' },
  { id: 'rectangle', label: 'Rectangle ROI', category: 'Measurement' },
  { id: 'ellipse', label: 'Ellipse ROI', category: 'Measurement' },
  { id: 'polygon', label: 'Polygon', category: 'Measurement' },
  { id: 'freehand', label: 'Freehand', category: 'Measurement' },
  { id: 'cobb', label: 'Cobb Angle', category: 'Measurement' },
  { id: 'pixelProbe', label: 'Pixel Probe', category: 'Measurement' },
  
  { id: 'mpr', label: 'MPR', category: '3D Visualization' },
  { id: 'volumeRender', label: 'Volume Render', category: '3D Visualization' },
  { id: 'surfaceRender', label: 'Surface Render', category: '3D Visualization' },
  { id: 'mip', label: 'MIP', category: '3D Visualization' },
  { id: 'minip', label: 'MinIP', category: '3D Visualization' },
  
  { id: 'histogram', label: 'Histogram', category: 'Advanced Analysis' },
  { id: 'profile', label: 'Profile', category: 'Advanced Analysis' },
  { id: 'statistics', label: 'Statistics', category: 'Advanced Analysis' },
  { id: 'timeIntensity', label: 'Time Intensity', category: 'Advanced Analysis' },
  { id: 'suv', label: 'SUV', category: 'Advanced Analysis' },
  { id: 'hounsfield', label: 'Hounsfield', category: 'Advanced Analysis' },
  
  { id: 'brush', label: 'Brush', category: 'Segmentation' },
  { id: 'eraser', label: 'Eraser', category: 'Segmentation' },
  { id: 'magicWand', label: 'Magic Wand', category: 'Segmentation' },
  { id: 'threshold', label: 'Threshold', category: 'Segmentation' },
  { id: 'regionGrow', label: 'Region Grow', category: 'Segmentation' },
  
  { id: 'registration', label: 'Registration', category: 'Registration & Fusion' },
  { id: 'fusion', label: 'Fusion', category: 'Registration & Fusion' },
  { id: 'overlay', label: 'Overlay', category: 'Registration & Fusion' },
  { id: 'blend', label: 'Blend', category: 'Registration & Fusion' },
  
  { id: 'exportImage', label: 'Export Image', category: 'Export & Save' },
  { id: 'exportVideo', label: 'Export Video', category: 'Export & Save' },
  { id: 'exportMesh', label: 'Export Mesh', category: 'Export & Save' },
  { id: 'exportReport', label: 'Export Report', category: 'Export & Save' },
  
  { id: 'cardiac', label: 'Cardiac', category: 'Specialized' },
  { id: 'vascular', label: 'Vascular', category: 'Specialized' },
  { id: 'oncology', label: 'Oncology', category: 'Specialized' },
  { id: 'orthopedic', label: 'Orthopedic', category: 'Specialized' },
  { id: 'neurological', label: 'Neurological', category: 'Specialized' },
];

const TOOL_CATEGORIES = Array.from(new Set(AVAILABLE_TOOLS.map(tool => tool.category)));

export default function ToolbarSettings({ config, onConfigChange, isOpen, onClose }: ToolbarSettingsProps) {
  const [localConfig, setLocalConfig] = useState<ToolbarConfig>(config);

  const handleConfigUpdate = (updates: Partial<ToolbarConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleToolToggle = (toolId: string) => {
    const enabledTools = localConfig.enabledTools.includes(toolId)
      ? localConfig.enabledTools.filter(id => id !== toolId)
      : [...localConfig.enabledTools, toolId];
    
    handleConfigUpdate({ enabledTools });
  };

  const handleReset = () => {
    const defaultConfig: ToolbarConfig = {
      position: 'bottom-left',
      autoHide: true,
      expandOnHover: true,
      expandOnClick: false,
      hideDelay: 2000,
      showLabels: true,
      compactMode: false,
      enabledTools: ['windowLevel', 'zoom', 'pan', 'rotate', 'reset', 'length', 'angle']
    };
    setLocalConfig(defaultConfig);
    onConfigChange(defaultConfig);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const handleCategoryToggle = (category: string) => {
    const categoryTools = AVAILABLE_TOOLS.filter(tool => tool.category === category).map(tool => tool.id);
    const allCategoryToolsEnabled = categoryTools.every(toolId => localConfig.enabledTools.includes(toolId));
    
    let enabledTools;
    if (allCategoryToolsEnabled) {
      // Disable all tools in category
      enabledTools = localConfig.enabledTools.filter(toolId => !categoryTools.includes(toolId));
    } else {
      // Enable all tools in category
      enabledTools = Array.from(new Set([...localConfig.enabledTools, ...categoryTools]));
    }
    
    handleConfigUpdate({ enabledTools });
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl border-0 bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-6 pt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900 dark:text-white">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Toolbar Configuration
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 overflow-y-auto max-h-[calc(92vh-140px)] px-6 py-6">
          {/* Position & Behavior */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Position & Behavior</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Toolbar Position</label>
                <Select value={localConfig.position} onValueChange={(value: ToolbarConfig['position']) => handleConfigUpdate({ position: value })}>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Timing Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-900 dark:text-white">Hide Delay</label>
                      <span className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                        {localConfig.hideDelay}ms
                      </span>
                    </div>
                    <Slider
                      value={[localConfig.hideDelay]}
                      onValueChange={([value]) => handleConfigUpdate({ hideDelay: value })}
                      min={500}
                      max={5000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>500ms</span>
                      <span>Fast</span>
                      <span>Normal</span>
                      <span>Slow</span>
                      <span>5000ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Behavior Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Auto Hide</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hide toolbar when inactive</p>
                  </div>
                  <Switch
                    checked={localConfig.autoHide}
                    onCheckedChange={(checked) => handleConfigUpdate({ autoHide: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Expand on Hover</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Show full toolbar on hover</p>
                  </div>
                  <Switch
                    checked={localConfig.expandOnHover}
                    onCheckedChange={(checked) => handleConfigUpdate({ expandOnHover: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Expand on Click</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Show full toolbar on click</p>
                  </div>
                  <Switch
                    checked={localConfig.expandOnClick}
                    onCheckedChange={(checked) => handleConfigUpdate({ expandOnClick: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Show Labels</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Display tool names</p>
                  </div>
                  <Switch
                    checked={localConfig.showLabels}
                    onCheckedChange={(checked) => handleConfigUpdate({ showLabels: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Compact Mode</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Use smaller toolbar size</p>
                  </div>
                  <Switch
                    checked={localConfig.compactMode}
                    onCheckedChange={(checked) => handleConfigUpdate({ compactMode: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Tool Selection */}
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Tools</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Select which tools to include in your toolbar. Tools are organized by category for easy management.
                  </p>
                </div>
                <Badge variant="secondary">
                  {localConfig.enabledTools.length} / {AVAILABLE_TOOLS.length} tools
                </Badge>
              </div>
            </div>
            
            {TOOL_CATEGORIES.map(category => {
              const categoryTools = AVAILABLE_TOOLS.filter(tool => tool.category === category);
              const enabledCategoryTools = categoryTools.filter(tool => localConfig.enabledTools.includes(tool.id));
              const allCategoryToolsEnabled = categoryTools.length === enabledCategoryTools.length;
              
              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{category}</h4>
                        <Badge variant={allCategoryToolsEnabled ? "default" : "secondary"} className="text-xs">
                          {enabledCategoryTools.length} / {categoryTools.length}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs px-3 py-1 h-8"
                        onClick={() => handleCategoryToggle(category)}
                      >
                        {allCategoryToolsEnabled ? 'Disable All' : 'Enable All'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryTools.map(tool => {
                        const isEnabled = localConfig.enabledTools.includes(tool.id);
                        return (
                          <div
                            key={tool.id}
                            className={`group relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isEnabled
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                            }`}
                            onClick={() => handleToolToggle(tool.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${
                                  isEnabled ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                                }`}>
                                  {tool.label}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <Switch
                                  checked={isEnabled}
                                  onCheckedChange={() => handleToolToggle(tool.id)}
                                  id={tool.id}
                                  className="pointer-events-none"
                                />
                              </div>
                            </div>
                            
                            {isEnabled && (
                              <div className="absolute top-2 right-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <div className="flex items-center space-x-3">
              <Button 
                 variant="outline" 
                 onClick={handleReset}
                 className="px-6 py-2 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
               >
                 Reset to Default
               </Button>
               <Button 
                 onClick={handleSave}
                 className="px-8 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium shadow-sm"
               >
                 Save Settings
               </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
