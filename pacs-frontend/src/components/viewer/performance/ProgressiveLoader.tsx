import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Pause,
  Play,

  Layers,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Database
} from 'lucide-react';

// Progressive loading interfaces
interface LoadingChunk {
  id: string;
  type: 'metadata' | 'thumbnail' | 'lowres' | 'fullres' | 'volume';
  priority: number;
  size: number; // bytes
  progress: number; // 0-100
  status: 'pending' | 'loading' | 'completed' | 'error' | 'paused';
  url: string;
  dependencies: string[]; // chunk IDs this depends on
  estimatedTime: number; // ms
  actualTime?: number; // ms
  retryCount: number;
  lastError?: string;
}

interface LoadingQueue {
  chunks: LoadingChunk[];
  activeChunks: string[]; // currently loading chunk IDs
  completedChunks: string[];
  failedChunks: string[];
  totalSize: number;
  loadedSize: number;
  estimatedTotalTime: number;
  elapsedTime: number;
}

interface LoadingStrategy {
  name: string;
  description: string;
  maxConcurrent: number;
  priorityWeights: {
    metadata: number;
    thumbnail: number;
    lowres: number;
    fullres: number;
    volume: number;
  };
  adaptiveBandwidth: boolean;
  prefetchDistance: number; // number of images to prefetch ahead
}

interface BandwidthMetrics {
  current: number; // bytes/sec
  average: number;
  peak: number;
  samples: number[];
  lastMeasurement: number;
}

interface ProgressiveLoaderSettings {
  strategy: string;
  enableAdaptiveQuality: boolean;
  enablePrefetching: boolean;
  enableCaching: boolean;
  maxRetries: number;
  retryDelay: number;
  chunkSize: number; // KB
  qualityThreshold: number; // 0-1
  bandwidthThreshold: number; // bytes/sec
}

const LOADING_STRATEGIES: LoadingStrategy[] = [
  {
    name: 'sequential',
    description: 'Load images in sequence, one at a time',
    maxConcurrent: 1,
    priorityWeights: { metadata: 1, thumbnail: 2, lowres: 3, fullres: 4, volume: 5 },
    adaptiveBandwidth: false,
    prefetchDistance: 1
  },
  {
    name: 'parallel',
    description: 'Load multiple images simultaneously',
    maxConcurrent: 4,
    priorityWeights: { metadata: 1, thumbnail: 2, lowres: 3, fullres: 4, volume: 5 },
    adaptiveBandwidth: true,
    prefetchDistance: 3
  },
  {
    name: 'adaptive',
    description: 'Dynamically adjust based on network conditions',
    maxConcurrent: 6,
    priorityWeights: { metadata: 1, thumbnail: 1, lowres: 2, fullres: 3, volume: 4 },
    adaptiveBandwidth: true,
    prefetchDistance: 5
  },
  {
    name: 'quality-first',
    description: 'Prioritize image quality over speed',
    maxConcurrent: 2,
    priorityWeights: { metadata: 1, thumbnail: 3, lowres: 4, fullres: 2, volume: 5 },
    adaptiveBandwidth: false,
    prefetchDistance: 2
  },
  {
    name: 'speed-first',
    description: 'Prioritize loading speed over quality',
    maxConcurrent: 8,
    priorityWeights: { metadata: 1, thumbnail: 1, lowres: 1, fullres: 5, volume: 6 },
    adaptiveBandwidth: true,
    prefetchDistance: 10
  }
];

const ProgressiveLoader: React.FC = () => {
  const [queue, setQueue] = useState<LoadingQueue>({
    chunks: [],
    activeChunks: [],
    completedChunks: [],
    failedChunks: [],
    totalSize: 0,
    loadedSize: 0,
    estimatedTotalTime: 0,
    elapsedTime: 0
  });

  const [settings, setSettings] = useState<ProgressiveLoaderSettings>({
    strategy: 'adaptive',
    enableAdaptiveQuality: true,
    enablePrefetching: true,
    enableCaching: true,
    maxRetries: 3,
    retryDelay: 1000,
    chunkSize: 256,
    qualityThreshold: 0.8,
    bandwidthThreshold: 1024 * 1024 // 1 MB/s
  });

  const [bandwidth, setBandwidth] = useState<BandwidthMetrics>({
    current: 0,
    average: 0,
    peak: 0,
    samples: [],
    lastMeasurement: Date.now()
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<LoadingStrategy>(
    LOADING_STRATEGIES.find(s => s.name === settings.strategy) || LOADING_STRATEGIES[0]
  );

  const loadingInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  // Initialize sample data
  const initializeSampleData = useCallback(() => {
    const sampleChunks: LoadingChunk[] = [];
    
    // Generate sample chunks for a DICOM series
    for (let i = 0; i < 50; i++) {
      // Metadata chunks
      sampleChunks.push({
        id: `metadata-${i}`,
        type: 'metadata',
        priority: 1,
        size: Math.random() * 10000 + 5000, // 5-15 KB
        progress: 0,
        status: 'pending',
        url: `/api/dicom/metadata/${i}`,
        dependencies: [],
        estimatedTime: Math.random() * 200 + 100,
        retryCount: 0
      });

      // Thumbnail chunks
      sampleChunks.push({
        id: `thumbnail-${i}`,
        type: 'thumbnail',
        priority: 2,
        size: Math.random() * 50000 + 20000, // 20-70 KB
        progress: 0,
        status: 'pending',
        url: `/api/dicom/thumbnail/${i}`,
        dependencies: [`metadata-${i}`],
        estimatedTime: Math.random() * 500 + 200,
        retryCount: 0
      });

      // Low resolution chunks
      sampleChunks.push({
        id: `lowres-${i}`,
        type: 'lowres',
        priority: 3,
        size: Math.random() * 200000 + 100000, // 100-300 KB
        progress: 0,
        status: 'pending',
        url: `/api/dicom/lowres/${i}`,
        dependencies: [`metadata-${i}`],
        estimatedTime: Math.random() * 1000 + 500,
        retryCount: 0
      });

      // Full resolution chunks
      sampleChunks.push({
        id: `fullres-${i}`,
        type: 'fullres',
        priority: 4,
        size: Math.random() * 2000000 + 1000000, // 1-3 MB
        progress: 0,
        status: 'pending',
        url: `/api/dicom/fullres/${i}`,
        dependencies: [`metadata-${i}`, `lowres-${i}`],
        estimatedTime: Math.random() * 3000 + 1000,
        retryCount: 0
      });
    }

    // Add volume chunks
    for (let i = 0; i < 5; i++) {
      sampleChunks.push({
        id: `volume-${i}`,
        type: 'volume',
        priority: 5,
        size: Math.random() * 10000000 + 5000000, // 5-15 MB
        progress: 0,
        status: 'pending',
        url: `/api/dicom/volume/${i}`,
        dependencies: sampleChunks.filter(c => c.type === 'fullres').map(c => c.id),
        estimatedTime: Math.random() * 10000 + 5000,
        retryCount: 0
      });
    }

    const totalSize = sampleChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const estimatedTotalTime = sampleChunks.reduce((sum, chunk) => sum + chunk.estimatedTime, 0);

    setQueue(prev => ({
      ...prev,
      chunks: sampleChunks,
      totalSize,
      estimatedTotalTime
    }));
  }, []);

  // Bandwidth monitoring
  const updateBandwidth = useCallback((bytesLoaded: number, timeElapsed: number) => {
    const currentBandwidth = timeElapsed > 0 ? (bytesLoaded / timeElapsed) * 1000 : 0;
    
    setBandwidth(prev => {
      const newSamples = [...prev.samples, currentBandwidth].slice(-10); // Keep last 10 samples
      const average = newSamples.reduce((sum, sample) => sum + sample, 0) / newSamples.length;
      const peak = Math.max(prev.peak, currentBandwidth);
      
      return {
        current: currentBandwidth,
        average,
        peak,
        samples: newSamples,
        lastMeasurement: Date.now()
      };
    });
  }, []);

  // Chunk loading simulation
  const loadChunk = useCallback(async (chunk: LoadingChunk): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let progress = 0;
      
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5; // 5-25% progress per interval
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          const endTime = Date.now();
          const actualTime = endTime - startTime;
          
          setQueue(prev => ({
            ...prev,
            chunks: prev.chunks.map(c => 
              c.id === chunk.id 
                ? { ...c, progress: 100, status: 'completed', actualTime }
                : c
            ),
            activeChunks: prev.activeChunks.filter(id => id !== chunk.id),
            completedChunks: [...prev.completedChunks, chunk.id],
            loadedSize: prev.loadedSize + chunk.size
          }));
          
          updateBandwidth(chunk.size, actualTime);
          resolve();
        } else {
          setQueue(prev => ({
            ...prev,
            chunks: prev.chunks.map(c => 
              c.id === chunk.id 
                ? { ...c, progress, status: 'loading' }
                : c
            )
          }));
        }
      }, chunk.estimatedTime / 20); // Update progress 20 times during loading
    });
  }, [updateBandwidth]);

  // Queue management
  const getNextChunks = useCallback((): LoadingChunk[] => {
    const availableChunks = queue.chunks.filter(chunk => {
      // Check if chunk is ready to load
      if (chunk.status !== 'pending') return false;
      
      // Check dependencies
      const dependenciesMet = chunk.dependencies.every(depId => 
        queue.completedChunks.includes(depId)
      );
      
      return dependenciesMet;
    });

    // Sort by priority and strategy weights
    const strategy = currentStrategy;
    availableChunks.sort((a, b) => {
      const aWeight = strategy.priorityWeights[a.type] || 999;
      const bWeight = strategy.priorityWeights[b.type] || 999;
      
      if (aWeight !== bWeight) {
        return aWeight - bWeight;
      }
      
      // Secondary sort by size (smaller first for faster feedback)
      return a.size - b.size;
    });

    const maxConcurrent = strategy.maxConcurrent;
    const availableSlots = maxConcurrent - queue.activeChunks.length;
    
    return availableChunks.slice(0, availableSlots);
  }, [queue, currentStrategy]);

  // Main loading loop
  const processQueue = useCallback(async () => {
    if (isPaused) return;
    
    const nextChunks = getNextChunks();
    
    for (const chunk of nextChunks) {
      setQueue(prev => ({
        ...prev,
        chunks: prev.chunks.map(c => 
          c.id === chunk.id 
            ? { ...c, status: 'loading' }
            : c
        ),
        activeChunks: [...prev.activeChunks, chunk.id]
      }));
      
      // Start loading chunk (don't await to allow parallel loading)
      loadChunk(chunk).catch(error => {
        setQueue(prev => ({
          ...prev,
          chunks: prev.chunks.map(c => 
            c.id === chunk.id 
              ? { 
                  ...c, 
                  status: 'error', 
                  lastError: error.message,
                  retryCount: c.retryCount + 1
                }
              : c
          ),
          activeChunks: prev.activeChunks.filter(id => id !== chunk.id),
          failedChunks: [...prev.failedChunks, chunk.id]
        }));
      });
    }
  }, [isPaused, getNextChunks, loadChunk]);

  // Start/stop loading
  const startLoading = useCallback(() => {
    setIsLoading(true);
    setIsPaused(false);
    startTime.current = Date.now();
    
    loadingInterval.current = setInterval(() => {
      processQueue();
      
      // Update elapsed time
      setQueue(prev => ({
        ...prev,
        elapsedTime: Date.now() - startTime.current
      }));
    }, 100);
  }, [processQueue]);

  const pauseLoading = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeLoading = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setIsPaused(false);
    
    if (loadingInterval.current) {
      clearInterval(loadingInterval.current);
      loadingInterval.current = null;
    }
  }, []);

  const resetQueue = useCallback(() => {
    stopLoading();
    setQueue(prev => ({
      ...prev,
      chunks: prev.chunks.map(chunk => ({
        ...chunk,
        progress: 0,
        status: 'pending',
        retryCount: 0,
        lastError: undefined,
        actualTime: undefined
      })),
      activeChunks: [],
      completedChunks: [],
      failedChunks: [],
      loadedSize: 0,
      elapsedTime: 0
    }));
    setBandwidth({
      current: 0,
      average: 0,
      peak: 0,
      samples: [],
      lastMeasurement: Date.now()
    });
  }, [stopLoading]);

  // Retry failed chunks
  const retryFailedChunks = useCallback(() => {
    setQueue(prev => ({
      ...prev,
      chunks: prev.chunks.map(chunk => 
        prev.failedChunks.includes(chunk.id) && chunk.retryCount < settings.maxRetries
          ? { ...chunk, status: 'pending', lastError: undefined }
          : chunk
      ),
      failedChunks: prev.failedChunks.filter(id => {
        const chunk = prev.chunks.find(c => c.id === id);
        return chunk && chunk.retryCount >= settings.maxRetries;
      })
    }));
  }, [settings.maxRetries]);

  // Strategy change
  const changeStrategy = useCallback((strategyName: string) => {
    const strategy = LOADING_STRATEGIES.find(s => s.name === strategyName);
    if (strategy) {
      setCurrentStrategy(strategy);
      setSettings(prev => ({ ...prev, strategy: strategyName }));
    }
  }, []);

  useEffect(() => {
    initializeSampleData();
    return () => {
      if (loadingInterval.current) {
        clearInterval(loadingInterval.current);
      }
    };
  }, [initializeSampleData]);

  // Calculate statistics
  const totalProgress = queue.totalSize > 0 ? (queue.loadedSize / queue.totalSize) * 100 : 0;
  const completedCount = queue.completedChunks.length;
  const totalCount = queue.chunks.length;
  const failedCount = queue.failedChunks.length;
  const activeCount = queue.activeChunks.length;
  const estimatedTimeRemaining = queue.estimatedTotalTime - queue.elapsedTime;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'loading': return 'text-blue-600';
      case 'error': return 'text-red-600';
      case 'paused': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'loading': return <Download className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Progressive Loader
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Control Panel */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {!isLoading ? (
                <Button onClick={startLoading} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Start Loading
                </Button>
              ) : (
                <div className="flex gap-2">
                  {isPaused ? (
                    <Button onClick={resumeLoading} className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                  ) : (
                    <Button onClick={pauseLoading} variant="outline" className="flex items-center gap-2">
                      <Pause className="w-4 h-4" />
                      Pause
                    </Button>
                  )}
                  <Button onClick={stopLoading} variant="destructive">
                    Stop
                  </Button>
                </div>
              )}
              <Button onClick={resetQueue} variant="outline">
                Reset
              </Button>
              {failedCount > 0 && (
                <Button onClick={retryFailedChunks} variant="outline">
                  Retry Failed ({failedCount})
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={currentStrategy.name}
                onChange={(e) => changeStrategy(e.target.value)}
                className="p-2 border rounded-md"
              >
                {LOADING_STRATEGIES.map(strategy => (
                  <option key={strategy.name} value={strategy.name}>
                    {strategy.name} - {strategy.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Overall Progress</span>
                </div>
                <div className="text-2xl font-bold mb-2">{totalProgress.toFixed(1)}%</div>
                <Progress value={totalProgress} className="mb-2" />
                <div className="text-xs text-gray-500">
                  {completedCount} / {totalCount} chunks
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Bandwidth</span>
                </div>
                <div className="text-2xl font-bold mb-2">
                  {(bandwidth.current / 1024 / 1024).toFixed(1)} MB/s
                </div>
                <div className="text-xs text-gray-500">
                  Avg: {(bandwidth.average / 1024 / 1024).toFixed(1)} MB/s
                </div>
                <div className="text-xs text-gray-500">
                  Peak: {(bandwidth.peak / 1024 / 1024).toFixed(1)} MB/s
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Time</span>
                </div>
                <div className="text-2xl font-bold mb-2">
                  {Math.floor(queue.elapsedTime / 1000)}s
                </div>
                <div className="text-xs text-gray-500">
                  ETA: {Math.floor(Math.max(0, estimatedTimeRemaining) / 1000)}s
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <div className="text-2xl font-bold mb-2">{activeCount}</div>
                <div className="text-xs text-gray-500">
                  Max: {currentStrategy.maxConcurrent}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Alerts */}
          {failedCount > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {failedCount} chunks failed to load. Click "Retry Failed" to attempt loading them again.
              </AlertDescription>
            </Alert>
          )}

          {isPaused && (
            <Alert className="mb-4">
              <Pause className="h-4 w-4" />
              <AlertDescription>
                Loading is paused. Click "Resume" to continue.
              </AlertDescription>
            </Alert>
          )}

          {/* Chunk Details */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Loading Queue</h3>
            {queue.chunks.slice(0, 20).map((chunk) => (
              <Card key={chunk.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(chunk.status)}>
                      {getStatusIcon(chunk.status)}
                    </div>
                    <Badge variant="outline">{chunk.type}</Badge>
                    <span className="font-medium text-sm">{chunk.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {(chunk.size / 1024).toFixed(0)} KB
                    </span>
                    <Badge className={getStatusColor(chunk.status)}>
                      {chunk.status}
                    </Badge>
                  </div>
                </div>
                
                {chunk.status === 'loading' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress: {chunk.progress.toFixed(0)}%</span>
                      <span>ETA: {chunk.estimatedTime}ms</span>
                    </div>
                    <Progress value={chunk.progress} className="h-2" />
                  </div>
                )}
                
                {chunk.status === 'error' && chunk.lastError && (
                  <div className="text-xs text-red-600 mt-1">
                    Error: {chunk.lastError} (Retry {chunk.retryCount}/{settings.maxRetries})
                  </div>
                )}
                
                {chunk.dependencies.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Depends on: {chunk.dependencies.join(', ')}
                  </div>
                )}
              </Card>
            ))}
            
            {queue.chunks.length > 20 && (
              <div className="text-center text-sm text-gray-500 py-2">
                ... and {queue.chunks.length - 20} more chunks
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4" />
                Loader Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Adaptive Quality</label>
                  <Switch
                    checked={settings.enableAdaptiveQuality}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enableAdaptiveQuality: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Prefetching</label>
                  <Switch
                    checked={settings.enablePrefetching}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enablePrefetching: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Caching</label>
                  <Switch
                    checked={settings.enableCaching}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, enableCaching: checked }))
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Max Retries: {settings.maxRetries}
                  </label>
                  <Slider
                    value={[settings.maxRetries]}
                    onValueChange={([value]) => 
                      setSettings(prev => ({ ...prev, maxRetries: value }))
                    }
                    max={10}
                    min={0}
                    step={1}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Chunk Size: {settings.chunkSize} KB
                  </label>
                  <Slider
                    value={[settings.chunkSize]}
                    onValueChange={([value]) => 
                      setSettings(prev => ({ ...prev, chunkSize: value }))
                    }
                    max={1024}
                    min={64}
                    step={64}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressiveLoader;
export type { LoadingChunk, LoadingQueue, LoadingStrategy, BandwidthMetrics, ProgressiveLoaderSettings };