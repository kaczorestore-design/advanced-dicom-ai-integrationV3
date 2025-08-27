import { useState, useCallback } from 'react'

interface UseRefreshOptions {
  onSuccess?: (message?: string) => void
  onError?: (error: string) => void
  showFeedback?: boolean
}

interface RefreshState {
  isRefreshing: boolean
  lastRefreshed: Date | null
  error: string | null
}

export function useRefresh(refreshFunctions: (() => Promise<void>)[], options: UseRefreshOptions = {}) {
  const [state, setState] = useState<RefreshState>({
    isRefreshing: false,
    lastRefreshed: null,
    error: null
  })

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }))
    
    try {
      // Execute all refresh functions in parallel
      await Promise.all(refreshFunctions.map(fn => fn()))
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        lastRefreshed: new Date(),
        error: null
      }))
      
      if (options.showFeedback && options.onSuccess) {
        options.onSuccess('Data refreshed successfully')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data'
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: errorMessage
      }))
      
      if (options.showFeedback && options.onError) {
        options.onError(errorMessage)
      }
      
      console.error('Refresh error:', error)
    }
  }, [refreshFunctions, options])

  return {
    ...state,
    refresh
  }
}

export default useRefresh