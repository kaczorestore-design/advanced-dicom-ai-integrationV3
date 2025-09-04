import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import DiagnosticCenterDashboard from './pages/DiagnosticCenterDashboard'
import TechnicianDashboard from './pages/TechnicianDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import RadiologistDashboard from './pages/RadiologistDashboard'
import ReportEditor from './pages/ReportEditor'
import DicomViewer from './components/DicomViewer'
import VTKTest from './pages/VTKTest'
import './App.css'

// Legacy redirect components
function LegacyViewerRedirect() {
  const { studyId } = useParams()
  return <Navigate to={`/studies/${studyId}/viewer`} replace />
}

function LegacyReportRedirect() {
  const { studyId } = useParams()
  return <Navigate to={`/studies/${studyId}/reports/editor`} replace />
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-cardiac-spin text-medical-primary text-6xl">❤️</div>
        <p className="text-gray-600 mt-2">Loading medical systems...</p>
      </div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      {/* Authentication Routes */}
      <Route path="/auth/login" element={user ? <Navigate to="/medical-imaging/dashboard" replace /> : <LoginPage />} />
      <Route path="/login" element={<Navigate to="/auth/login" replace />} /> {/* Legacy redirect */}
      
      {/* Main Dashboard Routes */}
      <Route path="/medical-imaging/dashboard" element={
        <ProtectedRoute>
          {user?.role === 'admin' && <Navigate to="/administration/system-management" replace />}
          {user?.role === 'diagnostic_center_admin' && <Navigate to="/facilities/diagnostic-centers" replace />}
          {user?.role === 'technician' && <Navigate to="/radiology/technician-workspace" replace />}
          {user?.role === 'doctor' && <Navigate to="/radiology/doctor-workspace" replace />}
          {user?.role === 'radiologist' && <Navigate to="/radiology/radiologist-workspace" replace />}
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={<Navigate to="/medical-imaging/dashboard" replace />} /> {/* Legacy redirect */}
      
      {/* Administration Routes */}
      <Route path="/administration/system-management" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/administration/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={<Navigate to="/administration/system-management" replace />} /> {/* Legacy redirect */}
      
      {/* Facilities Management Routes */}
      <Route path="/facilities/diagnostic-centers" element={
        <ProtectedRoute allowedRoles={['admin', 'diagnostic_center_admin']}>
          <DiagnosticCenterDashboard />
        </ProtectedRoute>
      } />
      <Route path="/facilities/*" element={
        <ProtectedRoute allowedRoles={['admin', 'diagnostic_center_admin']}>
          <DiagnosticCenterDashboard />
        </ProtectedRoute>
      } />
      <Route path="/diagnostic-center/*" element={<Navigate to="/facilities/diagnostic-centers" replace />} /> {/* Legacy redirect */}
      
      {/* Radiology Workspace Routes */}
      <Route path="/radiology/technician-workspace" element={
        <ProtectedRoute allowedRoles={['technician']}>
          <TechnicianDashboard />
        </ProtectedRoute>
      } />
      <Route path="/radiology/doctor-workspace" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/radiology/radiologist-workspace" element={
        <ProtectedRoute allowedRoles={['radiologist']}>
          <RadiologistDashboard />
        </ProtectedRoute>
      } />
      <Route path="/technician/*" element={<Navigate to="/radiology/technician-workspace" replace />} /> {/* Legacy redirect */}
      <Route path="/doctor/*" element={<Navigate to="/radiology/doctor-workspace" replace />} /> {/* Legacy redirect */}
      <Route path="/radiologist/*" element={<Navigate to="/radiology/radiologist-workspace" replace />} /> {/* Legacy redirect */}
      
      {/* Medical Studies Routes */}
      <Route path="/studies/:studyId/viewer" element={
        <ProtectedRoute>
          <DicomViewer />
        </ProtectedRoute>
      } />
      <Route path="/viewer/:studyId" element={<LegacyViewerRedirect />} /> {/* Legacy redirect */}
      
      <Route path="/studies/:studyId/reports/editor" element={
        <ProtectedRoute allowedRoles={['radiologist', 'doctor']}>
          <ReportEditor />
        </ProtectedRoute>
      } />
      <Route path="/report/:studyId" element={<LegacyReportRedirect />} /> {/* Legacy redirect */}
      
      {/* Development/Testing Routes */}
      <Route path="/test/vtk" element={
        <ProtectedRoute>
          <VTKTest />
        </ProtectedRoute>
      } />
      
      <Route path="/unauthorized" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-medical-error mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      } />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <NextThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        themes={['light', 'dark', 'system']}
      >
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="min-h-screen bg-background text-foreground">
                <AppRoutes />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </NextThemeProvider>
    </ErrorBoundary>
  )
}

export default App
