import { useState, useEffect } from 'react'
import { SpotifyLogin } from './components/SpotifyLogin'
import { PlaylistSelection } from './components/PlaylistSelection'
import { ExportView } from './components/ExportView'
import { SpotifyAPI, type SpotifyTokenData, AuthEventManager } from './utils/spotify'
import { UserProvider } from './contexts/UserContext'

type AppState = 'login' | 'playlists' | 'export'

interface AuthenticatedAppProps {
  onLogout: () => void
}

function AuthenticatedApp({ onLogout }: AuthenticatedAppProps) {
  const [appState, setAppState] = useState<AppState>('playlists')
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null)

  const handlePlaylistSelect = (playlistId: string, playlistName: string) => {
    setSelectedPlaylist({ id: playlistId, name: playlistName })
    setAppState('export')
  }

  return (
    <div className="App" style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
      {appState === 'playlists' && (
        <PlaylistSelection
          onPlaylistSelect={handlePlaylistSelect}
          onLogout={onLogout}
        />
      )}
      
      {appState === 'export' && selectedPlaylist && (
        <ExportView
          selectedPlaylist={selectedPlaylist}
          onBack={() => setAppState('playlists')}
        />
      )}
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Handle authentication failures
  const handleAuthFailure = () => {
    console.log('Authentication failed, redirecting to login')
    setIsAuthenticated(false)
  }

  // Check if user is already authenticated on app load
  useEffect(() => {
    if (SpotifyAPI.isAuthenticated()) {
      setIsAuthenticated(true)
    }
  }, [])

  // Listen for authentication failures
  useEffect(() => {
    AuthEventManager.addListener(handleAuthFailure)
    return () => {
      AuthEventManager.removeListener(handleAuthFailure)
    }
  }, [])

  const handleLoginSuccess = (tokenData: SpotifyTokenData) => {
    SpotifyAPI.setTokenData(tokenData)
    console.log('Successfully logged in to Spotify!')
    setIsAuthenticated(true)
  }

  const handleLoginError = (error: string) => {
    console.error('Spotify login error:', error)
    // Error is already displayed in the SpotifyLogin component
  }

  const handleLogout = () => {
    SpotifyAPI.logout()
    setIsAuthenticated(false)
  }

  return (
    <div className="App" style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
      {!isAuthenticated ? (
        <SpotifyLogin 
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
        />
      ) : (
        <UserProvider>
          <AuthenticatedApp onLogout={handleLogout} />
        </UserProvider>
      )}
    </div>
  )
}

export default App
