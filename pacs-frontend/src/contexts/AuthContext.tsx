import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      fetchUserInfo(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserInfo = async (authToken: string) => {
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
        // Token is invalid or expired
        console.warn('Token expired or invalid, logging out')
        logout()
      } else {
        console.error('Failed to fetch user info:', response.status)
        localStorage.removeItem('token')
        setToken(null)
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      // Only clear token on network errors, not server errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error, keeping token for retry')
      } else {
        localStorage.removeItem('token')
        setToken(null)
      }
    } finally {
      setLoading(false)
    }
  }

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
        
        setToken(authToken)
        localStorage.setItem('token', authToken)
        
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

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
