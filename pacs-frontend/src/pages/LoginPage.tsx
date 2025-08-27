import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Alert, AlertDescription } from '../components/ui/alert'
import { Stethoscope, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(username, password)
      if (!success) {
        setError('Invalid username or password')
      }
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'System Administrator' },
    { username: 'radiologist1', password: 'radio123', role: 'Radiologist' },
    { username: 'doctor1', password: 'doctor123', role: 'Doctor' },
    { username: 'tech1', password: 'tech123', role: 'Technician' },
    { username: 'centeradmin1', password: 'center123', role: 'Center Admin' },
  ]

  const fillDemoAccount = (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername)
    setPassword(demoPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Login Form */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">PACS System</CardTitle>
            <CardDescription>
              Sign in to access your medical imaging portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-medical-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-medical-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Demo Accounts</CardTitle>
            <CardDescription>
              Click on any account below to auto-fill the login form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {demoAccounts.map((account, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-medical-gray-50 transition-colors"
                  onClick={() => fillDemoAccount(account.username, account.password)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{account.role}</p>
                      <p className="text-sm text-medical-gray-600">{account.username}</p>
                    </div>
                    <div className="text-xs text-medical-gray-500">
                      Click to use
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">System Features:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Multi-user role management</li>
                <li>• Advanced DICOM viewer</li>
                <li>• AI-powered report generation</li>
                <li>• Study assignment workflow</li>
                <li>• Measurement & annotation tools</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
