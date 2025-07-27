import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { SpotifyAPI } from '../utils/spotify'

interface User {
  id: string
  display_name: string
  images?: Array<{ url: string; width: number; height: number }>
  email?: string
  country?: string
  product?: string
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  clearUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUser = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const userProfile = await SpotifyAPI.getCurrentUser() as User
      setUser(userProfile)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profile'
      setError(errorMessage)
      console.error('Error loading user profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    await loadUser()
  }

  const clearUser = () => {
    setUser(null)
    setError(null)
  }

  useEffect(() => {
    if (SpotifyAPI.isAuthenticated()) {
      loadUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const value: UserContextType = {
    user,
    isLoading,
    error,
    refreshUser,
    clearUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
} 