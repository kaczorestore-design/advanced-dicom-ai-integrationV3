// PET/CT Fusion Component
// Advanced nuclear medicine imaging with registration and visualization

import React, { useState, useEffect, useRef, useCallback, ChangeEvent, SyntheticEvent } from 'react';
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
  Alert,
  LinearProgress,
  TextField,
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
  DialogActions
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  ScatterPlot as ScatterPlotIcon,
  Layers as LayersIcon,
  Straighten as MeasureIcon,
  CenterFocusStrong as TargetIcon
} from '@mui/icons-material';

// PET/CT Data Structures
interface PETCTStudy {
  id: string;
  patientId: string;
  studyDate: string;
  petSeries: DICOMSeries[];
  ctSeries: DICOMSeries[];
  registrationMatrix?: number[][];
  fusionSettings: FusionSettings;
  suv: SUVData;
  roi: ROIData[];
  timeActivity?: TimeActivityData;
}

interface DICOMSeries {
  id: string;
  modality: 'PT' | 'CT';
  seriesNumber: string;
  description: string;
  instanceCount: number;
  sliceThickness: number;
  pixelSpacing: [number, number];
  imageOrientation: number[];
  imagePosition: number[];
  acquisitionTime?: string;
  radiopharmaceutical?: string;
  injectedDose?: number;
  halfLife?: number;
  decayCorrection?: string;
}

interface FusionSettings {
  petOpacity: number;
  ctOpacity: number;
  colormap: string;
  windowLevel: number;
  windowWidth: number;
  petThreshold: number;
  registrationMethod: 'rigid' | 'affine' | 'deformable' | 'manual';
  interpolation: 'nearest' | 'linear' | 'cubic';
  blendMode: 'overlay' | 'multiply' | 'screen' | 'difference';
  autoRegistration: boolean;
  showGrid: boolean;
  showCrosshairs: boolean;
}

interface SUVData {
  patientWeight: number;
  injectedDose: number;
  injectionTime: string;
  acquisitionTime: string;
  halfLife: number;
  decayFactor: number;
  calibrationFactor: number;
  suvMax: number;
  suvMean: number;
  suvPeak: number;
  metabolicVolume: number;
  totalLesionGlycolysis: number;
}

interface ROIData {
  id: string;
  name: string;
  type: 'sphere' | 'ellipse' | 'polygon' | 'freehand';
  coordinates: number[];
  volume: number;
  suvMax: number;
  suvMean: number;
  suvPeak: number;
  standardDeviation: number;
  metabolicVolume: number;
  totalLesionGlycolysis: number;
  visible: boolean;
  color: string;
}

interface TimeActivityData {
  timePoints: number[];
  activityValues: number[];
  decayCorrected: boolean;
  units: string;
  roi?: string;
}

interface RegistrationResult {
  success: boolean;
  transformMatrix: number[][];
  registrationError: number;
  iterations: number;
  convergence: boolean;
  metrics: {
    mutualInformation: number;
    normalizedCrossCorrelation: number;
    meanSquaredError: number;
  };
}

interface FusionQualityMetrics {
  spatialAlignment: number;
  temporalAlignment: number;
  contrastToNoise: number;
  signalToNoise: number;
  uniformity: number;
  recovery: number;
  spillover: number;
}

const PETCTFusion: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [study, setStudy] = useState<PETCTStudy | null>(null);
  const [fusionSettings, setFusionSettings] = useState<FusionSettings>({
    petOpacity: 0.7,
    ctOpacity: 0.3,
    colormap: 'hot',
    windowLevel: 400,
    windowWidth: 1000,
    petThreshold: 2.5,
    registrationMethod: 'rigid',
    interpolation: 'linear',
    blendMode: 'overlay',
    autoRegistration: true,
    showGrid: false,
    showCrosshairs: true
  });
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [qualityMetrics, setQualityMetrics] = useState<FusionQualityMetrics | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [viewMode, setViewMode] = useState<'axial' | 'coronal' | 'sagittal' | '3d' | 'mip'>('axial');
  const [measurementMode, setMeasurementMode] = useState<'none' | 'distance' | 'area' | 'volume' | 'suv'>('none');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const calculateQualityMetrics = useCallback(() => {
    // Simulate quality metrics calculation
    const metrics: FusionQualityMetrics = {
      spatialAlignment: 0.92,
      temporalAlignment: 0.88,
      contrastToNoise: 15.2,
      signalToNoise: 28.5,
      uniformity: 0.85,
      recovery: 0.78,
      spillover: 0.12
    };
    
    setQualityMetrics(metrics);
  }, []);

  // Initialize with sample data
  useEffect(() => {
    const sampleStudy: PETCTStudy = {
      id: 'study_001',
      patientId: 'patient_001',
      studyDate: '2024-01-15',
      petSeries: [
        {
          id: 'pet_001',
          modality: 'PT',
          seriesNumber: '2',
          description: 'PET WB',
          instanceCount: 128,
          sliceThickness: 3.27,
          pixelSpacing: [4.07, 4.07],
          imageOrientation: [1, 0, 0, 0, 1, 0],
          imagePosition: [0, 0, 0],
          acquisitionTime: '14:30:00',
          radiopharmaceutical: 'F-18 FDG',
          injectedDose: 370,
          halfLife: 109.8,
          decayCorrection: 'START'
        }
      ],
      ctSeries: [
        {
          id: 'ct_001',
          modality: 'CT',
          seriesNumber: '1',
          description: 'CT WB',
          instanceCount: 512,
          sliceThickness: 1.25,
          pixelSpacing: [0.98, 0.98],
          imageOrientation: [1, 0, 0, 0, 1, 0],
          imagePosition: [0, 0, 0]
        }
      ],
      fusionSettings,
      suv: {
        patientWeight: 70,
        injectedDose: 370,
        injectionTime: '13:00:00',
        acquisitionTime: '14:30:00',
        halfLife: 109.8,
        decayFactor: 0.85,
        calibrationFactor: 1.0,
        suvMax: 12.5,
        suvMean: 2.3,
        suvPeak: 8.7,
        metabolicVolume: 45.2,
        totalLesionGlycolysis: 104.0
      },
      roi: [
        {
          id: 'roi_001',
          name: 'Liver Lesion',
          type: 'sphere',
          coordinates: [120, 150, 45],
          volume: 12.5,
          suvMax: 8.2,
          suvMean: 4.1,
          suvPeak: 6.8,
          standardDeviation: 1.2,
          metabolicVolume: 8.3,
          totalLesionGlycolysis: 34.0,
          visible: true,
          color: '#ff0000'
        },
        {
          id: 'roi_002',
          name: 'Lung Nodule',
          type: 'ellipse',
          coordinates: [200, 100, 80],
          volume: 3.2,
          suvMax: 12.5,
          suvMean: 6.8,
          suvPeak: 10.2,
          standardDeviation: 2.1,
          metabolicVolume: 2.8,
          totalLesionGlycolysis: 19.0,
          visible: true,
          color: '#00ff00'
        }
      ],
      timeActivity: {
        timePoints: [0, 5, 10, 15, 30, 45, 60, 90, 120],
        activityValues: [0, 2.1, 4.5, 6.8, 8.2, 7.9, 7.1, 6.2, 5.8],
        decayCorrected: true,
        units: 'SUV',
        roi: 'roi_001'
      }
    };
    
    setStudy(sampleStudy);
    calculateQualityMetrics();
  }, [calculateQualityMetrics, fusionSettings]);

  // Registration Functions
  const performRegistration = useCallback(async () => {
    if (!study) return;
    
    setRegistrationStatus('running');
    setRegistrationProgress(0);
    
    // Simulate registration process
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setRegistrationProgress((i / steps) * 100);
    }
    
    // Simulate registration result
    const result: RegistrationResult = {
      success: true,
      transformMatrix: [
        [1.02, 0.01, -0.01, 2.1],
        [-0.01, 1.01, 0.02, -1.3],
        [0.01, -0.02, 0.99, 0.8],
        [0, 0, 0, 1]
      ],
      registrationError: 1.2,
      iterations: 45,
      convergence: true,
      metrics: {
        mutualInformation: 0.85,
        normalizedCrossCorrelation: 0.92,
        meanSquaredError: 0.08
      }
    };
    
    setStudy(prev => prev ? {
      ...prev,
      registrationMatrix: result.transformMatrix
    } : null);
    
    setRegistrationStatus('completed');
    calculateQualityMetrics();
  }, [study, calculateQualityMetrics]);

  // ROI Management
  const addROI = useCallback((type: ROIData['type'], coordinates: number[]) => {
    if (!study) return;
    
    const newROI: ROIData = {
      id: `roi_${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${study.roi.length + 1}`,
      type,
      coordinates,
      volume: 0,
      suvMax: 0,
      suvMean: 0,
      suvPeak: 0,
      standardDeviation: 0,
      metabolicVolume: 0,
      totalLesionGlycolysis: 0,
      visible: true,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    setStudy(prev => prev ? {
      ...prev,
      roi: [...prev.roi, newROI]
    } : null);
  }, [study]);

  const updateROI = useCallback((roiId: string, updates: Partial<ROIData>) => {
    setStudy(prev => prev ? {
      ...prev,
      roi: prev.roi.map(roi => roi.id === roiId ? { ...roi, ...updates } : roi)
    } : null);
  }, []);

  const deleteROI = useCallback((roiId: string) => {
    setStudy(prev => prev ? {
      ...prev,
      roi: prev.roi.filter(roi => roi.id !== roiId)
    } : null);
  }, []);

  // Animation Controls
  const startAnimation = useCallback(() => {
    if (!study || isPlaying) return;
    
    setIsPlaying(true);
    
    const animate = () => {
      setCurrentFrame(prev => {
        const maxFrames = study.petSeries[0]?.instanceCount || 100;
        return (prev + 1) % maxFrames;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [study, isPlaying]);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Export Functions
  const exportFusedImages = useCallback(() => {
    // Export fused images in various formats
    console.log('Exporting fused images...');
  }, []);

  const exportROIData = useCallback(() => {
    if (!study) return;
    
    const roiData = {
      study: study.id,
      patient: study.patientId,
      date: study.studyDate,
      roi: study.roi,
      suv: study.suv
    };
    
    const blob = new Blob([JSON.stringify(roiData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roi_data_${study.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [study]);

  const renderViewer = () => (
    <Box sx={{ position: 'relative', height: 600, bgcolor: 'black', borderRadius: 1 }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
        onClick={(e) => {
          if (measurementMode !== 'none') {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              // Handle measurement placement
              console.log(`Measurement at: ${x}, ${y}`);
            }
          }
        }}
      />
      
      {/* Overlay Controls */}
      <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
        <ButtonGroup variant="contained" size="small">
          <Button
            onClick={() => setViewMode('axial')}
            color={viewMode === 'axial' ? 'primary' : 'inherit'}
          >
            Axial
          </Button>
          <Button
            onClick={() => setViewMode('coronal')}
            color={viewMode === 'coronal' ? 'primary' : 'inherit'}
          >
            Coronal
          </Button>
          <Button
            onClick={() => setViewMode('sagittal')}
            color={viewMode === 'sagittal' ? 'primary' : 'inherit'}
          >
            Sagittal
          </Button>
          <Button
            onClick={() => setViewMode('3d')}
            color={viewMode === '3d' ? 'primary' : 'inherit'}
          >
            3D
          </Button>
          <Button
            onClick={() => setViewMode('mip')}
            color={viewMode === 'mip' ? 'primary' : 'inherit'}
          >
            MIP
          </Button>
        </ButtonGroup>
      </Box>
      
      {/* Animation Controls */}
      <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
        <ButtonGroup variant="contained" size="small">
          <IconButton onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}>
            <PrevIcon />
          </IconButton>
          <IconButton onClick={isPlaying ? stopAnimation : startAnimation}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconButton>
          <IconButton onClick={stopAnimation}>
            <StopIcon />
          </IconButton>
          <IconButton onClick={() => setCurrentFrame(Math.min((study?.petSeries[0]?.instanceCount || 100) - 1, currentFrame + 1))}>
            <NextIcon />
          </IconButton>
        </ButtonGroup>
        <Typography variant="caption" sx={{ ml: 2, color: 'white' }}>
          Frame: {currentFrame + 1} / {study?.petSeries[0]?.instanceCount || 100}
        </Typography>
      </Box>
      
      {/* Measurement Tools */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ButtonGroup orientation="vertical" variant="contained" size="small">
          <IconButton
            onClick={() => setMeasurementMode(measurementMode === 'distance' ? 'none' : 'distance')}
            color={measurementMode === 'distance' ? 'primary' : 'inherit'}
          >
            <MeasureIcon />
          </IconButton>
          <IconButton
            onClick={() => setMeasurementMode(measurementMode === 'area' ? 'none' : 'area')}
            color={measurementMode === 'area' ? 'primary' : 'inherit'}
          >
            <ScatterPlotIcon />
          </IconButton>
          <IconButton
            onClick={() => setMeasurementMode(measurementMode === 'volume' ? 'none' : 'volume')}
            color={measurementMode === 'volume' ? 'primary' : 'inherit'}
          >
            <LayersIcon />
          </IconButton>
          <IconButton
            onClick={() => setMeasurementMode(measurementMode === 'suv' ? 'none' : 'suv')}
            color={measurementMode === 'suv' ? 'primary' : 'inherit'}
          >
            <TargetIcon />
          </IconButton>
        </ButtonGroup>
      </Box>
      
      {/* SUV Scale */}
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, bgcolor: 'rgba(0,0,0,0.7)', p: 1, borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: 'white', display: 'block' }}>SUV Scale</Typography>
        <Box sx={{ width: 20, height: 100, background: 'linear-gradient(to top, blue, cyan, yellow, red)', border: '1px solid white' }} />
        <Typography variant="caption" sx={{ color: 'white', fontSize: '10px' }}>0-15</Typography>
      </Box>
    </Box>
  );

  const renderFusionControls = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Fusion Controls</Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography gutterBottom>PET Opacity</Typography>
            <Slider
              value={fusionSettings.petOpacity}
              onChange={(_: Event, value: number | number[]) => setFusionSettings(prev => ({ ...prev, petOpacity: value as number }))}
              min={0}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography gutterBottom>CT Opacity</Typography>
            <Slider
              value={fusionSettings.ctOpacity}
              onChange={(_: Event, value: number | number[]) => setFusionSettings(prev => ({ ...prev, ctOpacity: value as number }))}
              min={0}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Colormap</InputLabel>
              <Select
                value={fusionSettings.colormap}
                onChange={(e) => setFusionSettings(prev => ({ ...prev, colormap: e.target.value as string }))}
              >
                <MenuItem value="hot">Hot</MenuItem>
                <MenuItem value="jet">Jet</MenuItem>
                <MenuItem value="rainbow">Rainbow</MenuItem>
                <MenuItem value="cool">Cool</MenuItem>
                <MenuItem value="bone">Bone</MenuItem>
                <MenuItem value="copper">Copper</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Blend Mode</InputLabel>
              <Select
                value={fusionSettings.blendMode}
                onChange={(e) => setFusionSettings(prev => ({ ...prev, blendMode: e.target.value as 'overlay' | 'multiply' | 'screen' | 'difference' }))}
              >
                <MenuItem value="overlay">Overlay</MenuItem>
                <MenuItem value="multiply">Multiply</MenuItem>
                <MenuItem value="screen">Screen</MenuItem>
                <MenuItem value="difference">Difference</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography gutterBottom>PET Threshold (SUV)</Typography>
            <Slider
              value={fusionSettings.petThreshold}
              onChange={(_: Event, value: number | number[]) => setFusionSettings(prev => ({ ...prev, petThreshold: value as number }))}
              min={0}
              max={10}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography gutterBottom>Window Level</Typography>
            <Slider
              value={fusionSettings.windowLevel}
              onChange={(_: Event, value: number | number[]) => setFusionSettings(prev => ({ ...prev, windowLevel: value as number }))}
              min={-1000}
              max={1000}
              step={10}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={fusionSettings.autoRegistration}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFusionSettings(prev => ({ ...prev, autoRegistration: e.target.checked }))}
                />
              }
              label="Auto Registration"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={fusionSettings.showGrid}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFusionSettings(prev => ({ ...prev, showGrid: e.target.checked }))}
                />
              }
              label="Show Grid"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={fusionSettings.showCrosshairs}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFusionSettings(prev => ({ ...prev, showCrosshairs: e.target.checked }))}
                />
              }
              label="Show Crosshairs"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderRegistration = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Image Registration</Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Registration Method</InputLabel>
              <Select
                value={fusionSettings.registrationMethod}
                onChange={(e) => setFusionSettings(prev => ({ ...prev, registrationMethod: e.target.value as 'rigid' | 'affine' | 'deformable' | 'manual' }))}
              >
                <MenuItem value="rigid">Rigid</MenuItem>
                <MenuItem value="affine">Affine</MenuItem>
                <MenuItem value="deformable">Deformable</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Interpolation</InputLabel>
              <Select
                value={fusionSettings.interpolation}
                onChange={(e) => setFusionSettings(prev => ({ ...prev, interpolation: e.target.value as 'nearest' | 'linear' | 'cubic' }))}
              >
                <MenuItem value="nearest">Nearest Neighbor</MenuItem>
                <MenuItem value="linear">Linear</MenuItem>
                <MenuItem value="cubic">Cubic</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Button
              variant="contained"
              onClick={performRegistration}
              disabled={registrationStatus === 'running'}
              startIcon={<RefreshIcon />}
              fullWidth
            >
              {registrationStatus === 'running' ? 'Registering...' : 'Perform Registration'}
            </Button>
            
            {registrationStatus === 'running' && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={registrationProgress} />
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Progress: {Math.round(registrationProgress)}%
                </Typography>
              </Box>
            )}
            
            {registrationStatus === 'completed' && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Registration completed successfully
              </Alert>
            )}
            
            {registrationStatus === 'failed' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Registration failed
              </Alert>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderROIAnalysis = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>ROI Analysis</Typography>
        
        <Box sx={{ mb: 2 }}>
          <ButtonGroup size="small">
            <Button onClick={() => addROI('sphere', [100, 100, 50])}>Add Sphere</Button>
            <Button onClick={() => addROI('ellipse', [150, 150, 60])}>Add Ellipse</Button>
            <Button onClick={() => addROI('polygon', [200, 200, 70])}>Add Polygon</Button>
            <Button onClick={exportROIData} startIcon={<DownloadIcon />}>Export</Button>
          </ButtonGroup>
        </Box>
        
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Volume (ml)</TableCell>
                <TableCell>SUV Max</TableCell>
                <TableCell>SUV Mean</TableCell>
                <TableCell>SUV Peak</TableCell>
                <TableCell>MTV (ml)</TableCell>
                <TableCell>TLG</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {study?.roi.map((roi) => (
                <TableRow key={roi.id} selected={false}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: roi.color,
                          mr: 1,
                          borderRadius: '50%'
                        }}
                      />
                      {roi.name}
                    </Box>
                  </TableCell>
                  <TableCell>{roi.type}</TableCell>
                  <TableCell>{roi.volume.toFixed(1)}</TableCell>
                  <TableCell>{roi.suvMax.toFixed(1)}</TableCell>
                  <TableCell>{roi.suvMean.toFixed(1)}</TableCell>
                  <TableCell>{roi.suvPeak.toFixed(1)}</TableCell>
                  <TableCell>{roi.metabolicVolume.toFixed(1)}</TableCell>
                  <TableCell>{roi.totalLesionGlycolysis.toFixed(1)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => updateROI(roi.id, { visible: !roi.visible })}
                    >
                      {roi.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteROI(roi.id)}
                      color="error"
                    >
                      ×
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderSUVAnalysis = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>SUV Analysis</Typography>
        
        {study && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Patient Information</Typography>
              <TextField
                label="Patient Weight (kg)"
                type="number"
                value={study.suv.patientWeight}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStudy(prev => prev ? {
                  ...prev,
                  suv: { ...prev.suv, patientWeight: parseFloat(e.target.value) }
                } : null)}
                fullWidth
                margin="dense"
              />
              <TextField
                label="Injected Dose (MBq)"
                type="number"
                value={study.suv.injectedDose}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStudy(prev => prev ? {
                  ...prev,
                  suv: { ...prev.suv, injectedDose: parseFloat(e.target.value) }
                } : null)}
                fullWidth
                margin="dense"
              />
              <TextField
                label="Injection Time"
                type="time"
                value={study.suv.injectionTime}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setStudy(prev => prev ? {
                  ...prev,
                  suv: { ...prev.suv, injectionTime: e.target.value }
                } : null)}
                fullWidth
                margin="dense"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>SUV Metrics</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">{study.suv.suvMax.toFixed(1)}</Typography>
                  <Typography variant="caption">SUV Max</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">{study.suv.suvMean.toFixed(1)}</Typography>
                  <Typography variant="caption">SUV Mean</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">{study.suv.suvPeak.toFixed(1)}</Typography>
                  <Typography variant="caption">SUV Peak</Typography>
                </Paper>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">{study.suv.metabolicVolume.toFixed(1)}</Typography>
                  <Typography variant="caption">MTV (ml)</Typography>
                </Paper>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">Decay Factor: {study.suv.decayFactor.toFixed(3)}</Typography>
                <Typography variant="body2">Total Lesion Glycolysis: {study.suv.totalLesionGlycolysis.toFixed(1)}</Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  const renderQualityMetrics = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Fusion Quality Metrics</Typography>
        
        {qualityMetrics && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Spatial Alignment</Typography>
              <LinearProgress
                variant="determinate"
                value={qualityMetrics.spatialAlignment * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption">{(qualityMetrics.spatialAlignment * 100).toFixed(1)}%</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Temporal Alignment</Typography>
              <LinearProgress
                variant="determinate"
                value={qualityMetrics.temporalAlignment * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption">{(qualityMetrics.temporalAlignment * 100).toFixed(1)}%</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Contrast to Noise Ratio</Typography>
              <Typography variant="h6">{qualityMetrics.contrastToNoise.toFixed(1)}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom>Signal to Noise Ratio</Typography>
              <Typography variant="h6">{qualityMetrics.signalToNoise.toFixed(1)}</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography gutterBottom>Uniformity</Typography>
              <Typography variant="h6">{(qualityMetrics.uniformity * 100).toFixed(1)}%</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography gutterBottom>Recovery</Typography>
              <Typography variant="h6">{(qualityMetrics.recovery * 100).toFixed(1)}%</Typography>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography gutterBottom>Spillover</Typography>
              <Typography variant="h6">{(qualityMetrics.spillover * 100).toFixed(1)}%</Typography>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">PET/CT Fusion</Typography>
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
            onClick={exportFusedImages}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          {renderViewer()}
        </Grid>
        
        <Grid size={{ xs: 12, lg: 4 }}>
          <Tabs value={activeTab} onChange={(_: SyntheticEvent, value: number) => setActiveTab(value)}>
            <Tab label="Fusion" />
            <Tab label="Registration" />
            <Tab label="ROI" />
            <Tab label="SUV" />
            <Tab label="Quality" />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderFusionControls()}
            {activeTab === 1 && renderRegistration()}
            {activeTab === 2 && renderROIAnalysis()}
            {activeTab === 3 && renderSUVAnalysis()}
            {activeTab === 4 && renderQualityMetrics()}
          </Box>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle>PET/CT Fusion Settings</DialogTitle>
        <DialogContent>
          {/* Advanced settings would go here */}
          <Typography>Advanced fusion settings and preferences</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShowSettings(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PETCTFusion;
