import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Plugin system interfaces
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  category: 'viewer' | 'analysis' | 'workflow' | 'integration' | 'utility';
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    platforms: string[];
  };
  permissions: PluginPermission[];
  dependencies: Record<string, string>;
  entryPoint: string;
  assets?: string[];
  configuration?: PluginConfigSchema;
}

interface PluginPermission {
  type: 'dicom-access' | 'network' | 'storage' | 'ui-modification' | 'system-integration';
  description: string;
  required: boolean;
}

interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    title: string;
    description?: string;
    default?: any;
    enum?: any[];
    required?: boolean;
  }>;
}

interface Plugin {
  manifest: PluginManifest;
  status: 'installed' | 'enabled' | 'disabled' | 'error' | 'updating';
  instance?: PluginInstance;
  config: Record<string, any>;
  installedAt: string;
  lastUpdated: string;
  size: number;
  errorMessage?: string;
}

interface PluginInstance {
  initialize: (context: PluginContext) => Promise<void>;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  destroy: () => Promise<void>;
  getInfo: () => PluginInfo;
  onConfigChange?: (config: Record<string, any>) => void;
}

interface PluginContext {
  api: PluginAPI;
  config: Record<string, any>;
  storage: PluginStorage;
  events: PluginEventEmitter;
  ui: PluginUIManager;
}

interface PluginAPI {
  // DICOM operations
  dicom: {
    getCurrentStudy: () => any;
    getCurrentSeries: () => any;
    getCurrentImage: () => any;
    loadStudy: (studyInstanceUID: string) => Promise<any>;
    loadSeries: (seriesInstanceUID: string) => Promise<any>;
    getPixelData: (imageId: string) => Promise<ArrayBuffer>;
    getMetadata: (imageId: string) => any;
  };
  
  // Viewer operations
  viewer: {
    getActiveViewport: () => any;
    getAllViewports: () => any[];
    setViewportData: (viewportId: string, data: any) => void;
    addOverlay: (viewportId: string, overlay: any) => string;
    removeOverlay: (viewportId: string, overlayId: string) => void;
    captureViewport: (viewportId: string) => Promise<Blob>;
  };
  
  // Measurement operations
  measurements: {
    create: (measurement: any) => Promise<string>;
    update: (id: string, measurement: any) => Promise<void>;
    delete: (id: string) => Promise<void>;
    getAll: () => Promise<any[]>;
    getByStudy: (studyInstanceUID: string) => Promise<any[]>;
  };
  
  // Network operations
  network: {
    request: (url: string, options?: RequestInit) => Promise<Response>;
    upload: (file: File, endpoint: string) => Promise<any>;
    download: (url: string, filename: string) => Promise<void>;
  };
  
  // Utility functions
  utils: {
    showNotification: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
    showDialog: (content: React.ReactNode, options?: any) => Promise<any>;
    formatDate: (date: Date | string) => string;
    formatFileSize: (bytes: number) => string;
    generateId: () => string;
  };
}

interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
}

interface PluginEventEmitter {
  on: (event: string, listener: Function) => void;
  off: (event: string, listener: Function) => void;
  emit: (event: string, ...args: any[]) => void;
  once: (event: string, listener: Function) => void;
}

interface PluginUIManager {
  addMenuItem: (item: PluginMenuItem) => string;
  removeMenuItem: (id: string) => void;
  addToolbarButton: (button: PluginToolbarButton) => string;
  removeToolbarButton: (id: string) => void;
  addPanel: (panel: PluginPanel) => string;
  removePanel: (id: string) => void;
  showModal: (content: React.ReactNode, options?: any) => Promise<any>;
}

interface PluginMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  submenu?: PluginMenuItem[];
  separator?: boolean;
}

interface PluginToolbarButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  position?: 'left' | 'center' | 'right';
}

interface PluginPanel {
  id: string;
  title: string;
  content: React.ReactNode;
  position: 'left' | 'right' | 'bottom';
  defaultSize?: number;
  resizable?: boolean;
}

interface PluginInfo {
  name: string;
  version: string;
  status: string;
  uptime: number;
  memoryUsage?: number;
  lastActivity?: string;
}

interface PluginRepository {
  id: string;
  name: string;
  url: string;
  description: string;
  trusted: boolean;
  enabled: boolean;
}

interface PluginMarketplaceItem {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  downloads: number;
  rating: number;
  reviews: number;
  price: number;
  screenshots: string[];
  changelog: string;
  size: number;
  lastUpdated: string;
  compatibility: string[];
  verified: boolean;
}

// Plugin Manager Context
interface PluginManagerContextType {
  plugins: Map<string, Plugin>;
  repositories: PluginRepository[];
  isLoading: boolean;
  error: string | null;
  installPlugin: (source: string | File) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  updatePlugin: (pluginId: string) => Promise<void>;
  configurePlugin: (pluginId: string, config: Record<string, any>) => Promise<void>;
  searchMarketplace: (query: string, filters?: any) => Promise<PluginMarketplaceItem[]>;
  addRepository: (repository: Omit<PluginRepository, 'id'>) => Promise<void>;
  removeRepository: (repositoryId: string) => Promise<void>;
}

const PluginManagerContext = createContext<PluginManagerContextType | null>(null);

export const usePluginManager = () => {
  const context = useContext(PluginManagerContext);
  if (!context) {
    throw new Error('usePluginManager must be used within a PluginManagerProvider');
  }
  return context;
};

// Plugin Manager Implementation
class PluginManagerService {
  private plugins: Map<string, Plugin> = new Map();
  private repositories: PluginRepository[] = [];
  private eventEmitter = new EventTarget();
  private pluginContext: PluginContext;

  constructor() {
    this.pluginContext = this.createPluginContext();
    this.loadInstalledPlugins();
    this.loadRepositories();
  }

  private createPluginContext(): PluginContext {
    return {
      api: {
        dicom: {
          getCurrentStudy: () => ({}), // Implement actual DICOM API
          getCurrentSeries: () => ({}),
          getCurrentImage: () => ({}),
          loadStudy: async (_studyInstanceUID: string) => ({}),
          loadSeries: async (_seriesInstanceUID: string) => ({}),
          getPixelData: async (_imageId: string) => new ArrayBuffer(0),
          getMetadata: (_imageId: string) => ({})
        },
        viewer: {
          getActiveViewport: () => ({}),
          getAllViewports: () => [],
          setViewportData: (_viewportId: string, _data: any) => {},
          addOverlay: (_viewportId: string, _overlay: any) => '',
          removeOverlay: (_viewportId: string, _overlayId: string) => {},
          captureViewport: async (_viewportId: string) => new Blob()
        },
        measurements: {
          create: async (_measurement: any) => '',
          update: async (_id: string, _measurement: any) => {},
          delete: async (_id: string) => {},
          getAll: async () => [],
          getByStudy: async (_studyInstanceUID: string) => []
        },
        network: {
          request: async (_url: string, _options?: RequestInit) => new Response(),
          upload: async (_file: File, _endpoint: string) => ({}),
          download: async (_url: string, _filename: string) => {}
        },
        utils: {
          showNotification: (_message: string, _type: 'info' | 'success' | 'warning' | 'error') => {},
          showDialog: async (_content: React.ReactNode, _options?: any) => ({}),
          formatDate: (date: Date | string) => new Date(date).toLocaleDateString(),
          formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`,
          generateId: () => Math.random().toString(36).substr(2, 9)
        }
      },
      config: {},
      storage: {
        get: async (key: string) => JSON.parse(localStorage.getItem(`plugin_${key}`) || 'null'),
        set: async (key: string, value: any) => localStorage.setItem(`plugin_${key}`, JSON.stringify(value)),
        remove: async (key: string) => localStorage.removeItem(`plugin_${key}`),
        clear: async () => {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('plugin_')) {
              localStorage.removeItem(key);
            }
          });
        },
        keys: async () => Object.keys(localStorage).filter(key => key.startsWith('plugin_')).map(key => key.replace('plugin_', ''))
      },
      events: {
        on: (event: string, listener: Function) => this.eventEmitter.addEventListener(event, listener as EventListener),
        off: (event: string, listener: Function) => this.eventEmitter.removeEventListener(event, listener as EventListener),
        emit: (event: string, ...args: any[]) => this.eventEmitter.dispatchEvent(new CustomEvent(event, { detail: args })),
        once: (event: string, listener: Function) => this.eventEmitter.addEventListener(event, listener as EventListener, { once: true })
      },
      ui: {
        addMenuItem: (_item: PluginMenuItem) => '',
        removeMenuItem: (_id: string) => {},
        addToolbarButton: (_button: PluginToolbarButton) => '',
        removeToolbarButton: (_id: string) => {},
        addPanel: (_panel: PluginPanel) => '',
        removePanel: (_id: string) => {},
        showModal: async (_content: React.ReactNode, _options?: any) => ({})
      }
    };
  }

  private async loadInstalledPlugins(): Promise<void> {
    try {
      const stored = localStorage.getItem('installedPlugins');
      if (stored) {
        const pluginData = JSON.parse(stored);
        for (const [id, plugin] of Object.entries(pluginData)) {
          this.plugins.set(id, plugin as Plugin);
        }
      }
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
    }
  }

  private async loadRepositories(): Promise<void> {
    try {
      const stored = localStorage.getItem('pluginRepositories');
      if (stored) {
        this.repositories = JSON.parse(stored);
      } else {
        // Default repositories
        this.repositories = [
          {
            id: 'official',
            name: 'Official Plugin Repository',
            url: 'https://plugins.dicomviewer.com',
            description: 'Official plugins maintained by the DICOM Viewer team',
            trusted: true,
            enabled: true
          }
        ];
      }
    } catch (error) {
      console.error('Failed to load repositories:', error);
    }
  }

  async installPlugin(source: string | File): Promise<void> {
    try {
      let manifest: PluginManifest;
      let pluginCode: string;

      if (typeof source === 'string') {
        // Install from URL or repository
        const response = await fetch(source);
        const pluginPackage = await response.json();
        manifest = pluginPackage.manifest;
        pluginCode = pluginPackage.code;
      } else {
        // Install from file
        const text = await source.text();
        const pluginPackage = JSON.parse(text);
        manifest = pluginPackage.manifest;
        pluginCode = pluginPackage.code;
      }

      // Validate manifest
      this.validateManifest(manifest);

      // Check compatibility
      this.checkCompatibility(manifest);

      // Create plugin instance
      const pluginInstance = await this.createPluginInstance(pluginCode, manifest);

      const plugin: Plugin = {
        manifest,
        status: 'installed',
        instance: pluginInstance,
        config: {},
        installedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        size: pluginCode.length
      };

      this.plugins.set(manifest.id, plugin);
      await this.savePlugins();

      this.eventEmitter.dispatchEvent(new CustomEvent('pluginInstalled', { detail: { pluginId: manifest.id } }));
    } catch (error) {
      throw new Error(`Failed to install plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    try {
      if (plugin.status === 'enabled' && plugin.instance) {
        await plugin.instance.deactivate();
        await plugin.instance.destroy();
      }

      this.plugins.delete(pluginId);
      await this.savePlugins();

      // Clean up plugin storage
      const keys = await this.pluginContext.storage.keys();
      for (const key of keys) {
        if (key.startsWith(`${pluginId}_`)) {
          await this.pluginContext.storage.remove(key);
        }
      }

      this.eventEmitter.dispatchEvent(new CustomEvent('pluginUninstalled', { detail: { pluginId } }));
    } catch (error) {
      throw new Error(`Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    try {
      if (plugin.instance) {
        await plugin.instance.initialize(this.pluginContext);
        await plugin.instance.activate();
        plugin.status = 'enabled';
        await this.savePlugins();

        this.eventEmitter.dispatchEvent(new CustomEvent('pluginEnabled', { detail: { pluginId } }));
      }
    } catch (error) {
      plugin.status = 'error';
      plugin.errorMessage = error instanceof Error ? error.message : String(error);
      await this.savePlugins();
      throw new Error(`Failed to enable plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    try {
      if (plugin.instance && plugin.status === 'enabled') {
        await plugin.instance.deactivate();
        plugin.status = 'disabled';
        await this.savePlugins();

        this.eventEmitter.dispatchEvent(new CustomEvent('pluginDisabled', { detail: { pluginId } }));
      }
    } catch (error) {
      throw new Error(`Failed to disable plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    try {
      plugin.status = 'updating';
      await this.savePlugins();

      // Check for updates from repositories
      const updateInfo = await this.checkForUpdates(pluginId);
      if (updateInfo) {
        await this.installPlugin(updateInfo.downloadUrl);
        this.eventEmitter.dispatchEvent(new CustomEvent('pluginUpdated', { detail: { pluginId } }));
      }
    } catch (error) {
      plugin.status = 'error';
      plugin.errorMessage = error instanceof Error ? error.message : String(error);
      await this.savePlugins();
      throw new Error(`Failed to update plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async configurePlugin(pluginId: string, config: Record<string, any>): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    plugin.config = { ...plugin.config, ...config };
    
    if (plugin.instance && plugin.instance.onConfigChange) {
      plugin.instance.onConfigChange(plugin.config);
    }

    await this.savePlugins();
    this.eventEmitter.dispatchEvent(new CustomEvent('pluginConfigured', { detail: { pluginId, config } }));
  }

  async searchMarketplace(query: string, filters?: any): Promise<PluginMarketplaceItem[]> {
    const results: PluginMarketplaceItem[] = [];

    for (const repo of this.repositories.filter(r => r.enabled)) {
      try {
        const response = await fetch(`${repo.url}/search?q=${encodeURIComponent(query)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters || {})
        });
        
        const repoResults = await response.json();
        results.push(...repoResults);
      } catch (error) {
        console.error(`Failed to search repository ${repo.name}:`, error);
      }
    }

    return results;
  }

  async addRepository(repository: Omit<PluginRepository, 'id'>): Promise<void> {
    const newRepo: PluginRepository = {
      ...repository,
      id: Math.random().toString(36).substr(2, 9)
    };

    this.repositories.push(newRepo);
    localStorage.setItem('pluginRepositories', JSON.stringify(this.repositories));
  }

  async removeRepository(repositoryId: string): Promise<void> {
    this.repositories = this.repositories.filter(repo => repo.id !== repositoryId);
    localStorage.setItem('pluginRepositories', JSON.stringify(this.repositories));
  }

  private validateManifest(manifest: PluginManifest): void {
    const required: (keyof PluginManifest)[] = ['id', 'name', 'version', 'description', 'author', 'entryPoint'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  private checkCompatibility(manifest: PluginManifest): void {
    // Check version compatibility
    const currentVersion = '1.0.0'; // Get from app version
    if (manifest.compatibility.minVersion && currentVersion < manifest.compatibility.minVersion) {
      throw new Error(`Plugin requires minimum version ${manifest.compatibility.minVersion}`);
    }
  }

  private async createPluginInstance(code: string, manifest: PluginManifest): Promise<PluginInstance> {
    // Create a sandboxed environment for the plugin
    const sandbox = {
      console: {
        log: (...args: any[]) => console.log(`[${manifest.id}]`, ...args),
        error: (...args: any[]) => console.error(`[${manifest.id}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${manifest.id}]`, ...args)
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch: this.pluginContext.api.network.request
    };

    // Execute plugin code in sandbox
    const func = new Function('sandbox', `
      const { console, setTimeout, clearTimeout, setInterval, clearInterval, fetch } = sandbox;
      ${code}
      return plugin;
    `);

    return func(sandbox);
  }

  private async checkForUpdates(_pluginId: string): Promise<{ downloadUrl: string; version: string } | null> {
    // Implementation for checking updates from repositories
    return null;
  }

  private async savePlugins(): Promise<void> {
    const pluginData = Object.fromEntries(
      Array.from(this.plugins.entries()).map(([id, plugin]) => [
        id,
        {
          ...plugin,
          instance: undefined // Don't serialize the instance
        }
      ])
    );
    localStorage.setItem('installedPlugins', JSON.stringify(pluginData));
  }

  getPlugins(): Map<string, Plugin> {
    return this.plugins;
  }

  getRepositories(): PluginRepository[] {
    return this.repositories;
  }

  addEventListener(event: string, listener: EventListener): void {
    this.eventEmitter.addEventListener(event, listener);
  }

  removeEventListener(event: string, listener: EventListener): void {
    this.eventEmitter.removeEventListener(event, listener);
  }
}

// Plugin Manager Provider Component
export const PluginManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pluginManager] = useState(() => new PluginManagerService());
  const [plugins, setPlugins] = useState<Map<string, Plugin>>(new Map());
  const [repositories, setRepositories] = useState<PluginRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlugins(pluginManager.getPlugins());
    setRepositories(pluginManager.getRepositories());

    const handlePluginEvent = () => {
      setPlugins(new Map(pluginManager.getPlugins()));
    };

    pluginManager.addEventListener('pluginInstalled', handlePluginEvent);
    pluginManager.addEventListener('pluginUninstalled', handlePluginEvent);
    pluginManager.addEventListener('pluginEnabled', handlePluginEvent);
    pluginManager.addEventListener('pluginDisabled', handlePluginEvent);
    pluginManager.addEventListener('pluginUpdated', handlePluginEvent);

    return () => {
      pluginManager.removeEventListener('pluginInstalled', handlePluginEvent);
      pluginManager.removeEventListener('pluginUninstalled', handlePluginEvent);
      pluginManager.removeEventListener('pluginEnabled', handlePluginEvent);
      pluginManager.removeEventListener('pluginDisabled', handlePluginEvent);
      pluginManager.removeEventListener('pluginUpdated', handlePluginEvent);
    };
  }, [pluginManager]);

  const installPlugin = useCallback(async (source: string | File) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.installPlugin(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install plugin');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pluginManager]);

  const uninstallPlugin = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.uninstallPlugin(pluginId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall plugin');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pluginManager]);

  const enablePlugin = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.enablePlugin(pluginId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable plugin');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pluginManager]);

  const disablePlugin = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.disablePlugin(pluginId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable plugin');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pluginManager]);

  const updatePlugin = useCallback(async (pluginId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.updatePlugin(pluginId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plugin');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [pluginManager]);

  const configurePlugin = useCallback(async (pluginId: string, config: Record<string, any>) => {
    setError(null);
    try {
      await pluginManager.configurePlugin(pluginId, config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure plugin');
      throw err;
    }
  }, [pluginManager]);

  const searchMarketplace = useCallback(async (query: string, filters?: any) => {
    return pluginManager.searchMarketplace(query, filters);
  }, [pluginManager]);

  const addRepository = useCallback(async (repository: Omit<PluginRepository, 'id'>) => {
    await pluginManager.addRepository(repository);
    setRepositories([...pluginManager.getRepositories()]);
  }, [pluginManager]);

  const removeRepository = useCallback(async (repositoryId: string) => {
    await pluginManager.removeRepository(repositoryId);
    setRepositories([...pluginManager.getRepositories()]);
  }, [pluginManager]);

  const value: PluginManagerContextType = {
    plugins,
    repositories,
    isLoading,
    error,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    updatePlugin,
    configurePlugin,
    searchMarketplace,
    addRepository,
    removeRepository
  };

  return (
    <PluginManagerContext.Provider value={value}>
      {children}
    </PluginManagerContext.Provider>
  );
};

export default PluginManagerProvider;
export type {
  Plugin,
  PluginManifest,
  PluginInstance,
  PluginContext,
  PluginAPI,
  PluginRepository,
  PluginMarketplaceItem
};