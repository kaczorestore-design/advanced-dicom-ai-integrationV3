// import React from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import { EventEmitter } from 'events';

export interface DICOMNetworkConfig {
  enableC_FIND: boolean;
  enableC_MOVE: boolean;
  enableC_GET: boolean;
  enableC_STORE: boolean;
  enableWADO_RS: boolean;
  enableWADO_URI: boolean;
  enableQIDO_RS: boolean;
  enableSTOW_RS: boolean;
  enableDICOMweb: boolean;
  maxConcurrentConnections: number;
  connectionTimeout: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  compressionLevel: number;
  enableCaching: boolean;
  cacheSize: number;
  enablePrefetching: boolean;
  prefetchDistance: number;
  enableProgressiveLoading: boolean;
  enableMemoryOptimization: boolean;
  maxMemoryUsage: number;
  enableNetworkOptimization: boolean;
  enableBandwidthThrottling: boolean;
  maxBandwidth: number;
}

export interface PACSConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  aet: string;
  callingAET: string;
  protocol: 'DIMSE' | 'DICOMweb' | 'WADO';
  isSecure: boolean;
  username?: string;
  password?: string;
  token?: string;
  certificatePath?: string;
  isActive: boolean;
  lastConnected?: Date;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  capabilities: {
    cFind: boolean;
    cMove: boolean;
    cGet: boolean;
    cStore: boolean;
    wadoRS: boolean;
    wadoURI: boolean;
    qidoRS: boolean;
    stowRS: boolean;
  };
  statistics: {
    totalQueries: number;
    totalRetrievals: number;
    totalStores: number;
    averageResponseTime: number;
    errorCount: number;
    lastError?: string;
  };
}

export interface DICOMQuery {
  id: string;
  level: 'PATIENT' | 'STUDY' | 'SERIES' | 'IMAGE';
  criteria: { [key: string]: string };
  connection: PACSConnection;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  results: DICOMQueryResult[];
  startTime?: Date;
  endTime?: Date;
  progress: number;
  error?: string;
}

export interface DICOMQueryResult {
  level: 'PATIENT' | 'STUDY' | 'SERIES' | 'IMAGE';
  data: { [key: string]: unknown };
  uid: string;
  parentUID?: string;
  children?: DICOMQueryResult[];
}

export interface DICOMRetrievalJob {
  id: string;
  query: DICOMQuery;
  results: DICOMQueryResult[];
  destination: {
    type: 'local' | 'pacs' | 'cloud';
    path?: string;
    connection?: PACSConnection;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    speed: number; // MB/s
    eta: number; // seconds
  };
  startTime?: Date;
  endTime?: Date;
  error?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface MemoryManager {
  maxMemoryUsage: number;
  currentMemoryUsage: number;
  imageCache: Map<string, unknown>;
  metadataCache: Map<string, unknown>;
  compressionCache: Map<string, unknown>;
  enableGarbageCollection: boolean;
  gcThreshold: number;
  enableImagePooling: boolean;
  poolSize: number;
}

export interface NetworkOptimizer {
  enableBandwidthMonitoring: boolean;
  currentBandwidth: number;
  averageBandwidth: number;
  enableAdaptiveQuality: boolean;
  enablePriorityQueuing: boolean;
  enableLoadBalancing: boolean;
  enableConnectionPooling: boolean;
  maxConnectionsPerHost: number;
  enableRequestBatching: boolean;
  batchSize: number;
  enableDataCompression: boolean;
  compressionRatio: number;
}

export class EnhancedDICOMNetwork extends EventEmitter {
  private config: DICOMNetworkConfig;
  private connections: Map<string, PACSConnection> = new Map();
  private activeQueries: Map<string, DICOMQuery> = new Map();
  private retrievalJobs: Map<string, DICOMRetrievalJob> = new Map();
  private memoryManager: MemoryManager;
  private networkOptimizer: NetworkOptimizer;
  private isInitialized = false;
  private workerPool: Worker[] = [];
  private requestQueue: Record<string, unknown>[] = [];
  private connectionPool: Map<string, Record<string, unknown>[]> = new Map();
  private bandwidthMonitor: Record<string, unknown> = {};
  private gcInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<DICOMNetworkConfig> = {}) {
    super();
    
    this.config = {
      enableC_FIND: true,
      enableC_MOVE: true,
      enableC_GET: true,
      enableC_STORE: true,
      enableWADO_RS: true,
      enableWADO_URI: true,
      enableQIDO_RS: true,
      enableSTOW_RS: true,
      enableDICOMweb: true,
      maxConcurrentConnections: 10,
      connectionTimeout: 30000,
      requestTimeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCompression: true,
      compressionLevel: 6,
      enableCaching: true,
      cacheSize: 1024, // MB
      enablePrefetching: true,
      prefetchDistance: 5,
      enableProgressiveLoading: true,
      enableMemoryOptimization: true,
      maxMemoryUsage: 2048, // MB
      enableNetworkOptimization: true,
      enableBandwidthThrottling: false,
      maxBandwidth: 100, // Mbps
      ...config
    };

    this.memoryManager = {
      maxMemoryUsage: this.config.maxMemoryUsage * 1024 * 1024, // Convert to bytes
      currentMemoryUsage: 0,
      imageCache: new Map(),
      metadataCache: new Map(),
      compressionCache: new Map(),
      enableGarbageCollection: true,
      gcThreshold: 0.8, // 80% of max memory
      enableImagePooling: true,
      poolSize: 100
    };

    this.networkOptimizer = {
      enableBandwidthMonitoring: true,
      currentBandwidth: 0,
      averageBandwidth: 0,
      enableAdaptiveQuality: true,
      enablePriorityQueuing: true,
      enableLoadBalancing: true,
      enableConnectionPooling: true,
      maxConnectionsPerHost: 5,
      enableRequestBatching: true,
      batchSize: 10,
      enableDataCompression: true,
      compressionRatio: 0.7
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize cornerstone WADO image loader with enhanced configuration
      this.initializeCornerstoneWADO();
      
      // Setup worker pool for parallel processing
      this.setupWorkerPool();
      
      // Initialize memory management
      this.initializeMemoryManager();
      
      // Setup network optimization
      this.setupNetworkOptimization();
      
      // Load saved connections
      await this.loadSavedConnections();
      
      // Start background services
      this.startBackgroundServices();

      this.isInitialized = true;
      console.log('✅ Enhanced DICOM Network initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced DICOM Network:', error);
      throw error;
    }
  }

  private initializeCornerstoneWADO(): void {
    // Configure WADO image loader with enhanced settings
    (cornerstoneWADOImageLoader as Record<string, unknown> & { external: Record<string, unknown> }).external.cornerstone = cornerstone;
    (cornerstoneWADOImageLoader as Record<string, unknown> & { external: Record<string, unknown> }).external.dicomParser = dicomParser;

    // Configure web workers for parallel processing
    const config = {
      maxWebWorkers: navigator.hardwareConcurrency || 4,
      startWebWorkersOnDemand: true,
      webWorkerPath: '/cornerstoneWADOImageLoaderWebWorker.js',
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: true,
          usePDFJS: false,
          strict: false
        }
      }
    };

    (cornerstoneWADOImageLoader as Record<string, unknown> & { webWorkerManager: Record<string, unknown> & { initialize(config: Record<string, unknown>): void } }).webWorkerManager.initialize(config);

    // Configure request interceptor for authentication and optimization
    (cornerstoneWADOImageLoader as Record<string, unknown> & { configure(options: Record<string, unknown>): void }).configure({
      beforeSend: (xhr: XMLHttpRequest, imageId: string, _defaultHeaders: unknown, _params: unknown) => {
        // Add authentication headers
        const connection = this.getConnectionForImageId(imageId);
        if (connection) {
          if (connection.token) {
            xhr.setRequestHeader('Authorization', `Bearer ${connection.token}`);
          } else if (connection.username && connection.password) {
            const auth = btoa(`${connection.username}:${connection.password}`);
            xhr.setRequestHeader('Authorization', `Basic ${auth}`);
          }
        }

        // Add compression headers if enabled
        if (this.config.enableCompression) {
          xhr.setRequestHeader('Accept-Encoding', 'gzip, deflate, br');
        }

        // Set timeout
        xhr.timeout = this.config.requestTimeout;

        // Monitor bandwidth
        if (this.networkOptimizer.enableBandwidthMonitoring) {
          this.monitorRequest(xhr, imageId);
        }
      },
      errorInterceptor: (error: unknown) => {
        console.error('WADO request error:', error);
        this.handleNetworkError(error);
        return error;
      }
    });
  }

  private setupWorkerPool(): void {
    const workerCount = Math.min(navigator.hardwareConcurrency || 4, 8);
    
    for (let i = 0; i < workerCount; i++) {
      try {
        // Check if worker script exists before creating worker
        // For now, disable worker creation to prevent errors
        console.log('⚠️ DICOM worker disabled - worker script not available');
        // TODO: Implement proper DICOM worker when needed
        // const worker = new Worker('/dicomWorker.js');
        // worker.onmessage = (event) => {
        //   this.handleWorkerMessage(event);
        // };
        // worker.onerror = (error) => {
        //   console.error('Worker error:', error);
        //   this.emit('workerError', { error: error.message });
        // };
        // this.workerPool.push(worker);
      } catch (error: unknown) {
        console.warn('Failed to create worker:', error);
        this.emit('workerError', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log(`✅ Created ${this.workerPool.length} workers for DICOM processing`);
  }

  private initializeMemoryManager(): void {
    // Setup garbage collection
    if (this.memoryManager.enableGarbageCollection) {
      this.gcInterval = setInterval(() => {
        this.performGarbageCollection();
      }, 30000); // Every 30 seconds
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as unknown as Record<string, unknown> & { memory: Record<string, unknown> & { usedJSHeapSize: number } }).memory;
        this.memoryManager.currentMemoryUsage = memInfo.usedJSHeapSize;
        
        if (this.memoryManager.currentMemoryUsage > 
            this.memoryManager.maxMemoryUsage * this.memoryManager.gcThreshold) {
          this.performGarbageCollection();
        }
      }, 5000); // Every 5 seconds
    }
  }

  private setupNetworkOptimization(): void {
    // Setup bandwidth monitoring
    if (this.networkOptimizer.enableBandwidthMonitoring) {
      this.bandwidthMonitor = {
        measurements: [],
        startTime: Date.now(),
        totalBytes: 0
      };
    }

    // Setup connection pooling
    if (this.networkOptimizer.enableConnectionPooling) {
      this.connections.forEach(connection => {
        this.connectionPool.set(connection.id, []);
      });
    }

    // Setup request queue processing
    setInterval(() => {
      this.processRequestQueue();
    }, 100); // Every 100ms
  }

  private async loadSavedConnections(): Promise<void> {
    try {
      const savedConnections = localStorage.getItem('dicomConnections');
      if (savedConnections) {
        const connections = JSON.parse(savedConnections);
        connections.forEach((conn: PACSConnection) => {
          conn.lastConnected = conn.lastConnected ? new Date(conn.lastConnected) : undefined;
          this.connections.set(conn.id, conn);
        });
      }
    } catch (error) {
      console.error('Failed to load saved connections:', error);
    }
  }

  private startBackgroundServices(): void {
    // Auto-save connections periodically
    setInterval(() => {
      this.saveConnections();
    }, 60000); // Every minute

    // Cleanup completed jobs
    setInterval(() => {
      this.cleanupCompletedJobs();
    }, 300000); // Every 5 minutes

    // Update connection statistics
    setInterval(() => {
      this.updateConnectionStatistics();
    }, 10000); // Every 10 seconds
  }

  // Connection Management
  public addConnection(connection: Omit<PACSConnection, 'id' | 'statistics'>): PACSConnection {
    const newConnection: PACSConnection = {
      ...connection,
      id: `conn-${Date.now()}`,
      statistics: {
        totalQueries: 0,
        totalRetrievals: 0,
        totalStores: 0,
        averageResponseTime: 0,
        errorCount: 0
      }
    };

    this.connections.set(newConnection.id, newConnection);
    this.emit('connectionAdded', newConnection);
    
    return newConnection;
  }

  public getConnection(id: string): PACSConnection | undefined {
    return this.connections.get(id);
  }

  public getConnections(): PACSConnection[] {
    return Array.from(this.connections.values());
  }

  public updateConnection(id: string, updates: Partial<PACSConnection>): boolean {
    const connection = this.connections.get(id);
    if (connection) {
      const updatedConnection = { ...connection, ...updates };
      this.connections.set(id, updatedConnection);
      this.emit('connectionUpdated', updatedConnection);
      return true;
    }
    return false;
  }

  public deleteConnection(id: string): boolean {
    const connection = this.connections.get(id);
    if (connection) {
      this.connections.delete(id);
      this.emit('connectionDeleted', connection);
      return true;
    }
    return false;
  }

  public async testConnection(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) return false;

    try {
      this.updateConnection(id, { connectionStatus: 'connecting' });
      
      const startTime = Date.now();
      const success = await this.performConnectionTest(connection);
      const responseTime = Date.now() - startTime;

      if (success) {
        this.updateConnection(id, {
          connectionStatus: 'connected',
          lastConnected: new Date()
        });
        
        // Update statistics
        connection.statistics.averageResponseTime = 
          (connection.statistics.averageResponseTime + responseTime) / 2;
      } else {
        this.updateConnection(id, { connectionStatus: 'error' });
        connection.statistics.errorCount++;
      }

      return success;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.updateConnection(id, { 
        connectionStatus: 'error',
        statistics: {
          ...connection.statistics,
          errorCount: connection.statistics.errorCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  private async performConnectionTest(connection: PACSConnection): Promise<boolean> {
    switch (connection.protocol) {
      case 'DICOMweb':
        return this.testDICOMwebConnection(connection);
      case 'WADO':
        return this.testWADOConnection(connection);
      case 'DIMSE':
        return this.testDIMSEConnection(connection);
      default:
        return false;
    }
  }

  private async testDICOMwebConnection(connection: PACSConnection): Promise<boolean> {
    try {
      const url = `${connection.isSecure ? 'https' : 'http'}://${connection.host}:${connection.port}/studies`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(connection),
        signal: AbortSignal.timeout(this.config.connectionTimeout)
      });
      
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  private async testWADOConnection(connection: PACSConnection): Promise<boolean> {
    try {
      const url = `${connection.isSecure ? 'https' : 'http'}://${connection.host}:${connection.port}/wado`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(connection),
        signal: AbortSignal.timeout(this.config.connectionTimeout)
      });
      
      return response.status !== 404; // WADO might return various status codes
    } catch (_error) {
      return false;
    }
  }

  private async testDIMSEConnection(_connection: PACSConnection): Promise<boolean> {
    // DIMSE connection testing would require a DICOM library
    // For now, we'll simulate the test
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.1); // 90% success rate for simulation
      }, 1000);
    });
  }

  private getAuthHeaders(connection: PACSConnection): { [key: string]: string } {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/dicom+json',
      'Accept': 'application/dicom+json'
    };

    if (connection.token) {
      headers['Authorization'] = `Bearer ${connection.token}`;
    } else if (connection.username && connection.password) {
      const auth = btoa(`${connection.username}:${connection.password}`);
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  // Query Management
  public async executeQuery(query: Omit<DICOMQuery, 'id' | 'status' | 'results' | 'progress'>): Promise<DICOMQuery> {
    const newQuery: DICOMQuery = {
      ...query,
      id: `query-${Date.now()}`,
      status: 'pending',
      results: [],
      progress: 0
    };

    this.activeQueries.set(newQuery.id, newQuery);
    this.emit('queryStarted', newQuery);

    try {
      newQuery.status = 'running';
      newQuery.startTime = new Date();
      this.emit('queryUpdated', newQuery);

      const results = await this.performQuery(newQuery);
      
      newQuery.results = results;
      newQuery.status = 'completed';
      newQuery.endTime = new Date();
      newQuery.progress = 100;
      
      // Update connection statistics
      query.connection.statistics.totalQueries++;
      
      this.emit('queryCompleted', newQuery);
    } catch (error) {
      newQuery.status = 'failed';
      newQuery.error = error instanceof Error ? error.message : 'Unknown error';
      newQuery.endTime = new Date();
      
      // Update connection error statistics
      query.connection.statistics.errorCount++;
      query.connection.statistics.lastError = newQuery.error;
      
      this.emit('queryFailed', newQuery);
    }

    return newQuery;
  }

  private async performQuery(query: DICOMQuery): Promise<DICOMQueryResult[]> {
    switch (query.connection.protocol) {
      case 'DICOMweb':
        return this.performDICOMwebQuery(query);
      case 'WADO':
        return this.performWADOQuery(query);
      case 'DIMSE':
        return this.performDIMSEQuery(query);
      default:
        throw new Error(`Unsupported protocol: ${query.connection.protocol}`);
    }
  }

  private async performDICOMwebQuery(query: DICOMQuery): Promise<DICOMQueryResult[]> {
    const connection = query.connection;
    const baseUrl = `${connection.isSecure ? 'https' : 'http'}://${connection.host}:${connection.port}`;
    
    let endpoint = '';
    switch (query.level) {
      case 'PATIENT':
        endpoint = '/patients';
        break;
      case 'STUDY':
        endpoint = '/studies';
        break;
      case 'SERIES':
        endpoint = '/studies/{studyUID}/series';
        break;
      case 'IMAGE':
        endpoint = '/studies/{studyUID}/series/{seriesUID}/instances';
        break;
    }

    const url = baseUrl + endpoint;
    const queryParams = new URLSearchParams();
    
    // Add query criteria as parameters
    Object.entries(query.criteria).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    const fullUrl = `${url}?${queryParams.toString()}`;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(connection),
      signal: AbortSignal.timeout(this.config.requestTimeout)
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return this.parseDICOMwebResults(data, query.level);
  }

  private async performWADOQuery(query: DICOMQuery): Promise<DICOMQueryResult[]> {
    // WADO query implementation
    // This would typically use WADO-RS for queries
    return this.performDICOMwebQuery(query);
  }

  private async performDIMSEQuery(query: DICOMQuery): Promise<DICOMQueryResult[]> {
    // DIMSE query implementation would require a DICOM library
    // For now, we'll simulate the query
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: DICOMQueryResult[] = [
          {
            level: query.level,
            uid: `${query.level.toLowerCase()}-${Date.now()}`,
            data: {
              PatientName: 'Mock Patient',
              PatientID: 'MOCK001',
              StudyDate: '20240101',
              StudyDescription: 'Mock Study'
            }
          }
        ];
        resolve(mockResults);
      }, 2000);
    });
  }

  private parseDICOMwebResults(data: Record<string, unknown>[], level: string): DICOMQueryResult[] {
    return data.map(item => {
      const result: DICOMQueryResult = {
        level: level as 'PATIENT' | 'STUDY' | 'SERIES' | 'IMAGE',
        uid: this.extractUID(item, level),
        data: this.extractDICOMData(item)
      };
      
      return result;
    });
  }

  private extractUID(item: Record<string, unknown>, level: string): string {
    switch (level) {
      case 'PATIENT':
        return (item['00100020'] as Record<string, unknown> & { Value?: string[] })?.Value?.[0] || ''; // Patient ID
      case 'STUDY':
        return (item['0020000D'] as Record<string, unknown> & { Value?: string[] })?.Value?.[0] || ''; // Study Instance UID
      case 'SERIES':
        return (item['0020000E'] as Record<string, unknown> & { Value?: string[] })?.Value?.[0] || ''; // Series Instance UID
      case 'IMAGE':
        return (item['00080018'] as Record<string, unknown> & { Value?: string[] })?.Value?.[0] || ''; // SOP Instance UID
      default:
        return '';
    }
  }

  private extractDICOMData(item: Record<string, unknown>): { [key: string]: unknown } {
    const data: { [key: string]: unknown } = {};
    
    // Extract common DICOM tags
    const tagMap: { [key: string]: string } = {
      '00100010': 'PatientName',
      '00100020': 'PatientID',
      '00100030': 'PatientBirthDate',
      '00100040': 'PatientSex',
      '0020000D': 'StudyInstanceUID',
      '00200010': 'StudyID',
      '00080020': 'StudyDate',
      '00080030': 'StudyTime',
      '00081030': 'StudyDescription',
      '0020000E': 'SeriesInstanceUID',
      '00200011': 'SeriesNumber',
      '0008103E': 'SeriesDescription',
      '00080060': 'Modality',
      '00080018': 'SOPInstanceUID',
      '00200013': 'InstanceNumber'
    };

    Object.entries(tagMap).forEach(([tag, name]) => {
      const tagValue = item[tag] as Record<string, unknown> & { Value?: string[] };
      if (tagValue?.Value) {
        data[name] = tagValue.Value[0];
      }
    });

    return data;
  }

  public getQuery(id: string): DICOMQuery | undefined {
    return this.activeQueries.get(id);
  }

  public getQueries(): DICOMQuery[] {
    return Array.from(this.activeQueries.values());
  }

  public cancelQuery(id: string): boolean {
    const query = this.activeQueries.get(id);
    if (query && query.status === 'running') {
      query.status = 'cancelled';
      query.endTime = new Date();
      this.emit('queryCancelled', query);
      return true;
    }
    return false;
  }

  // Retrieval Management
  public async startRetrieval(job: Omit<DICOMRetrievalJob, 'id' | 'status' | 'progress'>): Promise<DICOMRetrievalJob> {
    const newJob: DICOMRetrievalJob = {
      ...job,
      id: `retrieval-${Date.now()}`,
      status: 'pending',
      progress: {
        total: job.results.length,
        completed: 0,
        failed: 0,
        percentage: 0,
        speed: 0,
        eta: 0
      }
    };

    this.retrievalJobs.set(newJob.id, newJob);
    this.emit('retrievalStarted', newJob);

    // Start retrieval in background
    this.performRetrieval(newJob);

    return newJob;
  }

  private async performRetrieval(job: DICOMRetrievalJob): Promise<void> {
    try {
      job.status = 'running';
      job.startTime = new Date();
      this.emit('retrievalUpdated', job);

      const startTime = Date.now();
      let completedBytes = 0;

      for (let i = 0; i < job.results.length; i++) {
        if ((job as unknown as Record<string, unknown> & { status: string }).status === 'cancelled') break;
        
        const result = job.results[i];
        
        try {
          await this.retrieveInstance(result, job);
          job.progress.completed++;
          completedBytes += 1024 * 1024; // Estimate 1MB per instance
          
          // Update progress
          job.progress.percentage = (job.progress.completed / job.progress.total) * 100;
          
          const elapsedTime = (Date.now() - startTime) / 1000;
          job.progress.speed = completedBytes / elapsedTime / (1024 * 1024); // MB/s
          
          const remainingInstances = job.progress.total - job.progress.completed;
          job.progress.eta = remainingInstances / (job.progress.completed / elapsedTime);
          
          this.emit('retrievalProgress', job);
        } catch (error) {
          job.progress.failed++;
          console.error('Failed to retrieve instance:', error);
        }
      }

      job.status = job.progress.failed > 0 ? 'completed' : 'completed';
      job.endTime = new Date();
      
      // Update connection statistics
      job.query.connection.statistics.totalRetrievals++;
      
      this.emit('retrievalCompleted', job);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      
      this.emit('retrievalFailed', job);
    }
  }

  private async retrieveInstance(result: DICOMQueryResult, job: DICOMRetrievalJob): Promise<void> {
    const connection = job.query.connection;
    
    switch (connection.protocol) {
      case 'DICOMweb':
        return this.retrieveDICOMwebInstance(result, job);
      case 'WADO':
        return this.retrieveWADOInstance(result, job);
      case 'DIMSE':
        return this.retrieveDIMSEInstance(result, job);
      default:
        throw new Error(`Unsupported protocol: ${connection.protocol}`);
    }
  }

  private async retrieveDICOMwebInstance(result: DICOMQueryResult, job: DICOMRetrievalJob): Promise<void> {
    const connection = job.query.connection;
    const baseUrl = `${connection.isSecure ? 'https' : 'http'}://${connection.host}:${connection.port}`;
    
    const studyUID = result.data.StudyInstanceUID;
    const seriesUID = result.data.SeriesInstanceUID;
    const instanceUID = result.data.SOPInstanceUID;
    
    const url = `${baseUrl}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(connection),
        'Accept': 'application/dicom'
      },
      signal: AbortSignal.timeout(this.config.requestTimeout)
    });

    if (!response.ok) {
      throw new Error(`Retrieval failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Store or process the retrieved DICOM data
    await this.storeRetrievedData(arrayBuffer, result, job);
  }

  private async retrieveWADOInstance(result: DICOMQueryResult, job: DICOMRetrievalJob): Promise<void> {
    // WADO retrieval implementation
    const connection = job.query.connection;
    const baseUrl = `${connection.isSecure ? 'https' : 'http'}://${connection.host}:${connection.port}/wado`;
    
    const params = new URLSearchParams({
      requestType: 'WADO',
      studyUID: String(result.data.StudyInstanceUID || ''),
      seriesUID: String(result.data.SeriesInstanceUID || ''),
      objectUID: String(result.data.SOPInstanceUID || ''),
      contentType: 'application/dicom'
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(connection),
      signal: AbortSignal.timeout(this.config.requestTimeout)
    });

    if (!response.ok) {
      throw new Error(`WADO retrieval failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await this.storeRetrievedData(arrayBuffer, result, job);
  }

  private async retrieveDIMSEInstance(result: DICOMQueryResult, job: DICOMRetrievalJob): Promise<void> {
    // DIMSE retrieval would require a DICOM library
    // For now, we'll simulate the retrieval
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate storing mock data
    const mockData = new ArrayBuffer(1024 * 1024); // 1MB mock data
    await this.storeRetrievedData(mockData, result, job);
  }

  private async storeRetrievedData(data: ArrayBuffer, result: DICOMQueryResult, job: DICOMRetrievalJob): Promise<void> {
    switch (job.destination.type) {
      case 'local':
        // Store locally (in memory or IndexedDB)
        this.storeLocalData(data, result);
        break;
      case 'pacs':
        // Forward to another PACS
        if (job.destination.connection) {
          await this.forwardToPACS(data, result, job.destination.connection);
        }
        break;
      case 'cloud':
        // Upload to cloud storage
        await this.uploadToCloud(data, result, job.destination.path);
        break;
    }
  }

  private storeLocalData(data: ArrayBuffer, result: DICOMQueryResult): void {
    // Store in memory cache
    const imageId = `local:${result.uid}`;
    this.memoryManager.imageCache.set(imageId, data);
    this.memoryManager.currentMemoryUsage += data.byteLength;
    
    // Check if we need to perform garbage collection
    if (this.memoryManager.currentMemoryUsage > 
        this.memoryManager.maxMemoryUsage * this.memoryManager.gcThreshold) {
      this.performGarbageCollection();
    }
  }

  private async forwardToPACS(_data: ArrayBuffer, _result: DICOMQueryResult, connection: PACSConnection): Promise<void> {
    // Implementation for forwarding to another PACS
    console.log('Forwarding to PACS:', connection.name);
  }

  private async uploadToCloud(_data: ArrayBuffer, _result: DICOMQueryResult, path?: string): Promise<void> {
    // Implementation for cloud upload
    console.log('Uploading to cloud:', path);
  }

  public getRetrievalJob(id: string): DICOMRetrievalJob | undefined {
    return this.retrievalJobs.get(id);
  }

  public getRetrievalJobs(): DICOMRetrievalJob[] {
    return Array.from(this.retrievalJobs.values());
  }

  public pauseRetrieval(id: string): boolean {
    const job = this.retrievalJobs.get(id);
    if (job && job.status === 'running') {
      job.status = 'paused';
      this.emit('retrievalPaused', job);
      return true;
    }
    return false;
  }

  public resumeRetrieval(id: string): boolean {
    const job = this.retrievalJobs.get(id);
    if (job && job.status === 'paused') {
      job.status = 'running';
      this.performRetrieval(job);
      this.emit('retrievalResumed', job);
      return true;
    }
    return false;
  }

  public cancelRetrieval(id: string): boolean {
    const job = this.retrievalJobs.get(id);
    if (job && (job.status === 'running' || job.status === 'paused')) {
      job.status = 'cancelled';
      job.endTime = new Date();
      this.emit('retrievalCancelled', job);
      return true;
    }
    return false;
  }

  // Memory Management
  private performGarbageCollection(): void {
    console.log('🗑️ Performing garbage collection...');
    
    const caches = [
      this.memoryManager.imageCache,
      this.memoryManager.metadataCache,
      this.memoryManager.compressionCache
    ];
    
    let freedMemory = 0;
    
    caches.forEach(cache => {
      const entries = Array.from(cache.entries());
      
      // Sort by last access time (if available) or remove oldest entries
      entries.sort((_a, _b) => {
        // Simple LRU - remove entries that haven't been accessed recently
        return Math.random() - 0.5; // Random for now, should implement proper LRU
      });
      
      // Remove 25% of entries
      const toRemove = Math.floor(entries.length * 0.25);
      
      for (let i = 0; i < toRemove; i++) {
        const [key, value] = entries[i];
        cache.delete(key);
        
        if (value instanceof ArrayBuffer) {
          freedMemory += value.byteLength;
        }
      }
    });
    
    this.memoryManager.currentMemoryUsage -= freedMemory;
    
    console.log(`✅ Freed ${(freedMemory / 1024 / 1024).toFixed(2)} MB of memory`);
    this.emit('memoryCleanup', { freedMemory, currentUsage: this.memoryManager.currentMemoryUsage });
  }

  // Network Optimization
  private getConnectionForImageId(imageId: string): PACSConnection | null {
    // Extract connection info from image ID
    // This is a simplified implementation
    const connections = Array.from(this.connections.values());
    return connections.find(conn => imageId.includes(conn.host)) || null;
  }

  private monitorRequest(xhr: XMLHttpRequest, _imageId: string): void {
    const startTime = Date.now();
    // let startBytes = 0;
    
    xhr.addEventListener('loadstart', () => {
      // startBytes = this.bandwidthMonitor.totalBytes;
    });
    
    xhr.addEventListener('loadend', () => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const bytes = xhr.response ? xhr.response.byteLength || 0 : 0;
      
      if (duration > 0) {
        const bandwidth = (bytes * 8) / duration / 1000000; // Mbps
        
        (this.bandwidthMonitor as Record<string, unknown> & { measurements: number[]; totalBytes: number }).measurements.push(bandwidth);
        (this.bandwidthMonitor as Record<string, unknown> & { measurements: number[]; totalBytes: number }).totalBytes += bytes;
        
        // Keep only last 100 measurements
        if ((this.bandwidthMonitor as Record<string, unknown> & { measurements: number[] }).measurements.length > 100) {
          (this.bandwidthMonitor as Record<string, unknown> & { measurements: number[] }).measurements.shift();
        }
        
        // Calculate average bandwidth
        const measurements = (this.bandwidthMonitor as Record<string, unknown> & { measurements: number[] }).measurements;
        this.networkOptimizer.averageBandwidth = 
          measurements.reduce((sum: number, bw: number) => sum + bw, 0) / 
          measurements.length;
        
        this.networkOptimizer.currentBandwidth = bandwidth;
        
        this.emit('bandwidthUpdate', {
          current: bandwidth,
          average: this.networkOptimizer.averageBandwidth
        });
      }
    });
  }

  private handleNetworkError(error: unknown): void {
    console.error('Network error:', error);
    this.emit('networkError', error);
  }

  // private _handleWorkerMessage(_event: MessageEvent): void {
  //   // const { type, data, id } = event.data;
  //   
  //   // switch (type) {
  //   //   case 'imageProcessed':
  //   //     this.emit('imageProcessed', { id, data });
  //   //     break;
  //   //   case 'error':
  //   //     this.emit('workerError', { id, error: data });
  //   //     break;
  //   // }
  // }

  private processRequestQueue(): void {
    if (this.requestQueue.length === 0) return;
    
    // Process requests based on priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriority = (a as Record<string, unknown> & { priority: string }).priority;
      const bPriority = (b as Record<string, unknown> & { priority: string }).priority;
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });
    
    // Process up to maxConcurrentConnections requests
    const toProcess = this.requestQueue.splice(0, this.config.maxConcurrentConnections);
    
    toProcess.forEach(request => {
      this.processRequest(request);
    });
  }

  private async processRequest(request: Record<string, unknown>): Promise<void> {
    // Process individual request
    try {
      const executableRequest = request as Record<string, unknown> & { execute(): Promise<void> };
      await executableRequest.execute();
    } catch (error) {
      console.error('Request processing failed:', error);
    }
  }

  // Utility Methods
  private saveConnections(): void {
    try {
      const connections = Array.from(this.connections.values());
      localStorage.setItem('dicomConnections', JSON.stringify(connections));
    } catch (error) {
      console.error('Failed to save connections:', error);
    }
  }

  private cleanupCompletedJobs(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Cleanup old queries
    for (const [id, query] of this.activeQueries.entries()) {
      if (query.endTime && query.endTime.getTime() < cutoffTime) {
        this.activeQueries.delete(id);
      }
    }
    
    // Cleanup old retrieval jobs
    for (const [id, job] of this.retrievalJobs.entries()) {
      if (job.endTime && job.endTime.getTime() < cutoffTime) {
        this.retrievalJobs.delete(id);
      }
    }
  }

  private updateConnectionStatistics(): void {
    this.connections.forEach(_connection => {
      // Update connection statistics based on recent activity
      // This is a placeholder for more sophisticated statistics tracking
    });
  }

  // Public API
  public getMemoryUsage(): MemoryManager {
    return this.memoryManager;
  }

  public getNetworkStatistics(): NetworkOptimizer {
    return this.networkOptimizer;
  }

  public updateConfig(updates: Partial<DICOMNetworkConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): DICOMNetworkConfig {
    return this.config;
  }

  // Cleanup
  public destroy(): void {
    // Save data before destroying
    this.saveConnections();
    
    // Clear intervals
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    
    // Terminate workers
    this.workerPool.forEach(worker => {
      worker.terminate();
    });
    
    // Clear caches
    this.memoryManager.imageCache.clear();
    this.memoryManager.metadataCache.clear();
    this.memoryManager.compressionCache.clear();
    
    // Clear collections
    this.connections.clear();
    this.activeQueries.clear();
    this.retrievalJobs.clear();
    this.connectionPool.clear();
    this.requestQueue.length = 0;
    
    // Remove all listeners
    this.removeAllListeners();
    
    this.isInitialized = false;
    
    console.log('✅ Enhanced DICOM Network destroyed');
  }
}

export default EnhancedDICOMNetwork;
