// import React, { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface AdvancedMeasurement {
  id: string;
  type: MeasurementType;
  value: number | number[];
  unit: string;
  coordinates: number[][];
  label?: string;
  description?: string;
  timestamp: Date;
  userId?: string;
  studyId?: string;
  seriesId?: string;
  imageId?: string;
  metadata?: {
    pixelSpacing?: number[];
    sliceThickness?: number;
    windowLevel?: { center: number; width: number };
    patientPosition?: string;
    acquisitionDate?: string;
  };
  aiAssisted?: {
    confidence: number;
    algorithm: string;
    version: string;
    suggestions?: string[];
  };
  quantitativeData?: {
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    area?: number;
    volume?: number;
    histogram?: number[];
    textureFeatures?: { [key: string]: number };
  };
}

export type MeasurementType = 
  | 'distance'
  | 'angle'
  | 'area'
  | 'volume'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'freehand'
  | 'circle'
  | 'arrow'
  | 'annotation'
  | 'suv'
  | 'hounsfield'
  | 'density'
  | 'perfusion'
  | 'diffusion'
  | 'strain'
  | 'velocity'
  | 'flow'
  | 'thickness'
  | 'curvature'
  | 'surface_area'
  | 'centerline'
  | 'vessel_diameter'
  | 'stenosis'
  | 'calcium_score'
  | 'bone_density'
  | 'fat_fraction'
  | 'fiber_tracking';

export interface QuantitativeAnalysisConfig {
  enableTextureAnalysis: boolean;
  enablePerfusionAnalysis: boolean;
  enableDiffusionAnalysis: boolean;
  enableStrainAnalysis: boolean;
  enableVolumetricAnalysis: boolean;
  enableStatisticalAnalysis: boolean;
  enableAIAssistance: boolean;
  autoSaveResults: boolean;
  exportFormat: 'json' | 'csv' | 'dicom-sr' | 'xml';
}

export interface AIAssistanceConfig {
  enableAutoDetection: boolean;
  enableSmartSuggestions: boolean;
  enableQualityAssurance: boolean;
  confidenceThreshold: number;
  modelEndpoint: string;
  apiKey?: string;
}

export class AdvancedMeasurementTools {
  private measurements: Map<string, AdvancedMeasurement> = new Map();
  private activeElement: HTMLElement | null = null;
  private config: QuantitativeAnalysisConfig;
  private aiConfig: AIAssistanceConfig;
  private eventListeners: { [key: string]: ((data?: unknown) => void)[] } = {};
  private isInitialized = false;

  constructor(
    config: Partial<QuantitativeAnalysisConfig> = {},
    aiConfig: Partial<AIAssistanceConfig> = {}
  ) {
    this.config = {
      enableTextureAnalysis: true,
      enablePerfusionAnalysis: true,
      enableDiffusionAnalysis: true,
      enableStrainAnalysis: true,
      enableVolumetricAnalysis: true,
      enableStatisticalAnalysis: true,
      enableAIAssistance: true,
      autoSaveResults: true,
      exportFormat: 'json',
      ...config
    };

    this.aiConfig = {
      enableAutoDetection: true,
      enableSmartSuggestions: true,
      enableQualityAssurance: true,
      confidenceThreshold: 0.8,
      modelEndpoint: '/api/ai/measurements',
      ...aiConfig
    };
  }

  async initialize(element: HTMLElement): Promise<void> {
    if (this.isInitialized) return;

    this.activeElement = element;

    try {
      // Initialize advanced measurement tools
      this.setupAdvancedTools();
      this.setupEventHandlers();
      
      if (this.config.enableAIAssistance) {
        await this.initializeAIAssistance();
      }

      this.isInitialized = true;
      console.log('✅ Advanced Measurement Tools initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Measurement Tools:', error);
      throw error;
    }
  }

  private setupAdvancedTools(): void {
    // Register custom measurement tools
    this.registerVolumetricMeasurementTool();
    this.registerPerfusionAnalysisTool();
    this.registerTextureAnalysisTool();
    this.registerVesselAnalysisTool();
    this.registerBoneAnalysisTool();
    this.registerCardiacAnalysisTool();
    this.registerNeurologyAnalysisTool();
  }

  private registerVolumetricMeasurementTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const VolumetricTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class AdvancedVolumetricTool { // extends VolumetricTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'AdvancedVolumetric',
    //     //   supportedInteractionTypes: ['Mouse', 'Touch'],
    //     //   configuration: {
    //     //     interpolation: 'linear',
    //     //     smoothing: true,
    //     //     autoCalculate: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }
    //
    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     const element = eventData.element;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
    //     
    //     // Add volumetric calculation logic
    //     this.calculateVolume(measurementData, element);
    //     
    //     return measurementData;
    //   }
    //
    //   calculateVolume(measurementData: any, _element?: any) {
    //     // Implement advanced volumetric calculation
    //     // TODO: Update to Cornerstone3D viewport API
    //     // const enabledElement = cornerstone.getEnabledElement(element);
    //     // const image = enabledElement.image;
    //     const image: any = null; // Placeholder until Cornerstone3D migration
    //     
    //     if (image && measurementData.handles) {
    //       // TODO: Update for Cornerstone3D image properties
    //       const pixelSpacing = (image as any)?.rowPixelSpacing || 1;
    //       const sliceThickness = (image as any)?.sliceThickness || 1;
    //       
    //       // Calculate volume based on measurement type
    //       const volume = this.computeVolumeFromHandles(
    //         measurementData.handles,
    //         pixelSpacing,
    //         sliceThickness
    //       );
    //       
    //       measurementData.volume = volume;
    //       measurementData.unit = 'mm³';
    //     }
    //   }
    //
    //   computeVolumeFromHandles(handles: any, pixelSpacing: number, sliceThickness: number): number {
    //     // Implement volume calculation algorithm
    //     // This is a simplified example - real implementation would be more complex
    //     if (handles.start && handles.end) {
    //       const dx = (handles.end.x - handles.start.x) * pixelSpacing;
    //       const dy = (handles.end.y - handles.start.y) * pixelSpacing;
    //       const area = Math.PI * dx * dy / 4; // Ellipse area approximation
    //       return area * sliceThickness;
    //     }
    //     return 0;
    //   }
    // }

    // cornerstoneTools.addTool(AdvancedVolumetricTool); // TODO: Update for Cornerstone3D
  }

  private registerPerfusionAnalysisTool(): void {
    // TODO: Update for Cornerstone3D
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // class PerfusionAnalysisTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'PerfusionAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     timePoints: 50,
    //     //     contrastArrivalTime: 10,
    //     //     analysisMethod: 'deconvolution'
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add perfusion analysis
    //     this.analyzePerfusion(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzePerfusion(measurementData: any, _element: HTMLElement) {
    //     // Implement perfusion analysis algorithms
    //     const perfusionData = {
    //       bloodFlow: 0,
    //       bloodVolume: 0,
    //       meanTransitTime: 0,
    //       timeToMax: 0,
    //       peakEnhancement: 0
    //     };
        
    //     measurementData.perfusionData = perfusionData;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(PerfusionAnalysisTool);
  }

  private registerTextureAnalysisTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class TextureAnalysisTool { // extends BaseTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'TextureAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     glcmDistance: 1,
    //     //     glcmAngles: [0, 45, 90, 135],
    //     //     enableHaralick: true,
    //     //     enableLBP: true,
    //     //     enableGLRLM: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add texture analysis
    //     this.analyzeTexture(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzeTexture(measurementData: any, _element: HTMLElement) {
    //     // Implement texture analysis algorithms
    //     const textureFeatures = {
    //       contrast: 0,
    //       correlation: 0,
    //       energy: 0,
    //       homogeneity: 0,
    //       entropy: 0,
    //       variance: 0,
    //       sumMean: 0,
    //       sumVariance: 0,
    //       sumEntropy: 0,
    //       differenceVariance: 0,
    //       differenceEntropy: 0,
    //       informationMeasure1: 0,
    //       informationMeasure2: 0
    //     };
        
    //     measurementData.textureFeatures = textureFeatures;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(TextureAnalysisTool);
  }

  private registerVesselAnalysisTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class VesselAnalysisTool { // extends BaseTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'VesselAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     enableCenterlineExtraction: true,
    //     //     enableDiameterMeasurement: true,
    //     //     enableStenosisDetection: true,
    //     //     enableTortuosityAnalysis: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add vessel analysis
    //     this.analyzeVessel(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzeVessel(measurementData: any, _element: HTMLElement) {
    //     // Implement vessel analysis algorithms
    //     const vesselData = {
    //       diameter: 0,
    //       crossSectionalArea: 0,
    //       stenosis: 0,
    //       tortuosity: 0,
    //       centerline: [],
    //       wallThickness: 0,
    //       plaqueBurden: 0
    //     };
        
    //     measurementData.vesselData = vesselData;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(VesselAnalysisTool);
  }

  private registerBoneAnalysisTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class BoneAnalysisTool { // extends BaseTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'BoneAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     enableDensityMeasurement: true,
    //     //     enableCorticalThickness: true,
    //     //     enableTrabecularAnalysis: true,
    //     //     enableFractureDetection: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add bone analysis
    //     this.analyzeBone(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzeBone(measurementData: any, _element: HTMLElement) {
    //     // Implement bone analysis algorithms
    //     const boneData = {
    //       boneDensity: 0,
    //       corticalThickness: 0,
    //       trabecularSpacing: 0,
    //       trabecularThickness: 0,
    //       boneVolumeFraction: 0,
    //       structureModelIndex: 0,
    //       connectivityDensity: 0
    //     };
        
    //     measurementData.boneData = boneData;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(BoneAnalysisTool);
  }

  private registerCardiacAnalysisTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class CardiacAnalysisTool { // extends BaseTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'CardiacAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     enableEjectionFraction: true,
    //     //     enableWallMotion: true,
    //     //     enableStrainAnalysis: true,
    //     //     enablePerfusionAnalysis: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add cardiac analysis
    //     this.analyzeCardiac(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzeCardiac(measurementData: any, _element: HTMLElement) {
    //     // Implement cardiac analysis algorithms
    //     const cardiacData = {
    //       ejectionFraction: 0,
    //       strokeVolume: 0,
    //       cardiacOutput: 0,
    //       wallThickness: 0,
    //       wallMotion: 'normal',
    //       strain: {
    //         longitudinal: 0,
    //         circumferential: 0,
    //         radial: 0
    //       },
    //       perfusion: {
    //         restFlow: 0,
    //         stressFlow: 0,
    //         reserve: 0
    //       }
    //     };
        
    //     measurementData.cardiacData = cardiacData;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(CardiacAnalysisTool);
  }

  private registerNeurologyAnalysisTool(): void {
    // TODO: Update to Cornerstone3D tool registration
    // const BaseTool = cornerstoneTools.importInternal('base/BaseTool');
    
    // TODO: Update class to extend proper Cornerstone3D base tool
    // class NeurologyAnalysisTool { // extends BaseTool {
    //   constructor() {
    //     // TODO: Update constructor for Cornerstone3D
    //     // const defaultProps = {
    //     //   name: 'NeurologyAnalysis',
    //     //   supportedInteractionTypes: ['Mouse'],
    //     //   configuration: {
    //     //     enableVolumetry: true,
    //     //     enableDTI: true,
    //     //     enablefMRI: true,
    //     //     enablePerfusion: true
    //     //   }
    //     // };
    //     // super({ ...defaultProps, ...props });
    //   }

    //   addNewMeasurement(evt: any) {
    //     const eventData = evt.detail;
    //     // TODO: Update for Cornerstone3D
    //     // const measurementData = this.createMeasurementData(eventData);
    //     const measurementData = { id: 'temp', data: eventData };
        
    //     // Add neurology analysis
    //     this.analyzeNeurology(measurementData, eventData.element);
        
    //     return measurementData;
    //   }

    //   analyzeNeurology(measurementData: any, _element: HTMLElement) {
    //     // Implement neurology analysis algorithms
    //     const neurologyData = {
    //       brainVolume: 0,
    //       ventricularVolume: 0,
    //       corticalThickness: 0,
    //       whiteMatteIntegrity: 0,
    //       functionalConnectivity: 0,
    //       perfusion: {
    //         cbf: 0, // Cerebral Blood Flow
    //         cbv: 0, // Cerebral Blood Volume
    //         mtt: 0  // Mean Transit Time
    //       },
    //       diffusion: {
    //         fa: 0,  // Fractional Anisotropy
    //         md: 0,  // Mean Diffusivity
    //         ad: 0,  // Axial Diffusivity
    //         rd: 0   // Radial Diffusivity
    //       }
    //     };
        
    //     measurementData.neurologyData = neurologyData;
    //   }
    // }

    // TODO: Update to Cornerstone3D tool registration
    // cornerstoneTools.addTool(NeurologyAnalysisTool);
  }

  private setupEventHandlers(): void {
    if (!this.activeElement) return;

    // Listen for measurement events
    this.activeElement.addEventListener('cornerstonetoolsmeasurementadded', (evt: Event) => {
      this.handleMeasurementAdded(evt);
    });

    this.activeElement.addEventListener('cornerstonetoolsmeasurementmodified', (evt: Event) => {
      this.handleMeasurementModified(evt);
    });

    this.activeElement.addEventListener('cornerstonetoolsmeasurementremoved', (evt: Event) => {
      this.handleMeasurementRemoved(evt);
    });
  }

  private async initializeAIAssistance(): Promise<void> {
    if (!this.aiConfig.enableAutoDetection) return;

    try {
      // Initialize AI models for measurement assistance
      console.log('🤖 Initializing AI assistance for measurements...');
      
      // This would typically load AI models or connect to AI services
      // For now, we'll simulate the initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ AI assistance initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI assistance:', error);
    }
  }

  private handleMeasurementAdded(evt: Event): void {
    const measurementData = (evt as CustomEvent).detail.measurementData;
    const measurement = this.createAdvancedMeasurement(measurementData);
    
    this.measurements.set(measurement.id, measurement);
    
    if (this.config.enableAIAssistance) {
      this.enhanceWithAI(measurement);
    }
    
    if (this.config.autoSaveResults) {
      this.saveMeasurement(measurement);
    }
    
    this.emit('measurementAdded', measurement);
  }

  private handleMeasurementModified(evt: Event): void {
    const measurementData = (evt as CustomEvent).detail.measurementData;
    const existingMeasurement = this.findMeasurementByData(measurementData);
    
    if (existingMeasurement) {
      const updatedMeasurement = this.updateAdvancedMeasurement(existingMeasurement, measurementData);
      this.measurements.set(updatedMeasurement.id, updatedMeasurement);
      
      if (this.config.autoSaveResults) {
        this.saveMeasurement(updatedMeasurement);
      }
      
      this.emit('measurementModified', updatedMeasurement);
    }
  }

  private handleMeasurementRemoved(evt: Event): void {
    const measurementData = (evt as CustomEvent).detail.measurementData;
    const measurement = this.findMeasurementByData(measurementData);
    
    if (measurement) {
      this.measurements.delete(measurement.id);
      this.emit('measurementRemoved', measurement);
    }
  }

  private createAdvancedMeasurement(measurementData: Record<string, unknown>): AdvancedMeasurement {
    const measurement: AdvancedMeasurement = {
      id: uuidv4(),
      type: this.determineMeasurementType(measurementData),
      value: this.extractMeasurementValue(measurementData),
      unit: this.determineMeasurementUnit(measurementData),
      coordinates: this.extractCoordinates(measurementData),
      timestamp: new Date(),
      metadata: this.extractMetadata(measurementData)
    };

    // Add quantitative analysis if enabled
    if (this.config.enableStatisticalAnalysis) {
      measurement.quantitativeData = this.performQuantitativeAnalysis(measurementData);
    }

    return measurement;
  }

  private updateAdvancedMeasurement(existing: AdvancedMeasurement, measurementData: Record<string, unknown>): AdvancedMeasurement {
    return {
      ...existing,
      value: this.extractMeasurementValue(measurementData),
      coordinates: this.extractCoordinates(measurementData),
      timestamp: new Date(),
      quantitativeData: this.config.enableStatisticalAnalysis 
        ? this.performQuantitativeAnalysis(measurementData)
        : existing.quantitativeData
    };
  }

  private determineMeasurementType(measurementData: Record<string, unknown>): MeasurementType {
    // Determine measurement type based on tool name and data structure
    const toolName = measurementData.toolType || measurementData.tool;
    
    switch (toolName) {
      case 'Length': return 'distance';
      case 'Angle': return 'angle';
      case 'RectangleRoi': return 'rectangle';
      case 'EllipticalRoi': return 'ellipse';
      case 'FreehandRoi': return 'freehand';
      case 'AdvancedVolumetric': return 'volume';
      case 'PerfusionAnalysis': return 'perfusion';
      case 'TextureAnalysis': return 'density';
      case 'VesselAnalysis': return 'vessel_diameter';
      case 'BoneAnalysis': return 'bone_density';
      case 'CardiacAnalysis': return 'strain';
      case 'NeurologyAnalysis': return 'diffusion';
      default: return 'distance';
    }
  }

  private extractMeasurementValue(measurementData: Record<string, unknown>): number | number[] {
    if (measurementData.length !== undefined && typeof measurementData.length === 'number') {
      return measurementData.length;
    }
    if (measurementData.area !== undefined && typeof measurementData.area === 'number') {
      return measurementData.area;
    }
    if (measurementData.volume !== undefined && typeof measurementData.volume === 'number') {
      return measurementData.volume;
    }
    if (measurementData.angle !== undefined && typeof measurementData.angle === 'number') {
      return measurementData.angle;
    }
    return 0;
  }

  private determineMeasurementUnit(measurementData: Record<string, unknown>): string {
    const type = this.determineMeasurementType(measurementData);
    
    switch (type) {
      case 'distance':
      case 'thickness':
      case 'vessel_diameter':
        return 'mm';
      case 'area':
      case 'surface_area':
        return 'mm²';
      case 'volume':
        return 'mm³';
      case 'angle':
        return 'degrees';
      case 'density':
      case 'hounsfield':
        return 'HU';
      case 'suv':
        return 'g/ml';
      case 'perfusion':
        return 'ml/100g/min';
      case 'diffusion':
        return 'mm²/s';
      case 'strain':
        return '%';
      case 'velocity':
        return 'm/s';
      case 'flow':
        return 'ml/s';
      default:
        return 'units';
    }
  }

  private extractCoordinates(measurementData: Record<string, unknown>): number[][] {
    const coordinates: number[][] = [];
    
    if (measurementData.handles) {
      Object.values(measurementData.handles).forEach((handle: unknown) => {
        if (handle && typeof handle === 'object' && 'x' in handle && 'y' in handle) {
          const typedHandle = handle as { x: number; y: number };
          coordinates.push([typedHandle.x, typedHandle.y]);
        }
      });
    }
    
    return coordinates;
  }

  private extractMetadata(_measurementData: Record<string, unknown>): Record<string, unknown> {
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement!);
    const enabledElement: { image?: Record<string, unknown> } | null = null;
    const image: Record<string, unknown> | null = (enabledElement as { image?: Record<string, unknown> } | null)?.image || null;
    
    return {
      // TODO: Update for Cornerstone3D image properties
      pixelSpacing: image?.rowPixelSpacing ? [image.rowPixelSpacing as number, image.columnPixelSpacing as number] : undefined,
      sliceThickness: image?.sliceThickness as number,
      windowLevel: {
        center: image?.windowCenter || 0,
        width: image?.windowWidth || 0
      },
      patientPosition: image?.patientPosition,
      acquisitionDate: image?.acquisitionDate
    };
  }

  private performQuantitativeAnalysis(measurementData: Record<string, unknown>): Record<string, unknown> {
    // Implement statistical analysis of the measurement region
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement!);
    const enabledElement: { image?: Record<string, unknown> } | null = null;
    const image: Record<string, unknown> | null = (enabledElement as { image?: Record<string, unknown> } | null)?.image || null;
    
    if (!image) return {};
    
    // Extract pixel values from the measurement region
    const pixelValues = this.extractPixelValues(measurementData, image);
    
    if (pixelValues.length === 0) return {};
    
    // Calculate statistics
    const mean = pixelValues.reduce((sum, val) => sum + val, 0) / pixelValues.length;
    const variance = pixelValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixelValues.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...pixelValues);
    const max = Math.max(...pixelValues);
    
    // Calculate histogram
    const histogram = this.calculateHistogram(pixelValues, 256);
    
    return {
      mean,
      std,
      min,
      max,
      histogram,
      pixelCount: pixelValues.length
    };
  }

  private extractPixelValues(measurementData: Record<string, unknown>, image: Record<string, unknown>): number[] {
    // This is a simplified implementation
    // Real implementation would extract pixels based on measurement geometry
    const pixelValues: number[] = [];
    
    if (measurementData.handles && typeof measurementData.handles === 'object') {
      const handles = measurementData.handles as { start?: { x: number; y: number }; end?: { x: number; y: number } };
      if (handles.start && handles.end) {
        const startX = Math.round(handles.start.x);
        const startY = Math.round(handles.start.y);
        const endX = Math.round(handles.end.x);
        const endY = Math.round(handles.end.y);
      
      // TODO: Update for Cornerstone3D image properties
      const imageWithMethods = image as Record<string, unknown> & { getPixelData(): number[] };
      const pixelData = imageWithMethods.getPixelData();
      const width = image.columns as number;
      
      for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
        for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
          if (x >= 0 && x < width && y >= 0 && y < (image.rows as number)) {
            const index = y * width + x;
            if (index < pixelData.length) {
              pixelValues.push(pixelData[index]);
            }
          }
        }
      }
    }
    }
    
    return pixelValues;
  }

  private calculateHistogram(values: number[], bins: number): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      histogram[binIndex]++;
    });
    
    return histogram;
  }

  private async enhanceWithAI(measurement: AdvancedMeasurement): Promise<void> {
    if (!this.aiConfig.enableSmartSuggestions) return;
    
    try {
      // Call AI service for measurement enhancement
      const response = await fetch(this.aiConfig.modelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.aiConfig.apiKey && { 'Authorization': `Bearer ${this.aiConfig.apiKey}` })
        },
        body: JSON.stringify({
          measurement,
          requestType: 'enhance',
          includeQualityAssurance: this.aiConfig.enableQualityAssurance
        })
      });
      
      if (response.ok) {
        const aiResult = await response.json();
        
        measurement.aiAssisted = {
          confidence: aiResult.confidence || 0,
          algorithm: aiResult.algorithm || 'unknown',
          version: aiResult.version || '1.0',
          suggestions: aiResult.suggestions || []
        };
        
        // Apply AI suggestions if confidence is high enough
        if (aiResult.confidence >= this.aiConfig.confidenceThreshold) {
          if (aiResult.correctedValue !== undefined) {
            measurement.value = aiResult.correctedValue;
          }
          if (aiResult.additionalMetrics) {
            measurement.quantitativeData = {
              ...measurement.quantitativeData,
              ...aiResult.additionalMetrics
            };
          }
        }
      }
    } catch (error) {
      console.warn('AI enhancement failed:', error);
    }
  }

  private findMeasurementByData(measurementData: Record<string, unknown>): AdvancedMeasurement | undefined {
    // Find measurement by comparing coordinates or other unique identifiers
    for (const measurement of this.measurements.values()) {
      if (this.compareMeasurementData(measurement, measurementData)) {
        return measurement;
      }
    }
    return undefined;
  }

  private compareMeasurementData(measurement: AdvancedMeasurement, measurementData: Record<string, unknown>): boolean {
    // Simple comparison based on coordinates
    const dataCoords = this.extractCoordinates(measurementData);
    
    if (measurement.coordinates.length !== dataCoords.length) {
      return false;
    }
    
    return measurement.coordinates.every((coord, index) => {
      const dataCoord = dataCoords[index];
      return Math.abs(coord[0] - dataCoord[0]) < 1 && Math.abs(coord[1] - dataCoord[1]) < 1;
    });
  }

  private async saveMeasurement(measurement: AdvancedMeasurement): Promise<void> {
    try {
      // Save to local storage or send to server
      const savedMeasurements = JSON.parse(localStorage.getItem('advancedMeasurements') || '[]');
      savedMeasurements.push(measurement);
      localStorage.setItem('advancedMeasurements', JSON.stringify(savedMeasurements));
    } catch (error) {
      console.error('Failed to save measurement:', error);
    }
  }

  // Public API methods
  public activateTool(toolName: string): void {
    if (!this.activeElement) return;
    
    // TODO: Implement tool activation for Cornerstone3D
    console.log(`Activating tool: ${toolName}`);
    
    // Deactivate all tools first
    // TODO: Update for Cornerstone3D
    // cornerstoneTools.setToolPassive('Length');
    // cornerstoneTools.setToolPassive('Angle');
    // cornerstoneTools.setToolPassive('RectangleRoi');
    // cornerstoneTools.setToolPassive('EllipticalRoi');
    // cornerstoneTools.setToolPassive('FreehandRoi');
    // cornerstoneTools.setToolPassive('AdvancedVolumetric');
    // cornerstoneTools.setToolPassive('PerfusionAnalysis');
    // cornerstoneTools.setToolPassive('TextureAnalysis');
    // cornerstoneTools.setToolPassive('VesselAnalysis');
    // cornerstoneTools.setToolPassive('BoneAnalysis');
    // cornerstoneTools.setToolPassive('CardiacAnalysis');
    // cornerstoneTools.setToolPassive('NeurologyAnalysis');
    
    // Activate the selected tool
    // TODO: Update for Cornerstone3D
    // cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
  }

  public getMeasurements(): AdvancedMeasurement[] {
    return Array.from(this.measurements.values());
  }

  public getMeasurement(id: string): AdvancedMeasurement | undefined {
    return this.measurements.get(id);
  }

  public deleteMeasurement(id: string): boolean {
    const measurement = this.measurements.get(id);
    if (measurement) {
      this.measurements.delete(id);
      this.emit('measurementRemoved', measurement);
      return true;
    }
    return false;
  }

  public addAIMeasurement(aiMeasurement: {
    type: MeasurementType;
    value: number | number[];
    unit: string;
    coordinates: number[][];
    label?: string;
    confidence: number;
    algorithm: string;
  }): AdvancedMeasurement {
    const measurement: AdvancedMeasurement = {
      id: uuidv4(),
      type: aiMeasurement.type,
      value: aiMeasurement.value,
      unit: aiMeasurement.unit,
      coordinates: aiMeasurement.coordinates,
      label: aiMeasurement.label,
      timestamp: new Date(),
      aiAssisted: {
        confidence: aiMeasurement.confidence,
        algorithm: aiMeasurement.algorithm,
        version: '1.0',
        suggestions: []
      }
    };

    this.measurements.set(measurement.id, measurement);
    this.emit('measurementAdded', measurement);
    
    if (this.config.autoSaveResults) {
      this.saveMeasurement(measurement);
    }

    return measurement;
  }

  public exportMeasurements(format: 'json' | 'csv' | 'dicom-sr' | 'xml' = 'json'): string {
    const measurements = this.getMeasurements();
    
    switch (format) {
      case 'json':
        return JSON.stringify(measurements, null, 2);
      case 'csv':
        return this.exportToCSV(measurements);
      case 'xml':
        return this.exportToXML(measurements);
      case 'dicom-sr':
        return this.exportToDICOMSR(measurements);
      default:
        return JSON.stringify(measurements, null, 2);
    }
  }

  private exportToCSV(measurements: AdvancedMeasurement[]): string {
    const headers = ['ID', 'Type', 'Value', 'Unit', 'Timestamp', 'Description'];
    const rows = measurements.map(m => [
      m.id,
      m.type,
      Array.isArray(m.value) ? m.value.join(';') : m.value.toString(),
      m.unit,
      m.timestamp.toISOString(),
      m.description || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(measurements: AdvancedMeasurement[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<measurements>\n';
    
    measurements.forEach(m => {
      xml += `  <measurement id="${m.id}" type="${m.type}" unit="${m.unit}">\n`;
      xml += `    <value>${Array.isArray(m.value) ? m.value.join(',') : m.value}</value>\n`;
      xml += `    <timestamp>${m.timestamp.toISOString()}</timestamp>\n`;
      if (m.description) {
        xml += `    <description>${m.description}</description>\n`;
      }
      xml += '  </measurement>\n';
    });
    
    xml += '</measurements>';
    return xml;
  }

  private exportToDICOMSR(measurements: AdvancedMeasurement[]): string {
    // Simplified DICOM SR export - real implementation would be much more complex
    return JSON.stringify({
      SOPClassUID: '1.2.840.10008.5.1.4.1.1.88.11', // Basic Text SR
      measurements: measurements.map(m => ({
        ConceptNameCodeSequence: {
          CodeValue: m.type,
          CodingSchemeDesignator: 'DCM',
          CodeMeaning: m.type
        },
        MeasuredValueSequence: {
          NumericValue: Array.isArray(m.value) ? m.value[0] : m.value,
          MeasurementUnitsCodeSequence: {
            CodeValue: m.unit,
            CodingSchemeDesignator: 'UCUM'
          }
        }
      }))
    }, null, 2);
  }

  public on(event: string, callback: (data?: unknown) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  public off(event: string, callback: (data?: unknown) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: unknown): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  public setImagingEngine(_engine: object): void {
    console.log('Imaging engine set for Advanced Measurement Tools');
    // Store reference to imaging engine for advanced integration
  }

  public destroy(): void {
    this.measurements.clear();
    this.eventListeners = {};
    this.activeElement = null;
    this.isInitialized = false;
    
    console.log('✅ Advanced Measurement Tools destroyed');
  }
}

export default AdvancedMeasurementTools;
