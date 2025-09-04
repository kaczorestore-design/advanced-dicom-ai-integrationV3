import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Upload, FileText, Activity, Plus, Search, Eye, LogOut, Trash2, CheckCircle, AlertCircle, RefreshCw, FileCheck } from 'lucide-react'
import * as dicomParser from 'dicom-parser'

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
  patient: {
    first_name: string
    last_name: string
    patient_id: string
  }
}

export default function TechnicianDashboard() {
  const { user, token, logout, refreshToken, isTokenValid } = useAuth()
  const navigate = useNavigate()
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [deletionReason, setDeletionReason] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [patientData, setPatientData] = useState({
    patient_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: ''
  })
  const [studyData, setStudyData] = useState({
    study_description: '',
    modality: '',
    body_part: '',
    study_date: '',
    priority: 'normal'
  })
  const [showUploadConfirmation, setShowUploadConfirmation] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    study_id: string;
    patient_id: number;
    files_uploaded: number;
    message: string;
    patient_data?: {
      first_name: string;
      last_name: string;
      patient_id: string;
      date_of_birth: string;
      gender: string;
    };
    study_data?: {
      study_description: string;
      modality: string;
      body_part: string;
      study_date: string;
    };
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const fetchStudies = useCallback(async () => {
    try {
      // Check if token is valid before making request
      if (!isTokenValid()) {
        console.log('Token expired, attempting refresh...')
        const refreshSuccess = await refreshToken()
        if (!refreshSuccess) {
          console.log('Token refresh failed, redirecting to login')
          logout()
          navigate('/login')
          return
        }
      }

      const response = await fetch(`${API_URL}/studies/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStudies(data)
      } else if (response.status === 401) {
        // Token might be expired, try refresh
        console.log('Received 401, attempting token refresh...')
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          // Retry the request with new token
          const retryResponse = await fetch(`${API_URL}/studies/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            setStudies(data)
          }
        } else {
          console.log('Token refresh failed, redirecting to login')
          logout()
          navigate('/login')
        }
      }
    } catch (error) {
      console.error('Error fetching studies:', error)
    } finally {
      setLoading(false)
    }
  }, [token, isTokenValid, refreshToken, logout, navigate, API_URL])

  useEffect(() => {
    fetchStudies()
    
    // Set up automatic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchStudies()
    }, 30000)
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval)
  }, [fetchStudies])

  const stats = {
    totalStudies: studies.length,
    pendingStudies: studies.filter(s => s.status === 'pending').length,
    completedStudies: studies.filter(s => s.status === 'completed').length,
    todayStudies: studies.filter(s => 
      new Date(s.created_at).toDateString() === new Date().toDateString()
    ).length,
  }

  const requestStudyDeletion = async (studyId: string) => {
    if (!deletionReason.trim()) {
      alert('Please provide a reason for deletion');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/studies/deletion-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          study_id: studyId,
          reason: deletionReason
        })
      });
      
      if (response.ok) {
        setDeletionReason('');
        alert('Deletion request submitted successfully');
      }
    } catch (error) {
      console.error('Error requesting study deletion:', error);
    }
  };

  const extractDicomMetadata = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const byteArray = new Uint8Array(arrayBuffer)
      const dataSet = dicomParser.parseDicom(byteArray)
      
      const extractTag = (tag: string) => {
        const element = dataSet.elements[tag]
        if (element) {
          return dataSet.string(tag) || ''
        }
        return ''
      }
      
      const patientName = extractTag('x00100010').replace(/\^/g, ' ').trim()
      const nameParts = patientName.split(' ').filter((part: string) => part.length > 0)
      
      return {
        patient_id: extractTag('x00100020'),
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        date_of_birth: extractTag('x00100030'),
        gender: extractTag('x00100040'),
        study_description: extractTag('x00081030'),
        modality: extractTag('x00080060'),
        body_part: extractTag('x00180015'),
        study_date: extractTag('x00080020')
      }
    } catch (error) {
      console.error('Error parsing DICOM file:', error)
      return null
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
      
      if (files.length > 0 && files[0].name.toLowerCase().endsWith('.dcm')) {
        const metadata = await extractDicomMetadata(files[0])
        if (metadata) {
          setPatientData({
            patient_id: metadata.patient_id || patientData.patient_id,
            first_name: metadata.first_name || patientData.first_name,
            last_name: metadata.last_name || patientData.last_name,
            date_of_birth: metadata.date_of_birth ? 
              `${metadata.date_of_birth.slice(0,4)}-${metadata.date_of_birth.slice(4,6)}-${metadata.date_of_birth.slice(6,8)}` : 
              patientData.date_of_birth,
            gender: metadata.gender || patientData.gender,
            phone: patientData.phone,
            email: patientData.email,
            address: patientData.address
          })
          
          setStudyData({
            study_description: metadata.study_description || studyData.study_description,
            modality: metadata.modality || studyData.modality,
            body_part: metadata.body_part || studyData.body_part,
            study_date: metadata.study_date ? 
              `${metadata.study_date.slice(0,4)}-${metadata.study_date.slice(4,6)}-${metadata.study_date.slice(6,8)}` : 
              studyData.study_date,
            priority: studyData.priority
          })
        }
      }
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files) {
      setSelectedFiles(Array.from(files))
      
      if (files.length > 0 && files[0].name.toLowerCase().endsWith('.dcm')) {
        const metadata = await extractDicomMetadata(files[0])
        if (metadata) {
          setPatientData({
            patient_id: metadata.patient_id || patientData.patient_id,
            first_name: metadata.first_name || patientData.first_name,
            last_name: metadata.last_name || patientData.last_name,
            date_of_birth: metadata.date_of_birth ? 
              `${metadata.date_of_birth.slice(0,4)}-${metadata.date_of_birth.slice(4,6)}-${metadata.date_of_birth.slice(6,8)}` : 
              patientData.date_of_birth,
            gender: metadata.gender || patientData.gender,
            phone: patientData.phone,
            email: patientData.email,
            address: patientData.address
          })
          
          setStudyData({
            study_description: metadata.study_description || studyData.study_description,
            modality: metadata.modality || studyData.modality,
            body_part: metadata.body_part || studyData.body_part,
            study_date: metadata.study_date ? 
              `${metadata.study_date.slice(0,4)}-${metadata.study_date.slice(4,6)}-${metadata.study_date.slice(6,8)}` : 
              studyData.study_date,
            priority: studyData.priority
          })
        }
      }
    }
  }

  const resetUploadState = () => {
    setUploadStatus('idle')
    setUploadProgress(0)
    setUploadSpeed(0)
    setUploadError(null)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select DICOM files to upload')
      return
    }

    // Check token validity before upload
    if (!isTokenValid()) {
      try {
        await refreshToken()
      } catch (error) {
        console.error('Token refresh failed:', error)
        logout()
        navigate('/login')
        return
      }
    }

    setUploading(true)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setUploadSpeed(0)
    setUploadError(null)

    const formData = new FormData()
    
    selectedFiles.forEach((file) => {
      formData.append('files', file)
    })
    
    formData.append('patient_data', JSON.stringify(patientData))
    formData.append('study_data', JSON.stringify(studyData))

    // Calculate total file size for speed calculation
    const startTime = Date.now()

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percentComplete)
          
          // Calculate upload speed
          const elapsedTime = (Date.now() - startTime) / 1000 // seconds
          const uploadedMB = event.loaded / (1024 * 1024) // MB
          const speed = elapsedTime > 0 ? uploadedMB / elapsedTime : 0
          setUploadSpeed(speed)
        }
      })

      xhr.addEventListener('load', () => {
        setUploading(false)
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText)
            // Preserve form data in upload result for confirmation dialog
            const enrichedResult = {
              ...result,
              patient_data: {
                first_name: patientData.first_name,
                last_name: patientData.last_name,
                patient_id: patientData.patient_id,
                date_of_birth: patientData.date_of_birth,
                gender: patientData.gender
              },
              study_data: {
                study_description: studyData.study_description,
                modality: studyData.modality,
                body_part: studyData.body_part,
                study_date: studyData.study_date
              }
            }
            setUploadResult(enrichedResult)
            setUploadStatus('success')
            setShowUploadConfirmation(true)
            setShowSuccessNotification(true)
            
            // Auto-hide success notification after 5 seconds
            setTimeout(() => {
              setShowSuccessNotification(false)
              resetUploadState()
            }, 5000)
            
            setSelectedFiles([])
            setPatientData({ patient_id: '', first_name: '', last_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' })
            setStudyData({ study_description: '', modality: '', body_part: '', study_date: '', priority: 'normal' })
            fetchStudies()
            resolve()
          } catch (error) {
            setUploadStatus('error')
            setUploadError('Failed to parse server response')
            reject(error)
          }
        } else {
          // Handle 401 specifically for token refresh
          if (xhr.status === 401) {
            refreshToken().then(() => {
              // Retry the upload with new token
              const retryXhr = new XMLHttpRequest()
              
              // Set up the same event listeners for retry
              retryXhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100)
                  setUploadProgress(percentComplete)
                  
                  const elapsedTime = (Date.now() - startTime) / 1000
                  const uploadedMB = event.loaded / (1024 * 1024)
                  const speed = elapsedTime > 0 ? uploadedMB / elapsedTime : 0
                  setUploadSpeed(speed)
                }
              })
              
              retryXhr.addEventListener('load', () => {
                setUploading(false)
                if (retryXhr.status >= 200 && retryXhr.status < 300) {
                  try {
                    const result = JSON.parse(retryXhr.responseText)
                    setUploadResult(result)
                    setUploadStatus('success')
                    setShowUploadConfirmation(true)
                    setShowSuccessNotification(true)
                    
                    setTimeout(() => {
                      setShowSuccessNotification(false)
                      resetUploadState()
                    }, 5000)
                    
                    setSelectedFiles([])
                    setPatientData({ patient_id: '', first_name: '', last_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' })
                    setStudyData({ study_description: '', modality: '', body_part: '', study_date: '', priority: 'normal' })
                    fetchStudies()
                    resolve()
                  } catch (error) {
                    setUploadStatus('error')
                    setUploadError('Failed to parse server response')
                    reject(error)
                  }
                } else {
                  try {
                    const error = JSON.parse(retryXhr.responseText)
                    setUploadStatus('error')
                    setUploadError(error.detail || 'Upload failed after token refresh')
                  } catch {
                    setUploadStatus('error')
                    setUploadError(`Upload failed with status ${retryXhr.status} after token refresh`)
                  }
                  reject(new Error(`Upload failed with status ${retryXhr.status}`))
                }
              })
              
              retryXhr.addEventListener('error', () => {
                setUploading(false)
                setUploadStatus('error')
                setUploadError('Network error occurred during retry upload')
                reject(new Error('Network error on retry'))
              })
              
              retryXhr.open('POST', `${API_URL}/studies/upload`)
              retryXhr.setRequestHeader('Authorization', `Bearer ${token}`)
              retryXhr.send(formData)
            }).catch((refreshError) => {
              console.error('Token refresh failed during upload:', refreshError)
              setUploading(false)
              setUploadStatus('error')
              setUploadError('Authentication failed. Please log in again.')
              logout()
              navigate('/login')
              reject(refreshError)
            })
            return
          }
          
          try {
            const error = JSON.parse(xhr.responseText)
            setUploadStatus('error')
            setUploadError(error.detail || 'Upload failed')
          } catch {
            setUploadStatus('error')
            setUploadError(`Upload failed with status ${xhr.status}`)
          }
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        setUploading(false)
        setUploadStatus('error')
        setUploadError('Network error occurred during upload')
        reject(new Error('Network error'))
      })

      xhr.addEventListener('abort', () => {
        setUploading(false)
        setUploadStatus('error')
        setUploadError('Upload was cancelled')
        reject(new Error('Upload cancelled'))
      })

      xhr.open('POST', `${API_URL}/studies/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
          <p className="mt-4 text-gray-600">Loading technician dashboard...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Technician Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, {user?.full_name}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Ready for uploads</span>
                </div>
                <span>•</span>
                <span>{stats.todayStudies} studies uploaded today</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={fetchStudies}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => setActiveTab('upload')}
                className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Study
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
            { id: 'studies', label: 'Studies', icon: FileText },
            { id: 'reports', label: 'Reports', icon: FileCheck },
            { id: 'upload', label: 'Upload', icon: Upload },
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
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Pending</CardTitle>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Activity className="h-5 w-5 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.pendingStudies}</div>
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
                  <div className="text-3xl font-bold text-gray-900">{stats.completedStudies}</div>
                  <p className="text-sm text-gray-600">
                    Reports ready
                  </p>
                </CardContent>
              </Card>

              <Card className="medical-card hover:scale-105 transition-transform duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Today</CardTitle>
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Upload className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">{stats.todayStudies}</div>
                  <p className="text-sm text-gray-600">
                    Uploaded today
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Studies</CardTitle>
                  <CardDescription>Latest uploaded studies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studies.slice(0, 5).map((study) => (
                      <div key={study.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {study.patient.first_name} {study.patient.last_name}
                          </p>
                          <p className="text-sm text-medical-gray-500">
                            {study.modality} - {study.body_part}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          study.status === 'completed'
                            ? 'bg-medical-success/10 text-medical-success'
                            : study.status === 'in_progress'
                            ? 'bg-medical-warning/10 text-medical-warning'
                            : 'bg-medical-gray-100 text-medical-gray-800'
                        }`}>
                          {study.status.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks for technicians</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Study
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('studies')}>
                      <FileText className="h-4 w-4 mr-2" />
                      View All Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('studies')}>
                      <Search className="h-4 w-4 mr-2" />
                      Search Studies
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => fetchStudies()}>
                      <Activity className="h-4 w-4 mr-2" />
                      Check Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Studies Tab */}
        {activeTab === 'studies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Studies</h2>
              <Button onClick={() => setActiveTab('upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Study
              </Button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search studies..."
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
                        Status
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
                            <div className="text-sm text-medical-gray-500">
                              ID: {study.patient.patient_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-medical-gray-900">{study.modality}</div>
                          <div className="text-sm text-medical-gray-500">{study.body_part}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              study.status === 'completed'
                                ? 'bg-medical-success/10 text-medical-success'
                                : study.status === 'processing'
                                ? 'bg-blue-100 text-blue-700'
                                : study.status === 'queued'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-medical-gray-100 text-medical-gray-800'
                            }`}>
                              {study.status.replace('_', ' ')}
                            </span>
                            <div className="flex items-center space-x-1">
                              {['Uploaded', 'Queued', 'Processing', 'Report Generated'].map((stage, index) => (
                                <div key={stage} className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${
                                    index === 0 ? 'bg-green-500' :
                                    study.status === 'queued' && index === 1 ? 'bg-blue-500' :
                                    study.status === 'processing' && index <= 2 ? 'bg-blue-500' :
                                    study.status === 'completed' && index <= 3 ? 'bg-green-500' :
                                    'bg-gray-300'
                                  }`}></div>
                                  {index < 3 && <div className="w-4 h-0.5 bg-gray-300 mx-1"></div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-medical-gray-500">
                          {new Date(study.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/studies/${study.id}/viewer`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Study
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Request Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Request Study Deletion</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Reason for deletion</label>
                                  <Input
                                    placeholder="Enter reason for deletion request..."
                                    value={deletionReason}
                                    onChange={(e) => setDeletionReason(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setDeletionReason('')}>Cancel</Button>
                                  <Button onClick={() => requestStudyDeletion(study.id)}>Submit Request</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
              <div className="text-sm text-gray-600">
                View reports for your uploaded studies
              </div>
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
                    {studies.filter(study => study.status === 'completed').map((study) => (
                      <tr key={study.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-medical-gray-900">
                              {study.patient.first_name} {study.patient.last_name}
                            </div>
                            <div className="text-sm text-medical-gray-500">
                              ID: {study.patient.patient_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-medical-gray-900">{study.modality}</div>
                          <div className="text-sm text-medical-gray-500">{study.body_part}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {study.status === 'completed' && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                Completed
                              </span>
                            )}
                            {study.status !== 'completed' && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                                {study.status}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-medical-gray-500">
                          {new Date(study.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {study.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate(`/studies/${study.id}/reports/editor`)}
                            >
                              <FileCheck className="h-4 w-4 mr-1" />
                              View Report
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/studies/${study.id}/viewer`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Study
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {studies.filter(study => study.status === 'completed').length === 0 && (
                  <div className="text-center py-12">
                    <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No reports available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Reports will appear here once your uploaded studies are processed and reviewed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Upload Study</h2>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>DICOM File Upload</CardTitle>
                <CardDescription>
                  Upload DICOM files and patient information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div 
                    className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-400 transition-colors duration-200"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-6">
                      <Upload className="h-12 w-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Drop DICOM files here
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Drag and drop your DICOM files here, or click to browse and select files from your computer
                    </p>
                    <Button 
                      className="shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".dcm,.dicom"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Patient Information</h4>
                      <div className="space-y-3">
                        <Input 
                          placeholder="Patient ID" 
                          value={patientData.patient_id}
                          onChange={(e) => setPatientData({...patientData, patient_id: e.target.value})}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input 
                            placeholder="First Name" 
                            value={patientData.first_name}
                            onChange={(e) => setPatientData({...patientData, first_name: e.target.value})}
                          />
                          <Input 
                            placeholder="Last Name" 
                            value={patientData.last_name}
                            onChange={(e) => setPatientData({...patientData, last_name: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input 
                            type="date" 
                            placeholder="Date of Birth" 
                            value={patientData.date_of_birth}
                            onChange={(e) => setPatientData({...patientData, date_of_birth: e.target.value})}
                          />
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={patientData.gender}
                            onChange={(e) => setPatientData({...patientData, gender: e.target.value})}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input 
                            type="tel" 
                            placeholder="Phone Number" 
                            value={patientData.phone}
                            onChange={(e) => setPatientData({...patientData, phone: e.target.value})}
                          />
                          <Input 
                            type="email" 
                            placeholder="Email Address" 
                            value={patientData.email}
                            onChange={(e) => setPatientData({...patientData, email: e.target.value})}
                          />
                        </div>
                        <Input 
                          placeholder="Address" 
                          value={patientData.address}
                          onChange={(e) => setPatientData({...patientData, address: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Study Information</h4>
                      <div className="space-y-3">
                        <Input 
                          placeholder="Study Description" 
                          value={studyData.study_description}
                          onChange={(e) => setStudyData({...studyData, study_description: e.target.value})}
                        />
                        <Input 
                          placeholder="Modality (CT, MRI, X-Ray, etc.)" 
                          value={studyData.modality}
                          onChange={(e) => setStudyData({...studyData, modality: e.target.value})}
                        />
                        <Input 
                          placeholder="Body Part" 
                          value={studyData.body_part}
                          onChange={(e) => setStudyData({...studyData, body_part: e.target.value})}
                        />
                        <Input 
                          type="date" 
                          placeholder="Study Date" 
                          value={studyData.study_date}
                          onChange={(e) => setStudyData({...studyData, study_date: e.target.value})}
                        />
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={studyData.priority}
                          onChange={(e) => setStudyData({...studyData, priority: e.target.value})}
                        >
                          <option value="normal">Normal Priority</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT (Emergency)</option>
                          <option value="routine">Routine</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                  <div className="animate-cardiac-spin text-blue-600 text-2xl">❤️</div>
                  <p className="mt-2 text-gray-600 text-sm">Uploading...</p>
                </div>
                          <span className="text-sm font-medium text-blue-800">Uploading files...</span>
                        </div>
                        <span className="text-sm text-blue-600">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      {uploadSpeed > 0 && (
                        <div className="flex items-center justify-between text-xs text-blue-600">
                          <span>Upload speed: {uploadSpeed.toFixed(1)} MB/s</span>
                          <span>{selectedFiles.length} files</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Success Notification */}
                  {showSuccessNotification && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Upload Successful!</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowSuccessNotification(false)
                            resetUploadState()
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          ×
                        </Button>
                      </div>
                      <p className="text-sm text-green-600 mt-1">Study has been uploaded and processed successfully.</p>
                    </div>
                  )}

                  {/* Upload Error */}
                  {uploadStatus === 'error' && uploadError && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">Upload Failed</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadError(null)
                            setUploadStatus('idle')
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </Button>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedFiles([])
                        setPatientData({ patient_id: '', first_name: '', last_name: '', date_of_birth: '', gender: '', phone: '', email: '', address: '' })
                        setStudyData({ study_description: '', modality: '', body_part: '', study_date: '', priority: 'normal' })
                        resetUploadState()
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload}
                      disabled={uploading || selectedFiles.length === 0}
                      className={uploadStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : uploadStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      {uploading ? (
                        <div className="flex items-center space-x-2">
                          <div className="text-center">
                  <div className="animate-cardiac-spin text-white text-2xl">❤️</div>
                  <p className="mt-2 text-gray-200 text-sm">Processing...</p>
                </div>
                          <span>Uploading... {uploadProgress}%</span>
                        </div>
                      ) : uploadStatus === 'success' ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Upload Complete</span>
                        </div>
                      ) : uploadStatus === 'error' ? (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>Upload Failed</span>
                        </div>
                      ) : 'Upload Study'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Confirmation Dialog */}
            <Dialog open={showUploadConfirmation} onOpenChange={setShowUploadConfirmation}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>DICOM Files Uploaded Successfully</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {uploadResult && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-3">Upload Summary:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Patient Name:</span>
                          <span className="font-medium">
                            {uploadResult.patient_data?.first_name && uploadResult.patient_data?.last_name 
                              ? `${uploadResult.patient_data.first_name} ${uploadResult.patient_data.last_name}`
                              : 'Not provided'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Patient ID:</span>
                          <span className="font-medium">
                            {uploadResult.patient_data?.patient_id || 'Auto-generated'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date of Birth:</span>
                          <span className="font-medium">
                            {uploadResult.patient_data?.date_of_birth || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gender:</span>
                          <span className="font-medium">
                            {uploadResult.patient_data?.gender || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Study Description:</span>
                          <span className="font-medium">
                            {uploadResult.study_data?.study_description || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Modality:</span>
                          <span className="font-medium">
                            {uploadResult.study_data?.modality || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Body Part:</span>
                          <span className="font-medium">
                            {uploadResult.study_data?.body_part || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Files Uploaded:</span>
                          <span className="font-medium">{uploadResult.files_uploaded}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => setShowUploadConfirmation(false)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      setShowUploadConfirmation(false)
                      setActiveTab('studies')
                      fetchStudies()
                    }}>
                      View Studies
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>


    </div>
  )
}
