import { RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface RefreshButtonProps {
  onRefresh: () => void
  isRefreshing: boolean
  lastRefreshed?: Date | null
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  showLastRefreshed?: boolean
  disabled?: boolean
}

export function RefreshButton({
  onRefresh,
  isRefreshing,
  lastRefreshed,
  variant = 'outline',
  size = 'default',
  className,
  showLastRefreshed = false,
  disabled = false
}: RefreshButtonProps) {
  const formatLastRefreshed = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    }
  }

  return (
    <div className="flex flex-col items-end space-y-1">
      <Button
        variant={variant}
        size={size}
        onClick={onRefresh}
        disabled={isRefreshing || disabled}
        className={cn(
          "flex items-center space-x-2 transition-all duration-200",
          isRefreshing && "opacity-75",
          className
        )}
      >
        <RefreshCw 
          className={cn(
            "h-4 w-4",
            isRefreshing && "animate-spin"
          )} 
        />
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
      </Button>
      
      {showLastRefreshed && lastRefreshed && (
        <span className="text-xs text-gray-500">
          Last updated: {formatLastRefreshed(lastRefreshed)}
        </span>
      )}
    </div>
  )
}

export default RefreshButton