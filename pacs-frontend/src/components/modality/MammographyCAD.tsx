// Mammography CAD Component
// Computer-Aided Detection for breast imaging with lesion analysis

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  ButtonGroup,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Search as SearchIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// CAD Data Structures
interface MammographyStudy {
  id: string;
  patientId: string;
  studyDate: string;
  views: MammographyView[];
  cadResults: CADResults;
  biRadsAssessment: BiRadsAssessment;
  priorStudies: PriorStudy[];
  clinicalHistory: ClinicalHistory;
  qualityAssurance: QualityMetrics;
}

interface MammographyView {
  id: string;
  laterality: 'left' | 'right';
  view: 'CC' | 'MLO' | 'ML' | 'LM' | 'XCCL' | 'XCCM' | 'CV' | 'FB' | 'SIO' | 'LMO';
  imageData: ImageData;
  preprocessing: PreprocessingSettings;
  annotations: Annotation[];
  measurements: Measurement[];
  cadMarks: CADMark[];
  tissueComposition: TissueComposition;
  imageQuality: ImageQuality;
}

interface ImageData {
  width: number;
  height: number;
  pixelSpacing: [number, number]; // mm
  bitDepth: number;
  compressionRatio?: number;
  exposureParameters: {
    kvp: number;
    mas: number;
    targetMaterial: string;
    filterMaterial: string;
    compressionForce: number; // N
    compressionThickness: number; // mm
  };
}

interface PreprocessingSettings {
  contrastEnhancement: {
    enabled: boolean;
    method: 'CLAHE' | 'histogram_equalization' | 'gamma_correction' | 'unsharp_mask';
    parameters: { [key: string]: number };
  };
  noiseReduction: {
    enabled: boolean;
    method: 'gaussian' | 'median' | 'bilateral' | 'wiener';
    strength: number;
  };
  edgeEnhancement: {
    enabled: boolean;
    method: 'laplacian' | 'sobel' | 'canny' | 'unsharp';
    strength: number;
  };
  pectoralMuscleRemoval: {
    enabled: boolean;
    automatic: boolean;
    boundary?: number[];
  };
}

interface CADResults {
  analysisId: string;
  timestamp: string;
  algorithm: {
    name: string;
    version: string;
    vendor: string;
    sensitivity: number;
    specificity: number;
  };
  detections: Detection[];
  overallSuspicion: 'low' | 'moderate' | 'high';
  processingTime: number; // seconds
  confidence: number;
  recommendations: string[];
}

interface Detection {
  id: string;
  viewId: string;
  type: 'mass' | 'calcification' | 'asymmetry' | 'distortion' | 'density';
  subtype?: string;
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  clockPosition?: number; // 1-12
  distanceFromNipple?: number; // cm
  suspicionLevel: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  features: DetectionFeatures;
  measurements: {
    size: number; // mm
    area: number; // mm²
    perimeter: number; // mm
    circularity: number;
    eccentricity: number;
  };
  visible: boolean;
  userValidated: boolean;
  falsePositive: boolean;
}

interface DetectionFeatures {
  shape?: 'round' | 'oval' | 'irregular';
  margin?: 'circumscribed' | 'microlobulated' | 'obscured' | 'indistinct' | 'spiculated';
  density?: 'fat' | 'low' | 'equal' | 'high';
  calcificationType?: 'benign' | 'intermediate' | 'suspicious';
  calcificationMorphology?: 'punctate' | 'amorphous' | 'coarse' | 'pleomorphic' | 'fine_linear' | 'fine_pleomorphic';
  calcificationDistribution?: 'diffuse' | 'regional' | 'grouped' | 'linear' | 'segmental';
  asymmetryType?: 'global' | 'focal' | 'developing';
  distortionPattern?: 'architectural' | 'parenchymal';
}

interface BiRadsAssessment {
  category: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  description: string;
  recommendation: string;
  followUpInterval?: number; // months
  additionalImaging?: string[];
  biopsy?: {
    recommended: boolean;
    type: 'core' | 'vacuum' | 'surgical';
    guidance: 'stereotactic' | 'ultrasound' | 'mri';
  };
}

interface PriorStudy {
  id: string;
  date: string;
  comparison: {
    stable: boolean;
    newFindings: boolean;
    resolved: boolean;
    changed: boolean;
    description: string;
  };
}

interface ClinicalHistory {
  age: number;
  symptoms: string[];
  familyHistory: boolean;
  geneticTesting: {
    performed: boolean;
    results?: string;
  };
  hormonalFactors: {
    menopause: boolean;
    hrt: boolean;
    oralContraceptives: boolean;
  };
  priorBiopsies: {
    performed: boolean;
    results?: string[];
  };
  breastDensity: 'A' | 'B' | 'C' | 'D';
}

interface TissueComposition {
  breastDensity: 'A' | 'B' | 'C' | 'D';
  fibroglandularTissue: number; // percentage
  fatTissue: number; // percentage
  pectoralMuscle: number; // percentage
  skin: number; // percentage
}

interface ImageQuality {
  positioning: {
    score: number; // 1-5
    pectoralMuscleVisible: boolean;
    nippleInProfile: boolean;
    symmetry: number;
  };
  compression: {
    adequate: boolean;
    thickness: number; // mm
    force: number; // N
  };
  exposure: {
    optimal: boolean;
    contrast: number;
    noise: number;
    artifacts: string[];
  };
  sharpness: {
    score: number; // 1-5
    motionBlur: boolean;
    geometricUnsharpness: number;
  };
}

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'freehand' | 'text';
  coordinates: number[];
  text?: string;
  color: string;
  visible: boolean;
  createdBy: string;
  timestamp: string;
}

interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'angle' | 'density';
  coordinates: number[];
  value: number;
  unit: string;
  visible: boolean;
}

interface CADMark {
  id: string;
  detectionId: string;
  type: 'circle' | 'arrow' | 'cross' | 'star';
  position: [number, number];
  size: number;
  color: string;
  visible: boolean;
  suspicionLevel: number;
}

interface QualityMetrics {
  overallScore: number; // 1-5
  positioning: number;
  compression: number;
  exposure: number;
  artifacts: number;
  readability: number;
}

const MammographyCAD: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [study, setStudy] = useState<MammographyStudy | null>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null);
  const [cadSettings, setCADSettings] = useState({
    sensitivity: 0.85,
    specificity: 0.92,
    minSuspicionLevel: 2,
    showAllDetections: true,
    enablePreprocessing: true,
    autoAnalysis: false
  });
  const [preprocessing] = useState<PreprocessingSettings>({
    contrastEnhancement: {
      enabled: true,
      method: 'CLAHE',
      parameters: { clipLimit: 2.0, tileGridSize: 8 }
    },
    noiseReduction: {
      enabled: true,
      method: 'bilateral',
      strength: 0.5
    },
    edgeEnhancement: {
      enabled: false,
      method: 'unsharp',
      strength: 0.3
    },
    pectoralMuscleRemoval: {
      enabled: true,
      automatic: true
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'original' | 'processed' | 'cad' | 'comparison'>('cad');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [windowLevel, setWindowLevel] = useState(50);
  const [windowWidth, setWindowWidth] = useState(100);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [_showMeasurements] = useState(true);
  const [filterDetections, setFilterDetections] = useState<string[]>(['mass', 'calcification', 'asymmetry', 'distortion']);

  // Initialize with sample data
  useEffect(() => {
    const sampleStudy: MammographyStudy = {
      id: 'mammo_001',
      patientId: 'patient_001',
      studyDate: '2024-01-15',
      views: [
        {
          id: 'view_001',
          laterality: 'right',
          view: 'CC',
          imageData: {
            width: 2048,
            height: 2048,
            pixelSpacing: [0.1, 0.1],
            bitDepth: 12,
            exposureParameters: {
              kvp: 28,
              mas: 120,
              targetMaterial: 'Molybdenum',
              filterMaterial: 'Molybdenum',
              compressionForce: 150,
              compressionThickness: 45
            }
          },
          preprocessing: preprocessing,
          annotations: [],
          measurements: [],
          cadMarks: [
            {
              id: 'mark_001',
              detectionId: 'det_001',
              type: 'circle',
              position: [512, 768],
              size: 20,
              color: '#ff0000',
              visible: true,
              suspicionLevel: 4
            },
            {
              id: 'mark_002',
              detectionId: 'det_002',
              type: 'arrow',
              position: [1024, 1200],
              size: 15,
              color: '#ff8800',
              visible: true,
              suspicionLevel: 3
            }
          ],
          tissueComposition: {
            breastDensity: 'C',
            fibroglandularTissue: 65,
            fatTissue: 30,
            pectoralMuscle: 3,
            skin: 2
          },
          imageQuality: {
            positioning: {
              score: 4,
              pectoralMuscleVisible: true,
              nippleInProfile: true,
              symmetry: 0.85
            },
            compression: {
              adequate: true,
              thickness: 45,
              force: 150
            },
            exposure: {
              optimal: true,
              contrast: 0.8,
              noise: 0.15,
              artifacts: []
            },
            sharpness: {
              score: 4,
              motionBlur: false,
              geometricUnsharpness: 0.1
            }
          }
        },
        {
          id: 'view_002',
          laterality: 'right',
          view: 'MLO',
          imageData: {
            width: 2048,
            height: 2560,
            pixelSpacing: [0.1, 0.1],
            bitDepth: 12,
            exposureParameters: {
              kvp: 30,
              mas: 140,
              targetMaterial: 'Molybdenum',
              filterMaterial: 'Molybdenum',
              compressionForce: 160,
              compressionThickness: 52
            }
          },
          preprocessing: preprocessing,
          annotations: [],
          measurements: [],
          cadMarks: [
            {
              id: 'mark_003',
              detectionId: 'det_003',
              type: 'star',
              position: [800, 1400],
              size: 18,
              color: '#ffff00',
              visible: true,
              suspicionLevel: 2
            }
          ],
          tissueComposition: {
            breastDensity: 'C',
            fibroglandularTissue: 68,
            fatTissue: 27,
            pectoralMuscle: 3,
            skin: 2
          },
          imageQuality: {
            positioning: {
              score: 5,
              pectoralMuscleVisible: true,
              nippleInProfile: true,
              symmetry: 0.92
            },
            compression: {
              adequate: true,
              thickness: 52,
              force: 160
            },
            exposure: {
              optimal: true,
              contrast: 0.85,
              noise: 0.12,
              artifacts: []
            },
            sharpness: {
              score: 5,
              motionBlur: false,
              geometricUnsharpness: 0.08
            }
          }
        }
      ],
      cadResults: {
        analysisId: 'cad_001',
        timestamp: '2024-01-15T10:30:00Z',
        algorithm: {
          name: 'MammoCAD Pro',
          version: '3.2.1',
          vendor: 'AI Medical Systems',
          sensitivity: 0.92,
          specificity: 0.88
        },
        detections: [
          {
            id: 'det_001',
            viewId: 'view_001',
            type: 'mass',
            location: {
              x: 512,
              y: 768,
              width: 25,
              height: 22
            },
            clockPosition: 2,
            distanceFromNipple: 4.5,
            suspicionLevel: 4,
            confidence: 0.87,
            features: {
              shape: 'irregular',
              margin: 'spiculated',
              density: 'high'
            },
            measurements: {
              size: 18.5,
              area: 268.2,
              perimeter: 58.7,
              circularity: 0.62,
              eccentricity: 0.75
            },
            visible: true,
            userValidated: false,
            falsePositive: false
          },
          {
            id: 'det_002',
            viewId: 'view_001',
            type: 'calcification',
            location: {
              x: 1024,
              y: 1200,
              width: 15,
              height: 12
            },
            clockPosition: 10,
            distanceFromNipple: 6.2,
            suspicionLevel: 3,
            confidence: 0.73,
            features: {
              calcificationType: 'intermediate',
              calcificationMorphology: 'pleomorphic',
              calcificationDistribution: 'grouped'
            },
            measurements: {
              size: 12.3,
              area: 118.9,
              perimeter: 38.7,
              circularity: 0.79,
              eccentricity: 0.45
            },
            visible: true,
            userValidated: false,
            falsePositive: false
          },
          {
            id: 'det_003',
            viewId: 'view_002',
            type: 'asymmetry',
            location: {
              x: 800,
              y: 1400,
              width: 35,
              height: 28
            },
            clockPosition: 8,
            distanceFromNipple: 3.8,
            suspicionLevel: 2,
            confidence: 0.65,
            features: {
              asymmetryType: 'focal'
            },
            measurements: {
              size: 24.7,
              area: 687.3,
              perimeter: 93.2,
              circularity: 0.79,
              eccentricity: 0.58
            },
            visible: true,
            userValidated: false,
            falsePositive: false
          }
        ],
        overallSuspicion: 'moderate',
        processingTime: 45.2,
        confidence: 0.82,
        recommendations: [
          'Additional views recommended for mass at 2 o\'clock position',
          'Consider ultrasound correlation for calcifications',
          'Short-term follow-up in 6 months for asymmetry'
        ]
      },
      biRadsAssessment: {
        category: 4,
        description: 'Suspicious abnormality - biopsy should be considered',
        recommendation: 'Tissue sampling recommended',
        additionalImaging: ['Ultrasound', 'Spot compression views'],
        biopsy: {
          recommended: true,
          type: 'core',
          guidance: 'stereotactic'
        }
      },
      priorStudies: [
        {
          id: 'prior_001',
          date: '2023-01-15',
          comparison: {
            stable: false,
            newFindings: true,
            resolved: false,
            changed: true,
            description: 'New spiculated mass in right breast upper outer quadrant'
          }
        }
      ],
      clinicalHistory: {
        age: 52,
        symptoms: ['palpable lump', 'breast pain'],
        familyHistory: true,
        geneticTesting: {
          performed: true,
          results: 'BRCA1 negative, BRCA2 negative'
        },
        hormonalFactors: {
          menopause: false,
          hrt: false,
          oralContraceptives: false
        },
        priorBiopsies: {
          performed: true,
          results: ['Benign fibroadenoma - 2020']
        },
        breastDensity: 'C'
      },
      qualityAssurance: {
        overallScore: 4.2,
        positioning: 4.5,
        compression: 4.0,
        exposure: 4.3,
        artifacts: 4.8,
        readability: 4.0
      }
    };
    
    setStudy(sampleStudy);
    setSelectedView('view_001');
  }, [preprocessing]);

  // CAD Analysis Functions
  const runCADAnalysis = useCallback(async () => {
    if (!study) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate CAD analysis steps
    const steps = [
      'Preprocessing images...',
      'Detecting masses...',
      'Analyzing calcifications...',
      'Identifying asymmetries...',
      'Evaluating architectural distortions...',
      'Computing suspicion levels...',
      'Generating report...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnalysisProgress(((i + 1) / steps.length) * 100);
    }
    
    // Simulate detection of new findings
    const newDetection: Detection = {
      id: `det_${Date.now()}`,
      viewId: selectedView || 'view_001',
      type: 'mass',
      location: {
        x: Math.random() * 1500 + 200,
        y: Math.random() * 1500 + 200,
        width: Math.random() * 30 + 10,
        height: Math.random() * 30 + 10
      },
      clockPosition: Math.floor(Math.random() * 12) + 1,
      distanceFromNipple: Math.random() * 8 + 2,
      suspicionLevel: Math.floor(Math.random() * 3) + 2 as 2 | 3 | 4,
      confidence: Math.random() * 0.3 + 0.6,
      features: {
        shape: ['round', 'oval', 'irregular'][Math.floor(Math.random() * 3)] as 'round' | 'oval' | 'irregular',
        margin: ['circumscribed', 'microlobulated', 'spiculated'][Math.floor(Math.random() * 3)] as 'circumscribed' | 'microlobulated' | 'spiculated',
        density: ['low', 'equal', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'equal' | 'high'
      },
      measurements: {
        size: Math.random() * 20 + 5,
        area: Math.random() * 400 + 50,
        perimeter: Math.random() * 80 + 20,
        circularity: Math.random() * 0.5 + 0.5,
        eccentricity: Math.random() * 0.8 + 0.2
      },
      visible: true,
      userValidated: false,
      falsePositive: false
    };
    
    setStudy(prev => prev ? {
      ...prev,
      cadResults: {
        ...prev.cadResults,
        detections: [...prev.cadResults.detections, newDetection],
        confidence: Math.random() * 0.2 + 0.75
      }
    } : null);
    
    setIsAnalyzing(false);
  }, [study, selectedView]);

  // Visualization Functions
  const drawMammographyImage = useCallback(() => {
    const canvas = document.createElement('canvas');
    if (!canvas || !study || !selectedView) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const view = study.views.find(v => v.id === selectedView);
    if (!view) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Simulate mammography image background
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
    gradient.addColorStop(0, '#f0f0f0');
    gradient.addColorStop(0.7, '#d0d0d0');
    gradient.addColorStop(1, '#a0a0a0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw breast outline
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (view.view === 'CC') {
      // Craniocaudal view - circular/oval shape
      ctx.ellipse(width/2, height/2, width/3, height/3, 0, 0, 2 * Math.PI);
    } else {
      // MLO view - triangular/curved shape
      ctx.moveTo(width * 0.1, height * 0.9);
      ctx.quadraticCurveTo(width * 0.5, height * 0.1, width * 0.9, height * 0.7);
      ctx.quadraticCurveTo(width * 0.7, height * 0.9, width * 0.1, height * 0.9);
    }
    ctx.stroke();
    
    // Draw tissue patterns
    ctx.fillStyle = 'rgba(180, 180, 180, 0.3)';
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 30 + 5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw CAD marks if enabled
    if (viewMode === 'cad' || viewMode === 'comparison') {
      view.cadMarks.forEach(mark => {
        if (!mark.visible) return;
        
        const detection = study.cadResults.detections.find(d => d.id === mark.detectionId);
        if (!detection || !filterDetections.includes(detection.type)) return;
        
        ctx.strokeStyle = mark.color;
        ctx.fillStyle = mark.color + '40';
        ctx.lineWidth = 3;
        
        const x = (mark.position[0] / view.imageData.width) * width;
        const y = (mark.position[1] / view.imageData.height) * height;
        const size = mark.size * zoomLevel;
        
        switch (mark.type) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
            break;
          case 'arrow':
            ctx.beginPath();
            ctx.moveTo(x - size, y + size);
            ctx.lineTo(x, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x, y);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            break;
          case 'star':
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const angle = (i * 4 * Math.PI) / 5;
              const radius = i % 2 === 0 ? size : size / 2;
              const px = x + Math.cos(angle) * radius;
              const py = y + Math.sin(angle) * radius;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            break;
        }
        
        // Draw suspicion level
        ctx.fillStyle = mark.color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(mark.suspicionLevel.toString(), x, y - size - 10);
      });
    }
    
    // Draw annotations if enabled
    if (showAnnotations) {
      view.annotations.forEach(annotation => {
        if (!annotation.visible) return;
        
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = 2;
        
        switch (annotation.type) {
          case 'circle': {
            const [cx, cy, radius] = annotation.coordinates;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            ctx.stroke();
            break;
          }
          case 'rectangle': {
            const [rx, ry, rw, rh] = annotation.coordinates;
            ctx.strokeRect(rx, ry, rw, rh);
            break;
          }
        }
        
        if (annotation.text) {
          ctx.fillStyle = annotation.color;
          ctx.font = '14px Arial';
          ctx.fillText(annotation.text, annotation.coordinates[0], annotation.coordinates[1] - 10);
        }
      });
    }
  }, [study, selectedView, viewMode, zoomLevel, filterDetections, showAnnotations]);

  useEffect(() => {
    drawMammographyImage();
  }, [drawMammographyImage]);

  // Export Functions
  const exportCADResults = useCallback(() => {
    if (!study) return;
    
    const data = {
      study: study.id,
      cadResults: study.cadResults,
      biRadsAssessment: study.biRadsAssessment,
      detections: study.cadResults.detections,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cad_results_${study.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [study]);

  const renderImageViewer = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Mammography Viewer</Typography>
          <Box>
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <Button
                variant={viewMode === 'original' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('original')}
              >
                Original
              </Button>
              <Button
                variant={viewMode === 'processed' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('processed')}
              >
                Processed
              </Button>
              <Button
                variant={viewMode === 'cad' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cad')}
              >
                CAD
              </Button>
              <Button
                variant={viewMode === 'comparison' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('comparison')}
              >
                Compare
              </Button>
            </ButtonGroup>
            
            <ButtonGroup size="small">
              <IconButton onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}>
                <ZoomOutIcon />
              </IconButton>
              <IconButton onClick={() => setZoomLevel(prev => Math.min(5.0, prev + 0.1))}>
                <ZoomInIcon />
              </IconButton>
              <IconButton onClick={() => setShowAnnotations(!showAnnotations)} color={showAnnotations ? 'primary' : 'default'}>
                <VisibilityIcon />
              </IconButton>
            </ButtonGroup>
          </Box>
        </Box>
        
        <Box sx={{ height: 500, bgcolor: 'black', border: '1px solid #ddd', borderRadius: 1, position: 'relative' }}>
          <canvas
            ref={(canvas) => {
              if (canvas) {
                drawMammographyImage();
              }
            }}
            width={800}
            height={500}
            style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
          />
          
          {/* View selector */}
          <Box sx={{ position: 'absolute', top: 10, left: 10 }}>
            <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'rgba(255,255,255,0.9)' }}>
              <InputLabel>View</InputLabel>
              <Select
                value={selectedView || ''}
                onChange={(e) => setSelectedView(e.target.value)}
              >
                {study?.views.map(view => (
                  <MenuItem key={view.id} value={view.id}>
                    {view.laterality.toUpperCase()} {view.view}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          {/* Zoom level indicator */}
          <Box sx={{ position: 'absolute', bottom: 10, right: 10, bgcolor: 'rgba(0,0,0,0.7)', color: 'white', p: 1, borderRadius: 1 }}>
            <Typography variant="caption">Zoom: {(zoomLevel * 100).toFixed(0)}%</Typography>
          </Box>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography gutterBottom>Window Level</Typography>
              <Slider
                value={windowLevel}
                onChange={(_, value) => setWindowLevel(value as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
              />
            </Grid>
            <Grid size={6}>
              <Typography gutterBottom>Window Width</Typography>
              <Slider
                value={windowWidth}
                onChange={(_, value) => setWindowWidth(value as number)}
                min={1}
                max={200}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );

  const renderCADControls = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>CAD Analysis</Typography>
        
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            onClick={runCADAnalysis}
            disabled={isAnalyzing}
            startIcon={<SearchIcon />}
            fullWidth
            size="large"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run CAD Analysis'}
          </Button>
          
          {isAnalyzing && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={analysisProgress} />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Progress: {Math.round(analysisProgress)}%
              </Typography>
            </Box>
          )}
        </Box>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Detection Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={filterDetections.includes('mass')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilterDetections(prev => [...prev, 'mass']);
                    } else {
                      setFilterDetections(prev => prev.filter(f => f !== 'mass'));
                    }
                  }}
                />
              }
              label="Masses"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filterDetections.includes('calcification')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilterDetections(prev => [...prev, 'calcification']);
                    } else {
                      setFilterDetections(prev => prev.filter(f => f !== 'calcification'));
                    }
                  }}
                />
              }
              label="Calcifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filterDetections.includes('asymmetry')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilterDetections(prev => [...prev, 'asymmetry']);
                    } else {
                      setFilterDetections(prev => prev.filter(f => f !== 'asymmetry'));
                    }
                  }}
                />
              }
              label="Asymmetries"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={filterDetections.includes('distortion')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFilterDetections(prev => [...prev, 'distortion']);
                    } else {
                      setFilterDetections(prev => prev.filter(f => f !== 'distortion'));
                    }
                  }}
                />
              }
              label="Distortions"
            />
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Sensitivity Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography gutterBottom>Minimum Suspicion Level</Typography>
            <Slider
              value={cadSettings.minSuspicionLevel}
              onChange={(_, value) => setCADSettings(prev => ({ ...prev, minSuspicionLevel: value as number }))}
              min={1}
              max={5}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
            
            <Typography gutterBottom sx={{ mt: 2 }}>Sensitivity</Typography>
            <Slider
              value={cadSettings.sensitivity}
              onChange={(_, value) => setCADSettings(prev => ({ ...prev, sensitivity: value as number }))}
              min={0.5}
              max={1.0}
              step={0.01}
              valueLabelDisplay="auto"
            />
            
            <Typography gutterBottom sx={{ mt: 2 }}>Specificity</Typography>
            <Slider
              value={cadSettings.specificity}
              onChange={(_, value) => setCADSettings(prev => ({ ...prev, specificity: value as number }))}
              min={0.5}
              max={1.0}
              step={0.01}
              valueLabelDisplay="auto"
            />
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );

  const renderDetectionsList = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>CAD Detections</Typography>
        
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Suspicion</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {study?.cadResults.detections
                .filter(detection => filterDetections.includes(detection.type))
                .map((detection) => {
                  const getTypeColor = (type: string) => {
                    switch (type) {
                      case 'mass': return '#ff0000';
                      case 'calcification': return '#ff8800';
                      case 'asymmetry': return '#ffff00';
                      case 'distortion': return '#8800ff';
                      default: return '#888888';
                    }
                  };
                  
                  const getSuspicionColor = (level: number) => {
                    if (level >= 4) return 'error';
                    if (level >= 3) return 'warning';
                    return 'info';
                  };
                  
                  return (
                    <TableRow 
                      key={detection.id}
                      selected={selectedDetection === detection.id}
                      onClick={() => setSelectedDetection(detection.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              bgcolor: getTypeColor(detection.type),
                              mr: 1,
                              borderRadius: '50%'
                            }}
                          />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {detection.type}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {detection.clockPosition ? `${detection.clockPosition} o'clock` : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {detection.distanceFromNipple ? `${detection.distanceFromNipple.toFixed(1)} cm` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={detection.suspicionLevel}
                          size="small"
                          color={getSuspicionColor(detection.suspicionLevel)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={detection.confidence * 100}
                            sx={{ flexGrow: 1, mr: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">
                            {(detection.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {detection.measurements.size.toFixed(1)} mm
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudy(prev => prev ? {
                              ...prev,
                              cadResults: {
                                ...prev.cadResults,
                                detections: prev.cadResults.detections.map(d => 
                                  d.id === detection.id 
                                    ? { ...d, visible: !d.visible }
                                    : d
                                )
                              }
                            } : null);
                          }}
                        >
                          {detection.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color={detection.falsePositive ? 'error' : 'default'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudy(prev => prev ? {
                              ...prev,
                              cadResults: {
                                ...prev.cadResults,
                                detections: prev.cadResults.detections.map(d => 
                                  d.id === detection.id 
                                    ? { ...d, falsePositive: !d.falsePositive }
                                    : d
                                )
                              }
                            } : null);
                          }}
                        >
                          <ErrorIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {study && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={study.cadResults.overallSuspicion === 'high' ? 'error' : 
                           study.cadResults.overallSuspicion === 'moderate' ? 'warning' : 'info'}>
              <Typography variant="subtitle2">
                Overall Suspicion: {study.cadResults.overallSuspicion.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                Confidence: {(study.cadResults.confidence * 100).toFixed(1)}%
              </Typography>
            </Alert>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
              <List dense>
                {study.cadResults.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderBiRadsAssessment = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>BI-RADS Assessment</Typography>
        
        {study && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" sx={{ mr: 2 }}>
                {study.biRadsAssessment.category}
              </Typography>
              <Chip
                label={`Category ${study.biRadsAssessment.category}`}
                size="medium"
                color={
                  study.biRadsAssessment.category <= 2 ? 'success' :
                  study.biRadsAssessment.category === 3 ? 'warning' : 'error'
                }
              />
            </Box>
            
            <Typography variant="body1" gutterBottom>
              {study.biRadsAssessment.description}
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Recommendation:
            </Typography>
            <Typography variant="body2" gutterBottom>
              {study.biRadsAssessment.recommendation}
            </Typography>
            
            {study.biRadsAssessment.additionalImaging && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Additional Imaging:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {study.biRadsAssessment.additionalImaging.map((imaging, index) => (
                    <Chip key={index} label={imaging} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}
            
            {study.biRadsAssessment.biopsy && (
              <Box sx={{ mt: 2 }}>
                <Alert severity={study.biRadsAssessment.biopsy.recommended ? 'warning' : 'info'}>
                  <Typography variant="subtitle2">
                    Biopsy {study.biRadsAssessment.biopsy.recommended ? 'Recommended' : 'Not Required'}
                  </Typography>
                  {study.biRadsAssessment.biopsy.recommended && (
                    <Typography variant="body2">
                      Type: {study.biRadsAssessment.biopsy.type} | 
                      Guidance: {study.biRadsAssessment.biopsy.guidance}
                    </Typography>
                  )}
                </Alert>
              </Box>
            )}
            
            {study.biRadsAssessment.followUpInterval && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">
                  Follow-up: {study.biRadsAssessment.followUpInterval} months
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Mammography CAD</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setShowSettings(true)}
            sx={{ mr: 1 }}
          >
            Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportCADResults}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {renderImageViewer()}
        </Grid>
        
        <Grid size={{ xs: 12, lg: 4 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab label="CAD" />
            <Tab label="Detections" />
            <Tab label="BI-RADS" />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderCADControls()}
            {activeTab === 1 && renderDetectionsList()}
            {activeTab === 2 && renderBiRadsAssessment()}
          </Box>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>Mammography CAD Settings</DialogTitle>
        <DialogContent>
          <Typography>Advanced CAD settings and algorithm parameters</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShowSettings(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MammographyCAD;
