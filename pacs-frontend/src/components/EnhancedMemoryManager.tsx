// import React from 'react';
import { EventEmitter } from 'events';
import PerformanceOptimizer from './PerformanceOptimizer';
import EnhancedDICOMNetwork from './EnhancedDICOMNetwork';

export interface MemorySegment {
  id: string;
  type: 'image' | 'volume' | 'metadata' | 'cache' | 'buffer';
  size: number; // bytes
  priority: 'critical' | 'high' | 'medium' | 'low';
  lastAccessed: Date;
  accessCount: number;
  compressed: boolean;
  compressionRatio?: number;
  persistent: boolean;
  owner: string;
  data?: unknown;
  references: number;
}

export interface MemoryPool {
  id: string;
  name: string;
  type: 'cpu' | 'gpu' | 'shared' | 'streaming';
  totalSize: number;
  usedSize: number;
  availableSize: number;
  segments: Map<string, MemorySegment>;
  maxSegmentSize: number;
  compressionEnabled: boolean;
  autoCleanup: boolean;
  cleanupThreshold: number; // percentage
}

export interface LargeDatasetStrategy {
  id: string;
  name: string;
  description: string;
  datasetSizeThreshold: number; // bytes
  chunkSize: number; // bytes
  enableStreaming: boolean;
  enableProgressive: boolean;
  enableLOD: boolean; // Level of Detail
  compressionLevel: number;
  prefetchDistance: number;
  maxConcurrentChunks: number;
}

export interface StreamingConfig {
  enabled: boolean;
  chunkSize: number;
  bufferSize: number;
  prefetchCount: number;
  compressionEnabled: boolean;
  adaptiveQuality: boolean;
  bandwidthThreshold: number; // bytes/sec
}

export interface MemoryOptimizationMetrics {
  totalMemoryUsage: number;
  peakMemoryUsage: number;
  averageMemoryUsage: number;
  memoryEfficiency: number; // percentage
  compressionRatio: number;
  cacheHitRate: number;
  gcFrequency: number;
  fragmentationLevel: number;
  streamingPerformance: {
    throughput: number; // bytes/sec
    latency: number; // ms
    errorRate: number; // percentage
  };
  timestamp: Date;
}

export interface EnhancedMemoryManagerConfig {
  maxMemoryUsage: number; // bytes
  enableCompression: boolean;
  compressionLevel: number;
  enableStreaming: boolean;
  streamingConfig: StreamingConfig;
  enableLargeDatasetOptimization: boolean;
  largeDatasetStrategies: LargeDatasetStrategy[];
  enableAdaptiveManagement: boolean;
  gcThreshold: number; // percentage
  enableMetrics: boolean;
  metricsInterval: number; // ms
  enableWorkerPool: boolean;
  workerPoolSize: number;
}

export class EnhancedMemoryManager extends EventEmitter {
  private config: EnhancedMemoryManagerConfig;
  private memoryPools: Map<string, MemoryPool> = new Map();
  private activeSegments: Map<string, MemorySegment> = new Map();
  private streamingJobs: Map<string, Record<string, unknown>> = new Map();
  private compressionWorkers: Worker[] = [];
  private metrics: MemoryOptimizationMetrics[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  // private _performanceOptimizer?: PerformanceOptimizer;
  // private _networkManager?: EnhancedDICOMNetwork;
  private isInitialized = false;

  constructor(config: Partial<EnhancedMemoryManagerConfig> = {}) {
    super();
    this.config = {
      maxMemoryUsage: 4 * 1024 * 1024 * 1024, // 4GB
      enableCompression: true,
      compressionLevel: 6,
      enableStreaming: true,
      streamingConfig: {
        enabled: true,
        chunkSize: 64 * 1024 * 1024, // 64MB
        bufferSize: 256 * 1024 * 1024, // 256MB
        prefetchCount: 3,
        compressionEnabled: true,
        adaptiveQuality: true,
        bandwidthThreshold: 10 * 1024 * 1024 // 10MB/s
      },
      enableLargeDatasetOptimization: true,
      largeDatasetStrategies: this.getDefaultStrategies(),
      enableAdaptiveManagement: true,
      gcThreshold: 85, // percentage
      enableMetrics: true,
      metricsInterval: 5000, // 5 seconds
      enableWorkerPool: true,
      workerPoolSize: 4,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Enhanced Memory Manager...');

      // Initialize memory pools
      this.initializeMemoryPools();

      // Initialize compression workers
      if (this.config.enableWorkerPool) {
        await this.initializeWorkerPool();
      }

      // Start background services
      this.startBackgroundServices();

      this.isInitialized = true;
      console.log('✅ Enhanced Memory Manager initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Memory Manager:', error);
      throw error;
    }
  }

  private initializeMemoryPools(): void {
    // CPU Memory Pool
    const cpuPool: MemoryPool = {
      id: 'cpu-main',
      name: 'CPU Main Memory',
      type: 'cpu',
      totalSize: this.config.maxMemoryUsage * 0.6, // 60% for CPU
      usedSize: 0,
      availableSize: this.config.maxMemoryUsage * 0.6,
      segments: new Map(),
      maxSegmentSize: 512 * 1024 * 1024, // 512MB
      compressionEnabled: this.config.enableCompression,
      autoCleanup: true,
      cleanupThreshold: 80
    };
    this.memoryPools.set('cpu-main', cpuPool);

    // GPU Memory Pool (if available)
    const gpuPool: MemoryPool = {
      id: 'gpu-main',
      name: 'GPU Memory',
      type: 'gpu',
      totalSize: this.config.maxMemoryUsage * 0.3, // 30% for GPU
      usedSize: 0,
      availableSize: this.config.maxMemoryUsage * 0.3,
      segments: new Map(),
      maxSegmentSize: 256 * 1024 * 1024, // 256MB
      compressionEnabled: false, // GPU memory typically not compressed
      autoCleanup: true,
      cleanupThreshold: 90
    };
    this.memoryPools.set('gpu-main', gpuPool);

    // Streaming Buffer Pool
    const streamingPool: MemoryPool = {
      id: 'streaming-buffer',
      name: 'Streaming Buffer',
      type: 'streaming',
      totalSize: this.config.maxMemoryUsage * 0.1, // 10% for streaming
      usedSize: 0,
      availableSize: this.config.maxMemoryUsage * 0.1,
      segments: new Map(),
      maxSegmentSize: this.config.streamingConfig.chunkSize,
      compressionEnabled: this.config.streamingConfig.compressionEnabled,
      autoCleanup: true,
      cleanupThreshold: 70
    };
    this.memoryPools.set('streaming-buffer', streamingPool);
  }

  private async initializeWorkerPool(): Promise<void> {
    try {
      console.log('🔧 Initializing compression worker pool...');
      
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data, id } = e.data;
          
          try {
            switch (type) {
              case 'compress':
                // Simulate compression (in real implementation, use actual compression library)
                const compressed = new Uint8Array(data.length * 0.7); // 30% compression
                self.postMessage({ type: 'compressed', id, data: compressed, originalSize: data.length });
                break;
                
              case 'decompress':
                // Simulate decompression
                const decompressed = new Uint8Array(data.length * 1.43); // Reverse compression
                self.postMessage({ type: 'decompressed', id, data: decompressed });
                break;
                
              case 'process-chunk':
                // Process streaming chunk
                self.postMessage({ type: 'chunk-processed', id, data: data });
                break;
                
              default:
                throw new Error('Unknown worker task type: ' + type);
            }
          } catch (error) {
            self.postMessage({ type: 'error', id, error: error.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      for (let i = 0; i < this.config.workerPoolSize; i++) {
        const worker = new Worker(workerUrl);
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        this.compressionWorkers.push(worker);
      }

      URL.revokeObjectURL(workerUrl);
      console.log(`✅ Compression worker pool initialized with ${this.config.workerPoolSize} workers`);
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize compression worker pool, disabling worker-based compression:', error);
      this.config.enableWorkerPool = false;
      this.config.workerPoolSize = 0;
    }
  }

  private startBackgroundServices(): void {
    // Start metrics collection
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, this.config.metricsInterval);
    }

    // Start garbage collection
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection();
    }, 30000); // Every 30 seconds
  }

  public async allocateMemory(
    size: number,
    type: MemorySegment['type'],
    priority: MemorySegment['priority'] = 'medium',
    owner: string,
    persistent: boolean = false
  ): Promise<string | null> {
    try {
      // Determine appropriate pool
      const poolId = this.selectOptimalPool(size, type);
      const pool = this.memoryPools.get(poolId);
      
      if (!pool) {
        throw new Error(`Memory pool ${poolId} not found`);
      }

      // Check if allocation is possible
      if (pool.availableSize < size) {
        // Try to free up space
        await this.freeMemorySpace(poolId, size);
        
        if (pool.availableSize < size) {
          console.warn(`Insufficient memory in pool ${poolId}`);
          return null;
        }
      }

      // Create memory segment
      const segmentId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const segment: MemorySegment = {
        id: segmentId,
        type,
        size,
        priority,
        lastAccessed: new Date(),
        accessCount: 0,
        compressed: false,
        persistent,
        owner,
        references: 1
      };

      // Update pool
      pool.segments.set(segmentId, segment);
      pool.usedSize += size;
      pool.availableSize -= size;
      this.activeSegments.set(segmentId, segment);

      this.emit('memoryAllocated', { segmentId, size, type, poolId });
      return segmentId;

    } catch (error) {
      console.error('Memory allocation failed:', error);
      return null;
    }
  }

  public deallocateMemory(segmentId: string): boolean {
    try {
      const segment = this.activeSegments.get(segmentId);
      if (!segment) {
        console.warn(`Memory segment ${segmentId} not found`);
        return false;
      }

      // Decrease reference count
      segment.references--;
      
      // Only deallocate if no references remain
      if (segment.references <= 0) {
        // Find the pool containing this segment
        let targetPool: MemoryPool | null = null;
        for (const pool of this.memoryPools.values()) {
          if (pool.segments.has(segmentId)) {
            targetPool = pool;
            break;
          }
        }

        if (targetPool) {
          targetPool.segments.delete(segmentId);
          targetPool.usedSize -= segment.size;
          targetPool.availableSize += segment.size;
        }

        this.activeSegments.delete(segmentId);
        this.emit('memoryDeallocated', { segmentId, size: segment.size });
      }

      return true;
    } catch (error) {
      console.error('Memory deallocation failed:', error);
      return false;
    }
  }

  public async compressSegment(segmentId: string): Promise<boolean> {
    try {
      const segment = this.activeSegments.get(segmentId);
      if (!segment || segment.compressed || !segment.data) {
        return false;
      }

      return new Promise((resolve) => {
        const worker = this.getAvailableWorker();
        const taskId = `compress-${Date.now()}`;
        
        const handleMessage = (event: MessageEvent) => {
          const { type, id, data, originalSize } = event.data;
          if (id === taskId && type === 'compressed') {
            segment.data = data;
            segment.compressed = true;
            segment.compressionRatio = data.length / originalSize;
            
            // Update pool sizes
            const sizeDiff = originalSize - data.length;
            for (const pool of this.memoryPools.values()) {
              if (pool.segments.has(segmentId)) {
                pool.usedSize -= sizeDiff;
                pool.availableSize += sizeDiff;
                break;
              }
            }
            
            worker.removeEventListener('message', handleMessage);
            resolve(true);
          }
        };
        
        worker.addEventListener('message', handleMessage);
        worker.postMessage({ type: 'compress', data: segment.data, id: taskId });
      });
    } catch (error) {
      console.error('Compression failed:', error);
      return false;
    }
  }

  public async startLargeDatasetStreaming(
    datasetId: string,
    totalSize: number,
    dataSource: string
  ): Promise<string> {
    try {
      const strategy = this.selectDatasetStrategy(totalSize);
      const streamingJobId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const streamingJob = {
        id: streamingJobId,
        datasetId,
        totalSize,
        dataSource,
        strategy,
        chunksLoaded: 0,
        totalChunks: Math.ceil(totalSize / strategy.chunkSize),
        currentChunk: 0,
        bufferPool: new Map(),
        status: 'initializing',
        startTime: new Date()
      };
      
      this.streamingJobs.set(streamingJobId, streamingJob);
      
      // Start streaming process
      this.processStreamingJob(streamingJob);
      
      return streamingJobId;
    } catch (error) {
      console.error('Failed to start large dataset streaming:', error);
      throw error;
    }
  }

  private async processStreamingJob(job: Record<string, unknown>): Promise<void> {
    try {
      job.status = 'streaming';
      
      // Process chunks in parallel with controlled concurrency
      const jobWithStrategy = job as Record<string, unknown> & { strategy: { maxConcurrentChunks: number }; totalChunks: number };
      const concurrentChunks = Math.min(jobWithStrategy.strategy.maxConcurrentChunks, jobWithStrategy.totalChunks);
      const chunkPromises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrentChunks && i < jobWithStrategy.totalChunks; i++) {
        chunkPromises.push(this.loadChunk(job, i));
      }
      
      await Promise.all(chunkPromises);
      
      job.status = 'completed';
      this.emit('streamingCompleted', { jobId: job.id, datasetId: job.datasetId });
      
    } catch (error: unknown) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('streamingFailed', { jobId: job.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async loadChunk(job: Record<string, unknown>, chunkIndex: number): Promise<void> {
    try {
      const jobWithProps = job as Record<string, unknown> & { strategy: { chunkSize: number; compressionLevel: number }; totalSize: number; bufferPool: Map<number, string>; chunksLoaded: number; totalChunks: number };
      const chunkSize = Math.min(jobWithProps.strategy.chunkSize, jobWithProps.totalSize - (chunkIndex * jobWithProps.strategy.chunkSize));
      // const chunkId = `${job.id}-chunk-${chunkIndex}`;
      
      // Simulate chunk loading (in real implementation, load from network/storage)
      const chunkData = new Uint8Array(chunkSize);
      
      // Allocate memory for chunk
      const segmentId = await this.allocateMemory(
        chunkSize,
        'buffer',
        'high',
        `streaming-${job.id}`,
        false
      );
      
      if (segmentId) {
        const segment = this.activeSegments.get(segmentId);
        if (segment) {
          segment.data = chunkData;
          jobWithProps.bufferPool.set(chunkIndex, segmentId);
          jobWithProps.chunksLoaded++;
          
          // Compress if enabled
          if (jobWithProps.strategy.compressionLevel > 0) {
            await this.compressSegment(segmentId);
          }
          
          this.emit('chunkLoaded', {
            jobId: job.id,
            chunkIndex,
            progress: jobWithProps.chunksLoaded / jobWithProps.totalChunks
          });
        }
      }
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  private selectOptimalPool(size: number, type: MemorySegment['type']): string {
    // Select pool based on type and size
    if (type === 'buffer' || size > 100 * 1024 * 1024) { // > 100MB
      return 'streaming-buffer';
    } else if (type === 'volume' || type === 'image') {
      return 'gpu-main';
    } else {
      return 'cpu-main';
    }
  }

  private selectDatasetStrategy(totalSize: number): LargeDatasetStrategy {
    // Select strategy based on dataset size
    for (const strategy of this.config.largeDatasetStrategies) {
      if (totalSize >= strategy.datasetSizeThreshold) {
        return strategy;
      }
    }
    
    // Return default strategy
    return this.config.largeDatasetStrategies[this.config.largeDatasetStrategies.length - 1];
  }

  private async freeMemorySpace(poolId: string, requiredSize: number): Promise<void> {
    const pool = this.memoryPools.get(poolId);
    if (!pool) return;

    // Sort segments by priority and last access time
    const segments = Array.from(pool.segments.values())
      .filter(s => !s.persistent)
      .sort((a, b) => {
        const priorityOrder = { 'low': 0, 'medium': 1, 'high': 2, 'critical': 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastAccessed.getTime() - b.lastAccessed.getTime();
      });

    let freedSize = 0;
    for (const segment of segments) {
      if (freedSize >= requiredSize) break;
      
      this.deallocateMemory(segment.id);
      freedSize += segment.size;
    }
  }

  private performGarbageCollection(): void {
    try {
      for (const pool of this.memoryPools.values()) {
        const usagePercentage = (pool.usedSize / pool.totalSize) * 100;
        
        if (usagePercentage > this.config.gcThreshold) {
          this.freeMemorySpace(pool.id, pool.totalSize * 0.2); // Free 20% of pool
        }
      }
      
      this.emit('garbageCollectionCompleted');
    } catch (error) {
      console.error('Garbage collection failed:', error);
    }
  }

  private collectMetrics(): void {
    try {
      const totalUsed = Array.from(this.memoryPools.values())
        .reduce((sum, pool) => sum + pool.usedSize, 0);
      
      const totalAvailable = Array.from(this.memoryPools.values())
        .reduce((sum, pool) => sum + pool.totalSize, 0);
      
      const metrics: MemoryOptimizationMetrics = {
        totalMemoryUsage: totalUsed,
        peakMemoryUsage: Math.max(...this.metrics.map(m => m.totalMemoryUsage), totalUsed),
        averageMemoryUsage: this.metrics.length > 0 
          ? this.metrics.reduce((sum, m) => sum + m.totalMemoryUsage, 0) / this.metrics.length
          : totalUsed,
        memoryEfficiency: (totalUsed / totalAvailable) * 100,
        compressionRatio: this.calculateCompressionRatio(),
        cacheHitRate: this.calculateCacheHitRate(),
        gcFrequency: this.calculateGCFrequency(),
        fragmentationLevel: this.calculateFragmentationLevel(),
        streamingPerformance: {
          throughput: this.calculateStreamingThroughput(),
          latency: this.calculateStreamingLatency(),
          errorRate: this.calculateStreamingErrorRate()
        },
        timestamp: new Date()
      };
      
      this.metrics.push(metrics);
      
      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }
      
      this.emit('metricsUpdated', metrics);
    } catch (error) {
      console.error('Metrics collection failed:', error);
    }
  }

  private calculateCompressionRatio(): number {
    const compressedSegments = Array.from(this.activeSegments.values())
      .filter(s => s.compressed && s.compressionRatio);
    
    if (compressedSegments.length === 0) return 1.0;
    
    return compressedSegments.reduce((sum, s) => sum + (s.compressionRatio || 1), 0) / compressedSegments.length;
  }

  private calculateCacheHitRate(): number {
    // Simplified cache hit rate calculation
    return 0.85; // 85% hit rate (placeholder)
  }

  private calculateGCFrequency(): number {
    // Calculate GC frequency based on recent metrics
    return 0.1; // 10% (placeholder)
  }

  private calculateFragmentationLevel(): number {
    // Calculate memory fragmentation level
    return 0.15; // 15% fragmentation (placeholder)
  }

  private calculateStreamingThroughput(): number {
    // Calculate streaming throughput
    return 50 * 1024 * 1024; // 50 MB/s (placeholder)
  }

  private calculateStreamingLatency(): number {
    // Calculate streaming latency
    return 100; // 100ms (placeholder)
  }

  private calculateStreamingErrorRate(): number {
    // Calculate streaming error rate
    return 0.02; // 2% error rate (placeholder)
  }

  private getAvailableWorker(): Worker {
    // Simple round-robin worker selection
    return this.compressionWorkers[Math.floor(Math.random() * this.compressionWorkers.length)];
  }

  private handleWorkerMessage(event: MessageEvent): void {
    const { type, id, error } = event.data;
    
    if (type === 'error') {
      console.error(`Worker error for task ${id}:`, error);
      this.emit('workerError', { taskId: id, error });
    }
  }

  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    this.emit('workerError', { error: error.message });
  }

  private getDefaultStrategies(): LargeDatasetStrategy[] {
    return [
      {
        id: 'ultra-large',
        name: 'Ultra Large Dataset',
        description: 'For datasets > 10GB',
        datasetSizeThreshold: 10 * 1024 * 1024 * 1024, // 10GB
        chunkSize: 128 * 1024 * 1024, // 128MB
        enableStreaming: true,
        enableProgressive: true,
        enableLOD: true,
        compressionLevel: 8,
        prefetchDistance: 2,
        maxConcurrentChunks: 3
      },
      {
        id: 'large',
        name: 'Large Dataset',
        description: 'For datasets 1GB - 10GB',
        datasetSizeThreshold: 1024 * 1024 * 1024, // 1GB
        chunkSize: 64 * 1024 * 1024, // 64MB
        enableStreaming: true,
        enableProgressive: true,
        enableLOD: false,
        compressionLevel: 6,
        prefetchDistance: 3,
        maxConcurrentChunks: 4
      },
      {
        id: 'medium',
        name: 'Medium Dataset',
        description: 'For datasets 100MB - 1GB',
        datasetSizeThreshold: 100 * 1024 * 1024, // 100MB
        chunkSize: 32 * 1024 * 1024, // 32MB
        enableStreaming: false,
        enableProgressive: false,
        enableLOD: false,
        compressionLevel: 4,
        prefetchDistance: 5,
        maxConcurrentChunks: 6
      },
      {
        id: 'small',
        name: 'Small Dataset',
        description: 'For datasets < 100MB',
        datasetSizeThreshold: 0,
        chunkSize: 16 * 1024 * 1024, // 16MB
        enableStreaming: false,
        enableProgressive: false,
        enableLOD: false,
        compressionLevel: 2,
        prefetchDistance: 10,
        maxConcurrentChunks: 8
      }
    ];
  }

  // Public API methods
  public setPerformanceOptimizer(_optimizer: PerformanceOptimizer): void {
    // this._performanceOptimizer = optimizer;
  }

  public setNetworkManager(_network: EnhancedDICOMNetwork): void {
    // this._networkManager = network;
  }

  public getMemoryUsage(): { [poolId: string]: { used: number; total: number; efficiency: number } } {
    const usage: { [poolId: string]: { used: number; total: number; efficiency: number } } = {};
    
    for (const [poolId, pool] of this.memoryPools) {
      usage[poolId] = {
        used: pool.usedSize,
        total: pool.totalSize,
        efficiency: (pool.usedSize / pool.totalSize) * 100
      };
    }
    
    return usage;
  }

  public getMetrics(): MemoryOptimizationMetrics[] {
    return [...this.metrics];
  }

  public getCurrentMetrics(): MemoryOptimizationMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getStreamingJobs(): Record<string, unknown>[] {
    return Array.from(this.streamingJobs.values());
  }

  public updateConfig(updates: Partial<EnhancedMemoryManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public async destroy(): Promise<void> {
    try {
      // Clear intervals
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      if (this.gcInterval) {
        clearInterval(this.gcInterval);
      }

      // Terminate workers
      for (const worker of this.compressionWorkers) {
        worker.terminate();
      }
      this.compressionWorkers = [];

      // Clear memory pools
      this.memoryPools.clear();
      this.activeSegments.clear();
      this.streamingJobs.clear();

      this.isInitialized = false;
      this.emit('destroyed');
      
    } catch (error) {
      console.error('Failed to destroy Enhanced Memory Manager:', error);
    }
  }
}

export default EnhancedMemoryManager;
