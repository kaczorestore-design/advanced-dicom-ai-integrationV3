import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Link,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Download,
  Upload,
  Shield,
  Clock,
  Users,
  FileText,
  Activity,
  Zap
} from 'lucide-react';

// FHIR Resource interfaces
interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    use?: string;
    type?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    system: string;
    value: string;
  }>;
  name: Array<{
    use?: string;
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  address?: Array<{
    use?: string;
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  telecom?: Array<{
    system: 'phone' | 'email' | 'fax';
    value: string;
    use?: string;
  }>;
}

interface FHIRImagingStudy {
  resourceType: 'ImagingStudy';
  id: string;
  identifier: Array<{
    system: string;
    value: string;
  }>;
  status: 'registered' | 'available' | 'cancelled' | 'entered-in-error' | 'unknown';
  subject: {
    reference: string;
    display?: string;
  };
  started: string;
  numberOfSeries: number;
  numberOfInstances: number;
  modality: Array<{
    system: string;
    code: string;
    display: string;
  }>;
  description?: string;
  series: Array<{
    uid: string;
    number: number;
    modality: {
      system: string;
      code: string;
      display: string;
    };
    description?: string;
    numberOfInstances: number;
    bodySite?: {
      system: string;
      code: string;
      display: string;
    };
    instance: Array<{
      uid: string;
      sopClass: {
        system: string;
        code: string;
      };
      number: number;
    }>;
  }>;
}

interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown';
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string;
  issued: string;
  performer: Array<{
    reference: string;
    display?: string;
  }>;
  imagingStudy?: Array<{
    reference: string;
    display?: string;
  }>;
  conclusion?: string;
  conclusionCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
}

// EMR System Configuration
interface EMRSystem {
  id: string;
  name: string;
  type: 'epic' | 'cerner' | 'allscripts' | 'athenahealth' | 'custom' | 'fhir';
  baseUrl: string;
  fhirVersion: 'R4' | 'R5' | 'STU3' | 'DSTU2';
  authType: 'oauth2' | 'basic' | 'bearer' | 'apikey' | 'certificate';
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  tokenUrl?: string;
  authUrl?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  certificatePath?: string;
  isActive: boolean;
  lastSync: number;
  syncInterval: number; // minutes
  capabilities: string[];
  customHeaders: Record<string, string>;
  timeout: number; // seconds
  retryAttempts: number;
}

// Integration Status
interface IntegrationStatus {
  systemId: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastConnection: number;
  lastError?: string;
  syncProgress: number;
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  latency: number; // ms
}

// Sync Configuration
interface SyncConfiguration {
  enableAutoSync: boolean;
  syncInterval: number; // minutes
  syncResources: string[];
  batchSize: number;
  enableRealTimeUpdates: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
  enableAuditLog: boolean;
  retentionPeriod: number; // days
}

// Audit Log Entry
interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'create' | 'read' | 'update' | 'delete' | 'sync';
  resourceType: string;
  resourceId: string;
  userId: string;
  systemId: string;
  success: boolean;
  errorMessage?: string;
  details: Record<string, any>;
}

const EMRIntegration: React.FC = () => {
  const [emrSystems, setEmrSystems] = useState<EMRSystem[]>([]);
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([]);
  const [syncConfig, setSyncConfig] = useState<SyncConfiguration>({
    enableAutoSync: true,
    syncInterval: 30,
    syncResources: ['Patient', 'ImagingStudy', 'DiagnosticReport'],
    batchSize: 100,
    enableRealTimeUpdates: false,
    conflictResolution: 'remote',
    enableAuditLog: true,
    retentionPeriod: 90
  });
  
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize EMR systems
  const initializeEMRSystems = useCallback(() => {
    const defaultSystems: EMRSystem[] = [
      {
        id: 'epic-main',
        name: 'Epic MyChart',
        type: 'epic',
        baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth',
        fhirVersion: 'R4',
        authType: 'oauth2',
        clientId: '',
        scope: 'Patient.read ImagingStudy.read DiagnosticReport.read',
        tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
        authUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
        isActive: false,
        lastSync: 0,
        syncInterval: 30,
        capabilities: ['Patient', 'ImagingStudy', 'DiagnosticReport', 'Practitioner'],
        customHeaders: {},
        timeout: 30,
        retryAttempts: 3
      },
      {
        id: 'cerner-main',
        name: 'Cerner PowerChart',
        type: 'cerner',
        baseUrl: 'https://fhir-open.cerner.com/r4',
        fhirVersion: 'R4',
        authType: 'oauth2',
        clientId: '',
        scope: 'patient/Patient.read patient/ImagingStudy.read patient/DiagnosticReport.read',
        tokenUrl: 'https://authorization.cerner.com/tenants/oauth/token',
        authUrl: 'https://authorization.cerner.com/tenants/oauth/authorize',
        isActive: false,
        lastSync: 0,
        syncInterval: 30,
        capabilities: ['Patient', 'ImagingStudy', 'DiagnosticReport', 'Observation'],
        customHeaders: {},
        timeout: 30,
        retryAttempts: 3
      },
      {
        id: 'custom-fhir',
        name: 'Custom FHIR Server',
        type: 'fhir',
        baseUrl: 'http://localhost:8080/fhir',
        fhirVersion: 'R4',
        authType: 'bearer',
        isActive: false,
        lastSync: 0,
        syncInterval: 15,
        capabilities: ['Patient', 'ImagingStudy', 'DiagnosticReport', 'Observation', 'Practitioner'],
        customHeaders: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        },
        timeout: 30,
        retryAttempts: 3
      }
    ];

    setEmrSystems(defaultSystems);
    
    // Initialize integration statuses
    const statuses: IntegrationStatus[] = defaultSystems.map(system => ({
      systemId: system.id,
      status: 'disconnected',
      lastConnection: 0,
      syncProgress: 0,
      totalRecords: 0,
      syncedRecords: 0,
      failedRecords: 0,
      latency: 0
    }));
    
    setIntegrationStatuses(statuses);
  }, []);

  // Test connection to EMR system
  const testConnection = useCallback(async (systemId: string) => {
    setIsTestingConnection(true);
    const system = emrSystems.find(s => s.id === systemId);
    
    if (!system) {
      addAuditLog({
        id: `test-${Date.now()}`,
        timestamp: Date.now(),
        action: 'read',
        resourceType: 'CapabilityStatement',
        resourceId: 'metadata',
        userId: 'current-user',
        systemId,
        success: false,
        errorMessage: 'System not found',
        details: { action: 'connection-test' }
      });
      setIsTestingConnection(false);
      return;
    }

    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure
      const success = Math.random() > 0.3;
      
      setIntegrationStatuses(prev => prev.map(status => 
        status.systemId === systemId 
          ? {
              ...status,
              status: success ? 'connected' : 'error',
              lastConnection: Date.now(),
              lastError: success ? undefined : 'Authentication failed',
              latency: Math.random() * 500 + 100
            }
          : status
      ));
      
      addAuditLog({
        id: `test-${Date.now()}`,
        timestamp: Date.now(),
        action: 'read',
        resourceType: 'CapabilityStatement',
        resourceId: 'metadata',
        userId: 'current-user',
        systemId,
        success,
        errorMessage: success ? undefined : 'Authentication failed',
        details: { 
          action: 'connection-test',
          baseUrl: system.baseUrl,
          fhirVersion: system.fhirVersion
        }
      });
      
    } catch (error) {
      setIntegrationStatuses(prev => prev.map(status => 
        status.systemId === systemId 
          ? {
              ...status,
              status: 'error',
              lastError: error instanceof Error ? error.message : 'Unknown error'
            }
          : status
      ));
    }
    
    setIsTestingConnection(false);
  }, [emrSystems]);

  // Sync data from EMR system
  const syncData = useCallback(async (systemId: string) => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    const system = emrSystems.find(s => s.id === systemId);
    if (!system) return;
    
    setIntegrationStatuses(prev => prev.map(status => 
      status.systemId === systemId 
        ? { ...status, status: 'syncing', syncProgress: 0 }
        : status
    ));
    
    try {
      // Simulate sync process
      const totalSteps = syncConfig.syncResources.length * syncConfig.batchSize;
      let completedSteps = 0;
      
      for (const resourceType of syncConfig.syncResources) {
        for (let batch = 0; batch < syncConfig.batchSize / 10; batch++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          completedSteps += 10;
          const progress = (completedSteps / totalSteps) * 100;
          setSyncProgress(progress);
          
          setIntegrationStatuses(prev => prev.map(status => 
            status.systemId === systemId 
              ? { ...status, syncProgress: progress }
              : status
          ));
        }
        
        addAuditLog({
          id: `sync-${Date.now()}-${resourceType}`,
          timestamp: Date.now(),
          action: 'sync',
          resourceType,
          resourceId: 'batch',
          userId: 'current-user',
          systemId,
          success: true,
          details: { 
            batchSize: syncConfig.batchSize / syncConfig.syncResources.length,
            resourceType
          }
        });
      }
      
      setIntegrationStatuses(prev => prev.map(status => 
        status.systemId === systemId 
          ? {
              ...status,
              status: 'connected',
              lastSync: Date.now(),
              syncProgress: 100,
              totalRecords: syncConfig.batchSize,
              syncedRecords: syncConfig.batchSize,
              failedRecords: 0
            }
          : status
      ));
      
    } catch (error) {
      setIntegrationStatuses(prev => prev.map(status => 
        status.systemId === systemId 
          ? {
              ...status,
              status: 'error',
              lastError: error instanceof Error ? error.message : 'Sync failed'
            }
          : status
      ));
    }
    
    setIsSyncing(false);
    setSyncProgress(0);
  }, [emrSystems, syncConfig]);

  // Add audit log entry
  const addAuditLog = useCallback((entry: AuditLogEntry) => {
    if (!syncConfig.enableAuditLog) return;
    
    setAuditLogs(prev => [entry, ...prev.slice(0, 99)]); // Keep last 100 entries
  }, [syncConfig.enableAuditLog]);

  // Update EMR system
  const updateEMRSystem = useCallback((systemId: string, updates: Partial<EMRSystem>) => {
    setEmrSystems(prev => prev.map(system => 
      system.id === systemId ? { ...system, ...updates } : system
    ));
  }, []);

  // Add new EMR system
  const addEMRSystem = useCallback(() => {
    const newSystem: EMRSystem = {
      id: `custom-${Date.now()}`,
      name: 'New EMR System',
      type: 'fhir',
      baseUrl: '',
      fhirVersion: 'R4',
      authType: 'bearer',
      isActive: false,
      lastSync: 0,
      syncInterval: 30,
      capabilities: ['Patient', 'ImagingStudy', 'DiagnosticReport'],
      customHeaders: {},
      timeout: 30,
      retryAttempts: 3
    };
    
    setEmrSystems(prev => [...prev, newSystem]);
    setIntegrationStatuses(prev => [...prev, {
      systemId: newSystem.id,
      status: 'disconnected',
      lastConnection: 0,
      syncProgress: 0,
      totalRecords: 0,
      syncedRecords: 0,
      failedRecords: 0,
      latency: 0
    }]);
  }, []);

  // Remove EMR system
  const removeEMRSystem = useCallback((systemId: string) => {
    setEmrSystems(prev => prev.filter(system => system.id !== systemId));
    setIntegrationStatuses(prev => prev.filter(status => status.systemId !== systemId));
  }, []);

  // Start auto sync
  const startAutoSync = useCallback(() => {
    if (!syncConfig.enableAutoSync) return;
    
    syncInterval.current = setInterval(() => {
      const activeSystems = emrSystems.filter(system => system.isActive);
      activeSystems.forEach(system => {
        const status = integrationStatuses.find(s => s.systemId === system.id);
        if (status?.status === 'connected') {
          syncData(system.id);
        }
      });
    }, syncConfig.syncInterval * 60 * 1000);
  }, [syncConfig, emrSystems, integrationStatuses, syncData]);

  // Stop auto sync
  const stopAutoSync = useCallback(() => {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
  }, []);

  useEffect(() => {
    initializeEMRSystems();
  }, [initializeEMRSystems]);

  useEffect(() => {
    if (syncConfig.enableAutoSync) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    
    return () => stopAutoSync();
  }, [syncConfig.enableAutoSync, startAutoSync, stopAutoSync]);

  const getStatusColor = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            EMR/HIS Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="systems" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="systems">EMR Systems</TabsTrigger>
              <TabsTrigger value="sync">Synchronization</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="systems" className="space-y-4">
              {/* EMR Systems Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Total Systems</span>
                    </div>
                    <div className="text-2xl font-bold">{emrSystems.length}</div>
                    <div className="text-xs text-gray-500">
                      {emrSystems.filter(s => s.isActive).length} active
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {integrationStatuses.filter(s => s.status === 'connected').length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Syncing</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {integrationStatuses.filter(s => s.status === 'syncing').length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* EMR Systems List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">EMR Systems</h3>
                  <Button onClick={addEMRSystem} className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Add System
                  </Button>
                </div>

                {emrSystems.map((system) => {
                  const status = integrationStatuses.find(s => s.systemId === system.id);
                  return (
                    <Card key={system.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(status?.status || 'disconnected')}
                            <div>
                              <CardTitle className="text-base">{system.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{system.type.toUpperCase()}</Badge>
                                <Badge variant="outline">{system.fhirVersion}</Badge>
                                <Badge variant={system.isActive ? 'default' : 'secondary'}>
                                  {system.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => testConnection(system.id)}
                              disabled={isTestingConnection}
                              size="sm"
                              variant="outline"
                            >
                              {isTestingConnection ? 'Testing...' : 'Test'}
                            </Button>
                            <Button
                              onClick={() => syncData(system.id)}
                              disabled={isSyncing || status?.status !== 'connected'}
                              size="sm"
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Sync
                            </Button>
                            <Button
                              onClick={() => setSelectedSystem(system.id)}
                              size="sm"
                              variant="outline"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => removeEMRSystem(system.id)}
                              size="sm"
                              variant="destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-1">Base URL</div>
                            <div className="text-sm text-gray-600 truncate">{system.baseUrl}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Authentication</div>
                            <div className="text-sm text-gray-600">{system.authType.toUpperCase()}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Last Sync</div>
                            <div className="text-sm text-gray-600">
                              {system.lastSync ? new Date(system.lastSync).toLocaleString() : 'Never'}
                            </div>
                          </div>
                        </div>
                        
                        {status && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Status</span>
                              <span className={`text-sm ${getStatusColor(status.status)}`}>
                                {status.status.toUpperCase()}
                              </span>
                            </div>
                            
                            {status.status === 'syncing' && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500">Sync Progress</span>
                                  <span className="text-xs text-gray-500">
                                    {status.syncProgress.toFixed(0)}%
                                  </span>
                                </div>
                                <Progress value={status.syncProgress} />
                              </div>
                            )}
                            
                            {status.lastError && (
                              <Alert>
                                <AlertTriangle className="w-4 h-4" />
                                <AlertDescription>{status.lastError}</AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
                              <div>
                                <div>Total Records</div>
                                <div className="font-medium">{status.totalRecords}</div>
                              </div>
                              <div>
                                <div>Synced</div>
                                <div className="font-medium text-green-600">{status.syncedRecords}</div>
                              </div>
                              <div>
                                <div>Failed</div>
                                <div className="font-medium text-red-600">{status.failedRecords}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* System Configuration Modal */}
              {selectedSystem && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Configure EMR System</CardTitle>
                      <Button
                        onClick={() => setSelectedSystem('')}
                        variant="outline"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const system = emrSystems.find(s => s.id === selectedSystem);
                      if (!system) return null;
                      
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="system-name">System Name</Label>
                              <Input
                                id="system-name"
                                value={system.name}
                                onChange={(e) => updateEMRSystem(system.id, { name: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="system-type">System Type</Label>
                              <Select
                                value={system.type}
                                onValueChange={(value: EMRSystem['type']) => 
                                  updateEMRSystem(system.id, { type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="epic">Epic</SelectItem>
                                  <SelectItem value="cerner">Cerner</SelectItem>
                                  <SelectItem value="allscripts">Allscripts</SelectItem>
                                  <SelectItem value="athenahealth">athenahealth</SelectItem>
                                  <SelectItem value="fhir">Generic FHIR</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="base-url">Base URL</Label>
                              <Input
                                id="base-url"
                                value={system.baseUrl}
                                onChange={(e) => updateEMRSystem(system.id, { baseUrl: e.target.value })}
                                placeholder="https://fhir.example.com/R4"
                              />
                            </div>
                            <div>
                              <Label htmlFor="fhir-version">FHIR Version</Label>
                              <Select
                                value={system.fhirVersion}
                                onValueChange={(value: EMRSystem['fhirVersion']) => 
                                  updateEMRSystem(system.id, { fhirVersion: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="R5">R5</SelectItem>
                                  <SelectItem value="R4">R4</SelectItem>
                                  <SelectItem value="STU3">STU3</SelectItem>
                                  <SelectItem value="DSTU2">DSTU2</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="auth-type">Authentication Type</Label>
                              <Select
                                value={system.authType}
                                onValueChange={(value: EMRSystem['authType']) => 
                                  updateEMRSystem(system.id, { authType: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                                  <SelectItem value="bearer">Bearer Token</SelectItem>
                                  <SelectItem value="basic">Basic Auth</SelectItem>
                                  <SelectItem value="apikey">API Key</SelectItem>
                                  <SelectItem value="certificate">Certificate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="system-active"
                                checked={system.isActive}
                                onCheckedChange={(checked) => 
                                  updateEMRSystem(system.id, { isActive: checked })
                                }
                              />
                              <Label htmlFor="system-active">Active</Label>
                            </div>
                          </div>
                          
                          {system.authType === 'oauth2' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="client-id">Client ID</Label>
                                <Input
                                  id="client-id"
                                  value={system.clientId || ''}
                                  onChange={(e) => updateEMRSystem(system.id, { clientId: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="client-secret">Client Secret</Label>
                                <Input
                                  id="client-secret"
                                  type="password"
                                  value={system.clientSecret || ''}
                                  onChange={(e) => updateEMRSystem(system.id, { clientSecret: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="token-url">Token URL</Label>
                                <Input
                                  id="token-url"
                                  value={system.tokenUrl || ''}
                                  onChange={(e) => updateEMRSystem(system.id, { tokenUrl: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="auth-url">Authorization URL</Label>
                                <Input
                                  id="auth-url"
                                  value={system.authUrl || ''}
                                  onChange={(e) => updateEMRSystem(system.id, { authUrl: e.target.value })}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label htmlFor="scope">Scope</Label>
                                <Input
                                  id="scope"
                                  value={system.scope || ''}
                                  onChange={(e) => updateEMRSystem(system.id, { scope: e.target.value })}
                                  placeholder="patient/Patient.read patient/ImagingStudy.read"
                                />
                              </div>
                            </div>
                          )}
                          
                          {(system.authType === 'basic' || system.authType === 'apikey') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {system.authType === 'basic' && (
                                <>
                                  <div>
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                      id="username"
                                      value={system.username || ''}
                                      onChange={(e) => updateEMRSystem(system.id, { username: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                      id="password"
                                      type="password"
                                      value={system.password || ''}
                                      onChange={(e) => updateEMRSystem(system.id, { password: e.target.value })}
                                    />
                                  </div>
                                </>
                              )}
                              {system.authType === 'apikey' && (
                                <div>
                                  <Label htmlFor="api-key">API Key</Label>
                                  <Input
                                    id="api-key"
                                    type="password"
                                    value={system.apiKey || ''}
                                    onChange={(e) => updateEMRSystem(system.id, { apiKey: e.target.value })}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sync" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Synchronization Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isSyncing && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sync in Progress</span>
                        <span className="text-sm text-gray-500">{syncProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={syncProgress} />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sync-interval">Auto Sync Interval (minutes)</Label>
                      <Input
                        id="sync-interval"
                        type="number"
                        value={syncConfig.syncInterval}
                        onChange={(e) => setSyncConfig(prev => ({ 
                          ...prev, 
                          syncInterval: parseInt(e.target.value) || 30 
                        }))}
                        min="5"
                        max="1440"
                      />
                    </div>
                    <div>
                      <Label htmlFor="batch-size">Batch Size</Label>
                      <Input
                        id="batch-size"
                        type="number"
                        value={syncConfig.batchSize}
                        onChange={(e) => setSyncConfig(prev => ({ 
                          ...prev, 
                          batchSize: parseInt(e.target.value) || 100 
                        }))}
                        min="10"
                        max="1000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-sync"
                        checked={syncConfig.enableAutoSync}
                        onCheckedChange={(checked) => 
                          setSyncConfig(prev => ({ ...prev, enableAutoSync: checked }))
                        }
                      />
                      <Label htmlFor="auto-sync">Enable Auto Sync</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="real-time"
                        checked={syncConfig.enableRealTimeUpdates}
                        onCheckedChange={(checked) => 
                          setSyncConfig(prev => ({ ...prev, enableRealTimeUpdates: checked }))
                        }
                      />
                      <Label htmlFor="real-time">Real-time Updates</Label>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Sync Resources</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {['Patient', 'ImagingStudy', 'DiagnosticReport', 'Observation', 'Practitioner', 'Organization'].map(resource => (
                        <div key={resource} className="flex items-center space-x-2">
                          <Switch
                            id={`resource-${resource}`}
                            checked={syncConfig.syncResources.includes(resource)}
                            onCheckedChange={(checked) => {
                              setSyncConfig(prev => ({
                                ...prev,
                                syncResources: checked 
                                  ? [...prev.syncResources, resource]
                                  : prev.syncResources.filter(r => r !== resource)
                              }));
                            }}
                          />
                          <Label htmlFor={`resource-${resource}`} className="text-sm">
                            {resource}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Audit Logs
                    </CardTitle>
                    <Button
                      onClick={() => setAuditLogs([])}
                      variant="outline"
                      size="sm"
                    >
                      Clear Logs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No audit logs available
                      </div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            {log.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {log.action.toUpperCase()} {log.resourceType}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.resourceId} • {new Date(log.timestamp).toLocaleString()}
                              </div>
                              {log.errorMessage && (
                                <div className="text-xs text-red-600 mt-1">
                                  {log.errorMessage}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">{log.userId}</div>
                            <Badge variant="outline" className="text-xs">
                              {emrSystems.find(s => s.id === log.systemId)?.name || log.systemId}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Integration Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="audit-log"
                        checked={syncConfig.enableAuditLog}
                        onCheckedChange={(checked) => 
                          setSyncConfig(prev => ({ ...prev, enableAuditLog: checked }))
                        }
                      />
                      <Label htmlFor="audit-log">Enable Audit Logging</Label>
                    </div>
                    
                    <div>
                      <Label htmlFor="retention-period">Log Retention Period (days)</Label>
                      <Input
                        id="retention-period"
                        type="number"
                        value={syncConfig.retentionPeriod}
                        onChange={(e) => setSyncConfig(prev => ({ 
                          ...prev, 
                          retentionPeriod: parseInt(e.target.value) || 90 
                        }))}
                        min="1"
                        max="365"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                      <Select
                        value={syncConfig.conflictResolution}
                        onValueChange={(value: SyncConfiguration['conflictResolution']) => 
                          setSyncConfig(prev => ({ ...prev, conflictResolution: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Prefer Local</SelectItem>
                          <SelectItem value="remote">Prefer Remote</SelectItem>
                          <SelectItem value="manual">Manual Resolution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          emrSystems.filter(s => s.isActive).forEach(system => {
                            testConnection(system.id);
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Test All Connections
                      </Button>
                      <Button
                        onClick={() => {
                          emrSystems.filter(s => s.isActive).forEach(system => {
                            const status = integrationStatuses.find(st => st.systemId === system.id);
                            if (status?.status === 'connected') {
                              syncData(system.id);
                            }
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Sync All Systems
                      </Button>
                      <Button
                        onClick={() => {
                          // Export configuration
                          const config = {
                            systems: emrSystems,
                            syncConfig,
                            timestamp: Date.now()
                          };
                          const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'emr-integration-config.json';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export Config
                      </Button>
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

export default EMRIntegration;
export type { 
  FHIRPatient, 
  FHIRImagingStudy, 
  FHIRDiagnosticReport, 
  EMRSystem, 
  IntegrationStatus, 
  SyncConfiguration, 
  AuditLogEntry 
};