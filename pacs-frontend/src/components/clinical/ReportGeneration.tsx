import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTab,
  Badge,
  Label,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Progress,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator
} from '../ui';
import {
  FileText,
  Save,
  Send,
  Download,
  Upload,
  Eye,
  Edit,
  Copy,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Volume2,
  Clock,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle,
  Printer,
  Mail,
  Share,
  History,
  Template,
  Zap
} from 'lucide-react';

// Types
interface Report {
  id: string;
  studyInstanceUID: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  studyDescription: string;
  modality: string;
  studyDate: string;
  reportingPhysician: string;
  referringPhysician: string;
  reportStatus: 'DRAFT' | 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'CANCELLED';
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  templateId?: string;
  templateName?: string;
  findings: string;
  impression: string;
  recommendations: string;
  clinicalHistory: string;
  technique: string;
  comparison: string;
  addendum: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  signedBy?: string;
  dictationTime?: number; // seconds
  wordCount: number;
  characterCount: number;
  attachments: ReportAttachment[];
  annotations: ReportAnnotation[];
  macros: ReportMacro[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  modality: string[];
  bodyPart: string[];
  category: string;
  isActive: boolean;
  isDefault: boolean;
  structure: {
    clinicalHistory: string;
    technique: string;
    findings: string;
    impression: string;
    recommendations: string;
  };
  macros: ReportMacro[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface ReportMacro {
  id: string;
  name: string;
  shortcut: string;
  content: string;
  category: string;
  isGlobal: boolean;
  usageCount: number;
}

interface ReportAttachment {
  id: string;
  type: 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO';
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  description: string;
  createdAt: string;
}

interface ReportAnnotation {
  id: string;
  type: 'MEASUREMENT' | 'ARROW' | 'TEXT' | 'CIRCLE' | 'RECTANGLE';
  imageId: string;
  coordinates: { x: number; y: number; width?: number; height?: number };
  text: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

interface VoiceRecording {
  id: string;
  duration: number;
  transcript: string;
  confidence: number;
  isProcessing: boolean;
  audioUrl: string;
  createdAt: string;
}

const ReportGeneration: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [macros, setMacros] = useState<ReportMacro[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showMacroDialog, setShowMacroDialog] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterModality, setFilterModality] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Load reports
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to load reports');
      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/report-templates');
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, []);

  // Load macros
  const loadMacros = useCallback(async () => {
    try {
      const response = await fetch('/api/report-macros');
      if (!response.ok) throw new Error('Failed to load macros');
      const data = await response.json();
      setMacros(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load macros');
    }
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(async (report: Report) => {
    if (!autoSaveEnabled) return;
    
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, [autoSaveEnabled]);

  // Handle text changes with auto-save
  const handleTextChange = useCallback((field: keyof Report, value: string) => {
    if (!currentReport) return;

    const updatedReport = { ...currentReport, [field]: value };
    setCurrentReport(updatedReport);

    // Update word and character counts
    const allText = `${updatedReport.findings} ${updatedReport.impression} ${updatedReport.recommendations}`;
    setWordCount(allText.trim().split(/\s+/).length);
    setCharacterCount(allText.length);

    // Auto-save with debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave(updatedReport);
    }, 2000);
  }, [currentReport, autoSave]);

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Upload and transcribe
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) throw new Error('Transcription failed');
          
          const result = await response.json();
          setVoiceRecording({
            id: Date.now().toString(),
            duration: result.duration,
            transcript: result.transcript,
            confidence: result.confidence,
            isProcessing: false,
            audioUrl,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          setError('Transcription failed');
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Insert macro
  const insertMacro = (macro: ReportMacro) => {
    if (!currentReport || !editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue = currentValue.substring(0, start) + macro.content + currentValue.substring(end);
    
    // Update the current field being edited
    const activeField = textarea.getAttribute('data-field') as keyof Report;
    if (activeField) {
      handleTextChange(activeField, newValue);
    }

    // Update macro usage count
    fetch(`/api/report-macros/${macro.id}/usage`, { method: 'POST' });
  };

  // Apply template
  const applyTemplate = (template: ReportTemplate) => {
    if (!currentReport) return;

    const updatedReport = {
      ...currentReport,
      templateId: template.id,
      templateName: template.name,
      clinicalHistory: template.structure.clinicalHistory,
      technique: template.structure.technique,
      findings: template.structure.findings,
      impression: template.structure.impression,
      recommendations: template.structure.recommendations
    };

    setCurrentReport(updatedReport);
    setSelectedTemplate(template);
    
    // Update template usage count
    fetch(`/api/report-templates/${template.id}/usage`, { method: 'POST' });
  };

  // Save report
  const saveReport = async (status: 'DRAFT' | 'PRELIMINARY' | 'FINAL') => {
    if (!currentReport) return;

    try {
      const updatedReport = {
        ...currentReport,
        reportStatus: status,
        updatedAt: new Date().toISOString(),
        wordCount,
        characterCount
      };

      if (status === 'FINAL') {
        updatedReport.finalizedAt = new Date().toISOString();
        updatedReport.signedBy = 'current_user'; // Replace with actual user
      }

      const response = await fetch(`/api/reports/${currentReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReport)
      });

      if (!response.ok) throw new Error('Failed to save report');

      setCurrentReport(updatedReport);
      setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save report');
    }
  };

  // Export report
  const exportReport = async (format: 'pdf' | 'docx' | 'html') => {
    if (!currentReport) return;

    try {
      const response = await fetch(`/api/reports/${currentReport.id}/export?format=${format}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${currentReport.accessionNumber}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Print report
  const printReport = () => {
    if (!currentReport) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Medical Report - ${currentReport.accessionNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Medical Report</h1>
            <p><span class="label">Patient:</span> ${currentReport.patientName}</p>
            <p><span class="label">Accession:</span> ${currentReport.accessionNumber}</p>
            <p><span class="label">Study:</span> ${currentReport.studyDescription}</p>
            <p><span class="label">Date:</span> ${new Date(currentReport.studyDate).toLocaleDateString()}</p>
          </div>
          
          <div class="section">
            <h3>Clinical History</h3>
            <p>${currentReport.clinicalHistory}</p>
          </div>
          
          <div class="section">
            <h3>Technique</h3>
            <p>${currentReport.technique}</p>
          </div>
          
          <div class="section">
            <h3>Findings</h3>
            <p>${currentReport.findings}</p>
          </div>
          
          <div class="section">
            <h3>Impression</h3>
            <p>${currentReport.impression}</p>
          </div>
          
          <div class="section">
            <h3>Recommendations</h3>
            <p>${currentReport.recommendations}</p>
          </div>
          
          <div class="section">
            <p><span class="label">Reporting Physician:</span> ${currentReport.reportingPhysician}</p>
            <p><span class="label">Report Status:</span> ${currentReport.reportStatus}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  // Load data on mount
  useEffect(() => {
    loadReports();
    loadTemplates();
    loadMacros();
  }, [loadReports, loadTemplates, loadMacros]);

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.accessionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.studyDescription.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || report.reportStatus === filterStatus;
    const matchesModality = !filterModality || report.modality === filterModality;
    
    return matchesSearch && matchesStatus && matchesModality;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Report Generation</h1>
          <p className="text-gray-600 mt-1">Create and manage DICOM study reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTemplateDialog(true)} variant="outline">
            <Template className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => setShowMacroDialog(true)} variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Macros
          </Button>
          <Button onClick={loadReports} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTab value="reports">Reports</TabsTab>
          <TabsTab value="editor">Report Editor</TabsTab>
          <TabsTab value="templates">Templates</TabsTab>
          <TabsTab value="analytics">Analytics</TabsTab>
        </TabsList>

        {/* Reports List */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Reports ({filteredReports.length})</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PRELIMINARY">Preliminary</SelectItem>
                      <SelectItem value="FINAL">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterModality} onValueChange={setFilterModality}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Modality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Modalities</SelectItem>
                      <SelectItem value="CT">CT</SelectItem>
                      <SelectItem value="MR">MR</SelectItem>
                      <SelectItem value="XR">XR</SelectItem>
                      <SelectItem value="US">US</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => { setCurrentReport(report); setActiveTab('editor'); }}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{report.patientName}</h3>
                            <Badge variant="outline">{report.modality}</Badge>
                            <Badge className={`${
                              report.reportStatus === 'FINAL' ? 'bg-green-100 text-green-800' :
                              report.reportStatus === 'PRELIMINARY' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {report.reportStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {report.studyDescription} • {report.accessionNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(report.studyDate).toLocaleDateString()} • 
                            Dr. {report.reportingPhysician}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Editor */}
        <TabsContent value="editor">
          {currentReport ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Editor */}
              <div className="lg:col-span-3 space-y-6">
                {/* Report Header */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>{currentReport.patientName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {currentReport.studyDescription} • {currentReport.accessionNumber}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`${
                          currentReport.reportStatus === 'FINAL' ? 'bg-green-100 text-green-800' :
                          currentReport.reportStatus === 'PRELIMINARY' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {currentReport.reportStatus}
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {wordCount} words • {characterCount} characters
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Voice Recording */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={isRecording ? stopRecording : startRecording}
                        variant={isRecording ? "destructive" : "default"}
                      >
                        {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isRecording ? 'Stop Recording' : 'Start Dictation'}
                      </Button>
                      
                      {voiceRecording && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-gray-600">
                            {voiceRecording.duration}s • {voiceRecording.confidence}% confidence
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (voiceRecording.transcript) {
                                handleTextChange('findings', 
                                  currentReport.findings + '\n' + voiceRecording.transcript
                                );
                              }
                            }}
                          >
                            Insert Transcript
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Report Sections */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Clinical History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        ref={editorRef}
                        data-field="clinicalHistory"
                        value={currentReport.clinicalHistory}
                        onChange={(e) => handleTextChange('clinicalHistory', e.target.value)}
                        placeholder="Enter clinical history..."
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Technique</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        data-field="technique"
                        value={currentReport.technique}
                        onChange={(e) => handleTextChange('technique', e.target.value)}
                        placeholder="Enter technique..."
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        data-field="findings"
                        value={currentReport.findings}
                        onChange={(e) => handleTextChange('findings', e.target.value)}
                        placeholder="Enter findings..."
                        rows={8}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Impression</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        data-field="impression"
                        value={currentReport.impression}
                        onChange={(e) => handleTextChange('impression', e.target.value)}
                        placeholder="Enter impression..."
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        data-field="recommendations"
                        value={currentReport.recommendations}
                        onChange={(e) => handleTextChange('recommendations', e.target.value)}
                        placeholder="Enter recommendations..."
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button onClick={() => saveReport('DRAFT')} variant="outline">
                          <Save className="w-4 h-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button onClick={() => saveReport('PRELIMINARY')}>
                          <Send className="w-4 h-4 mr-2" />
                          Send Preliminary
                        </Button>
                        <Button onClick={() => saveReport('FINAL')} variant="default">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Finalize Report
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={printReport} variant="outline" size="sm">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => exportReport('pdf')} variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {templates.slice(0, 5).map((template) => (
                        <Button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Template className="w-4 h-4 mr-2" />
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Macros */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Macros</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {macros.slice(0, 8).map((macro) => (
                        <Button
                          key={macro.id}
                          onClick={() => insertMacro(macro)}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          {macro.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="autosave"
                          checked={autoSaveEnabled}
                          onCheckedChange={setAutoSaveEnabled}
                        />
                        <Label htmlFor="autosave" className="text-sm">Auto-save</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Report Selected</h3>
                <p className="text-gray-600 mb-4">Select a report from the list to start editing</p>
                <Button onClick={() => setActiveTab('reports')}>View Reports</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Report Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Used {template.usageCount} times</span>
                        <span>{template.modality.join(', ')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">
                      {reports.filter(r => r.reportStatus === 'DRAFT').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Finalized</p>
                    <p className="text-2xl font-bold">
                      {reports.filter(r => r.reportStatus === 'FINAL').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Words</p>
                    <p className="text-2xl font-bold">
                      {Math.round(reports.reduce((acc, r) => acc + r.wordCount, 0) / reports.length) || 0}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportGeneration;
export type { Report, ReportTemplate, ReportMacro, ReportAttachment, ReportAnnotation, VoiceRecording };