import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Eye,
  EyeOff,
  Link,
  Unlink,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Grid,
  Layers,
  Settings,
  Download,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize,
  Minimize,
  RefreshCw,
  Search,
  Filter,
  ArrowLeftRight,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';

// Interfaces
interface StudyInfo {
  studyInstanceUID: string;
  studyDate: string;
  studyTime: string;
  studyDescription: string;
  patientName: string;
  patientID: string;
  patientAge: string;
  patientSex: string;
  modality: string;
  seriesCount: number;
  imageCount: number;
  studySize: number;
  institution: string;
  referringPhysician: string;
  studyComments?: string;
  priorStudyUID?: string;
  followUpStudyUID?: string;
}

interface SeriesInfo {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  imageCount: number;
  sliceThickness: number;
  pixelSpacing: [number, number];
  acquisitionDate: string;
  acquisitionTime: string;
  bodyPartExamined: string;
  viewPosition?: string;
  contrastAgent?: boolean;
  kvp?: number;
  mas?: number;
  exposureTime?: number;
}

interface ComparisonViewport {
  id: string;
  studyUID: string;
  seriesUID: string;
  imageIndex: number;
  windowLevel: number;
  windowWidth: number;
  zoom: number;
  pan: [number, number];
  rotation: number;
  invert: boolean;
  flip: { horizontal: boolean; vertical: boolean };
  annotations: boolean;
  measurements: boolean;
  overlays: boolean;
}

interface ComparisonLayout {
  id: string;
  name: string;
  rows: number;
  cols: number;
  viewports: ComparisonViewport[];
  syncSettings: {
    scroll: boolean;
    zoom: boolean;
    pan: boolean;
    windowLevel: boolean;
    rotation: boolean;
    annotations: boolean;
  };
}

interface ComparisonAnalysis {
  studyPair: [string, string];
  timeInterval: number; // days
  changeDetection: {
    newLesions: number;
    resolvedLesions: number;
    changedLesions: number;
    stableLesions: number;
  };
  volumetricAnalysis: {
    totalVolumeChange: number; // percentage
    significantChanges: Array<{
      location: string;
      change: number;
      significance: 'significant' | 'minimal' | 'stable';
    }>;
  };
  measurements: Array<{
    id: string;
    type: string;
    location: string;
    baseline: number;
    followup: number;
    change: number;
    changePercent: number;
  }>;
  aiAnalysis?: {
    overallAssessment: 'progression' | 'stable' | 'improvement';
    confidence: number;
    keyFindings: string[];
    recommendations: string[];
  };
}

interface StudyComparisonProps {
  availableStudies: StudyInfo[];
  onStudySelected?: (studyUID: string) => void;
  onComparisonGenerated?: (analysis: ComparisonAnalysis) => void;
  onLayoutChanged?: (layout: ComparisonLayout) => void;
  onViewportChanged?: (viewportId: string, changes: Partial<ComparisonViewport>) => void;
}

const StudyComparison: React.FC<StudyComparisonProps> = ({
  availableStudies,
  onStudySelected,
  onComparisonGenerated,
  onLayoutChanged,
  onViewportChanged
}) => {
  // State management
  const [selectedStudies, setSelectedStudies] = useState<string[]>([]);
  const [comparisonLayout, setComparisonLayout] = useState<ComparisonLayout>({
    id: 'default',
    name: 'Side by Side',
    rows: 1,
    cols: 2,
    viewports: [],
    syncSettings: {
      scroll: true,
      zoom: true,
      pan: true,
      windowLevel: true,
      rotation: false,
      annotations: true
    }
  });
  const [comparisonAnalysis, setComparisonAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCriteria, setFilterCriteria] = useState({
    modality: '',
    dateRange: '',
    bodyPart: '',
    physician: ''
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [maxFrames, setMaxFrames] = useState(100);

  // Refs
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);
  const viewportRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Predefined layouts
  const predefinedLayouts: ComparisonLayout[] = [
    {
      id: 'side-by-side',
      name: 'Side by Side',
      rows: 1,
      cols: 2,
      viewports: [],
      syncSettings: {
        scroll: true,
        zoom: true,
        pan: true,
        windowLevel: true,
        rotation: false,
        annotations: true
      }
    },
    {
      id: 'quad-view',
      name: 'Quad View',
      rows: 2,
      cols: 2,
      viewports: [],
      syncSettings: {
        scroll: true,
        zoom: true,
        pan: true,
        windowLevel: true,
        rotation: false,
        annotations: true
      }
    },
    {
      id: 'timeline',
      name: 'Timeline View',
      rows: 1,
      cols: 4,
      viewports: [],
      syncSettings: {
        scroll: true,
        zoom: true,
        pan: true,
        windowLevel: true,
        rotation: false,
        annotations: true
      }
    }
  ];

  // Filter studies based on search and filter criteria
  const filteredStudies = availableStudies.filter(study => {
    const matchesSearch = study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         study.studyDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         study.patientID.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModality = !filterCriteria.modality || study.modality === filterCriteria.modality;
    const matchesBodyPart = !filterCriteria.bodyPart || 
                           study.studyDescription.toLowerCase().includes(filterCriteria.bodyPart.toLowerCase());
    const matchesPhysician = !filterCriteria.physician || 
                            study.referringPhysician.toLowerCase().includes(filterCriteria.physician.toLowerCase());
    
    return matchesSearch && matchesModality && matchesBodyPart && matchesPhysician;
  });

  // Handle study selection
  const handleStudySelection = useCallback((studyUID: string) => {
    setSelectedStudies(prev => {
      if (prev.includes(studyUID)) {
        return prev.filter(uid => uid !== studyUID);
      } else if (prev.length < 4) {
        return [...prev, studyUID];
      } else {
        return [prev[1], prev[2], prev[3], studyUID];
      }
    });
    onStudySelected?.(studyUID);
  }, [onStudySelected]);

  // Generate comparison analysis
  const generateComparison = useCallback(async () => {
    if (selectedStudies.length < 2) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress
      const progressSteps = [
        { step: 'Loading studies...', progress: 20 },
        { step: 'Registering images...', progress: 40 },
        { step: 'Detecting changes...', progress: 60 },
        { step: 'Analyzing measurements...', progress: 80 },
        { step: 'Generating report...', progress: 100 }
      ];

      for (const { step, progress } of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setAnalysisProgress(progress);
      }

      // Mock analysis results
      const mockAnalysis: ComparisonAnalysis = {
        studyPair: [selectedStudies[0], selectedStudies[1]],
        timeInterval: 90,
        changeDetection: {
          newLesions: 2,
          resolvedLesions: 1,
          changedLesions: 3,
          stableLesions: 8
        },
        volumetricAnalysis: {
          totalVolumeChange: 15.2,
          significantChanges: [
            { location: 'Right upper lobe', change: 23.5, significance: 'significant' },
            { location: 'Left lower lobe', change: -8.2, significance: 'minimal' },
            { location: 'Mediastinum', change: 2.1, significance: 'stable' }
          ]
        },
        measurements: [
          {
            id: '1',
            type: 'Length',
            location: 'Lesion A',
            baseline: 12.5,
            followup: 15.8,
            change: 3.3,
            changePercent: 26.4
          },
          {
            id: '2',
            type: 'Area',
            location: 'Lesion B',
            baseline: 45.2,
            followup: 42.1,
            change: -3.1,
            changePercent: -6.9
          }
        ],
        aiAnalysis: {
          overallAssessment: 'progression',
          confidence: 0.87,
          keyFindings: [
            'New nodule detected in right upper lobe',
            'Existing lesion shows 26% increase in size',
            'No significant changes in mediastinal structures'
          ],
          recommendations: [
            'Consider follow-up imaging in 3 months',
            'Recommend tissue sampling for new lesion',
            'Continue current treatment protocol'
          ]
        }
      };

      setComparisonAnalysis(mockAnalysis);
      onComparisonGenerated?.(mockAnalysis);
    } catch (error) {
      console.error('Error generating comparison:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedStudies, onComparisonGenerated]);

  // Handle layout change
  const handleLayoutChange = useCallback((layoutId: string) => {
    const newLayout = predefinedLayouts.find(layout => layout.id === layoutId);
    if (newLayout) {
      setComparisonLayout(newLayout);
      onLayoutChanged?.(newLayout);
    }
  }, [onLayoutChanged]);

  // Playback controls
  const startPlayback = useCallback(() => {
    setIsPlaying(true);
    playbackInterval.current = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % maxFrames);
    }, 1000 / playbackSpeed);
  }, [playbackSpeed, maxFrames]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    stopPlayback();
    setCurrentFrame(0);
  }, [stopPlayback]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col space-y-4 p-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowLeftRight className="h-5 w-5" />
            <span>Study Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search studies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={filterCriteria.modality} onValueChange={(value) => 
                setFilterCriteria(prev => ({ ...prev, modality: value }))
              }>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="CT">CT</SelectItem>
                  <SelectItem value="MR">MR</SelectItem>
                  <SelectItem value="XR">XR</SelectItem>
                  <SelectItem value="US">US</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Layout Selection */}
            <div className="flex items-center space-x-2">
              <Grid className="h-4 w-4" />
              <Select value={comparisonLayout.id} onValueChange={handleLayoutChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {predefinedLayouts.map(layout => (
                    <SelectItem key={layout.id} value={layout.id}>
                      {layout.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Generate Comparison */}
            <Button 
              onClick={generateComparison}
              disabled={selectedStudies.length < 2 || isAnalyzing}
              className="ml-auto"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Comparison
                </>
              )}
            </Button>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="mt-4">
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">
                Analyzing studies... {analysisProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex-1 flex space-x-4">
        {/* Study Selection Panel */}
        <Card className="w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg">Available Studies</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredStudies.map(study => (
                  <div
                    key={study.studyInstanceUID}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudies.includes(study.studyInstanceUID)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleStudySelection(study.studyInstanceUID)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{study.modality}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {study.studyDate}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">
                      {study.patientName}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-1">
                      {study.studyDescription}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{study.seriesCount} series</span>
                      <span>{study.imageCount} images</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Selected Studies Summary */}
            {selectedStudies.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Selected Studies</h4>
                <div className="space-y-1">
                  {selectedStudies.map((studyUID, index) => {
                    const study = availableStudies.find(s => s.studyInstanceUID === studyUID);
                    return study ? (
                      <div key={studyUID} className="text-xs p-2 bg-muted rounded">
                        <span className="font-medium">{index + 1}. </span>
                        {study.patientName} - {study.studyDate}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Comparison Area */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Viewport Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Sync Controls */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Link className="h-4 w-4" />
                    <span className="text-sm font-medium">Sync:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={comparisonLayout.syncSettings.scroll ? "default" : "outline"}
                      size="sm"
                      onClick={() => setComparisonLayout(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, scroll: !prev.syncSettings.scroll }
                      }))}
                    >
                      Scroll
                    </Button>
                    <Button
                      variant={comparisonLayout.syncSettings.zoom ? "default" : "outline"}
                      size="sm"
                      onClick={() => setComparisonLayout(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, zoom: !prev.syncSettings.zoom }
                      }))}
                    >
                      Zoom
                    </Button>
                    <Button
                      variant={comparisonLayout.syncSettings.windowLevel ? "default" : "outline"}
                      size="sm"
                      onClick={() => setComparisonLayout(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, windowLevel: !prev.syncSettings.windowLevel }
                      }))}
                    >
                      W/L
                    </Button>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPlayback}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isPlaying ? stopPlayback : startPlayback}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentFrame((currentFrame + 1) % maxFrames)}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(Number(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Viewports */}
          <Card className="flex-1">
            <CardContent className="p-4 h-full">
              <div 
                className="grid h-full gap-2"
                style={{
                  gridTemplateRows: `repeat(${comparisonLayout.rows}, 1fr)`,
                  gridTemplateColumns: `repeat(${comparisonLayout.cols}, 1fr)`
                }}
              >
                {Array.from({ length: comparisonLayout.rows * comparisonLayout.cols }).map((_, index) => (
                  <div
                    key={index}
                    ref={el => viewportRefs.current[`viewport-${index}`] = el}
                    className="border border-border rounded bg-black flex items-center justify-center text-white relative overflow-hidden"
                  >
                    {selectedStudies[index] ? (
                      <div className="w-full h-full relative">
                        {/* Viewport content would be rendered here */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm opacity-75">
                              Study {index + 1}
                            </p>
                            <p className="text-xs opacity-50">
                              {availableStudies.find(s => s.studyInstanceUID === selectedStudies[index])?.studyDescription}
                            </p>
                          </div>
                        </div>
                        
                        {/* Viewport overlay info */}
                        <div className="absolute top-2 left-2 text-xs bg-black/50 p-2 rounded">
                          <div>Frame: {currentFrame + 1}/{maxFrames}</div>
                          <div>W/L: 400/40</div>
                          <div>Zoom: 100%</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Select study {index + 1}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results Panel */}
        {comparisonAnalysis && (
          <Card className="w-80 flex-shrink-0">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Analysis Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="changes">Changes</TabsTrigger>
                  <TabsTrigger value="ai">AI Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Time Interval:</span>
                      <span>{comparisonAnalysis.timeInterval} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Volume Change:</span>
                      <span className={comparisonAnalysis.volumetricAnalysis.totalVolumeChange > 0 ? 'text-red-500' : 'text-green-500'}>
                        {comparisonAnalysis.volumetricAnalysis.totalVolumeChange > 0 ? '+' : ''}
                        {comparisonAnalysis.volumetricAnalysis.totalVolumeChange}%
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Change Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-medium text-red-600">{comparisonAnalysis.changeDetection.newLesions}</div>
                        <div className="text-red-500">New</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium text-green-600">{comparisonAnalysis.changeDetection.resolvedLesions}</div>
                        <div className="text-green-500">Resolved</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded">
                        <div className="font-medium text-yellow-600">{comparisonAnalysis.changeDetection.changedLesions}</div>
                        <div className="text-yellow-500">Changed</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-medium text-blue-600">{comparisonAnalysis.changeDetection.stableLesions}</div>
                        <div className="text-blue-500">Stable</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="changes" className="space-y-4">
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Measurements</h4>
                      {comparisonAnalysis.measurements.map(measurement => (
                        <div key={measurement.id} className="p-2 border rounded text-xs">
                          <div className="font-medium">{measurement.location}</div>
                          <div className="text-muted-foreground">{measurement.type}</div>
                          <div className="flex justify-between mt-1">
                            <span>Baseline: {measurement.baseline}mm</span>
                            <span>Follow-up: {measurement.followup}mm</span>
                          </div>
                          <div className={`text-center mt-1 font-medium ${
                            measurement.changePercent > 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {measurement.changePercent > 0 ? '+' : ''}{measurement.changePercent.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                      
                      <h4 className="font-medium text-sm mt-4">Volumetric Changes</h4>
                      {comparisonAnalysis.volumetricAnalysis.significantChanges.map((change, index) => (
                        <div key={index} className="p-2 border rounded text-xs">
                          <div className="font-medium">{change.location}</div>
                          <div className="flex justify-between mt-1">
                            <span>Change: {change.change > 0 ? '+' : ''}{change.change}%</span>
                            <Badge 
                              variant={change.significance === 'significant' ? 'destructive' : 
                                      change.significance === 'minimal' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {change.significance}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="ai" className="space-y-4">
                  {comparisonAnalysis.aiAnalysis && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <Badge 
                          variant={comparisonAnalysis.aiAnalysis.overallAssessment === 'progression' ? 'destructive' :
                                  comparisonAnalysis.aiAnalysis.overallAssessment === 'improvement' ? 'default' : 'secondary'}
                        >
                          {comparisonAnalysis.aiAnalysis.overallAssessment.toUpperCase()}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Confidence: {(comparisonAnalysis.aiAnalysis.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Key Findings</h4>
                        <ul className="text-xs space-y-1">
                          {comparisonAnalysis.aiAnalysis.keyFindings.map((finding, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <Activity className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                        <ul className="text-xs space-y-1">
                          {comparisonAnalysis.aiAnalysis.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              {/* Export Options */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-4 w-4 mr-1" />
                    Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudyComparison;
export type { StudyInfo, ComparisonAnalysis, ComparisonLayout, ComparisonViewport };