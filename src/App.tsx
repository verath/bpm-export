import { useState, useEffect } from 'react'
import './App.css'
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
    <div className="App">
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
        <div className="export-placeholder">
          <h1>Export BPM Data</h1>
          <p>Selected playlist: {selectedPlaylist.name}</p>
          <p>Playlist ID: {selectedPlaylist.id}</p>
          <button onClick={() => setAppState('playlists')}>
            Back to Playlists
          </button>
        </div>
      )}
    </div>
  )
}

export default App
