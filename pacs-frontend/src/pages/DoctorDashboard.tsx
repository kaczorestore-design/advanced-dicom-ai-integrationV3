import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { FileText, Activity, Eye, Edit, Search, Brain, Clock, LogOut } from 'lucide-react'
import { useRefresh } from '../hooks/useRefresh'
import { RefreshButton } from '../components/RefreshButton'

interface Study {
  id: string
  study_uid: string
  patient_id: number
  study_date: string
  modality: string
  body_part: string
  study_description: string
  status: string
  created_at: string
  ai_report: string | null
  doctor_report: string | null
  patient: {
    first_name: string
    last_name: string
    patient_id: string
    date_of_birth: string
    gender: string
    phone: string
    email: string
    address: string
  }
}

export default function DoctorDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const API_URL = 'http://localhost:8000'

  const fetchStudies = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/studies/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStudies(data)
      }
    } catch (error) {
      console.error('Error fetching studies:', error)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Use the standardized refresh hook
  const { isRefreshing, lastRefreshed, refresh } = useRefresh(
    [fetchStudies],
    {
      showFeedback: false // DoctorDashboard handles its own feedback
    }
  )

  useEffect(() => {
    fetchStudies()
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchStudies()
    }, 30000)
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval)
  }, [fetchStudies])

  const assignedStudies = studies.filter(s => s.status === 'assigned' || s.status === 'in_progress')
  
  const stats = {
    totalStudies: studies.length,
    assignedStudies: assignedStudies.length,
    completedReports: studies.filter(s => s.doctor_report).length,
    pendingReports: assignedStudies.filter(s => !s.doctor_report).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
          <p className="mt-4 text-gray-600">Loading doctor dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, Dr. {user?.full_name}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{stats.assignedStudies} studies assigned</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>{stats.pendingReports} reports pending</span>
                </div>
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
                variant="outline" 
                onClick={() => setActiveTab('reports')}
                className="shadow-sm hover:shadow-md transition-shadow border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Reports
              </Button>
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
            { id: 'assigned', label: 'Assigned Studies', icon: Clock },
            { id: 'reports', label: 'Reports', icon: FileText },
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
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Studies</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalStudies}</div>
                  <p className="text-sm text-gray-600">
                    All accessible
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Assigned</CardTitle>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.assignedStudies}</div>
                  <p className="text-sm text-gray-600">
                    Awaiting review
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Completed</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.completedReports}</div>
                  <p className="text-sm text-gray-600">
                    Reports written
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Pending</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.pendingReports}</div>
                  <p className="text-sm text-gray-600">
                    Need reports
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Studies</CardTitle>
                  <CardDescription>Studies waiting for your review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignedStudies.slice(0, 5).map((study) => (
                      <div key={study.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {study.patient.first_name} {study.patient.last_name}
                          </p>
                          <p className="text-sm text-medical-gray-500">
                            {study.modality} - {study.body_part}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {study.ai_report && (
                            <div className="px-2 py-1 rounded-full text-xs bg-medical-primary/10 text-medical-primary">
                              AI Report
                            </div>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/studies/${study.id}/viewer`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks for doctors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('assigned')}>
                      <Clock className="h-4 w-4 mr-2" />
                      View Assigned Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('reports')}>
                      <Brain className="h-4 w-4 mr-2" />
                      Review AI Reports
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('reports')}>
                      <Edit className="h-4 w-4 mr-2" />
                      Write Reports
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('assigned')}>
                      <FileText className="h-4 w-4 mr-2" />
                      View All Studies
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Assigned Studies Tab */}
        {activeTab === 'assigned' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assigned Studies</h2>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search assigned studies..."
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
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Study
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        AI Report
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedStudies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {study.patient.first_name} {study.patient.last_name}
                            </div>
                            <div className="text-sm text-medical-gray-500 space-y-1">
                              <div>ID: {study.patient.patient_id}</div>
                              <div>{study.patient.gender} • DOB: {study.patient.date_of_birth}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-medical-gray-900">{study.modality}</div>
                          <div className="text-sm text-medical-gray-500">{study.body_part}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {study.ai_report ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-medical-primary/10 text-medical-primary">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-medical-gray-100 text-medical-gray-800">
                              Not Generated
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            study.doctor_report
                              ? 'bg-medical-success/10 text-medical-success'
                              : 'bg-medical-warning/10 text-medical-warning'
                          }`}>
                            {study.doctor_report ? 'Report Complete' : 'Pending Review'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/studies/${study.id}/viewer`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/studies/${study.id}/reports/editor`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Report
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

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reports</h2>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search reports..."
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
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Study
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Report Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-medical-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studies.map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {study.patient.first_name} {study.patient.last_name}
                            </div>
                            <div className="text-sm text-medical-gray-500 space-y-1">
                              <div>ID: {study.patient.patient_id}</div>
                              <div>{study.patient.gender} • DOB: {study.patient.date_of_birth}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-medical-gray-900">{study.modality}</div>
                          <div className="text-sm text-medical-gray-500">{study.body_part}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            study.doctor_report
                              ? 'bg-medical-success/10 text-medical-success'
                              : 'bg-medical-gray-100 text-medical-gray-800'
                          }`}>
                            {study.doctor_report ? 'Complete' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-medical-gray-500">
                          {new Date(study.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/studies/${study.id}/viewer`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {!study.doctor_report && (
                            <Button size="sm" onClick={() => navigate(`/studies/${study.id}/reports/editor`)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Write
                            </Button>
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
