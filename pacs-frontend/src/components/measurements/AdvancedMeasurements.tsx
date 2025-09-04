import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  Ruler,
  Circle,
  Square,
  Triangle,
  // TODO: Replace with correct polygon icon from lucide-react
  // Polygon,
  Target,
  Calculator,
  Download,
  Trash2,
  Eye,
  Activity,
  Brain,
  Heart,
  Bone,
  RefreshCw,
  Plus,
  AlertTriangle,
  Zap,
  Move3D,
  FileText,
  EyeOff
} from 'lucide-react';

// Types
interface Measurement {
  id: string;
  type: MeasurementType;
  name: string;
  description?: string;
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  frameNumber?: number;
  coordinates: Point[];
  properties: MeasurementProperties;
  statistics: MeasurementStatistics;
  metadata: MeasurementMetadata;
  annotations: Annotation[];
  isVisible: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  modifiedBy?: string;
  version: number;
  parentId?: string; // For linked measurements
  groupId?: string; // For measurement groups
}

interface Point {
  x: number;
  y: number;
  z?: number;
}

interface MeasurementProperties {
  length?: number; // mm
  area?: number; // mm²
  volume?: number; // mm³
  perimeter?: number; // mm
  diameter?: number; // mm
  radius?: number; // mm
  angle?: number; // degrees
  pixelValue?: number;
  meanPixelValue?: number;
  standardDeviation?: number;
  minPixelValue?: number;
  maxPixelValue?: number;
  pixelCount?: number;
  hounsfield?: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  suv?: SUVCalculation;
  density?: number; // g/cm³
  elasticity?: number; // kPa
  perfusion?: PerfusionMetrics;
  diffusion?: DiffusionMetrics;
}

export interface SUVCalculation {
  suvMax: number;
  suvMean: number;
  suvPeak: number;
  suvMin: number;
  tlg: number; // Total Lesion Glycolysis
  mtv: number; // Metabolic Tumor Volume
  suvThreshold: number;
  injectedDose: number; // MBq
  patientWeight: number; // kg
  scanTime: string;
  injectionTime: string;
  halfLife: number; // minutes
  decayFactor: number;
  calibrationFactor: number;
  units: 'g/ml' | 'bw' | 'lbm' | 'bsa' | 'ibw';
}

interface PerfusionMetrics {
  bloodFlow: number; // ml/100g/min
  bloodVolume: number; // ml/100g
  meanTransitTime: number; // seconds
  permeability: number; // ml/100g/min
  timeToMaximum: number; // seconds
  maximumSlope: number;
}

interface DiffusionMetrics {
  adc: number; // mm²/s
  fa: number; // Fractional Anisotropy
  md: number; // Mean Diffusivity
  rd: number; // Radial Diffusivity
  ad: number; // Axial Diffusivity
  trace: number;
}

interface MeasurementStatistics {
  histogram: HistogramData;
  percentiles: Record<number, number>;
  moments: {
    mean: number;
    variance: number;
    skewness: number;
    kurtosis: number;
  };
  texture: TextureAnalysis;
}

interface HistogramData {
  bins: number[];
  counts: number[];
  binWidth: number;
  totalCount: number;
}

interface TextureAnalysis {
  glcm: {
    contrast: number;
    correlation: number;
    energy: number;
    homogeneity: number;
    entropy: number;
  };
  glrlm: {
    shortRunEmphasis: number;
    longRunEmphasis: number;
    grayLevelNonUniformity: number;
    runLengthNonUniformity: number;
    runPercentage: number;
  };
  glszm: {
    smallZoneEmphasis: number;
    largeZoneEmphasis: number;
    grayLevelNonUniformity: number;
    sizeZoneNonUniformity: number;
    zonePercentage: number;
  };
}

export interface MeasurementMetadata {
  pixelSpacing: [number, number];
  sliceThickness: number;
  imageOrientation: number[];
  imagePosition: number[];
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number;
  windowWidth: number;
  modality: string;
  bodyPart: string;
  studyDescription: string;
  seriesDescription: string;
  acquisitionDate: string;
  acquisitionTime: string;
  manufacturer: string;
  modelName: string;
  softwareVersion: string;
}

interface Annotation {
  id: string;
  text: string;
  position: Point;
  author: string;
  timestamp: string;
  isVisible: boolean;
}

type MeasurementType = 
  | 'length'
  | 'area'
  | 'volume'
  | 'angle'
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'freehand'
  | 'point'
  | 'arrow'
  | 'bidirectional'
  | 'cobb-angle'
  | 'spine-labeling'
  | 'suv-roi'
  | 'perfusion-roi'
  | 'diffusion-roi'
  | 'vessel-analysis'
  | 'cardiac-function'
  | 'lung-nodule'
  | 'bone-density'
  | 'tumor-response';

interface MeasurementTemplate {
  id: string;
  name: string;
  description: string;
  type: MeasurementType;
  defaultProperties: Partial<MeasurementProperties>;
  requiredFields: string[];
  calculations: CalculationFormula[];
  normalRanges: NormalRange[];
  category: string;
  modality: string[];
  bodyPart: string[];
}

interface CalculationFormula {
  name: string;
  formula: string;
  description: string;
  units: string;
  dependencies: string[];
}

interface NormalRange {
  parameter: string;
  ageGroup: string;
  gender: 'M' | 'F' | 'All';
  min: number;
  max: number;
  mean: number;
  std: number;
  units: string;
  reference: string;
}

interface MeasurementSession {
  id: string;
  name: string;
  studyInstanceUID: string;
  measurements: string[]; // measurement IDs
  template?: string;
  status: 'draft' | 'completed' | 'reviewed' | 'approved';
  reviewer?: string;
  reviewDate?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const AdvancedMeasurements: React.FC = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [sessions, setSessions] = useState<MeasurementSession[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [activeTool, setActiveTool] = useState<MeasurementType | null>(null);
  const [_activeSession, _setActiveSession] = useState<MeasurementSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('measurements');
  const [_showMeasurementDialog, setShowMeasurementDialog] = useState(false);
  const [_showTemplateDialog, _setShowTemplateDialog] = useState(false);
  const [_showSUVDialog, setShowSUVDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterModality, setFilterModality] = useState<string>('');
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const [suvSettings, setSuvSettings] = useState({
    injectedDose: 370, // MBq
    patientWeight: 70, // kg
    injectionTime: '',
    scanTime: '',
    halfLife: 109.8, // F-18 half-life in minutes
    units: 'bw' as 'bw' | 'lbm' | 'bsa' | 'g/ml',
    threshold: 2.5
  });


  // Load measurements
  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/measurements');
      if (!response.ok) throw new Error('Failed to load measurements');
      const data = await response.json();
      setMeasurements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/measurement-templates');
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, []);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/measurement-sessions');
      if (!response.ok) throw new Error('Failed to load sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    }
  }, []);

  // Save measurement (unused but kept for future functionality)
  // @ts-expect-error - Intentionally unused, kept for future functionality
  const _saveMeasurement = async (measurement: Partial<Measurement>) => {
    try {
      const method = measurement.id ? 'PUT' : 'POST';
      const url = measurement.id ? `/api/measurements/${measurement.id}` : '/api/measurements';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement)
      });
      
      if (!response.ok) throw new Error('Failed to save measurement');
      
      const savedMeasurement = await response.json();
      
      if (measurement.id) {
        setMeasurements(prev => prev.map(m => m.id === measurement.id ? savedMeasurement : m));
      } else {
        setMeasurements(prev => [...prev, savedMeasurement]);
      }
      
      return savedMeasurement;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save measurement');
      throw err;
    }
  };

  // Calculate SUV values (unused but kept for future functionality)
  // @ts-expect-error - Intentionally unused, kept for future functionality
  const _calculateSUV = (pixelValue: number, metadata: MeasurementMetadata): SUVCalculation => {
    const { injectedDose, patientWeight, injectionTime, scanTime, halfLife, units } = suvSettings;
    
    // Calculate decay factor
    const injectionDateTime = new Date(`${metadata.acquisitionDate}T${injectionTime}`);
    const scanDateTime = new Date(`${metadata.acquisitionDate}T${scanTime}`);
    const timeDiff = (scanDateTime.getTime() - injectionDateTime.getTime()) / (1000 * 60); // minutes
    const decayFactor = Math.exp(-0.693 * timeDiff / halfLife);
    
    // Calculate calibration factor
    const calibrationFactor = metadata.rescaleSlope || 1;
    
    // Convert pixel value to activity concentration (Bq/ml)
    const activityConcentration = (pixelValue * metadata.rescaleSlope + metadata.rescaleIntercept) * calibrationFactor;
    
    // Calculate SUV based on units
    let suv: number;
    switch (units) {
      case 'bw': // Body weight
        suv = (activityConcentration * patientWeight * 1000) / (injectedDose * decayFactor * 1000000);
        break;
      case 'lbm': {
        // Lean body mass (James formula)
        const lbm = patientWeight * 1.1 - 128 * (patientWeight / 100) ** 2;
        suv = (activityConcentration * lbm * 1000) / (injectedDose * decayFactor * 1000000);
        break;
      }
      case 'bsa': {
        // Body surface area (Mosteller formula)
        const bsa = Math.sqrt(patientWeight * 170) / 60; // Assuming average height of 170cm
        suv = (activityConcentration * bsa * 10000) / (injectedDose * decayFactor * 1000000);
        break;
      }
      default:
        suv = activityConcentration;
    }
    
    return {
      suvMax: suv,
      suvMean: suv,
      suvPeak: suv,
      suvMin: suv,
      tlg: 0, // Will be calculated for ROI measurements
      mtv: 0, // Will be calculated for ROI measurements
      suvThreshold: suvSettings.threshold,
      injectedDose,
      patientWeight,
      scanTime,
      injectionTime,
      halfLife,
      decayFactor,
      calibrationFactor,
      units
    };
  };

  // Calculate ROI statistics (unused but kept for future functionality)
  // @ts-expect-error - Intentionally unused, kept for future functionality
  const _calculateROIStatistics = (_coordinates: Point[], _imageData: ImageData): MeasurementStatistics => {
    // This would integrate with the actual image data from the DICOM viewer
    // For now, returning mock data structure
    return {
      histogram: {
        bins: [],
        counts: [],
        binWidth: 1,
        totalCount: 0
      },
      percentiles: {},
      moments: {
        mean: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0
      },
      texture: {
        glcm: {
          contrast: 0,
          correlation: 0,
          energy: 0,
          homogeneity: 0,
          entropy: 0
        },
        glrlm: {
          shortRunEmphasis: 0,
          longRunEmphasis: 0,
          grayLevelNonUniformity: 0,
          runLengthNonUniformity: 0,
          runPercentage: 0
        },
        glszm: {
          smallZoneEmphasis: 0,
          largeZoneEmphasis: 0,
          grayLevelNonUniformity: 0,
          sizeZoneNonUniformity: 0,
          zonePercentage: 0
        }
      }
    };
  };

  // Export measurements
  const exportMeasurements = async (format: 'csv' | 'excel' | 'dicom-sr' | 'json') => {
    try {
      const response = await fetch(`/api/measurements/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurementIds: selectedMeasurements })
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `measurements_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  // Import measurements (unused but kept for future functionality)
  // @ts-expect-error - Intentionally unused, kept for future functionality
  const _importMeasurements = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/measurements/import', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const result = await response.json();
      setMeasurements(prev => [...prev, ...result.measurements]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  // Delete measurement
  const deleteMeasurement = async (measurementId: string) => {
    if (!confirm('Are you sure you want to delete this measurement?')) return;
    
    try {
      const response = await fetch(`/api/measurements/${measurementId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete measurement');
      
      setMeasurements(prev => prev.filter(m => m.id !== measurementId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete measurement');
    }
  };

  // Toggle measurement visibility
  const toggleMeasurementVisibility = (measurementId: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === measurementId ? { ...m, isVisible: !m.isVisible } : m
    ));
  };

  // Load data on mount
  useEffect(() => {
    loadMeasurements();
    loadTemplates();
    loadSessions();
  }, [loadMeasurements, loadTemplates, loadSessions]);

  // Filter measurements
  const filteredMeasurements = measurements.filter(measurement => {
    const matchesSearch = !searchTerm || 
      measurement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      measurement.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || measurement.type === filterType;
    const matchesModality = !filterModality || measurement.metadata.modality === filterModality;
    
    return matchesSearch && matchesType && matchesModality;
  });

  // Get measurement type icon
  const getMeasurementIcon = (type: MeasurementType) => {
    switch (type) {
      case 'length': return <Ruler className="w-4 h-4" />;
      case 'area': case 'circle': case 'ellipse': return <Circle className="w-4 h-4" />;
      case 'rectangle': return <Square className="w-4 h-4" />;
      case 'polygon': return <Triangle className="w-4 h-4" />;
      case 'angle': return <Triangle className="w-4 h-4" />;
      case 'suv-roi': return <Zap className="w-4 h-4" />;
      case 'perfusion-roi': return <Heart className="w-4 h-4" />;
      case 'diffusion-roi': return <Brain className="w-4 h-4" />;
      case 'lung-nodule': return <Activity className="w-4 h-4" />;
      case 'bone-density': return <Bone className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  // Get measurement type color
  const getMeasurementTypeColor = (type: MeasurementType) => {
    const colors = {
      'length': 'bg-blue-100 text-blue-800',
      'area': 'bg-green-100 text-green-800',
      'volume': 'bg-purple-100 text-purple-800',
      'angle': 'bg-orange-100 text-orange-800',
      'suv-roi': 'bg-red-100 text-red-800',
      'perfusion-roi': 'bg-pink-100 text-pink-800',
      'diffusion-roi': 'bg-indigo-100 text-indigo-800',
      'lung-nodule': 'bg-cyan-100 text-cyan-800',
      'bone-density': 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Measurements</h1>
          <p className="text-gray-600 mt-1">Comprehensive measurement tools with SUV calculations and persistence</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportMeasurements('csv')} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadMeasurements} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowMeasurementDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Measurement
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Measurements</p>
                <p className="text-2xl font-bold">{measurements.length}</p>
              </div>
              <Ruler className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">SUV Measurements</p>
                <p className="text-2xl font-bold">
                  {measurements.filter(m => m.type === 'suv-roi').length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">
                  {sessions.filter(s => s.status === 'draft' || s.status === 'completed').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Measurement Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Measurement Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-10 gap-2">
            {[
              { type: 'length' as MeasurementType, label: 'Length', icon: Ruler },
              { type: 'area' as MeasurementType, label: 'Area', icon: Circle },
              { type: 'volume' as MeasurementType, label: 'Volume', icon: Move3D },
              { type: 'angle' as MeasurementType, label: 'Angle', icon: Triangle },
              { type: 'rectangle' as MeasurementType, label: 'Rectangle', icon: Square },
              { type: 'polygon' as MeasurementType, label: 'Polygon', icon: Triangle },
              { type: 'suv-roi' as MeasurementType, label: 'SUV ROI', icon: Zap },
              { type: 'perfusion-roi' as MeasurementType, label: 'Perfusion', icon: Heart },
              { type: 'diffusion-roi' as MeasurementType, label: 'Diffusion', icon: Brain },
              { type: 'lung-nodule' as MeasurementType, label: 'Lung Nodule', icon: Activity }
            ].map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant={activeTool === type ? 'default' : 'outline'}
                className="flex flex-col h-16 p-2"
                onClick={() => setActiveTool(activeTool === type ? null : type)}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="suv-settings">SUV Settings</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Measurements Tab */}
        <TabsContent value="measurements">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Search measurements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="length">Length</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="volume">Volume</SelectItem>
                    <SelectItem value="suv-roi">SUV ROI</SelectItem>
                    <SelectItem value="perfusion-roi">Perfusion</SelectItem>
                    <SelectItem value="diffusion-roi">Diffusion</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterModality} onValueChange={setFilterModality}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Modalities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Modalities</SelectItem>
                    <SelectItem value="CT">CT</SelectItem>
                    <SelectItem value="MR">MR</SelectItem>
                    <SelectItem value="PT">PET</SelectItem>
                    <SelectItem value="US">Ultrasound</SelectItem>
                    <SelectItem value="XA">Angiography</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedMeasurements.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedMeasurements.length} measurement(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => exportMeasurements('csv')} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button onClick={() => {
                      selectedMeasurements.forEach(id => deleteMeasurement(id));
                      setSelectedMeasurements([]);
                    }} size="sm" variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Measurements Table */}
          <Card>
            <CardHeader>
              <CardTitle>Measurements ({filteredMeasurements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedMeasurements.length === filteredMeasurements.length && filteredMeasurements.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMeasurements(filteredMeasurements.map(m => m.id));
                            } else {
                              setSelectedMeasurements([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Modality</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeasurements.map((measurement) => (
                      <TableRow key={measurement.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMeasurements.includes(measurement.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedMeasurements(prev => [...prev, measurement.id]);
                              } else {
                                setSelectedMeasurements(prev => prev.filter(id => id !== measurement.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMeasurementIcon(measurement.type)}
                            <div>
                              <div className="font-medium">{measurement.name}</div>
                              {measurement.description && (
                                <div className="text-sm text-gray-500">{measurement.description}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getMeasurementTypeColor(measurement.type)}>
                            {measurement.type.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {measurement.properties.length && (
                              <div>{measurement.properties.length.toFixed(2)} mm</div>
                            )}
                            {measurement.properties.area && (
                              <div>{measurement.properties.area.toFixed(2)} mm²</div>
                            )}
                            {measurement.properties.volume && (
                              <div>{measurement.properties.volume.toFixed(2)} mm³</div>
                            )}
                            {measurement.properties.suv && (
                              <div>SUVmax: {measurement.properties.suv.suvMax.toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{measurement.metadata.modality}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(measurement.createdAt).toLocaleDateString()}
                            <br />
                            <span className="text-gray-500">{measurement.createdBy}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => setSelectedMeasurement(measurement)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => toggleMeasurementVisibility(measurement.id)}
                                  >
                                    {measurement.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {measurement.isVisible ? 'Hide' : 'Show'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => deleteMeasurement(measurement.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUV Settings Tab */}
        <TabsContent value="suv-settings">
          <Card>
            <CardHeader>
              <CardTitle>SUV Calculation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="injected-dose">Injected Dose (MBq)</Label>
                    <Input
                      id="injected-dose"
                      type="number"
                      value={suvSettings.injectedDose}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, injectedDose: parseFloat(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="patient-weight">Patient Weight (kg)</Label>
                    <Input
                      id="patient-weight"
                      type="number"
                      value={suvSettings.patientWeight}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, patientWeight: parseFloat(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="injection-time">Injection Time</Label>
                    <Input
                      id="injection-time"
                      type="time"
                      value={suvSettings.injectionTime}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, injectionTime: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="scan-time">Scan Time</Label>
                    <Input
                      id="scan-time"
                      type="time"
                      value={suvSettings.scanTime}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, scanTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="half-life">Half-life (minutes)</Label>
                    <Input
                      id="half-life"
                      type="number"
                      value={suvSettings.halfLife}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, halfLife: parseFloat(e.target.value) }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="suv-units">SUV Units</Label>
                    <Select value={suvSettings.units} onValueChange={(value: 'g/ml' | 'bw' | 'lbm' | 'bsa') => 
                      setSuvSettings(prev => ({ ...prev, units: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bw">Body Weight</SelectItem>
                        <SelectItem value="lbm">Lean Body Mass</SelectItem>
                        <SelectItem value="bsa">Body Surface Area</SelectItem>
                        <SelectItem value="g/ml">g/ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="threshold">SUV Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="0.1"
                      value={suvSettings.threshold}
                      onChange={(e) => setSuvSettings(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                    />
                  </div>
                  
                  <Button onClick={() => setShowSUVDialog(true)} className="w-full">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate SUV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Measurement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    measurements.reduce((acc, m) => {
                      acc[m.type] = (acc[m.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getMeasurementIcon(type as MeasurementType)}
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(count / measurements.length) * 100} className="w-20" />
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {measurements
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 10)
                    .map((measurement) => (
                      <div key={measurement.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                        {getMeasurementIcon(measurement.type)}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{measurement.name}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(measurement.updatedAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge className={getMeasurementTypeColor(measurement.type)} variant="outline">
                          {measurement.type}
                        </Badge>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Measurement Details Dialog */}
      {selectedMeasurement && (
        <Dialog open={!!selectedMeasurement} onOpenChange={() => setSelectedMeasurement(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Measurement Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <div className="font-medium">{selectedMeasurement.name}</div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge className={getMeasurementTypeColor(selectedMeasurement.type)}>
                    {selectedMeasurement.type}
                  </Badge>
                </div>
                <div>
                  <Label>Created</Label>
                  <div>{new Date(selectedMeasurement.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Label>Modified</Label>
                  <div>{new Date(selectedMeasurement.updatedAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Properties */}
              <div>
                <Label>Properties</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {selectedMeasurement.properties.length && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Length</div>
                      <div className="font-medium">{selectedMeasurement.properties.length.toFixed(2)} mm</div>
                    </div>
                  )}
                  {selectedMeasurement.properties.area && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Area</div>
                      <div className="font-medium">{selectedMeasurement.properties.area.toFixed(2)} mm²</div>
                    </div>
                  )}
                  {selectedMeasurement.properties.volume && (
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Volume</div>
                      <div className="font-medium">{selectedMeasurement.properties.volume.toFixed(2)} mm³</div>
                    </div>
                  )}
                  {selectedMeasurement.properties.suv && (
                    <>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">SUVmax</div>
                        <div className="font-medium">{selectedMeasurement.properties.suv.suvMax.toFixed(2)}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">SUVmean</div>
                        <div className="font-medium">{selectedMeasurement.properties.suv.suvMean.toFixed(2)}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">TLG</div>
                        <div className="font-medium">{selectedMeasurement.properties.suv.tlg.toFixed(2)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Annotations */}
              {selectedMeasurement.annotations.length > 0 && (
                <div>
                  <Label>Annotations</Label>
                  <div className="space-y-2 mt-2">
                    {selectedMeasurement.annotations.map((annotation) => (
                      <div key={annotation.id} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{annotation.text}</div>
                            <div className="text-sm text-gray-500">
                              {annotation.author} • {new Date(annotation.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdvancedMeasurements;
export type { 
  Measurement, 
  MeasurementType, 
  MeasurementProperties, 
  MeasurementTemplate, 
  MeasurementSession 
};
