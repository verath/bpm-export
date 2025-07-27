import { useState, useEffect, useRef } from 'react'
import { SpotifyAPI } from '../utils/spotify'
import sanitizeHtml from 'sanitize-html'
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
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadUserAndPlaylists()
    
    // Cleanup function to abort requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const loadUserAndPlaylists = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      // Load user profile first
      const userProfile = await SpotifyAPI.getCurrentUser(signal)
      setUser(userProfile)

      // Load all playlists
      await loadAllPlaylists(signal)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data from Spotify'
      setError(errorMessage)
      console.error('Error loading data from Spotify:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAllPlaylists = async (signal: AbortSignal) => {
    const limit = 50
    let allPlaylists: Playlist[] = []
    let currentOffset = 0
    let hasMore = true

    while (hasMore) {
      try {
        const playlistsResponse = await SpotifyAPI.getUserPlaylists(limit, currentOffset, signal) as any
        
        allPlaylists = [...allPlaylists, ...playlistsResponse.items]
        setPlaylists(allPlaylists)

        // Check if we've loaded all playlists
        hasMore = allPlaylists.length < playlistsResponse.total
        currentOffset += limit
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Error loading playlists at offset', currentOffset, err)
        break
      }
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

  const decodeHtmlEntities = (text: string): string => {
    // Use sanitize-html to safely decode HTML entities while preventing XSS
    return sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
      disallowedTagsMode: 'recursiveEscape' // Escape any HTML tags
    })
  }

  if (isLoading) {
    return (
      <div className="playlist-selection">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your playlists...</p>
          {playlists.length > 0 && (
            <p className="loading-progress">
              Loaded {playlists.length} playlists so far...
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="playlist-selection">
        <div className="error-container">
          <h2>Error Loading Data from Spotify</h2>
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
                <h1>Welcome, {decodeHtmlEntities(user.display_name)}!</h1>
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
        <h2>Your Playlists</h2>
        
        {playlists.length === 0 ? (
          <div className="no-playlists">
            <p>No playlists found. Create a playlist in Spotify first!</p>
          </div>
        ) : (
          <>
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
                    <h3>{decodeHtmlEntities(playlist.name)}</h3>
                    <p className="playlist-owner">
                      by {decodeHtmlEntities(playlist.owner.display_name)}
                    </p>
                    <p className="playlist-tracks">
                      {playlist.tracks.total} tracks
                    </p>
                    {playlist.description && (
                      <p className="playlist-description">
                        {decodeHtmlEntities(playlist.description)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 