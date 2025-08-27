import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Users, FileText, Activity, Plus, Search, UserPlus, LogOut } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'
import { RefreshButton } from '../components/RefreshButton'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export default function DiagnosticCenterDashboard() {
  const { user, token, logout } = useAuth()
  const [centerUsers, setCenterUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchCenterUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/diagnostic-center/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setCenterUsers(data)
      }
    } catch (error) {
      console.error('Error fetching center users:', error)
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  // Use the standardized refresh hook
  const { isRefreshing, lastRefreshed, refresh } = useRefresh(
    [fetchCenterUsers],
    {
      showFeedback: false // DiagnosticCenterDashboard handles its own feedback
    }
  )

  useEffect(() => {
    fetchCenterUsers()
  }, [fetchCenterUsers])

  const stats = {
    totalUsers: centerUsers.length,
    activeUsers: centerUsers.filter(u => u.is_active).length,
    doctors: centerUsers.filter(u => u.role === 'doctor').length,
    technicians: centerUsers.filter(u => u.role === 'technician').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
          <p className="mt-4 text-gray-600">Loading diagnostic center...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Diagnostic Center Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, {user?.full_name}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Center Status: Active</span>
                </div>
                <span>•</span>
                <span>{stats.totalUsers} staff members</span>
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
              <Button 
                onClick={() => setActiveTab('users')}
                className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  logout()
                  window.location.href = '/auth/login'
                }}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
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
            { id: 'users', label: 'Users', icon: Users },
            { id: 'studies', label: 'Studies', icon: FileText },
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
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Users</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
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
                  <CardTitle className="text-sm font-semibold text-gray-700">Doctors</CardTitle>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.doctors}</div>
                  <p className="text-sm text-gray-600">
                    Available for reports
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Technicians</CardTitle>
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Users className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.technicians}</div>
                  <p className="text-sm text-gray-600">
                    Upload studies
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Studies</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">0</div>
                  <p className="text-sm text-gray-600">
                    This month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest users in your center</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {centerUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-medical-gray-500">{user.role.replace('_', ' ')}</p>
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

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks for center management</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('users')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Doctor
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('users')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Technician
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('studies')}>
                      <FileText className="h-4 w-4 mr-2" />
                      View All Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => console.log('Generate reports functionality to be implemented')}>
                      <Activity className="h-4 w-4 mr-2" />
                      Generate Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Center Users</h2>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {centerUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-sm text-medical-gray-500">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-medical-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="outline" size="sm" onClick={() => console.log('Edit user functionality to be implemented', user.id)}>
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={user.is_active ? 'text-medical-error' : 'text-medical-success'}
                            onClick={() => console.log('Toggle user status functionality to be implemented', user.id)}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
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

        {/* Studies Tab */}
        {activeTab === 'studies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Studies</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Study
              </Button>
            </div>

            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-medical-gray-900 mb-2">No studies yet</h3>
                  <p className="text-medical-gray-500 mb-4">
                    Start by uploading your first DICOM study
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Study
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
