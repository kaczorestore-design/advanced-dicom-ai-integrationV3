import React, { useEffect, useState } from 'react';
import { imageLoader } from '@cornerstonejs/core';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  BarChart3, 
  TrendingUp,
  Clock,
  Download
} from 'lucide-react';

export interface TemporalFrame {
  id: string;
  frameNumber: number;
  timestamp: number;
  imageId: string;
  acquisitionTime?: Date;
  triggerTime?: number;
  cardiacPhase?: 'systole' | 'diastole' | 'unknown';
  respiratoryPhase?: 'inspiration' | 'expiration' | 'unknown';
  metadata?: {
    heartRate?: number;
    respiratoryRate?: number;
    contrastPhase?: string;
    sequenceType?: string;
  };
}

export interface TemporalSeries {
  id: string;
  name: string;
  description?: string;
  frames: TemporalFrame[];
  frameRate: number;
  duration: number;
  seriesType: 'cardiac' | 'perfusion' | 'diffusion' | 'functional' | 'contrast' | 'cine' | 'other';
  analysisType?: 'time-intensity' | 'motion' | 'perfusion' | 'strain' | 'flow';
  metadata?: {
    patientPosition?: string;
    scanningSequence?: string;
    sequenceVariant?: string;
    acquisitionMatrix?: number[];
    pixelSpacing?: number[];
    sliceThickness?: number;
  };
}

export interface TemporalAnalysisResult {
  id: string;
  seriesId: string;
  analysisType: string;
  timestamp: Date;
  roi?: {
    coordinates: number[][];
    area: number;
    centroid: [number, number];
  };
  timeIntensityCurve?: {
    timePoints: number[];
    intensityValues: number[];
    peakTime: number;
    peakIntensity: number;
    washInRate: number;
    washOutRate: number;
    areaUnderCurve: number;
    timeToEnhancement: number;
    enhancementRatio: number;
  };
  motionAnalysis?: {
    displacement: number[];
    velocity: number[];
    acceleration: number[];
    strain: number[];
    strainRate: number[];
    ejectionFraction?: number;
    wallMotionScore?: number;
  };
  perfusionMetrics?: {
    bloodFlow: number;
    bloodVolume: number;
    meanTransitTime: number;
    timeToMaximum: number;
    maximumSlope: number;
    ktrans?: number;
    kep?: number;
    ve?: number;
  };
  functionalMetrics?: {
    signalChange: number[];
    activation: boolean[];
    correlationCoefficient: number;
    tStatistic: number;
    pValue: number;
    clusterSize?: number;
  };
  statistics: {
    mean: number;
    std: number;
    min: number;
    max: number;
    range: number;
    coefficient_of_variation: number;
  };
}

export interface TemporalConfig {
  playbackSpeed: number;
  loopMode: 'none' | 'forward' | 'backward' | 'ping-pong';
  autoPlay: boolean;
  showFrameNumbers: boolean;
  showTimestamps: boolean;
  enableMotionDetection: boolean;
  enablePerfusionAnalysis: boolean;
  enableCardiacAnalysis: boolean;
  enableRespiratoryGating: boolean;
  interpolationMode: 'none' | 'linear' | 'cubic' | 'spline';
  temporalSmoothing: boolean;
  motionCompensation: boolean;
  exportFormat: 'mp4' | 'gif' | 'dicom' | 'avi';
  exportQuality: 'low' | 'medium' | 'high' | 'lossless';
  analysisROI?: {
    type: 'circle' | 'rectangle' | 'polygon' | 'freehand';
    coordinates: number[][];
  };
}

class TemporalImagingTools {
  private activeElement: HTMLElement | null = null;
  private temporalSeries: Map<string, TemporalSeries> = new Map();
  private analysisResults: Map<string, TemporalAnalysisResult[]> = new Map();
  private config: TemporalConfig;
  private playbackTimer: NodeJS.Timeout | null = null;
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private eventListeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor(config: Partial<TemporalConfig> = {}) {
    this.config = {
      playbackSpeed: 1.0,
      loopMode: 'forward',
      autoPlay: false,
      showFrameNumbers: true,
      showTimestamps: false,
      enableMotionDetection: true,
      enablePerfusionAnalysis: true,
      enableCardiacAnalysis: true,
      enableRespiratoryGating: false,
      interpolationMode: 'linear',
      temporalSmoothing: false,
      motionCompensation: false,
      exportFormat: 'mp4',
      exportQuality: 'high',
      ...config
    };

    this.initializeWorkers();
  }

  public initialize(element: HTMLElement): void {
    this.activeElement = element;
    this.setupEventHandlers();
    this.registerTemporalTools();
  }

  public destroy(): void {
    this.stopPlayback();
    this.cleanupWorkers();
    this.removeEventHandlers();
    this.activeElement = null;
  }

  private initializeWorkers(): void {
    // Initialize web workers for temporal analysis
    try {
      const motionWorker = new Worker('/workers/motionAnalysis.js');
      motionWorker.onmessage = (e) => this.handleWorkerResult('motion', e.data);
      this.workers.set('motion', motionWorker);

      const perfusionWorker = new Worker('/workers/perfusionAnalysis.js');
      perfusionWorker.onmessage = (e) => this.handleWorkerResult('perfusion', e.data);
      this.workers.set('perfusion', perfusionWorker);

      const cardiacWorker = new Worker('/workers/cardiacAnalysis.js');
      cardiacWorker.onmessage = (e) => this.handleWorkerResult('cardiac', e.data);
      this.workers.set('cardiac', cardiacWorker);
    } catch (_error) {
      console.warn('Web workers not available, falling back to main thread processing');
    }
  }

  private cleanupWorkers(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }

  private registerTemporalTools(): void {
    this.registerTimeIntensityTool();
    this.registerMotionAnalysisTool();
    this.registerPerfusionAnalysisTool();
    this.registerCardiacAnalysisTool();
    this.registerRespiratoryGatingTool();
  }

  private registerTimeIntensityTool(): void {
    // TODO: Update for Cornerstone3D
    // const TimeIntensityTool = cornerstoneTools.importInternal('base/BaseTool');
    
    const TemporalTimeIntensityTool = class {
      constructor(_props = {}) {
        // TODO: Update constructor for Cornerstone3D
        // const defaultProps = { name: 'TemporalTimeIntensity', supportedInteractionTypes: ['Mouse', 'Touch'] };
        // super(props, defaultProps);
      }

      async analyzeTimeIntensity(regionData: Record<string, unknown>, temporalSeries: TemporalSeries, _element: HTMLElement) {
        const timeIntensityCurve = await this.calculateTimeIntensityCurve(regionData, temporalSeries);
        const metrics = this.calculateCurveMetrics(timeIntensityCurve);
        
        return {
          type: 'time-intensity',
          timeIntensityCurve: {
            ...timeIntensityCurve,
            ...metrics
          }
        };
      }

      async calculateTimeIntensityCurve(_regionData: Record<string, unknown>, _temporalSeries: TemporalSeries) {
        const timePoints: number[] = [];
        const intensityValues: number[] = [];

        for (const frame of _temporalSeries.frames) {
          const image = await imageLoader.loadAndCacheImage(frame.imageId);
          const intensity = this.extractRegionIntensity(_regionData, image as unknown as Record<string, unknown>);
          
          timePoints.push(frame.timestamp);
          intensityValues.push(intensity);
        }

        return { timePoints, intensityValues };
      }

      calculateCurveMetrics(curve: { timePoints: number[], intensityValues: number[] }) {
        const { timePoints, intensityValues } = curve;
        
        const peakIndex = intensityValues.indexOf(Math.max(...intensityValues));
        const peakTime = timePoints[peakIndex];
        const peakIntensity = intensityValues[peakIndex];
        
        const baseline = intensityValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const enhancementRatio = (peakIntensity - baseline) / baseline;
        
        // Calculate wash-in rate (slope from baseline to peak)
        const washInRate = (peakIntensity - baseline) / (peakTime - timePoints[0]);
        
        // Calculate wash-out rate (slope from peak to end)
        const endIntensity = intensityValues[intensityValues.length - 1];
        const washOutRate = (endIntensity - peakIntensity) / (timePoints[timePoints.length - 1] - peakTime);
        
        // Calculate area under curve using trapezoidal rule
        let areaUnderCurve = 0;
        for (let i = 1; i < timePoints.length; i++) {
          const dt = timePoints[i] - timePoints[i - 1];
          const avgIntensity = (intensityValues[i] + intensityValues[i - 1]) / 2;
          areaUnderCurve += avgIntensity * dt;
        }
        
        // Find time to enhancement (10% above baseline)
        const enhancementThreshold = baseline * 1.1;
        let timeToEnhancement = 0;
        for (let i = 0; i < intensityValues.length; i++) {
          if (intensityValues[i] > enhancementThreshold) {
            timeToEnhancement = timePoints[i];
            break;
          }
        }

        return {
          peakTime,
          peakIntensity,
          washInRate,
          washOutRate,
          areaUnderCurve,
          timeToEnhancement,
          enhancementRatio
        };
      }

      extractRegionIntensity(regionData: Record<string, unknown>, image: Record<string, unknown>): number {
        // Extract pixel values from the region and calculate mean intensity
        const pixelData = (image as unknown as { getPixelData(): number[] }).getPixelData();
        const { width, height } = image;
        
        // Simplified region extraction - in practice, this would be more sophisticated
        const coordinates = (regionData.handles as unknown as { points?: Record<string, unknown>[] })?.points || (regionData.coordinates as Record<string, unknown>[]) || [];
        if (!coordinates || coordinates.length === 0) return 0;
        
        let totalIntensity = 0;
        let pixelCount = 0;
        
        // For simplicity, sample a few points around the region
        coordinates.forEach((point: Record<string, unknown>) => {
          const x = Math.round((point.x as number) || (point[0] as number));
          const y = Math.round((point.y as number) || (point[1] as number));
          
          if (x >= 0 && x < (width as number) && y >= 0 && y < (height as number)) {
            const index = y * (width as number) + x;
            totalIntensity += pixelData[index];
            pixelCount++;
          }
        });
        
        return pixelCount > 0 ? totalIntensity / pixelCount : 0;
      }
    }

    console.log('Registering TemporalTimeIntensityTool:', TemporalTimeIntensityTool);
    // cornerstoneTools.addTool(TemporalTimeIntensityTool); // TODO: Update for Cornerstone3D
  }

  private registerMotionAnalysisTool(): void {
    // TODO: Update for Cornerstone3D
    // const MotionAnalysisTool = cornerstoneTools.importInternal('base/BaseTool');
    
    const TemporalMotionAnalysisTool = class {
      constructor(_props = {}) {
        // TODO: Update constructor for Cornerstone3D
        // const defaultProps = { name: 'TemporalMotionAnalysis', supportedInteractionTypes: ['Mouse', 'Touch'] };
        // super(props, defaultProps);
      }

      async analyzeMotion(regionData: Record<string, unknown>, temporalSeries: TemporalSeries, _element: HTMLElement) {
        const motionVectors = await this.calculateMotionVectors(regionData, temporalSeries);
        const motionMetrics = this.calculateMotionMetrics(motionVectors);
        
        return {
          type: 'motion',
          motionAnalysis: motionMetrics
        };
      }

      async calculateMotionVectors(regionData: Record<string, unknown>, temporalSeries: TemporalSeries) {
        const motionVectors: Array<{ dx: number, dy: number, magnitude: number }> = [];
        
        for (let i = 1; i < temporalSeries.frames.length; i++) {
          const prevFrame = temporalSeries.frames[i - 1];
          const currFrame = temporalSeries.frames[i];
          
          const prevImage = await imageLoader.loadAndCacheImage(prevFrame.imageId);
          const currImage = await imageLoader.loadAndCacheImage(currFrame.imageId);
          
          const motion = this.calculateFrameMotion(regionData, prevImage as unknown, currImage as unknown);
          motionVectors.push(motion);
        }
        
        return motionVectors;
      }

      calculateFrameMotion(_regionData: Record<string, unknown>, _prevImage: unknown, _currImage: unknown) {
        // Simplified motion calculation using template matching
        // In practice, this would use more sophisticated optical flow algorithms
        
        const dx = Math.random() * 2 - 1; // Placeholder
        const dy = Math.random() * 2 - 1; // Placeholder
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        return { dx, dy, magnitude };
      }

      calculateMotionMetrics(motionVectors: Array<{ dx: number, dy: number, magnitude: number }>) {
        const displacement = motionVectors.map(v => v.magnitude);
        const velocity = displacement.map((d, i) => i > 0 ? d - displacement[i - 1] : 0);
        const acceleration = velocity.map((v, i) => i > 0 ? v - velocity[i - 1] : 0);
        
        // Calculate strain (simplified)
        const strain = displacement.map(d => d / 100); // Normalize
        const strainRate = strain.map((s, i) => i > 0 ? s - strain[i - 1] : 0);
        
        // Calculate cardiac-specific metrics if applicable
        let ejectionFraction, wallMotionScore;
        if (displacement.length > 0) {
          const maxDisplacement = Math.max(...displacement);
          const minDisplacement = Math.min(...displacement);
          ejectionFraction = (maxDisplacement - minDisplacement) / maxDisplacement;
          wallMotionScore = displacement.reduce((sum, d) => sum + d, 0) / displacement.length;
        }
        
        return {
          displacement,
          velocity,
          acceleration,
          strain,
          strainRate,
          ejectionFraction,
          wallMotionScore
        };
      }
    }

    console.log('Registering TemporalMotionAnalysisTool:', TemporalMotionAnalysisTool);
    // cornerstoneTools.addTool(TemporalMotionAnalysisTool); // TODO: Update for Cornerstone3D
  }

  private registerPerfusionAnalysisTool(): void {
    // TODO: Update for Cornerstone3D
    // const PerfusionAnalysisTool = cornerstoneTools.importInternal('base/BaseTool');
    
    const TemporalPerfusionAnalysisTool = class {
      constructor(_props = {}) {
        // TODO: Update constructor for Cornerstone3D
        // const defaultProps = { name: 'TemporalPerfusionAnalysis', supportedInteractionTypes: ['Mouse', 'Touch'] };
        // super(props, defaultProps);
      }

      async analyzePerfusion(regionData: Record<string, unknown>, temporalSeries: TemporalSeries, _element: HTMLElement) {
        const timeIntensityCurve = await this.calculateTimeIntensityCurve(regionData, temporalSeries);
        const perfusionMetrics = this.calculatePerfusionMetrics(timeIntensityCurve);
        
        return {
          type: 'perfusion',
          perfusionMetrics
        };
      }

      async calculateTimeIntensityCurve(_regionData: Record<string, unknown>, _temporalSeries: TemporalSeries) {
        // Reuse time-intensity calculation from TimeIntensityTool
        // Note: Tool access needs to be updated for Cornerstone3D
        // const timeIntensityTool = cornerstoneTools.getToolForElement(this.element, 'TemporalTimeIntensity');
        // if (timeIntensityTool) {
        //   return await timeIntensityTool.calculateTimeIntensityCurve(regionData, temporalSeries);
        // }
        return { timePoints: [], intensityValues: [] };
      }

      calculatePerfusionMetrics(curve: { timePoints: number[], intensityValues: number[] }) {
        const { timePoints, intensityValues } = curve;
        
        if (timePoints.length === 0) {
          return {
            bloodFlow: 0,
            bloodVolume: 0,
            meanTransitTime: 0,
            timeToMaximum: 0,
            maximumSlope: 0
          };
        }
        
        // Calculate blood flow (simplified)
        const maxIntensity = Math.max(...intensityValues);
        const baseline = intensityValues.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const bloodFlow = (maxIntensity - baseline) * 60; // mL/100g/min
        
        // Calculate blood volume (area under curve)
        let bloodVolume = 0;
        for (let i = 1; i < timePoints.length; i++) {
          const dt = timePoints[i] - timePoints[i - 1];
          const avgIntensity = (intensityValues[i] + intensityValues[i - 1]) / 2;
          bloodVolume += (avgIntensity - baseline) * dt;
        }
        
        // Calculate mean transit time
        const meanTransitTime = bloodVolume / bloodFlow;
        
        // Find time to maximum
        const maxIndex = intensityValues.indexOf(maxIntensity);
        const timeToMaximum = timePoints[maxIndex];
        
        // Calculate maximum slope
        let maximumSlope = 0;
        for (let i = 1; i < intensityValues.length; i++) {
          const slope = (intensityValues[i] - intensityValues[i - 1]) / (timePoints[i] - timePoints[i - 1]);
          maximumSlope = Math.max(maximumSlope, slope);
        }
        
        return {
          bloodFlow,
          bloodVolume,
          meanTransitTime,
          timeToMaximum,
          maximumSlope
        };
      }
    }

    console.log('Registering TemporalPerfusionAnalysisTool:', TemporalPerfusionAnalysisTool);
    // cornerstoneTools.addTool(TemporalPerfusionAnalysisTool); // TODO: Update for Cornerstone3D
  }

  private registerCardiacAnalysisTool(): void {
    // TODO: Update for Cornerstone3D
    // const CardiacAnalysisTool = cornerstoneTools.importInternal('base/BaseTool');
    
    const TemporalCardiacAnalysisTool = class {
      constructor(_props = {}) {
        // TODO: Update constructor for Cornerstone3D
        // const defaultProps = { name: 'TemporalCardiacAnalysis', supportedInteractionTypes: ['Mouse', 'Touch'] };
        // super(props, defaultProps);
      }

      async analyzeCardiacFunction(regionData: Record<string, unknown>, temporalSeries: TemporalSeries, _element: HTMLElement) {
        const cardiacCycle = await this.detectCardiacCycle(temporalSeries);
        const functionalMetrics = this.calculateCardiacMetrics(cardiacCycle, regionData);
        
        return {
          type: 'cardiac',
          cardiacAnalysis: functionalMetrics
        };
      }

      async detectCardiacCycle(temporalSeries: TemporalSeries) {
        // Detect cardiac phases based on temporal data
        const phases: Array<{ frame: number, phase: 'systole' | 'diastole', confidence: number }> = [];
        
        // Simplified cardiac cycle detection
        temporalSeries.frames.forEach((frame, index) => {
          const cardiacPhase = frame.cardiacPhase;
          const phase: 'systole' | 'diastole' = (cardiacPhase === 'systole' || cardiacPhase === 'diastole') 
            ? cardiacPhase 
            : (index % 2 === 0 ? 'systole' : 'diastole');
          phases.push({ frame: index, phase, confidence: 0.8 });
        });
        
        return phases;
      }

      calculateCardiacMetrics(cardiacCycle: Record<string, unknown>[], _regionData: Record<string, unknown>) {
        // Calculate cardiac-specific metrics
        const systolicFrames = cardiacCycle.filter(c => c.phase === 'systole');
        const diastolicFrames = cardiacCycle.filter(c => c.phase === 'diastole');
        
        // Simplified ejection fraction calculation
        const ejectionFraction = systolicFrames.length > 0 && diastolicFrames.length > 0 
          ? (diastolicFrames.length - systolicFrames.length) / diastolicFrames.length 
          : 0;
        
        return {
          ejectionFraction,
          heartRate: 60, // Placeholder
          strokeVolume: 70, // Placeholder
          cardiacOutput: 5.0, // Placeholder
          wallMotionScore: 1.0 // Placeholder
        };
      }
    }

    console.log('Registering TemporalCardiacAnalysisTool:', TemporalCardiacAnalysisTool);
    // cornerstoneTools.addTool(TemporalCardiacAnalysisTool); // TODO: Update for Cornerstone3D
  }

  private registerRespiratoryGatingTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const RespiratoryGatingTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    const TemporalRespiratoryGatingTool = class { // extends RespiratoryGatingTool {
      constructor(_props = {}) {
        // TODO: Update constructor for Cornerstone3D
        // const defaultProps = { name: 'TemporalRespiratoryGating', supportedInteractionTypes: ['Mouse', 'Touch'] };
        // super(props, defaultProps);
      }

      async analyzeRespiratoryMotion(temporalSeries: TemporalSeries, _element: HTMLElement) {
        const respiratoryPhases = await this.detectRespiratoryPhases(temporalSeries);
        const gatedFrames = this.performRespiratoryGating(temporalSeries, respiratoryPhases);
        
        return {
          type: 'respiratory',
          respiratoryAnalysis: {
            phases: respiratoryPhases,
            gatedFrames
          }
        };
      }

      async detectRespiratoryPhases(temporalSeries: TemporalSeries) {
        // Detect respiratory phases based on temporal data
        const phases: Array<{ frame: number, phase: 'inspiration' | 'expiration', confidence: number }> = [];
        
        // Simplified respiratory phase detection
        temporalSeries.frames.forEach((frame, index) => {
          const respiratoryPhase = frame.respiratoryPhase;
          const phase: 'inspiration' | 'expiration' = (respiratoryPhase === 'inspiration' || respiratoryPhase === 'expiration') 
            ? respiratoryPhase 
            : (Math.sin(index * 0.1) > 0 ? 'inspiration' : 'expiration');
          phases.push({ frame: index, phase, confidence: 0.7 });
        });
        
        return phases;
      }

      performRespiratoryGating(_temporalSeries: TemporalSeries, phases: Record<string, unknown>[]) {
        // Group frames by respiratory phase
        const inspirationFrames = phases.filter(p => p.phase === 'inspiration').map(p => p.frame);
        const expirationFrames = phases.filter(p => p.phase === 'expiration').map(p => p.frame);
        
        return {
          inspiration: inspirationFrames,
          expiration: expirationFrames
        };
      }
    }

    console.log('Registering TemporalRespiratoryGatingTool:', TemporalRespiratoryGatingTool);
    // cornerstoneTools.addTool(TemporalRespiratoryGatingTool); // TODO: Update for Cornerstone3D
  }

  private setupEventHandlers(): void {
    if (!this.activeElement) return;

    // Listen for measurement events to trigger temporal analysis
    this.activeElement.addEventListener('cornerstonemeasurementadded', this.handleMeasurementAdded.bind(this));
    this.activeElement.addEventListener('cornerstonemeasurementmodified', this.handleMeasurementModified.bind(this));
    this.activeElement.addEventListener('cornerstoneimagerendered', this.handleImageRendered.bind(this));
  }

  private removeEventHandlers(): void {
    if (!this.activeElement) return;

    this.activeElement.removeEventListener('cornerstonemeasurementadded', this.handleMeasurementAdded.bind(this));
    this.activeElement.removeEventListener('cornerstonemeasurementmodified', this.handleMeasurementModified.bind(this));
    this.activeElement.removeEventListener('cornerstoneimagerendered', this.handleImageRendered.bind(this));
  }

  private handleMeasurementAdded(event: Event): void {
    const measurementData = (event as CustomEvent).detail;
    this.performTemporalAnalysis(measurementData);
  }

  private handleMeasurementModified(event: Event): void {
    const measurementData = (event as CustomEvent).detail;
    this.performTemporalAnalysis(measurementData);
  }

  private handleImageRendered(event: Event): void {
    // Update temporal display if needed
    this.emit('imageRendered', (event as CustomEvent).detail);
  }

  private handleWorkerResult(type: string, result: unknown): void {
    this.emit('workerResult', { type, result });
  }

  private async performTemporalAnalysis(measurementData: Record<string, unknown>): Promise<void> {
    if (!this.activeElement) return;

    const analysisId = uuidv4();
    const currentSeries = this.getCurrentTemporalSeries();
    
    if (!currentSeries) {
      console.warn('No temporal series available for analysis');
      return;
    }

    try {
      const results: Partial<TemporalAnalysisResult> = {
        id: analysisId,
        seriesId: currentSeries.id,
        analysisType: 'temporal',
        timestamp: new Date(),
        roi: this.extractROIInfo(measurementData) as { coordinates: number[][]; area: number; centroid: [number, number]; }
      };

      // Perform different types of temporal analysis
      if (this.config.enablePerfusionAnalysis && currentSeries.seriesType === 'perfusion') {
        // Note: Tool access needs to be updated for Cornerstone3D
        // const perfusionTool = cornerstoneTools.getToolForElement(this.activeElement, 'TemporalPerfusionAnalysis');
        // if (perfusionTool) {
        //   const perfusionResult = await perfusionTool.analyzePerfusion(measurementData, currentSeries, this.activeElement);
        //   results.perfusionMetrics = perfusionResult.perfusionMetrics;
        // }
      }

      if (this.config.enableMotionDetection) {
        // const motionTool = cornerstoneTools.getToolForElement(this.activeElement, 'TemporalMotionAnalysis');
        // if (motionTool) {
        //   const motionResult = await motionTool.analyzeMotion(measurementData, currentSeries, this.activeElement);
        //   results.motionAnalysis = motionResult.motionAnalysis;
        // }
      }

      if (this.config.enableCardiacAnalysis && currentSeries.seriesType === 'cardiac') {
        // const cardiacTool = cornerstoneTools.getToolForElement(this.activeElement, 'TemporalCardiacAnalysis');
        // if (cardiacTool) {
        //   const cardiacResult = await cardiacTool.analyzeCardiacFunction(measurementData, currentSeries, this.activeElement);
        //   results.motionAnalysis = { ...results.motionAnalysis, ...cardiacResult.cardiacAnalysis };
        // }
      }

      // Always perform time-intensity analysis
      // const timeIntensityTool = cornerstoneTools.getToolForElement(this.activeElement, 'TemporalTimeIntensity');
      // if (timeIntensityTool) {
      //   const timeIntensityResult = await timeIntensityTool.analyzeTimeIntensity(measurementData, currentSeries, this.activeElement);
      //   results.timeIntensityCurve = timeIntensityResult.timeIntensityCurve;
      // }

      // Calculate basic statistics
      results.statistics = this.calculateBasicStatistics(results);

      // Store results
      const seriesResults = this.analysisResults.get(currentSeries.id) || [];
      seriesResults.push(results as TemporalAnalysisResult);
      this.analysisResults.set(currentSeries.id, seriesResults);

      // Emit analysis complete event
      this.emit('temporalAnalysisComplete', results);

    } catch (error) {
      console.error('Error performing temporal analysis:', error);
      this.emit('temporalAnalysisError', { analysisId, error });
    }
  }

  private getCurrentTemporalSeries(): TemporalSeries | null {
    // Get the currently active temporal series
    // This would be determined based on the current study/series context
    const seriesArray = Array.from(this.temporalSeries.values());
    return seriesArray.length > 0 ? seriesArray[0] : null;
  }

  private extractROIInfo(measurementData: Record<string, unknown>): Record<string, unknown> {
    // Extract region of interest information from measurement data
    const coordinates = ((measurementData.handles as Record<string, unknown>)?.points as Record<string, unknown>[]) || (measurementData.coordinates as Record<string, unknown>[]) || [];
    
    if (coordinates.length === 0) return {} as Record<string, unknown>;
    
    // Calculate area and centroid
    let area = 0;
    let centroidX = 0;
    let centroidY = 0;
    
    coordinates.forEach((point: Record<string, unknown>) => {
      centroidX += (point.x as number) || (point[0] as number);
      centroidY += (point.y as number) || (point[1] as number);
    });
    
    centroidX /= coordinates.length;
    centroidY /= coordinates.length;
    
    // Simplified area calculation
    if (coordinates.length >= 3) {
      area = this.calculatePolygonArea(coordinates);
    }
    
    return {
      coordinates,
      area,
      centroid: [centroidX, centroidY]
    };
  }

  private calculatePolygonArea(coordinates: Record<string, unknown>[]): number {
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = (coordinates[i].x as number) || (coordinates[i][0] as number);
      const yi = (coordinates[i].y as number) || (coordinates[i][1] as number);
      const xj = (coordinates[j].x as number) || (coordinates[j][0] as number);
      const yj = (coordinates[j].y as number) || (coordinates[j][1] as number);
      
      area += xi * yj - xj * yi;
    }
    
    return Math.abs(area) / 2;
  }

  private calculateBasicStatistics(results: Partial<TemporalAnalysisResult>): any {
    // Calculate basic statistics from the analysis results
    const values: number[] = [];
    
    if (results.timeIntensityCurve) {
      values.push(...results.timeIntensityCurve.intensityValues);
    }
    
    if (results.motionAnalysis) {
      values.push(...results.motionAnalysis.displacement);
    }
    
    if (values.length === 0) {
      return {
        mean: 0,
        std: 0,
        min: 0,
        max: 0,
        range: 0,
        coefficient_of_variation: 0
      };
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const coefficient_of_variation = mean !== 0 ? std / mean : 0;
    
    return {
      mean,
      std,
      min,
      max,
      range,
      coefficient_of_variation
    };
  }

  // Playback control methods
  public startPlayback(): void {
    if (this.isPlaying) return;
    
    const currentSeries = this.getCurrentTemporalSeries();
    if (!currentSeries || currentSeries.frames.length <= 1) {
      console.warn('Cannot start playback: insufficient frames');
      return;
    }
    
    this.isPlaying = true;
    const frameInterval = 1000 / (currentSeries.frameRate * this.config.playbackSpeed);
    
    this.playbackTimer = setInterval(() => {
      this.nextFrame();
    }, frameInterval);
    
    this.emit('playbackStarted', { seriesId: currentSeries.id });
  }

  public stopPlayback(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
    
    this.emit('playbackStopped', {});
  }

  public pausePlayback(): void {
    this.stopPlayback();
    this.emit('playbackPaused', {});
  }

  public nextFrame(): void {
    const currentSeries = this.getCurrentTemporalSeries();
    if (!currentSeries) return;
    
    switch (this.config.loopMode) {
      case 'forward':
        this.currentFrame = (this.currentFrame + 1) % currentSeries.frames.length;
        break;
      case 'backward':
        this.currentFrame = this.currentFrame > 0 ? this.currentFrame - 1 : currentSeries.frames.length - 1;
        break;
      case 'ping-pong':
        // Implement ping-pong logic
        this.currentFrame = (this.currentFrame + 1) % currentSeries.frames.length;
        break;
      case 'none':
        if (this.currentFrame >= currentSeries.frames.length - 1) {
          this.stopPlayback();
          return;
        }
        this.currentFrame++;
        break;
    }
    
    this.displayFrame(this.currentFrame);
  }

  public previousFrame(): void {
    const currentSeries = this.getCurrentTemporalSeries();
    if (!currentSeries) return;
    
    this.currentFrame = this.currentFrame > 0 ? this.currentFrame - 1 : currentSeries.frames.length - 1;
    this.displayFrame(this.currentFrame);
  }

  public goToFrame(frameNumber: number): void {
    const currentSeries = this.getCurrentTemporalSeries();
    if (!currentSeries || frameNumber < 0 || frameNumber >= currentSeries.frames.length) return;
    
    this.currentFrame = frameNumber;
    this.displayFrame(this.currentFrame);
  }

  private async displayFrame(frameNumber: number): Promise<void> {
    const currentSeries = this.getCurrentTemporalSeries();
    if (!currentSeries || !this.activeElement) return;
    
    const frame = currentSeries.frames[frameNumber];
    if (!frame) return;
    
    try {
      // TODO: Load and display image with Cornerstone3D
      // await imageLoader.loadAndCacheImage(frame.imageId);
      // Note: displayImage functionality needs to be implemented with Cornerstone3D viewport
      // this.renderingEngine.getViewport(this.viewportId).setImageIdIndex(frameIndex);
      
      this.emit('frameChanged', {
        frameNumber,
        frame,
        seriesId: currentSeries.id
      });
    } catch (error) {
      console.error('Error displaying frame:', error);
    }
  }

  // Series management methods
  public addTemporalSeries(series: TemporalSeries): void {
    this.temporalSeries.set(series.id, series);
    this.emit('seriesAdded', series);
  }

  public removeTemporalSeries(seriesId: string): void {
    this.temporalSeries.delete(seriesId);
    this.analysisResults.delete(seriesId);
    this.emit('seriesRemoved', { seriesId });
  }

  public getTemporalSeries(seriesId: string): TemporalSeries | undefined {
    return this.temporalSeries.get(seriesId);
  }

  public getAllTemporalSeries(): TemporalSeries[] {
    return Array.from(this.temporalSeries.values());
  }

  // Analysis results methods
  public getAnalysisResults(seriesId: string): TemporalAnalysisResult[] {
    return this.analysisResults.get(seriesId) || [];
  }

  public getAllAnalysisResults(): Map<string, TemporalAnalysisResult[]> {
    return new Map(this.analysisResults);
  }

  public clearAnalysisResults(seriesId?: string): void {
    if (seriesId) {
      this.analysisResults.delete(seriesId);
    } else {
      this.analysisResults.clear();
    }
    this.emit('analysisResultsCleared', { seriesId });
  }

  // Export methods
  public async exportTemporalAnalysis(seriesId: string, format: 'json' | 'csv' | 'excel' = 'json'): Promise<string> {
    const results = this.getAnalysisResults(seriesId);
    const series = this.getTemporalSeries(seriesId);
    
    if (!results || !series) {
      throw new Error('No analysis results or series found');
    }
    
    const exportData = {
      series: {
        id: series.id,
        name: series.name,
        description: series.description,
        seriesType: series.seriesType,
        frameCount: series.frames.length,
        frameRate: series.frameRate,
        duration: series.duration
      },
      analysisResults: results,
      exportTimestamp: new Date().toISOString(),
      exportFormat: format
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.exportToCSV(results);
      case 'excel':
        return this.exportToExcel(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCSV(results: TemporalAnalysisResult[]): string {
    const headers = [
      'ID', 'Timestamp', 'Analysis Type', 'ROI Area', 
      'Mean Intensity', 'Peak Time', 'Peak Intensity', 
      'Wash In Rate', 'Wash Out Rate', 'AUC'
    ];
    
    const rows = results.map(result => [
      result.id,
      result.timestamp.toISOString(),
      result.analysisType,
      result.roi?.area?.toFixed(2) || 'N/A',
      result.statistics?.mean?.toFixed(3) || 'N/A',
      result.timeIntensityCurve?.peakTime?.toFixed(2) || 'N/A',
      result.timeIntensityCurve?.peakIntensity?.toFixed(3) || 'N/A',
      result.timeIntensityCurve?.washInRate?.toFixed(3) || 'N/A',
      result.timeIntensityCurve?.washOutRate?.toFixed(3) || 'N/A',
      result.timeIntensityCurve?.areaUnderCurve?.toFixed(3) || 'N/A'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToExcel(data: unknown): string {
    // Simplified Excel export - in practice, would use a library like xlsx
    return JSON.stringify(data, null, 2);
  }

  public async exportCineLoop(seriesId: string, _options: {
    format: 'mp4' | 'gif' | 'avi';
    quality: 'low' | 'medium' | 'high' | 'lossless';
    frameRate?: number;
    startFrame?: number;
    endFrame?: number;
  }): Promise<Blob> {
    const series = this.getTemporalSeries(seriesId);
    if (!series) {
      throw new Error('Series not found');
    }
    
    // This would integrate with a video encoding library
    // For now, return a placeholder blob
    const placeholder = new Blob(['Cine loop export placeholder'], { type: 'video/mp4' });
    return placeholder;
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<TemporalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): TemporalConfig {
    return { ...this.config };
  }

  // Event system
  public on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// React component for temporal imaging UI
export const TemporalImagingUI: React.FC<{
  temporalTools: TemporalImagingTools;
  onAnalysisComplete?: (result: TemporalAnalysisResult) => void;
}> = ({ temporalTools, onAnalysisComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopMode, setLoopMode] = useState<'none' | 'forward' | 'backward' | 'ping-pong'>('forward');
  const [currentSeries] = useState<TemporalSeries | null>(null);
  const [analysisResults, setAnalysisResults] = useState<TemporalAnalysisResult[]>([]);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  useEffect(() => {
    const handlePlaybackStarted = () => setIsPlaying(true);
    const handlePlaybackStopped = () => setIsPlaying(false);
    const handleFrameChanged = (data: { frameNumber: number }) => setCurrentFrame(data.frameNumber);
    const handleAnalysisComplete = (result: TemporalAnalysisResult) => {
      setAnalysisResults(prev => [...prev, result]);
      onAnalysisComplete?.(result);
    };

    temporalTools.on('playbackStarted', handlePlaybackStarted);
    temporalTools.on('playbackStopped', handlePlaybackStopped);
    temporalTools.on('frameChanged', handleFrameChanged as (...args: unknown[]) => void);
    temporalTools.on('temporalAnalysisComplete', handleAnalysisComplete as (...args: unknown[]) => void);

    return () => {
      temporalTools.off('playbackStarted', handlePlaybackStarted);
      temporalTools.off('playbackStopped', handlePlaybackStopped);
      temporalTools.off('frameChanged', handleFrameChanged as (...args: unknown[]) => void);
      temporalTools.off('temporalAnalysisComplete', handleAnalysisComplete as (...args: unknown[]) => void);
    };
  }, [temporalTools, onAnalysisComplete]);

  const handlePlayPause = () => {
    if (isPlaying) {
      temporalTools.pausePlayback();
    } else {
      temporalTools.startPlayback();
    }
  };

  const handleSpeedChange = (speed: number[]) => {
    const newSpeed = speed[0];
    setPlaybackSpeed(newSpeed);
    temporalTools.updateConfig({ playbackSpeed: newSpeed });
  };

  const handleLoopModeChange = (mode: 'none' | 'forward' | 'backward' | 'ping-pong') => {
    setLoopMode(mode);
    temporalTools.updateConfig({ loopMode: mode });
  };

  const handleFrameSliderChange = (frame: number[]) => {
    const frameNumber = frame[0];
    setCurrentFrame(frameNumber);
    temporalTools.goToFrame(frameNumber);
  };

  const exportAnalysis = async () => {
    if (!currentSeries) return;
    
    try {
      const csvData = await temporalTools.exportTemporalAnalysis(currentSeries.id, 'csv');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `temporal_analysis_${currentSeries.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting analysis:', error);
    }
  };

  const totalFrames = currentSeries?.frames.length || 0;

  return (
    <div className="temporal-imaging-ui space-y-4">
      {/* Playback Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            4D Temporal Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main playback controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => temporalTools.previousFrame()}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => temporalTools.nextFrame()}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Frame slider */}
          {totalFrames > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frame: {currentFrame + 1} / {totalFrames}</span>
                <span>Time: {((currentFrame / (currentSeries?.frameRate || 1)) * 1000).toFixed(0)}ms</span>
              </div>
              <Slider
                value={[currentFrame]}
                onValueChange={handleFrameSliderChange}
                max={totalFrames - 1}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* Speed control */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Playback Speed</span>
              <span>{playbackSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[playbackSpeed]}
              onValueChange={handleSpeedChange}
              max={5.0}
              min={0.1}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Loop mode selection */}
          <div className="flex gap-2">
            {(['none', 'forward', 'backward', 'ping-pong'] as const).map((mode) => (
              <Button
                key={mode}
                variant={loopMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => handleLoopModeChange(mode)}
              >
                {mode === 'none' && 'Once'}
                {mode === 'forward' && 'Loop →'}
                {mode === 'backward' && 'Loop ←'}
                {mode === 'ping-pong' && 'Ping-Pong'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Panel Toggle */}
      <div className="flex gap-2">
        <Button
          variant={showAnalysisPanel ? "default" : "outline"}
          onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Temporal Analysis
        </Button>
        
        {analysisResults.length > 0 && (
          <Button variant="outline" onClick={exportAnalysis}>
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        )}
      </div>

      {/* Analysis Results Panel */}
      {showAnalysisPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Temporal Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysisResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No analysis results yet. Draw a measurement to start temporal analysis.
              </p>
            ) : (
              <div className="space-y-4">
                {analysisResults.map((result, _index) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">
                        {result.analysisType}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {result.timeIntensityCurve && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Peak Time:</span>
                          <span className="ml-2">{result.timeIntensityCurve.peakTime.toFixed(2)}s</span>
                        </div>
                        <div>
                          <span className="font-medium">Peak Intensity:</span>
                          <span className="ml-2">{result.timeIntensityCurve.peakIntensity.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Wash-in Rate:</span>
                          <span className="ml-2">{result.timeIntensityCurve.washInRate.toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="font-medium">Enhancement Ratio:</span>
                          <span className="ml-2">{result.timeIntensityCurve.enhancementRatio.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    {result.motionAnalysis && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Ejection Fraction:</span>
                          <span className="ml-2">{(result.motionAnalysis.ejectionFraction || 0 * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="font-medium">Wall Motion Score:</span>
                          <span className="ml-2">{(result.motionAnalysis.wallMotionScore || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    {result.perfusionMetrics && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Blood Flow:</span>
                          <span className="ml-2">{result.perfusionMetrics.bloodFlow.toFixed(1)} mL/100g/min</span>
                        </div>
                        <div>
                          <span className="font-medium">Mean Transit Time:</span>
                          <span className="ml-2">{result.perfusionMetrics.meanTransitTime.toFixed(2)}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TemporalImagingTools;
