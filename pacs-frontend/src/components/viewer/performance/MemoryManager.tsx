import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HardDrive,
  Cpu,
  Zap,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Database,
  Layers,
  Monitor
} from 'lucide-react';

// Memory management interfaces
interface MemoryBlock {
  id: string;
  type: 'texture' | 'buffer' | 'image' | 'volume' | 'cache' | 'metadata';
  size: number; // bytes
  allocated: number; // bytes actually used
  priority: number; // 1-10, higher = more important
  lastAccessed: number; // timestamp
  accessCount: number;
  isLocked: boolean; // prevent garbage collection
  gpuMemory: boolean; // stored in GPU memory
  compressed: boolean;
  compressionRatio: number;
  fragmentationLevel: number; // 0-1
}

interface MemoryPool {
  id: string;
  name: string;
  type: 'system' | 'gpu' | 'shared';
  totalSize: number;
  usedSize: number;
  freeSize: number;
  blocks: MemoryBlock[];
  fragmentationLevel: number;
  allocationStrategy: 'first-fit' | 'best-fit' | 'worst-fit' | 'buddy-system';
  gcThreshold: number; // percentage when GC triggers
  compressionEnabled: boolean;
}

interface GarbageCollectionStats {
  totalRuns: number;
  lastRunTime: number;
  lastRunDuration: number;
  totalFreedMemory: number;
  averageFreedPerRun: number;
  blocksCollected: number;
  fragmentationReduced: number;
}

interface MemoryManagerSettings {
  enableAutoGC: boolean;
  gcInterval: number; // ms
  gcThreshold: number; // percentage
  enableCompression: boolean;
  compressionLevel: number; // 1-9
  enableGPUMemory: boolean;
  maxGPUMemory: number; // MB
  enableMemoryPools: boolean;
  poolPreallocation: boolean;
  enableFragmentationMonitoring: boolean;
  lowMemoryThreshold: number; // percentage
  criticalMemoryThreshold: number; // percentage
}

interface MemoryAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  resolved: boolean;
}

const MemoryManager: React.FC = () => {
  const [pools, setPools] = useState<MemoryPool[]>([]);
  const [gcStats, setGcStats] = useState<GarbageCollectionStats>({
    totalRuns: 0,
    lastRunTime: 0,
    lastRunDuration: 0,
    totalFreedMemory: 0,
    averageFreedPerRun: 0,
    blocksCollected: 0,
    fragmentationReduced: 0
  });
  
  const [settings, setSettings] = useState<MemoryManagerSettings>({
    enableAutoGC: true,
    gcInterval: 30000, // 30 seconds
    gcThreshold: 80, // 80%
    enableCompression: true,
    compressionLevel: 6,
    enableGPUMemory: true,
    maxGPUMemory: 2048, // 2GB
    enableMemoryPools: true,
    poolPreallocation: true,
    enableFragmentationMonitoring: true,
    lowMemoryThreshold: 70,
    criticalMemoryThreshold: 90
  });

  const [alerts, setAlerts] = useState<MemoryAlert[]>([]);
  const [isGCRunning, setIsGCRunning] = useState(false);
  const [memoryPressure, setMemoryPressure] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  
  const gcInterval = useRef<NodeJS.Timeout | null>(null);
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize memory pools
  const initializeMemoryPools = useCallback(() => {
    const initialPools: MemoryPool[] = [
      {
        id: 'system-main',
        name: 'System Memory',
        type: 'system',
        totalSize: 4 * 1024 * 1024 * 1024, // 4GB
        usedSize: 0,
        freeSize: 4 * 1024 * 1024 * 1024,
        blocks: [],
        fragmentationLevel: 0,
        allocationStrategy: 'best-fit',
        gcThreshold: 80,
        compressionEnabled: true
      },
      {
        id: 'gpu-main',
        name: 'GPU Memory',
        type: 'gpu',
        totalSize: settings.maxGPUMemory * 1024 * 1024, // Convert MB to bytes
        usedSize: 0,
        freeSize: settings.maxGPUMemory * 1024 * 1024,
        blocks: [],
        fragmentationLevel: 0,
        allocationStrategy: 'first-fit',
        gcThreshold: 85,
        compressionEnabled: false // GPU memory typically not compressed
      },
      {
        id: 'shared-cache',
        name: 'Shared Cache',
        type: 'shared',
        totalSize: 1024 * 1024 * 1024, // 1GB
        usedSize: 0,
        freeSize: 1024 * 1024 * 1024,
        blocks: [],
        fragmentationLevel: 0,
        allocationStrategy: 'worst-fit',
        gcThreshold: 75,
        compressionEnabled: true
      }
    ];

    // Add sample memory blocks
    const sampleBlocks: MemoryBlock[] = [];
    for (let i = 0; i < 50; i++) {
      const types: MemoryBlock['type'][] = ['texture', 'buffer', 'image', 'volume', 'cache', 'metadata'];
      const type = types[Math.floor(Math.random() * types.length)];
      const size = Math.random() * 100 * 1024 * 1024 + 10 * 1024 * 1024; // 10-110 MB
      const allocated = size * (0.7 + Math.random() * 0.3); // 70-100% utilization
      
      sampleBlocks.push({
        id: `block-${i}`,
        type,
        size,
        allocated,
        priority: Math.floor(Math.random() * 10) + 1,
        lastAccessed: Date.now() - Math.random() * 3600000, // Within last hour
        accessCount: Math.floor(Math.random() * 100),
        isLocked: Math.random() < 0.1, // 10% locked
        gpuMemory: type === 'texture' || type === 'buffer',
        compressed: settings.enableCompression && Math.random() < 0.6,
        compressionRatio: 0.3 + Math.random() * 0.4, // 30-70% compression
        fragmentationLevel: Math.random() * 0.3 // 0-30% fragmentation
      });
    }

    // Distribute blocks among pools
    initialPools.forEach(pool => {
      const poolBlocks = sampleBlocks.filter(block => {
        if (pool.type === 'gpu') return block.gpuMemory;
        if (pool.type === 'shared') return block.type === 'cache';
        return !block.gpuMemory && block.type !== 'cache';
      });
      
      pool.blocks = poolBlocks;
      pool.usedSize = poolBlocks.reduce((sum, block) => sum + block.size, 0);
      pool.freeSize = pool.totalSize - pool.usedSize;
      pool.fragmentationLevel = poolBlocks.reduce((sum, block) => sum + block.fragmentationLevel, 0) / poolBlocks.length || 0;
    });

    setPools(initialPools);
  }, [settings.maxGPUMemory, settings.enableCompression]);

  // Garbage collection
  const runGarbageCollection = useCallback(async (poolId?: string) => {
    setIsGCRunning(true);
    const startTime = Date.now();
    let totalFreed = 0;
    let blocksCollected = 0;
    let fragmentationReduced = 0;

    setPools(prevPools => {
      return prevPools.map(pool => {
        if (poolId && pool.id !== poolId) return pool;
        
        const currentTime = Date.now();
        const oldFragmentation = pool.fragmentationLevel;
        
        // Identify blocks for collection
        const blocksToCollect = pool.blocks.filter(block => {
          if (block.isLocked) return false;
          
          // Collect based on various criteria
          const timeSinceAccess = currentTime - block.lastAccessed;
          const isOld = timeSinceAccess > 300000; // 5 minutes
          const isLowPriority = block.priority <= 3;
          const isUnderUtilized = (block.allocated / block.size) < 0.3;
          const isHighlyFragmented = block.fragmentationLevel > 0.5;
          
          return (isOld && isLowPriority) || isUnderUtilized || isHighlyFragmented;
        });
        
        const freedMemory = blocksToCollect.reduce((sum: number, block: any) => sum + block.size, 0);
        totalFreed += freedMemory;
        blocksCollected += blocksToCollect.length;
        
        // Remove collected blocks
        const remainingBlocks = pool.blocks.filter(block => !blocksToCollect.includes(block));
        
        // Defragment remaining blocks
        const defragmentedBlocks = remainingBlocks.map(block => ({
          ...block,
          fragmentationLevel: Math.max(0, block.fragmentationLevel - 0.1)
        }));
        
        const newFragmentation = defragmentedBlocks.reduce((sum, block) => sum + block.fragmentationLevel, 0) / defragmentedBlocks.length || 0;
        fragmentationReduced += Math.max(0, oldFragmentation - newFragmentation);
        
        return {
          ...pool,
          blocks: defragmentedBlocks,
          usedSize: pool.usedSize - freedMemory,
          freeSize: pool.freeSize + freedMemory,
          fragmentationLevel: newFragmentation
        };
      });
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    setGcStats(prev => ({
      totalRuns: prev.totalRuns + 1,
      lastRunTime: startTime,
      lastRunDuration: duration,
      totalFreedMemory: prev.totalFreedMemory + totalFreed,
      averageFreedPerRun: (prev.totalFreedMemory + totalFreed) / (prev.totalRuns + 1),
      blocksCollected: prev.blocksCollected + blocksCollected,
      fragmentationReduced: prev.fragmentationReduced + fragmentationReduced
    }));

    // Add success alert
    addAlert({
      id: `gc-${Date.now()}`,
      type: 'info',
      message: `Garbage collection completed. Freed ${(totalFreed / 1024 / 1024).toFixed(1)} MB, collected ${blocksCollected} blocks.`,
      timestamp: Date.now(),
      resolved: false
    });

    setTimeout(() => setIsGCRunning(false), 1000);
  }, []);

  // Memory compression
  const compressMemoryBlocks = useCallback((poolId: string) => {
    setPools(prevPools => {
      return prevPools.map(pool => {
        if (pool.id !== poolId || !pool.compressionEnabled) return pool;
        
        const compressedBlocks = pool.blocks.map(block => {
          if (block.compressed || block.isLocked) return block;
          
          const compressionRatio = 0.3 + Math.random() * 0.4; // 30-70% compression
          const newSize = block.size * (1 - compressionRatio);
          
          return {
            ...block,
            size: newSize,
            compressed: true,
            compressionRatio
          };
        });
        
        const newUsedSize = compressedBlocks.reduce((sum, block) => sum + block.size, 0);
        
        return {
          ...pool,
          blocks: compressedBlocks,
          usedSize: newUsedSize,
          freeSize: pool.totalSize - newUsedSize
        };
      });
    });
  }, []);

  // Memory monitoring
  const monitorMemoryPressure = useCallback(() => {
    const totalUsed = pools.reduce((sum, pool) => sum + pool.usedSize, 0);
    const totalSize = pools.reduce((sum, pool) => sum + pool.totalSize, 0);
    const usagePercentage = totalSize > 0 ? (totalUsed / totalSize) * 100 : 0;
    
    let newPressure: typeof memoryPressure = 'low';
    if (usagePercentage >= settings.criticalMemoryThreshold) {
      newPressure = 'critical';
    } else if (usagePercentage >= settings.lowMemoryThreshold + 10) {
      newPressure = 'high';
    } else if (usagePercentage >= settings.lowMemoryThreshold) {
      newPressure = 'medium';
    }
    
    if (newPressure !== memoryPressure) {
      setMemoryPressure(newPressure);
      
      if (newPressure === 'critical') {
        addAlert({
          id: `pressure-${Date.now()}`,
          type: 'error',
          message: `Critical memory pressure detected (${usagePercentage.toFixed(1)}%). Consider running garbage collection.`,
          timestamp: Date.now(),
          resolved: false
        });
      } else if (newPressure === 'high') {
        addAlert({
          id: `pressure-${Date.now()}`,
          type: 'warning',
          message: `High memory pressure detected (${usagePercentage.toFixed(1)}%). Memory optimization recommended.`,
          timestamp: Date.now(),
          resolved: false
        });
      }
    }
    
    // Auto GC if enabled and threshold reached
    if (settings.enableAutoGC && usagePercentage >= settings.gcThreshold) {
      runGarbageCollection();
    }
  }, [pools, memoryPressure, settings, runGarbageCollection, addAlert]);

  // Alert management
  const addAlert = useCallback((alert: MemoryAlert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Memory allocation simulation
  const allocateMemory = useCallback((poolId: string, size: number, type: MemoryBlock['type']) => {
    const newBlock: MemoryBlock = {
      id: `block-${Date.now()}`,
      type,
      size,
      allocated: size * (0.8 + Math.random() * 0.2),
      priority: Math.floor(Math.random() * 10) + 1,
      lastAccessed: Date.now(),
      accessCount: 1,
      isLocked: false,
      gpuMemory: poolId === 'gpu-main',
      compressed: false,
      compressionRatio: 0,
      fragmentationLevel: Math.random() * 0.1
    };

    setPools(prevPools => {
      return prevPools.map(pool => {
        if (pool.id !== poolId) return pool;
        
        if (pool.freeSize < size) {
          addAlert({
            id: `alloc-fail-${Date.now()}`,
            type: 'error',
            message: `Failed to allocate ${(size / 1024 / 1024).toFixed(1)} MB in ${pool.name}. Insufficient memory.`,
            timestamp: Date.now(),
            resolved: false
          });
          return pool;
        }
        
        return {
          ...pool,
          blocks: [...pool.blocks, newBlock],
          usedSize: pool.usedSize + size,
          freeSize: pool.freeSize - size
        };
      });
    });
  }, [addAlert]);

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    if (settings.enableAutoGC) {
      gcInterval.current = setInterval(() => {
        monitorMemoryPressure();
      }, settings.gcInterval);
    }
    
    monitoringInterval.current = setInterval(() => {
      monitorMemoryPressure();
    }, 5000); // Monitor every 5 seconds
  }, [settings, monitorMemoryPressure]);

  const stopMonitoring = useCallback(() => {
    if (gcInterval.current) {
      clearInterval(gcInterval.current);
      gcInterval.current = null;
    }
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
  }, []);

  useEffect(() => {
    initializeMemoryPools();
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [initializeMemoryPools, startMonitoring, stopMonitoring]);

  // Calculate statistics
  const totalMemory = pools.reduce((sum, pool) => sum + pool.totalSize, 0);
  const usedMemory = pools.reduce((sum, pool) => sum + pool.usedSize, 0);

  const memoryUsagePercentage = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;
  const averageFragmentation = pools.reduce((sum, pool) => sum + pool.fragmentationLevel, 0) / pools.length || 0;
  const totalBlocks = pools.reduce((sum, pool) => sum + pool.blocks.length, 0);

  const getPressureColor = (pressure: typeof memoryPressure) => {
    switch (pressure) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getAlertIcon = (type: MemoryAlert['type']) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Memory Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pools">Memory Pools</TabsTrigger>
              <TabsTrigger value="gc">Garbage Collection</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Memory Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Total Memory</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">
                      {(totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB
                    </div>
                    <div className="text-xs text-gray-500">
                      {totalBlocks} blocks allocated
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Usage</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">
                      {memoryUsagePercentage.toFixed(1)}%
                    </div>
                    <Progress value={memoryUsagePercentage} className="mb-2" />
                    <div className="text-xs text-gray-500">
                      {(usedMemory / 1024 / 1024 / 1024).toFixed(1)} / {(totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Fragmentation</span>
                    </div>
                    <div className="text-2xl font-bold mb-2">
                      {(averageFragmentation * 100).toFixed(1)}%
                    </div>
                    <Progress value={averageFragmentation * 100} className="mb-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium">Pressure</span>
                    </div>
                    <div className={`text-2xl font-bold mb-2 ${getPressureColor(memoryPressure)}`}>
                      {memoryPressure.toUpperCase()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Memory Alerts</CardTitle>
                      <Button onClick={clearAlerts} variant="outline" size="sm">
                        Clear All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {alerts.map((alert) => (
                        <Alert key={alert.id} className={alert.resolved ? 'opacity-50' : ''}>
                          {getAlertIcon(alert.type)}
                          <AlertDescription className="flex items-center justify-between">
                            <span>{alert.message}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                              {!alert.resolved && (
                                <Button
                                  onClick={() => resolveAlert(alert.id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => runGarbageCollection()}
                      disabled={isGCRunning}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isGCRunning ? 'Running GC...' : 'Run GC'}
                    </Button>
                    <Button
                      onClick={() => allocateMemory('system-main', 50 * 1024 * 1024, 'image')}
                      variant="outline"
                    >
                      Allocate 50MB
                    </Button>
                    <Button
                      onClick={() => compressMemoryBlocks('system-main')}
                      variant="outline"
                    >
                      Compress Memory
                    </Button>
                    <Button
                      onClick={initializeMemoryPools}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset Pools
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pools" className="space-y-4">
              <div className="space-y-4">
                {pools.map((pool) => (
                  <Card key={pool.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {pool.type === 'gpu' && <Zap className="w-4 h-4 text-yellow-600" />}
                          {pool.type === 'system' && <Cpu className="w-4 h-4 text-blue-600" />}
                          {pool.type === 'shared' && <Database className="w-4 h-4 text-green-600" />}
                          {pool.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{pool.allocationStrategy}</Badge>
                          <Button
                            onClick={() => runGarbageCollection(pool.id)}
                            size="sm"
                            variant="outline"
                          >
                            Clean Pool
                          </Button>
                          {pool.compressionEnabled && (
                            <Button
                              onClick={() => compressMemoryBlocks(pool.id)}
                              size="sm"
                              variant="outline"
                            >
                              Compress
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-1">Memory Usage</div>
                            <div className="text-2xl font-bold">
                              {((pool.usedSize / pool.totalSize) * 100).toFixed(1)}%
                            </div>
                            <Progress value={(pool.usedSize / pool.totalSize) * 100} className="mt-2" />
                            <div className="text-xs text-gray-500 mt-1">
                              {(pool.usedSize / 1024 / 1024).toFixed(0)} / {(pool.totalSize / 1024 / 1024).toFixed(0)} MB
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Fragmentation</div>
                            <div className="text-2xl font-bold">
                              {(pool.fragmentationLevel * 100).toFixed(1)}%
                            </div>
                            <Progress value={pool.fragmentationLevel * 100} className="mt-2" />
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Blocks</div>
                            <div className="text-2xl font-bold">{pool.blocks.length}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              GC Threshold: {pool.gcThreshold}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          <div className="text-sm font-medium">Recent Blocks</div>
                          {pool.blocks.slice(0, 5).map((block) => (
                            <div key={block.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{block.type}</Badge>
                                <span className="text-sm">{block.id}</span>
                                {block.isLocked && <Badge variant="destructive">Locked</Badge>}
                                {block.compressed && <Badge variant="secondary">Compressed</Badge>}
                              </div>
                              <div className="text-sm text-gray-500">
                                {(block.size / 1024 / 1024).toFixed(1)} MB
                              </div>
                            </div>
                          ))}
                          {pool.blocks.length > 5 && (
                            <div className="text-center text-sm text-gray-500">
                              ... and {pool.blocks.length - 5} more blocks
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Garbage Collection Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-1">Total Runs</div>
                      <div className="text-2xl font-bold">{gcStats.totalRuns}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Total Freed</div>
                      <div className="text-2xl font-bold">
                        {(gcStats.totalFreedMemory / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Average per Run</div>
                      <div className="text-2xl font-bold">
                        {(gcStats.averageFreedPerRun / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Last Run Duration</div>
                      <div className="text-2xl font-bold">{gcStats.lastRunDuration} ms</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Blocks Collected</div>
                      <div className="text-2xl font-bold">{gcStats.blocksCollected}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Fragmentation Reduced</div>
                      <div className="text-2xl font-bold">
                        {(gcStats.fragmentationReduced * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {gcStats.lastRunTime > 0 && (
                    <div className="mt-4 text-sm text-gray-500">
                      Last run: {new Date(gcStats.lastRunTime).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Memory Manager Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto Garbage Collection</label>
                      <Switch
                        checked={settings.enableAutoGC}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, enableAutoGC: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Memory Compression</label>
                      <Switch
                        checked={settings.enableCompression}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, enableCompression: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">GPU Memory</label>
                      <Switch
                        checked={settings.enableGPUMemory}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, enableGPUMemory: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Memory Pools</label>
                      <Switch
                        checked={settings.enableMemoryPools}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, enableMemoryPools: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        GC Threshold: {settings.gcThreshold}%
                      </label>
                      <Slider
                        value={[settings.gcThreshold]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({ ...prev, gcThreshold: value }))
                        }
                        max={95}
                        min={50}
                        step={5}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        GC Interval: {settings.gcInterval / 1000}s
                      </label>
                      <Slider
                        value={[settings.gcInterval / 1000]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({ ...prev, gcInterval: value * 1000 }))
                        }
                        max={300}
                        min={10}
                        step={10}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Max GPU Memory: {settings.maxGPUMemory} MB
                      </label>
                      <Slider
                        value={[settings.maxGPUMemory]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({ ...prev, maxGPUMemory: value }))
                        }
                        max={8192}
                        min={512}
                        step={256}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Low Memory Threshold: {settings.lowMemoryThreshold}%
                      </label>
                      <Slider
                        value={[settings.lowMemoryThreshold]}
                        onValueChange={([value]) => 
                          setSettings(prev => ({ ...prev, lowMemoryThreshold: value }))
                        }
                        max={90}
                        min={50}
                        step={5}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemoryManager;
export type { MemoryBlock, MemoryPool, GarbageCollectionStats, MemoryManagerSettings, MemoryAlert };