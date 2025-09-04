import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Grid,
  Layout,
  FileText,
  Save,
  Download,
  Upload,
  Settings,
  Search,
  Filter,
  Sort,
  Calendar,
  Clock,
  User,
  Hospital,
  Stethoscope,
  Brain,
  Heart,
  Bone,
  Eye,
  Zap,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Bookmark,
  Share,
  Print,
  Mail,
  Phone,
  MessageSquare,
  Video,
  Mic,
  Camera,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  X
} from 'lucide-react';

import ClinicalWorkflowManager, {
  Study,
  HangingProtocol,
  ViewportConfig,
  WorklistFilter,
  ReportTemplate,
  ClinicalWorkflowConfig
} from './ClinicalWorkflowManager';

interface ClinicalWorkflowUIProps {
  workflowManager?: ClinicalWorkflowManager | null;
  theme?: 'dark' | 'light';
  onClose?: () => void;
  onStudySelect?: (study: Study) => void;
  onProtocolChange?: (protocol: HangingProtocol) => void;
  onReportGenerate?: (studyId: string, report: string) => void;
  className?: string;
}

const ClinicalWorkflowUI: React.FC<ClinicalWorkflowUIProps> = ({
  workflowManager: externalWorkflowManager,
  theme = 'dark',
  onClose,
  onStudySelect,
  onProtocolChange,
  onReportGenerate,
  className = ''
}) => {
  const [workflowManager] = useState(() => externalWorkflowManager || new ClinicalWorkflowManager());
  const [studies, setStudies] = useState<Study[]>([]);
  const [hangingProtocols, setHangingProtocols] = useState<HangingProtocol[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [currentStudy, setCurrentStudy] = useState<Study | null>(null);
  const [currentProtocol, setCurrentProtocol] = useState<HangingProtocol | null>(null);
  const [activeTab, setActiveTab] = useState('worklist');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<WorklistFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStudies, setSelectedStudies] = useState<Set<string>>(new Set());
  const [reportContent, setReportContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Initialize workflow manager
  useEffect(() => {
    const initializeWorkflow = async () => {
      try {
        await workflowManager.initialize();
        
        // Load initial data
        setStudies(workflowManager.getStudies());
        setHangingProtocols(workflowManager.getHangingProtocols());
        setReportTemplates(workflowManager.getReportTemplates());
        
        // Set up event listeners
        workflowManager.on('studyAdded', (study: Study) => {
          setStudies(prev => [...prev, study]);
        });
        
        workflowManager.on('studyUpdated', (study: Study) => {
          setStudies(prev => prev.map(s => s.id === study.id ? study : s));
        });
        
        workflowManager.on('hangingProtocolCreated', (protocol: HangingProtocol) => {
          setHangingProtocols(prev => [...prev, protocol]);
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize workflow manager:', error);
        setIsLoading(false);
      }
    };
    
    initializeWorkflow();
    
    return () => {
      workflowManager.destroy();
    };
  }, [workflowManager]);

  // Handle study selection
  const handleStudySelect = useCallback((study: Study) => {
    setCurrentStudy(study);
    workflowManager.setCurrentStudy(study);
    
    // Auto-select optimal hanging protocol
    const optimalProtocol = workflowManager.selectOptimalHangingProtocol(study);
    if (optimalProtocol) {
      setCurrentProtocol(optimalProtocol);
      workflowManager.setCurrentProtocol(optimalProtocol);
      onProtocolChange?.(optimalProtocol);
    }
    
    onStudySelect?.(study);
  }, [workflowManager, onStudySelect, onProtocolChange]);

  // Handle protocol change
  const handleProtocolChange = useCallback((protocolId: string) => {
    const protocol = workflowManager.getHangingProtocol(protocolId);
    if (protocol) {
      setCurrentProtocol(protocol);
      workflowManager.setCurrentProtocol(protocol);
      onProtocolChange?.(protocol);
    }
  }, [workflowManager, onProtocolChange]);

  // Handle report generation
  const handleGenerateReport = useCallback(async () => {
    if (!currentStudy) return;
    
    setIsGeneratingReport(true);
    try {
      const report = workflowManager.generateReport(currentStudy.id, selectedTemplate);
      setReportContent(report);
      onReportGenerate?.(currentStudy.id, report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [currentStudy, selectedTemplate, workflowManager, onReportGenerate]);

  // Filter studies based on search and filters
  const filteredStudies = studies.filter(study => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!(
        study.patientName.toLowerCase().includes(searchLower) ||
        study.patientId.toLowerCase().includes(searchLower) ||
        study.accessionNumber.toLowerCase().includes(searchLower) ||
        study.studyDescription.toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }
    
    // Apply additional filters
    if (filters.modality && filters.modality.length > 0) {
      if (!filters.modality.includes(study.modality)) return false;
    }
    
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(study.priority)) return false;
    }
    
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(study.status)) return false;
    }
    
    return true;
  });

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return 'bg-red-500';
      case 'URGENT': return 'bg-orange-500';
      case 'HIGH': return 'bg-yellow-500';
      case 'ROUTINE': return 'bg-green-500';
      case 'LOW': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'IN_PROGRESS': return 'text-blue-600';
      case 'SCHEDULED': return 'text-yellow-600';
      case 'CANCELLED': return 'text-red-600';
      case 'REPORTED': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Initializing Clinical Workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`clinical-workflow-ui ${className}`}>
      {/* Header with Close Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Clinical Workflow
        </h2>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={`h-8 w-8 p-0 ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="worklist" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Worklist
          </TabsTrigger>
          <TabsTrigger value="protocols" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Protocols
          </TabsTrigger>
          <TabsTrigger value="reporting" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reporting
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Worklist Tab */}
        <TabsContent value="worklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Study Worklist ({filteredStudies.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by patient name, ID, accession number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              {/* Filters Panel */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Modality</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All modalities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CT">CT</SelectItem>
                        <SelectItem value="MR">MR</SelectItem>
                        <SelectItem value="CR">CR</SelectItem>
                        <SelectItem value="DX">DX</SelectItem>
                        <SelectItem value="US">US</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAT">STAT</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="ROUTINE">Routine</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="REPORTED">Reported</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredStudies.map((study) => (
                    <div
                      key={study.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        currentStudy?.id === study.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => handleStudySelect(study)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{study.patientName}</h4>
                            <Badge variant="outline">{study.patientId}</Badge>
                            <Badge className={getPriorityColor(study.priority)}>
                              {study.priority}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>{study.modality}</span>
                              <span>{study.bodyPart}</span>
                              <span>{study.studyDate.toLocaleDateString()}</span>
                            </div>
                            <div>{study.studyDescription}</div>
                            <div className="flex items-center gap-2">
                              <span>Acc: {study.accessionNumber}</span>
                              <span className={getStatusColor(study.status)}>
                                {study.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {study.aiAnalysis?.completed && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {study.bookmarked && (
                            <Bookmark className="h-4 w-4 text-yellow-500" />
                          )}
                          {study.starred && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hanging Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Hanging Protocols
                </CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Protocol
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hangingProtocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      currentProtocol?.id === protocol.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => handleProtocolChange(protocol.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{protocol.name}</h4>
                      {protocol.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{protocol.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Grid className="h-4 w-4" />
                        <span>{protocol.layout.rows}×{protocol.layout.columns} layout</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {protocol.modality.map((mod) => (
                          <Badge key={mod} variant="outline" className="text-xs">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Used {protocol.usageCount} times
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reporting Tab */}
        <TabsContent value="reporting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Report Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Templates
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 mb-4">
                  {reportTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedTemplate === template.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{template.name}</h5>
                        {template.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={handleGenerateReport}
                  disabled={!currentStudy || !selectedTemplate || isGeneratingReport}
                  className="w-full"
                >
                  {isGeneratingReport ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardContent>
            </Card>
            
            {/* Report Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Report Editor</CardTitle>
              </CardHeader>
              
              <CardContent>
                <Textarea
                  placeholder="Generated report will appear here..."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  className="min-h-96 font-mono text-sm"
                />
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workflow Settings
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto Hanging Protocols</Label>
                    <Checkbox defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>AI Integration</Label>
                    <Checkbox defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Template Reporting</Label>
                    <Checkbox defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Study Comparison</Label>
                    <Checkbox defaultChecked />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Auto-save Interval (seconds)</Label>
                    <Input type="number" defaultValue="30" className="mt-1" />
                  </div>
                  
                  <div>
                    <Label>Worklist Refresh (seconds)</Label>
                    <Input type="number" defaultValue="60" className="mt-1" />
                  </div>
                  
                  <div>
                    <Label>Default Hanging Protocol</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default protocol" />
                      </SelectTrigger>
                      <SelectContent>
                        {hangingProtocols.map((protocol) => (
                          <SelectItem key={protocol.id} value={protocol.id}>
                            {protocol.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicalWorkflowUI;