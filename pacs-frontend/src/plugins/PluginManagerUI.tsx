import React, { useState, useEffect, useRef } from 'react';
import { usePluginManager } from './PluginManager';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Package, 
  Download, 
  Upload, 
  Settings, 
  Square, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Search,
  RefreshCw,
  Star,
  Eye,
  Globe,
  User,
  Calendar,
  HardDrive,
  Plus,
  Save,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import type { Plugin, PluginMarketplaceItem } from './PluginManager';

interface PluginManagerUIProps {
  isOpen: boolean;
  onClose: () => void;
}

const PluginManagerUI: React.FC<PluginManagerUIProps> = ({ isOpen, onClose }) => {
  const {
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
  } = usePluginManager();

  const [activeTab, setActiveTab] = useState('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [marketplaceItems, setMarketplaceItems] = useState<PluginMarketplaceItem[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [newRepoData, setNewRepoData] = useState({ name: '', url: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pluginArray = Array.from(plugins.values());
  const filteredPlugins = pluginArray.filter(plugin => {
    const matchesSearch = plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || plugin.manifest.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'viewer', 'analysis', 'workflow', 'integration', 'utility'];

  useEffect(() => {
    if (activeTab === 'marketplace' && searchQuery) {
      handleMarketplaceSearch();
    }
  }, [activeTab, searchQuery]);

  const handleMarketplaceSearch = async () => {
    try {
      const results = await searchMarketplace(searchQuery, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined
      });
      setMarketplaceItems(results);
    } catch (error) {
      console.error('Marketplace search failed:', error);
    }
  };

  const handleFileInstall = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await installPlugin(file);
        setInstallDialogOpen(false);
      } catch (error) {
        console.error('Installation failed:', error);
      }
    }
  };

  const handleUrlInstall = async (url: string) => {
    try {
      await installPlugin(url);
      setInstallDialogOpen(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleAddRepository = async () => {
    try {
      await addRepository({
        name: newRepoData.name,
        url: newRepoData.url,
        description: newRepoData.description,
        trusted: false,
        enabled: true
      });
      setNewRepoData({ name: '', url: '', description: '' });
      setRepoDialogOpen(false);
    } catch (error) {
      console.error('Failed to add repository:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disabled':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'updating':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'bg-green-100 text-green-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'updating':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Plugin Manager
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="installed">Installed ({pluginArray.length})</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="repositories">Repositories</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Installed Plugins Tab */}
          <TabsContent value="installed" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search plugins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Install Plugin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Install Plugin</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Install from file</Label>
                      <Input
                        type="file"
                        accept=".json,.zip"
                        ref={fileInputRef}
                        onChange={handleFileInstall}
                        className="mt-1"
                      />
                    </div>
                    <div className="text-center text-gray-500">or</div>
                    <div>
                      <Label>Install from URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input placeholder="https://example.com/plugin.json" />
                        <Button onClick={() => handleUrlInstall('')}>Install</Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-96">
              <div className="grid gap-4">
                {filteredPlugins.map(plugin => (
                  <Card key={plugin.manifest.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{plugin.manifest.name}</h3>
                          <Badge variant="outline">{plugin.manifest.version}</Badge>
                          <Badge className={getStatusColor(plugin.status)}>
                            {getStatusIcon(plugin.status)}
                            <span className="ml-1">{plugin.status}</span>
                          </Badge>
                          <Badge variant="secondary">{plugin.manifest.category}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{plugin.manifest.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {plugin.manifest.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(plugin.installedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(plugin.size)}
                          </span>
                        </div>
                        {plugin.errorMessage && (
                          <Alert className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{plugin.errorMessage}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plugin.status === 'enabled'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              enablePlugin(plugin.manifest.id);
                            } else {
                              disablePlugin(plugin.manifest.id);
                            }
                          }}
                          disabled={isLoading || plugin.status === 'updating'}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPlugin(plugin);
                            setConfigDialogOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePlugin(plugin.manifest.id)}
                          disabled={isLoading}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => uninstallPlugin(plugin.manifest.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredPlugins.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No plugins found matching your search.' : 'No plugins installed.'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleMarketplaceSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-96">
              <div className="grid gap-4">
                {marketplaceItems.map(item => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          <Badge variant="outline">{item.version}</Badge>
                          <Badge variant="secondary">{item.category}</Badge>
                          {item.verified && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {item.price > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              ${item.price}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {item.downloads.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {item.rating.toFixed(1)} ({item.reviews})
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(item.size)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/marketplace/${item.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUrlInstall(`/marketplace/${item.id}/download`)}
                          disabled={isLoading}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {marketplaceItems.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    No plugins found in marketplace. Try different search terms.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Repositories Tab */}
          <TabsContent value="repositories" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Plugin Repositories</h3>
              <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Repository
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Plugin Repository</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newRepoData.name}
                        onChange={(e) => setNewRepoData({ ...newRepoData, name: e.target.value })}
                        placeholder="Repository name"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newRepoData.url}
                        onChange={(e) => setNewRepoData({ ...newRepoData, url: e.target.value })}
                        placeholder="https://example.com/plugins"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newRepoData.description}
                        onChange={(e) => setNewRepoData({ ...newRepoData, description: e.target.value })}
                        placeholder="Repository description"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setRepoDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRepository}>
                        Add Repository
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {repositories.map(repo => (
                <Card key={repo.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{repo.name}</h4>
                        {repo.trusted && (
                          <Badge className="bg-green-100 text-green-800">
                            <Shield className="h-3 w-3 mr-1" />
                            Trusted
                          </Badge>
                        )}
                        <Badge className={repo.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {repo.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{repo.description}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Globe className="h-3 w-3" />
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {repo.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={repo.enabled}
                        onCheckedChange={() => {
                          // Update repository enabled status
                        }}
                      />
                      {!repo.trusted && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRepository(repo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Plugin System Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-update plugins</Label>
                      <p className="text-sm text-gray-500">Automatically update plugins when new versions are available</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow untrusted repositories</Label>
                      <p className="text-sm text-gray-500">Allow installation from non-verified repositories</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Plugin sandboxing</Label>
                      <p className="text-sm text-gray-500">Run plugins in isolated environments for security</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Development mode</Label>
                      <p className="text-sm text-gray-500">Enable additional debugging and development features</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Storage & Performance</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Plugin cache size limit</Label>
                    <Select defaultValue="100">
                      <SelectTrigger className="w-40 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 MB</SelectItem>
                        <SelectItem value="100">100 MB</SelectItem>
                        <SelectItem value="250">250 MB</SelectItem>
                        <SelectItem value="500">500 MB</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Plugin execution timeout</Label>
                    <Select defaultValue="30">
                      <SelectTrigger className="w-40 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All Plugins
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Plugin List
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Plugin List
                  </Button>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Plugin Cache
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Plugin Configuration Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Configure {selectedPlugin?.manifest.name}
              </DialogTitle>
            </DialogHeader>
            {selectedPlugin && (
              <PluginConfigurationForm
                plugin={selectedPlugin}
                onSave={(config) => {
                  configurePlugin(selectedPlugin.manifest.id, config);
                  setConfigDialogOpen(false);
                }}
                onCancel={() => setConfigDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

// Plugin Configuration Form Component
interface PluginConfigurationFormProps {
  plugin: Plugin;
  onSave: (config: Record<string, any>) => void;
  onCancel: () => void;
}

const PluginConfigurationForm: React.FC<PluginConfigurationFormProps> = ({
  plugin,
  onSave,
  onCancel
}) => {
  const [config, setConfig] = useState(plugin.config || {});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const renderConfigField = (key: string, field: any) => {
    const value = config[key] ?? field.default;

    switch (field.type) {
      case 'string':
        if (field.enum) {
          return (
            <Select value={value} onValueChange={(val) => updateConfig(key, val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {field.enum.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateConfig(key, e.target.value)}
            placeholder={field.description}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateConfig(key, parseFloat(e.target.value))}
            placeholder={field.description}
          />
        );
      case 'boolean':
        return (
          <Switch
            checked={value || false}
            onCheckedChange={(checked) => updateConfig(key, checked)}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateConfig(key, e.target.value)}
            placeholder={field.description}
          />
        );
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateConfig(key, e.target.value)}
            placeholder={field.description}
          />
        );
    }
  };

  const configSchema = plugin.manifest.configuration;
  if (!configSchema) {
    return (
      <div className="text-center py-8 text-gray-500">
        This plugin has no configurable options.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="max-h-96">
        <div className="space-y-4">
          {/* Plugin Information */}
          <div className="border rounded-lg p-4">
            <button
              onClick={() => toggleSection('info')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="font-semibold">Plugin Information</h3>
              {expandedSections.has('info') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('info') && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version:</span>
                  <span>{plugin.manifest.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Author:</span>
                  <span>{plugin.manifest.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span>{plugin.manifest.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">License:</span>
                  <span>{plugin.manifest.license}</span>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Fields */}
          <div className="border rounded-lg p-4">
            <button
              onClick={() => toggleSection('config')}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="font-semibold">Configuration</h3>
              {expandedSections.has('config') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('config') && (
              <div className="mt-4 space-y-4">
                {Object.entries(configSchema.properties).map(([key, field]) => (
                  <div key={key}>
                    <Label className="flex items-center gap-2">
                      {field.title}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                    )}
                    <div className="mt-2">
                      {renderConfigField(key, field)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          {plugin.manifest.permissions && plugin.manifest.permissions.length > 0 && (
            <div className="border rounded-lg p-4">
              <button
                onClick={() => toggleSection('permissions')}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="font-semibold">Permissions</h3>
                {expandedSections.has('permissions') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedSections.has('permissions') && (
                <div className="mt-4 space-y-2">
                  {plugin.manifest.permissions.map((permission, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {permission.required ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{permission.type}</div>
                        <div className="text-xs text-gray-500">{permission.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(config)}>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default PluginManagerUI;