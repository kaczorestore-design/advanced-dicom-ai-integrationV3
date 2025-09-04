import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Grid3X3, 
  Layout, 
  Monitor, 
  Save, 
  Upload,
  Download,
  Copy,
  Trash2,
  Search,
  Plus,
  Edit
} from 'lucide-react';


// Types
interface ViewportConfiguration {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
  modality?: string;
  orientation?: 'axial' | 'sagittal' | 'coronal' | 'oblique';
  windowLevel?: number;
  windowWidth?: number;
  zoom?: number;
  pan?: { x: number; y: number };
  rotation?: number;
  invert?: boolean;
  annotations?: boolean;
  measurements?: boolean;
  overlays?: string[];
  synchronization?: {
    scroll: boolean;
    zoom: boolean;
    pan: boolean;
    windowLevel: boolean;
  };
}

interface HangingProtocol {
  id: string;
  name: string;
  description: string;
  category: string;
  modalities: string[];
  bodyPart?: string;
  studyType?: string;
  layout: {
    rows: number;
    cols: number;
  };
  viewports: ViewportConfiguration[];
  displaySets: DisplaySetRule[];
  metadata: {
    author: string;
    version: string;
    createdAt: string;
    lastModified: string;
    tags: string[];
  };
  conditions: ProtocolCondition[];
  priority: number;
  isDefault: boolean;
  isActive: boolean;
}

interface DisplaySetRule {
  id: string;
  viewportId: string;
  seriesMatchingRules: SeriesMatchingRule[];
  imageMatchingRules: ImageMatchingRule[];
  sortingRules: SortingRule[];
  displayOptions: {
    initialImageIndex?: number;
    stackScrollDirection?: 'forward' | 'backward';
    loopImages?: boolean;
    autoPlay?: boolean;
    frameRate?: number;
  };
}

interface SeriesMatchingRule {
  attribute: string;
  constraint: {
    equals?: string;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    regex?: string;
    range?: { min: number; max: number };
    oneOf?: string[];
  };
  weight: number;
}

interface ImageMatchingRule {
  attribute: string;
  constraint: {
    equals?: string | number;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
    regex?: string;
    range?: { min: number; max: number };
    oneOf?: (string | number)[];
  };
  weight: number;
}

interface SortingRule {
  attribute: string;
  direction: 'ascending' | 'descending';
  weight: number;
}

interface ProtocolCondition {
  attribute: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists';
  value: string | number | boolean;
  required: boolean;
}

interface Study {
  id: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  bodyPart?: string;
}

interface HangingProtocolsProps {
  availableStudies?: Study[];
  onProtocolApplied?: (protocol: HangingProtocol) => void;
  onViewportConfigChanged?: (viewports: ViewportConfiguration[]) => void;
  onLayoutChanged?: (layout: { rows: number; cols: number }) => void;
}

export const HangingProtocols: React.FC<HangingProtocolsProps> = ({
  availableStudies = [],
  onProtocolApplied,
  onViewportConfigChanged,
  onLayoutChanged
}) => {
  const [protocols, setProtocols] = useState<HangingProtocol[]>([
    {
      id: 'chest_ct_default',
      name: 'Chest CT - Default',
      description: 'Standard chest CT hanging protocol with axial, coronal, and sagittal views',
      category: 'CT',
      modalities: ['CT'],
      bodyPart: 'CHEST',
      studyType: 'CT CHEST',
      layout: { rows: 2, cols: 2 },
      viewports: [
        {
          id: 'viewport_1',
          row: 0,
          col: 0,
          width: 50,
          height: 50,
          modality: 'CT',
          orientation: 'axial',
          windowLevel: 40,
          windowWidth: 400,
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: true,
          synchronization: {
            scroll: true,
            zoom: false,
            pan: false,
            windowLevel: false
          }
        },
        {
          id: 'viewport_2',
          row: 0,
          col: 1,
          width: 50,
          height: 50,
          modality: 'CT',
          orientation: 'coronal',
          windowLevel: 40,
          windowWidth: 400,
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: true
          }
        },
        {
          id: 'viewport_3',
          row: 1,
          col: 0,
          width: 50,
          height: 50,
          modality: 'CT',
          orientation: 'sagittal',
          windowLevel: 40,
          windowWidth: 400,
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: true
          }
        },
        {
          id: 'viewport_4',
          row: 1,
          col: 1,
          width: 50,
          height: 50,
          modality: 'CT',
          orientation: 'axial',
          windowLevel: -600,
          windowWidth: 1600,
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: false,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: false,
            pan: false,
            windowLevel: false
          }
        }
      ],
      displaySets: [
        {
          id: 'ds_1',
          viewportId: 'viewport_1',
          seriesMatchingRules: [
            {
              attribute: 'SeriesDescription',
              constraint: { contains: 'AXIAL' },
              weight: 1.0
            },
            {
              attribute: 'Modality',
              constraint: { equals: 'CT' },
              weight: 1.0
            }
          ],
          imageMatchingRules: [],
          sortingRules: [
            {
              attribute: 'InstanceNumber',
              direction: 'ascending',
              weight: 1.0
            }
          ],
          displayOptions: {
            initialImageIndex: 0,
            stackScrollDirection: 'forward',
            loopImages: false
          }
        }
      ],
      metadata: {
        author: 'System',
        version: '1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['chest', 'ct', 'default']
      },
      conditions: [
        {
          attribute: 'Modality',
          operator: 'equals',
          value: 'CT',
          required: true
        },
        {
          attribute: 'BodyPartExamined',
          operator: 'contains',
          value: 'CHEST',
          required: false
        }
      ],
      priority: 1,
      isDefault: true,
      isActive: false
    },
    {
      id: 'brain_mri_default',
      name: 'Brain MRI - Default',
      description: 'Standard brain MRI protocol with T1, T2, and FLAIR sequences',
      category: 'MRI',
      modalities: ['MR'],
      bodyPart: 'BRAIN',
      studyType: 'MR BRAIN',
      layout: { rows: 2, cols: 3 },
      viewports: [
        {
          id: 'viewport_1',
          row: 0,
          col: 0,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'axial',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: true,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: false
          }
        },
        {
          id: 'viewport_2',
          row: 0,
          col: 1,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'axial',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: false
          }
        },
        {
          id: 'viewport_3',
          row: 0,
          col: 2,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'axial',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: false
          }
        },
        {
          id: 'viewport_4',
          row: 1,
          col: 0,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'sagittal',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: false,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: false
          }
        },
        {
          id: 'viewport_5',
          row: 1,
          col: 1,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'coronal',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: false,
          measurements: false,
          synchronization: {
            scroll: true,
            zoom: true,
            pan: true,
            windowLevel: false
          }
        },
        {
          id: 'viewport_6',
          row: 1,
          col: 2,
          width: 33.33,
          height: 50,
          modality: 'MR',
          orientation: 'axial',
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: false,
          measurements: false,
          synchronization: {
            scroll: false,
            zoom: false,
            pan: false,
            windowLevel: false
          }
        }
      ],
      displaySets: [],
      metadata: {
        author: 'System',
        version: '1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['brain', 'mri', 'default']
      },
      conditions: [
        {
          attribute: 'Modality',
          operator: 'equals',
          value: 'MR',
          required: true
        },
        {
          attribute: 'BodyPartExamined',
          operator: 'contains',
          value: 'BRAIN',
          required: false
        }
      ],
      priority: 1,
      isDefault: true,
      isActive: false
    }
  ]);
  
  const [selectedProtocol, setSelectedProtocol] = useState<HangingProtocol | null>(null);
  const [editingProtocol, setEditingProtocol] = useState<HangingProtocol | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customLayout, setCustomLayout] = useState({ rows: 2, cols: 2 });
  const [isCreatingProtocol, setIsCreatingProtocol] = useState(false);
  
  // Filter protocols based on search and category
  const filteredProtocols = useMemo(() => {
    return protocols.filter(protocol => {
      const matchesSearch = protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           protocol.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           protocol.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || protocol.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [protocols, searchTerm, selectedCategory]);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(protocols.map(p => p.category))];
    return cats;
  }, [protocols]);
  
  // Auto-select best protocol based on study
  const selectBestProtocol = useCallback((study: Study) => {
    if (!study) return null;
    
    const matchingProtocols = protocols.filter(protocol => {
      return protocol.conditions.every(condition => {
        const value = study[condition.attribute];
        
        switch (condition.operator) {
          case 'equals':
            return value === condition.value;
          case 'contains':
            return value && value.toString().toLowerCase().includes(condition.value.toLowerCase());
          case 'greaterThan':
            return value > condition.value;
          case 'lessThan':
            return value < condition.value;
          case 'exists':
            return value !== undefined && value !== null;
          default:
            return false;
        }
      });
    });
    
    // Sort by priority and return the best match
    matchingProtocols.sort((a, b) => b.priority - a.priority);
    return matchingProtocols[0] || null;
  }, [protocols]);
  
  // Apply hanging protocol
  const applyProtocol = useCallback((protocol: HangingProtocol) => {
    setSelectedProtocol(protocol);
    
    // Update active status
    setProtocols(prev => prev.map(p => ({
      ...p,
      isActive: p.id === protocol.id
    })));
    
    // Notify parent components
    onProtocolApplied?.(protocol);
    onViewportConfigChanged?.(protocol.viewports);
    onLayoutChanged?.(protocol.layout);
  }, [onProtocolApplied, onViewportConfigChanged, onLayoutChanged]);
  
  // Create new protocol
  const createNewProtocol = useCallback(() => {
    const newProtocol: HangingProtocol = {
      id: `protocol_${Date.now()}`,
      name: 'New Protocol',
      description: 'Custom hanging protocol',
      category: 'Custom',
      modalities: [],
      layout: customLayout,
      viewports: [],
      displaySets: [],
      metadata: {
        author: 'User',
        version: '1.0',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: ['custom']
      },
      conditions: [],
      priority: 0,
      isDefault: false,
      isActive: false
    };
    
    // Generate viewports based on layout
    const viewports: ViewportConfiguration[] = [];
    for (let row = 0; row < customLayout.rows; row++) {
      for (let col = 0; col < customLayout.cols; col++) {
        viewports.push({
          id: `viewport_${row}_${col}`,
          row,
          col,
          width: 100 / customLayout.cols,
          height: 100 / customLayout.rows,
          zoom: 1.0,
          pan: { x: 0, y: 0 },
          rotation: 0,
          annotations: true,
          measurements: true,
          synchronization: {
            scroll: false,
            zoom: false,
            pan: false,
            windowLevel: false
          }
        });
      }
    }
    
    newProtocol.viewports = viewports;
    setEditingProtocol(newProtocol);
    setIsCreatingProtocol(true);
  }, [customLayout]);
  
  // Save protocol
  const saveProtocol = useCallback((protocol: HangingProtocol) => {
    if (isCreatingProtocol) {
      setProtocols(prev => [...prev, protocol]);
      setIsCreatingProtocol(false);
    } else {
      setProtocols(prev => prev.map(p => p.id === protocol.id ? protocol : p));
    }
    setEditingProtocol(null);
  }, [isCreatingProtocol]);
  
  // Delete protocol
  const deleteProtocol = useCallback((protocolId: string) => {
    setProtocols(prev => prev.filter(p => p.id !== protocolId));
    if (selectedProtocol?.id === protocolId) {
      setSelectedProtocol(null);
    }
  }, [selectedProtocol]);
  
  // Export protocol
  const exportProtocol = useCallback((protocol: HangingProtocol) => {
    const dataStr = JSON.stringify(protocol, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocol.name.replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);
  
  // Import protocol
  const importProtocol = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const protocol = JSON.parse(e.target?.result as string) as HangingProtocol;
        protocol.id = `imported_${Date.now()}`;
        protocol.metadata.lastModified = new Date().toISOString();
        setProtocols(prev => [...prev, protocol]);
      } catch (error) {
        console.error('Failed to import protocol:', error);
      }
    };
    reader.readAsText(file);
  }, []);
  
  // Auto-apply protocol when studies change
  useEffect(() => {
    if (availableStudies.length > 0 && !selectedProtocol) {
      const bestProtocol = selectBestProtocol(availableStudies[0]);
      if (bestProtocol) {
        applyProtocol(bestProtocol);
      }
    }
  }, [availableStudies, selectedProtocol, selectBestProtocol, applyProtocol]);
  
  return (
    <div className="w-full h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Hanging Protocols
            {selectedProtocol && (
              <Badge variant="secondary" className="ml-2">
                {selectedProtocol.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="protocols" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="protocols">Protocols</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="viewports">Viewports</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="protocols" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search protocols..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                
                <Button onClick={createNewProtocol}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importProtocol}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
              
              {/* Protocol List */}
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredProtocols.map((protocol) => (
                    <Card 
                      key={protocol.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        protocol.isActive ? 'ring-2 ring-blue-500' : ''
                      } ${
                        selectedProtocol?.id === protocol.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => applyProtocol(protocol)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{protocol.name}</h3>
                            {protocol.isDefault && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                            {protocol.isActive && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {protocol.description}
                          </p>
                          
                          <div className="flex gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {protocol.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {protocol.layout.rows}×{protocol.layout.cols}
                            </Badge>
                            {protocol.modalities.map(modality => (
                              <Badge key={modality} variant="outline" className="text-xs">
                                {modality}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex gap-1">
                            {protocol.metadata.tags.map(tag => (
                              <span key={tag} className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-1 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProtocol(protocol);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportProtocol(protocol);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newProtocol = { ...protocol, id: `copy_${Date.now()}`, name: `${protocol.name} (Copy)` };
                              setProtocols(prev => [...prev, newProtocol]);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          
                          {!protocol.isDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProtocol(protocol.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="layout" className="space-y-4">
              {selectedProtocol && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Layout Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Layout Grid Visualization */}
                    <div>
                      <h4 className="font-medium mb-2">Current Layout: {selectedProtocol.layout.rows}×{selectedProtocol.layout.cols}</h4>
                      <div 
                        className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
                        style={{
                          display: 'grid',
                          gridTemplateRows: `repeat(${selectedProtocol.layout.rows}, 1fr)`,
                          gridTemplateColumns: `repeat(${selectedProtocol.layout.cols}, 1fr)`,
                          gap: '4px',
                          aspectRatio: '16/9'
                        }}
                      >
                        {selectedProtocol.viewports.map((viewport) => (
                          <div
                            key={viewport.id}
                            className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 p-2 text-xs flex flex-col justify-center items-center"
                          >
                            <div className="font-medium">{viewport.id}</div>
                            <div className="text-gray-500">{viewport.orientation}</div>
                            <div className="text-gray-500">{viewport.modality}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Layout Controls */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Custom Layout</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Rows</label>
                            <Input
                              type="number"
                              min="1"
                              max="4"
                              value={customLayout.rows}
                              onChange={(e) => setCustomLayout(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Columns</label>
                            <Input
                              type="number"
                              min="1"
                              max="4"
                              value={customLayout.cols}
                              onChange={(e) => setCustomLayout(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => onLayoutChanged?.(customLayout)}
                        className="w-full"
                      >
                        Apply Custom Layout
                      </Button>
                      
                      <Separator />
                      
                      <div>
                        <h5 className="font-medium mb-2">Quick Layouts</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { rows: 1, cols: 1, name: '1×1' },
                            { rows: 1, cols: 2, name: '1×2' },
                            { rows: 2, cols: 1, name: '2×1' },
                            { rows: 2, cols: 2, name: '2×2' },
                            { rows: 2, cols: 3, name: '2×3' },
                            { rows: 3, cols: 3, name: '3×3' }
                          ].map((layout) => (
                            <Button
                              key={`${layout.rows}x${layout.cols}`}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCustomLayout(layout);
                                onLayoutChanged?.(layout);
                              }}
                            >
                              <Grid3X3 className="h-4 w-4 mr-2" />
                              {layout.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="viewports" className="space-y-4">
              {selectedProtocol && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Viewport Configuration</h3>
                  
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {selectedProtocol.viewports.map((viewport) => (
                        <Card key={viewport.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{viewport.id}</h4>
                            <Badge variant="outline">
                              Row {viewport.row + 1}, Col {viewport.col + 1}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Modality</label>
                              <Input
                                value={viewport.modality || ''}
                                onChange={(e) => {
                                  const updatedViewports = selectedProtocol.viewports.map(v =>
                                    v.id === viewport.id ? { ...v, modality: e.target.value } : v
                                  );
                                  onViewportConfigChanged?.(updatedViewports);
                                }}
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Orientation</label>
                              <select
                                value={viewport.orientation || 'axial'}
                                onChange={(e) => {
                                  const updatedViewports = selectedProtocol.viewports.map(v =>
                                    v.id === viewport.id ? { ...v, orientation: e.target.value as 'axial' | 'sagittal' | 'coronal' | 'oblique' } : v
                                  );
                                  onViewportConfigChanged?.(updatedViewports);
                                }}
                                className="w-full px-3 py-2 border rounded-md"
                              >
                                <option value="axial">Axial</option>
                                <option value="sagittal">Sagittal</option>
                                <option value="coronal">Coronal</option>
                                <option value="oblique">Oblique</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Window Level</label>
                              <Input
                                type="number"
                                value={viewport.windowLevel || 0}
                                onChange={(e) => {
                                  const updatedViewports = selectedProtocol.viewports.map(v =>
                                    v.id === viewport.id ? { ...v, windowLevel: parseFloat(e.target.value) || 0 } : v
                                  );
                                  onViewportConfigChanged?.(updatedViewports);
                                }}
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Window Width</label>
                              <Input
                                type="number"
                                value={viewport.windowWidth || 0}
                                onChange={(e) => {
                                  const updatedViewports = selectedProtocol.viewports.map(v =>
                                    v.id === viewport.id ? { ...v, windowWidth: parseFloat(e.target.value) || 0 } : v
                                  );
                                  onViewportConfigChanged?.(updatedViewports);
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Synchronization</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(viewport.synchronization || {}).map(([key, value]) => (
                                <label key={key} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={(e) => {
                                      const updatedViewports = selectedProtocol.viewports.map(v =>
                                        v.id === viewport.id ? {
                                          ...v,
                                          synchronization: {
                                            ...v.synchronization,
                                            [key]: e.target.checked
                                          }
                                        } : v
                                      );
                                      onViewportConfigChanged?.({
                                          ...selectedProtocol,
                                          viewports: updatedViewports
                                      });
                                    }}
                                  />
                                  <span className="text-sm capitalize">{key}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="editor" className="space-y-4">
              {editingProtocol ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    {isCreatingProtocol ? 'Create New Protocol' : 'Edit Protocol'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={editingProtocol.name}
                          onChange={(e) => setEditingProtocol(prev => prev ? { ...prev, name: e.target.value } : null)}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Category</label>
                        <Input
                          value={editingProtocol.category}
                          onChange={(e) => setEditingProtocol(prev => prev ? { ...prev, category: e.target.value } : null)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={editingProtocol.description}
                        onChange={(e) => setEditingProtocol(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                    </div>
                    
                    <div className="flex gap-4">
                      <Button onClick={() => saveProtocol(editingProtocol)}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Protocol
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingProtocol(null);
                          setIsCreatingProtocol(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Select a protocol to edit or create a new one</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HangingProtocols;