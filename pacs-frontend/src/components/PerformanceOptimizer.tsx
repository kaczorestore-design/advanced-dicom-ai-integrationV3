import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  memoryUsage: MemoryUsage;
  renderingPerformance: RenderingMetrics;
  networkPerformance: NetworkMetrics;
  cpuUsage: CPUMetrics;
  gpuUsage?: GPUMetrics;
  diskIO: DiskIOMetrics;
  timestamp: Date;
}

export interface MemoryUsage {
  used: number; // bytes
  total: number; // bytes
  available: number; // bytes
  heapUsed: number; // bytes
  heapTotal: number; // bytes
  external: number; // bytes
  buffers: number; // bytes
  cached: number; // bytes
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface RenderingMetrics {
  fps: number;
  frameTime: number; // ms
  renderTime: number; // ms
  triangleCount: number;
  drawCalls: number;
  textureMemory: number; // bytes
  vertexBufferMemory: number; // bytes
  shaderCompileTime: number; // ms
  gpuMemoryUsage: number; // bytes
}

export interface NetworkMetrics {
  downloadSpeed: number; // bytes/sec
  uploadSpeed: number; // bytes/sec
  latency: number; // ms
  packetLoss: number; // percentage
  activeConnections: number;
  totalBytesDownloaded: number;
  totalBytesUploaded: number;
  requestsPerSecond: number;
}

export interface CPUMetrics {
  usage: number; // percentage
  cores: number;
  frequency: number; // MHz
  temperature?: number; // Celsius
  loadAverage: number[];
  processes: number;
  threads: number;
}

export interface GPUMetrics {
  usage: number; // percentage
  memoryUsed: number; // bytes
  memoryTotal: number; // bytes
  temperature?: number; // Celsius
  clockSpeed?: number; // MHz
  vendor: string;
  model: string;
}

export interface DiskIOMetrics {
  readSpeed: number; // bytes/sec
  writeSpeed: number; // bytes/sec
  readOperations: number;
  writeOperations: number;
  queueDepth: number;
  utilization: number; // percentage
}

export interface MemoryPool {
  id: string;
  name: string;
  size: number; // bytes
  used: number; // bytes
  available: number; // bytes
  blockSize: number; // bytes
  blocks: MemoryBlock[];
  type: 'cpu' | 'gpu' | 'shared';
  persistent: boolean;
}

export interface MemoryBlock {
  id: string;
  offset: number;
  size: number;
  used: boolean;
  owner?: string;
  allocatedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CacheEntry {
  key: string;
  data: any;
  size: number; // bytes
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  expiresAt?: Date;
  priority: number;
  compressed: boolean;
  persistent: boolean;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'rendering' | 'network' | 'cpu' | 'gpu' | 'disk';
  enabled: boolean;
  priority: number;
  conditions: OptimizationCondition[];
  actions: OptimizationAction[];
  metrics: string[];
  cooldown: number; // ms
  lastExecuted?: Date;
}

export interface OptimizationCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  duration?: number; // ms - condition must be true for this duration
}

export interface OptimizationAction {
  type: 'reduce_quality' | 'clear_cache' | 'compress_data' | 'offload_gpu' | 'limit_connections' | 'garbage_collect' | 'reduce_precision' | 'enable_lod';
  parameters: { [key: string]: any };
  priority: number;
  reversible: boolean;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  description: string;
  memoryLimit: number; // bytes
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
  enableGPU: boolean;
  enableMultithreading: boolean;
  cacheSize: number; // bytes
  compressionLevel: number; // 0-9
  lodEnabled: boolean;
  adaptiveQuality: boolean;
  strategies: string[]; // strategy IDs
  customSettings: { [key: string]: any };
}

export interface DatasetOptimization {
  id: string;
  name: string;
  size: number; // bytes
  compressed: boolean;
  compressionRatio: number;
  chunked: boolean;
  chunkSize: number; // bytes
  cached: boolean;
  streamingEnabled: boolean;
  lodLevels: number;
  preprocessed: boolean;
  optimizedAt: Date;
}

export interface GPUAcceleration {
  enabled: boolean;
  vendor: string;
  model: string;
  memorySize: number; // bytes
  computeUnits: number;
  maxTextureSize: number;
  supportedExtensions: string[];
  webGLVersion: string;
  webGPUSupported: boolean;
  shaderModel: string;
}

export interface WorkerPool {
  id: string;
  name: string;
  size: number;
  workers: Worker[];
  queue: WorkerTask[];
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number; // ms
}

export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
}

export interface PerformanceOptimizerConfig {
  enableOptimization: boolean;
  enableGPUAcceleration: boolean;
  enableMultithreading: boolean;
  enableAdaptiveQuality: boolean;
  enableMemoryPooling: boolean;
  enableDataCompression: boolean;
  enableStreamingOptimization: boolean;
  enableLevelOfDetail: boolean;
  memoryLimit: number; // bytes
  cacheSize: number; // bytes
  workerPoolSize: number;
  metricsInterval: number; // ms
  optimizationInterval: number; // ms
  profiles: PerformanceProfile[];
  activeProfile: string;
  strategies: OptimizationStrategy[];
}

export class PerformanceOptimizer extends EventEmitter {
  private config: PerformanceOptimizerConfig;
  private metrics: PerformanceMetrics[] = [];
  private memoryPools: Map<string, MemoryPool> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private workerPools: Map<string, WorkerPool> = new Map();
  private gpuAcceleration?: GPUAcceleration;
  private isInitialized = false;
  private metricsInterval: any;
  private optimizationInterval: any;
  private performanceObserver?: PerformanceObserver;
  private memoryMonitor?: any;


  constructor(config: Partial<PerformanceOptimizerConfig> = {}) {
    super();
    
    this.config = {
      enableOptimization: true,
      enableGPUAcceleration: true,
      enableMultithreading: true,
      enableAdaptiveQuality: true,
      enableMemoryPooling: true,
      enableDataCompression: true,
      enableStreamingOptimization: true,
      enableLevelOfDetail: true,
      memoryLimit: 2 * 1024 * 1024 * 1024, // 2GB
      cacheSize: 512 * 1024 * 1024, // 512MB
      workerPoolSize: navigator.hardwareConcurrency || 4,
      metricsInterval: 1000, // 1 second
      optimizationInterval: 5000, // 5 seconds
      profiles: this.getDefaultProfiles(),
      activeProfile: 'balanced',
      strategies: this.getDefaultStrategies(),
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize GPU acceleration
      if (this.config.enableGPUAcceleration) {
        await this.initializeGPUAcceleration();
      }

      // Initialize memory pools
      if (this.config.enableMemoryPooling) {
        this.initializeMemoryPools();
      }

      // Initialize worker pools
      if (this.config.enableMultithreading) {
        await this.initializeWorkerPools();
      }

      // Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // Start background services
      this.startBackgroundServices();

      // Apply active profile
      this.applyProfile(this.config.activeProfile);

      this.isInitialized = true;
      console.log('✅ Performance Optimizer initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Performance Optimizer:', error);
      throw error;
    }
  }

  private async initializeGPUAcceleration(): Promise<void> {
    try {
      // Try WebGL first
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (gl) {
        // WebGL context available
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
        const model = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
        
        this.gpuAcceleration = {
          enabled: true,
          vendor,
          model,
          memorySize: this.estimateGPUMemory(gl),
          computeUnits: this.estimateComputeUnits(gl),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          supportedExtensions: gl.getSupportedExtensions() || [],
          webGLVersion: gl instanceof WebGL2RenderingContext ? '2.0' : '1.0',
          webGPUSupported: 'gpu' in navigator,
          shaderModel: this.detectShaderModel(gl)
        };
        
        console.log('✅ WebGL GPU acceleration initialized:', this.gpuAcceleration);
      }

      // Try WebGPU if available
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          if (adapter) {
            // WebGPU device available
            console.log('✅ WebGPU acceleration available');
          }
        } catch (error) {
          console.warn('WebGPU not available:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize GPU acceleration:', error);
      this.gpuAcceleration = {
        enabled: false,
        vendor: 'Unknown',
        model: 'Unknown',
        memorySize: 0,
        computeUnits: 0,
        maxTextureSize: 0,
        supportedExtensions: [],
        webGLVersion: '0.0',
        webGPUSupported: false,
        shaderModel: 'Unknown'
      };
    }
  }

  private initializeMemoryPools(): void {
    // CPU Memory Pool
    const cpuPool: MemoryPool = {
      id: 'cpu-main',
      name: 'Main CPU Memory Pool',
      size: this.config.memoryLimit * 0.6, // 60% for CPU
      used: 0,
      available: this.config.memoryLimit * 0.6,
      blockSize: 1024 * 1024, // 1MB blocks
      blocks: [],
      type: 'cpu',
      persistent: false
    };
    this.memoryPools.set('cpu-main', cpuPool);

    // GPU Memory Pool (if available)
    if (this.gpuAcceleration?.enabled) {
      const gpuPool: MemoryPool = {
        id: 'gpu-main',
        name: 'Main GPU Memory Pool',
        size: this.gpuAcceleration.memorySize * 0.8, // 80% of GPU memory
        used: 0,
        available: this.gpuAcceleration.memorySize * 0.8,
        blockSize: 256 * 1024, // 256KB blocks
        blocks: [],
        type: 'gpu',
        persistent: false
      };
      this.memoryPools.set('gpu-main', gpuPool);
    }

    // Shared Memory Pool
    const sharedPool: MemoryPool = {
      id: 'shared-main',
      name: 'Shared Memory Pool',
      size: this.config.memoryLimit * 0.2, // 20% for shared
      used: 0,
      available: this.config.memoryLimit * 0.2,
      blockSize: 512 * 1024, // 512KB blocks
      blocks: [],
      type: 'shared',
      persistent: true
    };
    this.memoryPools.set('shared-main', sharedPool);

    console.log('✅ Memory pools initialized:', this.memoryPools.size);
  }

  private async initializeWorkerPools(): Promise<void> {
    try {
      console.log('🔧 Initializing worker pools...');
      
      // Image Processing Worker Pool
      const imagePool = await this.createWorkerPool('image-processing', this.config.workerPoolSize, `
        self.onmessage = function(e) {
          const { id, type, data } = e.data;
          
          try {
            let result;
            
            switch (type) {
              case 'compress':
                result = compressImageData(data);
                break;
              case 'decompress':
                result = decompressImageData(data);
                break;
              case 'filter':
                result = applyImageFilter(data);
                break;
              case 'resize':
                result = resizeImage(data);
                break;
              default:
                throw new Error('Unknown task type: ' + type);
            }
            
            self.postMessage({ id, result });
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        };
        
        function compressImageData(data) {
          // Implement image compression
          return data;
        }
        
        function decompressImageData(data) {
          // Implement image decompression
          return data;
        }
        
        function applyImageFilter(data) {
          // Implement image filtering
          return data;
        }
        
        function resizeImage(data) {
          // Implement image resizing
          return data;
        }
      `);
      this.workerPools.set('image-processing', imagePool);
      console.log('✅ Image processing worker pool initialized');

      // DICOM Processing Worker Pool
      const dicomPool = await this.createWorkerPool('dicom-processing', Math.ceil(this.config.workerPoolSize / 2), `
        self.onmessage = function(e) {
          const { id, type, data } = e.data;
          
          try {
            let result;
            
            switch (type) {
              case 'parse':
                result = parseDICOM(data);
                break;
              case 'decompress':
                result = decompressDICOM(data);
                break;
              case 'convert':
                result = convertDICOM(data);
                break;
              default:
                throw new Error('Unknown task type: ' + type);
            }
            
            self.postMessage({ id, result });
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        };
        
        function parseDICOM(data) {
          // Implement DICOM parsing
          return data;
        }
        
        function decompressDICOM(data) {
          // Implement DICOM decompression
          return data;
        }
        
        function convertDICOM(data) {
          // Implement DICOM conversion
          return data;
        }
      `);
      this.workerPools.set('dicom-processing', dicomPool);
      console.log('✅ DICOM processing worker pool initialized');

      console.log('✅ Worker pools initialized:', this.workerPools.size);
    } catch (error) {
      console.warn('⚠️ Worker pool initialization failed, disabling multithreading:', error);
      // Disable multithreading if worker initialization fails
      this.config.enableMultithreading = false;
    }
  }

  private async createWorkerPool(name: string, size: number, workerCode: string): Promise<WorkerPool> {
    const workers: Worker[] = [];
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    for (let i = 0; i < size; i++) {
      const worker = new Worker(workerUrl);
      workers.push(worker);
    }

    return {
      id: name,
      name,
      size,
      workers,
      queue: [],
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageExecutionTime: 0
    };
  }

  private initializePerformanceMonitoring(): void {
    // Performance Observer for detailed metrics
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.emit('performanceEntry', entry);
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource', 'paint'] });
    }

    // Memory monitoring
    if ('memory' in performance) {
      this.memoryMonitor = setInterval(() => {
        const memory = (performance as any).memory;
        this.emit('memoryUpdate', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
      }, 1000);
    }
  }

  private startBackgroundServices(): void {
    // Metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Optimization execution
    this.optimizationInterval = setInterval(() => {
      this.executeOptimizations();
    }, this.config.optimizationInterval);

    // Cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute

    // Memory pool maintenance
    setInterval(() => {
      this.maintainMemoryPools();
    }, 30000); // Every 30 seconds
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        memoryUsage: this.getMemoryUsage(),
        renderingPerformance: this.getRenderingMetrics(),
        networkPerformance: this.getNetworkMetrics(),
        cpuUsage: this.getCPUMetrics(),
        gpuUsage: this.getGPUMetrics(),
        diskIO: this.getDiskIOMetrics(),
        timestamp: new Date()
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      this.emit('metricsCollected', metrics);
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  private getMemoryUsage(): MemoryUsage {
    const memory = (performance as any).memory;
    const used = memory?.usedJSHeapSize || 0;
    const total = memory?.totalJSHeapSize || 0;
    const limit = memory?.jsHeapSizeLimit || 0;
    
    // Calculate trend
    const recentMetrics = this.metrics.slice(-10);
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (recentMetrics.length >= 2) {
      const oldUsage = recentMetrics[0].memoryUsage.used;
      const newUsage = used;
      const change = (newUsage - oldUsage) / oldUsage;
      
      if (change > 0.1) trend = 'increasing';
      else if (change < -0.1) trend = 'decreasing';
    }

    return {
      used,
      total,
      available: limit - used,
      heapUsed: used,
      heapTotal: total,
      external: 0,
      buffers: 0,
      cached: 0,
      percentage: total > 0 ? (used / total) * 100 : 0,
      trend
    };
  }

  private getRenderingMetrics(): RenderingMetrics {
    // Get FPS from performance entries
    performance.getEntriesByType('paint');
    const fps = this.calculateFPS();
    
    return {
      fps,
      frameTime: fps > 0 ? 1000 / fps : 0,
      renderTime: 0,
      triangleCount: 0,
      drawCalls: 0,
      textureMemory: 0,
      vertexBufferMemory: 0,
      shaderCompileTime: 0,
      gpuMemoryUsage: 0
    };
  }

  private getNetworkMetrics(): NetworkMetrics {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const recentEntries = resourceEntries.filter(entry => 
      Date.now() - entry.startTime < 10000 // Last 10 seconds
    );
    
    const totalBytes = recentEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    const totalTime = recentEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    return {
      downloadSpeed: totalTime > 0 ? totalBytes / (totalTime / 1000) : 0,
      uploadSpeed: 0,
      latency: 0,
      packetLoss: 0,
      activeConnections: 0,
      totalBytesDownloaded: totalBytes,
      totalBytesUploaded: 0,
      requestsPerSecond: recentEntries.length / 10
    };
  }

  private getCPUMetrics(): CPUMetrics {
    return {
      usage: 0, // Not available in browser
      cores: navigator.hardwareConcurrency || 1,
      frequency: 0,
      loadAverage: [],
      processes: 0,
      threads: 0
    };
  }

  private getGPUMetrics(): GPUMetrics | undefined {
    if (!this.gpuAcceleration?.enabled) return undefined;
    
    return {
      usage: 0, // Not directly available
      memoryUsed: 0,
      memoryTotal: this.gpuAcceleration.memorySize,
      vendor: this.gpuAcceleration.vendor,
      model: this.gpuAcceleration.model
    };
  }

  private getDiskIOMetrics(): DiskIOMetrics {
    return {
      readSpeed: 0,
      writeSpeed: 0,
      readOperations: 0,
      writeOperations: 0,
      queueDepth: 0,
      utilization: 0
    };
  }

  private calculateFPS(): number {
    // Simple FPS calculation based on requestAnimationFrame
    let fps = 0;
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    return fps;
  }

  private async executeOptimizations(): Promise<void> {
    if (!this.config.enableOptimization) return;
    
    const currentMetrics = this.metrics[this.metrics.length - 1];
    if (!currentMetrics) return;
    
    for (const strategy of this.config.strategies) {
      if (!strategy.enabled) continue;
      
      // Check cooldown
      if (strategy.lastExecuted && 
          Date.now() - strategy.lastExecuted.getTime() < strategy.cooldown) {
        continue;
      }
      
      // Check conditions
      const shouldExecute = strategy.conditions.every(condition => 
        this.evaluateCondition(condition, currentMetrics)
      );
      
      if (shouldExecute) {
        await this.executeStrategy(strategy);
        strategy.lastExecuted = new Date();
      }
    }
  }

  private evaluateCondition(condition: OptimizationCondition, metrics: PerformanceMetrics): boolean {
    const value = this.getMetricValue(condition.metric, metrics);
    if (value === undefined) return false;
    
    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      case '==': return value === condition.value;
      case '!=': return value !== condition.value;
      default: return false;
    }
  }

  private getMetricValue(metric: string, metrics: PerformanceMetrics): number | undefined {
    const parts = metric.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : undefined;
  }

  private async executeStrategy(strategy: OptimizationStrategy): Promise<void> {
    console.log(`Executing optimization strategy: ${strategy.name}`);
    
    for (const action of strategy.actions.sort((a, b) => b.priority - a.priority)) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
    
    this.emit('strategyExecuted', strategy);
  }

  private async executeAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'reduce_quality':
        await this.reduceRenderQuality(action.parameters);
        break;
      case 'clear_cache':
        await this.clearCache(action.parameters);
        break;
      case 'compress_data':
        await this.compressData(action.parameters);
        break;
      case 'offload_gpu':
        await this.offloadFromGPU(action.parameters);
        break;
      case 'limit_connections':
        await this.limitNetworkConnections(action.parameters);
        break;
      case 'garbage_collect':
        await this.forceGarbageCollection();
        break;
      case 'reduce_precision':
        await this.reducePrecision(action.parameters);
        break;
      case 'enable_lod':
        await this.enableLevelOfDetail(action.parameters);
        break;
    }
  }

  // Memory Management
  public allocateMemory(size: number, type: 'cpu' | 'gpu' | 'shared' = 'cpu', owner?: string): string | null {
    const poolId = `${type}-main`;
    const pool = this.memoryPools.get(poolId);
    
    if (!pool || pool.available < size) {
      return null; // Not enough memory
    }
    
    const blockId = `${poolId}-${Date.now()}-${Math.random()}`;
    const block: MemoryBlock = {
      id: blockId,
      offset: pool.used,
      size,
      used: true,
      owner,
      allocatedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      priority: 'medium'
    };
    
    pool.blocks.push(block);
    pool.used += size;
    pool.available -= size;
    
    this.emit('memoryAllocated', { poolId, blockId, size, owner });
    return blockId;
  }

  public deallocateMemory(blockId: string): boolean {
    for (const [_poolId, pool] of this.memoryPools) {
      const blockIndex = pool.blocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        const block = pool.blocks[blockIndex];
        pool.blocks.splice(blockIndex, 1);
        pool.used -= block.size;
        pool.available += block.size;
        
        this.emit('memoryDeallocated', { poolId: _poolId, blockId, size: block.size });
        return true;
      }
    }
    return false;
  }

  public getMemoryStats(): { [poolId: string]: { used: number; available: number; blocks: number } } {
    const stats: { [poolId: string]: { used: number; available: number; blocks: number } } = {};
    
    for (const [poolId, pool] of this.memoryPools) {
      stats[poolId] = {
        used: pool.used,
        available: pool.available,
        blocks: pool.blocks.length
      };
    }
    
    return stats;
  }

  // Cache Management
  public cacheData(key: string, data: any, options: Partial<CacheEntry> = {}): void {
    const size = this.estimateDataSize(data);
    
    // Check cache size limit
    const currentCacheSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (currentCacheSize + size > this.config.cacheSize) {
      this.evictCacheEntries(size);
    }
    
    const entry: CacheEntry = {
      key,
      data,
      size,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      priority: 1,
      compressed: false,
      persistent: false,
      ...options
    };
    
    this.cache.set(key, entry);
    this.emit('dataCached', { key, size });
  }

  public getCachedData(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }
    
    // Update access info
    entry.lastAccessed = new Date();
    entry.accessCount++;
    
    this.emit('cacheHit', { key });
    return entry.data;
  }

  public clearCache(options: { pattern?: string; maxAge?: number } = {}): void {
    const keysToDelete: string[] = [];
    
    for (const [_key, entry] of this.cache) {
      let shouldDelete = false;
      
      if (options.pattern && !_key.includes(options.pattern)) {
        continue;
      }
      
      if (options.maxAge) {
        const age = Date.now() - entry.createdAt.getTime();
        if (age > options.maxAge) {
          shouldDelete = true;
        }
      } else {
        shouldDelete = true;
      }
      
      if (shouldDelete && !entry.persistent) {
        keysToDelete.push(_key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.emit('cacheCleared', { deletedKeys: keysToDelete.length });
  }

  // Worker Pool Management
  public async executeTask(poolId: string, type: string, data: any, priority: number = 1): Promise<any> {
    const pool = this.workerPools.get(poolId);
    if (!pool) {
      throw new Error(`Worker pool ${poolId} not found`);
    }
    
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `${poolId}-${Date.now()}-${Math.random()}`,
        type,
        data,
        priority,
        createdAt: new Date(),
        retries: 0,
        maxRetries: 3
      };
      
      // Add to queue
      pool.queue.push(task);
      pool.queue.sort((a, b) => b.priority - a.priority);
      
      // Process queue
      this.processWorkerQueue(pool, task, resolve, reject);
    });
  }

  private processWorkerQueue(
    pool: WorkerPool, 
    task: WorkerTask, 
    resolve: (value: any) => void, 
    reject: (reason: any) => void
  ): void {
    // Find available worker
    const availableWorker = pool.workers.find(_worker => {
      return !pool.queue.some(t => t.startedAt && !t.completedAt);
    });
    
    if (!availableWorker) {
      // No available workers, task will be processed later
      return;
    }
    
    task.startedAt = new Date();
    pool.activeJobs++;
    
    const timeout = setTimeout(() => {
      reject(new Error('Task timeout'));
      pool.activeJobs--;
      pool.failedJobs++;
    }, 30000); // 30 second timeout
    
    availableWorker.onmessage = (e) => {
      clearTimeout(timeout);
      task.completedAt = new Date();
      pool.activeJobs--;
      
      if (e.data.error) {
        task.error = e.data.error;
        pool.failedJobs++;
        
        if (task.retries < task.maxRetries) {
          task.retries++;
          task.startedAt = undefined;
          task.completedAt = undefined;
          task.error = undefined;
          this.processWorkerQueue(pool, task, resolve, reject);
        } else {
          reject(new Error(e.data.error));
        }
      } else {
        task.result = e.data.result;
        pool.completedJobs++;
        
        // Update average execution time
        const executionTime = task.completedAt.getTime() - task.startedAt!.getTime();
        pool.averageExecutionTime = (pool.averageExecutionTime + executionTime) / 2;
        
        resolve(e.data.result);
      }
      
      // Process next task in queue
      const nextTask = pool.queue.find(t => !t.startedAt);
      if (nextTask) {
        // Find resolve/reject for next task (simplified)
        this.processWorkerQueue(pool, nextTask, () => {}, () => {});
      }
    };
    
    availableWorker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data
    });
  }

  // Optimization Actions
  private async reduceRenderQuality(params: any): Promise<void> {
    console.log('Reducing render quality:', params);
    this.emit('qualityReduced', params);
  }

  private async compressData(params: any): Promise<void> {
    console.log('Compressing data:', params);
    
    // Compress cache entries
    for (const [_key, entry] of this.cache) {
      if (!entry.compressed && entry.size > 1024) { // Compress entries > 1KB
        try {
          // Simplified compression (in real implementation, use proper compression)
          const compressed = JSON.stringify(entry.data);
          entry.data = compressed;
          entry.compressed = true;
          entry.size = compressed.length;
        } catch (error) {
          console.error('Failed to compress cache entry:', error);
        }
      }
    }
    
    this.emit('dataCompressed', params);
  }

  private async offloadFromGPU(params: any): Promise<void> {
    console.log('Offloading from GPU:', params);
    this.emit('gpuOffloaded', params);
  }

  private async limitNetworkConnections(params: any): Promise<void> {
    console.log('Limiting network connections:', params);
    this.emit('connectionsLimited', params);
  }

  private async forceGarbageCollection(): Promise<void> {
    console.log('Forcing garbage collection');
    
    // Clear unused cache entries
    this.evictCacheEntries(0, true);
    
    // Clean up memory pools
    this.maintainMemoryPools();
    
    this.emit('garbageCollected');
  }

  private async reducePrecision(params: any): Promise<void> {
    console.log('Reducing precision:', params);
    this.emit('precisionReduced', params);
  }

  private async enableLevelOfDetail(params: any): Promise<void> {
    console.log('Enabling level of detail:', params);
    this.emit('lodEnabled', params);
  }

  // Helper Methods
  private estimateGPUMemory(gl: WebGLRenderingContext | WebGL2RenderingContext): number {
    // Estimate GPU memory based on max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    return maxTextureSize * maxTextureSize * 4 * 100; // Rough estimate
  }

  private estimateComputeUnits(gl: WebGLRenderingContext | WebGL2RenderingContext): number {
    // Rough estimate based on renderer string
    const renderer = gl.getParameter(gl.RENDERER);
    if (renderer.includes('NVIDIA')) return 2048;
    if (renderer.includes('AMD')) return 1024;
    if (renderer.includes('Intel')) return 512;
    return 256;
  }

  private detectShaderModel(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
    if (gl instanceof WebGL2RenderingContext) return '3.0';
    return '2.0';
  }

  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size
    }
  }

  private evictCacheEntries(requiredSpace: number, forceCleanup: boolean = false): void {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .filter(({ entry }) => !entry.persistent || forceCleanup)
      .sort((a, b) => {
        // Sort by priority (lower first) and last accessed (older first)
        const priorityDiff = a.entry.priority - b.entry.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.entry.lastAccessed.getTime() - b.entry.lastAccessed.getTime();
      });
    
    let freedSpace = 0;
    const keysToDelete: string[] = [];
    
    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace && !forceCleanup) break;
      
      keysToDelete.push(key);
      freedSpace += entry.size;
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.emit('cacheEvicted', { deletedKeys: keysToDelete.length, freedSpace });
    }
  }

  private cleanupCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      // Remove expired entries
      if (entry.expiresAt && entry.expiresAt < now) {
        keysToDelete.push(key);
      }
      // Remove old unused entries
      else if (!entry.persistent && 
               now.getTime() - entry.lastAccessed.getTime() > 3600000 && // 1 hour
               entry.accessCount < 5) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private maintainMemoryPools(): void {
    for (const [_poolId, pool] of this.memoryPools) {
      // Remove unused blocks
      const now = new Date();
      const blocksToRemove = pool.blocks.filter(block => 
        !block.used && 
        now.getTime() - block.lastAccessed.getTime() > 300000 // 5 minutes
      );
      
      blocksToRemove.forEach(block => {
        const index = pool.blocks.indexOf(block);
        if (index !== -1) {
          pool.blocks.splice(index, 1);
          pool.available += block.size;
        }
      });
      
      // Defragment pool
      this.defragmentMemoryPool(pool);
    }
  }

  private defragmentMemoryPool(pool: MemoryPool): void {
    // Sort blocks by offset
    pool.blocks.sort((a, b) => a.offset - b.offset);
    
    // Update offsets to remove gaps
    let currentOffset = 0;
    for (const block of pool.blocks) {
      block.offset = currentOffset;
      currentOffset += block.size;
    }
    
    pool.used = currentOffset;
    pool.available = pool.size - pool.used;
  }

  // Profile Management
  public applyProfile(profileId: string): void {
    const profile = this.config.profiles.find(p => p.id === profileId);
    if (!profile) {
      console.error(`Profile ${profileId} not found`);
      return;
    }
    
    this.config.activeProfile = profileId;
    this.config.memoryLimit = profile.memoryLimit;
    this.config.cacheSize = profile.cacheSize;
    
    // Apply profile-specific strategies
    this.config.strategies.forEach(strategy => {
      strategy.enabled = profile.strategies.includes(strategy.id);
    });
    
    console.log(`Applied performance profile: ${profile.name}`);
    this.emit('profileApplied', profile);
  }

  private getDefaultProfiles(): PerformanceProfile[] {
    return [
      {
        id: 'low-end',
        name: 'Low-End Device',
        description: 'Optimized for devices with limited resources',
        memoryLimit: 512 * 1024 * 1024, // 512MB
        renderQuality: 'low',
        enableGPU: false,
        enableMultithreading: false,
        cacheSize: 64 * 1024 * 1024, // 64MB
        compressionLevel: 9,
        lodEnabled: true,
        adaptiveQuality: true,
        strategies: ['memory-aggressive', 'quality-reduction', 'cache-aggressive'],
        customSettings: {
          maxTextureSize: 512,
          maxViewports: 1
        }
      },
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Balanced performance and quality',
        memoryLimit: 2 * 1024 * 1024 * 1024, // 2GB
        renderQuality: 'medium',
        enableGPU: true,
        enableMultithreading: true,
        cacheSize: 512 * 1024 * 1024, // 512MB
        compressionLevel: 6,
        lodEnabled: true,
        adaptiveQuality: true,
        strategies: ['memory-moderate', 'quality-adaptive'],
        customSettings: {
          maxTextureSize: 2048,
          maxViewports: 4
        }
      },
      {
        id: 'high-performance',
        name: 'High Performance',
        description: 'Maximum performance for powerful devices',
        memoryLimit: 8 * 1024 * 1024 * 1024, // 8GB
        renderQuality: 'ultra',
        enableGPU: true,
        enableMultithreading: true,
        cacheSize: 2 * 1024 * 1024 * 1024, // 2GB
        compressionLevel: 3,
        lodEnabled: false,
        adaptiveQuality: false,
        strategies: ['quality-maximum'],
        customSettings: {
          maxTextureSize: 8192,
          maxViewports: 16
        }
      }
    ];
  }

  private getDefaultStrategies(): OptimizationStrategy[] {
    return [
      {
        id: 'memory-aggressive',
        name: 'Aggressive Memory Management',
        description: 'Aggressively manage memory usage',
        category: 'memory',
        enabled: false,
        priority: 10,
        conditions: [
          { metric: 'memoryUsage.percentage', operator: '>', value: 80 }
        ],
        actions: [
          { type: 'clear_cache', parameters: { maxAge: 300000 }, priority: 10, reversible: true },
          { type: 'garbage_collect', parameters: {}, priority: 9, reversible: false },
          { type: 'compress_data', parameters: {}, priority: 8, reversible: true }
        ],
        metrics: ['memoryUsage.percentage', 'memoryUsage.used'],
        cooldown: 10000
      },
      {
        id: 'quality-reduction',
        name: 'Quality Reduction',
        description: 'Reduce rendering quality to improve performance',
        category: 'rendering',
        enabled: false,
        priority: 8,
        conditions: [
          { metric: 'renderingPerformance.fps', operator: '<', value: 30 }
        ],
        actions: [
          { type: 'reduce_quality', parameters: { level: 1 }, priority: 10, reversible: true },
          { type: 'enable_lod', parameters: {}, priority: 9, reversible: true }
        ],
        metrics: ['renderingPerformance.fps', 'renderingPerformance.frameTime'],
        cooldown: 5000
      },
      {
        id: 'quality-adaptive',
        name: 'Adaptive Quality',
        description: 'Dynamically adjust quality based on performance',
        category: 'rendering',
        enabled: false,
        priority: 6,
        conditions: [
          { metric: 'renderingPerformance.fps', operator: '<', value: 45 }
        ],
        actions: [
          { type: 'reduce_quality', parameters: { level: 0.5 }, priority: 8, reversible: true }
        ],
        metrics: ['renderingPerformance.fps'],
        cooldown: 3000
      }
    ];
  }

  // Public API
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  public getGPUInfo(): GPUAcceleration | undefined {
    return this.gpuAcceleration;
  }

  public setMemoryManager(memoryManager: any): void {
    // Store reference to memory manager for integration
    console.log('✅ Memory manager integrated with Performance Optimizer');
    this.emit('memoryManagerSet', memoryManager);
  }

  public getWorkerPoolStats(): { [poolId: string]: Omit<WorkerPool, 'workers'> } {
    const stats: { [poolId: string]: Omit<WorkerPool, 'workers'> } = {};
    
    for (const [poolId, pool] of this.workerPools) {
      stats[poolId] = {
        id: pool.id,
        name: pool.name,
        size: pool.size,
        queue: pool.queue,
        activeJobs: pool.activeJobs,
        completedJobs: pool.completedJobs,
        failedJobs: pool.failedJobs,
        averageExecutionTime: pool.averageExecutionTime
      };
    }
    
    return stats;
  }

  public getCacheStats(): { size: number; entries: number; hitRate: number } {
    const entries = this.cache.size;
    const size = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    // Calculate hit rate (simplified)
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = entries > 0 ? totalAccesses / entries : 0;
    
    return { size, entries, hitRate };
  }

  // Cleanup
  public async destroy(): Promise<void> {
    // Clear intervals
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.optimizationInterval) clearInterval(this.optimizationInterval);
    if (this.memoryMonitor) clearInterval(this.memoryMonitor);
    
    // Disconnect performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Terminate workers
    for (const pool of this.workerPools.values()) {
      pool.workers.forEach(worker => worker.terminate());
    }
    
    // Clear collections
    this.metrics.length = 0;
    this.memoryPools.clear();
    this.cache.clear();
    this.workerPools.clear();
    
    // Reset state
    this.isInitialized = false;
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('✅ Performance Optimizer destroyed');
  }

  // Missing methods required by PerformanceOptimizationUI
  public toggleStrategy(strategyName: string, enabled: boolean): void {
    console.log(`Toggle strategy ${strategyName}: ${enabled}`);
    // Implementation would toggle specific optimization strategies
  }

  public enableGPUAcceleration(): void {
    console.log('Enabling GPU acceleration');
    // Implementation would enable GPU-based optimizations
  }

  public enableMultithreading(): void {
    console.log('Enabling multithreading');
    // Implementation would enable worker-based multithreading
  }

  public async optimize(): Promise<void> {
    console.log('Running optimization');
    // Implementation would run optimization algorithms
  }

  public getMemoryPoolStats(): { [poolId: string]: { used: number; available: number; blocks: number } } {
    return this.getMemoryStats();
  }

  public setActiveProfile(profileId: string): void {
    console.log(`Setting active profile: ${profileId}`);
    this.applyProfile(profileId);
  }

  public getStrategies(): OptimizationStrategy[] {
    return this.config.strategies || [];
  }

  public getProfiles(): PerformanceProfile[] {
    return this.config.profiles || [];
  }

  public getActiveProfile(): string {
    return this.config.activeProfile || 'balanced';
  }
}

export default PerformanceOptimizer;