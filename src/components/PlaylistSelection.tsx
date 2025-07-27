import { useState, useEffect } from 'react'
import { SpotifyAPI } from '../utils/spotify'
import './PlaylistSelection.css'

interface Playlist {
  id: string
  name: string
  description: string | null
  images: Array<{ url: string; width: number; height: number }>
  tracks: { total: number }
  owner: { display_name: string }
  public: boolean
}

interface PlaylistSelectionProps {
  onPlaylistSelect?: (playlistId: string, playlistName: string) => void
  onLogout?: () => void
}

export function PlaylistSelection({ onPlaylistSelect, onLogout }: PlaylistSelectionProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserAndPlaylists()
  }, [])

  const loadUserAndPlaylists = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [userProfile, playlistsResponse] = await Promise.all([
        SpotifyAPI.getCurrentUser(),
        SpotifyAPI.getUserPlaylists(50, 0) as any
      ])

      setUser(userProfile)
      setPlaylists(playlistsResponse.items)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists'
      setError(errorMessage)
      console.error('Error loading playlists:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlaylistSelect = (playlist: Playlist) => {
    onPlaylistSelect?.(playlist.id, playlist.name)
  }

  const handleLogout = () => {
    onLogout?.()
  }

  const getPlaylistImage = (playlist: Playlist) => {
    if (playlist.images && playlist.images.length > 0) {
      return playlist.images[0].url
    }
    return '/default-playlist.png' // You can add a default image
  }

  if (isLoading) {
    return (
      <div className="playlist-selection">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your playlists...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="playlist-selection">
        <div className="error-container">
          <h2>Error Loading Playlists</h2>
          <p>{error}</p>
          <button onClick={loadUserAndPlaylists} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="playlist-selection">
      <div className="header">
        <div className="user-info">
          {user && (
            <>
              <img 
                src={user.images?.[0]?.url || '/default-avatar.png'} 
                alt={user.display_name}
                className="user-avatar"
              />
              <div className="user-details">
                <h1>Welcome, {user.display_name}!</h1>
                <p>Select a playlist to export BPM data</p>
              </div>
            </>
          )}
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="playlists-container">
        <h2>Your Playlists ({playlists.length})</h2>
        
        {playlists.length === 0 ? (
          <div className="no-playlists">
            <p>No playlists found. Create a playlist in Spotify first!</p>
          </div>
        ) : (
          <div className="playlists-grid">
            {playlists.map((playlist) => (
              <div 
                key={playlist.id} 
                className="playlist-card"
                onClick={() => handlePlaylistSelect(playlist)}
              >
                <div className="playlist-image">
                  <img src={getPlaylistImage(playlist)} alt={playlist.name} />
                  <div className="playlist-overlay">
                    <span>Select</span>
                  </div>
                </div>
                <div className="playlist-info">
                  <h3>{playlist.name}</h3>
                  <p className="playlist-owner">
                    by {playlist.owner.display_name}
                  </p>
                  <p className="playlist-tracks">
                    {playlist.tracks.total} tracks
                  </p>
                  {playlist.description && (
                    <p className="playlist-description">
                      {playlist.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 