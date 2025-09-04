import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';

import { 
  Code, 
  Play, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Trash2, 
  RefreshCw, 
  Clock,
  BarChart3
} from 'lucide-react';
import type { PluginManifest } from './PluginManager';

interface PluginDevelopmentProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PluginTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  files: PluginTemplateFile[];
  dependencies: string[];
  permissions: string[];
}

interface PluginTemplateFile {
  path: string;
  content: string;
  type: 'javascript' | 'typescript' | 'json' | 'css' | 'html';
}

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  logs: string[];
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

const PluginDevelopment: React.FC<PluginDevelopmentProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('editor');
  const [manifest, setManifest] = useState<Partial<PluginManifest>>({
    id: '',
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    license: 'MIT',
    category: 'utility',
    entryPoint: 'index.js',
    permissions: [],
    dependencies: {},
    configuration: {
      type: 'object',
      properties: {}
    }
  });
  const [pluginCode, setPluginCode] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const pluginTemplates: PluginTemplate[] = [
    {
      id: 'basic-tool',
      name: 'Basic Tool Plugin',
      description: 'A simple tool plugin template',
      category: 'utility',
      files: [
        {
          path: 'index.js',
          type: 'javascript',
          content: `// Basic Tool Plugin
class BasicToolPlugin {
  constructor(api) {
    this.api = api;
    this.name = 'Basic Tool';
  }

  initialize() {
    // Plugin initialization
    this.api.toolbar.addTool({
      id: 'basic-tool',
      name: this.name,
      icon: 'tool',
      onClick: () => this.activate()
    });
  }

  activate() {
    // Tool activation logic
    this.api.notifications.show({
      type: 'info',
      message: 'Basic tool activated!'
    });
  }

  deactivate() {
    // Tool deactivation logic
  }

  destroy() {
    // Cleanup
    this.api.toolbar.removeTool('basic-tool');
  }
}

// Export plugin class
window.BasicToolPlugin = BasicToolPlugin;`
        },
        {
          path: 'manifest.json',
          type: 'json',
          content: JSON.stringify({
            id: 'basic-tool-plugin',
            name: 'Basic Tool Plugin',
            version: '1.0.0',
            description: 'A simple tool plugin template',
            author: 'Plugin Developer',
            license: 'MIT',
            category: 'utility',
            main: 'index.js',
            permissions: ['toolbar'],
            dependencies: {},
            configuration: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  title: 'Enable Tool',
                  description: 'Enable or disable the basic tool',
                  default: true
                }
              }
            }
          }, null, 2)
        }
      ],
      dependencies: [],
      permissions: ['toolbar']
    },
    {
      id: 'measurement-tool',
      name: 'Measurement Tool Plugin',
      description: 'Advanced measurement tool with custom calculations',
      category: 'analysis',
      files: [
        {
          path: 'index.js',
          type: 'javascript',
          content: `// Measurement Tool Plugin
class MeasurementToolPlugin {
  constructor(api) {
    this.api = api;
    this.name = 'Advanced Measurement';
    this.measurements = [];
  }

  initialize() {
    this.api.toolbar.addTool({
      id: 'advanced-measurement',
      name: this.name,
      icon: 'ruler',
      onClick: () => this.activate()
    });

    // Add measurement panel
    this.api.panels.add({
      id: 'measurement-panel',
      title: 'Measurements',
      content: this.createMeasurementPanel(),
      position: 'right'
    });
  }

  activate() {
    this.api.viewer.setTool('measurement');
    this.api.viewer.on('measurement-added', this.onMeasurementAdded.bind(this));
  }

  onMeasurementAdded(measurement) {
    this.measurements.push({
      id: Date.now(),
      type: measurement.type,
      value: measurement.value,
      unit: measurement.unit,
      timestamp: new Date()
    });
    this.updateMeasurementPanel();
  }

  createMeasurementPanel() {
    return \`
      <div id="measurement-list">
        <h3>Active Measurements</h3>
        <div id="measurements"></div>
        <button onclick="clearMeasurements()">Clear All</button>
      </div>
    \`;
  }

  updateMeasurementPanel() {
    // Update measurement display
  }

  destroy() {
    this.api.toolbar.removeTool('advanced-measurement');
    this.api.panels.remove('measurement-panel');
  }
}

window.MeasurementToolPlugin = MeasurementToolPlugin;`
        }
      ],
      dependencies: [],
      permissions: ['toolbar', 'panels', 'viewer']
    },
    {
      id: 'ai-analysis',
      name: 'AI Analysis Plugin',
      description: 'AI-powered image analysis plugin',
      category: 'analysis',
      files: [
        {
          path: 'index.js',
          type: 'javascript',
          content: `// AI Analysis Plugin
class AIAnalysisPlugin {
  constructor(api) {
    this.api = api;
    this.name = 'AI Analysis';
    this.analysisResults = [];
  }

  initialize() {
    this.api.toolbar.addTool({
      id: 'ai-analysis',
      name: this.name,
      icon: 'brain',
      onClick: () => this.runAnalysis()
    });
  }

  async runAnalysis() {
    try {
      this.api.notifications.show({
        type: 'info',
        message: 'Running AI analysis...'
      });

      const currentImage = this.api.viewer.getCurrentImage();
      if (!currentImage) {
        throw new Error('No image selected');
      }

      // Simulate AI analysis
      const result = await this.performAIAnalysis(currentImage);
      
      this.analysisResults.push(result);
      this.displayResults(result);

    } catch (error) {
      this.api.notifications.show({
        type: 'error',
        message: \`Analysis failed: \${error.message}\`
      });
    }
  }

  async performAIAnalysis(image) {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      id: Date.now(),
      confidence: Math.random() * 100,
      findings: [
        'Normal anatomy detected',
        'No abnormalities found'
      ],
      timestamp: new Date()
    };
  }

  displayResults(result) {
    this.api.overlays.add({
      type: 'analysis-result',
      data: result,
      position: { x: 10, y: 10 }
    });
  }

  destroy() {
    this.api.toolbar.removeTool('ai-analysis');
  }
}

window.AIAnalysisPlugin = AIAnalysisPlugin;`
        }
      ],
      dependencies: [],
      permissions: ['toolbar', 'viewer', 'overlays', 'notifications']
    }
  ];

  useEffect(() => {
    if (autoSave && pluginCode) {
      const timer = setTimeout(() => {
        saveToLocalStorage();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pluginCode, autoSave]);

  const saveToLocalStorage = () => {
    localStorage.setItem('plugin-dev-code', pluginCode);
    localStorage.setItem('plugin-dev-manifest', JSON.stringify(manifest));
  };

  const loadFromLocalStorage = () => {
    const savedCode = localStorage.getItem('plugin-dev-code');
    const savedManifest = localStorage.getItem('plugin-dev-manifest');
    
    if (savedCode) setPluginCode(savedCode);
    if (savedManifest) setManifest(JSON.parse(savedManifest));
  };

  const loadTemplate = (template: PluginTemplate) => {
    _setSelectedTemplate(template);
    const mainFile = template.files.find(f => f.path === 'index.js');
    if (mainFile) {
      setPluginCode(mainFile.content);
    }
    
    const manifestFile = template.files.find(f => f.path === 'manifest.json');
    if (manifestFile) {
      try {
        const templateManifest = JSON.parse(manifestFile.content);
        setManifest(templateManifest);
      } catch (error) {
        console.error('Failed to parse template manifest:', error);
      }
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setLogs([]);
    
    const tests = [
      {
        id: 'syntax-check',
        name: 'Syntax Check',
        test: () => {
          try {
            new Function(pluginCode);
            return { passed: true };
          } catch (error) {
            return { passed: false, error: error instanceof Error ? error.message : String(error) };
          }
        }
      },
      {
        id: 'manifest-validation',
        name: 'Manifest Validation',
        test: () => {
          const required = ['id', 'name', 'version', 'entryPoint'] as const;
          const missing = required.filter(field => !manifest[field as keyof typeof manifest]);
          return {
            passed: missing.length === 0,
            error: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : undefined
          };
        }
      },
      {
        id: 'api-compatibility',
        name: 'API Compatibility',
        test: () => {
          // Check if plugin uses supported API methods
          const supportedAPIs = ['toolbar', 'viewer', 'panels', 'notifications', 'overlays'];
          const usedAPIs = supportedAPIs.filter(api => pluginCode.includes(`api.${api}`));
          return {
            passed: true,
            info: `Uses APIs: ${usedAPIs.join(', ') || 'none'}`
          };
        }
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      const result = test.test();
      const duration = Date.now() - startTime;
      
      setTestResults(prev => [...prev, {
        id: test.id,
        name: test.name,
        status: result.passed ? 'passed' : 'failed',
        duration,
        error: 'error' in result ? result.error : undefined,
        logs: 'info' in result && result.info ? [result.info] : []
      }]);
      
      addLog(`${test.name}: ${result.passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
      if ('error' in result && result.error) addLog(`  Error: ${result.error}`);
      if ('info' in result && result.info) addLog(`  Info: ${result.info}`);
    }
    
    setIsRunning(false);
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const generatePerformanceMetrics = () => {
    const metrics: PerformanceMetric[] = [
      {
        name: 'Code Size',
        value: new Blob([pluginCode]).size,
        unit: 'bytes',
        threshold: 50000,
        status: new Blob([pluginCode]).size > 50000 ? 'warning' : 'good'
      },
      {
        name: 'Complexity',
        value: (pluginCode.match(/function|class|if|for|while/g) || []).length,
        unit: 'points',
        threshold: 20,
        status: (pluginCode.match(/function|class|if|for|while/g) || []).length > 20 ? 'warning' : 'good'
      },
      {
        name: 'Dependencies',
        value: Object.keys(manifest.dependencies || {}).length,
        unit: 'count',
        threshold: 10,
        status: Object.keys(manifest.dependencies || {}).length > 10 ? 'warning' : 'good'
      }
    ];
    
    setPerformanceMetrics(metrics);
  };

  const exportPlugin = () => {
    const pluginData = {
      manifest,
      code: pluginCode,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(pluginData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${manifest.id || 'plugin'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPlugin = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pluginData = JSON.parse(e.target?.result as string);
          setManifest(pluginData.manifest);
          setPluginCode(pluginData.code);
        } catch (error) {
          addLog(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Plugin Development Environment
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="manifest">Manifest</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Plugin Templates</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={loadFromLocalStorage}>
                  <Upload className="h-4 w-4 mr-2" />
                  Load Saved
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={importPlugin}
                  className="hidden"
                  id="import-plugin"
                />
                <Button variant="outline" onClick={() => document.getElementById('import-plugin')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pluginTemplates.map(template => (
                <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => loadTemplate(template)}>
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary">{template.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-500">
                        Files: {template.files.length}
                      </div>
                      <div className="text-xs text-gray-500">
                        Permissions: {template.permissions.join(', ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">Code Editor</h3>
                <div className="flex items-center gap-2">
                  <Switch checked={debugMode} onCheckedChange={setDebugMode} />
                  <Label>Debug Mode</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                  <Label>Auto Save</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveToLocalStorage}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={exportPlugin}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={runTests}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Plugin
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-96">
              <div className="lg:col-span-2">
                <Label>Plugin Code (JavaScript)</Label>
                <Textarea
                  ref={editorRef}
                  value={pluginCode}
                  onChange={(e) => setPluginCode(e.target.value)}
                  className="h-full font-mono text-sm"
                  placeholder="// Write your plugin code here..."
                />
              </div>
              <div>
                <Label>Console Output</Label>
                <ScrollArea className="h-full border rounded-md p-2 bg-black text-green-400 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-500">No output yet...</div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Manifest Tab */}
          <TabsContent value="manifest" className="space-y-4">
            <h3 className="text-lg font-semibold">Plugin Manifest</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label>Plugin ID</Label>
                  <Input
                    value={manifest.id || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="my-plugin-id"
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={manifest.name || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Plugin"
                  />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={manifest.version || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                  />
                </div>
                <div>
                  <Label>Author</Label>
                  <Input
                    value={manifest.author || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Your Name"
                  />
                </div>
                <div>
                  <Label>License</Label>
                  <Select value={manifest.license} onValueChange={(value) => setManifest(prev => ({ ...prev, license: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIT">MIT</SelectItem>
                      <SelectItem value="Apache-2.0">Apache 2.0</SelectItem>
                      <SelectItem value="GPL-3.0">GPL 3.0</SelectItem>
                      <SelectItem value="BSD-3-Clause">BSD 3-Clause</SelectItem>
                      <SelectItem value="ISC">ISC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={manifest.category} onValueChange={(value) => setManifest(prev => ({ ...prev, category: value as 'viewer' | 'analysis' | 'workflow' | 'integration' | 'utility' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={manifest.description || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Plugin description..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Main File</Label>
                  <Input
                    value={manifest.entryPoint || ''}
                    onChange={(e) => setManifest(prev => ({ ...prev, entryPoint: e.target.value }))}
                    placeholder="index.js"
                  />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    {[
                      { type: 'ui-modification', description: 'Modify toolbar' },
                      { type: 'dicom-access', description: 'Access DICOM viewer' },
                      { type: 'ui-modification', description: 'Modify panels' },
                      { type: 'ui-modification', description: 'Show notifications' },
                      { type: 'ui-modification', description: 'Add overlays' },
                      { type: 'storage', description: 'Access local storage' },
                      { type: 'network', description: 'Make network requests' }
                    ].map((permissionTemplate, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`permission-${index}`}
                          checked={manifest.permissions?.some(p => p.type === permissionTemplate.type && p.description === permissionTemplate.description) || false}
                          onChange={(e) => {
                            const permissions = manifest.permissions || [];
                            if (e.target.checked) {
                              const newPermission = {
                                type: permissionTemplate.type as 'dicom-access' | 'network' | 'storage' | 'ui-modification' | 'system-integration',
                                description: permissionTemplate.description,
                                required: true
                              };
                              setManifest(prev => ({ ...prev, permissions: [...permissions, newPermission] }));
                            } else {
                              setManifest(prev => ({ 
                                ...prev, 
                                permissions: permissions.filter(p => !(p.type === permissionTemplate.type && p.description === permissionTemplate.description))
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`permission-${index}`}>{permissionTemplate.description}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Generated Manifest JSON</Label>
              <Textarea
                value={JSON.stringify(manifest, null, 2)}
                readOnly
                className="h-32 font-mono text-xs"
              />
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Plugin Testing</h3>
              <div className="flex gap-2">
                <Button onClick={runTests} disabled={isRunning}>
                  {isRunning ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Tests
                </Button>
                <Button variant="outline" onClick={() => setTestResults([])}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Results
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Test Results</h4>
                <div className="space-y-2">
                  {testResults.map(result => (
                    <Card key={result.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === 'passed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : result.status === 'failed' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{result.name}</span>
                        </div>
                        <Badge className={result.status === 'passed' ? 'bg-green-100 text-green-800' : 
                                        result.status === 'failed' ? 'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800'}>
                          {result.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Duration: {result.duration}ms
                      </div>
                      {result.error && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">{result.error}</AlertDescription>
                        </Alert>
                      )}
                      {result.logs.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {result.logs.map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                  {testResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No test results yet. Run tests to see results.
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Test Console</h4>
                <ScrollArea className="h-64 border rounded-md p-2 bg-gray-50 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-500">Test output will appear here...</div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Performance Analysis</h3>
              <Button onClick={generatePerformanceMetrics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {performanceMetrics.map(metric => (
                <Card key={metric.name} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{metric.name}</h4>
                    <Badge className={metric.status === 'good' ? 'bg-green-100 text-green-800' :
                                    metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'}>
                      {metric.status}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold">
                    {metric.value.toLocaleString()} {metric.unit}
                  </div>
                  {metric.threshold && (
                    <div className="text-xs text-gray-500 mt-1">
                      Threshold: {metric.threshold.toLocaleString()} {metric.unit}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {performanceMetrics.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Click "Analyze" to generate performance metrics.
              </div>
            )}
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="space-y-4">
            <h3 className="text-lg font-semibold">Plugin Development Documentation</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Plugin API Reference</h4>
                <div className="space-y-3">
                  <Card className="p-3">
                    <h5 className="font-medium">Toolbar API</h5>
                    <code className="text-xs bg-gray-100 p-1 rounded">api.toolbar.addTool(config)</code>
                    <p className="text-xs text-gray-600 mt-1">Add a tool to the viewer toolbar</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium">Viewer API</h5>
                    <code className="text-xs bg-gray-100 p-1 rounded">api.viewer.getCurrentImage()</code>
                    <p className="text-xs text-gray-600 mt-1">Get the currently displayed image</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium">Panels API</h5>
                    <code className="text-xs bg-gray-100 p-1 rounded">api.panels.add(config)</code>
                    <p className="text-xs text-gray-600 mt-1">Add a panel to the viewer interface</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium">Notifications API</h5>
                    <code className="text-xs bg-gray-100 p-1 rounded">api.notifications.show(message)</code>
                    <p className="text-xs text-gray-600 mt-1">Display notifications to the user</p>
                  </Card>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Best Practices</h4>
                <div className="space-y-3">
                  <Card className="p-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Error Handling
                    </h5>
                    <p className="text-xs text-gray-600">Always wrap API calls in try-catch blocks and provide meaningful error messages.</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Resource Cleanup
                    </h5>
                    <p className="text-xs text-gray-600">Implement proper cleanup in the destroy() method to prevent memory leaks.</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Performance
                    </h5>
                    <p className="text-xs text-gray-600">Minimize DOM manipulations and use efficient algorithms for image processing.</p>
                  </Card>
                  <Card className="p-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Security
                    </h5>
                    <p className="text-xs text-gray-600">Request only necessary permissions and validate all user inputs.</p>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PluginDevelopment;