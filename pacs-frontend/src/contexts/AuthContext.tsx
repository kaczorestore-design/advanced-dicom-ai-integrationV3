import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  diagnostic_center_id?: number
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshToken: () => Promise<boolean>
  isTokenValid: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const logout = () => {
    setUser(null)
    setToken(null)
    setTokenExpiry(null)
    localStorage.removeItem('token')
    localStorage.removeItem('tokenExpiry')
  }

  // Check if token is valid (not expired)
  const isTokenValid = useCallback(() => {
  if (!token) return false
  
  try {
    // Parse JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiryTime = payload.exp * 1000 // Convert to milliseconds
    return Date.now() < expiryTime
  } catch (error) {
    console.error('Error parsing token:', error)
    return false
  }
}, [token])

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!token) return false
    
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newToken = data.access_token
        const expiryTime = Date.now() + (data.expires_in || 3600) * 1000 // Default 1 hour
        
        setToken(newToken)
        setTokenExpiry(expiryTime)
        console.log('Token refreshed successfully', newToken);
        localStorage.setItem('token', newToken)
        localStorage.setItem('tokenExpiry', expiryTime.toString())
        
        return true
      } else {
        // Refresh failed, logout user
        logout()
        return false
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
      return false
    }
  }, [token, API_URL])

  const fetchUserInfo = useCallback(async (authToken: string) => {
  if (!authToken || authToken.trim() === '') {
    console.warn('No valid token provided, skipping user info fetch')
    setLoading(false)
    return
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const userData = await response.json()
      setUser(userData)
    } else if (response.status === 401) {
      console.warn('Token expired or invalid, attempting refresh...')
      const refreshSuccess = await refreshToken()
      if (!refreshSuccess) {
        console.warn('Refresh failed, logging out')
        logout()
      }
    } else {
      console.error('Failed to fetch user info:', response.status)
      // Don't logout immediately, try refresh first
      const refreshSuccess = await refreshToken()
      if (!refreshSuccess) {
        logout()
      }
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    // Try to refresh token on network errors
    try {
      await refreshToken()
    } catch (refreshError) {
      console.error('Refresh also failed:', refreshError)
      logout()
    }
  } finally {
    setLoading(false)
  }
}, [API_URL, refreshToken, logout])

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedExpiry = localStorage.getItem('tokenExpiry')
    
    if (savedToken && savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10)
      setToken(savedToken)
      setTokenExpiry(expiryTime)
      
      // Check if token is expired
      if (Date.now() < expiryTime) {
        fetchUserInfo(savedToken)
      } else {
        // Token expired, try to refresh or logout
        console.warn('Token expired, attempting refresh...')
        refreshToken().then((success) => {
          if (!success) {
            console.warn('Token refresh failed, user needs to login again')
            setLoading(false)
          }
        })
      }
    } else {
      setLoading(false)
    }
  }, []) // Remove dependencies to prevent infinite loop

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!token || !tokenExpiry) return

    const timeUntilExpiry = tokenExpiry - Date.now()
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000) // Refresh 5 minutes before expiry, but at least 1 minute from now

    if (refreshTime > 0) {
      const refreshTimer = setTimeout(() => {
        console.log('Auto-refreshing token...')
        refreshToken()
      }, refreshTime)

      return () => clearTimeout(refreshTimer)
    }
  }, [token, tokenExpiry, refreshToken])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        const authToken = data.access_token
        const expiryTime = Date.now() + (data.expires_in || 3600) * 1000 // Default 1 hour
        
        setToken(authToken)
        setTokenExpiry(expiryTime)
        console.log('Login successful, token set', authToken)
        localStorage.setItem('token', authToken)
        localStorage.setItem('tokenExpiry', expiryTime.toString())
        
        await fetchUserInfo(authToken)
        return true
      } else if (response.status === 429) {
        const errorData = await response.json()
        console.error('Rate limited:', errorData.detail)
        throw new Error(errorData.detail || 'Too many login attempts')
      } else {
        const errorData = await response.json()
        console.error('Login failed:', errorData.detail)
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error instanceof Error && error.message.includes('Too many')) {
        throw error // Re-throw rate limiting errors
      }
      return false
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshToken,
    isTokenValid,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
