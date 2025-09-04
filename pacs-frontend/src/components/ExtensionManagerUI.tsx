import React, { useState, useEffect, useCallback } from 'react';
import { 
  Extension, 
  ExtensionFramework, 
  ExtensionStoreItem, 
  ExtensionCategory, 
  ExtensionType 
} from './ExtensionFramework';

export interface ExtensionManagerUIProps {
  extensionFramework: ExtensionFramework;
  isOpen: boolean;
  onClose: () => void;
}

export interface ExtensionFilter {
  category?: ExtensionCategory;
  type?: ExtensionType;
  status?: 'all' | 'enabled' | 'disabled' | 'installed' | 'available';
  search?: string;
}

export interface ExtensionManagerState {
  extensions: Extension[];
  storeExtensions: ExtensionStoreItem[];
  filter: ExtensionFilter;
  selectedExtension: Extension | ExtensionStoreItem | null;
  activeTab: 'installed' | 'store' | 'settings';
  isLoading: boolean;
  error: string | null;
  updateAvailable: { [extensionId: string]: string };
}

const ExtensionManagerUI: React.FC<ExtensionManagerUIProps> = ({
  extensionFramework,
  isOpen,
  onClose
}) => {
  const [state, setState] = useState<ExtensionManagerState>({
    extensions: [],
    storeExtensions: [],
    filter: { status: 'all' },
    selectedExtension: null,
    activeTab: 'installed',
    isLoading: false,
    error: null,
    updateAvailable: {}
  });

  const [installProgress, setInstallProgress] = useState<{ [id: string]: number }>({});
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  // Load extensions data
  const loadExtensions = useCallback(async () => {
    if (!extensionFramework) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const extensions = extensionFramework.getExtensions();
      const updates = await extensionFramework.checkForUpdates();
      
      setState(prev => ({
        ...prev,
        extensions,
        updateAvailable: updates,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load extensions',
        isLoading: false
      }));
    }
  }, [extensionFramework]);

  // Load store extensions
  const loadStoreExtensions = useCallback(async () => {
    if (!extensionFramework) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const storeExtensions = await extensionFramework.getStoreExtensions('official');
      setState(prev => ({
        ...prev,
        storeExtensions,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load store extensions',
        isLoading: false
      }));
    }
  }, [extensionFramework]);

  // Filter extensions
  const getFilteredExtensions = useCallback(() => {
    let filtered = state.extensions;
    
    if (state.filter.category) {
      filtered = filtered.filter(ext => ext.category === state.filter.category);
    }
    
    if (state.filter.type) {
      filtered = filtered.filter(ext => ext.type === state.filter.type);
    }
    
    if (state.filter.status && state.filter.status !== 'all') {
      switch (state.filter.status) {
        case 'enabled':
          filtered = filtered.filter(ext => ext.isEnabled);
          break;
        case 'disabled':
          filtered = filtered.filter(ext => !ext.isEnabled);
          break;
        case 'installed':
          // All extensions in the list are installed
          break;
      }
    }
    
    if (state.filter.search) {
      const search = state.filter.search.toLowerCase();
      filtered = filtered.filter(ext => 
        ext.name.toLowerCase().includes(search) ||
        ext.description.toLowerCase().includes(search) ||
        ext.author.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [state.extensions, state.filter]);

  // Filter store extensions
  const getFilteredStoreExtensions = useCallback(() => {
    let filtered = state.storeExtensions;
    
    if (state.filter.category) {
      filtered = filtered.filter(ext => ext.category === state.filter.category);
    }
    
    if (state.filter.type) {
      filtered = filtered.filter(ext => ext.type === state.filter.type);
    }
    
    if (state.filter.search) {
      const search = state.filter.search.toLowerCase();
      filtered = filtered.filter(ext => 
        ext.name.toLowerCase().includes(search) ||
        ext.description.toLowerCase().includes(search) ||
        ext.author.toLowerCase().includes(search)
      );
    }
    
    // Filter out already installed extensions
    const installedIds = new Set(state.extensions.map(ext => ext.id));
    filtered = filtered.filter(ext => !installedIds.has(ext.id));
    
    return filtered;
  }, [state.storeExtensions, state.filter, state.extensions]);

  // Extension actions
  const handleInstallExtension = async (extension: ExtensionStoreItem) => {
    if (!extensionFramework) return;
    
    setInstallProgress(prev => ({ ...prev, [extension.id]: 0 }));
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => ({
          ...prev,
          [extension.id]: Math.min((prev[extension.id] || 0) + 10, 90)
        }));
      }, 100);
      
      const success = await extensionFramework.installExtension(extension);
      
      clearInterval(progressInterval);
      setInstallProgress(prev => ({ ...prev, [extension.id]: 100 }));
      
      if (success) {
        setTimeout(() => {
          setInstallProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[extension.id];
            return newProgress;
          });
          loadExtensions();
        }, 1000);
      } else {
        setInstallProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[extension.id];
          return newProgress;
        });
        setState(prev => ({ ...prev, error: 'Installation failed' }));
      }
    } catch (error) {
      setInstallProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[extension.id];
        return newProgress;
      });
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Installation failed'
      }));
    }
  };

  const handleUninstallExtension = async (extensionId: string) => {
    if (!extensionFramework) return;
    
    try {
      const success = await extensionFramework.uninstallExtension(extensionId);
      if (success) {
        loadExtensions();
      } else {
        setState(prev => ({ ...prev, error: 'Uninstallation failed' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Uninstallation failed'
      }));
    }
  };

  const handleToggleExtension = async (extensionId: string, enable: boolean) => {
    if (!extensionFramework) return;
    
    try {
      const success = enable 
        ? await extensionFramework.enableExtension(extensionId)
        : await extensionFramework.disableExtension(extensionId);
      
      if (success) {
        loadExtensions();
      } else {
        setState(prev => ({ ...prev, error: `Failed to ${enable ? 'enable' : 'disable'} extension` }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : `Failed to ${enable ? 'enable' : 'disable'} extension`
      }));
    }
  };

  const handleUpdateExtension = async (extensionId: string) => {
    if (!extensionFramework) return;
    
    try {
      const success = await extensionFramework.updateExtension(extensionId);
      if (success) {
        loadExtensions();
      } else {
        setState(prev => ({ ...prev, error: 'Update failed' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  };

  const handleInstallFromFile = async (file: File) => {
    if (!extensionFramework) return;
    
    try {
      const success = await extensionFramework.installExtension(file);
      if (success) {
        loadExtensions();
      } else {
        setState(prev => ({ ...prev, error: 'Installation from file failed' }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Installation from file failed'
      }));
    }
  };

  // Effects
  useEffect(() => {
    if (isOpen && extensionFramework) {
      loadExtensions();
      if (state.activeTab === 'store') {
        loadStoreExtensions();
      }
    }
  }, [isOpen, extensionFramework, state.activeTab, loadExtensions, loadStoreExtensions]);

  // Event listeners
  useEffect(() => {
    if (!extensionFramework) return;
    
    const handleExtensionInstalled = () => loadExtensions();
    const handleExtensionUninstalled = () => loadExtensions();
    const handleExtensionEnabled = () => loadExtensions();
    const handleExtensionDisabled = () => loadExtensions();
    
    extensionFramework.on('extensionInstalled', handleExtensionInstalled);
    extensionFramework.on('extensionUninstalled', handleExtensionUninstalled);
    extensionFramework.on('extensionEnabled', handleExtensionEnabled);
    extensionFramework.on('extensionDisabled', handleExtensionDisabled);
    
    return () => {
      extensionFramework.off('extensionInstalled', handleExtensionInstalled);
      extensionFramework.off('extensionUninstalled', handleExtensionUninstalled);
      extensionFramework.off('extensionEnabled', handleExtensionEnabled);
      extensionFramework.off('extensionDisabled', handleExtensionDisabled);
    };
  }, [extensionFramework, loadExtensions]);

  if (!isOpen) return null;

  const filteredExtensions = getFilteredExtensions();
  const filteredStoreExtensions = getFilteredStoreExtensions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-5/6 h-5/6 max-w-6xl max-h-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Extension Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['installed', 'store', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setState(prev => ({ ...prev, activeTab: tab }))}
              className={`px-6 py-3 font-medium capitalize ${
                state.activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
              {tab === 'installed' && (
                <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {state.extensions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Filters */}
          <div className="w-64 bg-gray-50 p-4 border-r overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-4">Filters</h3>
            
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={state.filter.search || ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filter: { ...prev.filter, search: e.target.value }
                }))}
                placeholder="Search extensions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={state.filter.category || ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filter: { ...prev.filter, category: e.target.value as ExtensionCategory || undefined }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="visualization">Visualization</option>
                <option value="analysis">Analysis</option>
                <option value="measurement">Measurement</option>
                <option value="ai">AI</option>
                <option value="workflow">Workflow</option>
                <option value="integration">Integration</option>
                <option value="utility">Utility</option>
                <option value="theme">Theme</option>
                <option value="language">Language</option>
                <option value="development">Development</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={state.filter.type || ''}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filter: { ...prev.filter, type: e.target.value as ExtensionType || undefined }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="tool">Tool</option>
                <option value="viewer">Viewer</option>
                <option value="analyzer">Analyzer</option>
                <option value="filter">Filter</option>
                <option value="exporter">Exporter</option>
                <option value="importer">Importer</option>
                <option value="protocol">Protocol</option>
                <option value="theme">Theme</option>
                <option value="language">Language</option>
                <option value="widget">Widget</option>
                <option value="panel">Panel</option>
                <option value="service">Service</option>
              </select>
            </div>

            {/* Status Filter (for installed tab) */}
            {state.activeTab === 'installed' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={state.filter.status || 'all'}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filter: { ...prev.filter, status: e.target.value as 'all' | 'enabled' | 'disabled' | 'installed' | 'available' }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            )}

            {/* Install from file */}
            {state.activeTab === 'installed' && (
              <div className="mt-6">
                <button
                  onClick={() => fileInputRef?.click()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Install from File
                </button>
                <input
                  ref={setFileInputRef}
                  type="file"
                  accept=".zip,.tar.gz,.extension"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleInstallFromFile(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Error Display */}
            {state.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded">
                <div className="flex items-center justify-between">
                  <span>{state.error}</span>
                  <button
                    onClick={() => setState(prev => ({ ...prev, error: null }))}
                    className="text-red-700 hover:text-red-900"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {state.isLoading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )}

            {/* Extension List */}
            <div className="flex-1 overflow-y-auto p-4">
              {state.activeTab === 'installed' && (
                <div className="grid gap-4">
                  {filteredExtensions.map(extension => (
                    <ExtensionCard
                      key={extension.id}
                      extension={extension}
                      isInstalled={true}
                      hasUpdate={!!state.updateAvailable[extension.id]}
                      onToggle={(enable) => handleToggleExtension(extension.id, enable)}
                      onUninstall={() => handleUninstallExtension(extension.id)}
                      onUpdate={() => handleUpdateExtension(extension.id)}
                      onSelect={() => setState(prev => ({ ...prev, selectedExtension: extension }))}
                    />
                  ))}
                  {filteredExtensions.length === 0 && !state.isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No extensions found matching your criteria.
                    </div>
                  )}
                </div>
              )}

              {state.activeTab === 'store' && (
                <div className="grid gap-4">
                  {filteredStoreExtensions.map(extension => (
                    <ExtensionCard
                      key={extension.id}
                      extension={extension}
                      isInstalled={false}
                      installProgress={installProgress[extension.id]}
                      onInstall={() => handleInstallExtension(extension)}
                      onSelect={() => setState(prev => ({ ...prev, selectedExtension: extension }))}
                    />
                  ))}
                  {filteredStoreExtensions.length === 0 && !state.isLoading && (
                    <div className="text-center py-8 text-gray-500">
                      No extensions available in the store.
                    </div>
                  )}
                </div>
              )}

              {state.activeTab === 'settings' && (
                <ExtensionSettings
                  extensionFramework={extensionFramework}
                  onConfigUpdate={() => loadExtensions()}
                />
              )}
            </div>
          </div>

          {/* Extension Details Sidebar */}
          {state.selectedExtension && (
            <ExtensionDetails
              extension={state.selectedExtension}
              onClose={() => setState(prev => ({ ...prev, selectedExtension: null }))}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Extension Card Component
interface ExtensionCardProps {
  extension: Extension | ExtensionStoreItem;
  isInstalled: boolean;
  hasUpdate?: boolean;
  installProgress?: number;
  onToggle?: (enable: boolean) => void;
  onInstall?: () => void;
  onUninstall?: () => void;
  onUpdate?: () => void;
  onSelect: () => void;
}

const ExtensionCard: React.FC<ExtensionCardProps> = ({
  extension,
  isInstalled,
  hasUpdate,
  installProgress,
  onToggle,
  onInstall,
  onUninstall,
  onUpdate,
  onSelect
}) => {
  const isExtension = 'isEnabled' in extension;
  const isEnabled = isExtension ? extension.isEnabled : false;
  const isSystemExtension = isExtension ? extension.isSystemExtension : false;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
         onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-800">{extension.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              extension.category === 'ai' ? 'bg-purple-100 text-purple-800' :
              extension.category === 'visualization' ? 'bg-blue-100 text-blue-800' :
              extension.category === 'measurement' ? 'bg-green-100 text-green-800' :
              extension.category === 'analysis' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {extension.category}
            </span>
            {hasUpdate && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Update Available
              </span>
            )}
            {isSystemExtension && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                System
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-2">{extension.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>v{extension.version}</span>
            <span>by {extension.author}</span>
            {'rating' in extension && extension.rating && (
              <span>★ {extension.rating.toFixed(1)}</span>
            )}
            {'downloads' in extension && extension.downloads && (
              <span>{extension.downloads.toLocaleString()} downloads</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
          {isInstalled ? (
            <>
              {!isSystemExtension && (
                <button
                  onClick={() => onToggle?.(!isEnabled)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    isEnabled
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </button>
              )}
              {hasUpdate && (
                <button
                  onClick={onUpdate}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  Update
                </button>
              )}
              {!isSystemExtension && (
                <button
                  onClick={onUninstall}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                >
                  Uninstall
                </button>
              )}
            </>
          ) : (
            <>
              {typeof installProgress === 'number' ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${installProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{installProgress}%</span>
                </div>
              ) : (
                <button
                  onClick={onInstall}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                >
                  Install
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Extension Details Component
interface ExtensionDetailsProps {
  extension: Extension | ExtensionStoreItem;
  onClose: () => void;
}

const ExtensionDetails: React.FC<ExtensionDetailsProps> = ({ extension, onClose }) => {
  const isExtension = 'isEnabled' in extension;
  
  return (
    <div className="w-80 bg-gray-50 border-l p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Extension Details</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-800 mb-1">{extension.name}</h4>
          <p className="text-sm text-gray-600">{extension.description}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Version:</span>
            <p className="text-gray-600">{extension.version}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Author:</span>
            <p className="text-gray-600">{extension.author}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Category:</span>
            <p className="text-gray-600 capitalize">{extension.category}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-gray-600 capitalize">{extension.type}</p>
          </div>
        </div>
        
        {'rating' in extension && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Rating:</span>
              <p className="text-gray-600">★ {extension.rating?.toFixed(1) || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Downloads:</span>
              <p className="text-gray-600">{extension.downloads?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>
        )}
        
        {isExtension && extension.metadata && (
          <div>
            <span className="font-medium text-gray-700">Installed:</span>
            <p className="text-gray-600 text-sm">
              {extension.metadata.installDate.toLocaleDateString()}
            </p>
          </div>
        )}
        
        {extension.dependencies && extension.dependencies.length > 0 && (
          <div>
            <span className="font-medium text-gray-700">Dependencies:</span>
            <ul className="text-sm text-gray-600 mt-1">
              {extension.dependencies.map(dep => (
                <li key={dep.id} className="flex justify-between">
                  <span>{dep.id}</span>
                  <span className="text-xs">{dep.version}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {extension.permissions && extension.permissions.length > 0 && (
          <div>
            <span className="font-medium text-gray-700">Permissions:</span>
            <ul className="text-sm text-gray-600 mt-1 space-y-1">
              {extension.permissions.map(perm => (
                <li key={perm.name} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    perm.sensitive ? 'bg-red-400' : 'bg-green-400'
                  }`}></span>
                  <span>{perm.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {'homepage' in extension && extension.homepage && (
          <div>
            <a
              href={extension.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Visit Homepage →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// Extension Settings Component
interface ExtensionSettingsProps {
  extensionFramework: ExtensionFramework;
  onConfigUpdate: () => void;
}

const ExtensionSettings: React.FC<ExtensionSettingsProps> = ({
  extensionFramework,
  onConfigUpdate
}) => {
  const [config, setConfig] = useState(extensionFramework.getConfig());
  
  const handleConfigChange = (key: string, value: string | number | boolean) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    extensionFramework.updateConfig({ [key]: value });
    onConfigUpdate();
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Extension Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-700">Enable Extensions</label>
            <p className="text-sm text-gray-600">Allow extensions to be loaded and executed</p>
          </div>
          <input
            type="checkbox"
            checked={config.enableExtensions}
            onChange={(e) => handleConfigChange('enableExtensions', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-700">Allow Sideloading</label>
            <p className="text-sm text-gray-600">Allow installation of extensions from files</p>
          </div>
          <input
            type="checkbox"
            checked={config.allowSideloading}
            onChange={(e) => handleConfigChange('allowSideloading', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-700">Development Extensions</label>
            <p className="text-sm text-gray-600">Allow unsigned development extensions</p>
          </div>
          <input
            type="checkbox"
            checked={config.allowDevelopmentExtensions}
            onChange={(e) => handleConfigChange('allowDevelopmentExtensions', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium text-gray-700">Auto Update</label>
            <p className="text-sm text-gray-600">Automatically update extensions</p>
          </div>
          <input
            type="checkbox"
            checked={config.autoUpdate}
            onChange={(e) => handleConfigChange('autoUpdate', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block font-medium text-gray-700 mb-2">Max Extensions</label>
          <input
            type="number"
            value={config.maxExtensions}
            onChange={(e) => handleConfigChange('maxExtensions', parseInt(e.target.value))}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block font-medium text-gray-700 mb-2">Update Check Interval (hours)</label>
          <input
            type="number"
            value={config.updateCheckInterval}
            onChange={(e) => handleConfigChange('updateCheckInterval', parseInt(e.target.value))}
            min="1"
            max="168"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ExtensionManagerUI;
export { ExtensionCard, ExtensionDetails, ExtensionSettings };
