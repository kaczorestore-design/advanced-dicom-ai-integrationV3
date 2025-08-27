import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { FileText, Brain, Save, Send, Download, Share, Eye, ArrowLeft } from 'lucide-react'

interface AIReport {
  findings: string
  impression: string
  recommendations?: string
  confidence_score?: number
}

interface Study {
  id: number
  patient: {
    first_name: string
    last_name: string
    patient_id: string
    date_of_birth: string
    gender: string
  }
  modality: string
  body_part: string
  study_description: string
  study_date: string
  ai_report: AIReport | null
  radiologist_report: string | null
  status: string
  created_at: string
}

const ReportEditor: React.FC = () => {
  const { studyId } = useParams<{ studyId: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [study, setStudy] = useState<Study | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reportContent, setReportContent] = useState('')
  const [findings, setFindings] = useState('')
  const [impression, setImpression] = useState('')
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareEmail, setShareEmail] = useState('')

  const API_URL = 'http://127.0.0.1:8000'

  useEffect(() => {
    fetchStudy()
  }, [studyId, fetchStudy])

  const fetchStudy = useCallback(async () => {
    try {
      console.log('Fetching study with token:', token ? 'Token present' : 'No token')
      const response = await fetch(`${API_URL}/studies/${studyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const studyData = await response.json()
        console.log('Study data received:', studyData)
        setStudy(studyData)
        
        if (studyData.ai_report) {
          try {
            let aiReport;
            if (typeof studyData.ai_report === 'string') {
              const jsonString = studyData.ai_report
                .replace(/'/g, '"')
                .replace(/True/g, 'true')
                .replace(/False/g, 'false')
                .replace(/None/g, 'null');
              aiReport = JSON.parse(jsonString);
            } else {
              aiReport = studyData.ai_report;
            }
            
            setFindings(aiReport.findings?.join('\n') || '')
            setImpression(aiReport.impression || '')
          } catch (parseError) {
            console.warn('Failed to parse AI report JSON:', parseError)
            console.log('Raw AI report data:', studyData.ai_report)
            setFindings('')
            setImpression('')
          }
        }
        
        if (studyData.radiologist_report) {
          setReportContent(studyData.radiologist_report)
        }
      } else {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        alert(`Failed to load study: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to fetch study:', error)
      alert('Failed to load study. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [studyId, token])

  const saveReport = async () => {
    setSaving(true)
    try {
      const reportData = {
        findings: findings,
        impression: impression,
        content: reportContent,
        status: 'draft'
      }

      const response = await fetch(`${API_URL}/studies/${studyId}/report`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      })

      if (response.ok) {
        alert('Report saved successfully')
      }
    } catch (error) {
      console.error('Failed to save report:', error)
      alert('Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const finalizeReport = async () => {
    setSaving(true)
    try {
      const reportData = {
        findings: findings,
        impression: impression,
        content: reportContent,
        status: 'final'
      }

      const response = await fetch(`${API_URL}/studies/${studyId}/report`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
      })

      if (response.ok) {
        alert('Report finalized successfully')
        navigate('/medical-imaging/dashboard')
      }
    } catch (error) {
      console.error('Failed to finalize report:', error)
      alert('Failed to finalize report')
    } finally {
      setSaving(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/report/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${study?.patient.first_name}_${study?.patient.last_name}_Report.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const shareWithPatient = async () => {
    try {
      const response = await fetch(`${API_URL}/studies/${studyId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: shareEmail })
      })

      if (response.ok) {
        alert('Report shared successfully')
        setShowShareDialog(false)
        setShareEmail('')
      }
    } catch (error) {
      console.error('Failed to share report:', error)
      alert('Failed to share report')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
        <p className="mt-4 text-gray-600">Loading report editor...</p>
      </div>
    </div>
  }

  if (!study) {
    return <div className="p-8 text-center">Study not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/medical-imaging/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Report Editor</h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium">
                    {study.patient.first_name} {study.patient.last_name} - {study.modality} {study.body_part}
                  </p>
                  <div className="flex space-x-4">
                    <span>ID: {study.patient.patient_id}</span>
                    <span>DOB: {study.patient.date_of_birth}</span>
                    <span>Gender: {study.patient.gender}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate(`/studies/${studyId}/viewer`)}>
                <Eye className="h-4 w-4 mr-2" />
                View Images
              </Button>
              <Button variant="outline" onClick={downloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={saveReport} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button onClick={finalizeReport} disabled={saving}>
                <Send className="h-4 w-4 mr-2" />
                Finalize Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Report Reference */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-blue-600" />
                  AI Analysis Reference
                  <Badge variant="outline" className="ml-2">AI DRAFT</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {study.ai_report && (() => {
                  try {
                    let aiReport;
                    if (typeof study.ai_report === 'string') {
                      const jsonString = study.ai_report
                        .replace(/'/g, '"')
                        .replace(/True/g, 'true')
                        .replace(/False/g, 'false')
                        .replace(/None/g, 'null');
                      aiReport = JSON.parse(jsonString);
                    } else {
                      aiReport = study.ai_report;
                    }
                    
                    return (
                      <>
                        <div>
                          <h4 className="font-medium mb-2">AI Findings:</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {aiReport.findings?.map((finding: string, index: number) => (
                              <div key={index}>• {finding}</div>
                            )) || <div>No specific findings detected</div>}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">AI Impression:</h4>
                          <p className="text-sm text-gray-600">{aiReport.impression || 'No impression available'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">AI Model:</h4>
                          <p className="text-sm text-gray-500">{aiReport.ai_model || 'Unknown'} ({aiReport.ai_version || 'v1.0'})</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Confidence:</h4>
                          <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${(aiReport.confidence || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm">
                              {((aiReport.confidence || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Analysis Details:</h4>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Modality: {aiReport.modality || 'Unknown'}</div>
                            <div>Body Part: {aiReport.body_part || 'Unknown'}</div>
                            <div>Generated: {aiReport.generated_at ? new Date(aiReport.generated_at).toLocaleString() : 'Unknown'}</div>
                          </div>
                        </div>
                      </>
                    )
                  } catch (error) {
                    console.warn('Failed to parse AI report:', error);
                    return (
                      <div>
                        <h4 className="font-medium mb-2">AI Analysis:</h4>
                        <p className="text-sm text-gray-600">
                          {typeof study.ai_report === 'string' ? study.ai_report : 'AI analysis data available but format needs review'}
                        </p>
                      </div>
                    )
                  }
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Report Editor */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Radiologist Report
                </CardTitle>
                <CardDescription>
                  Edit and finalize the diagnostic report
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Findings:</label>
                  <Textarea
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Enter detailed findings..."
                    rows={6}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Impression:</label>
                  <Textarea
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    placeholder="Enter clinical impression and recommendations..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes:</label>
                  <Textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    placeholder="Enter additional clinical notes..."
                    rows={4}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Report with Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Patient Email:</label>
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="patient@example.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                Cancel
              </Button>
              <Button onClick={shareWithPatient}>
                Send Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReportEditor
