// Integration Service for EMR/HIS Systems
// Manages connections, data synchronization, and workflow integration

import { FHIRClient, FHIRClientFactory } from '../utils/fhirClient';
import { HL7Parser, HL7AckBuilder, type HL7Message, type HL7Patient, type HL7Order as ImportedHL7Order, type HL7Observation as ImportedHL7Observation } from '../utils/hl7Handler';

// HL7 Object Interfaces - using imported types from hl7Handler

// Integration Configuration
interface IntegrationConfig {
  id: string;
  name: string;
  type: 'epic' | 'cerner' | 'allscripts' | 'athenahealth' | 'custom_fhir' | 'hl7_v2';
  enabled: boolean;
  endpoint: string;
  authentication: {
    type: 'oauth2' | 'basic' | 'api_key' | 'certificate';
    clientId?: string;
    clientSecret?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    certificatePath?: string;
    tokenEndpoint?: string;
    scope?: string;
  };
  settings: {
    autoSync: boolean;
    syncInterval: number; // minutes
    batchSize: number;
    retryAttempts: number;
    timeout: number; // seconds
    enableRealTime: boolean;
    resourceTypes: string[];
    customHeaders?: Record<string, string>;
    webhookUrl?: string;
    encryptionEnabled: boolean;
  };
  mapping: {
    patientIdField: string;
    studyIdField: string;
    modalityField: string;
    dateField: string;
    customMappings: Record<string, string>;
  };
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  errorMessage?: string;
}

// Sync Status
interface SyncStatus {
  configId: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  startTime?: string;
  endTime?: string;
  recordsProcessed: number;
  recordsTotal: number;
  errors: Array<{
    message: string;
    timestamp: string;
    resourceId?: string;
  }>;
  lastSuccessfulSync?: string;
}

// Integration Event
interface IntegrationEvent {
  id: string;
  configId: string;
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'connection_lost' | 'data_received' | 'webhook_received';
  timestamp: string;
  data: Record<string, unknown>;
  message?: string;
}

// Webhook Payload
interface WebhookPayload extends Record<string, unknown> {
  event: string;
  timestamp: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  source: string;
}

// Data Mapping Result
interface MappingResult {
  success: boolean;
  mappedData: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

// Integration Statistics
interface IntegrationStats {
  configId: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRecords: number;
  averageSyncTime: number; // seconds
  lastSyncDuration: number; // seconds
  uptime: number; // percentage
  errorRate: number; // percentage
  dataVolume: {
    patients: number;
    studies: number;
    reports: number;
    orders: number;
  };
}

class IntegrationService {
  private configs: Map<string, IntegrationConfig> = new Map();
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private fhirClients: Map<string, FHIRClient> = new Map();
  private eventListeners: Map<string, ((event: IntegrationEvent) => void)[]> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private webhookServer?: { close: () => void; listen: (port: number) => void };
  constructor() {
    this.loadConfigurations();
    this.initializeWebhookServer();
  }

  // Configuration Management
  async addConfiguration(config: IntegrationConfig): Promise<void> {
    try {
      // Validate configuration
      this.validateConfiguration(config);
      
      // Test connection
      await this.testConnection(config);
      
      // Store configuration
      this.configs.set(config.id, config);
      
      // Initialize sync status
      this.syncStatuses.set(config.id, {
        configId: config.id,
        status: 'idle',
        recordsProcessed: 0,
        recordsTotal: 0,
        errors: []
      });
      
      // Setup FHIR client if needed
      if (config.type.includes('fhir') || ['epic', 'cerner', 'allscripts', 'athenahealth'].includes(config.type)) {
        const fhirClient = FHIRClientFactory.getClient({
          id: config.id,
          name: config.name,
          type: config.type === 'custom_fhir' ? 'fhir' : config.type === 'hl7_v2' ? 'custom' : config.type,
          baseUrl: config.endpoint,
          fhirVersion: 'R4',
          authType: config.authentication.type === 'api_key' ? 'apikey' : config.authentication.type,
          clientId: config.authentication.clientId,
          clientSecret: config.authentication.clientSecret,
          username: config.authentication.username,
          password: config.authentication.password,
          apiKey: config.authentication.apiKey,
          tokenUrl: config.authentication.tokenEndpoint,
          scope: config.authentication.scope,
          isActive: true,
          lastSync: Date.now(),
          syncInterval: config.settings.syncInterval,
          capabilities: config.settings.resourceTypes,
           customHeaders: config.settings.customHeaders || {},
           timeout: config.settings.timeout,
           retryAttempts: 3
        });
        this.fhirClients.set(config.id, fhirClient);
      }
      
      // Start auto-sync if enabled
      if (config.enabled && config.settings.autoSync) {
        this.startAutoSync(config.id);
      }
      
      // Save configurations
      await this.saveConfigurations();
      
      // Emit event
      this.emitEvent({
        id: this.generateId(),
        configId: config.id,
        type: 'sync_started',
        timestamp: new Date().toISOString(),
        data: config as unknown as Record<string, unknown>,
        message: `Configuration ${config.name} added successfully`
      });
      
    } catch (error) {
      throw new Error(`Failed to add configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateConfiguration(configId: string, updates: Partial<IntegrationConfig>): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    const updatedConfig = { ...config, ...updates };
    this.validateConfiguration(updatedConfig);
    
    // Test connection if endpoint or auth changed
    if (updates.endpoint || updates.authentication) {
      await this.testConnection(updatedConfig);
    }
    
    this.configs.set(configId, updatedConfig);
    
    // Update FHIR client if needed
    if (this.fhirClients.has(configId)) {
      const fhirClient = FHIRClientFactory.getClient({
        id: updatedConfig.id,
        name: updatedConfig.name,
        type: updatedConfig.type === 'custom_fhir' ? 'fhir' : updatedConfig.type === 'hl7_v2' ? 'custom' : updatedConfig.type,
        baseUrl: updatedConfig.endpoint,
        fhirVersion: 'R4',
        authType: updatedConfig.authentication.type === 'api_key' ? 'apikey' : updatedConfig.authentication.type,
        clientId: updatedConfig.authentication.clientId,
        clientSecret: updatedConfig.authentication.clientSecret,
        username: updatedConfig.authentication.username,
        password: updatedConfig.authentication.password,
        apiKey: updatedConfig.authentication.apiKey,
        tokenUrl: updatedConfig.authentication.tokenEndpoint,
        scope: updatedConfig.authentication.scope,
        isActive: true,
        lastSync: Date.now(),
        syncInterval: updatedConfig.settings.syncInterval,
        capabilities: updatedConfig.settings.resourceTypes,
           customHeaders: updatedConfig.settings.customHeaders || {},
           timeout: updatedConfig.settings.timeout,
           retryAttempts: 3
      });
      this.fhirClients.set(configId, fhirClient);
    }
    
    // Restart auto-sync if settings changed
    if (updates.settings?.autoSync !== undefined || updates.settings?.syncInterval !== undefined) {
      this.stopAutoSync(configId);
      if (updatedConfig.enabled && updatedConfig.settings.autoSync) {
        this.startAutoSync(configId);
      }
    }
    
    await this.saveConfigurations();
  }

  async removeConfiguration(configId: string): Promise<void> {
    this.stopAutoSync(configId);
    this.configs.delete(configId);
    this.syncStatuses.delete(configId);
    this.fhirClients.delete(configId);
    this.eventListeners.delete(configId);
    await this.saveConfigurations();
  }

  getConfiguration(configId: string): IntegrationConfig | undefined {
    return this.configs.get(configId);
  }

  getAllConfigurations(): IntegrationConfig[] {
    return Array.from(this.configs.values());
  }

  // Connection Testing
  async testConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      if (config.type.includes('fhir') || ['epic', 'cerner', 'allscripts', 'athenahealth'].includes(config.type)) {
        const fhirClient = FHIRClientFactory.getClient({
          id: config.id,
          name: config.name,
          type: config.type === 'custom_fhir' ? 'fhir' : config.type === 'hl7_v2' ? 'custom' : config.type,
          baseUrl: config.endpoint,
          fhirVersion: 'R4',
          authType: config.authentication.type === 'api_key' ? 'apikey' : config.authentication.type,
          clientId: config.authentication.clientId,
          clientSecret: config.authentication.clientSecret,
          username: config.authentication.username,
          password: config.authentication.password,
          apiKey: config.authentication.apiKey,
          tokenUrl: config.authentication.tokenEndpoint,
          scope: config.authentication.scope,
          isActive: true,
          lastSync: Date.now(),
          syncInterval: 60,
          capabilities: [],
           customHeaders: {},
           timeout: 30,
           retryAttempts: 3
        });
        
        // Test with a simple capability statement request
        await fhirClient.read('metadata', '');
        return true;
      } else if (config.type === 'hl7_v2') {
        // Test HL7 v2 connection (TCP/MLLP)
        return await this.testHL7Connection();
      }
      
      return false;
    } catch (error) {
      console.error(`Connection test failed for ${config.name}:`, error);
      return false;
    }
  }

  private async testHL7Connection(): Promise<boolean> {
    // Implement HL7 v2 connection test
    // This would typically involve establishing a TCP connection
    // and sending a test message
    return new Promise((resolve) => {
      // Simplified test - in real implementation, use TCP socket
      setTimeout(() => resolve(true), 1000);
    });
  }

  // Data Synchronization
  async syncData(configId: string, resourceTypes?: string[]): Promise<SyncStatus> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    const syncStatus = this.syncStatuses.get(configId)!;
    syncStatus.status = 'syncing';
    syncStatus.startTime = new Date().toISOString();
    syncStatus.recordsProcessed = 0;
    syncStatus.errors = [];

    this.emitEvent({
      id: this.generateId(),
      configId,
      type: 'sync_started',
      timestamp: new Date().toISOString(),
      data: { resourceTypes }
    });

    try {
      const typesToSync = resourceTypes || config.settings.resourceTypes;
      
      for (const resourceType of typesToSync) {
        await this.syncResourceType(config, resourceType, syncStatus);
      }

      syncStatus.status = 'completed';
      syncStatus.endTime = new Date().toISOString();
      syncStatus.lastSuccessfulSync = new Date().toISOString();
      
      config.lastSync = new Date().toISOString();
      config.status = 'connected';
      
      this.emitEvent({
        id: this.generateId(),
        configId,
        type: 'sync_completed',
        timestamp: new Date().toISOString(),
        data: syncStatus as unknown as Record<string, unknown>
      });
      
    } catch (error) {
      syncStatus.status = 'error';
      syncStatus.endTime = new Date().toISOString();
      syncStatus.errors.push({
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      config.status = 'error';
      config.errorMessage = error instanceof Error ? error.message : String(error);
      
      this.emitEvent({
        id: this.generateId(),
        configId,
        type: 'sync_failed',
        timestamp: new Date().toISOString(),
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    await this.saveConfigurations();
    return syncStatus;
  }

  private async syncResourceType(config: IntegrationConfig, resourceType: string, syncStatus: SyncStatus): Promise<void> {
    const fhirClient = this.fhirClients.get(config.id);
    if (!fhirClient) {
      throw new Error(`FHIR client not found for configuration ${config.id}`);
    }

    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const searchParams = {
          _count: config.settings.batchSize,
          _page: page
        };
        
        const bundle = await fhirClient.search(resourceType, searchParams);
        
        if (bundle.entry && bundle.entry.length > 0) {
          for (const entry of bundle.entry) {
            try {
              const mappedData = await this.mapResourceData(config, entry.resource as Record<string, unknown>);
              if (mappedData.success) {
                await this.storeResourceData(resourceType, mappedData.mappedData);
                syncStatus.recordsProcessed++;
              } else {
                syncStatus.errors.push({
                  message: `Mapping failed: ${mappedData.errors.join(', ')}`,
                  timestamp: new Date().toISOString(),
                  resourceId: (entry.resource as Record<string, unknown>)?.id as string
                });
              }
            } catch (error) {
              syncStatus.errors.push({
                message: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date().toISOString(),
                resourceId: (entry.resource as Record<string, unknown>)?.id as string
              });
            }
          }
          
          // Check for next page
          const nextLink = bundle.link?.find(link => link.relation === 'next');
          hasMore = !!nextLink;
          page++;
        } else {
          hasMore = false;
        }
        
      } catch (error) {
        throw new Error(`Failed to sync ${resourceType}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Data Mapping
  private async mapResourceData(config: IntegrationConfig, resource: Record<string, unknown>): Promise<MappingResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const mappedData: Record<string, unknown> = {};

    try {
      // Apply custom mappings
      for (const [sourceField, targetField] of Object.entries(config.mapping.customMappings)) {
        const value = this.getNestedValue(resource, sourceField);
        if (value !== undefined) {
          this.setNestedValue(mappedData, targetField, value);
        }
      }

      // Apply standard mappings
      if (resource.resourceType === 'Patient') {
        const patientResource = resource as any;
        mappedData.patientId = this.getNestedValue(resource, config.mapping.patientIdField) || patientResource.id;
        mappedData.name = patientResource.name?.[0];
        mappedData.birthDate = patientResource.birthDate;
        mappedData.gender = patientResource.gender;
        mappedData.address = patientResource.address?.[0];
        mappedData.telecom = patientResource.telecom;
      } else if (resource.resourceType === 'ImagingStudy') {
        const studyResource = resource as any;
        mappedData.studyId = this.getNestedValue(resource, config.mapping.studyIdField) || studyResource.id;
        mappedData.patientId = studyResource.subject?.reference?.split('/')?.[1];
        mappedData.modality = this.getNestedValue(resource, config.mapping.modalityField) || studyResource.modality?.[0]?.code;
        mappedData.studyDate = this.getNestedValue(resource, config.mapping.dateField) || studyResource.started;
        mappedData.description = studyResource.description;
        mappedData.series = studyResource.series;
      }

      return {
        success: errors.length === 0,
        mappedData,
        errors,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        mappedData: {},
        errors: [error instanceof Error ? error.message : String(error)],
        warnings
      };
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key: string) => current?.[key], obj);
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current: Record<string, unknown>, key: string): Record<string, unknown> => {
      if (!current[key]) current[key] = {};
      return current[key] as Record<string, unknown>;
    }, obj);
    (target as Record<string, unknown>)[lastKey] = value;
  }

  private async storeResourceData(resourceType: string, data: Record<string, unknown>): Promise<void> {
    // Store mapped data in local database
    // This would integrate with your local data storage system
    console.log(`Storing ${resourceType} data:`, data);
  }

  // Auto-sync Management
  private startAutoSync(configId: string): void {
    const config = this.configs.get(configId);
    if (!config || !config.settings.autoSync) return;

    const interval = setInterval(async () => {
      try {
        await this.syncData(configId);
      } catch (error) {
        console.error(`Auto-sync failed for ${config.name}:`, error);
      }
    }, config.settings.syncInterval * 60 * 1000);

    this.syncIntervals.set(configId, interval);
  }

  private stopAutoSync(configId: string): void {
    const interval = this.syncIntervals.get(configId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(configId);
    }
  }

  // HL7 Message Handling
  async processHL7Message(configId: string, hl7String: string): Promise<string> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    try {
      const message = HL7Parser.parseMessage(hl7String);
      
      // Process based on message type
      switch (message.messageType) {
        case 'ADT':
          await this.processADTMessage(config, message);
          break;
        case 'ORM':
          await this.processORMMessage(config, message);
          break;
        case 'ORU':
          await this.processORUMessage(config, message);
          break;
        default:
          console.warn(`Unsupported message type: ${message.messageType}`);
      }

      // Send acknowledgment
      return HL7AckBuilder.buildACK(message, 'AA', 'Message processed successfully');
      
    } catch (error) {
      console.error('HL7 message processing failed:', error);
      const message = HL7Parser.parseMessage(hl7String);
      return HL7AckBuilder.buildACK(message, 'AE', `Processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processADTMessage(config: IntegrationConfig, message: HL7Message): Promise<void> {
    const patient = HL7Parser.extractPatient(message);
    if (patient) {
      const mappedData = await this.mapHL7Patient(config, patient);
      if (mappedData.success) {
        await this.storeResourceData('Patient', mappedData.mappedData);
      }
    }
  }

  private async processORMMessage(config: IntegrationConfig, message: HL7Message): Promise<void> {
    const order = HL7Parser.extractOrder(message);
    if (order) {
      const mappedData = await this.mapHL7Order(config, order);
      if (mappedData.success) {
        await this.storeResourceData('ServiceRequest', mappedData.mappedData);
      }
    }
  }

  private async processORUMessage(config: IntegrationConfig, message: HL7Message): Promise<void> {
    const observations = HL7Parser.extractObservations(message);
    for (const observation of observations) {
      const mappedData = await this.mapHL7Observation(config, observation);
      if (mappedData.success) {
        await this.storeResourceData('Observation', mappedData.mappedData);
      }
    }
  }

  private async mapHL7Patient(config: IntegrationConfig, patient: HL7Patient): Promise<MappingResult> {
    // Convert HL7 patient to FHIR Patient resource
    const fhirPatient = {
      resourceType: 'Patient',
      id: patient.patientId,
      identifier: patient.patientIdList.map(id => ({
        value: id.id,
        system: id.assigningAuthority,
        type: { coding: [{ code: id.identifierTypeCode }] }
      })),
      name: [{
        family: patient.patientName.familyName,
        given: [patient.patientName.givenName, patient.patientName.middleName].filter(Boolean),
        prefix: patient.patientName.prefix ? [patient.patientName.prefix] : undefined,
        suffix: patient.patientName.suffix ? [patient.patientName.suffix] : undefined
      }],
      birthDate: patient.dateOfBirth,
      gender: patient.sex?.toLowerCase(),
      address: patient.address ? [{
        line: [patient.address.streetAddress],
        city: patient.address.city,
        state: patient.address.state,
        postalCode: patient.address.zipCode,
        country: patient.address.country
      }] : undefined,
      telecom: patient.phoneNumber ? [{
        system: 'phone',
        value: patient.phoneNumber
      }] : undefined
    };

    return this.mapResourceData(config, fhirPatient);
  }

  private async mapHL7Order(config: IntegrationConfig, order: ImportedHL7Order): Promise<MappingResult> {
    // Convert HL7 order to FHIR ServiceRequest
    const fhirServiceRequest = {
      resourceType: 'ServiceRequest',
      id: order.fillerOrderNumber || order.placerOrderNumber,
      identifier: [
        { value: order.placerOrderNumber, type: { text: 'Placer Order Number' } },
        { value: order.fillerOrderNumber, type: { text: 'Filler Order Number' } }
      ].filter(id => id.value),
      status: 'active',
      code: {
        coding: [{
          code: order.universalServiceId?.identifier,
          display: order.universalServiceId?.text,
          system: order.universalServiceId?.nameOfCodingSystem
        }]
      },
      priority: order.priority,
      authoredOn: order.requestedDateTime,
      reasonCode: order.relevantClinicalInfo ? [{ text: order.relevantClinicalInfo }] : undefined
    };

    return this.mapResourceData(config, fhirServiceRequest);
  }

  private async mapHL7Observation(config: IntegrationConfig, observation: ImportedHL7Observation): Promise<MappingResult> {
    // Convert HL7 observation to FHIR Observation
    const fhirObservation = {
      resourceType: 'Observation',
      status: observation.observationResultStatus === 'F' ? 'final' : 'preliminary',
      code: {
        coding: [{
          code: observation.observationIdentifier?.identifier,
          display: observation.observationIdentifier?.text,
          system: observation.observationIdentifier?.nameOfCodingSystem
        }]
      },
      valueString: observation.observationValue,
      effectiveDateTime: observation.dateTimeOfObservation,
      interpretation: observation.abnormalFlags ? [{
        coding: [{ code: observation.abnormalFlags }]
      }] : undefined
    };

    return this.mapResourceData(config, fhirObservation);
  }

  // Webhook Handling
  private initializeWebhookServer(): void {
    // Initialize webhook server for real-time updates
    // This would typically use Express.js or similar
    console.log('Webhook server initialized');
  }

  async handleWebhook(configId: string, payload: WebhookPayload): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    this.emitEvent({
      id: this.generateId(),
      configId,
      type: 'webhook_received',
      timestamp: new Date().toISOString(),
      data: payload
    });

    // Process webhook data based on action
    switch (payload.action) {
      case 'create':
      case 'update':
        await this.syncResourceById(configId, payload.resourceType, payload.resourceId);
        break;
      case 'delete':
        await this.deleteResourceById(payload.resourceType, payload.resourceId);
        break;
    }
  }

  private async syncResourceById(configId: string, resourceType: string, resourceId: string): Promise<void> {
    const fhirClient = this.fhirClients.get(configId);
    if (!fhirClient) return;

    try {
      const resource = await fhirClient.read(resourceType, resourceId);
      const config = this.configs.get(configId)!;
      const mappedData = await this.mapResourceData(config, resource as Record<string, unknown>);
      
      if (mappedData.success) {
        await this.storeResourceData(resourceType, mappedData.mappedData);
      }
    } catch (error) {
      console.error(`Failed to sync resource ${resourceType}/${resourceId}:`, error);
    }
  }

  private async deleteResourceById(resourceType: string, resourceId: string): Promise<void> {
    // Delete resource from local storage
    console.log(`Deleting ${resourceType}/${resourceId}`);
  }

  // Event Management
  addEventListener(configId: string, listener: (event: IntegrationEvent) => void): void {
    if (!this.eventListeners.has(configId)) {
      this.eventListeners.set(configId, []);
    }
    this.eventListeners.get(configId)!.push(listener);
  }

  removeEventListener(configId: string, listener: (event: IntegrationEvent) => void): void {
    const listeners = this.eventListeners.get(configId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: IntegrationEvent): void {
    const listeners = this.eventListeners.get(event.configId) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  // Statistics and Monitoring
  getIntegrationStats(configId: string): IntegrationStats | null {
    const config = this.configs.get(configId);
    const syncStatus = this.syncStatuses.get(configId);
    
    if (!config || !syncStatus) return null;

    // Calculate statistics (simplified implementation)
    return {
      configId,
      totalSyncs: 0, // Would be tracked in real implementation
      successfulSyncs: 0,
      failedSyncs: 0,
      totalRecords: syncStatus.recordsProcessed,
      averageSyncTime: 0,
      lastSyncDuration: 0,
      uptime: config.status === 'connected' ? 100 : 0,
      errorRate: 0,
      dataVolume: {
        patients: 0,
        studies: 0,
        reports: 0,
        orders: 0
      }
    };
  }

  getSyncStatus(configId: string): SyncStatus | undefined {
    return this.syncStatuses.get(configId);
  }

  getAllSyncStatuses(): SyncStatus[] {
    return Array.from(this.syncStatuses.values());
  }

  // Utility Methods
  private validateConfiguration(config: IntegrationConfig): void {
    if (!config.id || !config.name || !config.endpoint) {
      throw new Error('Configuration must have id, name, and endpoint');
    }

    if (!config.authentication.type) {
      throw new Error('Authentication type is required');
    }

    if (config.settings.syncInterval < 1) {
      throw new Error('Sync interval must be at least 1 minute');
    }

    if (config.settings.batchSize < 1 || config.settings.batchSize > 1000) {
      throw new Error('Batch size must be between 1 and 1000');
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private async loadConfigurations(): Promise<void> {
    try {
      const stored = localStorage.getItem('integration_configs');
      if (stored) {
        const configs = JSON.parse(stored) as IntegrationConfig[];
        configs.forEach(config => {
          this.configs.set(config.id, config);
          this.syncStatuses.set(config.id, {
            configId: config.id,
            status: 'idle',
            recordsProcessed: 0,
            recordsTotal: 0,
            errors: []
          });
        });
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  }

  private async saveConfigurations(): Promise<void> {
    try {
      const configs = Array.from(this.configs.values());
      localStorage.setItem('integration_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  }

  // Cleanup
  destroy(): void {
    // Stop all auto-sync intervals
    this.syncIntervals.forEach(interval => clearInterval(interval));
    this.syncIntervals.clear();
    
    // Clear all data
    this.configs.clear();
    this.syncStatuses.clear();
    this.fhirClients.clear();
    this.eventListeners.clear();
    
    // Stop webhook server
    if (this.webhookServer) {
      this.webhookServer.close();
    }
  }
}

export {
  IntegrationService,
  type IntegrationConfig,
  type SyncStatus,
  type IntegrationEvent,
  type WebhookPayload,
  type MappingResult,
  type IntegrationStats
};
