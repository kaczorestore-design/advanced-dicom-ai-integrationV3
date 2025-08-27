import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'

import { Users, Building2, Activity, Settings, Plus, Search, LogOut, Trash2, HardDrive, FileText, Eye } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'
import { RefreshButton } from '../components/RefreshButton'

interface DiagnosticCenter {
  id: number
  name: string
  address: string
  phone: string
  email: string
  is_active: boolean
  storage_quota_gb?: number
  storage_used_gb?: number
  created_at: string
}

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  diagnostic_center_id?: number
  created_at: string
}

interface DeletionRequest {
  id: number
  study_id: number
  requested_by: string
  reason: string
  status: string
  created_at: string
}

interface Study {
  id: number
  patient_name: string
  patient_id: string
  study_date: string
  modality: string
  body_part: string
  study_description: string
  created_at: string
}

interface CenterStorage {
  center_id: number
  center_name: string
  used_gb: number
  quota_gb: number
  usage_percent: number
}

interface AIService {
  name: string
  status: string
  response_time: number
  uptime: number
}

interface MonitoringData {
  total_studies: number
  total_users: number
  total_centers: number
  storage_used: number
  storage_total: number
  system_health: string
  recent_logs: LogEntry[]
  center_storage: CenterStorage[]
  ai_services: AIService[]
}

interface LogEntry {
  id: number
  level: 'error' | 'warning' | 'info'
  message: string
  timestamp: string
}

export default function AdminDashboard() {
  const { user, token, logout } = useAuth()
  const [centers, setCenters] = useState<DiagnosticCenter[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([])
  const [studies, setStudies] = useState<Study[]>([])
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [systemSettings, setSystemSettings] = useState({
    auto_backup: true,
    email_notifications: true,
    maintenance_mode: false,
    max_upload_size: 100,
    session_timeout: 30,
    audit_log_retention: 90
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // Load system settings when settings dialog opens
  useEffect(() => {
    if (settingsOpen) {
      loadSystemSettings()
    }
  }, [settingsOpen, loadSystemSettings])

  const fetchData = useCallback(async () => {
    try {
      const [centersRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/diagnostic-centers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (centersRes.ok && usersRes.ok) {
        const centersData = await centersRes.json()
        const usersData = await usersRes.json()
        setCenters(centersData)
        setUsers(usersData)
        fetchDeletionRequests()
        fetchStudies()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [API_URL, token, fetchDeletionRequests, fetchStudies])

  const fetchStudies = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/studies/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStudies(data);
      }
    } catch (error) {
      console.error('Error fetching studies:', error);
    }
  }, [API_URL, token]);

  const fetchDeletionRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/studies/deletion-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDeletionRequests(data);
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
    }
  }, [API_URL, token]);

  const fetchMonitoringData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/system-monitoring`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMonitoringData(data);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    }
  }, [API_URL, token]);

  // Use the standardized refresh hook
  const { isRefreshing, lastRefreshed, refresh } = useRefresh(
    [fetchData, fetchMonitoringData],
    {
      showFeedback: false // AdminDashboard handles its own feedback
    }
  )

  useEffect(() => {
    fetchData()
    fetchMonitoringData()
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchData()
      fetchMonitoringData()
    }, 30000)
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval)
  }, [fetchData, fetchMonitoringData])

  const stats = {
    totalCenters: centers.length,
    activeCenters: centers.filter(c => c.is_active).length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    radiologists: users.filter(u => u.role === 'radiologist').length,
    doctors: users.filter(u => u.role === 'doctor').length,
  }

  const toggleCenterStatus = async (centerId: number) => {
    try {
      const response = await fetch(`${API_URL}/admin/diagnostic-centers/${centerId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling center status:', error);
    }
  };

  const updateSpaceAllocation = async (centerId: number, quotaGb: number) => {
    try {
      const response = await fetch(`${API_URL}/admin/diagnostic-centers/${centerId}/space-allocation?quota_gb=${quotaGb}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating space allocation:', error);
    }
  };

  const deleteCenter = async (centerId: number) => {
    try {
      const response = await fetch(`${API_URL}/admin/diagnostic-centers/${centerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting center:', error);
    }
  };

  const approveDeletionRequest = async (requestId: number) => {
    try {
      const response = await fetch(`${API_URL}/studies/deletion-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchDeletionRequests();
      }
    } catch (error) {
      console.error('Error approving deletion request:', error);
    }
  };

  const rejectDeletionRequest = async (requestId: number) => {
    try {
      const response = await fetch(`${API_URL}/studies/deletion-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchDeletionRequests();
      }
    } catch (error) {
      console.error('Error rejecting deletion request:', error);
    }
  };

  const deleteStudy = async (studyId: number) => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        // Log the deletion for audit purposes
        console.log(`Study ${studyId} deleted by admin ${user?.full_name} at ${new Date().toISOString()}`);
        
        // Refresh studies list
        fetchStudies();
        
        // Show success message
        alert('Study deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete study: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting study:', error);
      alert('Error deleting study. Please try again.');
    }
  };

  const loadSystemSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/system-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const settings = await response.json();
        setSystemSettings(settings);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  }, [API_URL, token]);

  const updateSystemSettings = (key: string, value: string | number | boolean) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }))
    console.log(`System setting updated: ${key} = ${value}`)
  }

  const saveSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/system-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(systemSettings)
      });
      
      if (response.ok) {
        console.log('System settings saved successfully:', systemSettings)
        alert('Settings saved successfully!')
        setSettingsOpen(false)
      } else {
        const errorData = await response.json()
        console.error('Error saving settings:', errorData)
        alert(`Error saving settings: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please check your connection.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, {user?.full_name}</p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>System Status: Operational</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <RefreshButton 
                isRefreshing={isRefreshing}
                lastRefreshed={lastRefreshed}
                onRefresh={refresh}
                showLastRefreshed={true}
                className="shadow-sm hover:shadow-md transition-shadow"
              />
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>System Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">General Settings</h3>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Auto Backup</label>
                            <p className="text-xs text-gray-500">Automatically backup system data</p>
                          </div>
                          <Switch
                            checked={systemSettings.auto_backup}
                    onCheckedChange={(value) => updateSystemSettings('auto_backup', value)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Email Notifications</label>
                            <p className="text-xs text-gray-500">Send system notifications via email</p>
                          </div>
                          <Switch
                            checked={systemSettings.email_notifications}
                    onCheckedChange={(value) => updateSystemSettings('email_notifications', value)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium">Maintenance Mode</label>
                            <p className="text-xs text-gray-500">Enable maintenance mode</p>
                          </div>
                          <Switch
                            checked={systemSettings.maintenance_mode}
                    onCheckedChange={(value) => updateSystemSettings('maintenance_mode', value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">System Limits</h3>
                        
                        <div>
                          <label className="text-sm font-medium">Max Upload Size (MB)</label>
                          <Input
                            type="number"
                            value={systemSettings.max_upload_size}
                    onChange={(e) => updateSystemSettings('max_upload_size', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Session Timeout (minutes)</label>
                          <Input
                            type="number"
                            value={systemSettings.session_timeout}
                    onChange={(e) => updateSystemSettings('session_timeout', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Audit Log Retention (days)</label>
                          <Input
                            type="number"
                            value={systemSettings.audit_log_retention}
                    onChange={(e) => updateSystemSettings('audit_log_retention', parseInt(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveSettings}>
                        Save Settings
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => { logout(); window.location.href = '/auth/login'; }}
                      className="shadow-sm hover:shadow-md transition-shadow">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'monitoring', label: 'System Monitoring', icon: Activity },
            { id: 'centers', label: 'Diagnostic Centers', icon: Building2 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'study-management', label: 'Study Management', icon: FileText },
            { id: 'deletion-requests', label: 'Deletion Requests', icon: Trash2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Centers</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalCenters}</div>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {stats.activeCenters} active
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Users</CardTitle>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
                  <p className="text-sm text-gray-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {stats.activeUsers} active
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Radiologists</CardTitle>
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.radiologists}</div>
                  <p className="text-sm text-gray-600">
                    Available for reports
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Doctors</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.doctors}</div>
                  <p className="text-sm text-gray-600">
                    Across all centers
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Centers</CardTitle>
                  <CardDescription>Latest diagnostic centers added</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {centers.slice(0, 5).map((center) => (
                      <div key={center.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{center.name}</p>
                          <p className="text-sm text-medical-gray-500">{center.email}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          center.is_active 
                            ? 'bg-medical-success/10 text-medical-success' 
                            : 'bg-medical-error/10 text-medical-error'
                        }`}>
                          {center.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest users registered</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-medical-gray-500">{user.role}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          user.is_active 
                            ? 'bg-medical-success/10 text-medical-success' 
                            : 'bg-medical-error/10 text-medical-error'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* System Monitoring Tab */}
        {activeTab === 'monitoring' && monitoringData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Real-Time System Monitoring</h2>
              <Button onClick={fetchMonitoringData} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monitoringData.system_resources.cpu_percent}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${monitoringData.system_resources.cpu_percent}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monitoringData.system_resources.memory_percent}%</div>
                  <div className="text-sm text-gray-500">
                    {monitoringData.system_resources.memory_used_gb}GB / {monitoringData.system_resources.memory_total_gb}GB
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${monitoringData.system_resources.memory_percent}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Disk Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{monitoringData.system_resources.disk_percent}%</div>
                  <div className="text-sm text-gray-500">
                    {monitoringData.system_resources.disk_used_gb}GB / {monitoringData.system_resources.disk_total_gb}GB
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${monitoringData.system_resources.disk_percent}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage by Center</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monitoringData.center_storage.map((center: CenterStorage) => (
                    <div key={center.center_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{center.center_name}</div>
                        <div className="text-sm text-gray-500">
                          {center.used_gb}GB / {center.quota_gb}GB ({center.usage_percent}%)
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${center.usage_percent > 80 ? 'bg-red-600' : center.usage_percent > 60 ? 'bg-yellow-600' : 'bg-green-600'}`}
                            style={{ width: `${Math.min(center.usage_percent, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${center.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {center.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Services Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {monitoringData.ai_services.map((service: AIService, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-gray-500">
                          Last check: {new Date(service.last_check).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${service.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {service.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{monitoringData.database_stats.total_studies}</div>
                    <div className="text-sm text-gray-500">Total Studies</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{monitoringData.database_stats.total_dicom_files}</div>
                    <div className="text-sm text-gray-500">DICOM Files</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{monitoringData.database_stats.recent_studies_24h}</div>
                    <div className="text-sm text-gray-500">Studies (24h)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{monitoringData.database_stats.recent_uploads_24h}</div>
                    <div className="text-sm text-gray-500">Uploads (24h)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {monitoringData.recent_logs.slice(0, 20).map((log: LogEntry) => (
                    <div key={log.id} className="flex items-center justify-between p-2 border-b">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${log.level === 'error' ? 'bg-red-500' : log.level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                        <span className="text-sm">{log.action}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Centers Tab */}
        {activeTab === 'centers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Diagnostic Centers</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Center
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Diagnostic Center</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Center Name</label>
                      <Input placeholder="Enter center name..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input placeholder="Enter address..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input placeholder="Enter phone number..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input placeholder="Enter email..." />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                      <Button onClick={() => console.log('Add center functionality to be implemented')}>Add Center</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="medical-card overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Diagnostic Centers</h3>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search centers..."
                        className="pl-10 w-64 border-gray-300 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="medical-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centers.map((center) => (
                      <tr key={center.id}>
                        <td>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {center.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {center.address}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="text-gray-900">{center.email}</div>
                          <div className="text-sm text-gray-500">{center.phone}</div>
                        </td>
                        <td>
                          <span className={`status-badge ${
                            center.is_active
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {center.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-gray-500">
                          {new Date(center.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={center.is_active}
                              onCheckedChange={() => toggleCenterStatus(center.id)}
                            />
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <HardDrive className="h-4 w-4 mr-1" />
                                  Space
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage Space Allocation</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Storage Quota (GB)</label>
                                    <Input
                                      type="number"
                                      defaultValue={center.storage_quota_gb || 100}
                                      onBlur={(e) => updateSpaceAllocation(center.id, parseInt(e.target.value))}
                                    />
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Used: {center.storage_used_gb || 0} GB / {center.storage_quota_gb || 100} GB
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Center</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this diagnostic center? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteCenter(center.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Users</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-medical-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-medical-primary/10 text-medical-primary">
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-medical-success/10 text-medical-success'
                              : 'bg-medical-error/10 text-medical-error'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => console.log('Edit user:', user.id)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Study Management Tab */}
        {activeTab === 'study-management' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Study Management</h2>
              <div className="text-sm text-gray-600">
                Total Studies: {studies.length}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Study ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{study.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {study.patient?.first_name} {study.patient?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {study.patient?.patient_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {study.study_description || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {study.modality || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            study.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : study.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : study.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {study.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(study.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/viewer/${study.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Study</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete this study?
                                  <br /><br />
                                  <strong>Study:</strong> {study.study_description || 'N/A'}<br />
                                  <strong>Patient:</strong> {study.patient?.first_name} {study.patient?.last_name}<br />
                                  <strong>ID:</strong> #{study.id}<br /><br />
                                  This action cannot be undone and will remove all associated DICOM files.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteStudy(study.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Study
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {studies.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No studies found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deletion Requests Tab */}
        {activeTab === 'deletion-requests' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Study Deletion Requests</h2>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Study
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletionRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Study #{request.study_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          User #{request.requested_by_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {request.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => approveDeletionRequest(request.id)}>
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => rejectDeletionRequest(request.id)}>
                                Reject
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
