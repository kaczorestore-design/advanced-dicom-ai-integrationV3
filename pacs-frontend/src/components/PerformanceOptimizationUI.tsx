import React, { useState, useEffect, useCallback, useRef } from 'react';
import PerformanceOptimizer, {
  PerformanceMetrics,
  PerformanceProfile,
  OptimizationStrategy,
  GPUAcceleration,
  WorkerPool,
  MemoryPool
} from './PerformanceOptimizer';
import { EnhancedMemoryManager } from './EnhancedMemoryManager';
import { LargeDatasetHandler } from './LargeDatasetHandler';

interface PerformanceOptimizationUIProps {
  performanceOptimizer?: PerformanceOptimizer;
  memoryManager?: EnhancedMemoryManager;
  datasetHandler?: LargeDatasetHandler;
  onProfileChange?: (profileId: string) => void;
  onStrategyToggle?: (strategyId: string, enabled: boolean) => void;
}

interface SystemInfo {
  browser: string;
  platform: string;
  cores: number;
  memory: number;
  gpu?: {
    vendor: string;
    model: string;
    memory: number;
  };
  webgl: {
    version: string;
    maxTextureSize: number;
    extensions: string[];
  };
  webgpu: boolean;
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'memory' | 'rendering' | 'network' | 'cpu' | 'gpu';
  action: () => void;
  applied: boolean;
}

export const PerformanceOptimizationUI: React.FC<PerformanceOptimizationUIProps> = ({
  performanceOptimizer,
  // memoryManager, // commented out - unused
  // datasetHandler, // commented out - unused
  onProfileChange,
  onStrategyToggle
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [profiles, setProfiles] = useState<PerformanceProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('balanced');
  const [strategies, setStrategies] = useState<OptimizationStrategy[]>([]);
  const [gpuInfo, setGpuInfo] = useState<GPUAcceleration | null>(null);
  const [workerPools, setWorkerPools] = useState<WorkerPool[]>([]);
  const [memoryPools, setMemoryPools] = useState<MemoryPool[]>([]);
  const [cacheStats, setCacheStats] = useState<{ size: number; entries: number; hitRate: number } | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'profiles' | 'strategies' | 'gpu' | 'memory' | 'workers' | 'recommendations'>('overview');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (performanceOptimizer) {
      // Set up event listeners
      const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
        setMetrics(newMetrics);
        metricsHistoryRef.current.push(newMetrics);
        if (metricsHistoryRef.current.length > 100) {
          metricsHistoryRef.current.shift();
        }
        updateChart();
      };

      const handleOptimizationApplied = (optimization: Record<string, unknown>) => {
        setOptimizationHistory(prev => [optimization, ...prev.slice(0, 49)]);
      };

      performanceOptimizer.on('metricsUpdated', handleMetricsUpdate);
      performanceOptimizer.on('optimizationApplied', handleOptimizationApplied);

      // Initial data load
      loadInitialData();

      return () => {
        performanceOptimizer.off('metricsUpdated', handleMetricsUpdate);
        performanceOptimizer.off('optimizationApplied', handleOptimizationApplied);
      };
    }
  }, [performanceOptimizer]);

  useEffect(() => {
    detectSystemInfo();
    generateRecommendations();
  }, [metrics, gpuInfo]);

  const loadInitialData = useCallback(async () => {
    if (!performanceOptimizer) return;

    try {
      const currentMetrics = performanceOptimizer.getCurrentMetrics();
      if (currentMetrics) setMetrics(currentMetrics);

      const profilesData = performanceOptimizer.getProfiles();
      setProfiles(profilesData);

      const activeProfileId = performanceOptimizer.getActiveProfile();
      setActiveProfile(activeProfileId);

      const strategiesData = performanceOptimizer.getStrategies();
      setStrategies(strategiesData);

      const gpu = performanceOptimizer.getGPUInfo();
      setGpuInfo(gpu || null);

      const workers = performanceOptimizer.getWorkerPoolStats();
      // Convert Omit<WorkerPool, 'workers'> to WorkerPool by adding empty workers array
      const workerPoolsArray = Object.values(workers).map(pool => ({
        ...pool,
        workers: [] as Worker[]
      }));
      setWorkerPools(workerPoolsArray);

      const cache = performanceOptimizer.getCacheStats();
      setCacheStats(cache);

      const memory = performanceOptimizer.getMemoryPoolStats();
      // Convert memory stats to MemoryPool format
      const memoryPoolsArray = Object.entries(memory).map(([id, stats]) => ({
        id,
        name: `Memory Pool ${id}`,
        size: stats.used + stats.available,
        blockSize: 1024, // Default block size
        used: stats.used,
        available: stats.available,
        blocks: [], // Empty blocks array as MemoryBlock[]
        type: id.includes('gpu') ? 'gpu' as const : 'cpu' as const,
        persistent: true
      }));
      setMemoryPools(memoryPoolsArray);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    }
  }, [performanceOptimizer]);

  const detectSystemInfo = useCallback(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    const info: SystemInfo = {
      browser: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as unknown as Record<string, unknown>).deviceMemory ? ((navigator as unknown as Record<string, unknown>).deviceMemory as number) * 1024 * 1024 * 1024 : 8 * 1024 * 1024 * 1024,
      webgl: {
        version: gl instanceof WebGL2RenderingContext ? '2.0' : '1.0',
        maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
        extensions: gl ? gl.getSupportedExtensions() || [] : []
      },
      webgpu: 'gpu' in navigator
    };

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        info.gpu = {
          vendor,
          model: renderer,
          memory: 0 // Would need to be estimated
        };
      }
    }

    setSystemInfo(info);
  }, []);

  const generateRecommendations = useCallback(() => {
    if (!metrics || !systemInfo) return;

    const recs: OptimizationRecommendation[] = [];

    // Memory recommendations
    if (metrics.memoryUsage.percentage > 80) {
      recs.push({
        id: 'reduce-memory',
        title: 'High Memory Usage Detected',
        description: 'Memory usage is above 80%. Consider enabling aggressive memory management or reducing cache size.',
        impact: 'high',
        category: 'memory',
        action: () => enableAggressiveMemoryManagement(),
        applied: false
      });
    }

    // GPU recommendations
    if (gpuInfo && !gpuInfo.enabled) {
      recs.push({
        id: 'enable-gpu',
        title: 'GPU Acceleration Disabled',
        description: 'GPU acceleration is available but not enabled. This could significantly improve rendering performance.',
        impact: 'high',
        category: 'gpu',
        action: () => enableGPUAcceleration(),
        applied: false
      });
    }

    // Rendering recommendations
    if (metrics.renderingPerformance.fps < 30) {
      recs.push({
        id: 'improve-fps',
        title: 'Low Frame Rate',
        description: 'Frame rate is below 30 FPS. Consider reducing render quality or enabling level-of-detail.',
        impact: 'medium',
        category: 'rendering',
        action: () => enableAdaptiveQuality(),
        applied: false
      });
    }

    // Network recommendations
    if (metrics.networkPerformance.latency > 1000) {
      recs.push({
        id: 'optimize-network',
        title: 'High Network Latency',
        description: 'Network latency is high. Consider enabling compression or reducing concurrent connections.',
        impact: 'medium',
        category: 'network',
        action: () => optimizeNetworkSettings(),
        applied: false
      });
    }

    // CPU recommendations
    if (metrics.cpuUsage.usage > 90) {
      recs.push({
        id: 'reduce-cpu',
        title: 'High CPU Usage',
        description: 'CPU usage is very high. Consider offloading work to GPU or web workers.',
        impact: 'high',
        category: 'cpu',
        action: () => enableMultithreading(),
        applied: false
      });
    }

    setRecommendations(recs);
  }, [metrics, systemInfo, gpuInfo]);

  const updateChart = useCallback(() => {
    if (!chartCanvasRef.current || metricsHistoryRef.current.length === 0) return;

    const canvas = chartCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const history = metricsHistoryRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw memory usage line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    history.forEach((metric, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - (metric.memoryUsage.percentage / 100) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw FPS line
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    
    history.forEach((metric, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - (Math.min(metric.renderingPerformance.fps, 60) / 60) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw CPU usage line
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    
    history.forEach((metric, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - (metric.cpuUsage.usage / 100) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }, []);

  const handleProfileChange = useCallback((profileId: string) => {
    if (performanceOptimizer) {
      performanceOptimizer.setActiveProfile(profileId);
      setActiveProfile(profileId);
      onProfileChange?.(profileId);
    }
  }, [performanceOptimizer, onProfileChange]);

  const handleStrategyToggle = useCallback((strategyId: string, enabled: boolean) => {
    if (performanceOptimizer) {
      performanceOptimizer.toggleStrategy(strategyId, enabled);
      setStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, enabled } : s));
      onStrategyToggle?.(strategyId, enabled);
    }
  }, [performanceOptimizer, onStrategyToggle]);

  const runOptimization = useCallback(async () => {
    if (!performanceOptimizer || isOptimizing) return;

    setIsOptimizing(true);
    try {
      await performanceOptimizer.optimize();
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [performanceOptimizer, isOptimizing]);

  const enableAggressiveMemoryManagement = useCallback(() => {
    if (performanceOptimizer) {
      performanceOptimizer.toggleStrategy('memory-aggressive', true);
    }
  }, [performanceOptimizer]);

  const enableGPUAcceleration = useCallback(() => {
    if (performanceOptimizer) {
      performanceOptimizer.enableGPUAcceleration();
    }
  }, [performanceOptimizer]);

  const enableAdaptiveQuality = useCallback(() => {
    if (performanceOptimizer) {
      performanceOptimizer.toggleStrategy('quality-adaptive', true);
    }
  }, [performanceOptimizer]);

  const optimizeNetworkSettings = useCallback(() => {
    if (performanceOptimizer) {
      performanceOptimizer.toggleStrategy('network-optimization', true);
    }
  }, [performanceOptimizer]);

  const enableMultithreading = useCallback(() => {
    if (performanceOptimizer) {
      performanceOptimizer.enableMultithreading();
    }
  }, [performanceOptimizer]);

  const applyRecommendation = useCallback((rec: OptimizationRecommendation) => {
    rec.action();
    setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, applied: true } : r));
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!performanceOptimizer) {
    return (
      <div className="performance-optimization-ui p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Optimization</h2>
          <p className="text-gray-600">Performance optimizer not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-optimization-ui p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Performance Optimization</h2>
          <div className="flex space-x-2">
            <button
              onClick={runOptimization}
              disabled={isOptimizing}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </button>
            <button
              onClick={loadInitialData}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'profiles', label: 'Profiles' },
              { id: 'strategies', label: 'Strategies' },
              { id: 'gpu', label: 'GPU' },
              { id: 'memory', label: 'Memory' },
              { id: 'workers', label: 'Workers' },
              { id: 'recommendations', label: 'Recommendations', count: recommendations.filter(r => !r.applied).length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as 'overview' | 'profiles' | 'strategies' | 'gpu' | 'memory' | 'workers' | 'recommendations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="overview-panel space-y-6">
          {/* Performance Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Memory Usage</h3>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.memoryUsage.percentage, { good: 60, warning: 80 })}`}>
                  {metrics.memoryUsage.percentage.toFixed(1)}%
                </p>
                <p className="text-sm text-blue-700">
                  {formatBytes(metrics.memoryUsage.used)} / {formatBytes(metrics.memoryUsage.total)}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-900 mb-2">Frame Rate</h3>
                <p className={`text-2xl font-bold ${getPerformanceColor(60 - metrics.renderingPerformance.fps, { good: 30, warning: 45 })}`}>
                  {metrics.renderingPerformance.fps.toFixed(1)} FPS
                </p>
                <p className="text-sm text-green-700">
                  {metrics.renderingPerformance.frameTime.toFixed(1)}ms frame time
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">CPU Usage</h3>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.cpuUsage.usage, { good: 50, warning: 80 })}`}>
                  {metrics.cpuUsage.usage.toFixed(1)}%
                </p>
                <p className="text-sm text-yellow-700">
                  {metrics.cpuUsage.cores} cores @ {formatNumber(metrics.cpuUsage.frequency)} MHz
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-900 mb-2">Network</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {formatBytes(metrics.networkPerformance.downloadSpeed)}/s
                </p>
                <p className="text-sm text-purple-700">
                  {metrics.networkPerformance.latency.toFixed(0)}ms latency
                </p>
              </div>
            </div>
          )}

          {/* Performance Chart */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance History</h3>
            <div className="relative">
              <canvas
                ref={chartCanvasRef}
                width={800}
                height={200}
                className="w-full h-48 border rounded"
              />
              <div className="absolute top-2 right-2 text-xs text-gray-600">
                <div className="flex space-x-4">
                  <span className="flex items-center"><span className="w-3 h-0.5 bg-blue-500 mr-1"></span>Memory</span>
                  <span className="flex items-center"><span className="w-3 h-0.5 bg-green-500 mr-1"></span>FPS</span>
                  <span className="flex items-center"><span className="w-3 h-0.5 bg-yellow-500 mr-1"></span>CPU</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          {systemInfo && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Platform:</span>
                  <p className="text-gray-600">{systemInfo.platform}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">CPU Cores:</span>
                  <p className="text-gray-600">{systemInfo.cores}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Memory:</span>
                  <p className="text-gray-600">{formatBytes(systemInfo.memory)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">WebGL:</span>
                  <p className="text-gray-600">v{systemInfo.webgl.version} (Max texture: {systemInfo.webgl.maxTextureSize}px)</p>
                </div>
                {systemInfo.gpu && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">GPU Vendor:</span>
                      <p className="text-gray-600">{systemInfo.gpu.vendor}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">GPU Model:</span>
                      <p className="text-gray-600">{systemInfo.gpu.model}</p>
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium text-gray-700">WebGPU:</span>
                  <p className="text-gray-600">{systemInfo.webgpu ? 'Supported' : 'Not supported'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'profiles' && (
        <div className="profiles-panel">
          <h3 className="text-lg font-semibold mb-4">Performance Profiles</h3>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.id} className={`border rounded-lg p-4 ${
                activeProfile === profile.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-lg">{profile.name}</h4>
                    <p className="text-sm text-gray-600">{profile.description}</p>
                  </div>
                  <button
                    onClick={() => handleProfileChange(profile.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      activeProfile === profile.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {activeProfile === profile.id ? 'Active' : 'Activate'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Memory Limit:</span>
                    <p className="font-medium">{formatBytes(profile.memoryLimit)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Render Quality:</span>
                    <p className="font-medium capitalize">{profile.renderQuality}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">GPU:</span>
                    <p className="font-medium">{profile.enableGPU ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Multithreading:</span>
                    <p className="font-medium">{profile.enableMultithreading ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTab === 'strategies' && (
        <div className="strategies-panel">
          <h3 className="text-lg font-semibold mb-4">Optimization Strategies</h3>
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-lg">{strategy.name}</h4>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                      strategy.category === 'memory' ? 'bg-blue-100 text-blue-800' :
                      strategy.category === 'rendering' ? 'bg-green-100 text-green-800' :
                      strategy.category === 'network' ? 'bg-purple-100 text-purple-800' :
                      strategy.category === 'cpu' ? 'bg-yellow-100 text-yellow-800' :
                      strategy.category === 'gpu' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {strategy.category}
                    </span>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={strategy.enabled}
                      onChange={(e) => handleStrategyToggle(strategy.id, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">{strategy.enabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Priority: {strategy.priority}</p>
                  <p>Conditions: {strategy.conditions.length}</p>
                  <p>Actions: {strategy.actions.length}</p>
                  {strategy.lastExecuted && (
                    <p>Last executed: {new Date(strategy.lastExecuted).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTab === 'gpu' && (
        <div className="gpu-panel">
          <h3 className="text-lg font-semibold mb-4">GPU Acceleration</h3>
          {gpuInfo ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className={`font-medium ${
                      gpuInfo.enabled ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {gpuInfo.enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Vendor:</span>
                    <p className="font-medium">{gpuInfo.vendor}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <p className="font-medium">{gpuInfo.model}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Memory:</span>
                    <p className="font-medium">{formatBytes(gpuInfo.memorySize)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Compute Units:</span>
                    <p className="font-medium">{gpuInfo.computeUnits}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Texture Size:</span>
                    <p className="font-medium">{gpuInfo.maxTextureSize}px</p>
                  </div>
                  <div>
                    <span className="text-gray-600">WebGL Version:</span>
                    <p className="font-medium">{gpuInfo.webGLVersion}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">WebGPU:</span>
                    <p className="font-medium">{gpuInfo.webGPUSupported ? 'Supported' : 'Not supported'}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Supported Extensions</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {gpuInfo.supportedExtensions.map((ext, index) => (
                    <span key={index} className="bg-white px-2 py-1 rounded border text-gray-700">
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">GPU information not available</p>
          )}
        </div>
      )}

      {selectedTab === 'memory' && (
        <div className="memory-panel space-y-4">
          <h3 className="text-lg font-semibold mb-4">Memory Management</h3>
          
          {/* Cache Statistics */}
          {cacheStats && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Cache Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Size:</span>
                  <p className="font-medium">{formatBytes(cacheStats.size)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Entries:</span>
                  <p className="font-medium">{cacheStats.entries}</p>
                </div>
                <div>
                  <span className="text-gray-600">Hit Rate:</span>
                  <p className="font-medium">{(cacheStats.hitRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Memory Pools */}
          <div>
            <h4 className="font-medium mb-2">Memory Pools</h4>
            <div className="space-y-2">
              {memoryPools.map((pool) => (
                <div key={pool.id} className="border rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{pool.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      pool.type === 'gpu' ? 'bg-red-100 text-red-800' :
                      pool.type === 'cpu' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {pool.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Size:</span>
                      <p className="font-medium">{formatBytes(pool.size)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Used:</span>
                      <p className="font-medium">{formatBytes(pool.used)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Available:</span>
                      <p className="font-medium">{formatBytes(pool.available)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(pool.used / pool.size) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'workers' && (
        <div className="workers-panel">
          <h3 className="text-lg font-semibold mb-4">Worker Pools</h3>
          <div className="space-y-4">
            {workerPools.map((pool) => (
              <div key={pool.id} className="border rounded-lg p-4">
                <h4 className="font-medium text-lg mb-2">{pool.name}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Pool Size:</span>
                    <p className="font-medium">{pool.size}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Jobs:</span>
                    <p className="font-medium">{pool.activeJobs}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <p className="font-medium">{pool.completedJobs}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Failed:</span>
                    <p className="font-medium">{pool.failedJobs}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Queue Length:</span>
                    <p className="font-medium">{pool.queue.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Execution:</span>
                    <p className="font-medium">{pool.averageExecutionTime.toFixed(0)}ms</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTab === 'recommendations' && (
        <div className="recommendations-panel">
          <h3 className="text-lg font-semibold mb-4">Optimization Recommendations</h3>
          {recommendations.length === 0 ? (
            <p className="text-gray-600">No recommendations available. System is performing optimally.</p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className={`border rounded-lg p-4 ${
                  rec.applied ? 'bg-green-50 border-green-200' : 
                  rec.impact === 'high' ? 'bg-red-50 border-red-200' :
                  rec.impact === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-lg">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-800' :
                        rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.impact} impact
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rec.category === 'memory' ? 'bg-blue-100 text-blue-800' :
                        rec.category === 'rendering' ? 'bg-green-100 text-green-800' :
                        rec.category === 'network' ? 'bg-purple-100 text-purple-800' :
                        rec.category === 'cpu' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {rec.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {rec.applied ? (
                      <span className="text-green-600 text-sm font-medium">✓ Applied</span>
                    ) : (
                      <button
                        onClick={() => applyRecommendation(rec)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optimization History */}
      {optimizationHistory.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Optimizations</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {optimizationHistory.slice(0, 10).map((opt, index) => (
              <div key={index} className="text-sm text-gray-600 flex justify-between">
                <span>{opt.description || opt.type}</span>
                <span>{new Date(opt.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceOptimizationUI;
