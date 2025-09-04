import { Measurement, MeasurementSession, MeasurementTemplate } from '../components/measurements/AdvancedMeasurements';

// Measurement persistence service for advanced measurements

interface MeasurementFilter {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  type?: string;
  modality?: string;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  isVisible?: boolean;
  groupId?: string;
}

interface MeasurementExportOptions {
  format: 'csv' | 'excel' | 'json' | 'dicom-sr' | 'xml';
  includeMetadata: boolean;
  includeStatistics: boolean;
  includeAnnotations: boolean;
  anonymize: boolean;
  compressionLevel?: number;
}

interface MeasurementImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
  measurements: Measurement[];
}

interface MeasurementBackup {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  measurements: Measurement[];
  sessions: MeasurementSession[];
  templates: MeasurementTemplate[];
  metadata: {
    version: string;
    exportedBy: string;
    totalSize: number;
  };
}

class MeasurementPersistenceService {
  private baseUrl: string;
  private cache: Map<string, Measurement> = new Map();
  private sessionCache: Map<string, MeasurementSession> = new Map();
  private templateCache: Map<string, MeasurementTemplate> = new Map();
  private syncQueue: Set<string> = new Set();
  private isOnline: boolean = navigator.onLine;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.setupEventListeners();
    this.loadFromLocalStorage();
  }

  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Auto-save to localStorage
    window.addEventListener('beforeunload', () => {
      this.saveToLocalStorage();
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Measurement CRUD operations
  async getMeasurements(filter?: MeasurementFilter): Promise<Measurement[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              queryParams.append(key, JSON.stringify(value));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const measurements = await this.request<Measurement[]>(
        `/measurements?${queryParams.toString()}`
      );

      // Update cache
      measurements.forEach(measurement => {
        this.cache.set(measurement.id, measurement);
      });

      return measurements;
    } catch (error) {
      if (!this.isOnline) {
        // Return cached measurements when offline
        return Array.from(this.cache.values()).filter(measurement => 
          this.matchesFilter(measurement, filter)
        );
      }
      throw error;
    }
  }

  async getMeasurement(id: string): Promise<Measurement | null> {
    try {
      const measurement = await this.request<Measurement>(`/measurements/${id}`);
      this.cache.set(measurement.id, measurement);
      return measurement;
    } catch (error) {
      if (!this.isOnline && this.cache.has(id)) {
        return this.cache.get(id) || null;
      }
      throw error;
    }
  }

  async saveMeasurement(measurement: Partial<Measurement>): Promise<Measurement> {
    const isUpdate = !!measurement.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const endpoint = isUpdate ? `/measurements/${measurement.id}` : '/measurements';

    try {
      const savedMeasurement = await this.request<Measurement>(endpoint, {
        method,
        body: JSON.stringify({
          ...measurement,
          updatedAt: new Date().toISOString(),
          version: (measurement.version || 0) + 1
        })
      });

      this.cache.set(savedMeasurement.id, savedMeasurement);
      return savedMeasurement;
    } catch (error) {
      if (!this.isOnline) {
        // Queue for sync when online
        const tempId = measurement.id || `temp_${Date.now()}`;
        const tempMeasurement: Measurement = {
          id: tempId,
          type: measurement.type!,
          name: measurement.name!,
          studyInstanceUID: measurement.studyInstanceUID!,
          seriesInstanceUID: measurement.seriesInstanceUID!,
          sopInstanceUID: measurement.sopInstanceUID!,
          coordinates: measurement.coordinates!,
          properties: measurement.properties!,
          statistics: measurement.statistics!,
          metadata: measurement.metadata!,
          annotations: measurement.annotations || [],
          isVisible: measurement.isVisible ?? true,
          isLocked: measurement.isLocked ?? false,
          createdAt: measurement.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: measurement.createdBy!,
          version: (measurement.version || 0) + 1,
          ...measurement
        };

        this.cache.set(tempId, tempMeasurement);
        this.syncQueue.add(tempId);
        return tempMeasurement;
      }
      throw error;
    }
  }

  async deleteMeasurement(id: string): Promise<void> {
    try {
      await this.request(`/measurements/${id}`, { method: 'DELETE' });
      this.cache.delete(id);
    } catch (error) {
      if (!this.isOnline) {
        // Mark for deletion when online
        this.syncQueue.add(`delete_${id}`);
        this.cache.delete(id);
        return;
      }
      throw error;
    }
  }

  async bulkDeleteMeasurements(ids: string[]): Promise<void> {
    try {
      await this.request('/measurements/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });

      ids.forEach(id => this.cache.delete(id));
    } catch (error) {
      if (!this.isOnline) {
        ids.forEach(id => {
          this.syncQueue.add(`delete_${id}`);
          this.cache.delete(id);
        });
        return;
      }
      throw error;
    }
  }

  // Session management
  async getSessions(): Promise<MeasurementSession[]> {
    try {
      const sessions = await this.request<MeasurementSession[]>('/measurement-sessions');
      sessions.forEach(session => {
        this.sessionCache.set(session.id, session);
      });
      return sessions;
    } catch (error) {
      if (!this.isOnline) {
        return Array.from(this.sessionCache.values());
      }
      throw error;
    }
  }

  async saveSession(session: Partial<MeasurementSession>): Promise<MeasurementSession> {
    const isUpdate = !!session.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const endpoint = isUpdate ? `/measurement-sessions/${session.id}` : '/measurement-sessions';

    try {
      const savedSession = await this.request<MeasurementSession>(endpoint, {
        method,
        body: JSON.stringify({
          ...session,
          updatedAt: new Date().toISOString()
        })
      });

      this.sessionCache.set(savedSession.id, savedSession);
      return savedSession;
    } catch (error) {
      if (!this.isOnline) {
        const tempId = session.id || `temp_session_${Date.now()}`;
        const tempSession: MeasurementSession = {
          id: tempId,
          name: session.name!,
          studyInstanceUID: session.studyInstanceUID!,
          measurements: session.measurements || [],
          status: session.status || 'draft',
          notes: session.notes || '',
          createdAt: session.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: session.createdBy!,
          ...session
        };

        this.sessionCache.set(tempId, tempSession);
        this.syncQueue.add(`session_${tempId}`);
        return tempSession;
      }
      throw error;
    }
  }

  // Template management
  async getTemplates(): Promise<MeasurementTemplate[]> {
    try {
      const templates = await this.request<MeasurementTemplate[]>('/measurement-templates');
      templates.forEach(template => {
        this.templateCache.set(template.id, template);
      });
      return templates;
    } catch (error) {
      if (!this.isOnline) {
        return Array.from(this.templateCache.values());
      }
      throw error;
    }
  }

  async saveTemplate(template: Partial<MeasurementTemplate>): Promise<MeasurementTemplate> {
    const isUpdate = !!template.id;
    const method = isUpdate ? 'PUT' : 'POST';
    const endpoint = isUpdate ? `/measurement-templates/${template.id}` : '/measurement-templates';

    const savedTemplate = await this.request<MeasurementTemplate>(endpoint, {
      method,
      body: JSON.stringify(template)
    });

    this.templateCache.set(savedTemplate.id, savedTemplate);
    return savedTemplate;
  }

  // Export/Import operations
  async exportMeasurements(
    measurementIds: string[],
    options: MeasurementExportOptions
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/measurements/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        measurementIds,
        options
      })
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async importMeasurements(file: File): Promise<MeasurementImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const result = await this.request<MeasurementImportResult>('/measurements/import', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type to let browser set it for FormData
    });

    // Update cache with imported measurements
    result.measurements.forEach(measurement => {
      this.cache.set(measurement.id, measurement);
    });

    return result;
  }

  // Backup and restore
  async createBackup(name: string, description: string): Promise<MeasurementBackup> {
    const backup = await this.request<MeasurementBackup>('/measurements/backup', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });

    return backup;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await this.request(`/measurements/restore/${backupId}`, {
      method: 'POST'
    });

    // Clear cache to force reload
    this.cache.clear();
    this.sessionCache.clear();
    this.templateCache.clear();
  }

  async getBackups(): Promise<MeasurementBackup[]> {
    return this.request<MeasurementBackup[]>('/measurements/backups');
  }

  // Search and analytics
  async searchMeasurements(query: string, filters?: MeasurementFilter): Promise<Measurement[]> {
    const searchParams = new URLSearchParams({
      q: query,
      ...filters && { filters: JSON.stringify(filters) }
    });

    return this.request<Measurement[]>(`/measurements/search?${searchParams.toString()}`);
  }

  async getMeasurementStatistics(studyInstanceUID?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byModality: Record<string, number>;
    byUser: Record<string, number>;
    recentActivity: Array<{
      date: string;
      count: number;
    }>;
  }> {
    const params = studyInstanceUID ? `?studyInstanceUID=${studyInstanceUID}` : '';
    return this.request(`/measurements/statistics${params}`);
  }

  // Sync operations
  private async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.syncQueue.size === 0) {
      return;
    }

    const pendingItems = Array.from(this.syncQueue);
    
    for (const item of pendingItems) {
      try {
        if (item.startsWith('delete_')) {
          const id = item.replace('delete_', '');
          await this.request(`/measurements/${id}`, { method: 'DELETE' });
        } else if (item.startsWith('session_')) {
          const sessionId = item.replace('session_', '');
          const session = this.sessionCache.get(sessionId);
          if (session) {
            await this.saveSession(session);
          }
        } else {
          const measurement = this.cache.get(item);
          if (measurement) {
            await this.saveMeasurement(measurement);
          }
        }
        
        this.syncQueue.delete(item);
      } catch (error) {
        console.error(`Failed to sync item ${item}:`, error);
        // Keep item in queue for retry
      }
    }
  }

  // Local storage operations
  private saveToLocalStorage(): void {
    try {
      const data = {
        measurements: Array.from(this.cache.entries()),
        sessions: Array.from(this.sessionCache.entries()),
        templates: Array.from(this.templateCache.entries()),
        syncQueue: Array.from(this.syncQueue),
        timestamp: Date.now()
      };
      
      localStorage.setItem('measurementPersistence', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('measurementPersistence');
      if (!data) return;

      const parsed = JSON.parse(data);
      
      // Check if data is not too old (24 hours)
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('measurementPersistence');
        return;
      }

      this.cache = new Map(parsed.measurements || []);
      this.sessionCache = new Map(parsed.sessions || []);
      this.templateCache = new Map(parsed.templates || []);
      this.syncQueue = new Set(parsed.syncQueue || []);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      localStorage.removeItem('measurementPersistence');
    }
  }

  private matchesFilter(measurement: Measurement, filter?: MeasurementFilter): boolean {
    if (!filter) return true;

    if (filter.studyInstanceUID && measurement.studyInstanceUID !== filter.studyInstanceUID) {
      return false;
    }

    if (filter.seriesInstanceUID && measurement.seriesInstanceUID !== filter.seriesInstanceUID) {
      return false;
    }

    if (filter.sopInstanceUID && measurement.sopInstanceUID !== filter.sopInstanceUID) {
      return false;
    }

    if (filter.type && measurement.type !== filter.type) {
      return false;
    }

    if (filter.modality && measurement.metadata.modality !== filter.modality) {
      return false;
    }

    if (filter.createdBy && measurement.createdBy !== filter.createdBy) {
      return false;
    }

    if (filter.isVisible !== undefined && measurement.isVisible !== filter.isVisible) {
      return false;
    }

    if (filter.groupId && measurement.groupId !== filter.groupId) {
      return false;
    }

    if (filter.dateRange) {
      const createdAt = new Date(measurement.createdAt);
      const start = new Date(filter.dateRange.start);
      const end = new Date(filter.dateRange.end);
      
      if (createdAt < start || createdAt > end) {
        return false;
      }
    }

    return true;
  }

  // Utility methods
  getCachedMeasurement(id: string): Measurement | undefined {
    return this.cache.get(id);
  }

  getCachedMeasurements(): Measurement[] {
    return Array.from(this.cache.values());
  }

  clearCache(): void {
    this.cache.clear();
    this.sessionCache.clear();
    this.templateCache.clear();
    this.syncQueue.clear();
    localStorage.removeItem('measurementPersistence');
  }

  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  getPendingSyncCount(): number {
    return this.syncQueue.size;
  }
}

// Singleton instance
const measurementPersistenceService = new MeasurementPersistenceService();

export default measurementPersistenceService;
export {
  MeasurementPersistenceService,
  type MeasurementFilter,
  type MeasurementExportOptions,
  type MeasurementImportResult,
  type MeasurementBackup
};