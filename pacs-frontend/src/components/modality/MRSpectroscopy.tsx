// MR Spectroscopy Component
// Advanced magnetic resonance spectroscopy analysis with metabolite quantification

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextField,
  IconButton,
  Tooltip,
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
  ListItemSecondaryAction,
  Divider,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Tune as TuneIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  ScatterPlot as ScatterPlotIcon,
  ShowChart as ChartIcon,
  Functions as FunctionIcon,
  Science as ScienceIcon,
  Analytics as AnalyticsIcon,
  FilterAlt as FilterIcon,
  AutoFixHigh as AutoIcon,
  Calculate as CalculateIcon,
  Biotech as BiotechIcon
} from '@mui/icons-material';

// MRS Data Structures
interface MRSStudy {
  id: string;
  patientId: string;
  studyDate: string;
  sequence: MRSSequence;
  voxels: MRSVoxel[];
  spectra: MRSpectrum[];
  metabolites: MetaboliteData[];
  processing: ProcessingParameters;
  quantification: QuantificationResults;
  quality: QualityMetrics;
}

interface MRSSequence {
  type: 'PRESS' | 'STEAM' | 'LASER' | 'sLASER' | 'CSI' | 'MRSI';
  te: number; // Echo time (ms)
  tr: number; // Repetition time (ms)
  tm?: number; // Mixing time for STEAM (ms)
  fieldStrength: number; // Tesla
  voxelSize: [number, number, number]; // mm³
  acquisitionTime: number; // seconds
  averages: number;
  waterSuppression: boolean;
  shimming: ShimmingParameters;
}

interface ShimmingParameters {
  method: 'auto' | 'manual' | 'fastmap';
  linewidth: number; // Hz
  snr: number;
  waterPeakWidth: number; // Hz
  shimValues: { [key: string]: number };
}

interface MRSVoxel {
  id: string;
  position: [number, number, number]; // mm
  size: [number, number, number]; // mm
  orientation: number[]; // rotation matrix
  tissueComposition: {
    grayMatter: number;
    whiteMatter: number;
    csf: number;
  };
  visible: boolean;
  color: string;
}

interface MRSpectrum {
  id: string;
  voxelId: string;
  frequency: number[]; // Hz or ppm
  amplitude: number[];
  phase: number[];
  processed: boolean;
  baseline: number[];
  peaks: SpectralPeak[];
  snr: number;
  linewidth: number;
  phaseCorrection: {
    zerothOrder: number;
    firstOrder: number;
  };
}

interface SpectralPeak {
  id: string;
  frequency: number; // ppm
  amplitude: number;
  linewidth: number; // Hz
  phase: number;
  metabolite?: string;
  confidence: number;
  fitted: boolean;
}

interface MetaboliteData {
  name: string;
  abbreviation: string;
  frequency: number; // ppm
  concentration: number; // mM or institutional units
  error: number; // ±
  snr: number;
  linewidth: number; // Hz
  cramersRaoLowerBound: number; // %
  visible: boolean;
  color: string;
  referenceValues: {
    normal: [number, number]; // [min, max]
    pathological?: [number, number];
  };
}

interface ProcessingParameters {
  apodization: {
    type: 'exponential' | 'gaussian' | 'lorentzian' | 'none';
    linebroadening: number; // Hz
  };
  zeroPadding: number;
  phaseCorrection: {
    automatic: boolean;
    zerothOrder: number;
    firstOrder: number;
  };
  baselineCorrection: {
    method: 'polynomial' | 'spline' | 'wavelet' | 'none';
    order: number;
  };
  frequencyShift: number; // Hz
  waterRemoval: {
    enabled: boolean;
    method: 'HLSVD' | 'HSVD' | 'filter';
    components: number;
  };
  eddy: {
    correction: boolean;
    referenceSpectrum?: string;
  };
}

interface QuantificationResults {
  method: 'LCModel' | 'jMRUI' | 'TARQUIN' | 'QUEST' | 'AMARES';
  basis: string;
  metaboliteRatios: { [key: string]: number };
  absoluteConcentrations: { [key: string]: number };
  waterReference: {
    concentration: number;
    t1: number;
    t2: number;
  };
  tissueCorrection: boolean;
  relaxationCorrection: boolean;
}

interface QualityMetrics {
  snr: number;
  linewidth: number; // Hz
  baselineStability: number;
  phaseStability: number;
  frequencyDrift: number; // Hz
  motionArtifacts: number;
  lipidContamination: number;
  waterSuppression: number; // dB
  shimQuality: number;
  overallQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
}

interface FittingModel {
  name: string;
  metabolites: string[];
  priorKnowledge: {
    frequencies: { [key: string]: number };
    linewidths: { [key: string]: number };
    phases: { [key: string]: number };
    amplitudes: { [key: string]: number };
  };
  constraints: {
    frequencyRange: [number, number];
    amplitudeRange: [number, number];
    linewidthRange: [number, number];
  };
}

const MRSpectroscopy: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [study, setStudy] = useState<MRSStudy | null>(null);
  const [selectedVoxel, setSelectedVoxel] = useState<string | null>(null);
  const [selectedSpectrum, setSelectedSpectrum] = useState<string | null>(null);
  const [processingParams, setProcessingParams] = useState<ProcessingParameters>({
    apodization: { type: 'exponential', linebroadening: 3.0 },
    zeroPadding: 2,
    phaseCorrection: { automatic: true, zerothOrder: 0, firstOrder: 0 },
    baselineCorrection: { method: 'polynomial', order: 3 },
    frequencyShift: 0,
    waterRemoval: { enabled: true, method: 'HLSVD', components: 10 },
    eddy: { correction: true }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'spectrum' | 'metabolites' | 'fitting' | 'quality'>('spectrum');
  const [frequencyRange, setFrequencyRange] = useState<[number, number]>([0.5, 4.5]);
  const [amplitudeRange, setAmplitudeRange] = useState<[number, number]>([0, 100]);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showFitting, setShowFitting] = useState(true);
  const [showResidual, setShowResidual] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with sample data
  useEffect(() => {
    const sampleStudy: MRSStudy = {
      id: 'mrs_001',
      patientId: 'patient_001',
      studyDate: '2024-01-15',
      sequence: {
        type: 'PRESS',
        te: 30,
        tr: 2000,
        fieldStrength: 3.0,
        voxelSize: [20, 20, 20],
        acquisitionTime: 360,
        averages: 128,
        waterSuppression: true,
        shimming: {
          method: 'auto',
          linewidth: 8.5,
          snr: 25.3,
          waterPeakWidth: 12.2,
          shimValues: {
            'X': 0.2,
            'Y': -0.1,
            'Z': 0.3,
            'XY': 0.05,
            'XZ': -0.02,
            'YZ': 0.08
          }
        }
      },
      voxels: [
        {
          id: 'voxel_001',
          position: [0, 0, 0],
          size: [20, 20, 20],
          orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
          tissueComposition: {
            grayMatter: 0.6,
            whiteMatter: 0.35,
            csf: 0.05
          },
          visible: true,
          color: '#ff0000'
        }
      ],
      spectra: [
        {
          id: 'spectrum_001',
          voxelId: 'voxel_001',
          frequency: Array.from({ length: 2048 }, (_, i) => 4.5 - (i / 2048) * 4.0),
          amplitude: Array.from({ length: 2048 }, (_, i) => {
            // Simulate spectrum with major metabolite peaks
            let signal = 0;
            // NAA peak at 2.02 ppm
            signal += 100 * Math.exp(-Math.pow((4.5 - (i / 2048) * 4.0 - 2.02) / 0.02, 2));
            // Creatine peak at 3.03 ppm
            signal += 80 * Math.exp(-Math.pow((4.5 - (i / 2048) * 4.0 - 3.03) / 0.02, 2));
            // Choline peak at 3.22 ppm
            signal += 60 * Math.exp(-Math.pow((4.5 - (i / 2048) * 4.0 - 3.22) / 0.02, 2));
            // Add noise
            signal += (Math.random() - 0.5) * 5;
            return signal;
          }),
          phase: Array.from({ length: 2048 }, () => 0),
          processed: true,
          baseline: Array.from({ length: 2048 }, () => 0),
          peaks: [
            {
              id: 'peak_001',
              frequency: 2.02,
              amplitude: 100,
              linewidth: 8.5,
              phase: 0,
              metabolite: 'NAA',
              confidence: 0.95,
              fitted: true
            },
            {
              id: 'peak_002',
              frequency: 3.03,
              amplitude: 80,
              linewidth: 9.2,
              phase: 0,
              metabolite: 'Cr',
              confidence: 0.92,
              fitted: true
            },
            {
              id: 'peak_003',
              frequency: 3.22,
              amplitude: 60,
              linewidth: 10.1,
              phase: 0,
              metabolite: 'Cho',
              confidence: 0.88,
              fitted: true
            }
          ],
          snr: 25.3,
          linewidth: 8.5,
          phaseCorrection: {
            zerothOrder: 0,
            firstOrder: 0
          }
        }
      ],
      metabolites: [
        {
          name: 'N-Acetylaspartate',
          abbreviation: 'NAA',
          frequency: 2.02,
          concentration: 12.5,
          error: 0.8,
          snr: 25.3,
          linewidth: 8.5,
          cramersRaoLowerBound: 5.2,
          visible: true,
          color: '#ff0000',
          referenceValues: {
            normal: [10.0, 16.0],
            pathological: [5.0, 9.9]
          }
        },
        {
          name: 'Creatine',
          abbreviation: 'Cr',
          frequency: 3.03,
          concentration: 8.2,
          error: 0.5,
          snr: 22.1,
          linewidth: 9.2,
          cramersRaoLowerBound: 4.8,
          visible: true,
          color: '#00ff00',
          referenceValues: {
            normal: [6.0, 10.0]
          }
        },
        {
          name: 'Choline',
          abbreviation: 'Cho',
          frequency: 3.22,
          concentration: 2.1,
          error: 0.3,
          snr: 18.5,
          linewidth: 10.1,
          cramersRaoLowerBound: 8.5,
          visible: true,
          color: '#0000ff',
          referenceValues: {
            normal: [1.0, 3.0],
            pathological: [3.1, 8.0]
          }
        },
        {
          name: 'Myo-inositol',
          abbreviation: 'mI',
          frequency: 3.56,
          concentration: 5.8,
          error: 0.7,
          snr: 15.2,
          linewidth: 12.3,
          cramersRaoLowerBound: 12.1,
          visible: true,
          color: '#ff8800',
          referenceValues: {
            normal: [3.0, 8.0]
          }
        }
      ],
      processing: processingParams,
      quantification: {
        method: 'LCModel',
        basis: 'brain_3T_press_te30',
        metaboliteRatios: {
          'NAA/Cr': 1.52,
          'Cho/Cr': 0.26,
          'mI/Cr': 0.71
        },
        absoluteConcentrations: {
          'NAA': 12.5,
          'Cr': 8.2,
          'Cho': 2.1,
          'mI': 5.8
        },
        waterReference: {
          concentration: 55000,
          t1: 1100,
          t2: 80
        },
        tissueCorrection: true,
        relaxationCorrection: true
      },
      quality: {
        snr: 25.3,
        linewidth: 8.5,
        baselineStability: 0.92,
        phaseStability: 0.88,
        frequencyDrift: 2.1,
        motionArtifacts: 0.15,
        lipidContamination: 0.08,
        waterSuppression: 45.2,
        shimQuality: 0.85,
        overallQuality: 'good'
      }
    };
    
    setStudy(sampleStudy);
    setSelectedVoxel('voxel_001');
    setSelectedSpectrum('spectrum_001');
  }, []);

  // Processing Functions
  const processSpectrum = useCallback(async () => {
    if (!study || !selectedSpectrum) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate processing steps
    const steps = [
      'Applying apodization...',
      'Zero padding...',
      'Phase correction...',
      'Baseline correction...',
      'Water removal...',
      'Eddy current correction...',
      'Frequency alignment...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProcessingProgress(((i + 1) / steps.length) * 100);
    }
    
    // Update spectrum as processed
    setStudy(prev => prev ? {
      ...prev,
      spectra: prev.spectra.map(spectrum => 
        spectrum.id === selectedSpectrum 
          ? { ...spectrum, processed: true }
          : spectrum
      )
    } : null);
    
    setIsProcessing(false);
  }, [study, selectedSpectrum]);

  const performQuantification = useCallback(async () => {
    if (!study) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate quantification process
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setProcessingProgress((i / steps) * 100);
    }
    
    // Update metabolite concentrations with some variation
    setStudy(prev => prev ? {
      ...prev,
      metabolites: prev.metabolites.map(metabolite => ({
        ...metabolite,
        concentration: metabolite.concentration * (0.9 + Math.random() * 0.2),
        error: metabolite.error * (0.8 + Math.random() * 0.4)
      }))
    } : null);
    
    setIsProcessing(false);
  }, [study]);

  // Visualization Functions
  const drawSpectrum = useCallback(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas || !study || !selectedSpectrum) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const spectrum = study.spectra.find(s => s.id === selectedSpectrum);
    if (!spectrum) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set up coordinate system
    const margin = 50;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    
    // Draw frequency labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const freq = frequencyRange[1] - (i / 4) * (frequencyRange[1] - frequencyRange[0]);
      const x = margin + (i / 4) * plotWidth;
      ctx.fillText(freq.toFixed(1), x, height - margin + 20);
    }
    
    // Draw spectrum
    if (spectrum.amplitude.length > 0) {
      const maxAmp = Math.max(...spectrum.amplitude.slice(
        Math.floor((frequencyRange[0] / 4.0) * spectrum.amplitude.length),
        Math.floor((frequencyRange[1] / 4.0) * spectrum.amplitude.length)
      ));
      
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < spectrum.amplitude.length; i++) {
        const freq = spectrum.frequency[i];
        if (freq >= frequencyRange[0] && freq <= frequencyRange[1]) {
          const x = margin + ((frequencyRange[1] - freq) / (frequencyRange[1] - frequencyRange[0])) * plotWidth;
          const y = height - margin - (spectrum.amplitude[i] / maxAmp) * plotHeight;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      
      // Draw baseline if enabled
      if (showBaseline && spectrum.baseline) {
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let i = 0; i < spectrum.baseline.length; i++) {
          const freq = spectrum.frequency[i];
          if (freq >= frequencyRange[0] && freq <= frequencyRange[1]) {
            const x = margin + ((frequencyRange[1] - freq) / (frequencyRange[1] - frequencyRange[0])) * plotWidth;
            const y = height - margin - (spectrum.baseline[i] / maxAmp) * plotHeight;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      }
      
      // Draw metabolite peaks
      spectrum.peaks.forEach(peak => {
        if (peak.frequency >= frequencyRange[0] && peak.frequency <= frequencyRange[1]) {
          const metabolite = study.metabolites.find(m => m.abbreviation === peak.metabolite);
          if (metabolite && metabolite.visible) {
            const x = margin + ((frequencyRange[1] - peak.frequency) / (frequencyRange[1] - frequencyRange[0])) * plotWidth;
            
            // Draw peak marker
            ctx.strokeStyle = metabolite.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, height - margin);
            ctx.lineTo(x, height - margin - (peak.amplitude / maxAmp) * plotHeight);
            ctx.stroke();
            
            // Draw label
            ctx.fillStyle = metabolite.color;
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(metabolite.abbreviation, x, height - margin - (peak.amplitude / maxAmp) * plotHeight - 5);
          }
        }
      });
    }
  }, [study, selectedSpectrum, frequencyRange, showBaseline]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  // Export Functions
  const exportSpectrum = useCallback(() => {
    if (!study || !selectedSpectrum) return;
    
    const spectrum = study.spectra.find(s => s.id === selectedSpectrum);
    if (!spectrum) return;
    
    const data = {
      study: study.id,
      spectrum: spectrum,
      metabolites: study.metabolites,
      processing: study.processing,
      quantification: study.quantification
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrs_spectrum_${study.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [study, selectedSpectrum]);

  const renderSpectrumViewer = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Spectrum Viewer</Typography>
          <ButtonGroup size="small">
            <IconButton onClick={() => setFrequencyRange([Math.max(0, frequencyRange[0] - 0.5), Math.max(1, frequencyRange[1] - 0.5)])}>
              <ZoomOutIcon />
            </IconButton>
            <IconButton onClick={() => setFrequencyRange([Math.min(3.5, frequencyRange[0] + 0.5), Math.min(4.5, frequencyRange[1] + 0.5)])}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={() => setShowBaseline(!showBaseline)} color={showBaseline ? 'primary' : 'default'}>
              <TimelineIcon />
            </IconButton>
            <IconButton onClick={() => setShowFitting(!showFitting)} color={showFitting ? 'primary' : 'default'}>
              <FunctionIcon />
            </IconButton>
          </ButtonGroup>
        </Box>
        
        <Box sx={{ height: 400, bgcolor: 'white', border: '1px solid #ddd', borderRadius: 1 }}>
          <canvas
            ref={spectrumCanvasRef}
            width={800}
            height={400}
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Frequency Range (ppm)</Typography>
          <Slider
            value={frequencyRange}
            onChange={(_, value) => setFrequencyRange(value as [number, number])}
            min={0}
            max={5}
            step={0.1}
            valueLabelDisplay="auto"
            marks={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' }
            ]}
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderProcessingControls = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Processing Controls</Typography>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Apodization</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={processingParams.apodization.type}
                onChange={(e) => setProcessingParams(prev => ({
                  ...prev,
                  apodization: { ...prev.apodization, type: e.target.value as any }
                }))}
              >
                <MenuItem value="exponential">Exponential</MenuItem>
                <MenuItem value="gaussian">Gaussian</MenuItem>
                <MenuItem value="lorentzian">Lorentzian</MenuItem>
                <MenuItem value="none">None</MenuItem>
              </Select>
            </FormControl>
            
            <Typography gutterBottom>Line Broadening (Hz)</Typography>
            <Slider
              value={processingParams.apodization.linebroadening}
              onChange={(_, value) => setProcessingParams(prev => ({
                ...prev,
                apodization: { ...prev.apodization, linebroadening: value as number }
              }))}
              min={0}
              max={10}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Phase Correction</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControlLabel
              control={
                <Switch
                  checked={processingParams.phaseCorrection.automatic}
                  onChange={(e) => setProcessingParams(prev => ({
                    ...prev,
                    phaseCorrection: { ...prev.phaseCorrection, automatic: e.target.checked }
                  }))}
                />
              }
              label="Automatic"
            />
            
            {!processingParams.phaseCorrection.automatic && (
              <>
                <Typography gutterBottom>Zero Order (°)</Typography>
                <Slider
                  value={processingParams.phaseCorrection.zerothOrder}
                  onChange={(_, value) => setProcessingParams(prev => ({
                    ...prev,
                    phaseCorrection: { ...prev.phaseCorrection, zerothOrder: value as number }
                  }))}
                  min={-180}
                  max={180}
                  step={1}
                  valueLabelDisplay="auto"
                />
                
                <Typography gutterBottom>First Order (°)</Typography>
                <Slider
                  value={processingParams.phaseCorrection.firstOrder}
                  onChange={(_, value) => setProcessingParams(prev => ({
                    ...prev,
                    phaseCorrection: { ...prev.phaseCorrection, firstOrder: value as number }
                  }))}
                  min={-180}
                  max={180}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </>
            )}
          </AccordionDetails>
        </Accordion>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Baseline Correction</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Method</InputLabel>
              <Select
                value={processingParams.baselineCorrection.method}
                onChange={(e) => setProcessingParams(prev => ({
                  ...prev,
                  baselineCorrection: { ...prev.baselineCorrection, method: e.target.value as any }
                }))}
              >
                <MenuItem value="polynomial">Polynomial</MenuItem>
                <MenuItem value="spline">Spline</MenuItem>
                <MenuItem value="wavelet">Wavelet</MenuItem>
                <MenuItem value="none">None</MenuItem>
              </Select>
            </FormControl>
            
            <Typography gutterBottom>Order</Typography>
            <Slider
              value={processingParams.baselineCorrection.order}
              onChange={(_, value) => setProcessingParams(prev => ({
                ...prev,
                baselineCorrection: { ...prev.baselineCorrection, order: value as number }
              }))}
              min={1}
              max={10}
              step={1}
              valueLabelDisplay="auto"
            />
          </AccordionDetails>
        </Accordion>
        
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={processSpectrum}
            disabled={isProcessing}
            startIcon={<RefreshIcon />}
            fullWidth
          >
            {isProcessing ? 'Processing...' : 'Process Spectrum'}
          </Button>
          
          {isProcessing && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={processingProgress} />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Progress: {Math.round(processingProgress)}%
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderMetaboliteTable = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Metabolite Quantification</Typography>
          <Button
            variant="contained"
            onClick={performQuantification}
            disabled={isProcessing}
            startIcon={<CalculateIcon />}
            size="small"
          >
            Quantify
          </Button>
        </Box>
        
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metabolite</TableCell>
                <TableCell>Freq (ppm)</TableCell>
                <TableCell>Conc (mM)</TableCell>
                <TableCell>Error (±)</TableCell>
                <TableCell>SNR</TableCell>
                <TableCell>CRLB (%)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {study?.metabolites.map((metabolite) => {
                const isNormal = metabolite.concentration >= metabolite.referenceValues.normal[0] && 
                                metabolite.concentration <= metabolite.referenceValues.normal[1];
                const isPathological = metabolite.referenceValues.pathological && 
                                     metabolite.concentration >= metabolite.referenceValues.pathological[0] && 
                                     metabolite.concentration <= metabolite.referenceValues.pathological[1];
                
                return (
                  <TableRow key={metabolite.abbreviation}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            bgcolor: metabolite.color,
                            mr: 1,
                            borderRadius: '50%'
                          }}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {metabolite.abbreviation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metabolite.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{metabolite.frequency.toFixed(2)}</TableCell>
                    <TableCell>{metabolite.concentration.toFixed(1)}</TableCell>
                    <TableCell>{metabolite.error.toFixed(1)}</TableCell>
                    <TableCell>{metabolite.snr.toFixed(1)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${metabolite.cramersRaoLowerBound.toFixed(1)}%`}
                        size="small"
                        color={metabolite.cramersRaoLowerBound < 20 ? 'success' : 
                               metabolite.cramersRaoLowerBound < 50 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isPathological ? 'Pathological' : isNormal ? 'Normal' : 'Abnormal'}
                        size="small"
                        color={isPathological ? 'error' : isNormal ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setStudy(prev => prev ? {
                          ...prev,
                          metabolites: prev.metabolites.map(m => 
                            m.abbreviation === metabolite.abbreviation 
                              ? { ...m, visible: !m.visible }
                              : m
                          )
                        } : null)}
                      >
                        {metabolite.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
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
            <Typography variant="subtitle2" gutterBottom>Metabolite Ratios</Typography>
            <Grid container spacing={2}>
              {Object.entries(study.quantification.metaboliteRatios).map(([ratio, value]) => (
                <Grid item xs={6} md={4} key={ratio}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6">{value.toFixed(2)}</Typography>
                    <Typography variant="caption">{ratio}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderQualityAssessment = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Quality Assessment</Typography>
        
        {study && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Signal-to-Noise Ratio</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (study.quality.snr / 50) * 100)}
                  sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                  color={study.quality.snr > 20 ? 'success' : study.quality.snr > 10 ? 'warning' : 'error'}
                />
                <Typography variant="body2">{study.quality.snr.toFixed(1)}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Linewidth (Hz)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, 100 - (study.quality.linewidth / 20) * 100)}
                  sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                  color={study.quality.linewidth < 10 ? 'success' : study.quality.linewidth < 15 ? 'warning' : 'error'}
                />
                <Typography variant="body2">{study.quality.linewidth.toFixed(1)}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Water Suppression (dB)</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={(study.quality.waterSuppression / 60) * 100}
                  sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                  color={study.quality.waterSuppression > 40 ? 'success' : study.quality.waterSuppression > 30 ? 'warning' : 'error'}
                />
                <Typography variant="body2">{study.quality.waterSuppression.toFixed(1)}</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Shim Quality</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LinearProgress
                  variant="determinate"
                  value={study.quality.shimQuality * 100}
                  sx={{ flexGrow: 1, mr: 2, height: 8, borderRadius: 4 }}
                  color={study.quality.shimQuality > 0.8 ? 'success' : study.quality.shimQuality > 0.6 ? 'warning' : 'error'}
                />
                <Typography variant="body2">{(study.quality.shimQuality * 100).toFixed(1)}%</Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Chip
                  label={`Overall Quality: ${study.quality.overallQuality.toUpperCase()}`}
                  size="large"
                  color={
                    study.quality.overallQuality === 'excellent' ? 'success' :
                    study.quality.overallQuality === 'good' ? 'info' :
                    study.quality.overallQuality === 'acceptable' ? 'warning' : 'error'
                  }
                />
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">MR Spectroscopy</Typography>
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
            onClick={exportSpectrum}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {renderSpectrumViewer()}
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab label="Processing" />
            <Tab label="Metabolites" />
            <Tab label="Quality" />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderProcessingControls()}
            {activeTab === 1 && renderMetaboliteTable()}
            {activeTab === 2 && renderQualityAssessment()}
          </Box>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>MR Spectroscopy Settings</DialogTitle>
        <DialogContent>
          <Typography>Advanced spectroscopy settings and preferences</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShowSettings(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MRSpectroscopy;