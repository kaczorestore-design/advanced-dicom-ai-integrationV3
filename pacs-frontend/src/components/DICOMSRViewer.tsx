import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  FileText, 
  Search,
  Filter,
  Download,
  Upload,
  Save,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Copy,
  Trash2,
  Calendar,
  User,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Stethoscope,
  Activity,
  Target,
  Layers,
  BookOpen,
  Database,
  Settings,
  RefreshCw,
  ExternalLink,
  Printer,
  Share2
} from 'lucide-react';

interface DICOMSRViewerProps {
  srData?: DICOMSRDocument | null;
  theme: string;
  onSRChange?: (sr: DICOMSRDocument) => void;
  onFindingSelect?: (finding: SRFinding) => void;
  onMeasurementSelect?: (measurement: SRMeasurement) => void;
}

interface DICOMSRDocument {
  id: string;
  sopInstanceUID: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  documentTitle: string;
  documentType: SRDocumentType;
  creationDate: Date;
  creationTime: Date;
  author: SRAuthor;
  verificationFlag: 'VERIFIED' | 'UNVERIFIED';
  completionFlag: 'COMPLETE' | 'PARTIAL';
  contentSequence: SRContentItem[];
  findings: SRFinding[];
  measurements: SRMeasurement[];
  conclusions: SRConclusion[];
  recommendations: SRRecommendation[];
  metadata: SRMetadata;
}

interface SRAuthor {
  name: string;
  institution: string;
  department: string;
  role: string;
  contactInfo: string;
}

interface SRContentItem {
  id: string;
  relationshipType: 'CONTAINS' | 'HAS_OBS_CONTEXT' | 'HAS_ACQ_CONTEXT' | 'HAS_CONCEPT_MOD' | 'HAS_PROPERTIES';
  valueType: 'TEXT' | 'CODE' | 'NUM' | 'DATE' | 'TIME' | 'DATETIME' | 'PNAME' | 'UIDREF' | 'SPATIAL_COORDINATES' | 'IMAGE';
  conceptName: SRCodedConcept;
  textValue?: string;
  numericValue?: SRNumericValue;
  codedValue?: SRCodedConcept;
  dateValue?: Date;
  spatialCoordinates?: SRSpatialCoordinates;
  imageReference?: SRImageReference;
  children: SRContentItem[];
}

interface SRCodedConcept {
  codeValue: string;
  codingSchemeDesignator: string;
  codingSchemeVersion?: string;
  codeMeaning: string;
}

interface SRNumericValue {
  value: number;
  unit: SRCodedConcept;
  qualifier?: SRCodedConcept;
}

interface SRSpatialCoordinates {
  type: 'POINT' | 'MULTIPOINT' | 'POLYLINE' | 'CIRCLE' | 'ELLIPSE';
  coordinates: number[];
  frameOfReferenceUID?: string;
  referencedImageSOPInstanceUID?: string;
}

interface SRImageReference {
  sopInstanceUID: string;
  sopClassUID: string;
  frameNumber?: number;
  segmentNumber?: number;
}

interface SRFinding {
  id: string;
  category: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  location: SRAnatomicLocation;
  measurements: string[];
  images: string[];
  status: 'PRELIMINARY' | 'FINAL' | 'AMENDED' | 'CORRECTED';
  createdAt: Date;
  modifiedAt: Date;
}

interface SRAnatomicLocation {
  organ: SRCodedConcept;
  region?: SRCodedConcept;
  laterality?: 'LEFT' | 'RIGHT' | 'BILATERAL';
  quadrant?: string;
}

interface SRMeasurement {
  id: string;
  name: string;
  value: number;
  unit: string;
  method: string;
  location: SRAnatomicLocation;
  normalRange?: { min: number; max: number };
  isAbnormal: boolean;
  confidence: number;
  derivedFrom: string[];
  coordinates?: SRSpatialCoordinates;
}

interface SRConclusion {
  id: string;
  category: string;
  text: string;
  confidence: number;
  supportingFindings: string[];
  recommendations: string[];
}

interface SRRecommendation {
  id: string;
  type: 'FOLLOW_UP' | 'ADDITIONAL_IMAGING' | 'CLINICAL_CORRELATION' | 'BIOPSY' | 'TREATMENT';
  description: string;
  urgency: 'ROUTINE' | 'URGENT' | 'EMERGENT';
  timeframe?: string;
  reasoning: string;
}

interface SRMetadata {
  templateID?: string;
  templateVersion?: string;
  language: string;
  characterSet: string;
  institutionName: string;
  manufacturerModelName: string;
  softwareVersions: string[];
  acquisitionContext: any;
}

type SRDocumentType = 
  | 'BASIC_TEXT_SR'
  | 'ENHANCED_SR'
  | 'COMPREHENSIVE_SR'
  | 'MAMMOGRAPHY_CAD_SR'
  | 'CHEST_CAD_SR'
  | 'COLON_CAD_SR'
  | 'PROCEDURE_LOG'
  | 'X_RAY_RADIATION_DOSE_SR'
  | 'CT_RADIATION_DOSE_SR'
  | 'RADIOPHARMACEUTICAL_RADIATION_DOSE_SR';

const DICOMSRViewer: React.FC<DICOMSRViewerProps> = ({
  srData,
  theme,
  onSRChange,
  onFindingSelect,
  onMeasurementSelect
}) => {
  const [currentSR, setCurrentSR] = useState<DICOMSRDocument | null>(srData || null);
  const [selectedFinding, setSelectedFinding] = useState<string | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showMetadata, setShowMetadata] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['findings']));

  // SR Templates
  const [srTemplates] = useState([
    {
      id: 'chest_ct_template',
      name: 'Chest CT Report',
      type: 'ENHANCED_SR' as SRDocumentType,
      sections: ['Clinical History', 'Technique', 'Findings', 'Impression']
    },
    {
      id: 'brain_mri_template',
      name: 'Brain MRI Report',
      type: 'COMPREHENSIVE_SR' as SRDocumentType,
      sections: ['Clinical History', 'Technique', 'Findings', 'Impression', 'Recommendations']
    },
    {
      id: 'mammography_template',
      name: 'Mammography Report',
      type: 'MAMMOGRAPHY_CAD_SR' as SRDocumentType,
      sections: ['Clinical History', 'Technique', 'Findings', 'BI-RADS Assessment', 'Recommendations']
    }
  ]);

  // Predefined anatomical locations
  const anatomicalLocations = [
    { organ: 'Lung', regions: ['Upper Lobe', 'Middle Lobe', 'Lower Lobe'] },
    { organ: 'Heart', regions: ['Left Ventricle', 'Right Ventricle', 'Left Atrium', 'Right Atrium'] },
    { organ: 'Brain', regions: ['Frontal Lobe', 'Parietal Lobe', 'Temporal Lobe', 'Occipital Lobe'] },
    { organ: 'Liver', regions: ['Right Lobe', 'Left Lobe', 'Caudate Lobe', 'Quadrate Lobe'] },
    { organ: 'Kidney', regions: ['Upper Pole', 'Mid Pole', 'Lower Pole'] }
  ];

  const contentTreeRef = useRef<HTMLDivElement>(null);

  // Initialize with sample SR data if none provided
  useEffect(() => {
    if (!srData && !currentSR) {
      const sampleSR: DICOMSRDocument = {
        id: 'sr_' + Date.now(),
        sopInstanceUID: '1.2.3.4.5.6.7.8.9.10',
        studyInstanceUID: '1.2.3.4.5.6.7.8.9',
        seriesInstanceUID: '1.2.3.4.5.6.7.8',
        documentTitle: 'Chest CT Report',
        documentType: 'ENHANCED_SR',
        creationDate: new Date(),
        creationTime: new Date(),
        author: {
          name: 'Dr. John Smith',
          institution: 'General Hospital',
          department: 'Radiology',
          role: 'Radiologist',
          contactInfo: 'john.smith@hospital.com'
        },
        verificationFlag: 'VERIFIED',
        completionFlag: 'COMPLETE',
        contentSequence: [],
        findings: [
          {
            id: 'finding_1',
            category: 'Pulmonary',
            description: 'Small nodule in right upper lobe measuring 8mm',
            severity: 'MODERATE',
            confidence: 0.85,
            location: {
              organ: { codeValue: 'T-28000', codingSchemeDesignator: 'SRT', codeMeaning: 'Lung' },
              region: { codeValue: 'T-28821', codingSchemeDesignator: 'SRT', codeMeaning: 'Upper lobe of right lung' },
              laterality: 'RIGHT'
            },
            measurements: ['measurement_1'],
            images: ['image_1'],
            status: 'FINAL',
            createdAt: new Date(),
            modifiedAt: new Date()
          }
        ],
        measurements: [
          {
            id: 'measurement_1',
            name: 'Nodule Diameter',
            value: 8.2,
            unit: 'mm',
            method: 'Manual measurement',
            location: {
              organ: { codeValue: 'T-28000', codingSchemeDesignator: 'SRT', codeMeaning: 'Lung' },
              laterality: 'RIGHT'
            },
            normalRange: { min: 0, max: 3 },
            isAbnormal: true,
            confidence: 0.95,
            derivedFrom: ['image_1']
          }
        ],
        conclusions: [
          {
            id: 'conclusion_1',
            category: 'Primary',
            text: 'Small pulmonary nodule requiring follow-up imaging',
            confidence: 0.9,
            supportingFindings: ['finding_1'],
            recommendations: ['recommendation_1']
          }
        ],
        recommendations: [
          {
            id: 'recommendation_1',
            type: 'FOLLOW_UP',
            description: 'Follow-up CT in 6 months to assess for interval change',
            urgency: 'ROUTINE',
            timeframe: '6 months',
            reasoning: 'Small nodule size warrants surveillance'
          }
        ],
        metadata: {
          language: 'en-US',
          characterSet: 'ISO_IR 100',
          institutionName: 'General Hospital',
          manufacturerModelName: 'DICOM SR Viewer',
          softwareVersions: ['1.0.0'],
          acquisitionContext: {}
        }
      };
      
      setCurrentSR(sampleSR);
    }
  }, [srData, currentSR]);

  // Filter findings based on search and filters
  const filteredFindings = currentSR?.findings.filter(finding => {
    const matchesSearch = finding.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         finding.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || finding.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || finding.severity === filterSeverity;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  }) || [];

  // Get unique categories and severities for filters
  const categories = Array.from(new Set(currentSR?.findings.map(f => f.category) || []));
  const severities = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

  // Handle finding selection
  const handleFindingSelect = useCallback((findingId: string) => {
    setSelectedFinding(findingId);
    const finding = currentSR?.findings.find(f => f.id === findingId);
    if (finding && onFindingSelect) {
      onFindingSelect(finding);
    }
  }, [currentSR, onFindingSelect]);

  // Handle measurement selection
  const handleMeasurementSelect = useCallback((measurementId: string) => {
    setSelectedMeasurement(measurementId);
    const measurement = currentSR?.measurements.find(m => m.id === measurementId);
    if (measurement && onMeasurementSelect) {
      onMeasurementSelect(measurement);
    }
  }, [currentSR, onMeasurementSelect]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }, [expandedSections]);

  // Export SR document
  const exportSR = useCallback(() => {
    if (!currentSR) return;
    
    const exportData = {
      ...currentSR,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentSR.documentTitle}_SR.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [currentSR]);

  // Import SR document
  const importSR = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSR = JSON.parse(e.target?.result as string);
        setCurrentSR(importedSR);
        
        if (onSRChange) {
          onSRChange(importedSR);
        }
      } catch (error) {
        console.error('Failed to import SR document:', error);
      }
    };
    reader.readAsText(file);
  }, [onSRChange]);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FINAL': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PRELIMINARY': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'AMENDED': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'CORRECTED': return <RefreshCw className="w-4 h-4 text-orange-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!currentSR) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No DICOM SR document loaded</p>
          <Button className="mt-4" onClick={() => document.getElementById('sr-import')?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Load SR Document
          </Button>
          <input
            id="sr-import"
            type="file"
            accept=".json,.dcm"
            className="hidden"
            onChange={importSR}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{currentSR.documentTitle}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>Type: {currentSR.documentType}</span>
              <span>Author: {currentSR.author.name}</span>
              <span>Date: {currentSR.creationDate.toLocaleDateString()}</span>
              <Badge variant={currentSR.verificationFlag === 'VERIFIED' ? 'default' : 'secondary'}>
                {currentSR.verificationFlag}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowMetadata(!showMetadata)}>
              <Info className="w-4 h-4 mr-1" />
              Metadata
            </Button>
            <Button size="sm" variant="outline" onClick={exportSR}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById('sr-import')?.click()}>
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
            <input
              id="sr-import"
              type="file"
              accept=".json,.dcm"
              className="hidden"
              onChange={importSR}
            />
          </div>
        </div>
        
        {/* Search and filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search findings, measurements, conclusions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {severities.map(severity => (
                <SelectItem key={severity} value={severity}>{severity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="structured" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="structured">Structured View</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="report">Report View</TabsTrigger>
          </TabsList>
          
          {/* Structured view */}
          <TabsContent value="structured" className="h-full p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Findings section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => toggleSection('findings')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Findings ({currentSR.findings.length})
                    </CardTitle>
                    {expandedSections.has('findings') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {expandedSections.has('findings') && (
                  <CardContent>
                    <div className="space-y-3">
                      {filteredFindings.map(finding => (
                        <div 
                          key={finding.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedFinding === finding.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => handleFindingSelect(finding.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getSeverityColor(finding.severity)}>
                                  {finding.severity}
                                </Badge>
                                <Badge variant="outline">{finding.category}</Badge>
                                {getStatusIcon(finding.status)}
                              </div>
                              <p className="text-sm">{finding.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>Confidence: {(finding.confidence * 100).toFixed(0)}%</span>
                                <span>Location: {finding.location.organ.codeMeaning}</span>
                                {finding.location.laterality && (
                                  <span>Side: {finding.location.laterality}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
              
              {/* Measurements section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => toggleSection('measurements')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Measurements ({currentSR.measurements.length})
                    </CardTitle>
                    {expandedSections.has('measurements') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {expandedSections.has('measurements') && (
                  <CardContent>
                    <div className="space-y-3">
                      {currentSR.measurements.map(measurement => (
                        <div 
                          key={measurement.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedMeasurement === measurement.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => handleMeasurementSelect(measurement.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{measurement.name}</div>
                              <div className="text-lg font-bold">
                                {measurement.value} {measurement.unit}
                                {measurement.isAbnormal && (
                                  <Badge variant="destructive" className="ml-2 text-xs">Abnormal</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Method: {measurement.method} | Confidence: {(measurement.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                            {measurement.normalRange && (
                              <div className="text-xs text-gray-500">
                                Normal: {measurement.normalRange.min}-{measurement.normalRange.max} {measurement.unit}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
              
              {/* Conclusions section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => toggleSection('conclusions')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Conclusions ({currentSR.conclusions.length})
                    </CardTitle>
                    {expandedSections.has('conclusions') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {expandedSections.has('conclusions') && (
                  <CardContent>
                    <div className="space-y-3">
                      {currentSR.conclusions.map(conclusion => (
                        <div key={conclusion.id} className="p-3 border rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{conclusion.category}</Badge>
                            <span className="text-xs text-gray-500">
                              Confidence: {(conclusion.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm">{conclusion.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
              
              {/* Recommendations section */}
              <Card>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => toggleSection('recommendations')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      Recommendations ({currentSR.recommendations.length})
                    </CardTitle>
                    {expandedSections.has('recommendations') ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {expandedSections.has('recommendations') && (
                  <CardContent>
                    <div className="space-y-3">
                      {currentSR.recommendations.map(recommendation => (
                        <div key={recommendation.id} className="p-3 border rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={recommendation.urgency === 'EMERGENT' ? 'destructive' : 
                                          recommendation.urgency === 'URGENT' ? 'default' : 'secondary'}>
                              {recommendation.urgency}
                            </Badge>
                            <Badge variant="outline">{recommendation.type}</Badge>
                            {recommendation.timeframe && (
                              <span className="text-xs text-gray-500">{recommendation.timeframe}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">{recommendation.description}</p>
                          <p className="text-xs text-gray-600">{recommendation.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
          
          {/* Findings tab */}
          <TabsContent value="findings" className="h-full p-4 overflow-y-auto">
            <div className="space-y-3">
              {filteredFindings.map(finding => (
                <Card key={finding.id} className={selectedFinding === finding.id ? 'border-blue-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(finding.severity)}>
                          {finding.severity}
                        </Badge>
                        <Badge variant="outline">{finding.category}</Badge>
                        {getStatusIcon(finding.status)}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleFindingSelect(finding.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                    
                    <p className="text-sm mb-3">{finding.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Location:</span>
                        <div className="mt-1">
                          <div>Organ: {finding.location.organ.codeMeaning}</div>
                          {finding.location.region && (
                            <div>Region: {finding.location.region.codeMeaning}</div>
                          )}
                          {finding.location.laterality && (
                            <div>Side: {finding.location.laterality}</div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Details:</span>
                        <div className="mt-1">
                          <div>Confidence: {(finding.confidence * 100).toFixed(0)}%</div>
                          <div>Measurements: {finding.measurements.length}</div>
                          <div>Images: {finding.images.length}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Measurements tab */}
          <TabsContent value="measurements" className="h-full p-4 overflow-y-auto">
            <div className="space-y-3">
              {currentSR.measurements.map(measurement => (
                <Card key={measurement.id} className={selectedMeasurement === measurement.id ? 'border-blue-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{measurement.name}</span>
                        {measurement.isAbnormal && (
                          <Badge variant="destructive">Abnormal</Badge>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMeasurementSelect(measurement.id)}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Locate
                      </Button>
                    </div>
                    
                    <div className="text-2xl font-bold mb-2">
                      {measurement.value} {measurement.unit}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Method:</span>
                        <div>{measurement.method}</div>
                        <span className="font-medium mt-2 block">Confidence:</span>
                        <div>{(measurement.confidence * 100).toFixed(0)}%</div>
                      </div>
                      
                      {measurement.normalRange && (
                        <div>
                          <span className="font-medium">Normal Range:</span>
                          <div>{measurement.normalRange.min} - {measurement.normalRange.max} {measurement.unit}</div>
                          <span className="font-medium mt-2 block">Status:</span>
                          <div className={measurement.isAbnormal ? 'text-red-600' : 'text-green-600'}>
                            {measurement.isAbnormal ? 'Abnormal' : 'Normal'}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Report view */}
          <TabsContent value="report" className="h-full p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Report header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">{currentSR.documentTitle}</h1>
                <div className="mt-2 text-sm text-gray-600">
                  <div>Patient Study: {currentSR.studyInstanceUID}</div>
                  <div>Report Date: {currentSR.creationDate.toLocaleDateString()}</div>
                  <div>Radiologist: {currentSR.author.name}, {currentSR.author.institution}</div>
                </div>
              </div>
              
              {/* Clinical findings */}
              <div>
                <h2 className="text-lg font-semibold mb-3">FINDINGS:</h2>
                <div className="space-y-2">
                  {currentSR.findings.map((finding, index) => (
                    <p key={finding.id} className="text-sm leading-relaxed">
                      {index + 1}. {finding.description}
                      {finding.measurements.length > 0 && (
                        <span className="ml-2 text-gray-600">
                          (Measurements: {finding.measurements.map(id => {
                            const measurement = currentSR.measurements.find(m => m.id === id);
                            return measurement ? `${measurement.value}${measurement.unit}` : '';
                          }).join(', ')})
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
              
              {/* Impression */}
              <div>
                <h2 className="text-lg font-semibold mb-3">IMPRESSION:</h2>
                <div className="space-y-2">
                  {currentSR.conclusions.map((conclusion, index) => (
                    <p key={conclusion.id} className="text-sm leading-relaxed">
                      {index + 1}. {conclusion.text}
                    </p>
                  ))}
                </div>
              </div>
              
              {/* Recommendations */}
              {currentSR.recommendations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">RECOMMENDATIONS:</h2>
                  <div className="space-y-2">
                    {currentSR.recommendations.map((recommendation, index) => (
                      <p key={recommendation.id} className="text-sm leading-relaxed">
                        {index + 1}. {recommendation.description}
                        {recommendation.timeframe && (
                          <span className="ml-2 text-gray-600">({recommendation.timeframe})</span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Report footer */}
              <div className="border-t pt-4 text-xs text-gray-500">
                <div>Report Status: {currentSR.verificationFlag}</div>
                <div>Completion: {currentSR.completionFlag}</div>
                <div>Generated: {new Date().toLocaleString()}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Metadata panel */}
      {showMetadata && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-medium mb-2">Document Information</h4>
              <div className="space-y-1">
                <div>SOP Instance UID: {currentSR.sopInstanceUID}</div>
                <div>Study Instance UID: {currentSR.studyInstanceUID}</div>
                <div>Series Instance UID: {currentSR.seriesInstanceUID}</div>
                <div>Document Type: {currentSR.documentType}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Technical Details</h4>
              <div className="space-y-1">
                <div>Language: {currentSR.metadata.language}</div>
                <div>Character Set: {currentSR.metadata.characterSet}</div>
                <div>Institution: {currentSR.metadata.institutionName}</div>
                <div>Software: {currentSR.metadata.softwareVersions.join(', ')}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DICOMSRViewer;
export type { 
  DICOMSRDocument, 
  SRFinding, 
  SRMeasurement, 
  SRConclusion, 
  SRRecommendation,
  SRContentItem,
  SRCodedConcept,
  SRNumericValue,
  SRSpatialCoordinates
};