import React, { useEffect, useState } from 'react';
// TODO: Update for Cornerstone3D
// import * as cornerstone from 'cornerstone-core';
import { v4 as uuidv4 } from 'uuid';

export interface SegmentationMask {
  id: string;
  name: string;
  type: 'manual' | 'semi-automatic' | 'automatic' | 'ai-assisted';
  algorithm?: 'watershed' | 'region-growing' | 'level-set' | 'graph-cut' | 'deep-learning';
  maskData: Uint8Array | Uint16Array;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  metadata: {
    pixelSpacing?: number[];
    sliceThickness?: number;
    orientation?: string;
    studyId?: string;
    seriesId?: string;
    imageId?: string;
  };
  statistics: {
    volume: number;
    surfaceArea: number;
    boundingBox: {
      min: [number, number, number?];
      max: [number, number, number?];
    };
    centroid: [number, number, number?];
    principalAxes?: number[][];
  };
  color: [number, number, number, number]; // RGBA
  opacity: number;
  visible: boolean;
  locked: boolean;
  timestamp: Date;
  userId?: string;
  confidence?: number; // For AI-generated segmentations
  validationStatus?: 'pending' | 'approved' | 'rejected' | 'modified';
}

export interface SegmentationConfig {
  enableManualSegmentation: boolean;
  enableSemiAutomaticSegmentation: boolean;
  enableAutomaticSegmentation: boolean;
  enableAIAssistedSegmentation: boolean;
  enable3DSegmentation: boolean;
  enableMultiLabelSegmentation: boolean;
  maxLabels: number;
  defaultAlgorithm: 'watershed' | 'region-growing' | 'level-set' | 'graph-cut' | 'deep-learning';
  aiModelEndpoint?: string;
  autoSaveSegmentations: boolean;
  enableCollaboration: boolean;
  enableVersioning: boolean;
}

export interface SegmentationTool {
  name: string;
  type: 'manual' | 'semi-automatic' | 'automatic' | 'ai-assisted';
  icon: string;
  description: string;
  parameters: { [key: string]: any };
  execute: (params: any) => Promise<SegmentationMask | null>;
}

export class AdvancedSegmentationTools {
  private segmentations: Map<string, SegmentationMask> = new Map();
  private activeElement: HTMLElement | null = null;
  private config: SegmentationConfig;
  private tools: Map<string, SegmentationTool> = new Map();
  private eventListeners: { [key: string]: Function[] } = {};
  private isInitialized = false;
  private segmentationWorker: Worker | null = null;
  private aiModel: any = null;
  private activeSegmentationId: string | null = null;
  private labelColors: [number, number, number, number][] = [];

  constructor(config: Partial<SegmentationConfig> = {}) {
    this.config = {
      enableManualSegmentation: true,
      enableSemiAutomaticSegmentation: true,
      enableAutomaticSegmentation: true,
      enableAIAssistedSegmentation: true,
      enable3DSegmentation: true,
      enableMultiLabelSegmentation: true,
      maxLabels: 10,
      defaultAlgorithm: 'region-growing',
      autoSaveSegmentations: true,
      enableCollaboration: false,
      enableVersioning: true,
      ...config
    };
    
    this.initializeLabelColors();
  }

  async initialize(element: HTMLElement): Promise<void> {
    if (this.isInitialized) return;

    this.activeElement = element;
    
    try {
      await this.setupSegmentationTools();
      this.setupEventHandlers();
      await this.initializeWorker();
      await this.loadAIModel();
      
      this.isInitialized = true;
      console.log('✅ Advanced Segmentation Tools initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Advanced Segmentation Tools:', error);
      throw error;
    }
  }

  private initializeLabelColors(): void {
    // Initialize predefined colors for different labels
    this.labelColors = [
      [255, 0, 0, 128],     // Red
      [0, 255, 0, 128],     // Green
      [0, 0, 255, 128],     // Blue
      [255, 255, 0, 128],   // Yellow
      [255, 0, 255, 128],   // Magenta
      [0, 255, 255, 128],   // Cyan
      [255, 128, 0, 128],   // Orange
      [128, 0, 255, 128],   // Purple
      [255, 192, 203, 128], // Pink
      [128, 128, 128, 128]  // Gray
    ];
  }

  private async setupSegmentationTools(): Promise<void> {
    // Register manual segmentation tools
    this.registerManualSegmentationTools();
    
    // Register semi-automatic segmentation tools
    this.registerSemiAutomaticTools();
    
    // Register automatic segmentation tools
    this.registerAutomaticTools();
    
    // Register AI-assisted segmentation tools
    this.registerAIAssistedTools();
    
    // Register 3D segmentation tools
    this.register3DTools();
  }

  private registerManualSegmentationTools(): void {
    // Freehand segmentation tool
    this.tools.set('freehand-segmentation', {
      name: 'Freehand Segmentation',
      type: 'manual',
      icon: '✏️',
      description: 'Draw freehand segmentation masks',
      parameters: { brushSize: 5, smoothing: true },
      execute: this.executeFreehandSegmentation.bind(this)
    });

    // Brush segmentation tool
    this.tools.set('brush-segmentation', {
      name: 'Brush Segmentation',
      type: 'manual',
      icon: '🖌️',
      description: 'Paint segmentation masks with brush',
      parameters: { brushSize: 10, hardness: 0.8 },
      execute: this.executeBrushSegmentation.bind(this)
    });

    // Polygon segmentation tool
    this.tools.set('polygon-segmentation', {
      name: 'Polygon Segmentation',
      type: 'manual',
      icon: '⬟',
      description: 'Create polygon-based segmentations',
      parameters: { autoClose: true, smoothing: false },
      execute: this.executePolygonSegmentation.bind(this)
    });

    // Eraser tool
    this.tools.set('eraser', {
      name: 'Eraser',
      type: 'manual',
      icon: '🧹',
      description: 'Erase parts of segmentation masks',
      parameters: { brushSize: 10 },
      execute: this.executeEraser.bind(this)
    });
  }

  private registerSemiAutomaticTools(): void {
    // Region growing tool
    this.tools.set('region-growing', {
      name: 'Region Growing',
      type: 'semi-automatic',
      icon: '🌱',
      description: 'Grow regions from seed points',
      parameters: { threshold: 10, connectivity: 8 },
      execute: this.executeRegionGrowing.bind(this)
    });

    // Watershed segmentation
    this.tools.set('watershed', {
      name: 'Watershed',
      type: 'semi-automatic',
      icon: '💧',
      description: 'Watershed-based segmentation',
      parameters: { markers: 'auto', compactness: 0.1 },
      execute: this.executeWatershed.bind(this)
    });

    // Level set segmentation
    this.tools.set('level-set', {
      name: 'Level Set',
      type: 'semi-automatic',
      icon: '📈',
      description: 'Level set evolution segmentation',
      parameters: { iterations: 100, smoothing: 1.0 },
      execute: this.executeLevelSet.bind(this)
    });

    // Graph cut segmentation
    this.tools.set('graph-cut', {
      name: 'Graph Cut',
      type: 'semi-automatic',
      icon: '🔗',
      description: 'Graph cut optimization segmentation',
      parameters: { lambda: 1.0, sigma: 10.0 },
      execute: this.executeGraphCut.bind(this)
    });
  }

  private registerAutomaticTools(): void {
    // Threshold-based segmentation
    this.tools.set('threshold', {
      name: 'Threshold Segmentation',
      type: 'automatic',
      icon: '📊',
      description: 'Automatic threshold-based segmentation',
      parameters: { method: 'otsu', adaptive: false },
      execute: this.executeThresholdSegmentation.bind(this)
    });

    // K-means clustering
    this.tools.set('kmeans', {
      name: 'K-Means Clustering',
      type: 'automatic',
      icon: '🎯',
      description: 'K-means clustering segmentation',
      parameters: { clusters: 3, iterations: 100 },
      execute: this.executeKMeansSegmentation.bind(this)
    });

    // Edge-based segmentation
    this.tools.set('edge-segmentation', {
      name: 'Edge Segmentation',
      type: 'automatic',
      icon: '📐',
      description: 'Edge detection based segmentation',
      parameters: { method: 'canny', threshold1: 50, threshold2: 150 },
      execute: this.executeEdgeSegmentation.bind(this)
    });
  }

  private registerAIAssistedTools(): void {
    // Deep learning segmentation
    this.tools.set('deep-learning', {
      name: 'AI Segmentation',
      type: 'ai-assisted',
      icon: '🤖',
      description: 'Deep learning based segmentation',
      parameters: { model: 'unet', confidence: 0.8 },
      execute: this.executeDeepLearningSegmentation.bind(this)
    });

    // AI-assisted refinement
    this.tools.set('ai-refinement', {
      name: 'AI Refinement',
      type: 'ai-assisted',
      icon: '✨',
      description: 'AI-assisted segmentation refinement',
      parameters: { iterations: 5, confidence: 0.9 },
      execute: this.executeAIRefinement.bind(this)
    });

    // Smart brush
    this.tools.set('smart-brush', {
      name: 'Smart Brush',
      type: 'ai-assisted',
      icon: '🎨',
      description: 'AI-guided brush segmentation',
      parameters: { brushSize: 10, aiGuidance: true },
      execute: this.executeSmartBrush.bind(this)
    });
  }

  private register3DTools(): void {
    // 3D region growing
    this.tools.set('3d-region-growing', {
      name: '3D Region Growing',
      type: 'semi-automatic',
      icon: '🧊',
      description: '3D region growing segmentation',
      parameters: { threshold: 10, connectivity: 26 },
      execute: this.execute3DRegionGrowing.bind(this)
    });

    // 3D level set
    this.tools.set('3d-level-set', {
      name: '3D Level Set',
      type: 'semi-automatic',
      icon: '📦',
      description: '3D level set evolution',
      parameters: { iterations: 50, smoothing: 1.0 },
      execute: this.execute3DLevelSet.bind(this)
    });
  }

  private setupEventHandlers(): void {
    if (!this.activeElement) return;

    // Listen for segmentation events
    this.activeElement.addEventListener('cornerstonesegmentationadded', this.handleSegmentationAdded.bind(this));
    this.activeElement.addEventListener('cornerstonesegmentationmodified', this.handleSegmentationModified.bind(this));
    this.activeElement.addEventListener('cornerstonesegmentationdeleted', this.handleSegmentationDeleted.bind(this));
  }

  private async initializeWorker(): Promise<void> {
    try {
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch(type) {
            case 'regionGrowing':
              const result = performRegionGrowing(data);
              self.postMessage({ type: 'regionGrowingResult', result });
              break;
            case 'watershed':
              const watershedResult = performWatershed(data);
              self.postMessage({ type: 'watershedResult', result: watershedResult });
              break;
            case 'levelSet':
              const levelSetResult = performLevelSet(data);
              self.postMessage({ type: 'levelSetResult', result: levelSetResult });
              break;
            default:
              self.postMessage({ type: 'error', message: 'Unknown segmentation task' });
          }
        };
        
        function performRegionGrowing(data) {
          const { imageData, seedPoint, threshold, connectivity } = data;
          // Simplified region growing implementation
          const visited = new Set();
          const queue = [seedPoint];
          const result = [];
          
          while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = x + ',' + y;
            
            if (visited.has(key)) continue;
            visited.add(key);
            result.push([x, y]);
            
            // Add neighbors (simplified)
            const neighbors = connectivity === 8 ? 
              [[x-1,y-1],[x,y-1],[x+1,y-1],[x-1,y],[x+1,y],[x-1,y+1],[x,y+1],[x+1,y+1]] :
              [[x,y-1],[x-1,y],[x+1,y],[x,y+1]];
            
            neighbors.forEach(([nx, ny]) => {
              if (nx >= 0 && ny >= 0 && nx < imageData.width && ny < imageData.height) {
                const nKey = nx + ',' + ny;
                if (!visited.has(nKey)) {
                  // Simplified threshold check
                  queue.push([nx, ny]);
                }
              }
            });
          }
          
          return result;
        }
        
        function performWatershed(data) {
          // Simplified watershed implementation
          return { segmented: true, regions: [] };
        }
        
        function performLevelSet(data) {
          // Simplified level set implementation
          return { segmented: true, contour: [] };
        }
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.segmentationWorker = new Worker(URL.createObjectURL(blob));
      
      this.segmentationWorker.onmessage = (e) => {
        const { type, result } = e.data;
        this.handleWorkerResult(type, result);
      };
      
      console.log('✅ Segmentation worker initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize segmentation worker:', error);
    }
  }

  private async loadAIModel(): Promise<void> {
    if (!this.config.enableAIAssistedSegmentation) return;
    
    try {
      // In a real implementation, this would load a TensorFlow.js or ONNX model
      console.log('🤖 Loading AI segmentation model...');
      
      // Simulate model loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.aiModel = {
        loaded: true,
        predict: async (imageData: any) => {
          // Simulate AI prediction
          return {
            mask: new Uint8Array(imageData.width * imageData.height),
            confidence: 0.85
          };
        }
      };
      
      console.log('✅ AI segmentation model loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load AI model:', error);
    }
  }

  private handleWorkerResult(type: string, result: any): void {
    this.emit('workerResult', { type, result });
  }

  private async handleSegmentationAdded(evt: any): Promise<void> {
    const segmentationData = evt.detail;
    await this.processNewSegmentation(segmentationData);
  }

  private async handleSegmentationModified(evt: any): Promise<void> {
    const segmentationData = evt.detail;
    await this.updateSegmentation(segmentationData);
  }

  private async handleSegmentationDeleted(evt: any): Promise<void> {
    const segmentationId = evt.detail.id;
    this.deleteSegmentation(segmentationId);
  }

  // Tool execution methods
  private async executeFreehandSegmentation(params: any): Promise<SegmentationMask | null> {
    const { coordinates, brushSize, smoothing } = params;
    
    if (!this.activeElement || !coordinates) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;
    
    if (!image) return null;
    
    // TODO: Update for Cornerstone3D image properties
    const maskData = new Uint8Array((image as any).width * (image as any).height);
    
    // Draw freehand path
    this.drawPath(maskData, coordinates, (image as any).width, (image as any).height, brushSize);
    
    if (smoothing) {
      this.smoothMask(maskData, (image as any).width, (image as any).height);
    }
    
    return this.createSegmentationMask(maskData, image, 'manual', 'freehand');
  }

  private async executeBrushSegmentation(params: any): Promise<SegmentationMask | null> {
    const { center, brushSize, hardness } = params;
    
    if (!this.activeElement || !center) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    // TODO: Update for Cornerstone3D image properties
    const maskData = new Uint8Array((image as any).width * (image as any).height);
    
    // Draw brush stroke
    this.drawBrush(maskData, center, brushSize, hardness, (image as any).width, (image as any).height);
    
    return this.createSegmentationMask(maskData, image, 'manual', 'brush');
  }

  private async executePolygonSegmentation(params: any): Promise<SegmentationMask | null> {
    const { vertices, smoothing } = params;
    
    if (!this.activeElement || !vertices || vertices.length < 3) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    // TODO: Update for Cornerstone3D image properties
    const maskData = new Uint8Array((image as any).width * (image as any).height);
    
    // Fill polygon
    this.fillPolygon(maskData, vertices, (image as any).width, (image as any).height);
    
    if (smoothing) {
      this.smoothMask(maskData, (image as any).width, (image as any).height);
    }
    
    return this.createSegmentationMask(maskData, image, 'manual', 'polygon');
  }

  private async executeEraser(params: any): Promise<SegmentationMask | null> {
    const { center, brushSize, targetSegmentationId } = params;
    
    if (!targetSegmentationId || !center) return null;
    
    const segmentation = this.segmentations.get(targetSegmentationId);
    if (!segmentation) return null;
    
    // Erase from existing mask
    this.eraseBrush(segmentation.maskData as Uint8Array, center, brushSize, 
                   segmentation.dimensions.width, segmentation.dimensions.height);
    
    // Update statistics
    segmentation.statistics = this.calculateMaskStatistics(segmentation.maskData as Uint8Array, segmentation.dimensions);
    
    this.emit('segmentationModified', segmentation);
    return segmentation;
  }

  private async executeRegionGrowing(params: any): Promise<SegmentationMask | null> {
    const { seedPoint, threshold, connectivity } = params;
    
    if (!this.activeElement || !seedPoint) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;
    
    if (!image) return null;
    
    // Use worker for computation
    return new Promise((resolve) => {
      if (this.segmentationWorker) {
        const handleResult = (e: MessageEvent) => {
          if (e.data.type === 'regionGrowingResult') {
            this.segmentationWorker!.removeEventListener('message', handleResult);
            
            // TODO: Update for Cornerstone3D image properties
            const maskData = new Uint8Array((image as any).width * (image as any).height);
            e.data.result.forEach(([x, y]: [number, number]) => {
              const index = y * (image as any).width + x;
              if (index < maskData.length) {
                maskData[index] = 255;
              }
            });
            
            const mask = this.createSegmentationMask(maskData, image, 'semi-automatic', 'region-growing');
            resolve(mask);
          }
        };
        
        this.segmentationWorker.addEventListener('message', handleResult);
        this.segmentationWorker.postMessage({
          type: 'regionGrowing',
          data: {
            imageData: {
              data: image.getPixelData(),
              width: image.width,
              height: image.height
            },
            seedPoint,
            threshold,
            connectivity
          }
        });
      } else {
        resolve(null);
      }
    });
  }

  private async executeWatershed(params: any): Promise<SegmentationMask | null> {
    const { markers: _markers, compactness: _compactness } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;
    
    if (!image) return null;
    
    // Simplified watershed implementation
    const maskData = new Uint8Array(image.width * image.height);
    
    // In a real implementation, this would use a proper watershed algorithm
    // For now, we'll create a simple segmentation
    const pixelData = image.getPixelData();
    const threshold = this.calculateOtsuThreshold(pixelData);
    
    for (let i = 0; i < pixelData.length; i++) {
      maskData[i] = pixelData[i] > threshold ? 255 : 0;
    }
    
    return this.createSegmentationMask(maskData, image, 'semi-automatic', 'watershed');
  }

  private async executeLevelSet(params: any): Promise<SegmentationMask | null> {
    const { initialContour, iterations, smoothing } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    // Simplified level set implementation
    const maskData = new Uint8Array(image.width * image.height);
    
    // Initialize with initial contour if provided
    if (initialContour) {
      this.fillPolygon(maskData, initialContour, image.width, image.height);
    }
    
    // Simulate level set evolution
    for (let iter = 0; iter < iterations; iter++) {
      this.evolveLevelSet(maskData, image.getPixelData(), image.width, image.height, smoothing);
    }
    
    return this.createSegmentationMask(maskData, image, 'semi-automatic', 'level-set');
  }

  private async executeGraphCut(params: any): Promise<SegmentationMask | null> {
    const { foregroundSeeds, lambda, sigma } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    // Simplified graph cut implementation
    const maskData = new Uint8Array(image.width * image.height);
    
    // Initialize with seeds
    if (foregroundSeeds) {
      foregroundSeeds.forEach(([x, y]: [number, number]) => {
        const index = y * image.width + x;
        if (index < maskData.length) {
          maskData[index] = 255;
        }
      });
    }
    
    // Expand foreground regions (simplified)
    this.expandRegions(maskData, image.getPixelData(), image.width, image.height, lambda, sigma);
    
    return this.createSegmentationMask(maskData, image, 'semi-automatic', 'graph-cut');
  }

  private async executeThresholdSegmentation(params: any): Promise<SegmentationMask | null> {
    const { method, lowerThreshold, upperThreshold } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;
    
    if (!image) return null;
    
    const pixelData = image.getPixelData();
    const maskData = new Uint8Array(image.width * image.height);
    
    let threshold: number;
    
    if (method === 'otsu') {
      threshold = this.calculateOtsuThreshold(pixelData);
    } else if (lowerThreshold !== undefined && upperThreshold !== undefined) {
      // Dual threshold
      for (let i = 0; i < pixelData.length; i++) {
        maskData[i] = (pixelData[i] >= lowerThreshold && pixelData[i] <= upperThreshold) ? 255 : 0;
      }
      return this.createSegmentationMask(maskData, image, 'automatic', 'threshold');
    } else {
      threshold = lowerThreshold || this.calculateMeanThreshold(pixelData);
    }
    
    for (let i = 0; i < pixelData.length; i++) {
      maskData[i] = pixelData[i] > threshold ? 255 : 0;
    }
    
    return this.createSegmentationMask(maskData, image, 'automatic', 'threshold');
  }

  private async executeKMeansSegmentation(params: any): Promise<SegmentationMask | null> {
    const { clusters, iterations } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;
    
    if (!image) return null;
    
    const pixelData = image.getPixelData();
    const maskData = new Uint8Array(image.width * image.height);
    
    // Simplified K-means clustering
    const clusterResult = this.performKMeansClustering(pixelData, clusters, iterations);
    
    // Convert cluster labels to binary mask (assuming largest cluster is foreground)
    const clusterSizes = new Array(clusters).fill(0);
    clusterResult.forEach(label => clusterSizes[label]++);
    const foregroundCluster = clusterSizes.indexOf(Math.max(...clusterSizes));
    
    for (let i = 0; i < clusterResult.length; i++) {
      maskData[i] = clusterResult[i] === foregroundCluster ? 255 : 0;
    }
    
    return this.createSegmentationMask(maskData, image, 'automatic', 'kmeans');
  }

  private async executeEdgeSegmentation(params: any): Promise<SegmentationMask | null> {
    const { method, threshold1, threshold2 } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    const pixelData = image.getPixelData();
    const maskData = new Uint8Array(image.width * image.height);
    
    if (method === 'canny') {
      this.applyCanny(pixelData, maskData, image.width, image.height, threshold1, threshold2);
    } else {
      // Simple gradient-based edge detection
      this.applyGradientEdges(pixelData, maskData, image.width, image.height, threshold1);
    }
    
    return this.createSegmentationMask(maskData, image, 'automatic', 'edge-detection');
  }

  private async executeDeepLearningSegmentation(params: any): Promise<SegmentationMask | null> {
    const { confidence } = params;
    
    if (!this.activeElement || !this.aiModel) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    // const image = enabledElement?.image;
    const image: any = null;

    if (!image) return null;
    
    try {
      const prediction = await this.aiModel.predict({
        data: image.getPixelData(),
        width: image.width,
        height: image.height
      });
      
      if (prediction.confidence < confidence) {
        console.warn('AI prediction confidence too low:', prediction.confidence);
        return null;
      }
      
      const mask = this.createSegmentationMask(prediction.mask, image, 'ai-assisted', 'deep-learning');
      if (mask) {
        mask.confidence = prediction.confidence;
      }
      
      return mask;
    } catch (error) {
      console.error('AI segmentation failed:', error);
      return null;
    }
  }

  private async executeAIRefinement(params: any): Promise<SegmentationMask | null> {
    const { targetSegmentationId, iterations } = params;
    
    if (!targetSegmentationId || !this.aiModel) return null;
    
    const segmentation = this.segmentations.get(targetSegmentationId);
    if (!segmentation) return null;
    
    try {
      // Use AI to refine existing segmentation
      const refinedMask = await this.aiModel.refine({
        originalMask: segmentation.maskData,
        imageData: this.getCurrentImageData(),
        iterations
      });
      
      segmentation.maskData = refinedMask.mask;
      segmentation.confidence = refinedMask.confidence;
      segmentation.statistics = this.calculateMaskStatistics(segmentation.maskData as Uint8Array, segmentation.dimensions);
      
      this.emit('segmentationModified', segmentation);
      return segmentation;
    } catch (error) {
      console.error('AI refinement failed:', error);
      return null;
    }
  }

  private async executeSmartBrush(params: any): Promise<SegmentationMask | null> {
    const { center, brushSize, aiGuidance } = params;
    
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    const enabledElement = null;
    const image: any = enabledElement?.image;
    
    if (!image) return null;
    
    const maskData = new Uint8Array(image.width * image.height);
    
    if (aiGuidance && this.aiModel) {
      // Use AI to guide brush stroke
      const guidance = await this.aiModel.guideBrush({
        center,
        brushSize,
        imageData: image.getPixelData(),
        width: image.width,
        height: image.height
      });
      
      this.drawSmartBrush(maskData, center, brushSize, guidance, image.width, image.height);
    } else {
      // Regular brush
      this.drawBrush(maskData, center, brushSize, 0.8, image.width, image.height);
    }
    
    return this.createSegmentationMask(maskData, image, 'ai-assisted', 'smart-brush');
  }

  private async execute3DRegionGrowing(_params: any): Promise<SegmentationMask | null> {
    // 3D region growing implementation would go here
    console.log('3D Region Growing not yet implemented');
    return null;
  }

  private async execute3DLevelSet(_params: any): Promise<SegmentationMask | null> {
    // 3D level set implementation would go here
    console.log('3D Level Set not yet implemented');
    return null;
  }

  // Helper methods for mask operations
  private drawPath(maskData: Uint8Array, coordinates: number[][], width: number, height: number, brushSize: number): void {
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];
      const [x2, y2] = coordinates[i + 1];
      this.drawLine(maskData, x1, y1, x2, y2, width, height, brushSize);
    }
  }

  private drawLine(maskData: Uint8Array, x1: number, y1: number, x2: number, y2: number, width: number, height: number, brushSize: number): void {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
      this.drawBrush(maskData, [x, y], brushSize, 1.0, width, height);
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private drawBrush(maskData: Uint8Array, center: number[], brushSize: number, hardness: number, width: number, height: number): void {
    const [cx, cy] = center;
    const radius = brushSize / 2;
    
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        if (distance <= radius) {
          const intensity = hardness + (1 - hardness) * (1 - distance / radius);
          const index = y * width + x;
          maskData[index] = Math.min(255, maskData[index] + intensity * 255);
        }
      }
    }
  }

  private drawSmartBrush(maskData: Uint8Array, center: number[], brushSize: number, guidance: any, width: number, height: number): void {
    // Enhanced brush with AI guidance
    const [cx, cy] = center;
    const radius = brushSize / 2;
    
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        if (distance <= radius) {
          const guidanceWeight = guidance?.getWeight?.(x, y) || 1.0;
          const intensity = guidanceWeight * (1 - distance / radius);
          const index = y * width + x;
          maskData[index] = Math.min(255, maskData[index] + intensity * 255);
        }
      }
    }
  }

  private eraseBrush(maskData: Uint8Array, center: number[], brushSize: number, width: number, height: number): void {
    const [cx, cy] = center;
    const radius = brushSize / 2;
    
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        if (distance <= radius) {
          const index = y * width + x;
          maskData[index] = 0;
        }
      }
    }
  }

  private fillPolygon(maskData: Uint8Array, vertices: number[][], width: number, height: number): void {
    // Scanline polygon fill algorithm
    for (let y = 0; y < height; y++) {
      const intersections: number[] = [];
      
      for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[j];
        
        if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
          const x = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
          intersections.push(x);
        }
      }
      
      intersections.sort((a, b) => a - b);
      
      for (let i = 0; i < intersections.length; i += 2) {
        if (i + 1 < intersections.length) {
          const startX = Math.max(0, Math.floor(intersections[i]));
          const endX = Math.min(width - 1, Math.ceil(intersections[i + 1]));
          
          for (let x = startX; x <= endX; x++) {
            const index = y * width + x;
            maskData[index] = 255;
          }
        }
      }
    }
  }

  private smoothMask(maskData: Uint8Array, width: number, height: number): void {
    // Simple Gaussian blur for smoothing
    const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
    const kernelSum = kernel.reduce((sum, val) => sum + val, 0);
    const smoothed = new Uint8Array(maskData.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let kernelIndex = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const index = (y + ky) * width + (x + kx);
            sum += maskData[index] * kernel[kernelIndex++];
          }
        }
        
        const index = y * width + x;
        smoothed[index] = sum / kernelSum;
      }
    }
    
    maskData.set(smoothed);
  }

  private calculateOtsuThreshold(pixelData: any): number {
    // Otsu's method for automatic threshold selection
    const histogram = new Array(256).fill(0);
    
    // Build histogram
    for (let i = 0; i < pixelData.length; i++) {
      const value = Math.min(255, Math.max(0, Math.floor(pixelData[i])));
      histogram[value]++;
    }
    
    const total = pixelData.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += t * histogram[t];
      
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }
    
    return threshold;
  }

  private calculateMeanThreshold(pixelData: any): number {
    const sum = Array.from(pixelData as number[]).reduce((acc: number, val: number) => acc + val, 0);
    return sum / pixelData.length;
  }

  private performKMeansClustering(pixelData: any, k: number, maxIterations: number): number[] {
    // Simplified K-means clustering
    const data = Array.from(pixelData);
    const n = data.length;
    
    // Initialize centroids
    const centroids = [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    
    for (let i = 0; i < k; i++) {
      centroids.push(min + (max - min) * i / (k - 1));
    }
    
    const labels = new Array(n);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to clusters
      for (let i = 0; i < n; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        
        for (let j = 0; j < k; j++) {
          const dist = Math.abs(data[i] - centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }
        
        labels[i] = bestCluster;
      }
      
      // Update centroids
      const newCentroids = new Array(k).fill(0);
      const counts = new Array(k).fill(0);
      
      for (let i = 0; i < n; i++) {
        newCentroids[labels[i]] += data[i];
        counts[labels[i]]++;
      }
      
      let converged = true;
      for (let j = 0; j < k; j++) {
        if (counts[j] > 0) {
          const newCentroid = newCentroids[j] / counts[j];
          if (Math.abs(newCentroid - centroids[j]) > 0.1) {
            converged = false;
          }
          centroids[j] = newCentroid;
        }
      }
      
      if (converged) break;
    }
    
    return labels;
  }

  private applyCanny(pixelData: any, maskData: Uint8Array, width: number, height: number, threshold1: number, threshold2: number): void {
    // Simplified Canny edge detection
    const gradientX = new Float32Array(pixelData.length);
    const gradientY = new Float32Array(pixelData.length);
    const magnitude = new Float32Array(pixelData.length);
    
    // Calculate gradients
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        
        // Sobel operators
        gradientX[index] = 
          -pixelData[(y-1)*width + (x-1)] + pixelData[(y-1)*width + (x+1)] +
          -2*pixelData[y*width + (x-1)] + 2*pixelData[y*width + (x+1)] +
          -pixelData[(y+1)*width + (x-1)] + pixelData[(y+1)*width + (x+1)];
        
        gradientY[index] = 
          -pixelData[(y-1)*width + (x-1)] - 2*pixelData[(y-1)*width + x] - pixelData[(y-1)*width + (x+1)] +
          pixelData[(y+1)*width + (x-1)] + 2*pixelData[(y+1)*width + x] + pixelData[(y+1)*width + (x+1)];
        
        magnitude[index] = Math.sqrt(gradientX[index]**2 + gradientY[index]**2);
      }
    }
    
    // Apply thresholds
    for (let i = 0; i < magnitude.length; i++) {
      if (magnitude[i] > threshold2) {
        maskData[i] = 255;
      } else if (magnitude[i] > threshold1) {
        maskData[i] = 128; // Weak edge
      } else {
        maskData[i] = 0;
      }
    }
    
    // Edge tracking by hysteresis (simplified)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        if (maskData[index] === 128) {
          // Check if connected to strong edge
          let connected = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIndex = (y + dy) * width + (x + dx);
              if (maskData[neighborIndex] === 255) {
                connected = true;
                break;
              }
            }
            if (connected) break;
          }
          maskData[index] = connected ? 255 : 0;
        }
      }
    }
  }

  private applyGradientEdges(pixelData: any, maskData: Uint8Array, width: number, height: number, threshold: number): void {
    // Simple gradient-based edge detection
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        
        const gx = pixelData[index + 1] - pixelData[index - 1];
        const gy = pixelData[index + width] - pixelData[index - width];
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        maskData[index] = magnitude > threshold ? 255 : 0;
      }
    }
  }

  private evolveLevelSet(maskData: Uint8Array, imageData: any, width: number, height: number, smoothing: number): void {
    // Simplified level set evolution
    const newMask = new Uint8Array(maskData.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        
        // Calculate curvature and image forces (simplified)
        const curvature = this.calculateCurvature(maskData, x, y, width, height);
        const imageForce = this.calculateImageForce(imageData, x, y, width, height);
        
        const evolution = smoothing * curvature + imageForce;
        newMask[index] = maskData[index] + evolution > 127 ? 255 : 0;
      }
    }
    
    maskData.set(newMask);
  }

  private calculateCurvature(maskData: Uint8Array, x: number, y: number, width: number, height: number): number {
    // Simplified curvature calculation
    const center = maskData[y * width + x];
    const neighbors = [
      maskData[(y-1) * width + x],     // top
      maskData[y * width + (x+1)],     // right
      maskData[(y+1) * width + x],     // bottom
      maskData[y * width + (x-1)]      // left
    ];
    
    const laplacian = neighbors.reduce((sum, val) => sum + val, 0) - 4 * center;
    return laplacian / 255.0;
  }

  private calculateImageForce(imageData: any, x: number, y: number, width: number, height: number): number {
    // Simplified image force calculation
    const index = y * width + x;
    const gx = imageData[index + 1] - imageData[index - 1];
    const gy = imageData[index + width] - imageData[index - width];
    const magnitude = Math.sqrt(gx * gx + gy * gy);
    
    return -magnitude / 1000.0; // Normalize and invert
  }

  private expandRegions(maskData: Uint8Array, imageData: any, width: number, height: number, lambda: number, sigma: number): void {
    // Simplified region expansion for graph cut
    const newMask = new Uint8Array(maskData.length);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        
        if (maskData[index] > 0) {
          // Expand foreground regions
          const neighbors = [
            [x, y-1], [x+1, y], [x, y+1], [x-1, y]
          ];
          
          neighbors.forEach(([nx, ny]) => {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIndex = ny * width + nx;
              const similarity = Math.exp(-Math.pow(imageData[index] - imageData[nIndex], 2) / (2 * sigma * sigma));
              
              if (similarity > lambda && maskData[nIndex] === 0) {
                newMask[nIndex] = 255;
              }
            }
          });
        }
        
        newMask[index] = Math.max(newMask[index], maskData[index]);
      }
    }
    
    maskData.set(newMask);
  }

  private createSegmentationMask(maskData: Uint8Array, image: any, type: SegmentationMask['type'], algorithm?: string): SegmentationMask {
    const id = uuidv4();
    const dimensions = {
      width: image.width,
      height: image.height
    };
    
    const statistics = this.calculateMaskStatistics(maskData, dimensions);
    const colorIndex = this.segmentations.size % this.labelColors.length;
    
    return {
      id,
      name: `Segmentation ${this.segmentations.size + 1}`,
      type,
      algorithm,
      maskData,
      dimensions,
      metadata: {
        pixelSpacing: image.pixelSpacing,
        sliceThickness: image.sliceThickness,
        orientation: image.orientation,
        studyId: image.studyId,
        seriesId: image.seriesId,
        imageId: image.imageId
      },
      statistics,
      color: this.labelColors[colorIndex],
      opacity: 0.5,
      visible: true,
      locked: false,
      timestamp: new Date()
    };
  }

  private calculateMaskStatistics(maskData: Uint8Array, dimensions: { width: number; height: number; depth?: number }): any {
    const { width, height } = dimensions;
    let volume = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let sumX = 0, sumY = 0, count = 0;
    
    // Calculate basic statistics
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (maskData[index] > 0) {
          volume++;
          count++;
          sumX += x;
          sumY += y;
          
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    const centroid: [number, number] = count > 0 ? [sumX / count, sumY / count] : [0, 0];
    
    // Calculate perimeter (simplified)
    let perimeter = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (maskData[index] > 0) {
          // Check if on boundary
          const neighbors = [
            y > 0 ? maskData[(y-1) * width + x] : 0,
            x < width-1 ? maskData[y * width + (x+1)] : 0,
            y < height-1 ? maskData[(y+1) * width + x] : 0,
            x > 0 ? maskData[y * width + (x-1)] : 0
          ];
          
          if (neighbors.some(n => n === 0)) {
            perimeter++;
          }
        }
      }
    }
    
    return {
      volume,
      surfaceArea: perimeter, // 2D perimeter as surface area
      boundingBox: {
        min: [minX, minY],
        max: [maxX, maxY]
      },
      centroid
    };
  }

  private getCurrentImageData(): any {
    if (!this.activeElement) return null;
    
    // TODO: Update for Cornerstone3D
    // const enabledElement = cornerstone.getEnabledElement(this.activeElement);
    const enabledElement = null;
    return enabledElement?.image;
  }

  private async processNewSegmentation(segmentationData: any): Promise<void> {
    // Process newly created segmentation
    const segmentation = segmentationData as SegmentationMask;
    this.segmentations.set(segmentation.id, segmentation);
    
    if (this.config.autoSaveSegmentations) {
      await this.saveSegmentation(segmentation);
    }
    
    this.emit('segmentationAdded', segmentation);
  }

  private async updateSegmentation(segmentationData: any): Promise<void> {
    const segmentation = segmentationData as SegmentationMask;
    
    if (this.segmentations.has(segmentation.id)) {
      this.segmentations.set(segmentation.id, segmentation);
      
      if (this.config.autoSaveSegmentations) {
        await this.saveSegmentation(segmentation);
      }
      
      this.emit('segmentationModified', segmentation);
    }
  }

  private async saveSegmentation(segmentation: SegmentationMask): Promise<void> {
    try {
      // Save to local storage or send to server
      const savedSegmentations = JSON.parse(localStorage.getItem('segmentations') || '[]');
      const existingIndex = savedSegmentations.findIndex((s: any) => s.id === segmentation.id);
      
      if (existingIndex >= 0) {
        savedSegmentations[existingIndex] = segmentation;
      } else {
        savedSegmentations.push(segmentation);
      }
      
      localStorage.setItem('segmentations', JSON.stringify(savedSegmentations));
      
      console.log('✅ Segmentation saved:', segmentation.id);
    } catch (error) {
      console.error('❌ Failed to save segmentation:', error);
    }
  }

  private deleteSegmentation(segmentationId: string): void {
    if (this.segmentations.has(segmentationId)) {
      this.segmentations.delete(segmentationId);
      
      // Remove from local storage
      try {
        const savedSegmentations = JSON.parse(localStorage.getItem('segmentations') || '[]');
        const filteredSegmentations = savedSegmentations.filter((s: any) => s.id !== segmentationId);
        localStorage.setItem('segmentations', JSON.stringify(filteredSegmentations));
      } catch (error) {
        console.error('❌ Failed to delete segmentation from storage:', error);
      }
      
      this.emit('segmentationDeleted', { id: segmentationId });
    }
  }

  // Public API methods
  public async executeSegmentationTool(toolName: string, params: any): Promise<SegmentationMask | null> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.error('Unknown segmentation tool:', toolName);
      return null;
    }
    
    try {
      const result = await tool.execute({ ...tool.parameters, ...params });
      
      if (result) {
        this.segmentations.set(result.id, result);
        this.activeSegmentationId = result.id;
        
        if (this.config.autoSaveSegmentations) {
          await this.saveSegmentation(result);
        }
        
        this.emit('segmentationCreated', result);
      }
      
      return result;
    } catch (error) {
      console.error('Segmentation tool execution failed:', error);
      return null;
    }
  }

  public getSegmentation(id: string): SegmentationMask | undefined {
    return this.segmentations.get(id);
  }

  public getAllSegmentations(): SegmentationMask[] {
    return Array.from(this.segmentations.values());
  }

  public getActiveSegmentation(): SegmentationMask | null {
    return this.activeSegmentationId ? this.segmentations.get(this.activeSegmentationId) || null : null;
  }

  public setActiveSegmentation(id: string): boolean {
    if (this.segmentations.has(id)) {
      this.activeSegmentationId = id;
      this.emit('activeSegmentationChanged', { id });
      return true;
    }
    return false;
  }

  public updateSegmentationVisibility(id: string, visible: boolean): boolean {
    const segmentation = this.segmentations.get(id);
    if (segmentation) {
      segmentation.visible = visible;
      this.emit('segmentationVisibilityChanged', { id, visible });
      return true;
    }
    return false;
  }

  public updateSegmentationOpacity(id: string, opacity: number): boolean {
    const segmentation = this.segmentations.get(id);
    if (segmentation) {
      segmentation.opacity = Math.max(0, Math.min(1, opacity));
      this.emit('segmentationOpacityChanged', { id, opacity: segmentation.opacity });
      return true;
    }
    return false;
  }

  public updateSegmentationColor(id: string, color: [number, number, number, number]): boolean {
    const segmentation = this.segmentations.get(id);
    if (segmentation) {
      segmentation.color = color;
      this.emit('segmentationColorChanged', { id, color });
      return true;
    }
    return false;
  }

  public lockSegmentation(id: string, locked: boolean): boolean {
    const segmentation = this.segmentations.get(id);
    if (segmentation) {
      segmentation.locked = locked;
      this.emit('segmentationLockChanged', { id, locked });
      return true;
    }
    return false;
  }

  public async duplicateSegmentation(id: string): Promise<SegmentationMask | null> {
    const original = this.segmentations.get(id);
    if (!original) return null;
    
    const duplicate: SegmentationMask = {
      ...original,
      id: uuidv4(),
      name: `${original.name} (Copy)`,
      maskData: new Uint8Array(original.maskData),
      timestamp: new Date(),
      locked: false
    };
    
    this.segmentations.set(duplicate.id, duplicate);
    
    if (this.config.autoSaveSegmentations) {
      await this.saveSegmentation(duplicate);
    }
    
    this.emit('segmentationDuplicated', { original: original.id, duplicate: duplicate.id });
    return duplicate;
  }

  public async mergeSegmentations(ids: string[]): Promise<SegmentationMask | null> {
    if (ids.length < 2) return null;
    
    const segmentations = ids.map(id => this.segmentations.get(id)).filter(Boolean) as SegmentationMask[];
    if (segmentations.length < 2) return null;
    
    const first = segmentations[0];
    const mergedMaskData = new Uint8Array(first.maskData.length);
    
    // Merge all masks
    segmentations.forEach(seg => {
      for (let i = 0; i < mergedMaskData.length; i++) {
        mergedMaskData[i] = Math.max(mergedMaskData[i], (seg.maskData as Uint8Array)[i]);
      }
    });
    
    const merged: SegmentationMask = {
      ...first,
      id: uuidv4(),
      name: `Merged Segmentation`,
      maskData: mergedMaskData,
      statistics: this.calculateMaskStatistics(mergedMaskData, first.dimensions),
      timestamp: new Date()
    };
    
    this.segmentations.set(merged.id, merged);
    
    if (this.config.autoSaveSegmentations) {
      await this.saveSegmentation(merged);
    }
    
    this.emit('segmentationsMerged', { source: ids, result: merged.id });
    return merged;
  }

  public async subtractSegmentations(minuendId: string, subtrahendId: string): Promise<SegmentationMask | null> {
    const minuend = this.segmentations.get(minuendId);
    const subtrahend = this.segmentations.get(subtrahendId);
    
    if (!minuend || !subtrahend) return null;
    
    const resultMaskData = new Uint8Array(minuend.maskData.length);
    
    for (let i = 0; i < resultMaskData.length; i++) {
      const minuendValue = (minuend.maskData as Uint8Array)[i];
      const subtrahendValue = (subtrahend.maskData as Uint8Array)[i];
      resultMaskData[i] = subtrahendValue > 0 ? 0 : minuendValue;
    }
    
    const result: SegmentationMask = {
      ...minuend,
      id: uuidv4(),
      name: `${minuend.name} - ${subtrahend.name}`,
      maskData: resultMaskData,
      statistics: this.calculateMaskStatistics(resultMaskData, minuend.dimensions),
      timestamp: new Date()
    };
    
    this.segmentations.set(result.id, result);
    
    if (this.config.autoSaveSegmentations) {
      await this.saveSegmentation(result);
    }
    
    this.emit('segmentationSubtracted', { minuend: minuendId, subtrahend: subtrahendId, result: result.id });
    return result;
  }

  public exportSegmentation(id: string, format: 'nifti' | 'dicom' | 'json' | 'mask'): Blob | null {
    const segmentation = this.segmentations.get(id);
    if (!segmentation) return null;
    
    switch (format) {
      case 'json':
        const jsonData = JSON.stringify(segmentation, null, 2);
        return new Blob([jsonData], { type: 'application/json' });
      
      case 'mask':
        return new Blob([segmentation.maskData], { type: 'application/octet-stream' });
      
      case 'nifti':
      case 'dicom':
        // These would require specialized libraries
        console.warn(`Export format ${format} not yet implemented`);
        return null;
      
      default:
        return null;
    }
  }

  public async loadSegmentations(): Promise<void> {
    try {
      const savedSegmentations = JSON.parse(localStorage.getItem('segmentations') || '[]');
      
      savedSegmentations.forEach((segData: any) => {
        // Convert maskData back to Uint8Array if needed
        if (segData.maskData && typeof segData.maskData === 'object') {
          segData.maskData = new Uint8Array(Object.values(segData.maskData));
        }
        
        this.segmentations.set(segData.id, segData);
      });
      
      console.log(`✅ Loaded ${savedSegmentations.length} segmentations`);
      this.emit('segmentationsLoaded', { count: savedSegmentations.length });
    } catch (error) {
      console.error('❌ Failed to load segmentations:', error);
    }
  }

  public clearAllSegmentations(): void {
    this.segmentations.clear();
    this.activeSegmentationId = null;
    
    try {
      localStorage.removeItem('segmentations');
    } catch (error) {
      console.error('❌ Failed to clear segmentations from storage:', error);
    }
    
    this.emit('segmentationsCleared');
  }

  public getAvailableTools(): SegmentationTool[] {
    return Array.from(this.tools.values());
  }

  public getToolsByType(type: SegmentationTool['type']): SegmentationTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.type === type);
  }

  public updateConfig(newConfig: Partial<SegmentationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): SegmentationConfig {
    return { ...this.config };
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  public off(event: string, callback: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  public destroy(): void {
    if (this.segmentationWorker) {
      this.segmentationWorker.terminate();
      this.segmentationWorker = null;
    }
    
    if (this.activeElement) {
      this.activeElement.removeEventListener('cornerstonesegmentationadded', this.handleSegmentationAdded.bind(this));
      this.activeElement.removeEventListener('cornerstonesegmentationmodified', this.handleSegmentationModified.bind(this));
      this.activeElement.removeEventListener('cornerstonesegmentationdeleted', this.handleSegmentationDeleted.bind(this));
    }
    
    this.segmentations.clear();
    this.tools.clear();
    this.eventListeners = {};
    this.isInitialized = false;
    
    console.log('🧹 Advanced Segmentation Tools destroyed');
  }
}

// React component for the segmentation tools UI
export const AdvancedSegmentationToolsComponent: React.FC<{
  segmentationTools: AdvancedSegmentationTools;
  onToolSelect?: (toolName: string) => void;
}> = ({ segmentationTools, onToolSelect }) => {
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [segmentations, setSegmentations] = useState<SegmentationMask[]>([]);
  const [activeSegmentationId, setActiveSegmentationId] = useState<string | null>(null);
  
  useEffect(() => {
    const updateSegmentations = () => {
      setSegmentations(segmentationTools.getAllSegmentations());
    };
    
    const updateActiveSegmentation = (data: { id: string }) => {
      setActiveSegmentationId(data.id);
    };
    
    segmentationTools.on('segmentationCreated', updateSegmentations);
    segmentationTools.on('segmentationModified', updateSegmentations);
    segmentationTools.on('segmentationDeleted', updateSegmentations);
    segmentationTools.on('activeSegmentationChanged', updateActiveSegmentation);
    
    updateSegmentations();
    
    return () => {
      segmentationTools.off('segmentationCreated', updateSegmentations);
      segmentationTools.off('segmentationModified', updateSegmentations);
      segmentationTools.off('segmentationDeleted', updateSegmentations);
      segmentationTools.off('activeSegmentationChanged', updateActiveSegmentation);
    };
  }, [segmentationTools]);
  
  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    onToolSelect?.(toolName);
  };
  
  const tools = segmentationTools.getAvailableTools();
  
  return (
    <div className="advanced-segmentation-tools">
      <div className="tool-palette">
        <h3>Segmentation Tools</h3>
        <div className="tool-categories">
          {['manual', 'semi-automatic', 'automatic', 'ai-assisted'].map(category => (
            <div key={category} className="tool-category">
              <h4>{category.replace('-', ' ').toUpperCase()}</h4>
              <div className="tool-buttons">
                {tools
                  .filter(tool => tool.type === category)
                  .map(tool => (
                    <button
                      key={tool.name}
                      className={`tool-button ${selectedTool === tool.name ? 'active' : ''}`}
                      onClick={() => handleToolSelect(tool.name)}
                      title={tool.description}
                    >
                      <span className="tool-icon">{tool.icon}</span>
                      <span className="tool-name">{tool.name}</span>
                    </button>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="segmentation-list">
        <h3>Segmentations</h3>
        <div className="segmentation-items">
          {segmentations.map(seg => (
            <div
              key={seg.id}
              className={`segmentation-item ${activeSegmentationId === seg.id ? 'active' : ''}`}
              onClick={() => segmentationTools.setActiveSegmentation(seg.id)}
            >
              <div className="segmentation-info">
                <span className="segmentation-name">{seg.name}</span>
                <span className="segmentation-type">{seg.type}</span>
                {seg.confidence && (
                  <span className="segmentation-confidence">
                    {Math.round(seg.confidence * 100)}%
                  </span>
                )}
              </div>
              <div className="segmentation-controls">
                <button
                  className={`visibility-toggle ${seg.visible ? 'visible' : 'hidden'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    segmentationTools.updateSegmentationVisibility(seg.id, !seg.visible);
                  }}
                >
                  {seg.visible ? '👁️' : '🙈'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={seg.opacity}
                  onChange={(e) => {
                    segmentationTools.updateSegmentationOpacity(seg.id, parseFloat(e.target.value));
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSegmentationTools;