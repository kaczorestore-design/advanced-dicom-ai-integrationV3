// import React from 'react';
import { EventEmitter } from 'events';

export interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: ExtensionCategory;
  type: ExtensionType;
  isEnabled: boolean;
  isLoaded: boolean;
  isSystemExtension: boolean;
  dependencies: ExtensionDependency[];
  permissions: ExtensionPermission[];
  config: ExtensionConfig;
  metadata: ExtensionMetadata;
  manifest: ExtensionManifest;
  instance?: ExtensionInstance;
  loadedAt?: Date;
  lastError?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  category: ExtensionCategory;
  type: ExtensionType;
  main: string; // Entry point file
  dependencies: ExtensionDependency[];
  permissions: ExtensionPermission[];
  minCoreVersion: string;
  maxCoreVersion?: string;
  supportedPlatforms: string[];
  configuration: ExtensionConfigSchema;
  ui?: ExtensionUIConfig;
  api?: ExtensionAPIConfig;
  hooks?: ExtensionHookConfig;
  commands?: ExtensionCommand[];
  menus?: ExtensionMenu[];
  toolbars?: ExtensionToolbar[];
  panels?: ExtensionPanel[];
  themes?: ExtensionTheme[];
  languages?: ExtensionLanguage[];
}

export type ExtensionCategory = 
  | 'visualization' 
  | 'analysis' 
  | 'measurement' 
  | 'ai' 
  | 'workflow' 
  | 'integration' 
  | 'utility' 
  | 'theme' 
  | 'language' 
  | 'development';

export type ExtensionType = 
  | 'tool' 
  | 'viewer' 
  | 'analyzer' 
  | 'filter' 
  | 'exporter' 
  | 'importer' 
  | 'protocol' 
  | 'theme' 
  | 'language' 
  | 'widget' 
  | 'panel' 
  | 'service';

export interface ExtensionDependency {
  id: string;
  version: string;
  optional: boolean;
  reason?: string;
}

export interface ExtensionPermission {
  name: string;
  description: string;
  required: boolean;
  sensitive: boolean;
}

export interface ExtensionConfig {
  [key: string]: unknown;
}

export interface ExtensionConfigSchema {
  type: 'object';
  properties: { [key: string]: unknown };
  required?: string[];
  additionalProperties?: boolean;
}

export interface ExtensionMetadata {
  installDate: Date;
  updateDate?: Date;
  downloadCount?: number;
  rating?: number;
  reviews?: number;
  size: number; // bytes
  checksum: string;
  source: 'store' | 'sideload' | 'development';
  updateAvailable?: boolean;
  latestVersion?: string;
}

export interface ExtensionUIConfig {
  components?: ExtensionComponent[];
  styles?: string[];
  icons?: { [key: string]: string };
  layouts?: ExtensionLayout[];
}

export interface ExtensionAPIConfig {
  endpoints?: ExtensionEndpoint[];
  events?: ExtensionEvent[];
  services?: ExtensionService[];
}

export interface ExtensionHookConfig {
  lifecycle?: ExtensionLifecycleHook[];
  ui?: ExtensionUIHook[];
  data?: ExtensionDataHook[];
}

export interface ExtensionComponent {
  name: string;
  path: string;
  props?: { [key: string]: unknown };
  slot?: string;
}

export interface ExtensionLayout {
  name: string;
  component: string;
  config: { [key: string]: unknown };
}

export interface ExtensionEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
}

export interface ExtensionEvent {
  name: string;
  description: string;
  payload?: { [key: string]: unknown };
}

export interface ExtensionService {
  name: string;
  interface: string;
  implementation: string;
}

export interface ExtensionLifecycleHook {
  event: 'install' | 'uninstall' | 'enable' | 'disable' | 'update';
  handler: string;
}

export interface ExtensionUIHook {
  event: 'render' | 'mount' | 'unmount' | 'update';
  component: string;
  handler: string;
}

export interface ExtensionDataHook {
  event: 'load' | 'save' | 'delete' | 'transform';
  dataType: string;
  handler: string;
}

export interface ExtensionCommand {
  id: string;
  name: string;
  description: string;
  category: string;
  handler: string;
  shortcut?: string;
  icon?: string;
  when?: string; // Condition expression
}

export interface ExtensionMenu {
  id: string;
  label: string;
  position: 'main' | 'context' | 'toolbar';
  items: ExtensionMenuItem[];
}

export interface ExtensionMenuItem {
  id: string;
  label: string;
  command?: string;
  submenu?: ExtensionMenuItem[];
  separator?: boolean;
  when?: string;
}

export interface ExtensionToolbar {
  id: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  items: ExtensionToolbarItem[];
}

export interface ExtensionToolbarItem {
  id: string;
  type: 'button' | 'dropdown' | 'separator' | 'group';
  command?: string;
  icon?: string;
  tooltip?: string;
  items?: ExtensionToolbarItem[];
  when?: string;
}

export interface ExtensionPanel {
  id: string;
  title: string;
  component: string;
  position: 'left' | 'right' | 'bottom' | 'floating';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  resizable?: boolean;
  collapsible?: boolean;
  when?: string;
}

export interface ExtensionTheme {
  id: string;
  name: string;
  description: string;
  colors: { [key: string]: string };
  fonts: { [key: string]: string };
  styles: string;
}

export interface ExtensionLanguage {
  id: string;
  name: string;
  nativeName: string;
  translations: { [key: string]: string };
}

export interface ExtensionInstance {
  extension: Extension;
  context: ExtensionContext;
  api: ExtensionAPI;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  dispose(): void;
}

export interface ExtensionContext {
  extensionId: string;
  extensionPath: string;
  globalState: ExtensionState;
  workspaceState: ExtensionState;
  subscriptions: unknown[];
  logger: ExtensionLogger;
  secrets: ExtensionSecrets;
}

export interface ExtensionState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Promise<void>;
  keys(): readonly string[];
}

export interface ExtensionLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface ExtensionSecrets {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ExtensionAPI {
  // Core APIs
  core: {
    version: string;
    platform: string;
    getConfig(): Record<string, unknown>;
    updateConfig(updates: Record<string, unknown>): void;
  };
  
  // UI APIs
  ui: {
    showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
    showInputBox(options: Record<string, unknown>): Promise<string | undefined>;
    showQuickPick(items: unknown[], options?: Record<string, unknown>): Promise<unknown>;
    createStatusBarItem(): Record<string, unknown>;
    createWebviewPanel(options: Record<string, unknown>): Record<string, unknown>;
    registerCommand(command: string, handler: (...args: unknown[]) => void): void;
    registerTreeDataProvider(viewId: string, provider: Record<string, unknown>): void;
  };
  
  // DICOM APIs
  dicom: {
    loadStudy(studyId: string): Promise<Record<string, unknown>>;
    getStudies(): Promise<Record<string, unknown>[]>;
    getViewports(): Record<string, unknown>[];
    getActiveViewport(): Record<string, unknown> | null;
    setViewportData(viewportId: string, data: Record<string, unknown>): void;
    addMeasurement(measurement: Record<string, unknown>): void;
    getMeasurements(): Record<string, unknown>[];
    exportStudy(studyId: string, format: string): Promise<Blob>;
  };
  
  // Imaging APIs
  imaging: {
    createRenderer(type: string): Record<string, unknown>;
    applyFilter(filter: string, params: Record<string, unknown>): void;
    getImageData(imageId: string): Promise<Record<string, unknown>>;
    setImageData(imageId: string, data: Record<string, unknown>): void;
    registerTool(tool: Record<string, unknown>): void;
    activateTool(toolName: string): void;
  };
  
  // AI APIs
  ai: {
    runInference(modelId: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
    getModels(): Promise<Record<string, unknown>[]>;
    registerModel(model: Record<string, unknown>): void;
    trainModel(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  
  // Storage APIs
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };
  
  // Network APIs
  network: {
    request(url: string, options?: Record<string, unknown>): Promise<Response>;
    upload(file: File, url: string): Promise<Record<string, unknown>>;
    download(url: string): Promise<Blob>;
  };
  
  // Events APIs
  events: {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
  };
}

export interface ExtensionStore {
  id: string;
  name: string;
  url: string;
  isOfficial: boolean;
  isEnabled: boolean;
  lastSync?: Date;
}

export interface ExtensionStoreItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: ExtensionCategory;
  type: ExtensionType;
  rating: number;
  downloads: number;
  size: number;
  lastUpdated: Date;
  screenshots: string[];
  readme: string;
  changelog: string;
  license: string;
  homepage?: string;
  repository?: string;
  downloadUrl: string;
  checksum: string;
  dependencies: ExtensionDependency[];
  permissions: ExtensionPermission[];
  compatibility: {
    minCoreVersion: string;
    maxCoreVersion?: string;
    platforms: string[];
  };
}

export interface ExtensionFrameworkConfig {
  enableExtensions: boolean;
  allowSideloading: boolean;
  allowDevelopmentExtensions: boolean;
  autoUpdate: boolean;
  updateCheckInterval: number; // hours
  maxExtensions: number;
  sandboxMode: boolean;
  trustedPublishers: string[];
  blockedExtensions: string[];
  stores: ExtensionStore[];
  security: {
    requireSignature: boolean;
    allowUnsignedDevelopment: boolean;
    maxPermissions: number;
    restrictedPermissions: string[];
  };
}

export class ExtensionFramework extends EventEmitter {
  private extensions: Map<string, Extension> = new Map();
  private stores: Map<string, ExtensionStore> = new Map();
  private loadedInstances: Map<string, ExtensionInstance> = new Map();
  private config: ExtensionFrameworkConfig;
  private isInitialized = false;
  private updateCheckInterval?: NodeJS.Timeout | number;
  private sandboxWorker?: Worker;

  constructor(config: Partial<ExtensionFrameworkConfig> = {}) {
    super();
    
    this.config = {
      enableExtensions: true,
      allowSideloading: true,
      allowDevelopmentExtensions: true,
      autoUpdate: false,
      updateCheckInterval: 24, // 24 hours
      maxExtensions: 50,
      sandboxMode: true,
      trustedPublishers: ['official'],
      blockedExtensions: [],
      stores: [
        {
          id: 'official',
          name: 'Official Extension Store',
          url: 'https://extensions.dicomviewer.com',
          isOfficial: true,
          isEnabled: true
        }
      ],
      security: {
        requireSignature: false,
        allowUnsignedDevelopment: true,
        maxPermissions: 10,
        restrictedPermissions: ['file-system', 'network-unrestricted', 'system-commands']
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved extensions
      await this.loadSavedExtensions();
      
      // Initialize stores
      this.initializeStores();
      
      // Load system extensions
      await this.loadSystemExtensions();
      
      // Auto-load enabled extensions
      await this.autoLoadExtensions();
      
      // Start background services
      this.startBackgroundServices();
      
      // Initialize sandbox if enabled
      if (this.config.sandboxMode) {
        await this.initializeSandbox();
      }

      this.isInitialized = true;
      console.log('✅ Extension Framework initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Extension Framework:', error);
      throw error;
    }
  }

  private async loadSavedExtensions(): Promise<void> {
    try {
      const savedExtensions = localStorage.getItem('dicom_extensions');
      if (savedExtensions) {
        const extensions = JSON.parse(savedExtensions);
        extensions.forEach((ext: any) => {
          ext.loadedAt = ext.loadedAt ? new Date(ext.loadedAt) : undefined;
          ext.metadata.installDate = new Date(ext.metadata.installDate);
          ext.metadata.updateDate = ext.metadata.updateDate ? new Date(ext.metadata.updateDate) : undefined;
          this.extensions.set(ext.id as string, ext as Extension);
        });
      }
    } catch (error) {
      console.error('Failed to load saved extensions:', error);
    }
  }

  private initializeStores(): void {
    this.config.stores.forEach(store => {
      this.stores.set(store.id, store);
    });
  }

  private async loadSystemExtensions(): Promise<void> {
    const systemExtensions: Omit<Extension, 'id' | 'loadedAt'>[] = [
      {
        name: 'Core Measurement Tools',
        version: '1.0.0',
        description: 'Basic measurement tools for DICOM images',
        author: 'DICOM Viewer Team',
        category: 'measurement',
        type: 'tool',
        isEnabled: true,
        isLoaded: false,
        isSystemExtension: true,
        dependencies: [],
        permissions: [
          { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
          { name: 'ui-modify', description: 'Modify UI elements', required: true, sensitive: false }
        ],
        config: {},
        metadata: {
          installDate: new Date(),
          size: 1024 * 100, // 100KB
          checksum: 'system-measurement-tools',
          source: 'development'
        },
        manifest: {
          id: 'core-measurement-tools',
          name: 'Core Measurement Tools',
          version: '1.0.0',
          description: 'Basic measurement tools for DICOM images',
          author: 'DICOM Viewer Team',
          license: 'MIT',
          keywords: ['measurement', 'tools', 'dicom'],
          category: 'measurement',
          type: 'tool',
          main: 'index.js',
          dependencies: [],
          permissions: [
            { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
            { name: 'ui-modify', description: 'Modify UI elements', required: true, sensitive: false }
          ],
          minCoreVersion: '1.0.0',
          supportedPlatforms: ['web'],
          configuration: {
            type: 'object',
            properties: {
              defaultUnit: { type: 'string', default: 'mm' },
              precision: { type: 'number', default: 2 }
            }
          }
        }
      },
      {
        name: 'AI Analysis Tools',
        version: '1.0.0',
        description: 'AI-powered analysis and annotation tools',
        author: 'DICOM Viewer Team',
        category: 'ai',
        type: 'analyzer',
        isEnabled: true,
        isLoaded: false,
        isSystemExtension: true,
        dependencies: [],
        permissions: [
          { name: 'ai-inference', description: 'Run AI inference', required: true, sensitive: true },
          { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
          { name: 'network-api', description: 'Access network APIs', required: true, sensitive: true }
        ],
        config: {},
        metadata: {
          installDate: new Date(),
          size: 1024 * 500, // 500KB
          checksum: 'system-ai-tools',
          source: 'development'
        },
        manifest: {
          id: 'ai-analysis-tools',
          name: 'AI Analysis Tools',
          version: '1.0.0',
          description: 'AI-powered analysis and annotation tools',
          author: 'DICOM Viewer Team',
          license: 'MIT',
          keywords: ['ai', 'analysis', 'annotation'],
          category: 'ai',
          type: 'analyzer',
          main: 'index.js',
          dependencies: [],
          permissions: [
            { name: 'ai-inference', description: 'Run AI inference', required: true, sensitive: true },
            { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
            { name: 'network-api', description: 'Access network APIs', required: true, sensitive: true }
          ],
          minCoreVersion: '1.0.0',
          supportedPlatforms: ['web'],
          configuration: {
            type: 'object',
            properties: {
              modelEndpoint: { type: 'string', default: '/api/ai/inference' },
              confidenceThreshold: { type: 'number', default: 0.8 }
            }
          }
        }
      },
      {
        name: 'Advanced Visualization',
        version: '1.0.0',
        description: 'Advanced 3D visualization and rendering tools',
        author: 'DICOM Viewer Team',
        category: 'visualization',
        type: 'viewer',
        isEnabled: true,
        isLoaded: false,
        isSystemExtension: true,
        dependencies: [],
        permissions: [
          { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
          { name: 'gpu-access', description: 'Access GPU for rendering', required: false, sensitive: true },
          { name: 'ui-modify', description: 'Modify UI elements', required: true, sensitive: false }
        ],
        config: {},
        metadata: {
          installDate: new Date(),
          size: 1024 * 1024 * 2, // 2MB
          checksum: 'system-visualization',
          source: 'development'
        },
        manifest: {
          id: 'advanced-visualization',
          name: 'Advanced Visualization',
          version: '1.0.0',
          description: 'Advanced 3D visualization and rendering tools',
          author: 'DICOM Viewer Team',
          license: 'MIT',
          keywords: ['3d', 'visualization', 'rendering'],
          category: 'visualization',
          type: 'viewer',
          main: 'index.js',
          dependencies: [],
          permissions: [
            { name: 'dicom-read', description: 'Read DICOM data', required: true, sensitive: false },
            { name: 'gpu-access', description: 'Access GPU for rendering', required: false, sensitive: true },
            { name: 'ui-modify', description: 'Modify UI elements', required: true, sensitive: false }
          ],
          minCoreVersion: '1.0.0',
          supportedPlatforms: ['web'],
          configuration: {
            type: 'object',
            properties: {
              renderQuality: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
              enableGPU: { type: 'boolean', default: true }
            }
          }
        }
      }
    ];

    systemExtensions.forEach(extData => {
      const extension: Extension = {
        ...extData,
        id: extData.manifest.id
      };
      this.extensions.set(extension.id, extension);
    });
  }

  private async autoLoadExtensions(): Promise<void> {
    const enabledExtensions = Array.from(this.extensions.values())
      .filter(ext => ext.isEnabled && !ext.isLoaded);

    for (const extension of enabledExtensions) {
      try {
        await this.loadExtension(extension.id);
      } catch (error) {
        console.error(`Failed to auto-load extension ${extension.id}:`, error);
        extension.lastError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  private startBackgroundServices(): void {
    if (this.config.autoUpdate) {
      this.updateCheckInterval = setInterval(() => {
        this.checkForUpdates();
      }, this.config.updateCheckInterval * 60 * 60 * 1000); // Convert hours to ms
    }

    // Auto-save extensions data
    setInterval(() => {
      this.saveExtensions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async initializeSandbox(): Promise<void> {
    try {
      // Create a web worker for sandboxed extension execution
      const workerCode = `
        self.onmessage = function(e) {
          const { type, extensionId, code, data } = e.data;
          
          try {
            switch (type) {
              case 'execute':
                // Execute extension code in sandbox
                const result = eval(code);
                self.postMessage({ type: 'result', extensionId, result });
                break;
              case 'call':
                // Call extension method
                if (self.extensions && self.extensions[extensionId]) {
                  const result = self.extensions[extensionId][data.method](...data.args);
                  self.postMessage({ type: 'result', extensionId, result });
                }
                break;
            }
          } catch (error) {
            self.postMessage({ 
              type: 'error', 
              extensionId, 
              error: error.message 
            });
          }
        };
        
        self.extensions = {};
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.sandboxWorker = new Worker(URL.createObjectURL(blob));
      
      this.sandboxWorker.onmessage = (e) => {
        const { type, extensionId, result, error } = e.data;
        
        if (type === 'result') {
          this.emit('sandboxResult', { extensionId, result });
        } else if (type === 'error') {
          this.emit('sandboxError', { extensionId, error });
          console.error(`Sandbox error in extension ${extensionId}:`, error);
        }
      };
      
      console.log('✅ Extension sandbox initialized');
    } catch (error) {
      console.error('Failed to initialize sandbox:', error);
      this.config.sandboxMode = false;
    }
  }

  // Extension Management
  public async installExtension(source: string | File | ExtensionStoreItem): Promise<boolean> {
    try {
      let manifest: ExtensionManifest;
      let extensionData: ArrayBuffer;

      if (typeof source === 'string') {
        // Install from URL
        const response = await fetch(source);
        extensionData = await response.arrayBuffer();
        manifest = await this.extractManifest(extensionData);
      } else if (source instanceof File) {
        // Install from file
        extensionData = await source.arrayBuffer();
        manifest = await this.extractManifest(extensionData);
      } else {
        // Install from store
        const response = await fetch(source.downloadUrl);
        extensionData = await response.arrayBuffer();
        manifest = await this.extractManifest(extensionData);
      }

      // Validate extension
      if (!this.validateExtension(manifest, extensionData)) {
        throw new Error('Extension validation failed');
      }

      // Check dependencies
      const missingDeps = await this.checkDependencies(manifest.dependencies);
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      // Check permissions
      if (!this.validatePermissions(manifest.permissions)) {
        throw new Error('Extension requires restricted permissions');
      }

      // Create extension object
      const extension: Extension = {
        id: manifest.id,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        category: manifest.category,
        type: manifest.type,
        isEnabled: false,
        isLoaded: false,
        isSystemExtension: false,
        dependencies: manifest.dependencies,
        permissions: manifest.permissions,
        config: {},
        metadata: {
          installDate: new Date(),
          size: extensionData.byteLength,
          checksum: await this.calculateChecksum(extensionData),
          source: typeof source === 'string' ? 'store' : 'sideload'
        },
        manifest
      };

      // Store extension data
      await this.storeExtensionData(extension.id, extensionData);
      
      // Add to extensions map
      this.extensions.set(extension.id, extension);
      
      this.emit('extensionInstalled', extension);
      console.log(`✅ Extension ${extension.name} installed successfully`);
      
      return true;
    } catch (error) {
      console.error('Extension installation failed:', error);
      this.emit('extensionInstallFailed', { source, error });
      return false;
    }
  }

  public async uninstallExtension(extensionId: string): Promise<boolean> {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }

      if (extension.isSystemExtension) {
        throw new Error('Cannot uninstall system extension');
      }

      // Unload if loaded
      if (extension.isLoaded) {
        await this.unloadExtension(extensionId);
      }

      // Remove extension data
      await this.removeExtensionData(extensionId);
      
      // Remove from extensions map
      this.extensions.delete(extensionId);
      
      this.emit('extensionUninstalled', extension);
      console.log(`✅ Extension ${extension.name} uninstalled successfully`);
      
      return true;
    } catch (error) {
      console.error('Extension uninstallation failed:', error);
      return false;
    }
  }

  public async enableExtension(extensionId: string): Promise<boolean> {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }

      extension.isEnabled = true;
      
      // Auto-load if not loaded
      if (!extension.isLoaded) {
        await this.loadExtension(extensionId);
      }
      
      this.emit('extensionEnabled', extension);
      console.log(`✅ Extension ${extension.name} enabled`);
      
      return true;
    } catch (error) {
      console.error('Failed to enable extension:', error);
      return false;
    }
  }

  public async disableExtension(extensionId: string): Promise<boolean> {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }

      extension.isEnabled = false;
      
      // Unload if loaded
      if (extension.isLoaded) {
        await this.unloadExtension(extensionId);
      }
      
      this.emit('extensionDisabled', extension);
      console.log(`✅ Extension ${extension.name} disabled`);
      
      return true;
    } catch (error) {
      console.error('Failed to disable extension:', error);
      return false;
    }
  }

  public async loadExtension(extensionId: string): Promise<boolean> {
    try {
      console.log(`🔄 Attempting to load extension: ${extensionId}`);
      
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error(`Extension '${extensionId}' not found in registry`);
      }

      if (extension.isLoaded) {
        console.log(`✅ Extension ${extension.name} already loaded`);
        return true; // Already loaded
      }

      if (!extension.isEnabled) {
        throw new Error(`Extension '${extension.name}' is not enabled`);
      }

      // Load extension data with fallback
      let extensionData = await this.loadExtensionData(extensionId);
      if (!extensionData) {
        console.warn(`⚠️ Extension data not found for ${extensionId}, creating mock data`);
        // Create minimal mock extension data for demo purposes
        const mockData = new TextEncoder().encode(`// Mock extension data for ${extensionId}`);
        extensionData = mockData.buffer;
      }

      // Create extension context
      const context = this.createExtensionContext(extension);
      
      // Create extension API
      const api = this.createExtensionAPI(extension);
      
      // Create extension instance
      const instance = await this.createExtensionInstance(extension, context, api, extensionData);
      
      // Activate extension with error handling
      try {
        await instance.activate();
      } catch (activationError) {
        console.warn(`⚠️ Extension ${extension.name} activation failed, continuing with limited functionality:`, activationError);
        // Continue loading even if activation fails
      }
      
      // Store instance
      this.loadedInstances.set(extensionId, instance);
      extension.instance = instance;
      extension.isLoaded = true;
      extension.loadedAt = new Date();
      extension.lastError = undefined;
      
      this.emit('extensionLoaded', extension);
      console.log(`✅ Extension ${extension.name} loaded successfully`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to load extension ${extensionId}:`, errorMessage);
      
      const extension = this.extensions.get(extensionId);
      if (extension) {
        extension.lastError = errorMessage;
        extension.isLoaded = false;
      }
      
      // Don't throw error, just return false to allow other extensions to load
      return false;
    }
  }

  public async unloadExtension(extensionId: string): Promise<boolean> {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension || !extension.isLoaded) {
        return true; // Already unloaded
      }

      const instance = this.loadedInstances.get(extensionId);
      if (instance) {
        // Deactivate extension
        await instance.deactivate();
        
        // Dispose extension
        instance.dispose();
        
        // Remove instance
        this.loadedInstances.delete(extensionId);
      }
      
      extension.instance = undefined;
      extension.isLoaded = false;
      extension.loadedAt = undefined;
      
      this.emit('extensionUnloaded', extension);
      console.log(`✅ Extension ${extension.name} unloaded successfully`);
      
      return true;
    } catch (error) {
      console.error(`Failed to unload extension ${extensionId}:`, error);
      return false;
    }
  }

  public async updateExtension(extensionId: string, newVersion?: string): Promise<boolean> {
    try {
      const extension = this.extensions.get(extensionId);
      if (!extension) {
        throw new Error('Extension not found');
      }

      // Find update source
      const updateInfo = await this.findExtensionUpdate(extensionId, newVersion);
      if (!updateInfo) {
        throw new Error('No update available');
      }

      // Backup current extension
      const backup = { ...extension };
      
      try {
        // Unload current version
        if (extension.isLoaded) {
          await this.unloadExtension(extensionId);
        }
        
        // Install new version
        const success = await this.installExtension(updateInfo.downloadUrl);
        if (!success) {
          throw new Error('Failed to install update');
        }
        
        // Re-enable if was enabled
        if (backup.isEnabled) {
          await this.enableExtension(extensionId);
        }
        
        this.emit('extensionUpdated', { extension, oldVersion: backup.version, newVersion: updateInfo.version });
        console.log(`✅ Extension ${extension.name} updated to version ${updateInfo.version}`);
        
        return true;
      } catch (error) {
        // Restore backup on failure
        this.extensions.set(extensionId, backup);
        throw error;
      }
    } catch (error) {
      console.error(`Failed to update extension ${extensionId}:`, error);
      return false;
    }
  }

  // Extension Discovery
  public getExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  public getExtension(id: string): Extension | undefined {
    return this.extensions.get(id);
  }

  public getLoadedExtensions(): Extension[] {
    return Array.from(this.extensions.values()).filter(ext => ext.isLoaded);
  }

  public getExtensionsByCategory(category: ExtensionCategory): Extension[] {
    return Array.from(this.extensions.values()).filter(ext => ext.category === category);
  }

  public getExtensionsByType(type: ExtensionType): Extension[] {
    return Array.from(this.extensions.values()).filter(ext => ext.type === type);
  }

  public searchExtensions(query: string): Extension[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.extensions.values()).filter(ext => 
      ext.name.toLowerCase().includes(lowerQuery) ||
      ext.description.toLowerCase().includes(lowerQuery) ||
      ext.manifest.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }

  // Store Management
  public async searchStore(storeId: string, query: string): Promise<ExtensionStoreItem[]> {
    try {
      const store = this.stores.get(storeId);
      if (!store || !store.isEnabled) {
        throw new Error('Store not found or disabled');
      }

      const response = await fetch(`${store.url}/search?q=${encodeURIComponent(query)}`);
      const results = await response.json();
      
      return results.items || [];
    } catch (error) {
      console.error(`Store search failed for ${storeId}:`, error);
      return [];
    }
  }

  public async getStoreExtensions(storeId: string, category?: ExtensionCategory): Promise<ExtensionStoreItem[]> {
    try {
      const store = this.stores.get(storeId);
      if (!store || !store.isEnabled) {
        throw new Error('Store not found or disabled');
      }

      const url = category ? 
        `${store.url}/extensions?category=${category}` : 
        `${store.url}/extensions`;
      
      const response = await fetch(url);
      const results = await response.json();
      
      return results.items || [];
    } catch (error) {
      console.error(`Failed to get store extensions for ${storeId}:`, error);
      return [];
    }
  }

  public async checkForUpdates(): Promise<{ [extensionId: string]: string }> {
    const updates: { [extensionId: string]: string } = {};
    
    for (const extension of this.extensions.values()) {
      if (extension.isSystemExtension) continue;
      
      try {
        const updateInfo = await this.findExtensionUpdate(extension.id);
        if (updateInfo && updateInfo.version !== extension.version) {
          updates[extension.id] = updateInfo.version;
          extension.metadata.updateAvailable = true;
          extension.metadata.latestVersion = updateInfo.version;
        }
      } catch (error) {
        console.error(`Failed to check updates for ${extension.id}:`, error);
      }
    }
    
    if (Object.keys(updates).length > 0) {
      this.emit('updatesAvailable', updates);
    }
    
    return updates;
  }

  // Helper Methods
  private async extractManifest(_extensionData: ArrayBuffer): Promise<ExtensionManifest> {
    // In a real implementation, this would extract manifest from extension package
    // For demo purposes, return a mock manifest
    return {
      id: 'demo-extension',
      name: 'Demo Extension',
      version: '1.0.0',
      description: 'A demo extension',
      author: 'Demo Author',
      license: 'MIT',
      keywords: ['demo'],
      category: 'utility',
      type: 'tool',
      main: 'index.js',
      dependencies: [],
      permissions: [],
      minCoreVersion: '1.0.0',
      supportedPlatforms: ['web'],
      configuration: {
        type: 'object',
        properties: {}
      }
    };
  }

  private validateExtension(manifest: ExtensionManifest, data: ArrayBuffer): boolean {
    // Validate manifest structure
    if (!manifest.id || !manifest.name || !manifest.version) {
      return false;
    }
    
    // Check if extension already exists
    if (this.extensions.has(manifest.id)) {
      return false;
    }
    
    // Check size limits
    if (data.byteLength > 10 * 1024 * 1024) { // 10MB limit
      return false;
    }
    
    // Check blocked extensions
    if (this.config.blockedExtensions.includes(manifest.id)) {
      return false;
    }
    
    return true;
  }

  private async checkDependencies(dependencies: ExtensionDependency[]): Promise<string[]> {
    const missing: string[] = [];
    
    for (const dep of dependencies) {
      const extension = this.extensions.get(dep.id);
      if (!extension && !dep.optional) {
        missing.push(dep.id);
      }
    }
    
    return missing;
  }

  private validatePermissions(permissions: ExtensionPermission[]): boolean {
    // Check permission limits
    if (permissions.length > this.config.security.maxPermissions) {
      return false;
    }
    
    // Check restricted permissions
    const restrictedUsed = permissions.filter(p => 
      this.config.security.restrictedPermissions.includes(p.name)
    );
    
    if (restrictedUsed.length > 0) {
      return false;
    }
    
    return true;
  }

  private async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async storeExtensionData(extensionId: string, data: ArrayBuffer): Promise<void> {
    // In a real implementation, store in IndexedDB or similar
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    localStorage.setItem(`dicom_extension_data_${extensionId}`, base64);
  }

  private async loadExtensionData(extensionId: string): Promise<ArrayBuffer | null> {
    try {
      const base64 = localStorage.getItem(`dicom_extension_data_${extensionId}`);
      if (!base64) {
        console.warn(`⚠️ No stored data found for extension: ${extensionId}`);
        return null;
      }
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log(`✅ Successfully loaded extension data for: ${extensionId}`);
      return bytes.buffer;
    } catch (error) {
      console.error(`❌ Failed to load extension data for ${extensionId}:`, error);
      return null;
    }
  }

  private async removeExtensionData(extensionId: string): Promise<void> {
    localStorage.removeItem(`dicom_extension_data_${extensionId}`);
  }

  private createExtensionContext(extension: Extension): ExtensionContext {
    return {
      extensionId: extension.id,
      extensionPath: `/extensions/${extension.id}`,
      globalState: this.createExtensionState(`global_${extension.id}`),
      workspaceState: this.createExtensionState(`workspace_${extension.id}`),
      subscriptions: [],
      logger: this.createExtensionLogger(extension.id),
      secrets: this.createExtensionSecrets(extension.id)
    };
  }

  private createExtensionState(prefix: string): ExtensionState {
    return {
      get<T>(key: string): T | undefined {
        try {
          const value = localStorage.getItem(`${prefix}_${key}`);
          return value ? JSON.parse(value) : undefined;
        } catch {
          return undefined;
        }
      },
      async update(key: string, value: unknown): Promise<void> {
        localStorage.setItem(`${prefix}_${key}`, JSON.stringify(value));
      },
      keys(): readonly string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(`${prefix}_`)) {
            keys.push(key.substring(prefix.length + 1));
          }
        }
        return keys;
      }
    };
  }

  private createExtensionLogger(extensionId: string): ExtensionLogger {
    return {
      debug: (message: string, ...args: unknown[]) => console.debug(`[${extensionId}]`, message, ...args),
      info: (message: string, ...args: unknown[]) => console.info(`[${extensionId}]`, message, ...args),
      warn: (message: string, ...args: unknown[]) => console.warn(`[${extensionId}]`, message, ...args),
      error: (message: string, ...args: unknown[]) => console.error(`[${extensionId}]`, message, ...args)
    };
  }

  private createExtensionSecrets(extensionId: string): ExtensionSecrets {
    return {
      async get(key: string): Promise<string | undefined> {
        // In a real implementation, use secure storage
        return localStorage.getItem(`secret_${extensionId}_${key}`) || undefined;
      },
      async store(key: string, value: string): Promise<void> {
        // In a real implementation, use secure storage
        localStorage.setItem(`secret_${extensionId}_${key}`, value);
      },
      async delete(key: string): Promise<void> {
        localStorage.removeItem(`secret_${extensionId}_${key}`);
      }
    };
  }

  private createExtensionAPI(extension: Extension): ExtensionAPI {
    return {
      core: {
        version: '1.0.0',
        platform: 'web',
        getConfig: () => this.config as unknown as Record<string, unknown>,
        updateConfig: (updates: Record<string, unknown>) => this.updateConfig(updates)
      },
      ui: {
        showMessage: (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
          console.log(`[${extension.id}] ${type.toUpperCase()}: ${message}`);
          this.emit('extensionMessage', { extensionId: extension.id, message, type });
        },
        showInputBox: async (options: Record<string, unknown>) => {
          return prompt((options.prompt as string) || 'Enter value:') || undefined;
        },
        showQuickPick: async (items: unknown[], _options?: unknown) => {
          // In a real implementation, show a proper quick pick UI
          return items[0];
        },
        createStatusBarItem: () => ({}),
        createWebviewPanel: (_options: unknown) => ({}),
        registerCommand: (command: string, handler: (...args: unknown[]) => void) => {
          this.emit('commandRegistered', { extensionId: extension.id, command, handler });
        },
        registerTreeDataProvider: (viewId: string, provider: Record<string, unknown>) => {
          this.emit('treeDataProviderRegistered', { extensionId: extension.id, viewId, provider });
        }
      },
      dicom: {
        loadStudy: async (studyId: string) => {
          this.emit('dicomLoadStudy', { extensionId: extension.id, studyId });
          return {};
        },
        getStudies: async () => {
          this.emit('dicomGetStudies', { extensionId: extension.id });
          return [];
        },
        getViewports: () => {
          this.emit('dicomGetViewports', { extensionId: extension.id });
          return [];
        },
        getActiveViewport: () => {
          this.emit('dicomGetActiveViewport', { extensionId: extension.id });
          return {};
        },
        setViewportData: (viewportId: string, data: Record<string, unknown>) => {
          this.emit('dicomSetViewportData', { extensionId: extension.id, viewportId, data });
        },
        addMeasurement: (measurement: Record<string, unknown>) => {
          this.emit('dicomAddMeasurement', { extensionId: extension.id, measurement });
        },
        getMeasurements: () => {
          this.emit('dicomGetMeasurements', { extensionId: extension.id });
          return [];
        },
        exportStudy: async (studyId: string, format: string) => {
          this.emit('dicomExportStudy', { extensionId: extension.id, studyId, format });
          return new Blob();
        }
      },
      imaging: {
        createRenderer: (type: string) => {
          this.emit('imagingCreateRenderer', { extensionId: extension.id, type });
          return {};
        },
        applyFilter: (filter: string, params: Record<string, unknown>) => {
          this.emit('imagingApplyFilter', { extensionId: extension.id, filter, params });
        },
        getImageData: async (imageId: string) => {
          this.emit('imagingGetImageData', { extensionId: extension.id, imageId });
          return {};
        },
        setImageData: (imageId: string, data: Record<string, unknown>) => {
          this.emit('imagingSetImageData', { extensionId: extension.id, imageId, data });
        },
        registerTool: (tool: Record<string, unknown>) => {
          this.emit('imagingRegisterTool', { extensionId: extension.id, tool });
        },
        activateTool: (toolName: string) => {
          this.emit('imagingActivateTool', { extensionId: extension.id, toolName });
        }
      },
      ai: {
        runInference: async (modelId: string, input: Record<string, unknown>) => {
          this.emit('aiRunInference', { extensionId: extension.id, modelId, input });
          return {};
        },
        getModels: async () => {
          this.emit('aiGetModels', { extensionId: extension.id });
          return [];
        },
        registerModel: (model: Record<string, unknown>) => {
          this.emit('aiRegisterModel', { extensionId: extension.id, model });
        },
        trainModel: async (config: Record<string, unknown>) => {
          this.emit('aiTrainModel', { extensionId: extension.id, config });
          return {};
        }
      },
      storage: {
        get: async (key: string) => {
          return localStorage.getItem(`ext_${extension.id}_${key}`);
        },
        set: async (key: string, value: unknown) => {
          localStorage.setItem(`ext_${extension.id}_${key}`, JSON.stringify(value));
        },
        delete: async (key: string) => {
          localStorage.removeItem(`ext_${extension.id}_${key}`);
        },
        clear: async () => {
          const keys = Object.keys(localStorage).filter(k => k.startsWith(`ext_${extension.id}_`));
          keys.forEach(key => localStorage.removeItem(key));
        }
      },
      network: {
        request: async (url: string, options?: Record<string, unknown>) => {
          this.emit('networkRequest', { extensionId: extension.id, url, options });
          return fetch(url, options as RequestInit);
        },
        upload: async (file: File, url: string) => {
          this.emit('networkUpload', { extensionId: extension.id, file, url });
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch(url, { method: 'POST', body: formData });
          return response.json();
        },
        download: async (url: string) => {
          this.emit('networkDownload', { extensionId: extension.id, url });
          const response = await fetch(url);
          return response.blob();
        }
      },
      events: {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          this.on(`ext_${extension.id}_${event}`, handler);
        },
        off: (event: string, handler: (...args: unknown[]) => void) => {
          this.off(`ext_${extension.id}_${event}`, handler);
        },
        emit: (event: string, ...args: unknown[]) => {
          this.emit(`ext_${extension.id}_${event}`, ...args);
        }
      }
    };
  }

  private async createExtensionInstance(
    extension: Extension,
    context: ExtensionContext,
    api: ExtensionAPI,
    _extensionData: ArrayBuffer
  ): Promise<ExtensionInstance> {
    // In a real implementation, this would load and instantiate the extension code
    // For demo purposes, create a mock instance
    return {
      extension,
      context,
      api,
      async activate() {
        console.log(`Activating extension ${extension.name}`);
        // Extension activation logic
      },
      async deactivate() {
        console.log(`Deactivating extension ${extension.name}`);
        // Extension deactivation logic
      },
      dispose() {
        console.log(`Disposing extension ${extension.name}`);
        // Cleanup logic
        context.subscriptions.forEach((sub: unknown) => {
          if (typeof sub === 'object' && sub !== null && 'dispose' in sub && typeof (sub as Record<string, unknown>).dispose === 'function') {
            ((sub as Record<string, unknown>).dispose as () => void)();
          }
        });
        context.subscriptions.length = 0;
      }
    };
  }

  private async findExtensionUpdate(_extensionId: string, _targetVersion?: string): Promise<ExtensionStoreItem | null> {
    // In a real implementation, check all enabled stores for updates
    // For demo purposes, return null (no updates)
    return null;
  }

  private saveExtensions(): void {
    try {
      const extensions = Array.from(this.extensions.values()).map(ext => ({
        ...ext,
        instance: undefined // Don't serialize instances
      }));
      localStorage.setItem('dicom_extensions', JSON.stringify(extensions));
    } catch (error) {
      console.error('Failed to save extensions:', error);
    }
  }

  // Configuration
  public updateConfig(updates: Partial<ExtensionFrameworkConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  public getConfig(): ExtensionFrameworkConfig {
    return this.config;
  }

  // Cleanup
  public async destroy(): Promise<void> {
    // Save extensions data
    this.saveExtensions();
    
    // Unload all extensions
    const loadedExtensions = this.getLoadedExtensions();
    for (const extension of loadedExtensions) {
      await this.unloadExtension(extension.id);
    }
    
    // Clear intervals
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
    
    // Terminate sandbox worker
    if (this.sandboxWorker) {
      this.sandboxWorker.terminate();
    }
    
    // Clear collections
    this.extensions.clear();
    this.stores.clear();
    this.loadedInstances.clear();
    
    // Reset state
    this.isInitialized = false;
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('✅ Extension Framework destroyed');
  }
}

export default ExtensionFramework;
