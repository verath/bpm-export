import { useState, useEffect } from 'react'
import { SpotifyLogin } from './components/SpotifyLogin'
import { PlaylistSelection } from './components/PlaylistSelection'
import { SpotifyAPI } from './utils/spotify'

type AppState = 'login' | 'playlists' | 'export'

function App() {
  const [appState, setAppState] = useState<AppState>('login')
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null)

  // Check if user is already authenticated on app load
  useEffect(() => {
    if (SpotifyAPI.isAuthenticated()) {
      setAppState('playlists')
    }
  }, [])

  const handleLoginSuccess = (accessToken: string) => {
    console.log('Successfully logged in to Spotify!')
    setAppState('playlists')
  }

  const handleLoginError = (error: string) => {
    console.error('Spotify login error:', error)
    // Error is already displayed in the SpotifyLogin component
  }

  const handlePlaylistSelect = (playlistId: string, playlistName: string) => {
    setSelectedPlaylist({ id: playlistId, name: playlistName })
    setAppState('export')
    // TODO: Navigate to export component
    console.log(`Selected playlist: ${playlistName} (${playlistId})`)
  }

  const handleLogout = () => {
    SpotifyAPI.logout()
    setAppState('login')
    setSelectedPlaylist(null)
  }

  return (
    <div className="App" style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif' }}>
      {appState === 'login' && (
        <SpotifyLogin 
          onLoginSuccess={handleLoginSuccess}
          onLoginError={handleLoginError}
        />
      )}
      
      {appState === 'playlists' && (
        <PlaylistSelection
          onPlaylistSelect={handlePlaylistSelect}
          onLogout={handleLogout}
        />
      )}
      
      {appState === 'export' && selectedPlaylist && (
        <div className="export-placeholder" style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 20px 0', fontSize: '32px', fontWeight: '700' }}>Export BPM Data</h1>
          <p style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Selected playlist: {selectedPlaylist.name}</p>
          <p style={{ margin: '0 0 30px 0', fontSize: '14px', opacity: '0.8' }}>Playlist ID: {selectedPlaylist.id}</p>
          <button 
            onClick={() => setAppState('playlists')}
            style={{
              background: '#1DB954',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#1ed760';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1DB954';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Back to Playlists
          </button>
        </div>
      )}
    </div>
  )
}

export default App
